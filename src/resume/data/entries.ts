import type { ResumeEntry } from '../types';
import { byDateDesc } from './order';

// Entries may be authored in any order. They are sorted reverse-chronologically
// (by the end of each dateLabel) at export, and that order drives both the
// public viewer and the generated résumé. The sort is stable, so entries that
// end in the same month keep their authored order here (place the one you want
// listed first earlier in the array).
const authored: ResumeEntry[] = [
  {
    id: 'hiya',
    section: 'projects',
    include: false, // raw new side project — site timeline only, off the résumé for now
    title: 'Hiya',
    subtitle: 'Personal Project',
    dateLabel: 'May 2026 - June 2026',
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
    dateLabel: 'June 2026',
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
    role: 'AI Analyst',
    dateLabel: 'Jan 2026 - May 2026',
    bullets: [
      {
        id: 'rag',
        text: 'Developed a **RAG** chatbot enabling thousands of correctional officers to query an internal regulation corpus, built on **Azure OpenAI**, **AI Search**, and **Container Apps**',
        tags: ['ai', 'rag', 'azure'],
      },
      {
        id: 'chunking',
        text: 'Redesigned the chunking pipeline to parse documents to **HTML** via **Azure Document Intelligence**, eliminating mid-chunk truncation and PDF formatting errors, improving retrieval accuracy **by 15%** and answer grounding **by 10%** over baseline across **300** test prompts',
        tags: ['ai', 'rag', 'azure'],
      },
      {
        id: 'ui',
        text: 'Implemented a **citation panel** and thumbs-up/down feedback loop in **TypeScript**, surfacing source documents and capturing user signals to evaluate response quality',
        tags: ['frontend', 'analytics'],
      },
    ],
  },
  {
    id: 'ualberta',
    section: 'experience',
    title: 'UAlberta Energy Mechatronics Lab',
    location: 'Edmonton, AB',
    role: 'Python Developer',
    dateLabel: 'July 2025 - Sept 2025',
    bullets: [
      {
        id: 'scraper',
        text: 'Automated citation tracking for **7,000+** papers across **2,000+** journal sites with inconsistent layouts by building a **Selenium**/**Beautiful Soup** scraper in **Python**, feeding a publication map used in public talks and faculty research meetings',
        tags: ['python', 'scraping'],
      },
      {
        id: 'map',
        default: false,
        text: 'Built the publication map — an interactive citation-network visualization the group used to communicate research impact',
        tags: ['dataviz'],
      },
      {
        id: 'db',
        text: 'Designed and deployed a **SQL Server** database organizing **5,000+** experimental fuel cell files, replacing manual lookup with queryable results across experiments',
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
    dateLabel: 'June 2025 - Aug 2025',
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
    role: 'Full Stack Software Engineer',
    dateLabel: 'June 2025 - July 2025',
    bullets: [
      {
        id: 'intake',
        text: "Built search functions and intake forms for Ontario's province-wide social assistance management system in **Java**",
        tags: ['java', 'fullstack'],
      },
      {
        id: 'sql',
        text: 'Reduced **Oracle SQL** query latency **10x** by removing redundant joins and adding indexes',
        tags: ['sql', 'performance'],
      },
      {
        id: 'tests',
        text: 'Wrote **JMockit** unit tests and resolved UI defects in **Curam** components across the platform',
        tags: ['testing', 'java'],
      },
    ],
  },
  {
    id: 'tract',
    section: 'projects',
    title: 'Tract',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026 - Mar 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/tract' }],
    bullets: [
      {
        id: 'dag',
        text: 'Architected a git-style version-control engine for LLM context in **Python**, with a content-addressed **SHA-256** commit **DAG** supporting branching, three-way merge, and rebase',
        tags: ['systems', 'python'],
      },
      {
        id: 'agent',
        text: 'Drove the engine from an async agent loop exposing **28** LLM tools, with token-budget enforcement and auto-compression, on the **Anthropic SDK** and an **OpenAI-compatible** client',
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
        default: false,
        text: 'Persisted the object store in **SQLite** (**SQLAlchemy**, auto-migrating schema), backed by a property-based and end-to-end **pytest** suite',
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
    dateLabel: 'Dec 2025 - Feb 2026',
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
    dateLabel: 'Jan 2026 - Feb 2026',
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
        text: 'Built an agentic AI video editor (**Next.js**, **TypeScript**, **Supabase**) where a **Gemini** agent edits a live timeline from natural language through **14** custom video and audio tools (cut, trim, transitions, voiceover, audio mixing)',
        tags: ['ai', 'agents'],
      },
      {
        id: 'search',
        text: 'Engineered natural-language clip retrieval with **Twelve Labs** semantic search to surface the exact matching segment on the timeline',
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
        default: false,
        text: 'Built a custom **React 19** timeline editor where AI and manual edits share a single undo/redo history',
        tags: ['frontend', 'react'],
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
    dateLabel: 'Nov 2025 - Dec 2025',
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
    grants: ['US$40K Solana Foundation grant'],
    dateLabel: 'Oct 2025 - Nov 2025',
    links: [{ label: 'repo', href: 'https://github.com/The-SolShare-Team' }],
    bullets: [
      {
        id: 'sdk',
        text: "Developed Solana's first official native **Swift SDK** enabling **iOS** apps to integrate multi-wallet functionality for leading wallet providers (Phantom, Backpack, and Solflare)",
        tags: ['swift', 'sdk'],
      },
      {
        id: 'crypto',
        text: 'Implemented the wallet connect and signing flow as an **encrypted deeplink handshake** with per-session shared secrets between app and wallet',
        tags: ['swift', 'crypto'],
      },
      {
        id: 'arch',
        default: false,
        text: "Architected a protocol-oriented wallet layer so new wallets plug in via conformance, polyfilling Phantom's deprecated sign-and-send over the **RPC** client",
        tags: ['swift', 'architecture'],
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
    dateLabel: 'Sept 2025',
    links: [
      { label: 'devpost', href: 'https://devpost.com/software/solshare-cmxous' },
      { label: 'repo', href: 'https://github.com/orgs/HTN-2025/repositories' },
    ],
    bullets: [
      {
        id: 'ios',
        text: 'Shipped a bill-splitting **iOS** app in **Swift** that automates receipt parsing and payment processing',
        tags: ['ios', 'swift'],
      },
      {
        id: 'cohere',
        text: "Extracted receipt data using Cohere's vision and reasoning models through a **self-critic** workflow",
        tags: ['ai', 'llm'],
      },
      {
        id: 'backend',
        default: false,
        text: 'Built the backend using **Firebase Cloud Functions** and **Firestore** and the frontend using **SwiftUI**',
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
    dateLabel: 'Sept 2025',
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
    role: 'Bachelor of Software Engineering',
    dateLabel: 'Sept 2024 - May 2029',
    bullets: [
      { id: 'gpa', text: 'GPA: 3.7/4.0' },
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
