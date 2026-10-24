// Ashby and Lever apply: one flow for both. Each question on these forms sits
// in its own container, so the flow reads container by container, tags each
// control with data-abf (field) and data-abo (option), matches, fills, submits.
// Same contract and hand-offs as flows/greenhouse.mjs.
//
// Kinds (2026-10):
//   text, textarea, select (native), file
//   radio, checkboxes   click the option's label
//   buttons             Ashby Yes/No: two <button>s
//   checkbox            one box (consent): its label is the option
//   search              Ashby and Lever location: type, then pick from the list
import { defineFlow } from "@wrenautomation/autobrowse";
import { clean, fitOption, match, resolve } from "../answers.mjs";

const ENTRY = ".ashby-application-form-field-entry, fieldset[class*=fieldEntry], .application-question";

export const applyUrl = (link) => /ashbyhq\.com/.test(link) ? link.replace(/[?#].*$/, "").replace(/\/(application)?\/?$/, "") + "/application"
  : /lever\.co/.test(link) ? link.replace(/[?#].*$/, "").replace(/\/(apply)?\/?$/, "") + "/apply" : link;

export const FIELDS = `(() => {
  const txt = (e) => (e?.innerText || e?.textContent || "").replace(/\\s+/g, " ").trim();
  const labelFor = (el) => (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) || el.closest("label");
  const out = [];
  [...document.querySelectorAll(${JSON.stringify(ENTRY)})].forEach((entry, k) => {
    if (entry.parentElement?.closest(${JSON.stringify(ENTRY)})) return;
    entry.setAttribute("data-abf", k);
    // The question's own title, not a label that wraps the options.
    const head = [".application-label", "[class*=question-title]", "legend", "label"].map((q) => entry.querySelector(q)).find((e) => e && txt(e) && !e.querySelector("select, textarea, input:not([type=checkbox]):not([type=radio])"));
    const rawLabel = txt(head);
    const vis = (e) => e.type === "file" || e.getBoundingClientRect().width > 0 || e.type === "radio" || e.type === "checkbox";
    const els = [...entry.querySelectorAll("input, textarea, select")].filter((e) => e.type !== "hidden" && vis(e));
    const req = /[*✱]/.test(rawLabel) || /required/i.test(head?.className || "") || !!head?.querySelector("[class*=required]") || els.some((e) => e.required || e.getAttribute("aria-required") === "true");
    const f = { id: String(k), label: rawLabel, required: req, options: [] };
    const opt = (el, j, text) => { (labelFor(el) || el).setAttribute("data-abo", k + "-" + j); return text; };
    const radios = els.filter((e) => e.type === "radio"), boxes = els.filter((e) => e.type === "checkbox");
    const yesNo = [...entry.querySelectorAll("button")].filter((b) => /^(yes|no)$/i.test(txt(b)));
    const typed = els.filter((e) => !["radio", "checkbox", "file"].includes(e.type));
    // A text box with its own radios (Ashby phone + SMS consent): two fields.
    if (typed.length && typed[0].tagName === "INPUT" && radios.length) {
      out.push({ id: k + "r", kind: "radio", label: rawLabel + " text messages", required: false, options: radios.map((r, j) => { (labelFor(r) || r).setAttribute("data-abo", k + "r-" + j); return txt(labelFor(r)) || r.value; }) });
      f.kind = "text"; out.push(f); return;
    }
    if (els.some((e) => e.type === "file")) f.kind = "file";
    else if (yesNo.length === 2) { f.kind = "buttons"; f.options = yesNo.map((b, j) => (b.setAttribute("data-abo", k + "-" + j), txt(b))); }
    else if (radios.length) { f.kind = "radio"; f.options = radios.map((r, j) => opt(r, j, txt(labelFor(r)) || r.value)); }
    else if (boxes.length > 1) { f.kind = "checkboxes"; f.options = boxes.map((b, j) => opt(b, j, txt(labelFor(b)) || b.name)); }
    else if (boxes.length === 1 && !els.some((e) => e.type !== "checkbox")) { f.kind = "checkboxes"; f.options = [opt(boxes[0], 0, txt(labelFor(boxes[0])) || rawLabel)]; }
    else if (els[0]?.tagName === "SELECT") { f.kind = "select"; f.options = [...els[0].options].map((o) => o.text.trim()).filter((t) => t && !/^(select|choose)\\b|^-+$/i.test(t)); }
    else if (els[0]?.tagName === "TEXTAREA") f.kind = "textarea";
    else if (els[0]) f.kind = els[0].id === "location-input" || els[0].getAttribute("role") === "combobox" || /location/i.test(rawLabel) && /start typing/i.test(els[0].placeholder || "") ? "search" : "text";
    else return;
    out.push(f);
  });
  return out;
})()`;

// The field prefix goes on each part of a selector list.
const at = (f, sel = "input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), textarea") => ({ css: sel.split(/,\s*/).map((p) => `[data-abf="${f.id}"] ${p}`).join(", ") });

export const formApply = defineFlow({
  site: "ats-form",
  name: "form-apply",
  /** input and out: as greenhouseApply. */
  async run(fp, input) {
    await fp.open(applyUrl(input.url));
    if (!(await fp.has({ css: ENTRY }, 20_000))) {
      const body = (await fp.text()).toLowerCase();
      fp.human(/no longer|not found|position (has been )?filled|closed/.test(body) ? "posting closed" : `no application form at ${fp.url()}`);
    }
    await fp.wait(1_000);
    const fields = (await fp.page.evaluate(FIELDS)).map((f) => ({ ...f, label: clean(f.label) }));
    // An unlabeled group of consent boxes (privacy policy, future contact): tick every box.
    const CONSENT = /\b(agree|consent|acknowledge|privacy (policy|notice)|i have read|i certify)\b/i;
    const consent = fields.filter((f) => !f.label && f.kind === "checkboxes" && f.options.length && f.options.every((o) => CONSENT.test(o)));
    const res = match(fields.filter((f) => !consent.includes(f)), input.answers, input.region);
    const { open } = res, filled = [...res.filled, ...consent.map((f) => ({ ...f, label: f.options.join(" / "), answer: f.options.join(";") }))];
    if (open.length) fp.human(`no answer for ${open.map((q) => `"${q}"`).join(", ")}`);

    // The résumé first: Ashby and Lever parse it and pre-fill fields, which the
    // answers then overwrite.
    filled.sort((a, b) => (b.kind === "file") - (a.kind === "file"));
    for (const f of filled) {
      const a = f.answer;
      if (f.kind === "file") {
        const file = a.startsWith("FILE:") ? input.files[a.slice(5)] : null;
        if (!file) fp.human(`no file for "${f.label}" (${a})`);
        await fp.act({ kind: "upload", files: [file] }, at(f, "input[type=file]"), { goal: `attach ${a.slice(5)}` });
        const name = file.split("/").pop();
        let shown = false;
        for (let t = 0; t < 30_000 && !shown; t += 1_000) { await fp.wait(1_000); shown = (await fp.text()).includes(name) || /success|uploaded/i.test(await fp.page.evaluate((id) => document.querySelector(`[data-abf="${id}"]`)?.innerText || "", f.id)); }
        if (!shown) fp.human(`the upload of ${name} for "${f.label}" did not finish`);
        await fp.wait(2_000); // parse-and-prefill settles
        await fp.page.evaluate(FIELDS); // a re-render drops the data-abf tags: tag again
      } else if (f.kind === "text" || f.kind === "textarea") {
        if (a.startsWith("FILE:")) continue;
        if (a === "TODAY" || /^(today.s )?date$|signature date|date signed/i.test(f.label)) { const d = new Date(); f.answer = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`; }
        // A number box takes digits only: a rule meant for a text question does not fit it.
        const num = await fp.page.evaluate((id) => document.querySelector(`[data-abf="${id}"] input`)?.type === "number", f.id);
        if (num && !/^-?\d+(\.\d+)?$/.test(a.trim())) {
          // "$68,000 per year CAD" → 68000; more or fewer than one number: ask.
          const phone = /phone|mobile|cell/i.test(f.label) ? [a.replace(/\D/g, "").slice(-10)] : null; // "+1-587-…" is one number, not four
          const gpa = /\bgpa\b|grade point/i.test(f.label) ? ["3.5"] : null; // William 2026-10-20: a single GPA value is 3.5
          const ns = phone || gpa || a.replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(\.\d+)?/g) || [];
          if (ns.length !== 1) fp.human(`"${f.label}" takes a number, the answer is "${a.slice(0, 40)}"`);
          f.answer = ns[0];
        }
        await fp.act({ kind: "fill", value: f.answer }, at(f), { goal: `fill "${f.label}"` });
        // A date box opens a calendar that covers the next field: Tab leaves it, Escape if it stays.
        if (await fp.page.locator(".react-datepicker").first().isVisible().catch(() => false)) {
          await fp.page.keyboard.press("Tab");
          if (await fp.page.locator(".react-datepicker").first().isVisible().catch(() => false)) await fp.page.keyboard.press("Escape");
        }
      } else if (f.kind === "select") {
        await fp.page.selectOption(`[data-abf="${f.id}"] select`, { label: a });
      } else if (f.kind === "search") {
        // The resolved answer, not the raw rule: its first alternative can be another region's ("canada:No").
        const term = a.split(",")[0];
        await fp.act({ kind: "fill", value: term }, at(f), { goal: `search "${f.label}"` });
        await fp.wait(2_500);
        const opts = await fp.page.evaluate(() => [...document.querySelectorAll("[role=option], .dropdown-location")].filter((o) => o.getBoundingClientRect().width > 0).map((o) => o.innerText.trim()));
        // "Waterloo, Ontario, Canada": the option holding the most of its parts (not Waterloo, Sierra Leone).
        const parts = a.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
        const abbr = { ontario: "on", "british columbia": "bc", quebec: "qc", canada: "can" };
        const score = (o) => parts.filter((p) => o.toLowerCase().includes(p) || (abbr[p] && new RegExp(`\\b${abbr[p]}\\b`, "i").test(o))).length;
        const best = opts.map((o) => ({ o, s: score(o) })).sort((x, y) => y.s - x.s)[0];
        // A list that typing does not filter (visa status): the rule's own alternatives against the options shown.
        const want = best && best.s >= Math.min(2, parts.length) ? best.o : f.raw && opts.length ? resolve(f.raw, opts, input.region) : null;
        if (!want) fp.human(`no option for "${a}" in "${f.label}"`);
        // Tag the visible option by its exact text: hasText misses a multi-line option (school, country, domain).
        await fp.page.evaluate((w) => { document.querySelectorAll("[data-abpick]").forEach((e) => e.removeAttribute("data-abpick")); [...document.querySelectorAll("[role=option], .dropdown-location")].find((o) => o.getBoundingClientRect().width > 0 && o.innerText.trim() === w)?.setAttribute("data-abpick", "1"); }, want);
        await fp.page.locator("[data-abpick]").first().click();
        f.answer = want;
      } else {
        // radio, checkboxes, buttons: click each chosen option.
        for (const want of f.kind === "checkboxes" ? a.split(/\s*;\s*/) : [a]) {
          const j = f.options.indexOf(want);
          if (j < 0) fp.human(`no option "${want}" in "${f.label}"`);
          await fp.act({ kind: "click" }, { css: `[data-abo="${f.id}-${j}"]` }, { goal: `choose "${want}" for "${f.label}"` });
        }
      }
      await fp.wait(150);
    }

    // The résumé parse can land late and overwrite boxes: read every text box
    // back, fill again what drifted, and stop if it still does not hold.
    const value = (f) => fp.page.evaluate((id) => document.querySelector(`[data-abf="${id}"] input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), [data-abf="${id}"] textarea`)?.value ?? "", f.id);
    const norm = (x) => String(x).replace(/\D/g, "");
    for (let pass = 0; pass < 3; pass++) {
      await fp.wait(pass ? 1_500 : 3_000);
      const drift = [];
      for (const f of filled.filter((f) => (f.kind === "text" || f.kind === "textarea") && !f.answer.startsWith("FILE:"))) {
        const v = await value(f);
        const ok = v === f.answer || (/phone/i.test(f.label) && norm(v).endsWith(norm(f.answer).slice(-10)));
        if (!ok) drift.push(f);
      }
      if (!drift.length) break;
      await fp.page.evaluate(FIELDS);
      if (pass === 2) fp.human(`fields will not hold their value: ${drift.map((f) => `"${f.label}"`).join(", ")}`);
      for (const f of drift) {
        await fp.page.locator(`[data-abf="${f.id}"] input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), [data-abf="${f.id}"] textarea`).first().fill("");
        await fp.act({ kind: "fill", value: f.answer }, at(f), { goal: `fill "${f.label}" again` });
      }
    }

    const out = { filled: filled.map((f) => ({ label: f.label, answer: f.answer })) };
    if (input.dryRun) {
      if (input.screenshot) await fp.page.screenshot({ path: input.screenshot, fullPage: true });
      return { status: "filled", ...out };
    }

    // Lever's EEO block: any disability status (also "I do not want to answer") makes the signature
    // and date required. The signature is the name on the form; the date is today.
    await fp.page.evaluate(() => {
      const sig = document.querySelector("input[name='eeo[disabilitySignature]']"), date = document.querySelector("input[name='eeo[disabilitySignatureDate]']");
      const name = document.querySelector("input[name=name]")?.value;
      const set = (el, v) => { if (!el || el.value || !v) return; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
      const d = new Date(); set(sig, name); set(date, `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`);
    });
    // The browser blocks a post with an invalid field and says nothing on the page: stop now, not after 45 s.
    const invalid = await fp.page.evaluate(() => [...(document.querySelector("form")?.elements || [])].filter((e) => e.willValidate && e.type !== "hidden" && !e.checkValidity()).map((e) => e.name || e.id));
    if (invalid.length) fp.human(`the form has fields the browser will not accept: ${invalid.slice(0, 5).join(", ")}`);
    const SUBMIT = { css: "#btn-submit, button.ashby-application-form-submit-button, button[type=submit]:has-text('Submit')" };
    await fp.act({ kind: "click" }, SUBMIT, { goal: "submit the application", irreversible: true });
    let resubmitted = false;
    for (let t = 0; t < 45_000; t += 1_000) {
      await fp.wait(1_000);
      const body = (await fp.text()).toLowerCase();
      if (/thank(s| you)( so much)? for (applying|submitting your application|your application|your interest)|(we.ve|we have) received your application|application (was |has been )?(successfully )?(submitted|received)/.test(body) || /\/thanks|\/confirmation/.test(fp.url())) {
        if (input.screenshot) await fp.page.screenshot({ path: input.screenshot, fullPage: true });
        return { status: "submitted", ...out };
      }
      // The solver finds the captcha itself (an hCaptcha challenge has no text to match); none on the page = kind null.
      if (t >= 2_000) {
        const c = await fp.captcha();
        if (c && c.solved === false && c.kind) fp.human(`captcha not solved (${c.reason ?? "unknown"})`);
        // Lever's own callback posts the form once the token lands; a second click resends a used token
        // ("error verifying your application"). Only when no token reached Lever's field, click once more.
        if (c?.solved && !resubmitted) {
          resubmitted = true;
          await fp.wait(3_000);
          const landed = await fp.page.evaluate(() => !!document.getElementById("hcaptchaResponseInput")?.value).catch(() => true);
          if (!landed && (await fp.has(SUBMIT, 1_000))) await fp.act({ kind: "click" }, SUBMIT, { goal: "submit after the captcha", irreversible: true });
        }
      }
      const errors = await fp.page.evaluate(() => [...document.querySelectorAll("[class*=error]:not(:empty), .error-message, [role=alert]")].filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== "hidden").map((e) => e.innerText.trim()).filter((s) => s && s.length < 200));
      if (errors.length && t > 3_000) fp.human(`the form refused it: ${errors.slice(0, 3).join("; ")}`);
    }
    fp.human("no confirmation 45 s after submit");
  },
});
