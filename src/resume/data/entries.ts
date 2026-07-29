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
    // AI Developer (CSC), Software Developer (UAlberta), Backend Developer
    // (Jindon).
    //
    // FLAGGED AND OVERRULED, still true of this set: job titles are the one
    // claim on the page a third party can check independently (offer letter,
    // WaterlooWorks record, reference call). Two of the three are not the
    // recorded title. William's call, made with that on the table. "Analyst"
    // -> "Developer" is the smallest possible move here: the work was building.
    role: 'AI Developer',
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
    role: 'Software Developer',
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
    // Was "Java Developer". "Backend" is carried by two of the three bullets
    // (the Java platform work and the 10x Oracle query optimization) and it
    // matches the "Backend Development" keyword on the skills row. Slight
    // tension with the third bullet's UI defects, which is normal on a small
    // team and defensible in an interview. See the CSC entry for the flag.
    role: 'Backend Developer',
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
    title: 'Tract',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026 – Mar 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/tract' }],
    bullets: [
      // Tract renders on the modern one-pager only (classicSelection drops it),
      // but the modern one-pager IS the published /resume.pdf — so these two get
      // the same 2026-07-26 pass as the classic page: numbers-only bold, and no
      // parenthetical tool inventory.
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
        text: 'Architected a git-style version-control engine for LLM context in Python: branching, three-way merge, and rebase',
        tags: ['systems', 'python'],
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
        text: 'Wrapped the engine in an async agent loop exposing **28** LLM tools, with token budgeting and auto-compression',
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
        text: 'Persisted the object store in SQLite via SQLAlchemy, backed by a property-based and end-to-end pytest suite',
        tags: ['backend', 'database'],
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
    section: 'projects',
    title: 'Solana Swift SDK',
    grants: ['$40K USD Solana Foundation grant'],
    dateLabel: 'Oct 2025 – Nov 2025',
    links: [{ label: 'repo', href: 'https://github.com/The-SolShare-Team' }],
    bullets: [
      {
        id: 'sdk',
        // "for leading wallet providers (Phantom, Backpack, and Solflare)" cut
        // on the reviewer's note. It was the marketing half of the sentence:
        // "leading" is a claim the résumé cannot support, and the three wallet
        // names mean nothing to a screener outside crypto while eating most of
        // the line. What replaced it says what the SDK actually gives you.
        text: "Developed Solana's first official native Swift SDK, a typed iOS client for multi-wallet connection and signing",
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
    dateLabel: 'Sep 2024 – May 2029',
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
