// mail: reads the UW Outlook inbox and keeps the Backlog's statuses current.
//
// Three stages, each cheaper than the next one is costly:
//   1. List scan (free). Every unseen inbox row is tested with a broad regex
//      (thanks for applying, unfortunately, interview, ...) and an ATS sender
//      list (greenhouse-mail.io, myworkday.com, ...). Newsletters and job
//      alerts drop out here.
//   2. Open the mail and trust the sender. The address domain must be an ATS
//      or match a company we applied to. An unknown sender is logged, never acted on.
//   3. Classify (Claude): confirmation / rejection / interview / assessment /
//      offer, and which Backlog row. Confident and unambiguous → Status, Next
//      action and Due update; anything else is logged for William.
// Every opened mail is logged on the `Mail` tab. The `Applied` tab is rebuilt last.
//
//   node mail.mjs               # the worker: unseen mail, MAIL_LLM_PER_RUN (25) classifications
//   node mail.mjs --dry         # classify and print, write nothing
//   node mail.mjs --max 400     # scan deeper (default 250 inbox rows)
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { renderApplied, OPEN, tab } from "./applied.mjs";
import { COLS } from "./enrich.mjs";
import { archive, mailLinks, VERIFY, withOutlook } from "./flows/mailcode.mjs";
import { sheets } from "./sheet.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
const SEEN = `${STATE}/mail-seen.json`;
const MODEL = process.env.MAIL_MODEL || "claude-sonnet-5-5";
const UNREAD_MAX = 100;
const PER_RUN = Number(process.env.MAIL_LLM_PER_RUN || 25);
const DRY = process.argv.includes("--dry");
const MAX = process.argv.includes("--max") ? Number(process.argv[process.argv.indexOf("--max") + 1]) : 25;
const MAIL = ["Seen", "Received", "From", "Subject", "Sender domain", "Kind", "Company", "Role", "Action", "Link", "Conf", "Why"];

// Senders that only write about applications.
export const ATS_SENDER = /@([a-z0-9-]+\.)*(greenhouse(-mail)?\.io|lever\.co|ashbyhq\.com|myworkday(jobs)?\.com|workday\.com|icims\.com|smartrecruiters\.com|workablemail\.com|workable\.com|jobvite\.com|bamboohr\.com|breezy\.hr|recruitee\.com|teamtailor\.com|rippling\.com|gem\.com|hirevue\.com|codesignal\.com|hackerrank\.com|karat\.com|brassring\.com|taleo\.net|successfactors\.(com|eu)|eightfold\.ai|phenompeople\.com|oraclecloud\.com|paylocity\.com|talentreef\.com|pinpointhq\.com|hirebridge\.com|applytojob\.com|jazzhr\.com|ats\.rippling\.com)$/i;
// Broad on purpose: the later stages catch what this lets through.
export const SIGNAL = /thank(s| you) for (your )?(interest|appl)|appl(ication|ied|ying)\b.{0,40}(received|submitted|review|status|complete)|received your appl|we('ve| have) received|unfortunately|not (be )?(moving|move|proceed)|move forward|decided to|other candidates|regret to|next steps|interview|assessment|coding (challenge|test)|online (test|assessment)|schedule (a|your)|invitation to|your candidacy|\boffer\b|hiring (team|manager)|recruit(er|ing)|status of your|your application/i;
// Mail that mentions applications but is not about ours.
export const NOISE = /unsubscribe from|job alerts?\b|jobs? (for you|you may like|recommended)|newsletter|weekly digest|webinar|\d+% off|receipt|invoice|security code for your application|password reset|\bsale\b/i;

const TIME = /^(\d{1,2}:\d\d\s*[AP]M|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Yesterday|\d{4}-\d\d-\d\d)/i;
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Splits one inbox row's text into sender, subject, time and preview. */
export function parseRow(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (/^[A-Z?]{1,2}$/.test(lines[0] || "")) lines.shift();
  const [from = "", subject = ""] = lines;
  const t = lines.findIndex((l, k) => k >= 2 && TIME.test(l));
  return { from, subject, time: t > 0 ? lines[t] : "", preview: lines.slice(t > 0 ? t + 1 : 2).join(" ") };
}

export const address = (s) => (s.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i) || [""])[0].toLowerCase();

/** Stage 1. */
export const passes = (r) => VERIFY.test(`${r.subject} ${r.preview}`) || !NOISE.test(`${r.subject} ${r.preview}`) && (ATS_SENDER.test(address(r.from)) || SIGNAL.test(`${r.subject} ${r.preview}`));

