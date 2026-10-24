// The answer bank: load the Answers tab, and match form fields to it.
// Shared by prepare (reads a form, decides ready / needs-answer) and apply
// (fills the live form). Grammar of an Answer cell: see resolve().
import { readProfile } from "./profile.mjs";

const NEG = /\b(not|no|never|non|none|don'?t|do not|decline|prefer not|without)\b/i;
export const DECLINE = /decline|prefer not|not specified|don.?t (wish|want)|do not (wish|want)|not to (answer|say|disclose)|rather not|i do not want/i;
export const clean = (s) => s.replace(/[✱*]/g, " ").replace(/\b(required|optional)\b/gi, " ").replace(/\s+/g, " ").trim();

// SECRET:<name> takes the value from the sealed profile (profile.mjs); a name
// it lacks leaves the answer blank, so the field goes to William.
export function loadAnswers(values, profile = readProfile()) {
  const [h, ...rows] = values; const i = Object.fromEntries(h.map((x, k) => [x, k]));
  return rows.filter((r) => r[i.Pattern]).map((r) => ({ re: new RegExp(r[i.Pattern], "i"), answer: (r[i.Answer] ?? "").replace(/SECRET:(\w+)/g, (_, k) => profile[k] ?? ""), approved: (r[i.Approved] || "").toLowerCase() }));
}
// The option an answer selects, or null when the field has options and none fits.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
export function fitOption(answer, options) {
  if (!options?.length) return answer;
  // French forms: Oui/Non are Yes/No.
  if (options.some((o) => /^(oui|non)\b/i.test(o))) answer = answer.replace(/^yes\b/i, "Oui").replace(/^no\b/i, "Non");
  const a = answer.toLowerCase(), an = norm(answer);
  const exact = options.find((o) => norm(o) === an); if (exact) return exact;
  if (DECLINE.test(answer)) { const d = options.find((o) => DECLINE.test(o)); if (d) return d; }
  if (/^yes\b/.test(a)) { const o = options.find((o) => /^(yes|i am (willing|able|authorized)|i can\b|i would|i agree|i acknowledge|i certify)/i.test(o)); if (o) return o; }
  if (/^no\b/.test(a)) { const o = options.find((o) => /^(no\b|none of (the above|these)|i am not|i cannot|i can't|i do not|i have not|i haven't|i have never|never)/i.test(o)); if (o) return o; }
  // A partial match must keep the answer's negation: "I am not a protected veteran" is never "Protected Veteran".
  // "Other" means the catch-all option ("Other (none of the above)"), not "Other conferences or events".
  if (answer === "Other") { const os = options.filter((o) => /^other\b/i.test(o)); return os.find((o) => /^other\s*$|none of the above|please specify|not listed/i.test(o)) || (os.length === 1 ? os[0] : null); }
  // Whole words only: "no" sits inside "north korea", "May" is a word of "May 2027".
  const word = (hay, n) => !!n && new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(hay);
  const part = options.find((o) => (word(o, answer.trim()) || word(answer, o.trim()) || (an.length >= 8 && norm(o).length >= 8 && (norm(o).includes(an) || an.includes(norm(o))))) && NEG.test(o) === NEG.test(answer)); if (part) return part;
  const year = answer.match(/\b20\d\d\b/); if (year) { const ys = options.filter((o) => o.includes(year[0])); if (ys.length === 1) return ys[0]; }
  const inRange = rangeOption(answer, options); if (inRange) return inRange;
  return null;
}
// Answer cell grammar: alternatives split on " | ", tried in order.
// "canada:Yes" applies only when the row's Region matches (canada / us / remote);
// "/regex/" picks the first option the regex matches.
export function resolve(answer, options, region) {
  for (let alt of answer.split(/\s\|\s/)) {
    const r = alt.match(/^(canada|us|remote):\s*(.*)$/i);
    if (r) { if (r[1].toLowerCase() !== (region || "").toLowerCase()) continue; alt = r[2]; }
    // MAX: the option with the largest number (a pay range list).
    if (alt === "MAX") { const n = (o) => Math.max(0, ...(o.replace(/,/g, "").match(/\d+(\.\d+)?/g) || []).map(Number)); const top = [...(options || [])].sort((x, y) => n(y) - n(x))[0]; if (top && n(top) > 0) return top; continue; }
    const rx = alt.match(/^\/(.+)\/$/);
    // A regex without a negation of its own never picks a negated option ("not authorized to work for any employer").
    if (rx) { const ok = (o) => NEG.test(rx[1]) || !NEG.test(o); const o = (options || []).find((o) => new RegExp(rx[1], "i").test(o) && ok(o)); if (o) return o; continue; }
    const v = fitOption(alt, options); if (v !== null) return v;
  }
  return null;
}
export function match(fields, answers, region) {
  const filled = [], open = [];
  for (const f of fields) {
    const label = clean(f.label);
    // A consent box carries its text in the option; a "no" rule also looks at
    // the options (sponsorship hides inside work-authorization choices).
    const text = f.options?.length === 1 ? `${label} ${f.options[0]}` : label;
    const blocked = answers.some((a) => a.approved === "no" && (f.options || []).some((o) => a.re.test(o)));
    // An upload takes only a FILE: answer, and a text box never takes one ("what we won't see on your resume"). ("transcript from your highest degree" is not the degree rule).
    const isFile = /file/.test(f.kind || f.type || "");
    const hits = blocked ? [] : answers.filter((a) => a.re.test(text) && (!isFile || a.answer.startsWith("FILE:") || a.approved === "no") && (isFile || !a.answer.startsWith("FILE:")));
    let done = false;
    for (const a of hits) {
      if (a.approved === "no" || !a.answer) break; // the first rule that matches decides, top to bottom
      const v = resolve(a.answer, f.options, region);
      // A date box takes a date: "Software Engineering" from a "program" rule is the next rule's turn.
      if (v !== null && f.kind === "date" && !/^TODAY$|\b20\d\d\b/.test(v)) continue;
      if (v !== null) { filled.push({ ...f, label, answer: v, raw: a.answer }); done = true; break; }
    }
    // Unmatched or "ask William" fields stop the row only when required; an
    // optional one (a cover letter on tier B, "anything else") stays blank.
    if (!done && f.required) open.push(f.options?.length ? `${label} [${f.options.slice(0, 8).join(" / ")}]` : label);
  }
  return { filled, open };
}


// "May 2028" against options like "December 2027 - August 2028", "May - Aug
// 2028", "Spring 2028", "Before September 2026", "September 2028 or later": the
// one whose span holds it. Else the nearest single month, within two months
// ("Select the closest date": June 2028).
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const SEASON = { spring: [0, 4], summer: [5, 7], fall: [8, 11], autumn: [8, 11], winter: [0, 1] };
const monthIndex = (s) => { const m = s.toLowerCase().match(new RegExp(`\\b${MON}\\s*(20\\d\\d)\\b`)); return m ? Number(m[2]) * 12 + MONTHS.indexOf(m[1]) : null; };
function span(o) {
  const l = o.toLowerCase();
  const r = l.match(new RegExp(`\\b${MON}\\s*(20\\d\\d)?\\s*(?:-|–|to|through)\\s*${MON}\\s*(20\\d\\d)`));
  if (r) { const y2 = Number(r[4]), y1 = r[2] ? Number(r[2]) : y2; return [y1 * 12 + MONTHS.indexOf(r[1]), y2 * 12 + MONTHS.indexOf(r[3])]; }
  const se = l.match(/\b(spring|summer|fall|autumn|winter)\s*'?(20)?(\d\d)\b/);
  if (se) { const y = 2000 + Number(se[3]); return SEASON[se[1]].map((m) => y * 12 + m); }
  return null;
}
function rangeOption(answer, options) {
  const at = monthIndex(answer);
  if (at === null) return null;
  for (const o of options) {
    const sp = span(o); if (sp && at >= sp[0] && at <= sp[1]) return o;
    const ends = [...o.matchAll(new RegExp(`\\b${MON}\\s*(20\\d\\d)\\b`, "gi"))].map((m) => monthIndex(m[0]));
    if (ends.length === 2 && at >= ends[0] && at <= ends[1]) return o;
    if (ends.length === 1 && /before|prior to|earlier/i.test(o) && at < ends[0]) return o;
    if (ends.length === 1 && /or later|after|and beyond|\+/i.test(o) && at >= ends[0]) return o;
  }
  const near = options.map((o) => ({ o, d: monthIndex(o) })).filter((x) => x.d !== null && !span(x.o) && !/before|prior|later|after|beyond/i.test(x.o)).map((x) => ({ ...x, d: Math.abs(x.d - at) })).sort((a, b) => a.d - b.d)[0];
  return near && near.d <= 2 ? near.o : null;
}

// A posting only US citizens or green card holders can take: a Canadian cannot meet it, so the row is a skip.
// EEO lines ("regardless of citizenship") do not match: each branch needs a requirement word next to it.
const US_ONLY = /(must|required|requires?|only|eligib\w*)\b(?!.{0,40}sponsor).{0,60}\b(u\.?s\.? (citizen(?!ship and immigration)|national|person)|green card|lawful(ly)? permanent resident)|u\.?s\.? citizen(ship)? (is )?required|u\.?s\.? person.{0,40}(itar|as defined|export)|(active|obtain|maintain|eligib\w* (for|to obtain)).{0,30}(secret|security|ts\/sci) clearance/i;
export const usOnly = (text) => (String(text || "").replace(/\s+/g, " ").match(US_ONLY) || [null])[0];
