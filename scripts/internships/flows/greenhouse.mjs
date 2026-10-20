// Greenhouse apply: one job board posting, filled from the answer bank and
// submitted. An autobrowse flow (@wrenautomation/autobrowse): every click and
// keystroke goes through its human-pace hands; a captcha goes to its solver;
// anything the flow cannot finish throws NeedsHuman with a screenshot.
//
// Fields come off the live page, not the Job Board API: the page also asks
// for phone country, city, school and degree, which the API leaves out. Ids on
// the page are the API's field names (first_name, question_123, resume).
//
// Kinds the page uses (job-boards.greenhouse.io, 2026-10):
//   text, textarea   plain inputs, <label for=id>
//   select           react-select: input[role=combobox]; options render in
//                    #react-select-<id>-listbox only while it is open
//   search           the same control with no options until you type (city,
//                    school): type the answer, then pick the closest option
//   checkboxes       <fieldset class=checkbox> with a legend, one box per option
//   file             input[type=file]; its label is #upload-label-<id>
import { defineFlow } from "@wrenautomation/autobrowse";
import { clean, fitOption, match } from "../answers.mjs";

const SETTLE = 1_200;

/** Every visible field on the form: label, kind, required, options (checkboxes only). */
const FIELDS = `(() => {
  const form = document.querySelector("#application-form, form");
  if (!form) return [];
  const txt = (e) => (e?.innerText || e?.textContent || "").replace(/\\s+/g, " ").trim();
  const labelOf = (id) => txt(document.getElementById(id + "-label")) || txt(form.querySelector('label[for="' + CSS.escape(id) + '"]'));
  const req = (e, label) => e.required || e.getAttribute("aria-required") === "true" || /\\*\\s*$/.test(label);
  const out = [];
  for (const e of form.querySelectorAll("input[id], textarea[id]")) {
    if (e.id.startsWith("iti-") || e.type === "hidden" || e.type === "checkbox" || e.type === "radio") continue;
    if (e.type === "file") {
      const label = txt(document.getElementById("upload-label-" + e.id)) || (e.id === "resume" ? "Resume/CV" : e.id === "cover_letter" ? "Cover Letter" : e.id);
      const wrap = e.closest(".file-upload, [class*=file-upload]");
      out.push({ id: e.id, kind: "file", label, required: /\\*/.test(label) || !!wrap?.querySelector(".required"), options: [] });
      continue;
    }
    const label = labelOf(e.id);
    if (!label) continue;
    const kind = e.getAttribute("role") === "combobox" ? "select" : e.tagName === "TEXTAREA" ? "textarea" : "text";
    out.push({ id: e.id, kind, label, required: req(e, label), options: [] });
  }
  for (const fs of form.querySelectorAll("fieldset.checkbox, fieldset")) {
    const boxes = [...fs.querySelectorAll("input[type=checkbox]")];
    if (!boxes.length) continue;
    const label = txt(fs.querySelector("legend")) || txt(boxes[0].closest("label"));
    out.push({ id: fs.id || boxes[0].name, kind: "checkboxes", label, required: fs.getAttribute("aria-required") === "true" || boxes.some((b) => b.required),
      options: boxes.map((b) => txt(form.querySelector('label[for="' + CSS.escape(b.id) + '"]'))), boxIds: boxes.map((b) => b.id) });
  }
  return out;
})()`;