/** Applications this mail could be about: the company's name shows in the sender, subject or body. */
export function candidates(mail, rows) {
  // Whole words ("ING" is not in "verifying"); a name also matches run together ("smithnephew" in a Workday host). Longest name first.
  const words = (x) => ` ${x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const hay = words(`${mail.from} ${mail.addr} ${mail.subject} ${mail.body.slice(0, 2500)}`);
  const name = (r) => words(r.Company.replace(/\b(inc|llc|ltd|corp(oration)?|technologies|technology|labs)\b\.?/gi, "")).trim();
  return rows.filter((r) => { const c = name(r); return c.length >= 3 && (hay.includes(` ${c} `) || (c.includes(" ") && hay.includes(` ${c.replace(/ /g, "")} `))); })
    .sort((a, b) => name(b).length - name(a).length);
}

/** Stage 2: an ATS, or a domain that holds one of the candidates' names. */
export function trusted(mail, cands) {
  if (ATS_SENDER.test(mail.addr)) return true;
  const dom = norm(mail.addr.split("@")[1]);
  return cands.some((r) => { const c = norm(r.Company.replace(/\b(inc|llc|ltd|corp(oration)?|technologies|technology|labs)\b\.?/gi, "")); return c.length >= 3 && dom.includes(c); });
}

// Never downgrade: an interview does not go back to applied.
const RANK = { "needs-human": -1, ready: -1, "needs-answer": -1, go: -1, todo: -1, applied: 0, assessment: 1, interview: 2, rejected: 3, offer: 4 };
const STATUS = { confirmation: "applied", assessment: "assessment", interview: "interview", rejection: "rejected", offer: "offer" };

async function classify(mail, cands) {
  const prompt = `You read one email sent to a student applying for internships and decide what it says about the applications listed.\n\nEmail\nFrom: ${mail.from} <${mail.addr}>\nSubject: ${mail.subject}\nReceived: ${mail.received}\n\n${mail.body.slice(0, 3500)}\n\nApplications this mail may be about:\n${cands.map((r, i) => `${i + 1}. ${r.Company} | ${r.Role} | status ${r.Status}`).join("\n")}\n\nkind is one of: confirmation (we received your application), rejection (no / not moving forward), interview (an interview or call is offered or scheduled), assessment (a coding test, take-home or questionnaire to complete), offer, info (about an application but changes nothing), other (not about an application).\nrow is the number of the one application the mail is about. Use the role title if the mail names it. null when it could be several roles or none.\nReply with JSON only: {"kind": "...", "row": 1 or null, "confidence": 0 to 1, "due": "YYYY-MM-DD" or null, "next": "what William must do, five words" or null, "why": "a few words"}`;
  const child = promisify(execFile)("claude", ["-p", "--model", MODEL, "--output-format", "text", "--tools", ""], { maxBuffer: 1 << 24, timeout: 300000 });
  child.child.stdin.end(prompt);
  const { stdout } = await child;
  const j = stdout.match(/\{[\s\S]*\}/)?.[0];
  if (!j) throw new Error(`no JSON in the reply: ${stdout.slice(0, 100)}`);
  return JSON.parse(j);
}

async function readMail(page, conv, view = "inbox") {
  await setView(page, view);
  const item = page.locator(`[role=listbox] [role=option][data-convid="${conv}"]`).first();
  await item.scrollIntoViewIfNeeded(); await item.click(); await page.waitForTimeout(2_500);
  const pane = await page.evaluate(() => (document.querySelector("[role=main], #ReadingPaneContainerId") || document.body).innerText);
  const head = pane.slice(0, 900);
  const d = head.match(/(\d{4}-\d\d-\d\d)\s+(\d{1,2}:\d\d\s*[AP]M)/);
  return { addr: address(head), received: d ? `${d[1]} ${d[2]}` : "", body: pane };
}

async function scan(page, max) {
  const rows = page.locator("[role=listbox] [role=option]");
  await rows.first().waitFor({ timeout: 45_000 }).catch(() => { throw new Error(`outlook is not signed in at ${page.url()}`); });
  await page.waitForTimeout(2_000);
  const seen = new Map();
  await collect(page, rows, seen, max);
  const inbox = new Set(seen.keys());
  // Pass 2: everything still unread, however far down. Mail read on a phone drops out of this pass, so pass 1 stays.
  const box = page.locator("input[aria-label^='Search'], #topSearchInput, [role=combobox][aria-label^='Search']").first();
  try {
    await box.fill("isread:no"); await box.press("Enter"); await page.waitForTimeout(4_000);
    await collect(page, rows, seen, UNREAD_MAX);
    page.view = "unread";
  } catch (e) { page.view = "unknown"; console.log(`unread pass skipped: ${e.message.slice(0, 80)}`); }
  return [...seen].map(([conv, text]) => ({ conv, view: inbox.has(conv) ? "inbox" : "unread", key: `${conv}|${norm(text).slice(0, 120)}`, ...parseRow(text) }));
}

/** A row can be clicked only in the list that showed it: the inbox, or the unread search. */
async function setView(page, view) {
  if (page.view === view) return;
  if (view === "unread") {
    const box = page.locator("input[aria-label^='Search'], #topSearchInput, [role=combobox][aria-label^='Search']").first();
    await box.fill("isread:no"); await box.press("Enter");
  } else await page.goto("https://outlook.office.com/mail/", { waitUntil: "domcontentloaded" });
  await page.locator("[role=listbox] [role=option]").first().waitFor({ timeout: 45_000 });
  await page.waitForTimeout(3_000);
  page.view = view;
}

async function collect(page, rows, seen, max) {
  const start = seen.size;
  // Outlook draws about 10 rows and loads more on scroll: a slow load is not the end of the list, so give it 3 empty tries.
  for (let k = 0, dry = 0; k < 40 && seen.size - start < max && dry < 3; k++) {
    const before = seen.size;
    for (const it of await rows.evaluateAll((es) => es.map((e) => ({ conv: e.getAttribute("data-convid"), text: e.innerText })))) if (it.conv && !seen.has(it.conv)) seen.set(it.conv, it.text);
    dry = seen.size === before && k > 0 ? dry + 1 : 0;
    await rows.last().scrollIntoViewIfNeeded(); await page.waitForTimeout(dry ? 2_500 : 1_200);
  }
}

if (process.argv[1]?.endsWith("mail.mjs")) {
  const api = await sheets();
  await tab(api, "Mail", MAIL, 3000);
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values;
  const idx = Object.fromEntries(header.map((h, k) => [h, k]));
  const objs = rows.map((r, k) => ({ ...Object.fromEntries(COLS.map((c) => [c, r[idx[c]] ?? ""])), n: k + 2 }));
  // Sent rows, and rows apply could not confirm (a mail can prove they went through).
  const applied = objs.filter((o) => OPEN.includes(o.Status) || ["needs-human", "ready", "needs-answer", "go"].includes(o.Status));
  const col = (c) => String.fromCharCode(65 + COLS.indexOf(c));
  const seen = new Set(existsSync(SEEN) ? JSON.parse(readFileSync(SEEN, "utf8")) : []);
  const found = await withOutlook((page) => scan(page, MAX).then(async (all) => ({ all, opened: await openPassing(page, all) })));
  async function openPassing(page, all) {
    const fresh = all.filter((r) => !seen.has(r.key)).sort((a, b) => (a.view === "inbox" ? 0 : 1) - (b.view === "inbox" ? 0 : 1)), out = [];
    for (const r of fresh) {
      if (!passes(r)) { seen.add(r.key); continue; }
      if (out.length >= PER_RUN) continue;
      try {
        const m = { ...r, ...(await readMail(page, r.conv, r.view)) };
        // An account or email verification: open its link now, so the application can go on.
        if (VERIFY.test(`${r.subject} ${r.preview}`)) {
          // The apply flow waits up to 3 min for its own verify mail: a younger one is its to use. Left unseen, the next run takes it.
          const at = m.received ? new Date(`${m.received.slice(0, 10)}T00:00:00`).getTime() + (() => { const t = m.received.slice(11).match(/(\d+):(\d+)\s*([AP])M/i); return t ? ((Number(t[1]) % 12 + (/p/i.test(t[3]) ? 12 : 0)) * 60 + Number(t[2])) * 60_000 : 0; })() : 0;
          if (at && Date.now() - at < 6 * 60_000) continue;
          const links = await mailLinks(page);
          const link = links.find((l) => /verif|confirm|activat|token/i.test(l.text + " " + l.href) && !/unsubscribe|privacy|mailto:|safelinks/i.test(l.href))?.href;
          m.verified = link ? await page.context().newPage().then(async (p) => { await p.goto(link, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {}); await p.waitForTimeout(5_000); const u = p.url(); await p.close(); return u; }) : "";
          // Used (or used already by the apply flow): out of the inbox. No link: it stays for William.
          if (link) await archive(page);
        }
        out.push(m);
      } catch (e) { console.log(`skip open ${r.subject.slice(0, 50)}: ${e.message.slice(0, 80)}`); }
    }
    return out;
  }
  console.log(`inbox rows ${found.all.length}, new ${found.all.filter((r) => !seen.has(r.key)).length}, passed stage 1 and opened ${found.opened.length}`);
  const log = [], ups = [];
  for (const mail of found.opened) {
    const cands = candidates(mail, applied), ok = trusted(mail, cands), at = new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" });
    const entry = [at, mail.received, mail.addr || mail.from, mail.subject.slice(0, 120), mail.addr.split("@")[1] || "", "", "", "", "", "", "", ""];
    if (mail.verified !== undefined) {
      entry[5] = "verify"; entry[6] = cands[0]?.Company || ""; entry[8] = mail.verified ? `opened link → ${mail.verified.slice(0, 80)}` : "review: no link found";
      // Rows that stopped on this verification go back to the queue.
      for (const c of cands.filter((c) => c.Status === "needs-human" && /verif/i.test(c.Notes))) ups.push({ range: `Backlog!${col("Status")}${c.n}`, values: [["ready"]] });
      console.log(`verify        ${(entry[6] || "-").padEnd(24)} ${entry[8]}  | ${mail.subject.slice(0, 60)}`);
      log.push(entry); seen.add(mail.key); continue;
    }
    let verdict = null;
    try { if (cands.length) verdict = await classify(mail, cands); } catch (e) { entry[8] = `error: ${e.message.slice(0, 80)}`; console.log(`error ${mail.subject.slice(0, 50)}: ${e.message.slice(0, 100)}`); log.push(entry); continue; }
    const row = verdict?.row ? cands[verdict.row - 1] : null;
    entry[5] = verdict?.kind || (cands.length ? "" : "no-match"); entry[6] = row?.Company || cands.map((c) => c.Company).filter((c, i, a) => a.indexOf(c) === i).slice(0, 3).join(", "); entry[7] = row?.Role || ""; entry[9] = row?.Link || ""; entry[10] = verdict?.confidence ?? ""; entry[11] = verdict?.why || "";
    const status = STATUS[verdict?.kind];
    if (!verdict) entry[8] = cands.length ? "review" : "ignored: matches no application";
    else if (!status) entry[8] = "logged";
    else if (!ok) entry[8] = "review: sender not verified";
    else if (!row) entry[8] = "review: several roles";
    else if (verdict.confidence < 0.8) entry[8] = "review: low confidence";
    else if (RANK[status] <= RANK[row.Status] && status !== row.Status) entry[8] = `kept ${row.Status}`;
    else {
      entry[8] = status === row.Status ? `confirmed ${status}` : `${row.Status} → ${status}`;
      if (status !== row.Status) ups.push({ range: `Backlog!${col("Status")}${row.n}`, values: [[status]] });
      if (!row["Applied at"]) ups.push({ range: `Backlog!${col("Applied at")}${row.n}`, values: [[mail.received || at]] }, { range: `Backlog!${col("Confirmation")}${row.n}`, values: [[`mail: ${mail.subject.slice(0, 80)}`]] });
      if (verdict.next || ["interview", "assessment"].includes(status)) ups.push({ range: `Backlog!${col("Next action")}${row.n}`, values: [[verdict.next || ""]] }, { range: `Backlog!${col("Due")}${row.n}`, values: [[verdict.due || ""]] });
      row.Status = status;
    }
    console.log(`${(entry[5] || "-").padEnd(13)} ${(row?.Company || "-").padEnd(24)} ${entry[8]}  | ${mail.subject.slice(0, 60)}`);
    log.push(entry); seen.add(mail.key);
  }
  if (!DRY) {
    if (log.length) await api.append("Mail!A1", log);
    await api.batchPut(ups);
    writeFileSync(SEEN, JSON.stringify([...seen].slice(-5000)));
    const r = await renderApplied(api); console.log(`Applied tab: ${r.pipeline} pipeline, ${r.manual} manual`);
  }
  process.exit(0);
}
