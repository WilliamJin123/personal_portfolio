// apply: submit applications through the ATS flows (flows/<ats>.mjs).
//
// Picks, top of the Backlog down: Status `ready` with Review B (send
// directly), and Status `go` on any tier (William checked a tier-A row).
// Caps: APPLY_PER_DAY (1000) by "Applied at" today, APPLY_PER_RUN (1000) per hourly
// run, so a day's sends spread out. After each row: `applied` + Applied at +
// Confirmation (screenshot), or `needs-human` + the reason in Notes.
//
// Files come from $STATE (launchd cannot read ~/Documents; install.sh copies):
//   $STATE/resumes/<variant>/William_Jin_Resume.pdf, falling back to classic/
//   $STATE/profile/William_Jin_Transcript.pdf
//
//   node apply.mjs                    # the worker
//   node apply.mjs --dry <url>...     # fill live forms, never submit; screenshots to $STATE/dry/
//   node apply.mjs --row <n> [--dry]  # one Backlog row now, any status or hour
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { flowRunner, httpClient, makeLlm, NeedsHuman } from "@wrenautomation/autobrowse";
import { loadAnswers, usOnly } from "./answers.mjs";
import { draftAnswers } from "./draft.mjs";
import { COLS, ats, jobKey } from "./enrich.mjs";
import { formApply } from "./flows/form.mjs";
import { greenhouseApply } from "./flows/greenhouse.mjs";
import { workdayApply } from "./flows/workday.mjs";
import { codeFor, mailCode } from "./flows/mailcode.mjs";
import { greenhouseJob, workdayJob } from "./prepare.mjs";
import { sheets } from "./sheet.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
// Open questions per posting already met once: see the needs-answer check in the run loop.
const REPEATS = `${STATE}/repeats.json`;
const repeats = existsSync(REPEATS) ? JSON.parse(readFileSync(REPEATS, "utf8")) : {};
const PER_DAY = Number(process.env.APPLY_PER_DAY || 1000);
const PER_RUN = Number(process.env.APPLY_PER_RUN || 1000);
// APPLY_SHARD=k/n: n parallel workers; worker k takes the postings whose key hashes to k. Own lock, own browser profiles.
const SHARD = (([k, n]) => ({ k, n }))((process.env.APPLY_SHARD || "0/1").split("/").map(Number));
const FLOWS = { greenhouse: greenhouseApply, ashby: formApply, lever: formApply, workday: workdayApply };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

// One folder per variant so the uploaded file is always named as a recruiter
// should see it (install.sh lays these out).
// A company with its own cut (out/companies/<slug>.pdf) wins over the role variant.
function files(variant, company = "") {
  const own = `company-${slug(company)}`;
  const dir = existsSync(`${STATE}/resumes/${own}`) ? own : existsSync(`${STATE}/resumes/${variant}`) ? variant : "classic";
  return { resume: `${STATE}/resumes/${dir}/William_Jin_Resume.pdf`, transcript: `${STATE}/profile/William_Jin_Transcript.pdf` };
}

// zapply.jobs/l/d/<ats>-<board>-<id> → the ATS's own posting.
function unwrap(link) {
  const m = link.match(/zapply\.jobs\/l\/d\/(ashby|lever)-(.+)-([0-9a-f]{8}-[0-9a-f-]{27})/i);
  return !m ? link : m[1] === "ashby" ? `https://jobs.ashbyhq.com/${m[2]}/${m[3]}` : `https://jobs.lever.co/${m[2]}/${m[3]}`;
}