const listbox = (id) => `#react-select-${CSS_ESCAPE(id)}-listbox`;
// CSS.escape for the ids Greenhouse uses (question_1, school--0, question_1[]).
function CSS_ESCAPE(id) { return id.replace(/([[\]#.:\s"'])/g, "\\$1"); }
const byId = (id) => ({ css: `#${CSS_ESCAPE(id)}` });
const quoted = (s) => JSON.stringify(s);

/** Options of one select, read while it is open. */
async function openOptions(fp, f) {
  await fp.act({ kind: "click" }, byId(f.id), { goal: `open "${f.label}"` });
  await fp.wait(400);
  return fp.page.evaluate((sel) => [...document.querySelectorAll(`${sel} [role=option]`)].map((o) => o.innerText.trim()), listbox(f.id));
}

async function pick(fp, f, option) {
  await fp.act({ kind: "click" }, { css: `${listbox(f.id)} [role=option]:text-is(${quoted(option)})` }, { goal: `choose "${option}" for "${f.label}"` });
}

/**
 * City, school, discipline: type, wait for the list, take the option closest
 * to the answer. Tries each " | " alternative of the answer cell in turn
 * ("Software Engineering | Computer Science").
 */
async function search(fp, f, region) {
  const alts = (f.raw || f.answer).split(/\s\|\s/).map((x) => x.replace(/^(canada|us|remote):\s*/i, (m) => (m.toLowerCase().startsWith(String(region).toLowerCase()) ? "" : "\u0000"))).filter((x) => x && !x.startsWith("\u0000") && !/^\/.*\/$/.test(x));
  for (const answer of alts) {
    const term = f.id === "candidate-location" ? answer.split(",")[0] : answer;
    await fp.act({ kind: "fill", value: term }, byId(f.id), { goal: `search "${f.label}"` });
    await fp.wait(SETTLE * 2);
    const opts = await fp.page.evaluate((sel) => [...document.querySelectorAll(`${sel} [role=option]`)].map((o) => o.innerText.trim()), listbox(f.id));
    if (!opts.length) continue;
    const want = fitOption(answer, opts) ?? opts.find((o) => o.toLowerCase().startsWith(term.toLowerCase()));
    if (!want) continue;
    await pick(fp, f, want);
    return want;
  }
  return null;
}

export const greenhouseApply = defineFlow({
  site: "greenhouse",
  name: "greenhouse-apply",
  /**
   * input: { url, answers (loadAnswers rows), region, files: { resume, transcript }, dryRun }
   * out:   { status: "submitted" | "filled", filled: [{label, answer}], screenshot? }
   */
  async run(fp, input) {
    await fp.open(input.url);
    if (!(await fp.has({ css: "#first_name" }, 15_000))) fp.human(`no application form at ${fp.url()}`);

    // Selects carry their options only while open: read each once, then match.
    const raw = await fp.page.evaluate(FIELDS);
    for (const f of raw) {
      if (f.kind !== "select") continue;
      f.options = await openOptions(fp, f);
      await fp.act({ kind: "press", key: "Escape" }, byId(f.id), { goal: "close the list" });
      // No options until typed (city), or too many to read (every school): type to search.
      if (!f.options.length || f.options.length > 40) { f.kind = "search"; f.options = []; }
    }
    const fields = raw.map((f) => ({ ...f, label: clean(f.label) }));
    const { filled, open } = match(fields, input.answers, input.region);
    if (open.length) fp.human(`no answer for ${open.map((q) => `"${q}"`).join(", ")}`);

    for (const f of filled) {
      const a = f.answer;
      if (f.kind === "file") {
        const file = a.startsWith("FILE:") ? input.files[a.slice(5)] : null;
        if (!file) fp.human(`no file for "${f.label}" (${a})`);
        await fp.act({ kind: "upload", files: [file] }, byId(f.id), { goal: `attach ${a.slice(5)}` });
        // The upload is done when the page shows the file's name instead of a progress bar.
        const name = file.split("/").pop();
        let shown = false;
        for (let t = 0; t < 30_000 && !shown; t += 1_000) { await fp.wait(1_000); shown = (await fp.text()).includes(name); }
        if (!shown) fp.human(`the upload of ${name} for "${f.label}" did not finish`);
      } else if (f.kind === "text" || f.kind === "textarea") {
        if (a.startsWith("FILE:")) continue; // a "paste it" box next to an upload
        await fp.act({ kind: "fill", value: a }, byId(f.id), { goal: `fill "${f.label}"` });
      } else if (f.kind === "select") {
        // Typing filters the list, so the option is on screen however long the list is.
        await fp.act({ kind: "fill", value: a }, byId(f.id), { goal: `filter "${f.label}"` });
        await fp.wait(500);
        await pick(fp, f, a);
      } else if (f.kind === "search") {
        const got = await search(fp, f, input.region);
        if (!got) fp.human(`no option for "${f.raw || a}" in "${f.label}"`);
        f.answer = got;
      } else if (f.kind === "checkboxes") {
        for (const want of a.split(/\s*;\s*/)) {
          const i = f.options.indexOf(want);
          if (i < 0) fp.human(`no box "${want}" in "${f.label}"`);
          await fp.act({ kind: "click" }, { css: `label[for="${f.boxIds[i]}"]` }, { goal: `tick "${want}"` });
        }
      }
      await fp.wait(150);
    }

    const out = { filled: filled.map((f) => ({ label: f.label, answer: f.answer })) };
    if (input.dryRun) {
      if (input.screenshot) await fp.page.screenshot({ path: input.screenshot, fullPage: true });
      return { status: "filled", ...out };
    }

    await fp.act({ kind: "click" }, { css: 'button[type="submit"]' }, { goal: "submit the application", irreversible: true });
    for (let t = 0; t < 30_000; t += 1_000) {
      await fp.wait(1_000);
      const body = (await fp.text()).toLowerCase();
      if (/thank you for applying|application (has been )?(received|submitted)|we('ve| have) received your application/.test(body) || /\/confirmation/.test(fp.url())) {
        if (input.screenshot) await fp.page.screenshot({ path: input.screenshot, fullPage: true });
        return { status: "submitted", ...out };
      }
      if (/security code|verification code|code (was )?sent to/.test(body)) fp.human("asks for the email security code (inbox step not built)");
      if (/captcha|i'?m not a robot/.test(body)) {
        const c = await fp.captcha();
        if (c && c.solved === false) fp.human(`captcha not solved (${c.reason ?? "unknown"})`);
      }
      const errors = await fp.page.evaluate(() => [...document.querySelectorAll("[id$=-error], .error, .helper-text--error")].map((e) => e.innerText.trim()).filter(Boolean));
      if (errors.length) fp.human(`the form refused it: ${errors.slice(0, 3).join("; ")}`);
    }
    fp.human("no confirmation 30 s after submit");
  },
});
