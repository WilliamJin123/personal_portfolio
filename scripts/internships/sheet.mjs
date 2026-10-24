// Minimal Sheets API client for the backlog spreadsheet, auth via the Wren
// service account (shared on the Sheet as writer).
import { execFileSync } from "node:child_process";

export const SHEET_ID = process.env.SHEET_ID ?? "1ojSRq2fTXyQMhn_OHFO2yxKEaqs1-gMq8aW8t3yZuHU";

export async function sheets() {
  // The token lasts an hour; a long batch gets a fresh one on the first 401.
  const mint = () => ({ Authorization: `Bearer ${execFileSync("node", [new URL("./sa-token.mjs", import.meta.url).pathname]).toString()}`, "content-type": "application/json" });
  let H = mint();
  // Google's edge drops connections now and then; three tries, short backoff.
  const call = async (p, init, attempt = 1) => {
    try {
      let r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, { headers: H, ...init });
      if (r.status === 401) { H = mint(); r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, { headers: H, ...init }); }
      const j = await r.json();
      if (!r.ok) throw new Error(`sheets ${p}: ${JSON.stringify(j.error ?? j)}`);
      return j;
    } catch (e) {
      if (attempt >= 3 || /^sheets /.test(e.message)) throw e;
      await new Promise((f) => setTimeout(f, 2000 * attempt));
      return call(p, init, attempt + 1);
    }
  };
  const enc = (range) => encodeURIComponent(range);
  return {
    meta: () => call(`?fields=sheets.properties`),
    get: (range) => call(`/values/${enc(range)}`),
    put: (range, values) => call(`/values/${enc(range)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values }) }),
    append: (range, values) => call(`/values/${enc(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ values }) }),
    // data: [{ range, values }] — one request for many ranges.
    batchPut: (data) => data.length ? call(`/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) }) : null,
    batchUpdate: (requests) => call(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests }) }),
  };
}
