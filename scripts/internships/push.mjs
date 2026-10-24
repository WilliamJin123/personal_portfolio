// Append rows from a CSV to the backlog Sheet, skipping links already there.
// New rows are enriched (ATS, Review, Variant, skip). Usage: node push.mjs <csv>
import { readFileSync } from "node:fs";
import { sheets } from "./sheet.mjs";
import { enrich, COLS } from "./enrich.mjs";
import { payFor } from "./pay.mjs";
const parseCsv = t => { const rows = [], re = /("([^"]|"")*"|[^,\n]*)(,|\n|$)/g; let row = [], m; while ((m = re.exec(t)) && m[0] !== "") { row.push(m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1]); if (m[3] !== ",") { rows.push(row); row = []; } } return rows; };
const [header, ...rows] = parseCsv(readFileSync(process.argv[2], "utf8")).filter(r => r.length > 1);
const api = await sheets();
const existing = (await api.get("Backlog!G:G")).values?.flat() ?? [];
const seen = new Set(existing);
const fresh = rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))).filter(r => r.Link && !seen.has(r.Link)).map(enrich);
if (fresh.length === 0) { console.log("no new postings"); process.exit(0); }
// Pay, then the tier again: a posting at $50/hr or more is tier A.
for (const o of fresh) { const p = await payFor(o).catch(() => null); o.Pay = p ? p.pay : "not listed"; o["Pay/hr"] = p ? p.hr : ""; Object.assign(o, enrich(o)); }
const today = new Date().toISOString().slice(0, 10);
await api.append("Backlog!A1", fresh.map(o => COLS.map(c => o[c])));
await api.append("New postings!A1", fresh.map(o => [today, ...COLS.map(c => o[c])]));
console.log(`added ${fresh.length} new postings:`); for (const o of fresh) console.log(`  ${o.Status || "open"} ${o.Review} ${o.ATS} | ${o.Company} | ${o.Role} | ${o.Location}`);
