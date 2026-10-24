// draft: Claude answers the questions the answer bank cannot (essays, picks
// such as track, cohort, location, experience scales) for `needs-answer` rows.
//
// Drafts go to the `Drafts` tab, one row per question, keyed by Link. Apply
// puts a posting's drafts ahead of the bank. Every question drafted → `ready`
// (tier B sends; tier A waits for William's `go`, he edits the Drafts tab
// first). A question the facts cannot answer stays blank, and the row stays
// `needs-answer` with only that question in Notes. Use = `no` drops a draft.
//
// Facts: the résumé text and the co-op work term record ($STATE/profile/*.txt,
// install.sh writes them) plus FACTS below. Personal values (phone, address)
// never go to the model; the bank fills those.
//
//   node draft.mjs              # the worker: DRAFT_PER_RUN (20) rows
//   node draft.mjs --row <n>    # one Backlog row, print only
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { COLS } from "./enrich.mjs";
import { sheets } from "./sheet.mjs";

const STATE = process.env.INTERNSHIPS_STATE || `${process.env.HOME}/.local/share/internships`;
const PER_RUN = Number(process.env.DRAFT_PER_RUN || 20);
const MODEL = process.env.DRAFT_MODEL || "claude-sonnet-5-5";
const TAB = "Drafts", HEAD = ["Link", "Company", "Role", "Question", "Draft", "Use", "Why"];

const FACTS = `- University of Waterloo, Bachelor of Software Engineering (BSE), Sep 2024 to May 2028. Undergraduate, co-op program.
- Wants the Summer 2027 term (May to August 2027). 12 or 16 weeks, 4, 8 or 12 months are all fine. Not available Fall 2027 or Winter 2027/2028 (academic terms).
- Lives in Waterloo, Ontario. Willing to relocate and work on site or hybrid anywhere in Canada or the US.
- Location preference order: Toronto, New York, San Francisco Bay Area, Seattle, then any other.
- Canadian work authorization: yes. US work authorization question: answer Yes (William 2026-10-22). Visa sponsorship question: Yes, he will need sponsorship.
- Speaks English and French.
- GitHub github.com/WilliamJin123, site williamjin.dev.
- Current role: Software Engineer at Food For Good (Sep 2026 to present).`;

const RULES = `Rules:
- Answer only from the facts. Never invent employers, projects, numbers, awards or skills.
- Never claim outcomes the facts do not state: no "used every day", "in production", "shipped", "launched", user counts or impact beyond the résumé's own numbers. Say "built" or "made".
- Team work stays "we" where the résumé shows a team (the SolShare SDK was a team grant project).
- He may describe what he can explain from his own work in its best honest light. Pick the option or wording that is strongest and still true.
- A question with options: answer with one option, copied exactly. Pick by the facts. For experience scales, pick the highest level the résumé supports.
- A free-text question: plain first person, short (one sentence for facts, 80 to 150 words for an essay). Specific to his work. No em dashes, no hype words ("passionate", "thrilled", "leverage"). Sound like a person. Match the résumé's wording: plain and direct, active past-tense verbs (built, made, cut), a number or a named tool over an adjective.
- "Why this company" essays: tie one real project to what the company does. Do not claim facts about the company beyond the role title and company name.
- Pay or salary expectation: the posting's own pay (given below), top of its range, in its unit. With options, the option that holds that pay. Pay not listed: "Flexible; open to the standard range for this role", or the middle option.
- GPA: his range is 3.5 to 4.0 on a 4.0 scale. A single value: 3.7.
- Cannot answer truthfully from the facts (a skill he lacks with no "none" option, a reference): answer null.`;

