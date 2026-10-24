// Pay: what a posting says it pays, as stated ("$45–55/hr USD") and as an
// hourly number for sorting (top of the range; a year is 2,080 hours). Order:
// the list's own Extra ("$53/hr"), then the ATS's public API (Greenhouse pay
// ranges, Ashby compensation, Lever salaryRange, Workday's job JSON), then the
// posting page's text. Most US postings carry a range (pay-transparency laws).
//   node pay.mjs            # fill Pay for every open Backlog row with none
//   node pay.mjs <url>...   # print, write nothing
import { greenhouseJob } from "./prepare.mjs";

const UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36" };
const get = (u, as = "text") => fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r[as]() : null)).catch(() => null);
const text = (html) => (html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/\s+/g, " ");

const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?`;
const RANGE = new RegExp(String.raw`(?:(USD|CAD|US|CA)\s*)?\$\s*${NUM}\s*(?:USD|CAD)?\s*(?:-|–|—|to)\s*(?:(?:USD|CAD|US|CA)\s*)?\$?\s*${NUM}\s*(USD|CAD)?(?:\s*(?:\/|per|an?|each)\s*(hour|hr|year|yr|annum|month|week))?`, "gi");
const ONE = new RegExp(String.raw`(?:(USD|CAD|US|CA)\s*)?\$\s*${NUM}\s*(USD|CAD)?\s*(?:\/|per|an?)\s*(hour|hr|year|yr|annum|month|week)`, "gi");
// The unit named before the figure: "Hourly compensation for applicant is: $32.00".
const LEAD = new RegExp(String.raw`\b(hourly|per hour|hour(?:ly)? (?:rate|pay|wage)|annual(?:ized)?|salary|base pay|pay range|compensation|monthly)\b[^$.]{0,60}\$\s*${NUM}(?:\s*(?:-|–|—|to)\s*\$?\s*${NUM})?\s*(USD|CAD)?`, "gi");
const n = (s, k) => Number(s.replace(/,/g, "")) * (k ? 1000 : 1);
// Unit by size when the posting names none: intern pay under 300 is hourly,
// 1,000–4,000 weekly, 4,000–20,000 monthly, above that yearly.
const unitOf = (v) => (v < 300 ? "hour" : v < 4000 ? "week" : v < 20000 ? "month" : "year");
// To hourly.
function hourly(v, unit) {
  if (/hour|hr/i.test(unit || "")) return v;
  if (/week/i.test(unit || "")) return v / 40;
  if (/month/i.test(unit || "")) return (v * 12) / 2080;
  if (/year|yr|annum/i.test(unit || "") || v >= 20000) return v / 2080;
  return v < 300 ? v : null;
}
const fmt = (lo, hi, unit, cur) => {
  const u = /hour|hr/.test(unit) ? "/hr" : /month/.test(unit) ? "/mo" : /week/.test(unit) ? "/wk" : "/yr";
  const s = (v) => (u === "/yr" ? `${Math.round(v / 1000)}k` : v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(Math.round(v * 100) / 100));
  return `$${s(lo)}${hi && hi !== lo ? `–${s(hi)}` : ""}${u}${cur ? ` ${cur}` : ""}`;
};
// The first plausible pay in free text. Skips revenue and funding figures
// ("$40 million"), which never carry a time unit and sit far outside the band.
export function payInText(t, region) {
  for (const re of [RANGE, ONE]) {
    for (const m of t.matchAll(re)) {
      const range = re === RANGE;
      const lo = n(m[2], m[3]), hi = range ? n(m[4], m[5]) : lo;
      const unit = (range ? m[7] : m[6]) || unitOf(hi);
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + 12);
      if (/^\s*(million|billion|m\b|b\b|bn)/i.test(after)) continue;
      const h = hourly(hi, unit);
      if (!h || h < 12 || h > 200 || lo > hi) continue;
      const curRaw = (m[1] || (range ? m[6] : m[5]) || "").toUpperCase();
      const cur = /CA/.test(curRaw) ? "CAD" : /US/.test(curRaw) ? "USD" : region === "Canada" ? "CAD?" : "USD";
      return { pay: fmt(lo, hi, unit, cur), hr: Math.round(h) };
    }
  }
  for (const m of t.matchAll(LEAD)) {
    const lo = n(m[2], m[3]), hi = m[4] ? n(m[4], m[5]) : lo;
    const unit = /hour/i.test(m[1]) ? "hour" : /month/i.test(m[1]) ? "month" : unitOf(hi);
    const h = hourly(hi, unit);
    if (!h || h < 12 || h > 200 || lo > hi) continue;
    const cur = /CA/i.test(m[6] || "") ? "CAD" : region === "Canada" ? "CAD?" : "USD";
    return { pay: fmt(lo, hi, unit, cur), hr: Math.round(h) };
  }
  return null;
}

// zapply.jobs wraps ATS links: /l/d/<ats>-<org>-<id>.
const unwrap = (link) => {
  const z = link.match(/zapply\.jobs\/l\/d\/(greenhouse|ashby|lever)-(.+)-([0-9a-f-]{36}|\d{6,})(?:[?#]|$)/i);
  if (!z) return link;
  return z[1] === "greenhouse" ? `https://job-boards.greenhouse.io/${z[2]}/jobs/${z[3]}` : z[1] === "ashby" ? `https://jobs.ashbyhq.com/${z[2]}/${z[3]}` : `https://jobs.lever.co/${z[2]}/${z[3]}`;
};
async function fromApi(r) {
  const link = unwrap(r.Link);
  r = { ...r, Link: link };
  if (r.ATS === "greenhouse") {
    const job = await greenhouseJob(link, r.Company).catch(() => null);
    if (job) {
      const j = await get(`https://boards-api.greenhouse.io/v1/boards/${job.board}/jobs/${job.id}?pay_transparency=true`, "json");
      const p = j?.pay_input_ranges?.[0];
      if (p) {
        const lo = p.min_cents / 100, hi = p.max_cents / 100, unit = unitOf(hi);
        return { pay: fmt(lo, hi, unit, p.currency_type), hr: Math.round(hourly(hi, unit)) };
      }
      if (j?.content) { const p = payInText(text(j.content.replace(/&lt;/g, "<").replace(/&gt;/g, ">")), r.Region); if (p) return p; }
    }
  }
  const ash = link.match(/jobs\.ashbyhq\.com\/([^/?#]+)\/([0-9a-f-]{36})/i);
  if (ash) {
    const j = await get(`https://api.ashbyhq.com/posting-api/job-board/${ash[1]}?includeCompensation=true`, "json");
    const job = j?.jobs?.find((x) => x.id === ash[2]);
    const s = job?.compensation?.compensationTierSummary || job?.compensationTierSummary;
    if (s) return payInText(s.replace(/€|£/g, "$"), r.Region) || payInText(text(job.descriptionHtml), r.Region);
    if (job?.descriptionHtml) return payInText(text(job.descriptionHtml), r.Region);
  }
  const lev = link.match(/jobs\.lever\.co\/([^/?#]+)\/([0-9a-f-]{36})/i);
  if (lev) {
    const j = await get(`https://api.lever.co/v0/postings/${lev[1]}/${lev[2]}`, "json");
    const s = j?.salaryRange;
    if (s?.max) { const unit = /hour/i.test(s.interval) ? "hour" : /month/i.test(s.interval) ? "month" : "year"; return { pay: fmt(s.min, s.max, unit, s.currency), hr: Math.round(hourly(s.max, unit)) }; }
    if (j) return payInText(text(`${j.descriptionPlain || ""} ${(j.lists || []).map((l) => l.content).join(" ")} ${j.additionalPlain || ""}`), r.Region);
  }
  const wd = link.match(/^https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/]+)\/(job\/.+?)(?:\/apply.*)?(?:[?#].*)?$/);
  if (wd) {
    const j = await get(`https://${wd[1]}.${wd[2]}.myworkdayjobs.com/wday/cxs/${wd[1]}/${wd[3]}/${wd[4]}`, "json");
    if (j?.jobPostingInfo?.jobDescription) return payInText(text(j.jobPostingInfo.jobDescription), r.Region);
    if (j) return null;
  }
  return undefined; // no API answer: read the page
}

export async function payFor(r) {
  const listed = r.Extra?.match(/\$\s*(\d+(?:\.\d+)?)\s*\/\s*hr/);
  if (listed) return { pay: `$${listed[1]}/hr (list)`, hr: Math.round(Number(listed[1])) };
  const api = await fromApi(r);
  if (api !== undefined) return api;
  const html = await get(r.Link);
  return html ? payInText(text(html), r.Region) : null;
}

if (process.argv[1]?.endsWith("pay.mjs")) {
  const { ats } = await import("./enrich.mjs");
  if (process.argv.length > 2) {
    for (const link of process.argv.slice(2)) console.log(link, "→", await payFor({ Link: link, ATS: ats(link), Company: "", Extra: "", Region: process.env.REGION || "US" }));
    process.exit(0);
  }
  const { sheets } = await import("./sheet.mjs");
  const { COLS } = await import("./enrich.mjs");
  const api = await sheets();
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values;
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const todo = rows.map((row, i) => ({ ...Object.fromEntries(COLS.map((c) => [c, row[idx[c]] ?? ""])), _i: i })).filter((r) => r.Status !== "skip" && !r.Pay);
  const col = (c) => String.fromCharCode(65 + COLS.indexOf(c));
  const updates = []; let found = 0, k = 0;
  const work = async (list) => { for (const r of list) { const p = await payFor(r).catch(() => null); if (p) found++; updates.push({ range: `Backlog!${col("Pay")}${r._i + 2}:${col("Pay/hr")}${r._i + 2}`, values: [[p ? p.pay : "not listed", p ? p.hr : ""]] }); if (++k % 100 === 0) console.log(k, "/", todo.length); } };
  await Promise.all(Array.from({ length: 8 }, (_, w) => work(todo.filter((_, j) => j % 8 === w))));
  for (let i = 0; i < updates.length; i += 400) await api.batchPut(updates.slice(i, i + 400));
  console.log(`pay: ${found} of ${todo.length} rows list a pay`);
  process.exit(0);
}
