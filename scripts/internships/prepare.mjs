// prepare: for each Backlog row with Status=todo, read the application form,
// match every field against the Answers tab, and move the row to `ready`,
// `needs-answer` (unmatched questions in Notes) or `needs-human` (term
// conflict, form unreadable). Rows on an ATS without a flow stay `todo`.
// The field dump for the apply step: $STATE/forms/<company>/form-<role>.json
// (STATE = ~/.local/share/internships, linked from applications/_runtime; it
// sits outside ~/Documents because macOS blocks launchd jobs there).
//
//   node prepare.mjs                 # all todo rows, writes to the Sheet
//   node prepare.mjs --dry <url>...  # given links only, prints, writes nothing
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sheets } from "./sheet.mjs";
import { COLS, ats } from "./enrich.mjs";
import { clean, loadAnswers, match, usOnly } from "./answers.mjs";
import { draftAnswers } from "./draft.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
// playwright: the launchd install dir has its own copy; in the repo, borrow autobrowse's.
const PW = async () => { try { return await import("playwright"); } catch { return import("/Users/williamjin/Documents/wren_automation/autobrowse/node_modules/playwright/index.mjs"); } };
// Next co-op term is May–Aug 2027. Anything that names another term goes to
// William. 8 and 12 month terms are fine (William, 2026-10-20).
const TERM = /january\s*(\d{1,2},?\s*)?20?27|\bjan(\.|uary)?\s*[-–]|(winter|hiver|automne)\s*20?27|fall\s*20?27|fall (semester|term)|sept(ember)?\s*20?27|aug(ust)?\s*20?27\s*(to|[-–])\s*(dec|apr)/ig;
// "Graduating between Fall 2027 and Spring 2028" is a grad window, not the term.
const GRAD = /graduat|degree|expected|class of|completion/i;
// A posting that also offers summer lists other terms as options.
const SUMMER = /summer\s*(\(|'?\d|term|intern|co-?op|or)|\bmay\s*(\/\s*june|[-–]|to|through)/i;
const termConflict = (text) => {
  const summer = SUMMER.test(text);
  return [...text.matchAll(TERM)].find((m) => !GRAD.test(text.slice(Math.max(0, m.index - 100), m.index)) && !summer);
};
const BUILT = new Set(["greenhouse", "ashby", "lever", "workday"]);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---- field extraction -------------------------------------------------------
// Board slug + job id. Many links hide the slug (careerpuck, company pages with
// gh_jid): scan the page for a greenhouse board reference, else try the path
// segments and the company name against the API.
export async function greenhouseJob(link, company) {
  const m = link.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([a-z0-9_-]+)\/jobs\/(\d+)/i);
  if (m) return { board: m[1], id: m[2] };
  const id = (link.match(/gh_jid=(\d+)/) || link.match(/\/jobs?\/(\d{7,})/) || [])[1];
  if (!id) return null;
  const html = await fetch(link, { headers: { "user-agent": "Mozilla/5.0" } }).then((r) => r.text()).catch(() => "");
  const found = [...html.matchAll(/greenhouse\.io\/(?:v1\/boards\/|embed\/job_(?:board|app)\?for=)?([a-z0-9_-]{2,})/gi)].map((x) => x[1].toLowerCase());
  const cands = [...new Set([...found, ...link.split(/[/?#=&.]/).map((x) => x.toLowerCase()), slug(company).replace(/-/g, "")])].filter((c) => /^[a-z0-9_-]{2,}$/.test(c) && !/^(https?|www|com|job|jobs|careers?|board|app|io|v1|embed|for|gh_jid|\d+)$/.test(c));
  for (const board of cands) {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`);
    if (r.ok) return { board, id };
  }
  // A page that loads its board by script: watch a real browser's requests. The
  // slug is cached per host.
  const host = new URL(link).host, cacheFile = `${STATE}/gh-boards.json`;
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  const tryBoard = async (board) => board && (await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`)).ok;
  if (await tryBoard(cache[host])) return { board: cache[host], id };
  const { chromium } = await PW();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const seen = new Set();
    page.on("request", (q) => { const m = q.url().match(/greenhouse\.io\/(?:v1\/boards\/|embed\/job_(?:app|board)(?:\/js)?\?(?:[^#]*&)?for=)([a-z0-9_-]{2,})/i); if (m) seen.add(m[1].toLowerCase()); });
    await page.goto(link, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    for (const f of page.frames()) { const m = f.url().match(/for=([a-z0-9_-]{2,})/i); if (/greenhouse/.test(f.url()) && m) seen.add(m[1].toLowerCase()); }
    for (const board of seen) if (await tryBoard(board)) { cache[host] = board; mkdirSync(STATE, { recursive: true }); writeFileSync(cacheFile, JSON.stringify(cache, null, 2)); return { board, id }; }
  } finally { await browser.close(); }
  return null;
}
async function greenhouseFields(link, company) {
  const job = await greenhouseJob(link, company);
  if (!job) return null;
  const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${job.board}/jobs/${job.id}?questions=true`);
  if (r.status === 404) return { closed: true };
  if (!r.ok) return null;
  const j = await r.json();
  const field = (q, eeo) => ({ label: clean(q.label), required: !!q.required, type: q.fields.map((f) => f.type).join("+"), options: (q.fields[0]?.values || []).map((v) => v.label), eeo });
  return { title: j.title, description: (j.content || "").replace(/<[^>]+>/g, " "), fields: [...(j.questions || []).map((q) => field(q, false)), ...(j.compliance || []).flatMap((c) => (c.questions || []).map((q) => field(q, true)))], applyUrl: j.absolute_url };
}

async function pageFields(link) {
  const { chromium } = await PW();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });
    const applyUrl = /ashbyhq\.com/.test(link) ? link.replace(/\/(application)?\/?$/, "") + "/application" : /lever\.co/.test(link) ? link.replace(/\/(apply)?\/?$/, "") + "/apply" : link;
    await page.goto(applyUrl, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return await page.evaluate(() => {
      const txt = (el) => (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
      const ownLabel = (el) => {
        if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return txt(l); }
        const al = el.getAttribute("aria-label"); if (al) return al;
        const lb = el.getAttribute("aria-labelledby"); if (lb) return lb.split(/\s+/).map((i) => txt(document.getElementById(i))).join(" ").trim();
        const wrap = el.closest("label"); if (wrap) return txt(wrap).slice(0, 200);
        return "";
      };
      const nearLabel = (el, exclude = []) => {
        let p = el.parentElement;
        for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
          for (const l of p.querySelectorAll("legend, label, [class*=label], [class*=Label], [class*=question], [class*=Question], h1, h2, h3, h4, h5, p")) {
            const t = txt(l).slice(0, 200);
            if (t && !exclude.includes(t) && !l.querySelector("input, select, textarea")) return t;
            if (t && !exclude.includes(t) && l.tagName === "LEGEND") return t;
          }
        }
        return el.getAttribute("placeholder") || el.name || "";
      };
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 || r.height > 0 || el.type === "file"; };
      const out = []; const seen = new Set(); const groups = new Map();
      for (const el of document.querySelectorAll("input, select, textarea, [role=combobox], [role=listbox]")) {
        const type = el.type || el.getAttribute("role") || el.tagName.toLowerCase();
        if (["hidden", "submit", "button", "search"].includes(type) || !visible(el)) continue;
        if (type === "radio" || type === "checkbox") {
          const key = el.name || el.closest("fieldset, [role=group], [role=radiogroup]")?.id || ownLabel(el);
          if (!groups.has(key)) groups.set(key, { els: [], type });
          groups.get(key).els.push(el);
          continue;
        }
        const label = ownLabel(el) || nearLabel(el); if (!label) continue;
        const k = (el.name || el.id || "") + "|" + label; if (seen.has(k)) continue; seen.add(k);
        const options = el.tagName === "SELECT" ? [...el.options].map((o) => o.text.trim()).filter((t) => t && !/^(select|choose|--)/i.test(t)) : [];
        out.push({ label, required: el.required || el.getAttribute("aria-required") === "true" || /[✱*]/.test(label), type, options });
      }
      for (const { els, type } of groups.values()) {
        const options = els.map(ownLabel).filter(Boolean);
        // One lone checkbox is its own question (consent boxes).
        if (els.length === 1 && type === "checkbox") { out.push({ label: options[0] || nearLabel(els[0]), required: els[0].required, type, options: ["Yes"] }); continue; }
        out.push({ label: nearLabel(els[0], options), required: els.some((e) => e.required || e.getAttribute("aria-required") === "true"), type, options });
      }
      return { title: document.title, description: txt(document.body).slice(0, 20000), fields: out };
    });
  } finally { await browser.close(); }
}

export async function prepareRow(row, answers) {
  const kind = row.ATS || ats(row.Link);
  if (!BUILT.has(kind)) return { status: "todo", note: `no apply flow for ${kind} yet`, skip: true };
  // Workday renders every step in the browser and its questions change per step: the apply flow reads them as it goes.
  if (kind === "workday") {
    const job = await workdayJob(row.Link);
    if (job === "gone") return { status: "closed", note: "posting closed (Workday API)" };
    const us = usOnly(job?.jobPostingInfo?.jobDescription?.replace(/<[^>]+>/g, " "));
    if (us) return { status: "skip", note: `US citizen or green card required: "${us.slice(0, 120)}"` };
    const conflict = termConflict(row.Role);
    return conflict ? { status: "needs-human", note: `term conflict: "${conflict[0]}"` } : { status: "ready", note: "workday: the flow reads the steps" };
  }
  let form = kind === "greenhouse" ? await greenhouseFields(row.Link, row.Company) : null;
  if (form?.closed) return { status: "closed", note: "posting closed (Greenhouse 404)" };
  // An API that lists almost nothing (a custom board) is not a form read: use the page.
  if (!form || form.fields.length < 3) form = await pageFields(row.Link).catch((e) => ({ error: e.message }));
  if (form.error || !form.fields?.length) return { status: "needs-human", note: `could not read form: ${form.error || "no fields found"}` };
  const us = usOnly(form.description);
  if (us) return { status: "skip", note: `US citizen or green card required: "${us.slice(0, 120)}"` };
  const conflict = termConflict(`${row.Role} ${form.title} ${form.description}`.replace(/\s+/g, " "));
  const { filled, open } = match(form.fields, answers, row.Region);
  const dir = `${STATE}/forms/${slug(row.Company)}`; mkdirSync(dir, { recursive: true });
  const file = `${dir}/form-${slug(row.Role).slice(0, 60) || createHash("md5").update(row.Link).digest("hex").slice(0, 8)}.json`;
  writeFileSync(file, JSON.stringify({ link: row.Link, applyUrl: form.applyUrl || null, ats: kind, title: form.title, variant: row.Variant, filled, open, conflict: conflict?.[0] || null, fetchedAt: new Date().toISOString() }, null, 2));
  if (conflict) return { status: "needs-human", note: `term conflict: "${conflict[0]}"`, file, filled, open };
  if (filled.length < 3) return { status: "needs-human", note: `form unreadable: ${filled.length} fields matched`, file, filled, open };
  if (open.length) return { status: "needs-answer", note: open.map((q) => `Q: ${q}`).join("\n"), file, filled, open };
  return { status: "ready", note: `${filled.length} fields matched`, file, filled, open };
}

/** A Workday posting from the public API: "gone" (403/404), the job JSON, or null (not a Workday job URL or no answer). */
export async function workdayJob(url) {
  const m = url.replace(/\/apply.*$/, "").match(/^https:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/]+)(\/job\/.*)$/);
  if (!m) return null;
  const res = await fetch(`https://${m[1]}.${m[2]}.myworkdayjobs.com/wday/cxs/${m[1]}/${m[3]}${m[4]}`, { headers: { Accept: "application/json" } }).catch(() => null);
  if (res?.status === 403 || res?.status === 404) return "gone";
  return res?.ok ? res.json().catch(() => null) : null;
}

// ---- main -------------------------------------------------------------------
if (process.argv[1]?.endsWith("prepare.mjs")) {
  const api = await sheets();
  const answers = loadAnswers((await api.get("Answers!A1:D")).values);
  const drafts = (await api.get("Drafts!A1:G").catch(() => ({}))).values;
  const answersFor = (row) => [...draftAnswers(drafts, row.Link), ...answers];
  // --recheck: also re-read `needs-answer` rows, after the bank or drafts change.
  const recheck = process.argv.includes("--recheck");
  if (process.argv.includes("--dry")) {
    for (const link of process.argv.slice(3)) {
      const r = await prepareRow({ Link: link, Company: "dry-run", Role: "", Variant: "classic", ATS: ats(link), Region: process.env.REGION || "Canada" }, answers);
      console.log(`\n== ${link}\n   -> ${r.status}: ${r.note.replace(/\n/g, "; ")}`);
      for (const f of r.filled || []) console.log(`   ok  ${f.label.slice(0, 70)}  =>  ${f.answer}`);
    }
    process.exit(0);
  }
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values; const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const updates = []; let n = 0, waiting = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = Object.fromEntries(COLS.map((c) => [c, rows[i][idx[c]] ?? ""]));
    if (row.Status !== "todo" && !(recheck && row.Status === "needs-answer")) continue;
    const r = await prepareRow(row, answersFor(row));
    if (r.skip) { waiting++; continue; }
    n++;
    updates.push({ range: `Backlog!A${i + 2}`, values: [[r.status]] }, { range: `Backlog!K${i + 2}`, values: [[r.note]] });
    console.log(`${r.status.padEnd(12)} ${row.Company} | ${row.Role} | ${r.note.split("\n")[0]}`);
  }
  await api.batchPut(updates);
  console.log(`prepared ${n} rows; ${waiting} todo rows wait for an apply flow`);
}