const PERSONAL = /\b(convict\w*|criminal|felon(y|ies)|misdemeanou?rs?|arrest\w*|driver.?s? licen[cs]e|professional references|references? (contact|available)|social security|date of birth)\b/i;
// Citizenship or permanent status: a "No" is true for a Canadian; a "Yes" is not, so it never stands.
const STATUS_YES = (label, v) => /citizen|permanent resident|green card|u\.?s\.? person/i.test(label) && /^yes\b/i.test(String(v || ""));
const facts = () => [FACTS, ...["resume.txt", "work-term-record.txt"].map((f) => `${STATE}/profile/${f}`).filter(existsSync).map((p) => readFileSync(p, "utf8"))].join("\n\n");
export const questions = (notes) => (notes || "").split("\n").filter((l) => l.startsWith("Q: ")).map((l) => {
  const t = l.slice(3), m = t.match(/^(.*?) \[(.*)\]$/);
  return m ? { label: m[1], options: m[2].split(" / ") } : { label: t, options: [] };
});

async function ask(row, qs) {
  const prompt = `You fill internship application questions for William Jin.\n\nFACTS\n${facts()}\n\n${RULES}\n\nPosting: ${row.Company}, "${row.Role}" (${row.Location}). Posted pay: ${row.Pay && row.Pay !== "not listed" ? row.Pay : "not listed"}.\n\nQuestions:\n${qs.map((q, i) => `${i + 1}. ${q.label}${q.options.length ? `\n   Options: ${q.options.map((o) => `"${o}"`).join(", ")}` : ""}`).join("\n")}\n\nReply with JSON only, no prose: [{"n": 1, "answer": "..." or null, "why": "a few words"}, ...]`;
  const run = promisify(execFile);
  const child = run("claude", ["-p", "--model", MODEL, "--output-format", "text", "--tools", ""], { maxBuffer: 1 << 24, timeout: 300000 });
  child.child.stdin.end(prompt);
  const { stdout } = await child;
  // The model sometimes adds prose or a second list after the JSON: try a fenced block, the widest list, then the first.
  const tries = [stdout.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], stdout.match(/\[\s*\{[\s\S]*\}\s*\]/)?.[0], stdout.match(/\[\s*\{[\s\S]*?\}\s*\]/)?.[0]];
  const parsed = tries.map((t) => { try { return t && JSON.parse(t.trim()); } catch { return null; } }).find(Array.isArray);
  if (!parsed) throw new Error(`no JSON list in the reply: ${stdout.slice(0, 120)}`);
  return parsed.map((a) => {
    const q = qs[a.n - 1]; let v = a.answer;
    // Personal record and status (convictions, citizenship, licence, references): William answers these, never the model.
    if (PERSONAL.test(q.label) || STATUS_YES(q.label, v)) v = null;
    // A pick must be one of the options; anything else is no answer.
    if (v != null && q.options.length && !q.options.includes(v)) v = q.options.find((o) => o.toLowerCase() === String(v).toLowerCase()) ?? null;
    return { ...q, answer: v == null || v === "" ? null : String(v), why: a.why || "" };
  });
}

/** Drafts for one posting, as answer-bank rules that apply puts first. */
// Personal free text ("why us", "tell us about") on a tier A row waits for William; option picks and short facts do not.
export const personal = (label, answer) => !/\[.*\/.*\]/.test(label) && ((answer || "").length > 140 || /\bwhy\b|describe|tell us|explain|excit|interest|share|what (makes|draws|motivat)|cover letter|about yourself|passion|proud/i.test(label));

export function draftAnswers(values, link) {
  const [h, ...rows] = values || [[]]; const i = Object.fromEntries(h.map((x, k) => [x, k]));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return rows.filter((r) => r[i.Link] === link && r[i.Draft] && (r[i.Question] || "").trim() && (r[i.Use] || "").toLowerCase() !== "no")
    .map((r) => ({ re: new RegExp(esc(r[i.Question].slice(0, 80)), "i"), answer: r[i.Draft], approved: "yes" }));
}