/** A zapply Workday slug (tenant-site-jobId) → the posting's Workday URL, by Workday's own search. "gone" when the search finds nothing. */
async function zapplyWorkday(link) {
  const s = link.match(/workday-([^?#/]+)/)?.[1]; if (!s) return null;
  // The slug joins tenant, site and job id with "-", and each may hold "-" or "_" (JR-202621989, external_career_page):
  // try each split, each separator, every data centre at once.
  const parts = s.split("-"), tenant = parts[0], seen = new Set(); let gone = null;
  const query = async (wd, site, job) => {
    const res = await fetch(`https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: job }), signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (res?.status !== 200) return null;
    const hit = (await res.json().catch(() => ({}))).jobPostings?.find((p) => p.externalPath?.includes(job));
    return hit ? `https://${tenant}.${wd}.myworkdayjobs.com/en-US/${site}${hit.externalPath}` : "gone";
  };
  for (let j = 1; j <= Math.min(3, parts.length - 2); j++) {
    const ids = [parts.slice(-j).join("-"), parts.slice(-j).join("_")], mid = parts.slice(1, -j);
    for (const site of [mid.join("-"), mid.join("_")]) for (const job of ids) {
      if (seen.has(site + job)) continue; seen.add(site + job);
      const out = (await Promise.all(["wd1", "wd2", "wd3", "wd5", "wd10", "wd12", "wd101", "wd102", "wd103", "wd105", "wd108", "wd115", "wd501", "wd503"].map((wd) => query(wd, site, job)))).filter(Boolean);
      if (out.some((u) => u !== "gone")) return out.find((u) => u !== "gone");
      if (out.length) gone = "gone"; // a site answered, the job is not on it
    }
  }
  return gone;
}

/** The posting's own Greenhouse page: company career pages wrap it in an iframe. */
async function target(row) {
  // Other zapply links (Workday, ...): the redirect holds the real posting.
  if (row.ATS !== "greenhouse" && /zapply\.jobs/.test(unwrap(row.Link))) {
    const url = (await fetch(row.Link, { redirect: "follow" }).catch(() => null))?.url || row.Link;
    // zapply sends some live jobs to its own index: find the posting on Workday instead.
    return /zapply\.jobs/.test(url) && row.ATS === "workday" ? (await zapplyWorkday(row.Link)) || url : url;
  }
  if (row.ATS !== "greenhouse") return unwrap(row.Link);
  const job = await greenhouseJob(row.Link, row.Company);
  return job ? `https://job-boards.greenhouse.io/embed/job_app?for=${job.board}&token=${job.id}` : row.Link;
}

// Captcha eyes: picture challenges (Lever's hCaptcha) need a model that sees;
// without one the solver clicks checkboxes only. Claude through the
// subscription. Same as autobrowse's eyesOf, which the package does not export.
function eyes() {
  const llm = makeLlm({ provider: "claude-code", model: process.env.CAPTCHA_MODEL || "sonnet" }, httpClient());
  return llm && { look: async (png, question) => (await llm.complete({ purpose: "captcha", system: "You solve captchas on the account owner's own browser, with their permission. Answer with the JSON object asked for, nothing else.", prompt: question, images: [{ mediaType: "image/png", data: png.toString("base64") }], json: true, maxTokens: 300 })).text };
}
// Lever's enterprise hCaptcha rejects a headless browser's token even when solved: Lever runs headed
// (autobrowse keeps the window out of the way).
const runner = (headed = !!process.env.HEADED) => flowRunner({ tier: "local", profilesDir: `${STATE}/profiles${SHARD.n > 1 ? `-w${SHARD.k}` : ""}`, artifactsDir: `${STATE}/artifacts`, headless: !headed, channel: "chrome" }, { captcha: { eyes: eyes(), attempts: 3 } });

// Greenhouse's emailed security code: the UW inbox is open in autobrowse's own signed-in profile (outlook@uw),
// not ours. The mail takes a few seconds to arrive, so ask up to three times.
async function fetchCode(company) {
  const nowMin = () => { const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" }).split(":").map(Number); return h * 60 + m; };
  const since = nowMin() - 5; // mail for this submit: sent after we pressed the button
  for (let t = 0; t < 3; t++) {
    await new Promise((r) => setTimeout(r, 12_000));
    const code = codeFor((await mailCode({ query: `subject:"Security code for your application to ${company.split(/[\s,]/)[0]}"` })).text, company, since);
    if (code) return code;
  }
  return null;
}

// One line per attempt: the failure rate and slow steps show up in $STATE/runs.jsonl without reading the Sheet.
async function applyRow(run, row, answers, dryRun) {
  const t0 = Date.now(), r = await applyRowInner(run, row, answers, dryRun);
  if (!dryRun && !r.skip) try { appendFileSync(`${STATE}/runs.jsonl`, JSON.stringify({ at: new Date().toISOString(), company: row.Company, role: row.Role, ats: row.ATS, variant: row.Variant, tier: row.Review, status: r.status, seconds: Math.round((Date.now() - t0) / 1000), note: (r.note || "").slice(0, 160), ...(r.filled ? { filled: r.filled.map((f) => [f.label, f.answer]) } : {}) }) + "\n"); } catch {}
  return r;
}

/** Workday's public job API: 403 "permission denied" means the posting is gone (open postings answer 200). */
async function applyRowInner(run, row, answers, dryRun) {
  const flow = FLOWS[row.ATS];
  if (!flow) return { status: row.Status, note: `no apply flow for ${row.ATS}`, skip: true };
  const dir = `${STATE}/${dryRun ? "dry" : "applied"}/${slug(row.Company)}`; mkdirSync(dir, { recursive: true });
  const screenshot = `${dir}/${slug(row.Role).slice(0, 60) || "posting"}-${Date.now()}.png`;
  try {
    const url = await target(row);
    if (row.ATS === "workday") {
      const job = url === "gone" ? "gone" : await workdayJob(url);
      if (job === "gone") return { status: dryRun ? row.Status : "closed", note: "posting closed (Workday API)" };
      const us = usOnly(job?.jobPostingInfo?.jobDescription?.replace(/<[^>]+>/g, " "));
      if (us) return { status: dryRun ? row.Status : "skip", note: `US citizen or green card required: "${us.slice(0, 120)}"` };
    }
    const out = await run.run(flow, { url, answers, region: row.Region, files: files(row.Variant || "classic", row.Company), dryRun, screenshot, fetchCode: () => fetchCode(row.Company) });
    return { status: dryRun ? row.Status : "applied", note: `${out.status}: ${out.filled.length} fields`, screenshot, filled: out.filled };
  } catch (e) {
    const where = e instanceof NeedsHuman && e.artifacts?.screenshot ? ` [${e.artifacts.screenshot}]` : "";
    return { status: "needs-human", note: `${e instanceof NeedsHuman ? "" : "error: "}${e.message}${where}`.slice(0, 500), raw: e.message };
  }
}

if (process.argv[1]?.endsWith("apply.mjs")) {
  const api = await sheets();
  const answers = loadAnswers((await api.get("Answers!A1:D")).values);
  // A posting's drafts (draft.mjs) go ahead of the bank.
  const drafts = (await api.get("Drafts!A1:G").catch(() => ({}))).values;
  // Fresh per row: a rule fixed mid-pass applies to the next row, not the next pass.
  const answersFor = async (row) => {
    const [bank, dr] = await Promise.all([api.get("Answers!A1:D").then((r) => loadAnswers(r.values)).catch(() => answers), api.get("Drafts!A1:G").then((r) => r.values).catch(() => drafts)]);
    return [...draftAnswers(dr, row.Link), ...bank];
  };
  const run = runner(), headedRun = runner(true);

  if (process.argv.includes("--dry") && !process.argv.includes("--row")) {
    for (const link of process.argv.slice(process.argv.indexOf("--dry") + 1)) {
      const r = await applyRow(run, { Link: link, Company: "dry-run", Role: link.split("/").pop(), ATS: ats(link), Region: process.env.REGION || "Canada", Variant: process.env.VARIANT || "classic", Status: "" }, answers, true);
      console.log(`\n== ${link}\n   -> ${r.status || "filled"}: ${r.note}${r.screenshot ? `\n   screenshot ${r.screenshot}` : ""}`);
      for (const f of r.filled || []) console.log(`   ok  ${f.label.slice(0, 60)}  =>  ${f.answer}`);
    }
    process.exit(0);
  }

  const one = process.argv.includes("--row") ? Number(process.argv[process.argv.indexOf("--row") + 1]) : 0;
  // One sender at a time: two runs would pick the same ready row. The lock holds the sender's pid; a dead pid frees it.
  const LOCK = `${STATE}/apply${SHARD.n > 1 ? `-w${SHARD.k}` : ""}.lock`;
  if (!one) {
    const alive = (pid) => { try { return pid > 0 && process.kill(pid, 0); } catch { return false; } };
    if (existsSync(`${LOCK}/pid`) && alive(Number(readFileSync(`${LOCK}/pid`, "utf8")))) { console.log("apply: another run is sending, nothing done"); process.exit(0); }
    rmSync(LOCK, { recursive: true, force: true }); mkdirSync(LOCK); writeFileSync(`${LOCK}/pid`, String(process.pid));
    process.on("exit", () => rmSync(LOCK, { recursive: true, force: true }));
    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => process.exit(1));
  }
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values;
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const col = (c) => String.fromCharCode(65 + COLS.indexOf(c));
  const objs = rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[idx[c]] ?? ""])));
  let room = one ? 1 : Math.min(PER_RUN, PER_DAY - objs.filter((o) => o["Applied at"].startsWith(today())).length);
  let sent = 0, failed = 0;
  const appliedKeys = new Set(objs.filter((o) => o["Applied at"]).map((o) => jobKey(o.Link)));
  // A tier A row with AI drafts still marked `review` in the Drafts tab waits for William
  // (he sets them to yes, or the row to go). Bank-only tier A rows send.
  const [dh, ...drows] = drafts || [[]]; const di = Object.fromEntries(dh.map((x, k) => [x, k]));
  const pending = new Set(drows.filter((r) => r[di.Draft] && (r[di.Use] || "").toLowerCase() === "review").map((r) => r[di.Link]));
  // Tier A first, best pay first; then tier B.
  const order = objs.map((_, i) => i).sort((x, y) => (objs[x].Review === "A" ? 0 : 1) - (objs[y].Review === "A" ? 0 : 1) || (Number(objs[y]["Pay/hr"]) || 0) - (Number(objs[x]["Pay/hr"]) || 0));
  for (const i of order) {
    if (room <= 0) break;
    const row = objs[i];
    const pick = one ? i + 2 === one : row.Status === "go" || (row.Status === "ready" && (row.Review === "B" || !pending.has(row.Link)));
    // Shard by posting key, not row: duplicate rows of one posting go to the same worker, whose applied check stops the second.
    if (!one && [...jobKey(row.Link)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SHARD.n !== SHARD.k) continue;
    if (!pick || !FLOWS[row.ATS] || (process.env.APPLY_TIER && row.Review !== process.env.APPLY_TIER)) continue;
    if (appliedKeys.has(jobKey(row.Link))) { await api.batchPut([{ range: `Backlog!${col("Status")}${i + 2}`, values: [["skip"]] }, { range: `Backlog!${col("Notes")}${i + 2}`, values: [["duplicate: already applied under another row"]] }]); continue; }
    const dry = one > 0 && process.argv.includes("--dry");
    const r = await applyRow(row.ATS === "lever" ? headedRun : run, row, await answersFor(row), dry);
    // A live form asked what prepare never saw (a conditional question): hand it to draft.mjs, not to William.
    // From the full message: the 500-character note can cut a long question's closing quote and leave no question at all.
    const unseen = r.status === "needs-human" && (r.raw || r.note).match(/no answer for ([\s\S]+?)(?: \[\/|$)/);
    if (unseen) { r.status = "needs-answer"; r.note = [...unseen[1].matchAll(/"([^"]+)(?:"|$)/g)].map((m) => `Q: ${m[1]}`).join("\n").slice(0, 4000); }
    // zapply.jobs is a redirector: "no Workday form" there is its 404, the posting is gone (Rockwell, Bose).
    if (r.status === "needs-human" && (/posting closed/.test(r.note) || /no Workday form at https:\/\/zapply\.jobs\/jobs\/apply\//.test(r.note))) r.status = "closed";
    // The same open questions twice for one posting: a rule matched in prepare but the live form refuses it. A third run only writes another trace.
    if (!dry && r.status === "needs-answer") {
      const qs = [...r.note.matchAll(/^Q: (.{1,80})/gm)].map((m) => m[1]).sort().join("|");
      const k = `${jobKey(row.Link)}\t${qs}`;
      if (qs && repeats[k]) { r.status = "needs-human"; r.note = `same question again (rule matched, form refused):\n${r.note}`; }
      repeats[k] = (repeats[k] || 0) + 1; writeFileSync(REPEATS, JSON.stringify(repeats));
    }
    // A flaky page or a busy browser profile: back in the queue at once, one retry per row.
    if (r.status === "needs-human" && /Timeout \d+ms exceeded|no Workday form|outside of the viewport|profile \S+ is open|net::ERR|something went wrong|has been closed|ECONNRESET|socket hang up/i.test(r.note) && !/^retry:/.test(row.Notes)) { r.status = "ready"; r.note = `retry: ${r.note}`; }
    if (dry) { console.log(r.note, r.screenshot || ""); for (const f of r.filled || []) console.log(`   ok  ${f.label.slice(0, 60)}  =>  ${/SECRET/.test(f.raw) ? "[profile]" : f.answer}`); break; }
    if (r.skip) continue;
    room--;
    const n = i + 2;
    const data = [{ range: `Backlog!${col("Status")}${n}`, values: [[r.status]] }, { range: `Backlog!${col("Notes")}${n}`, values: [[r.note]] }];
    if (r.status === "applied") {
      sent++; appliedKeys.add(jobKey(row.Link));
      data.push({ range: `Backlog!${col("Applied at")}${n}`, values: [[new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" })]] }, { range: `Backlog!${col("Confirmation")}${n}`, values: [[r.screenshot]] });
    } else failed++;
    await api.batchPut(data); // per row: a crash never loses a send
    console.log(`${r.status.padEnd(12)} ${row.Company} | ${row.Role} | ${r.note.split("\n")[0]}`);
  }
  console.log(`applied ${sent}, needs-human ${failed}; room left today ${Math.max(0, PER_DAY - objs.filter((o) => o["Applied at"].startsWith(today())).length - sent)}`);
  process.exit(0);
}
