// apply: submit applications through the ATS flows (flows/<ats>.mjs).
//
// Picks, top of the Backlog down: Status `ready` with Review B (send
// directly), and Status `go` on any tier (William checked a tier-A row).
// Caps: APPLY_PER_DAY (40) by "Applied at" today, APPLY_PER_RUN (5) per hourly
// run, so a day's sends spread out. After each row: `applied` + Applied at +
// Confirmation (screenshot), or `needs-human` + the reason in Notes.
//
// Files come from $STATE (launchd cannot read ~/Documents; install.sh copies):
//   $STATE/resumes/<variant>/William_Jin_Resume.pdf, falling back to classic/
//   $STATE/profile/William_Jin_Transcript.pdf
//
//   node apply.mjs                    # the worker
//   node apply.mjs --dry <url>...     # fill live forms, never submit; screenshots to $STATE/dry/
import { existsSync, mkdirSync } from "node:fs";
import { flowRunner, NeedsHuman } from "@wrenautomation/autobrowse";
import { loadAnswers } from "./answers.mjs";
import { COLS, ats } from "./enrich.mjs";
import { greenhouseApply } from "./flows/greenhouse.mjs";
import { greenhouseJob } from "./prepare.mjs";
import { sheets } from "./sheet.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
const PER_DAY = Number(process.env.APPLY_PER_DAY || 40);
const PER_RUN = Number(process.env.APPLY_PER_RUN || 5);
const FLOWS = { greenhouse: greenhouseApply };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

// One folder per variant so the uploaded file is always named as a recruiter
// should see it (install.sh lays these out).
function files(variant) {
  const dir = existsSync(`${STATE}/resumes/${variant}`) ? variant : "classic";
  return { resume: `${STATE}/resumes/${dir}/William_Jin_Resume.pdf`, transcript: `${STATE}/profile/William_Jin_Transcript.pdf` };
}

/** The posting's own Greenhouse page: company career pages wrap it in an iframe. */
async function target(row) {
  if (row.ATS !== "greenhouse") return row.Link;
  const job = await greenhouseJob(row.Link, row.Company);
  return job ? `https://job-boards.greenhouse.io/embed/job_app?for=${job.board}&token=${job.id}` : row.Link;
}

const runner = () => flowRunner({ tier: "local", profilesDir: `${STATE}/profiles`, artifactsDir: `${STATE}/artifacts`, headless: process.env.HEADED ? false : true, channel: "chrome" });

async function applyRow(run, row, answers, dryRun) {
  const flow = FLOWS[row.ATS];
  if (!flow) return { status: row.Status, note: `no apply flow for ${row.ATS}`, skip: true };
  const dir = `${STATE}/${dryRun ? "dry" : "applied"}/${slug(row.Company)}`; mkdirSync(dir, { recursive: true });
  const screenshot = `${dir}/${slug(row.Role).slice(0, 60) || "posting"}-${Date.now()}.png`;
  try {
    const out = await run.run(flow, { url: await target(row), answers, region: row.Region, files: files(row.Variant || "classic"), dryRun, screenshot });
    return { status: dryRun ? row.Status : "applied", note: `${out.status}: ${out.filled.length} fields`, screenshot, filled: out.filled };
  } catch (e) {
    const where = e instanceof NeedsHuman && e.artifacts?.screenshot ? ` [${e.artifacts.screenshot}]` : "";
    return { status: "needs-human", note: `${e instanceof NeedsHuman ? "" : "error: "}${e.message}${where}`.slice(0, 500) };
  }
}

if (process.argv[1]?.endsWith("apply.mjs")) {
  const api = await sheets();
  const answers = loadAnswers((await api.get("Answers!A1:D")).values);
  const run = runner();

  if (process.argv.includes("--dry")) {
    for (const link of process.argv.slice(process.argv.indexOf("--dry") + 1)) {
      const r = await applyRow(run, { Link: link, Company: "dry-run", Role: link.split("/").pop(), ATS: ats(link), Region: process.env.REGION || "Canada", Variant: process.env.VARIANT || "classic", Status: "" }, answers, true);
      console.log(`\n== ${link}\n   -> ${r.status || "filled"}: ${r.note}${r.screenshot ? `\n   screenshot ${r.screenshot}` : ""}`);
      for (const f of r.filled || []) console.log(`   ok  ${f.label.slice(0, 60)}  =>  ${f.answer}`);
    }
    process.exit(0);
  }

  // Sends only in daytime Toronto hours: a 3 a.m. burst reads as a bot, and a person answers hand-offs by day.
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hour12: false }));
  const [from, to] = (process.env.APPLY_HOURS || "9-21").split("-").map(Number);
  if (hour < from || hour >= to) { console.log(`apply: outside ${from}:00–${to}:00, nothing sent`); process.exit(0); }
  const [header, ...rows] = (await api.get("Backlog!A1:R")).values;
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const col = (c) => String.fromCharCode(65 + COLS.indexOf(c));
  const objs = rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[idx[c]] ?? ""])));
  let room = Math.min(PER_RUN, PER_DAY - objs.filter((o) => o["Applied at"].startsWith(today())).length);
  let sent = 0, failed = 0;
  for (let i = 0; i < objs.length && room > 0; i++) {
    const row = objs[i];
    const pick = row.Status === "go" || (row.Status === "ready" && row.Review === "B");
    if (!pick || !FLOWS[row.ATS]) continue;
    const r = await applyRow(run, row, answers, false);
    if (r.skip) continue;
    room--;
    const n = i + 2;
    const data = [{ range: `Backlog!${col("Status")}${n}`, values: [[r.status]] }, { range: `Backlog!${col("Notes")}${n}`, values: [[r.note]] }];
    if (r.status === "applied") {
      sent++;
      data.push({ range: `Backlog!${col("Applied at")}${n}`, values: [[new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" })]] }, { range: `Backlog!${col("Confirmation")}${n}`, values: [[r.screenshot]] });
    } else failed++;
    await api.batchPut(data); // per row: a crash never loses a send
    console.log(`${r.status.padEnd(12)} ${row.Company} | ${row.Role} | ${r.note.split("\n")[0]}`);
  }
  console.log(`applied ${sent}, needs-human ${failed}; room left today ${Math.max(0, PER_DAY - objs.filter((o) => o["Applied at"].startsWith(today())).length - sent)}`);
  process.exit(0);
}
