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
| Status | William sets `todo` (and `go` on a checked tier-A row); machines move it after | `todo` → `needs-answer` → `ready` → (`go`) → `applied` → `confirmed` / `oa` / `interview` / `offer` / `rejected` / `closed`; `skip`, `needs-human` |
| Region, Company, Role, Location, Posted, Link, Tier, Extra, Source | poll | from the three GitHub repos |
| Notes | both | skip reason, unmatched question, hand-off reason |
| ATS | enrich | `greenhouse`, `ashby`, `lever`, `workday`, `icims`, `smartrecruiters`, `other` |
| Review | enrich | `A` (William edits) or `B` (send directly) |
| Variant | enrich | `classic`, `ios`, `fintech`, `blockchain`, `ml-data`. PDFs: `out/variants/<v>.pdf` (classic page, SolShare swapped in for Stitch); `ml-data` has none yet and uploads classic |
| Applied at, Confirmation, Next action, Due | apply + inbox | timestamps, screenshot path, follow-up and deadline |

Tab `New postings`: dated appends from poll. Tab `Answers`: the answer bank.
Columns Pattern (regex against the field label, case-insensitive), Answer,
Approved (`seed` until William reviews, `yes`, or `no` = always ask William),
Notes. Rules apply top to bottom; the first rule that matches decides. For a
field with options, the first matching rule whose answer fits an option wins.
A `no` rule that matches an option (sponsorship inside a work-authorization
list) also stops the field. `FILE:resume` and `FILE:transcript` mean an upload.
`node scripts/internships/setup.mjs` reseeds the tab and the Status dropdown from
`answers.seed.mjs` (gitignored: personal facts, public repo). Reseeding
overwrites the tab, so make lasting edits in the seed file.

## Workers

All run on this Mac under launchd (a fire missed while asleep runs on wake).
Install with `scripts/internships/install.sh`; re-run it after any edit, after
`npm run resume`, and after a new transcript. macOS blocks launchd jobs from
`~/Documents`, so code is copied to `~/.local/share/internships-poll` (deps from
`scripts/internships/package.json`: `@wrenautomation/autobrowse` 0.4.0 from npm,
playwright) and state lives in `~/.local/share/internships`, linked from the
repo as `applications/_runtime`: `resumes/<variant>/William_Jin_Resume.pdf`,
`profile/William_Jin_Transcript.pdf`, `forms/`, `applied/`, `dry/`, `profiles/`
(the browser), `artifacts/` (hand-off screenshots). Logs:
`~/Library/Logs/internships-{poll,work}.log`.

1. **poll** (9:00, 18:00): fetch the three repo tables, dedupe on Link, append.
   Also enriches new rows. Done.
2. **enrich** (part of poll): ATS from the URL, Review tier, Variant by keyword,
   skip rules. Rules live in `scripts/internships/enrich.mjs`. Done.
3. **prepare** (hourly, job `work`): for each `todo`, read the form and match
   every field to the Answers tab (`answers.mjs`, shared with apply).
   Greenhouse through its public Job Board API, or the page when the API lists
   under 3 fields; a 404 → `closed`. Ashby and Lever through headless Chromium.
   All required fields matched → `ready`. A required field unmatched →
   `needs-answer`, each question in Notes; optional unmatched fields stay
   blank. Under 3 fields matched → `needs-human` (form unreadable). A term
   conflict (8 or 12 months, January start, Winter/Fall 2027, "Fall semester")
   → `needs-human`. Done.
4. **apply** (hourly after prepare, 9:00–21:00 Toronto, 5 per run, 40 per day):
   picks `ready` rows with Review B and `go` rows on any tier. Runs the ATS's
   autobrowse flow (`flows/greenhouse.mjs`; human-pace input, captcha solver,
   NeedsHuman hand-off with screenshot). The flow reads fields off the live
   page (the page asks for phone country, city, school, degree, dates that the
   API leaves out), matches them again, fills, uploads the Variant PDF and the
   transcript, waits for each upload, then clicks Submit (irreversible: a miss
   goes to William, never retried). After a confirmation → `applied`, Applied
   at, Confirmation = screenshot. Anything else → `needs-human` with the
   reason. An email security code → `needs-human` until inbox exists.
   `node apply.mjs --dry <url>` fills a live form and never submits. Greenhouse
   done (dry-tested on Brave, DRW, DoorDash; no live submit yet). Ashby, Lever,
   Workday: not built; their `ready` rows wait.
5. **inbox** (hourly): autobrowse Outlook (Graph) on w3jin@uwaterloo.ca.
   Classifies confirmation, rejection, online assessment, interview, and
   deadlines. Moves Status, sets Next action and Due. Also reads Greenhouse
   security codes for apply. Not built.
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
