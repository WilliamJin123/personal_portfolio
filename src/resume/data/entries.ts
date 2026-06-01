import type { ResumeEntry } from '../types';
import { byDateDesc } from './order';

// Entries may be authored in any order. They are sorted reverse-chronologically
// (by the end of each dateLabel) at export, and that order drives both the
// public viewer and the generated résumé. The sort is stable, so entries that
// end in the same month keep their authored order here (place the one you want
// listed first earlier in the array).
const authored: ResumeEntry[] = [
  {
    id: 'csc',
    section: 'experience',
    title: 'Correctional Service of Canada',
    location: 'Ottawa, Ontario (Remote)',
    role: 'AI Analyst',
    dateLabel: 'Jan 2026 - May 2026',
    bullets: [
      {
        id: 'rag',
        text: 'Developed a **RAG** chatbot (10+ engineer team) for employees to query an internal regulation corpus, built on **Azure OpenAI**, **Azure AI Search**, and Container Apps',
        tags: ['ai', 'rag', 'azure'],
      },
      {
        id: 'ui',
        text: 'Built front-end features including a **citation panel** and thumbs-up/down response analytics to surface sources and capture user feedback for evaluation',
        tags: ['frontend', 'analytics'],
      },
      {
        id: 'chunking',
        text: 'Redesigned the chunking pipeline to parse documents to **HTML** via **Azure Document Intelligence**, eliminating mid-chunk truncation and PDF formatting errors, improving retrieval accuracy **15%** and answer grounding **10%** over baseline across **300** test prompts',
        tags: ['ai', 'rag', 'azure'],
      },
    ],
  },
  {
    id: 'ualberta',
    section: 'experience',
    title: 'University of Alberta Energy Mechatronics Lab',
    location: 'Edmonton, Alberta',
    role: 'Python Developer',
    dateLabel: 'July 2025 - Sept 2025',
    bullets: [
      {
        id: 'scraper',
        text: 'Developed a web scraper to automatically track citations of **7,000+** papers across 2,000+ journal websites using Selenium, Beautiful Soup with **Python**',
        tags: ['python', 'scraping'],
      },
      {
        id: 'map',
        text: 'Created a publication map to visualize citation networks and communicate research impact',
        tags: ['dataviz'],
      },
      {
        id: 'db',
        text: 'Designed and deployed a **SQL Server** database to organize **5,000+** experimental fuel cell files',
        tags: ['sql', 'data'],
      },
    ],
  },
  {
    id: 'weaccel',
    section: 'experience',
    title: 'WE Accelerate Azure & AI Stream',
    location: 'Waterloo, Ontario',
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
        text: 'Led data preprocessing by sourcing datasets from the CDC and created a workflow for model training',
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
    location: 'Waterloo, Ontario',
    role: 'Full Stack Software Engineer',
    dateLabel: 'June 2025 - July 2025',
    bullets: [
      {
        id: 'intake',
        text: "Built search functions and intake forms for Ontario's social assistance management system using **Java**",
        tags: ['java', 'fullstack'],
      },
      {
        id: 'sql',
        text: 'Optimized **SQL** queries (**10x** faster) by eliminating redundant table joins and adding indexes',
        tags: ['sql', 'performance'],
      },
      {
        id: 'tests',
        text: 'Wrote **JMockit** unit tests and debugged UI issues in **Curam** components',
        tags: ['testing', 'java'],
      },
    ],
  },
  {
    id: 'tract',
    section: 'projects',
    title: 'tract',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026 - Mar 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/tract' }],
    bullets: [
      {
        id: 'dag',
        text: 'Built **tract**, a from-scratch git-style version-control engine for LLM context: a content-addressed **SHA-256** commit **DAG** with branching, three-way merge, and rebase, in **Python**',
        tags: ['systems', 'python'],
      },
      {
        id: 'agent',
        text: 'Drove the engine from an async agent loop exposing **28** LLM tools, with token-budget enforcement and auto-compression, on the **Anthropic SDK** and an OpenAI-compatible client',
        tags: ['ai', 'agents', 'python'],
      },
      {
        id: 'semantic',
        text: 'Added LLM-mediated semantic merges and context compression, mapping model output to typed **Pydantic** results with fail-open validation',
        tags: ['ai', 'llm'],
      },
      {
        id: 'storage',
        text: 'Persisted the object store in **SQLite** (**SQLAlchemy**, auto-migrating schema), backed by a property-based and end-to-end test suite',
        tags: ['backend', 'database'],
      },
    ],
  },
  {
    id: 'swarm-rag',
    section: 'projects',
    title: 'Swarm RAG',
    subtitle: 'Research Project',
    dateLabel: 'Dec 2025 - Feb 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/swarm_rag' }],
    bullets: [
      {
        id: 'aco',
        text: 'Built a **GraphRAG** retriever where a swarm of agents traverse the **129K-node STaRK Prime** knowledge graph via **ant-colony optimization**, converging on the subgraphs most relevant to each query',
        tags: ['ai', 'rag', 'python'],
      },
      {
        id: 'mapelites',
        text: "Designed a **registry** of composable **genetic operators** (crossover, mutation, selection, initialization — incl. **LLM-guided** strategies) that an **evolutionary** optimizer searches over to auto-tune the swarm's scoring and heuristic functions",
        tags: ['ml', 'optimization'],
      },
      {
        id: 'arch',
        text: 'Designed a pluggable architecture with swappable **vector-store**, **graph-store**, and **embedding-provider** adapters (Cohere, Gemini, OpenAI)',
        tags: ['architecture', 'python'],
      },
      {
        id: 'systems',
        text: 'Implemented it **GPU-native** in **PyTorch**, stepping the entire swarm in parallel as batched tensor ops over a **CSR** graph (**16M** edges in **65MB**)',
        tags: ['systems', 'pytorch', 'gpu'],
      },
    ],
  },
  {
    id: 'kan-cppn',
    section: 'projects',
    title: 'KAN-CPPN',
    subtitle: 'Personal Project',
    dateLabel: 'Feb 2026',
    links: [{ label: 'repo', href: 'https://github.com/WilliamJin123/KAN_picbreedr' }],
    bullets: [
      {
        id: 'kan',
        text: 'Implemented from scratch a vectorized B-spline **Kolmogorov-Arnold Network** layer in **PyTorch** (de Boor recursion, spline degrees 1-4, autograd-safe), verified against **SciPy** as a partition of unity',
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
        text: 'Built **VolleyClip**, a full-stack app (**Next.js** + **FastAPI**) that turns a volleyball VOD into per-play clips of a chosen player from a natural-language query',
        tags: ['fullstack', 'ai'],
      },
      {
        id: 'ai',
        text: 'Used the **Twelve Labs** video-AI API (Marengo, Pegasus) with schema-constrained prompts to extract exact start/end timestamps for the queried plays',
        tags: ['ai', 'video'],
      },
      {
        id: 'ffmpeg',
        text: 'Engineered an **FFmpeg** pipeline that stream-copies clips straight from **Cloudflare R2** presigned URLs for near-instant lossless cuts, auto-generating thumbnails',
        tags: ['video', 'backend'],
      },
      {
        id: 'infra',
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
    awards: ['Best Use of Gemini API'],
    dateLabel: 'Jan 2026',
    links: [
      { label: 'devpost', href: 'https://devpost.com/software/stitch-30p6ly' },
      { label: 'repo', href: 'https://github.com/Phalanyx/stitch' },
    ],
    bullets: [
      {
        id: 'agent',
        text: 'Built an agentic AI video editor where a **Gemini** agent edits a live timeline from natural language through **14** custom video and audio tools',
        tags: ['ai', 'agents'],
      },
      {
        id: 'search',
        text: 'Integrated **Twelve Labs** semantic search so the agent locates the exact clip segment matching a natural-language query and drops it on the timeline',
        tags: ['ai', 'video'],
      },
      {
        id: 'veo',
        text: 'Created a **Veo 3.1** transition tool that frame-interpolates between the boundary frames of two adjacent clips for a seamless cut',
        tags: ['ai', 'video'],
      },
      {
        id: 'tts',
        text: 'Generated AI voiceover with **ElevenLabs** TTS, fitting each clip to a target duration via **FFmpeg** time-stretching',
        tags: ['ai', 'audio'],
      },
      {
        id: 'ui',
        text: 'Built a custom **React 19** timeline editor where AI and manual edits share a single undo/redo history',
        tags: ['frontend', 'react'],
      },
    ],
  },
  {
    id: 'rlm-plus-plus',
    section: 'projects',
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
    grants: ['Solana Foundation Grant'],
    dateLabel: 'Oct 2025 - Nov 2025',
    links: [{ label: 'repo', href: 'https://github.com/The-SolShare-Team' }],
    bullets: [
      {
        id: 'sdk',
        text: "Developed Solana's first official native **Swift SDK** enabling **iOS** apps to integrate multi-wallet functionality for leading wallet providers: Phantom, Backpack, and Solflare",
        tags: ['swift', 'sdk'],
      },
      {
        id: 'crypto',
        text: 'Built the wallet connect and signing flow as an **x25519 + XSalsa20-Poly1305** encrypted deeplink handshake (**TweetNacl**) with per-session shared secrets',
        tags: ['swift', 'crypto'],
      },
      {
        id: 'arch',
        text: "Architected a protocol-oriented wallet layer so new wallets plug in via conformance, polyfilling Phantom's deprecated sign-and-send over the **RPC** client",
        tags: ['swift', 'architecture'],
      },
      {
        id: 'ship',
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
        text: 'Developed a bill-splitting **iOS** application that automates receipt parsing and payment processing',
        tags: ['ios', 'swift'],
      },
      {
        id: 'cohere',
        text: "Extracted receipt data using Cohere's vision and reasoning models through a **self-critic** workflow",
        tags: ['ai', 'llm'],
      },
      {
        id: 'backend',
        text: 'Built the backend using **Firebase Cloud Functions** and **Firestore** and the frontend using **SwiftUI**',
        tags: ['firebase', 'swiftui'],
      },
    ],
  },
  {
    id: 'email-llm',
    section: 'projects',
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
    location: 'Waterloo, Ontario',
    role: 'Bachelor of Software Engineering',
    dateLabel: 'Sept 2024 - May 2029',
    bullets: [
      { id: 'gpa', text: 'GPA: 3.90/4.00' },
      {
        id: 'courses',
        text: 'Relevant Coursework: Intro to Data Abstraction and Implementation, Statistics, Foundations of Sequential Programs, Digital Computers',
      },
    ],
  },
];

export const entries = authored.sort(byDateDesc);
