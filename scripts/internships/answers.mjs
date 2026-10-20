// The answer bank: load the Answers tab, and match form fields to it.
// Shared by prepare (reads a form, decides ready / needs-answer) and apply
// (fills the live form). Grammar of an Answer cell: see resolve().
export const DECLINE = /decline|prefer not|don'?t wish|do not wish|not to (answer|say|disclose)|rather not|i do not want/i;
export const clean = (s) => s.replace(/[✱*]/g, " ").replace(/\b(required|optional)\b/gi, " ").replace(/\s+/g, " ").trim();

export function loadAnswers(values) {
  const [h, ...rows] = values; const i = Object.fromEntries(h.map((x, k) => [x, k]));
  return rows.filter((r) => r[i.Pattern]).map((r) => ({ re: new RegExp(r[i.Pattern], "i"), answer: r[i.Answer] ?? "", approved: (r[i.Approved] || "").toLowerCase() }));
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
  if (/^no\b/.test(a)) { const o = options.find((o) => /^(no\b|i am not|i cannot|i can't|i do not|i have not|i haven't|i have never|never)/i.test(o)); if (o) return o; }
  const part = options.find((o) => norm(o).includes(an) || an.includes(norm(o))); if (part) return part;
  const year = answer.match(/\b20\d\d\b/); if (year) { const ys = options.filter((o) => o.includes(year[0])); if (ys.length === 1) return ys[0]; }
  const inRange = rangeOption(answer, options); if (inRange) return inRange;
  if (answer === "Other") return options.find((o) => /^other/i.test(o)) || null;
  return null;
}
// Answer cell grammar: alternatives split on " | ", tried in order.
// "canada:Yes" applies only when the row's Region matches (canada / us / remote);
// "/regex/" picks the first option the regex matches.
export function resolve(answer, options, region) {
  for (let alt of answer.split(/\s\|\s/)) {
    const r = alt.match(/^(canada|us|remote):\s*(.*)$/i);
    if (r) { if (r[1].toLowerCase() !== (region || "").toLowerCase()) continue; alt = r[2]; }
    const rx = alt.match(/^\/(.+)\/$/);
    if (rx) { const o = (options || []).find((o) => new RegExp(rx[1], "i").test(o)); if (o) return o; continue; }
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
    // An upload takes only a FILE: answer ("transcript from your highest degree" is not the degree rule).
    const isFile = /file/.test(f.kind || f.type || "");
    const hits = blocked ? [] : answers.filter((a) => a.re.test(text) && (!isFile || a.answer.startsWith("FILE:") || a.approved === "no"));
    let done = false;
    for (const a of hits) {
      if (a.approved === "no" || !a.answer) break; // the first rule that matches decides, top to bottom
      const v = resolve(a.answer, f.options, region);
      if (v !== null) { filled.push({ ...f, label, answer: v, raw: a.answer }); done = true; break; }
    }
    // Unmatched or "ask William" fields stop the row only when required; an
    // optional one (a cover letter on tier B, "anything else") stays blank.
    if (!done && f.required) open.push(f.options?.length ? `${label} [${f.options.slice(0, 8).join(" / ")}]` : label);
  }
  return { filled, open };
}


// "May 2028" against options like "December 2027 - August 2028", "Before
// September 2026", "September 2028 or later": the one whose span holds it.
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthIndex = (s) => { const m = s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d\d)\b/); return m ? Number(m[2]) * 12 + MONTHS.indexOf(m[1]) : null; };
function rangeOption(answer, options) {
  const at = monthIndex(answer);
  if (at === null) return null;
  for (const o of options) {
    const ends = [...o.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d\d)\b/gi)].map((m) => monthIndex(m[0]));
    if (ends.length === 2 && at >= ends[0] && at <= ends[1]) return o;
    if (ends.length === 1 && /before|prior to|earlier/i.test(o) && at < ends[0]) return o;
    if (ends.length === 1 && /or later|after|and beyond|\+/i.test(o) && at >= ends[0]) return o;
  }
  return null;
}
