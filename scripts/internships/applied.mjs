// applied: the one place that lists every application. Rebuilds the `Applied` tab
// from the Backlog (what the pipeline sent) and the `Manual` tab (what William sent
// by hand: edit that tab freely). mail.mjs calls this after each run.
//
//   node applied.mjs        # rebuild now
import { sheets } from "./sheet.mjs";

export const OPEN = ["applied", "assessment", "interview", "rejected", "offer"];
const HEAD = ["Company", "Role", "Region", "Tier", "Applied", "Via", "Status", "Last mail", "Next action", "Due", "Link"];
const MANUAL = ["Company", "Role", "Date", "Channel", "Status", "Notes"];

export async function tab(api, title, head, rowCount = 2000) {
  const meta = await api.meta();
  if (meta.sheets.some((s) => s.properties.title === title)) return;
  await api.batchUpdate([{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1, rowCount } } } }]);
  await api.put(`${title}!A1`, [head]);
}

export async function renderApplied(api) {
  await tab(api, "Manual", MANUAL, 200);
  const [header, ...rows] = (await api.get("Backlog!A1:T")).values;
  const idx = Object.fromEntries(header.map((h, k) => [h, k]));
  const get = (r, c) => r[idx[c]] ?? "";
  const mail = new Map();
  for (const r of ((await api.get("Mail!A2:L").catch(() => ({}))).values || [])) if (r[9] && /^(confirmation|rejection|interview|assessment|offer)$/.test(r[5])) mail.set(r[9], `${r[5]} ${(r[1] || "").slice(0, 10)}`);
  const auto = rows.filter((r) => OPEN.includes(get(r, "Status")) && (get(r, "Applied at") || get(r, "Status") !== "applied"))
    .map((r) => [get(r, "Company"), get(r, "Role"), get(r, "Region"), get(r, "Review"), get(r, "Applied at").slice(0, 10), "pipeline", get(r, "Status"), mail.get(get(r, "Link")) || "", get(r, "Next action"), get(r, "Due"), get(r, "Link")]);
  const manual = ((await api.get("Manual!A2:F")).values || []).filter((r) => r[0])
    .map((r) => [r[0], r[1] || "", "", "", r[2] || "", `manual: ${r[3] || ""}`, r[4] || "", "", r[5] || "", "", ""]);
  const out = [...auto, ...manual].sort((a, b) => (b[4] || "").localeCompare(a[4] || ""));
  await tab(api, "Applied", HEAD);
  await api.batchUpdate([{ updateCells: { range: { sheetId: (await api.meta()).sheets.find((s) => s.properties.title === "Applied").properties.sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEAD.length }, fields: "userEnteredValue" } }]);
  await api.put("Applied!A1", [HEAD, ...out]);
  return { pipeline: auto.length, manual: manual.length };
}

if (process.argv[1]?.endsWith("applied.mjs")) {
  const api = await sheets();
  const r = await renderApplied(api);
  console.log(`Applied tab: ${r.pipeline} from the pipeline, ${r.manual} manual`);
  process.exit(0);
}
