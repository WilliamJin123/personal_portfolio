// One-time Sheet setup, safe to re-run: the Answers tab (answer bank) and the
// Status dropdown with every state the workers use.
//
// Answers: Pattern is a case-insensitive regex matched against a form field's
// label, with word boundaries. Top to bottom; for a field with options the first
// pattern whose Answer fits an option wins. Approved = "seed" until William
// reviews; "no" rows stop prepare with needs-answer. Facts come from
// src/resume/data/profile.ts and applications/_profile/.
import { sheets, SHEET_ID } from "./sheet.mjs";
// Seed rows live in answers.seed.mjs (gitignored: personal facts, public repo).
import { SEED } from "./answers.seed.mjs";

export const STATUSES = ["todo", "needs-answer", "ready", "applied", "confirmed", "oa", "interview", "offer", "rejected", "closed", "skip", "needs-human"];


if (process.argv[1]?.endsWith("setup.mjs")) {
  const api = await sheets();
  const meta = await api.meta();
  const answers = meta.sheets.find((s) => s.properties.title === "Answers");
  if (!answers) await api.batchUpdate([{ addSheet: { properties: { title: "Answers", gridProperties: { frozenRowCount: 1 } } } }]);
  await api.put("Answers!A1", SEED);
  const backlog = meta.sheets.find((s) => s.properties.title === "Backlog").properties.sheetId;
  await api.batchUpdate([{ setDataValidation: { range: { sheetId: backlog, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, rule: { condition: { type: "ONE_OF_LIST", values: STATUSES.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false } } }]);
  console.log(`Answers tab: ${SEED.length - 1} rows; Status list: ${STATUSES.join(" ")}`);
}