if (process.argv[1]?.endsWith("draft.mjs")) {
  const api = await sheets();
  const meta = await api.meta();
  if (!meta.sheets.some((s) => s.properties.title === TAB)) { await api.batchUpdate([{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } } }]); await api.put(`${TAB}!A1`, [HEAD]); }
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values;
  const idx = Object.fromEntries(header.map((h, k) => [h, k]));
  const objs = rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[idx[c]] ?? ""])));
  const col = (c) => String.fromCharCode(65 + COLS.indexOf(c));
  const CITIZEN = /(requires?|must (be|have)|only).{0,40}(u\.?s\.? citizen|citizenship)|security clearance|clearance eligib|itar|u\.?s\.? person/i;
  // --retry: questions drafted blank get another try (after the facts or rules change).
  const RETRY = process.argv.includes("--retry");
  // Drafted already: link + question, so a question added later still gets a draft.
  const done = new Set(((await api.get(`${TAB}!A2:E`)).values || []).filter((r) => r[4] || !RETRY).map((r) => `${r[0]}\t${r[3]}`));
  const fresh = (o) => questions(o.Notes).filter((q) => !done.has(`${o.Link}\t${q.label}`));
  const one = process.argv.includes("--row") ? Number(process.argv[process.argv.indexOf("--row") + 1]) : 0;
  const picks = objs.map((o, k) => ({ ...o, n: k + 2 }))
    .filter((o) => one ? o.n === one : o.Status === "needs-answer" && (fresh(o).length || CITIZEN.test(o.Notes)))
    // DRAFT_SHARD=k/n: parallel runs take disjoint rows.
    .filter((o) => { const [k, n] = (process.env.DRAFT_SHARD || "0/1").split("/").map(Number); return o.n % n === k; })
    // Tier A first, then pay: the rows William cares about get drafts soonest.
    .sort((a, b) => (a.Review === "A" ? 0 : 1) - (b.Review === "A" ? 0 : 1) || (Number(b["Pay/hr"]) || 0) - (Number(a["Pay/hr"]) || 0))
    .slice(0, one ? 1 : PER_RUN);
  let ready = 0, partial = 0;
  for (const row of picks) {
    // A Canadian cannot meet these; no draft fixes that.
    if (CITIZEN.test(row.Notes)) {
      await api.batchPut([{ range: `Backlog!${col("Status")}${row.n}`, values: [["skip"]] }, { range: `Backlog!${col("Notes")}${row.n}`, values: [["US citizenship or clearance required\n" + row.Notes]] }]);
      console.log(`skip         ${row.Company} | ${row.Role} | citizenship`);
      continue;
    }
    let out;
    try { out = await ask(row, one ? questions(row.Notes) : fresh(row)); } catch (e) { console.log(`error ${row.Company}: ${e.message.slice(0, 200)}`); continue; }
    if (one) { for (const a of out) console.log(`Q ${a.label.slice(0, 90)}\n  => ${a.answer ?? "(null)"}  [${a.why}]`); break; }
    await api.append(`${TAB}!A1`, out.map((a) => [row.Link, row.Company, row.Role, a.label, a.answer ?? "", row.Review === "A" && personal(a.label, a.answer) ? "review" : "yes", a.why]));
    const left = out.filter((a) => a.answer === null);
    const status = left.length ? "needs-answer" : "ready";
    const note = `drafted ${out.length - left.length}/${out.length} (Drafts tab)${left.length ? "\n" + left.map((a) => `Q: ${a.label}${a.options.length ? ` [${a.options.join(" / ")}]` : ""}`).join("\n") : ""}`;
    await api.batchPut([{ range: `Backlog!${col("Status")}${row.n}`, values: [[status]] }, { range: `Backlog!${col("Notes")}${row.n}`, values: [[note]] }]);
    left.length ? partial++ : ready++;
    console.log(`${status.padEnd(12)} ${row.Review} ${row.Company} | ${row.Role} | ${out.length - left.length}/${out.length}`);
  }
  if (!one) console.log(`draft: ${ready} ready, ${partial} still need William`);
  process.exit(0);
}
