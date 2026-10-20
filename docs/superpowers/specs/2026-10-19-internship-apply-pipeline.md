# Internship apply pipeline (2027 cycle)

Goal: William sets one column in a Sheet. Machines do the rest. Target is
500+ submissions with one short daily pass from him.

Decisions (William, 2026-10-19):

- Simplify is out. No API; it is an extension inside a human browser. Nothing
  free and self-hostable slots in either (Formhand is Firefox-only, no Lever or
  Ashby). Autobrowse drives the applicant tracking systems (ATS) directly.
- A few résumé variants, picked by keyword. Custom cuts only for tier A.
- Answer bank, approved once. Only an unmatched question stops for William.
- Tier A (FAANG+, quant, high pay, remote, named big companies): William edits
  before send. Tier B: send directly.
- Mailbox for every application: `w3jin@uwaterloo.ca` (Outlook, Microsoft 365).
- Skip PhD-only roles, hardware roles, high-school roles, stale 2026 roles.
- US roles are in scope. Workday is in scope, built after Greenhouse, Ashby,
  Lever.
- Anything a flow cannot finish hands off to William. That is acceptable.

## Control plane: the Sheet

"Internship backlog 2027" (Drive folder "Internships 2027"). Tab `Backlog`:

| Column | Who writes | Values |
|---|---|---|
| Status | William sets `todo`; machines move it after | `todo` → `needs-answer` → `ready` → `applied` → `confirmed` / `oa` / `interview` / `offer` / `rejected` / `closed`; `skip`, `needs-human` |
| Region, Company, Role, Location, Posted, Link, Tier, Extra, Source | poll | from the three GitHub repos |
| Notes | both | skip reason, unmatched question, hand-off reason |
| ATS | enrich | `greenhouse`, `ashby`, `lever`, `workday`, `icims`, `smartrecruiters`, `other` |
| Review | enrich | `A` (William edits) or `B` (send directly) |
| Variant | enrich | `classic`, `ios`, `fintech`, `blockchain`, `ml-data` |
| Applied at, Confirmation, Next action, Due | apply + inbox | timestamps, screenshot path, follow-up and deadline |

Tab `New postings`: dated appends from poll. Tab `Answers`: the answer bank.
Columns Pattern (regex against the field label, case-insensitive), Answer,
Approved (`seed` until William reviews, `yes`, or `no` = always ask William),
Notes. Rules apply top to bottom; the first rule that matches decides. For a
field with options, the first matching rule whose answer fits an option wins.
A `no` rule that matches an option (sponsorship inside a work-authorization
list) also stops the field. `FILE:resume` and `FILE:transcript` mean an upload.
`node scripts/internships/setup.mjs` reseeds the tab and the Status dropdown.

## Workers

All run on this Mac under launchd (a fire missed while asleep runs on wake).
Install with `scripts/internships/install.sh`. macOS blocks launchd jobs from
`~/Documents`, so the scripts are copied to `~/.local/share/internships-poll`
(with its own playwright) and runtime state lives in
`~/.local/share/internships`, linked from the repo as `applications/_runtime`.
Logs: `~/Library/Logs/internships-{poll,prepare}.log`.

1. **poll** (9:00, 18:00): fetch the three repo tables, dedupe on Link, append.
   Also enriches new rows. Done.
2. **enrich** (part of poll): ATS from the URL, Review tier, Variant by keyword,
   skip rules. Rules live in `scripts/internships/enrich.mjs`. Done.
3. **prepare** (hourly): for each `todo`, read the form and match every field
   to the Answers tab. Greenhouse through its public Job Board API (the board
   slug is found by scanning the page when the link hides it, as careerpuck
   links do). Ashby and Lever through headless Chromium on the apply page
   (radio and checkbox groups collapse to one question with options). All
   matched → `ready`. Unmatched → `needs-answer`, each question in Notes with
   its options. A term conflict in the posting (8 or 12 months, January start,
   Winter or Fall 2027) → `needs-human`. Rows on an ATS without a flow stay
   `todo`. Field dumps: `applications/_runtime/forms/<company>/form-<role>.json`.
   Done; `scripts/internships/prepare.mjs`. The tier-A gate sits in apply, not
   here.
4. **apply** (hourly, cap 40/day, spread): autobrowse flow per ATS
   (`greenhouse-apply`, `ashby-apply`, `lever-apply`, `workday-apply`). Uploads
   the Variant PDF and the vault documents. Send gate: one batch approval per
   day. After submit → `applied`, Applied at, screenshot into
   `applications/<company>/`. Failure → `needs-human` with the reason. Not built.
5. **inbox** (hourly): autobrowse Outlook (Graph) on w3jin@uwaterloo.ca.
   Classifies confirmation, rejection, online assessment, interview, and
   deadlines. Moves Status, sets Next action and Due. Not built.
6. **escalate** (with inbox): OA or interview, or Due within 48 h → push to
   William's phone. Rejections never interrupt. Weekly digest for the rest. Not
   built. Channel: to decide.

## Vault

`applications/_profile/` (gitignored): transcript, work term history, the
variant PDFs, answer bank export, generated per-site passwords live in
autobrowse's credential store, not here.

## Risks

- Workday is 45% of the backlog and the flow that breaks most. Expect 10–20%
  of Workday rows to end `needs-human`.
- The uwaterloo Microsoft tenant may refuse the Graph consent. Fallback: an
  Outlook rule that forwards ATS mail to a mailbox we control.
- Volume from one IP into Workday looks like a bot. Cap 40/day.
- Rows must never be deleted from the Sheet. Dedupe depends on them.
