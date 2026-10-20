import type { ResumeEntry } from '../types';
import { byDateDesc } from './order';

// Entries may be authored in any order. They are sorted reverse-chronologically
// (by the end of each dateLabel) at export, and that order drives both the
// public viewer and the generated résumé. The sort is stable, so entries that
// end in the same month keep their authored order here (place the one you want
// listed first earlier in the array).
//
// ---------------------------------------------------------------------------
// BOLD CONVENTION (changed 2026-07-26, external review: "do not bold random
// words ... only bold metrics")
//
// **bold** marks NUMBERS ONLY — the outcome metrics a recruiter scans for
// (10x, 15%, 200+ hours, 5,000+ files). Technology names are NOT bolded.
//
// Why: the page had roughly thirty bold spans on it, nearly all of them tool
// names, and emphasis that lands on a third of the words is not emphasis. The
// eye had nowhere to stop. Bold buys nothing with an ATS either (a parser reads
// the text, not the weight), so it was spending the page's only visual currency
// on the one audience that cannot see it. Restricted to digits, the numbers
// pop off the page from across a desk, which is exactly the six-second scan.
// Bold the OUTCOME, not the input: on a bullet carrying both a result and an
// eval size, the result is bold and the sample size stays plain.
//
// Page composition 2026-10-19 (William): Experience = Food For Good, CSC,
// SolShare grant (Solana SDK, moved up from Projects), UAlberta, Jindon;
// Projects = autobrowse, Stitch. SolShare (hackathon) and Tract are off.
// CSC, UAlberta and Jindon run two bullets so the five-job column fits.
//
// The include:false swap-in pool below (Hiya, Batch, Swarm RAG, KAN-CPPN,
// VolleyClip, RLM++, GraphRAG Agent, Email-Style LLM SFT) still carries the OLD
// all-tech bolding. Anything promoted onto the page needs the same pass first.
// ---------------------------------------------------------------------------
const authored: ResumeEntry[] = [
  {
    id: 'hiya',
    section: 'projects',
    include: false, // raw new side project — site timeline only, off the résumé for now
    title: 'Hiya',
    subtitle: 'Personal Project',
    dateLabel: 'May 2026 – Jun 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/Hiya' }],
    bullets: [
      {
        id: 'app',
        text: 'Built and shipped **Hiya**, a native **iOS** app (**SwiftUI**) that gamifies practicing social approaches (logging conversations, streaks, reminders, and challenges) on a **Supabase** Postgres backend with row-level security and anonymous-to-claimed auth',
        tags: ['ios', 'swift', 'fullstack'],
      },
      {
        id: 'synth',
        text: 'Wrote a runtime **FM audio synthesizer** in **AVFoundation** that renders every sound from PCM buffers (closed-form integrals for pitch sweeps, zero-crossing-aligned seamless loops), shipping zero audio assets',
        tags: ['audio', 'swift', 'systems'],
      },
      {
        id: 'backend',
        text: 'Designed the Postgres schema with **RLS** policies, a SECURITY DEFINER account-deletion **RPC**, and a recursion-safe trigger that chronologically reclassifies cold-vs-warm contacts',
        tags: ['backend', 'database', 'sql'],
      },
      {
        id: 'arch',
        text: 'Architected protocol-seam **MVVM** so a **198-test** swift-testing suite drives the full app through an in-memory mock repository, fully decoupled from the network',
        tags: ['architecture', 'testing'],
      },
    ],
  },
  {
    id: 'batch',
    section: 'projects',
    include: false, // raw new side project — site timeline only, off the résumé for now
    title: 'Batch',
    subtitle: 'Personal Project',
    dateLabel: 'Jun 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/batch' }],
    bullets: [
      {
        id: 'vcs',
        text: 'Built **Batch**, a Git-style version-control engine for recipes in **TypeScript** — a versioned, forkable, diffable recipe model with immutable version chains and variants stored as materializable override-deltas',
        tags: ['systems', 'typescript'],
      },
      {
        id: 'merge',
        text: 'Engineered a **three-way merge/rebase** engine for recipe variants that detects base-vs-both-changed conflicts, resolves variant-wins, and rewrites deltas so re-materialization is total and never throws',
        tags: ['systems', 'typescript'],
      },
      {
        id: 'macros',
        text: 'Wrote a gram-canonical **macro/nutrition** calculator with a layered unit-conversion ladder (ingredient equivalences, mass table, volume-by-density) and per-version frozen snapshots that degrade to a partial basis instead of failing',
        tags: ['backend', 'typescript'],
      },
      {
        id: 'arch',
        text: 'Designed a zero-dependency **hexagonal** core behind a repository port and an injected clock/ID seam, wrapped in a TTY/pipe-aware **commander** CLI',
        tags: ['architecture', 'testing'],
      },
      {
        id: 'web',
        text: 'Shipped a **Next.js**/**React** web reader on **Vercel** that visualizes a recipe\'s fork-and-merge history as an interactive **DAG** (deterministic **Dagre** layout), served from a git-backed JSON store baked into the build',
        tags: ['frontend', 'typescript'],
      },
    ],
  },
  {
    id: 'food-for-good',
    section: 'experience',
    title: 'Food For Good',
    location: 'Toronto, ON',
    // Recorded title on the work term record (2026-10-19) is "IT Systems &
    // Operations Coordinator". Rendered as Software Engineer to match the
    // register of the other three titles; same flag as the CSC entry — this is
    // the one claim a background check compares. William's call.
    //
    // Everything below is audited off the repos (githubFood4Good/API branch
    // feature/ambassador-module, AmbassadorPanel, SuperAdminPanel; 2026-10-19):
    // 284 panel commits and 335 API commits on the module branch, all his.
    // Counts are from the clone, not from memory: 234 route handlers, 26
    // worker jobs, 111 migrations, 5 roles, 70 panel routes, 684 French keys.
    // NOT on the page, by rule: "deployed", "in production", user counts —
    // the module is an open draft PR and the security fixes are open PRs.
    role: 'Software Engineer',
    dateLabel: 'Sep 2026 – Present',
    bullets: [
      {
        id: 'system',
        // Reworded 2026-10-19 (William: endpoint and job counts "don't
        // highlight what it does, why it's useful"). Purpose from the scope
        // doc and the audit: schedule student volunteers for meal and grocery
        // deliveries at partner schools, track hours, report to sponsors.
        // Stack moved to the end so the bullet still names it. No usage
        // claim: the module is not in production.
        // 2026-10-19 (William's pick): "Designed and built" over "Solely built";
        // permissions fold in as the #4 opener (William, later 2026-10-19).
        text: 'Designed and built a volunteer scheduler for a food charity, with role-scoped SQL access and an append-only audit log',
        tags: ['backend', 'fullstack', 'node'],
      },
      {
        id: 'crons',
        // William's merge 2026-10-19. Evidence: API commits 10-09..10-19
        // (crons/registry.js, scripts/cron-sim/): the simulator boots the real
        // app.js, captures every cron handler and runs it at a chosen time in
        // one transaction that always rolls back; emails, SMS and S3 are
        // recorded instead of sent. "Every email is a catalog template,
        // editable on the Email Templates page" (95dc855b). 50+ = the 51
        // cron.schedule calls counted in ffg_docs/10-13/cron_plan.md.
        text: 'Made **50+** cron jobs and their emails editable by ops, with a simulator that fires any job in a rolled-back transaction',
        tags: ['backend', 'tooling'],
      },
      {
        id: 'permissions',
        // Off 2026-10-19: folded into the opener to make room for crons. If it
        // comes back, 1,500+ stays PLAIN (a test size, not an outcome).
        default: false,
        // 1,500+ = the 1,522 probes in William's own handoff note
        // (test/permissions.js, every capability x role x scope over HTTP).
        // A test-suite size, not a pass rate; no CI runs it.
        text: 'Designed role-based permissions with SQL row scoping and an append-only audit log, verified by 1,500+ HTTP probes',
        tags: ['security', 'backend', 'sql'],
      },
      {
        id: 'security',
        // ffg_docs/10-14/grocery_security_release.md: API #1170 (bound queries,
        // one-time-code caps + reset token, account scoping, auth bypasses).
        // "Fixed" per William 2026-10-19; the PRs are open, not merged.
        // "production" describes the legacy API (it is live), not the fix.
        text: 'Fixed SQL injection, account takeover and cross-account authorization bypasses in the legacy production API',
        tags: ['security', 'backend'],
      },
      {
        id: 'matching',
        default: false,
        text: 'Wrote an assignment engine that fills delivery shifts from weighted, explained scores, with a Gini fairness report on the results',
        tags: ['algorithms', 'backend'],
      },
      {
        id: 'app',
        default: false,
        text: 'Built an installable student app with offline reads, push and live SSE updates in English and French, plus TOTP and Google/Microsoft sign-in',
        tags: ['frontend', 'react', 'pwa'],
      },
    ],
  },
  {
    id: 'csc',
    section: 'experience',
    title: 'Correctional Service of Canada',
    location: 'Ottawa, ON (Remote)',
    // Titles, settled 2026-07-28 after two passes. The recorded set was AI
    // Analyst / Python Developer / Java Developer; the reviewer's note was to
    // put "Software Engineer Intern" on all three. That was tried and reverted
    // the same day: because the generator renders the ROLE in the bold \large
    // slot, three identical titles printed the same bold string three times
    // down the page and flattened the only thing distinguishing the entries
    // from each other (a federal agency, a university lab, a company), all of
    // which sit at body weight one token later.
    //
    // What landed keeps the reviewer's actual point — a language name in a job
    // title reads as contract work, not engineering — while staying varied:
    // AI Engineer (CSC), Software Engineer (UAlberta), Full Stack Engineer
    // (Jindon). "Developer" was the intermediate step; William moved all three
    // to "Engineer" on 2026-07-28, which is the register the rest of the page
    // is written in (Bachelor of Software Engineering, and every bullet
    // describes building rather than assisting).
    //
    // FLAGGED AND OVERRULED, still true of this set: job titles are the one
    // claim on the page a third party can check independently (offer letter,
    // WaterlooWorks record, reference call). None of the three is the recorded
    // title now — the originals were AI Analyst, Python Developer and Java
    // Developer. William's call, made with that on the table.
    role: 'AI Engineer',
    dateLabel: 'Jan 2026 – May 2026',
    bullets: [
      {
        id: 'rag',
        // 220+ = the count of CSC's published policy instruments, tallied
        // 2026-07-26 off canada.ca's Commissioner's Directives index: 157
        // top-level instruments (CD/GL/ISD/FD, including sub-numbered ones like
        // 566-1..566-15 and 705-1..705-8) plus 62 nested Guidelines plus 2 other
        // standards documents. Policy Bulletins are amendment notices, not
        // policy, and are NOT in the count. ASSUMES the corpus he indexed was
        // the published CD/GL set — if it also carried unpublished internal SOPs
        // the real number is higher, and if it was a subset it is lower.
        // Diction pass 2026-07-26: "giving ... search across" made "search" a
        // flat noun and buried the action. "letting thousands of officers
        // query" names who does what.
        // 17,000+ (William, 2026-07-28) closes the reviewer's "specify
        // 'thousands' into a quantifiable metric" note. It is CSC's total staff
        // count, which is the deployment scope, so the noun is "officers and
        // staff" and not "officers" alone — correctional officers are a subset
        // of that headcount, and claiming 17,000 of them would be false. The
        // phrasing also keeps "officer" live for the feedback bullet below.
        text: 'Built a chatbot on Azure OpenAI and AI Search, letting **17,000+** officers and staff query **220+** policy directives',
        tags: ['ai', 'rag', 'azure'],
      },
      {
        id: 'chunking',
        // Result-first (2026-07-26, reviewer: "maybe try leading w/ result").
        // Also de-jargoned: "mid-chunk truncation" was the reviewer's example of
        // a phrase that stops a recruiter cold, and "Azure Document
        // Intelligence" collapsed to "Azure" on his note — the product name is
        // meaningless outside the Azure org, the platform name is not.
        // 300 stays plain: it is the sample size, not the outcome, and three
        // bold numbers in one bullet is three places for the eye to stop.
        // Diction pass 2026-07-26: bare "grounding" is an RAG term of art and
        // reads as a dangling noun to anyone else — "answer grounding" says
        // what is grounded. "retrieval accuracy" → "search accuracy" on the
        // same logic (and it echoes "query" in the bullet above); the width
        // that swap frees is what pays for "answer".
        // "structured" spent on width: adding "answer" pushed the line past
        // capacity and orphaned "Azure" onto a row of its own. Of the two,
        // "answer" earns more — "structured" is implied by parsing a PDF to
        // HTML at all, whereas bare "grounding" leaves a reader guessing.
        text: 'Raised search accuracy **15%** and answer grounding **10%** on 300 prompts by re-parsing PDFs to HTML on Azure',
        tags: ['ai', 'rag', 'azure'],
      },
      {
        id: 'ui',
        // Off the page 2026-10-19 (William: shorter CSC/UAlberta/Jindon so the
        // Solana grant work fits as Experience). Still true; one flag away.
        default: false,
        // "thumbs-up/down feedback loop" was the reviewer's "sounds too casual".
        // Same mechanism, named the way the team would write it up.
        // Diction pass 2026-07-26 (William: "track quality is a bit ambiguous").
        // It was — "quality" of what, tracked how, by whom. Both halves now say
        // what the thing does instead of what it was for: the panel links an
        // answer to its source, the rating flow logs what officers said about
        // it. The purpose reads off the mechanism without being asserted.
        text: 'Added a TypeScript citation panel linking each answer to its source, plus a rating flow logging officer feedback',
        tags: ['frontend', 'analytics'],
      },
    ],
  },
  {
    id: 'ualberta',
    section: 'experience',
    title: 'UAlberta Energy Mechatronics Lab',
    location: 'Edmonton, AB',
    // Was "Python Developer". Generalized, not inflated: the work here was a
    // Selenium scraper, a Folium map and a SQL Server database, which is plain
    // software work that happened to be in Python. See the CSC entry for the
    // full titles rationale and the flag.
    role: 'Software Engineer',
    dateLabel: 'Jul 2025 – Sep 2025',
    bullets: [
      {
        id: 'scraper',
        // "200+ hours" (2026-07-26) is NOT an invented number — it is a
        // conservative floor on William's own arithmetic, kept here so he can
        // reconstruct it live in an interview: the manual flow he replaced was a
        // per-paper Google Scholar deep search, following hyperlinks, then
        // fetching each author, which cannot average under ~2 min; × 7,000+
        // papers ≈ 230 hrs. He previously wrote this as "hundreds of hours".
        // The reviewer wanted a figure and wanted it to LEAD, on the grounds
        // that 7,000 papers / 2,000 sites are counts of inputs (unimpressive on
        // their own) while the hours are the thing that was actually saved.
        // 2,000+ journal sites dropped on the same note; 7,000+ stays, plain,
        // as the scale the number rests on.
        text: 'Cut **200+ hours** of manual author lookups by automating citation tracking for 7,000+ papers with a Selenium scraper',
        tags: ['python', 'scraping'],
      },
      {
        id: 'map',
        // Off again 2026-10-19 (two-bullet trim, see CSC `ui`).
        default: false,
        // Promoted to a rendered bullet 2026-07-26 (reviewer: "add a third
        // point if possible"). It was already written and already true; it was
        // sitting out purely on the old line budget.
        // Folium per William 2026-07-26. It is the natural fit for the rest of
        // the stack: a Python library that emits an interactive Leaflet map, and
        // the standard choice for a choropleth in a research setting. He could
        // not name it from memory, so if the repo says Plotly or GeoPandas
        // instead, this is a one-word change.
        // "choropleth", not "citation-network visualization" — the earlier
        // wording described the wrong kind of chart entirely.
        // Diction pass 2026-07-26: "the resulting publication map" leaned on
        // the bullet above to mean anything, and "for lab talks" trailed off
        // the end as an afterthought. "Mapped the results" carries the same
        // link without the pointer word.
        text: 'Mapped the results as a Folium choropleth shading regions by citation density, used in lab research talks',
        tags: ['dataviz'],
      },
      {
        id: 'db',
        // One line (reviewer: "shorten into 1 line, everything after comma is a
        // little fluff"). "replacing manual file search" survives because it is
        // the Z in did-X-using-Y-achieving-Z; what got cut was the padding
        // around it ("organizing" → the database made them queryable, "across
        // experiments" → implied).
        // Diction pass 2026-07-26: "experimental fuel cell files" parses two
        // ways (experimental cells? experimental files?) — it is files from
        // fuel cell experiments, so "fuel cell experiment files". "Deployed"
        // described the last step of the job; "Consolidated" describes the
        // job. "manual file search" → "manual folder search", which is what
        // the researchers were actually doing.
        text: 'Consolidated **5,000+** fuel cell experiment files into a SQL Server database, replacing manual folder search',
        tags: ['sql', 'data'],
      },
    ],
  },
  {
    id: 'weaccel',
    section: 'experience',
    include: false, // PD program (not validated employment) — excluded from the résumé; kept in the pool
    title: 'WE Accelerate Azure & AI Stream',
    location: 'Waterloo, ON',
    role: 'Professional Development Participant',
    dateLabel: 'Jun 2025 – Aug 2025',
    bullets: [
      {
        id: 'chatbot',
        text: 'Designed and presented a healthcare chatbot MVP for hospital symptom triage in a 7-person team',
        tags: ['ai', 'product'],
      },
      {
        id: 'data',
        text: 'Led data preprocessing in **Python**, sourcing datasets from the CDC, and built a workflow for model training',
        tags: ['ml', 'data'],
      },
      {
        id: 'certs',
        text: 'Earned Azure Fundamentals (**AZ-900**) and Azure AI Fundamentals (**AI-900**) certifications',
        tags: ['azure', 'certification'],
      },
    ],
  },
  {
    id: 'jindon',
    section: 'experience',
    title: 'Jindon International Ltd.',
    location: 'Waterloo, ON',
    // Was "Java Developer", then briefly "Backend Developer". "Full Stack" is
    // the better fit and closes the seam the backend title opened: the three
    // bullets run case search and intake forms (UI), a 10x Oracle query
    // optimization (data layer) and unit tests plus UI defect fixes, which is
    // both ends of the stack rather than one. It also matches the "Full-Stack
    // Development" keyword on the skills row. See the CSC entry for the flag.
    role: 'Full Stack Engineer',
    dateLabel: 'Jun 2025 – Jul 2025',
    bullets: [
      {
        id: 'intake',
        // ~1M = 2024-25 avg beneficiaries across Ontario Works + ODSP (972,979
        // — Auditor General / Maytree public data); system scale, not personal
        // impact, so it hangs off the system description.
        // "Ontario's social assistance system" → "a government benefits
        // platform" (2026-07-26, reviewer: "replace with a general term"). The
        // proper noun told a recruiter outside Ontario nothing; the general term
        // conveys the two things that actually signal — public sector, and a
        // system with a million people on it.
        // Diction pass 2026-07-26: "search features" is a placeholder phrase —
        // it says a feature existed, not what it searched. "case search" names
        // it and matches the case-management system the third bullet cites.
        text: 'Built case search and intake forms in Java for a government benefits platform serving **~1M** users',
        tags: ['java', 'fullstack'],
      },
      {
        id: 'sql',
        // "performance", not "latency" — reviewer correction (2026-07-18):
        // the 10x was measured on overall query performance, latency is
        // not the accurate word for what was optimized.
        text: 'Optimized Oracle SQL query performance **10x** by eliminating redundant joins and adding targeted indexes',
        tags: ['sql', 'performance'],
      },
      {
        id: 'tests',
        // Off again 2026-10-19 (two-bullet trim, see CSC `ui`).
        default: false,
        // Promoted 2026-07-26: with WE Accelerate off the classic page, Jindon
        // can carry three bullets, and a two-bullet entry next to two
        // three-bullet ones reads as the thin one. "Curam" dropped by the
        // reviewer's own rule about naming things recruiters have never heard
        // of — it is IBM's govtech case-management platform, which is exactly
        // what the bullet now says in words anyone can parse.
        // Diction pass 2026-07-26: the old order let "across the platform's
        // case-management components" modify the defects when it modifies the
        // tests. "modules" over "components", which in a Java codebase means
        // something narrower than intended.
        text: "Wrote JMockit unit tests across the platform's case-management modules and fixed defects in its UI",
        tags: ['testing', 'java'],
      },
    ],
  },
  {
    id: 'tract',
    section: 'projects',
    include: false, // off 2026-10-19 (William): autobrowse takes the solo-systems slot
    title: 'Tract',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026 – Mar 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/tract' }],
    bullets: [
      // STALE AS OF 2026-07-29 — kept for the record. Tract used to render on
      // the modern one-pager only, because classicSelection dropped it. It now
      // renders on BOTH: the classic page carries it in place of SolShare (see
      // selections.ts for why), which means every line below is on the document
      // he applies with as well as on the published /resume.pdf. Edit
      // accordingly — a width regression here shows up in two places, and the
      // classic shell is the tighter of the two.
      //
      // These two get the same 2026-07-26 pass as the classic page:
      // numbers-only bold, and no parenthetical tool inventory.
      //
      // One-line pass 2026-07-28. These were the only wrapped bullets on either
      // variant: two bullets at two rendered lines each, on the document served
      // at williamjin.dev/resume.pdf. Tract never got the reviewer's "shorten
      // into 1 line" treatment because he only ever saw the classic page, which
      // does not carry Tract. Both are now one line, and `storage` is promoted
      // so the entry runs three bullets like every other project (four rendered
      // lines before, three now).
      {
        id: 'dag',
        // "content-addressed SHA-256" spent on width. Of the two halves it was
        // the cheaper: "git-style version-control engine" already implies
        // content addressing to a reader who would care about the hash, whereas
        // three-way merge and rebase on an LLM context is the claim nothing
        // else on the page makes. The colon replaces ", with a ... supporting",
        // which was six words of connective tissue.
        //
        // KEVIN PASS 2026-07-29. Tract had never had the external reviewer's
        // treatment because he only ever saw the classic page, which did not
        // carry Tract until this change. Two of his rules bite here: "talk about
        // how, not what", and the "too casual" note that killed Stitch's
        // colon-plus-inventory shape. "Architected a git-style version-control
        // engine" was the what; a colon followed by three nouns was the shape.
        // Rewritten to lead with the data structure, which IS the how.
        // Content addressing verified in the repo, not assumed:
        // src/tract/engine/hashing.py hashes canonical JSON with SHA-256 and
        // blobs are keyed by content_hash; the DAG walk and common-ancestor
        // search live in operations/dag.py (find_merge_base).
        //
        // "three-way merge" CUT 2026-07-29 (William: "it doesn't really make
        // sense"). He is right, and the reason matters for anything written
        // about Tract later. Three-way merge is git vocabulary for reconciling
        // two texts against a common ancestor; Tract does not diff text at all.
        // It reconciles OPERATIONS. The claim moved to its own `merge` bullet
        // below, said in the repo's own terms. What stays here is the structure
        // plus where it lives, which is Kevin's "how the backend works".
        // Width pass: the first cut ran "... commit DAG in Python, with
        // branching and rebase over a SQLite object store" and wrapped to two
        // rendered lines. "object store" went (SQLite says where it lives
        // without it), and the clause order flipped so "over SQLite" attaches to
        // the DAG rather than dangling off "rebase", which is what it modified
        // in the long version and read wrong.
        //
        // "content-addressed commit DAG" REVERTED 2026-07-29, same day it went
        // in. Running Kevin's full note set against this bullet caught the
        // error: his "be more technical" and his "recruiters will get confused
        // at 'mid-chunk truncation'" are the same rule seen from two sides, and
        // the tiebreaker is what he actually approved. Both of his technical
        // rewrites landed on NAMED, RECOGNIZABLE TECHNOLOGY — Solana's "how not
        // what" became "X25519 ... TweetNaCl", Stitch's "how the backend works"
        // became "Supabase Postgres ... FFmpeg in Next.js API routes". Neither
        // became CS theory vocabulary. "content-addressed commit DAG" is CS
        // theory vocabulary, and it was the most opaque phrase on the page.
        // Corroborating: Tract's own README headline is "Git-like version
        // control for LLM context windows" — the project leads with the legible
        // framing, and this bullet had stopped doing so. Content addressing is
        // also the least surprising thing about a VCS; branch/rebase on a
        // CONVERSATION is the striking claim, and `merge` below carries the
        // mechanism that content addressing exists to serve.
        // Attachment fix 2026-07-29 (William: "backed by doesn't make sense").
        // Correct — "with branching and rebase backed by SQLite" hung the
        // prepositional phrase off the two OPERATIONS, and an operation is not
        // backed by a database. The thing SQLite actually holds is the commit
        // rows (storage/engine.py, a SQLAlchemy engine over SQLite carrying
        // commits, blobs, refs and annotations). So "stored in SQLite" now
        // modifies "commits", which is the noun it is true of. Third phrasing of
        // this clause: "over a SQLite object store" wrapped the line, "over
        // SQLite" and "backed by SQLite" both dangled.
        text: 'Built git-style version control for LLM context in Python, branching and rebasing commits stored in SQLite',
        tags: ['systems', 'python'],
      },
      {
        id: 'merge',
        // NEW 2026-07-29, and the strongest single line on the entry: it is the
        // one claim on the whole résumé that nothing else comes near.
        //
        // Written off a read of src/tract/operations/merge.py, not from memory.
        // Every commit row carries an operation — CommitOperation.APPEND, or
        // EDIT with an edit_target — and SKIP rides as an annotation. So a merge
        // is not a text diff; detect_conflicts() reconciles what each branch DID
        // to shared history, by exactly three structural rules named in its
        // docstring: both_edit (both branches EDIT the same target), skip_vs_edit
        // (one SKIPs what the other EDITs), and edit_plus_append (one EDITs a
        // pre-merge-base commit while the other APPENDs). When a rule fires the
        // ConflictInfo handed to the resolver carries content_a_text,
        // content_b_text and merge_base_hash, and under strategy="semantic" that
        // resolver is an LLM which writes the resolution (MergeStrategy.OURS /
        // THEIRS are the non-LLM fallbacks).
        //
        // "Detected ... structurally" was in an earlier draft and came out:
        // naming the three operations IS the structure, so the adverb was
        // telling the reader what the rest of the sentence already shows.
        text: "Detected merge conflicts from each commit's edit, append, and skip operations, then resolved them with an LLM",
        tags: ['systems', 'ai', 'python'],
      },
      {
        id: 'agent',
        // Closing clause ("keeping long sessions in context") cut for width.
        // It stated the purpose of the two mechanisms named right before it,
        // which a reader infers from "token-budget enforcement" and
        // "auto-compression" without being told.
        // "token-budget enforcement" -> "token budgeting" on a second pass: the
        // first rewrite still wrapped at 115 rendered characters even though the
        // 116-character Stitch bullet fits, because this line's glyph mix (LLM,
        // W, the bold 28) runs wider than the count suggests. Character count is
        // a proxy, not a ruler — always recompile. The verb form is also less
        // nouny than the compound it replaces.
        //
        // COUNT CORRECTED 2026-07-29: 28 -> 29. Both independent sources in the
        // repo agree — the ToolName Literal in toolkit/models.py has 29 members
        // and toolkit/definitions.py constructs 29 ToolDefinition(...) objects.
        // No profile exposes 28 either (self=23, supervisor=29), so 28 was
        // simply wrong. This bullet also renders on the published /resume.pdf,
        // which is why the fix is made here rather than as a classic override.
        //
        // KEVIN PASS 2026-07-29 ("how, not what"): "with token budgeting and
        // auto-compression" listed two features side by side without saying
        // what connects them. loop.py:259 says exactly what connects them —
        // threshold = int(cfg.max_tokens * cfg.auto_compress_threshold), and
        // the loop compresses once compiled context crosses it. Stating the
        // trigger is the mechanism; naming the two knobs was the product blurb.
        text: 'Drove the engine from an async agent loop of **29** LLM tools that compresses context at a token-budget threshold',
        tags: ['ai', 'agents', 'python'],
      },
      {
        id: 'semantic',
        default: false,
        text: 'Added LLM-mediated semantic merges and context compression, mapping model output to typed **Pydantic** results with fail-open validation',
        tags: ['ai', 'llm'],
      },
      {
        id: 'storage',
        // Promoted 2026-07-28 (see the block comment above). It is the bullet
        // that answers the reviewer's standing project rule — "how the backend
        // works, how its hosted" — for the one project that never got it, and
        // it is the only one of the two bench bullets that describes
        // persistence rather than more agent behaviour.
        // Re-bolded to the numbers-only convention (SQLite/SQLAlchemy/pytest
        // were carrying the old all-tech bolding, per the file header) and the
        // parenthetical unpacked: "auto-migrating schema" cut for width.
        //
        // DEMOTED 2026-07-29 to make the slot for `merge`. Not a downgrade of
        // the claim — the `dag` bullet now carries "over a SQLite object store",
        // so the persistence half was being said twice, and `merge` is a far
        // better use of a line than saying SQLite again. What is genuinely lost
        // is the testing signal, which is why the bullet is rewritten to lead
        // with it rather than deleted: swap it in for any JD that names TDD or
        // test coverage (CAO's posting does). Repo numbers behind it, 2026-07-29
        // audit: 95 test modules, 49,138 lines of tests against 41,087 lines of
        // source, hypothesis property tests in tests/strategies.py and
        // test_content.py, four integration modules, and storage/engine.py
        // migrates an existing database v1 -> v13 on open.
        default: false,
        text: 'Covered the engine with a property-based and end-to-end pytest suite, running more test code than source',
        tags: ['backend', 'database', 'testing'],
      },
    ],
  },
  {
    id: 'swarm-rag',
    section: 'projects',
    include: false, // one-page trim: strongest solo build but unvalidated + 3 long bullets; top swap-in
    title: 'Swarm RAG',
    subtitle: 'Research Project',
    dateLabel: 'Dec 2025 – Feb 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/swarm_rag' }],
    bullets: [
      {
        id: 'aco',
        text: 'Built a **GraphRAG** retriever (**PyTorch**) in which an **ant-colony** swarm of agents traverses the **129K-node STaRK Prime** knowledge graph, composing per-step **movement, pheromone-deposit, and ranking** heuristics to converge on the subgraph most relevant to each query',
        tags: ['ai', 'rag', 'python'],
      },
      {
        id: 'symbolic',
        text: "Made the swarm's heuristics themselves the search target: each genome encodes its scoring rules as either a **weighted sum** of primitive graph signals or a free-form **expression tree** discovered by **symbolic regression**, so the optimizer discovers traversal logic rather than hand-tuning weights",
        tags: ['ml', 'optimization', 'symbolic-regression'],
      },
      {
        id: 'mapelites',
        text: 'Drove the outer search with **MAP-Elites** quality-diversity — an archive of elite genomes spread across behavioral descriptors (complexity, recall, latency) — explored by a **registry** of composable **genetic operators** (tournament/Boltzmann selection, subtree crossover, focused & guided mutation) and a **three-tier LLM** loop that diagnoses genomes and prescribes targeted mutations',
        tags: ['ml', 'optimization', 'llm'],
      },
      {
        id: 'systems',
        default: false,
        text: 'Implemented it **GPU-native** in **PyTorch**, stepping the entire swarm in parallel as batched tensor ops over a compact **CSR** graph (~**16M** edges) at ~**50 ms**/query, with fitness caching, a cross-generation embedding cache, and convergence detection keeping multi-hundred-generation runs fast and VRAM-bounded',
        tags: ['systems', 'pytorch', 'gpu'],
      },
      {
        id: 'arch',
        default: false,
        text: 'Designed a pluggable architecture with swappable **vector-store**, **graph-store**, and **embedding-provider** adapters (Cohere, Gemini, OpenAI)',
        tags: ['architecture', 'python'],
      },
    ],
  },
  {
    id: 'kan-cppn',
    section: 'projects',
    include: false, // one-page trim: niche research; swap in for ML-research-flavored apps
    title: 'KAN-CPPN',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/KAN_picbreedr' }],
    bullets: [
      {
        id: 'kan',
        text: 'Implemented from scratch a vectorized B-spline **Kolmogorov-Arnold Network** layer in **PyTorch** (spline degrees 1-4, autograd-safe), verified against **SciPy** as a partition of unity',
        tags: ['ml', 'pytorch'],
      },
      {
        id: 'cppn',
        text: 'Used the KAN as the substrate for a **CPPN** that synthesizes images from pixel coordinates, reproducing a target genome to **9e-4** MSE over a 2,000-step run',
        tags: ['ml', 'generative'],
      },
      {
        id: 'optim',
        text: 'Built a unified harness comparing three optimizers on the same network: **SGD**, **particle-swarm** optimization over spline coefficients, and a **natural-evolution-strategy** loop with antithetic sampling plus SGD refinement',
        tags: ['ml', 'optimization'],
      },
      {
        id: 'interp',
        text: 'Hypothesized that learnable **KAN** spline activations would be more interpretable than an MLP-based **CPPN**, built curve-fitting and weight-reset probes to test it, and measured no clear interpretability gain',
        tags: ['ml', 'interpretability'],
      },
    ],
  },
  {
    id: 'volleyclip',
    section: 'projects',
    include: false, // one-page trim: full-stack + live demo; swap-in if you want a web/demo project
    title: 'VolleyClip',
    subtitle: 'Personal Project',
    dateLabel: 'Jan 2026 – Feb 2026',
    links: [
      { label: 'live demo', href: 'https://volleyball-clipper.vercel.app' },
      { label: 'repo', href: 'https://github.com/WilliamJin123/volleyball-clipper' },
    ],
    bullets: [
      {
        id: 'app',
        text: 'Built **VolleyClip**, a full-stack app (**Next.js** + **TypeScript** + **FastAPI**) that turns a volleyball VOD into per-play clips of a chosen player from a natural-language query',
        tags: ['fullstack', 'ai'],
      },
      {
        id: 'ai',
        text: 'Used the **Twelve Labs** video-AI API (Marengo, Pegasus) with schema-constrained prompts to extract exact start/end timestamps for the queried plays',
        tags: ['ai', 'video'],
      },
      {
        id: 'ffmpeg',
        default: false,
        text: 'Engineered an **FFmpeg** pipeline that stream-copies clips straight from **Cloudflare R2** presigned URLs for near-instant lossless cuts, auto-generating thumbnails',
        tags: ['video', 'backend'],
      },
      {
        id: 'infra',
        default: false,
        text: 'Deployed the frontend on **Vercel** and the **Docker**-containerized backend on **Google Cloud Run**, backed by **Supabase** Postgres, auth, and row-level security',
        tags: ['infra', 'devops'],
      },
    ],
  },
  {
    id: 'autobrowse',
    section: 'projects',
    title: 'autobrowse',
    subtitle: 'Personal Project',
    dateLabel: 'Sep 2026 – Present',
    links: [
      { label: 'repo', href: 'https://github.com/wrenautomation/autobrowse' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@wrenautomation/autobrowse' },
    ],
    // Audited 2026-10-19 off the local repo: 626 commits, all William's, every
    // one with a Claude co-author trailer (say "co-developed with Claude Code"
    // if asked). Counts from the clone: 271 route method lines across the site
    // modules, 123 defineFlow calls, 47 irreversible routes, tags v0.2.0–v0.4.0.
    // "200+ routes" and "20 sites" are floors under two independent counts.
    // NOT on the page: LOC (82k in five weeks invites "who wrote this"),
    // self-heal (off by default, AUTO_HEAL unset), any usage or scale metric
    // (none exist), the remote Browserbase tier (prod runs local Chrome only).
    bullets: [
      {
        id: 'runtime',
        // Reworded 2026-10-19 (William: "shaped" was vague). src/sites/facade.ts
        // calls itself "the facade over every site": match the official path,
        // validate as the official API would, answer via the API leg when a
        // token is held, else the browser leg. Restate moved off this line;
        // it stays on the skills row. Later 2026-10-19: William picked the
        // "one REST client" wording; 200+ routes dropped (an input count, not
        // impact), 20 sites bold as scope.
        text: 'Built a REST facade over **20** sites that uses each site\'s own API when it has a token, else drives a Playwright browser',
        tags: ['typescript', 'automation', 'playwright'],
      },
      {
        id: 'engine',
        // Reworded 2026-10-19 (William): the point is no model on repeat runs.
        // "self-repair" = src/browser/repair.ts (on whenever a model key is
        // set; fixes remembered and tried first next run). "human-like" =
        // src/browser/human (curved mouse reach, typing rhythm), the one door
        // every compiled act goes through. No "branching": the outline is a
        // straight list of ops.
        // src/explore/server.ts (a model or a person maps a flow, every act
        // journaled as a recording) -> src/compiler (structure, polish,
        // render to a typed TS module). 27 workflows in src/workflows.
        text: 'Turned one-off agent runs into deterministic workflows that self-repair and replay with human-like mouse and typing',
        tags: ['distributed', 'restate', 'architecture'],
      },
      {
        id: 'durable',
        // William's pick 2026-10-19 (variation #5). src/engine/object.ts: one
        // Restate Virtual Object per workflow; `step` runs one step and sends
        // itself the next, so pause/reset/approve never queue behind a run; a
        // generation number fences stale messages (interview detail).
        text: 'Designed a durable Restate engine where each step chains the next, so pauses and approvals never block a run',
        tags: ['distributed', 'restate', 'architecture'],
      },
      {
        id: 'auth',
        default: false,
        text: 'Automated sign-in via TOTP, inbox-read one-time codes and passkeys from a virtual WebAuthn authenticator',
        tags: ['auth', 'security', 'webauthn'],
      },
      {
        id: 'recorder',
        default: false,
        text: 'Built a record-and-compile loop: an in-page recorder captures clicks with locator hints and emits typed TypeScript workflows plus tests',
        tags: ['tooling', 'typescript'],
      },
      {
        id: 'npm',
        default: false,
        text: 'Published it to npm with trusted publishing and provenance (v0.4.0), with a human-pace input layer and a vision-model captcha solver',
        tags: ['open-source', 'npm'],
      },
    ],
  },
  {
    id: 'stitch',
    section: 'projects',
    title: 'Stitch',
    subtitle: 'UofTHacks 13',
    awards: ['Winner: Best Use of Gemini API'],
    dateLabel: 'Jan 2026',
    links: [
      { label: 'devpost', href: 'https://devpost.com/software/stitch-30p6ly' },
      { label: 'repo', href: 'https://github.com/Phalanyx/stitch' },
    ],
    bullets: [
      {
        id: 'agent',
        // "too casual" (2026-07-26). The casual part was the trailing
        // parenthetical inventory — "(cut, trim, transitions, voiceover, audio
        // mixing)" reads like a feature list off a Devpost page. Named the
        // mechanism instead: 14 tool calls against a live timeline.
        text: 'Built an agentic video editor in Next.js where a Gemini agent drives a live timeline through **14** custom editing tools',
        tags: ['ai', 'agents'],
      },
      {
        id: 'search',
        // One line, and says what it resolves TO (timestamps) rather than the
        // vaguer "surface the exact matching segment".
        text: 'Implemented natural-language clip retrieval with Twelve Labs, resolving each query to exact in-clip timestamps',
        tags: ['ai', 'video'],
      },
      {
        id: 'veo',
        default: false,
        text: 'Created a **Veo 3.1** transition tool that frame-interpolates between the boundary frames of two adjacent clips for a seamless cut',
        tags: ['ai', 'video'],
      },
      {
        id: 'tts',
        default: false,
        text: 'Generated AI voiceover with **ElevenLabs** TTS, fitting each clip to a target duration via **FFmpeg** time-stretching',
        tags: ['ai', 'audio'],
      },
      {
        id: 'ui',
        // Promoted 2026-07-26. The reviewer's note on Stitch was "be more
        // technical, don't just describe the product (how the backend works, how
        // its hosted)" — of the three bench bullets this is the only one that
        // describes ARCHITECTURE rather than another feature, and the shared
        // undo/redo history across an AI and a human editing the same document
        // is the genuinely hard part of the build.
        // "Designed", not "Built" (diction pass 2026-07-26) — the entry's first
        // bullet already opens on "Built", and the claim here is the design
        // decision (one history, two writers), not the construction.
        text: 'Designed a React 19 timeline where agent and manual edits share a single undo/redo history',
        tags: ['frontend', 'react'],
      },
      {
        id: 'infra',
        // Added 2026-07-26 for the reviewer's "how the backend works, how its
        // hosted". Written from a repo audit, NOT from memory: William thought
        // Stitch used Cloudflare buckets, but package.json has no Cloudflare or
        // S3 dependency at all — storage is Supabase (raw-video / raw-audio
        // buckets, getPublicUrl in src/app/api/upload/route.ts), Postgres is
        // Supabase via Prisma (@prisma/adapter-pg), and the FFmpeg work runs in
        // Next.js API routes (src/app/api/export/route.ts, src/lib/*).
        // Cloudflare R2 is VOLLEYCLIP's stack, not this one.
        // Diction pass 2026-07-28: "Backed it with" put the pronoun three
        // bullets away from its antecedent. "the editor" resolves on the spot
        // and costs nothing, paid for by dropping "finished" (a cut is the
        // finished thing).
        text: 'Backed the editor with Supabase Postgres and storage buckets, exporting cuts through FFmpeg in Next.js API routes',
        tags: ['backend', 'infra'],
      },
    ],
  },
  {
    id: 'rlm-plus-plus',
    section: 'projects',
    include: false, // one-page trim: strong alternate (78% vs 24%); overlaps tract thematically
    title: 'RLM++',
    subtitle: 'Personal Project',
    dateLabel: 'Jan 2026',
    links: [
      { label: 'repo', href: 'https://github.com/WilliamJin123/RLM_plus_plus' },
      { label: 'ref. paper', href: 'https://arxiv.org/pdf/2512.24601' },
    ],
    bullets: [
      {
        id: 'agent',
        text: "Built a long-context QA agent (**Python**, **Agno**) after MIT's Recursive Language Models, indexing documents into a hierarchical **SQLite** summary tree and offloading raw-text reads to sub-agents to stay within the context window",
        tags: ['ai', 'agents', 'python'],
      },
      {
        id: 'rotation',
        text: 'Engineered a thread-safe round-robin rotation across **14** free-tier LLM endpoints (Gemini, Cerebras, Groq, OpenRouter) with automatic failover, parallelizing summarization of multi-million-token documents under rate limits',
        tags: ['systems', 'llm'],
      },
      {
        id: 'validator',
        text: 'Added a self-healing validator that detects corrupted summaries (provider errors, reasoning-tag leakage, orphaned nodes) and regenerates them in parallel, making ingestion resumable and fault-tolerant',
        tags: ['systems', 'python'],
      },
      {
        id: 'bench',
        text: 'Benchmarked it with a resumable harness for **LongBench-v2** and **OOLONG**, scoring **78%** on an 18-question code-QA slice where the source paper reports base models near **24%**',
        tags: ['ai', 'eval'],
      },
    ],
  },
  {
    id: 'graphrag-agent',
    section: 'projects',
    include: false, // one-page trim: redundant with Swarm RAG (GraphRAG) + Solana SDK (same team)
    title: 'GraphRAG Codebase Agent',
    subtitle: 'Solana Swift SDK',
    dateLabel: 'Nov 2025 – Dec 2025',
    links: [
      { label: 'chatbot', href: 'https://github.com/The-SolShare-Team/Docs_GraphRAG' },
      { label: 'coding agent', href: 'https://github.com/The-SolShare-Team/demo_app_agent' },
    ],
    bullets: [
      {
        id: 'graph',
        text: 'Built a **GraphRAG** assistant over the Solana SDK, indexing **600+** Swift symbols into a **FalkorDB** code graph with typed relationships (inherits, conforms-to, member-of)',
        tags: ['ai', 'graphrag', 'python'],
      },
      {
        id: 'tools',
        text: 'Engineered custom **Agno** tools for multi-hop **graph traversal** and vector search with **Cohere** reranking',
        tags: ['ai', 'agents', 'python'],
      },
      {
        id: 'implementer',
        text: 'Built a multi-agent **Agno** implementer that autonomously writes **SwiftUI** from the repo via GitHub and sandboxed filesystem tools',
        tags: ['ai', 'agents', 'swift'],
      },
      {
        id: 'models',
        text: 'Orchestrated cheap open-weight models (**GLM-4.6**, **GPT-OSS-120B**) on **Cerebras** to drive the agents at low cost',
        tags: ['ai', 'llm', 'infra'],
      },
    ],
  },
  {
    id: 'solana-sdk',
    // Moved to Experience 2026-10-19 (William): "we all worked on it in joint,
    // I contributed across the whole thing ... if I can explain it we can
    // embellish with it." Grant-funded work, so a job title is defensible;
    // "Software Developer" over "Blockchain Developer" because the backlog
    // has 3 blockchain rows in 1,154 and the title has to read for general
    // SWE. The experience heading does not render `grants`, so the $40K
    // moved into the first bullet (it is the entry's one number). The viewer
    // still shows the grant badge.
    // Attribution on record, unchanged: core SDK 5 of 57 commits, GraphRAG
    // agent and demo agent 100% his. See [[solshare-sdk-true-story]].
    section: 'experience',
    role: 'Software Developer',
    title: 'SolShare (Solana Foundation Grant)',
    grants: ['$40K USD Solana Foundation grant'],
    dateLabel: 'Oct 2025 – Dec 2025',
    links: [{ label: 'repo', href: 'https://github.com/The-SolShare-Team' }],
    bullets: [
      {
        id: 'sdk',
        // "for leading wallet providers (Phantom, Backpack, and Solflare)" cut
        // on the reviewer's note. It was the marketing half of the sentence:
        // "leading" is a claim the résumé cannot support, and the three wallet
        // names mean nothing to a screener outside crypto while eating most of
        // the line. What replaced it says what the SDK actually gives you.
        text: "Built Solana's first official native Swift SDK on a **$40K** grant: a typed iOS client for wallet connection and signing",
        tags: ['swift', 'sdk'],
      },
      {
        id: 'crypto',
        // "talk about how, not what" (Kevin, 2026-07-26). Primitives read off
        // the repo: Deeplink/Operations/Connect.swift generates an ephemeral
        // keypair with SaltBox.keyPair(), then SaltBox.before() (NaCl
        // crypto_box_beforenm = X25519 ECDH) derives the per-session shared
        // secret; responses open as XSalsa20-Poly1305 secretboxes with nonces
        // from SecRandomCopyBytes. Library is TweetNaCl via
        // bitmark-inc/tweetnacl-swiftwrap, alongside the team's own Salkt.swift.
        //
        // CAVEAT ON RECORD: William's 5 commits on that repo do not touch
        // Connect.swift. He reviewed this and chose to keep the bullet on the
        // basis that he was "tangentially responsible" and can defend it in an
        // interview (2026-07-26). His call, documented here so nobody
        // re-litigates it. See [[solshare-sdk-true-story]] for the full split.
        // Diction pass 2026-07-26: "connect" was a noun borrowed from
        // wallet-adapter jargon; "connection" is the English word. The closing
        // clause was also loose to the point of being wrong — the app DOES
        // hold a private key, the ephemeral X25519 one it generates per
        // session. What it never gets is the wallet's, which is the actual
        // security property.
        // Diction pass 2026-07-28: the bullet used to open "Built connection
        // and signing on ...", repeating the exact phrase that closes the
        // bullet above it. Two adjacent bullets stuttering on the same four
        // words reads as filler. "Secured each wallet session" also names the
        // real unit the handshake operates on (SaltBox.before() derives one
        // shared secret per session), so the fix buys precision, not just
        // variety.
        text: "Secured each wallet session with an X25519 deeplink handshake in TweetNaCl, so the app never sees a wallet key",
        tags: ['swift', 'crypto'],
      },
      {
        id: 'arch',
        // DEMOTED AGAIN 2026-07-26, same day it was promoted. Repo audit
        // (github.com/The-SolShare-Team/SolanaWalletAdapterKit) shows the
        // protocol-oriented wallet layer and the Phantom polyfill live in
        // Deeplink/DeeplinkWallet.swift and Deeplink/Wallets/*.swift, and
        // William's five commits on that repo touch none of them. Not his to
        // claim in the first person. See the `docs` bullet below.
        default: false,
        text: "Architected a protocol-oriented wallet layer so new wallets plug in by conformance, polyfilling Phantom's deprecated sign-and-send over the RPC client",
        tags: ['swift', 'architecture'],
      },
      {
        id: 'graphrag',
        // Replaces `arch` on the page. This IS his: Docs_GraphRAG is 18 commits
        // out of 18 and demo_app_agent is 5 out of 5, both solo. It is also the
        // most technically interesting thing he did on the grant, and it keeps
        // the entry's third bullet at implementation depth without borrowing
        // anyone else's work to get there.
        text: 'Layered a GraphRAG documentation agent over the SDK, indexing **600+** Swift symbols into a FalkorDB code graph',
        tags: ['ai', 'graphrag', 'python'],
      },
      {
        id: 'ship',
        default: false,
        text: 'Shipped the open-source SDK via **Swift Package Manager** with full documentation',
        tags: ['open-source'],
      },
    ],
  },
  {
    id: 'solshare',
    section: 'projects',
    // Off 2026-10-19 (William). Same team and chain as the SDK entry above,
    // now an Experience row. Flip ON for iOS, crypto and fintech variants:
    // it carries the Hack the North 1st-place line.
    include: false,
    title: 'SolShare',
    subtitle: 'Hack the North 2025',
    awards: ['1st Place: Cohere API Best Use', 'Solana Best Consumer Payment Experience'],
    dateLabel: 'Sep 2025',
    links: [
      { label: 'devpost', href: 'https://devpost.com/software/solshare-cmxous' },
      { label: 'repo', href: 'https://github.com/orgs/HTN-2025/repositories' },
    ],
    bullets: [
      {
        id: 'ios',
        // "and settles payment" cut 2026-07-26: the third bullet now says how
        // settlement works (on-chain, Solana transfer), so this was the vague
        // version of a claim made properly twelve words later.
        text: 'Shipped a bill-splitting iOS app in Swift that turns a receipt photo into per-person totals',
        tags: ['ios', 'swift'],
      },
      {
        id: 'cohere',
        text: 'Parsed receipts into line items with Cohere vision models in a self-critic loop that re-checks each extraction',
        tags: ['ai', 'llm'],
      },
      {
        id: 'backend',
        // Promoted 2026-07-26 — this is the fix for the reviewer's "projects
        // need more description than 1 point" on SolShare (the classic variant
        // was rendering it with a single bullet) and for "how the backend works,
        // how its hosted". Rewritten from a flat tool inventory ("built the
        // backend using X and Y and the frontend using Z") into what the
        // architecture does.
        // Payment rail confirmed by William 2026-07-26: settlement really did
        // run on-chain, which is why the entry won "Solana Best Consumer
        // Payment Experience". That belongs in the bullet and is a far stronger
        // close than stopping at Firestore.
        text: "Built the backend on Firebase Cloud Functions and Firestore, settling each share on-chain as a Solana transfer",
        tags: ['firebase', 'swiftui'],
      },
    ],
  },
  {
    id: 'email-llm',
    section: 'projects',
    include: false, // one-page trim: smallest project
    title: 'Email-Style LLM SFT',
    subtitle: 'Personal Project',
    dateLabel: 'Sep 2025',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/email-llm' }],
    bullets: [
      {
        id: 'lora',
        text: 'Created an email LoRA by fine-tuning Qwen3-14B using **Unsloth** and **Huggingface**',
        tags: ['ml', 'llm'],
      },
      {
        id: 'data',
        text: 'Trained model on 5,000+ synthetic email datasets preprocessed with **Pandas** and **NumPy**',
        tags: ['ml', 'data'],
      },
      {
        id: 'eval',
        text: 'Outperformed Qwen3-14B thinking mode in human preference tests (**72%** pref. rate)',
        tags: ['ml', 'eval'],
      },
    ],
  },
  {
    id: 'uwaterloo',
    section: 'education',
    title: 'University of Waterloo',
    location: 'Waterloo, ON',
    // "with Honours" → ", Honours" (2026-07-26): the longer form overran the
    // modern shell's heading row by 2.75pt, and since \extracolsep{\fill} has
    // no negative range the degree collided with "Waterloo, ON" on the
    // published /resume.pdf. The comma form is also how Waterloo writes it on
    // the transcript. Watch this row if the degree line ever grows again —
    // tectonic reports it as "Overfull \hbox ... in alignment".
    role: 'Bachelor of Software Engineering, Honours',
    dateLabel: 'Sep 2024 – May 2028',
    bullets: [
      // GPA off the page 2026-07-26 (reviewer: "remove gpa"). 3.7/4.0 is a
      // perfectly good Waterloo SE average, but printing it invites a
      // comparison against a number the reader has already decided is the bar,
      // and omitting it is the norm — nobody reads a missing GPA as a red flag
      // the way they read a mediocre one. `default: false` rather than deleted:
      // finance/quant postings sometimes require it, so it is one flag away.
      { id: 'gpa', default: false, text: 'GPA: 3.7/4.0' },
      // Certifications moved here 2026-07-26 from the WE Accelerate entry,
      // which came off the classic page entirely (see selections.ts). They are
      // real credentials and they belong under Education, not inside a PD
      // program's work-experience block; the line they cost is the one the GPA
      // bullet gave back.
      {
        id: 'certs',
        // "and", not a comma: with two items the comma read as the start of a
        // longer list, and it left "Microsoft" looking like it qualified only
        // the first certification when it qualifies both.
        text: 'Certifications: Microsoft Azure Fundamentals (AZ-900) and Azure AI Fundamentals (AI-900)',
      },
      // William's call (ATS review, July 2026): optionally swap the coursework
      // bullet for an availability line, e.g.
      //   'Seeking <FILL: e.g. Fall 2026 (Sept-Dec)> software engineering internship'
      // Kept coursework for now.
      //
      // Courses kept by relevance (ATS keywords): CS 240 -> Data Structures,
      // CS 247 -> Software Design (ADTs), CS 348 -> Databases; Digital Computers
      // kept for systems/hardware breadth, Statistics for the AI/ML angle.
      // Dropped as subsumed by the upper-year courses: Data Abstraction and
      // Implementation, Sequential Programs. MATH 239 (combinatorics) left off.
      {
        id: 'courses',
        text: 'Relevant Coursework: Data Structures, Software Design (ADTs), Databases, Digital Computers, Statistics',
      },
    ],
  },
];

export const entries = authored.sort(byDateDesc);
