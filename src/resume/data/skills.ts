import type { SkillGroup } from '../types';

// Mirrors the live site's stack drum (src/pages/index.astro), curated to a
// résumé-appropriate subset — the site is exhaustive + icon-driven; here we keep
// the recognizable, project-backed tools. Not a shared source of truth (the site
// carries per-chip icon URLs in template markup); keep the two in rough sync by hand.
//
// Line budget (William, 2026-07-17): every row must render as ONE line in the
// classic variant, EXCEPT AI/ML, which deliberately runs two full lines — it
// leads the section and carries the brand. Test any change against both PDFs.
//
// Concepts row (2026-07-17, from the AngelinaWang_Bitgo comparison): concept
// keywords JDs search for that a pure-tools section never matches — and the
// only place "RAG" survives on the résumé since the CSC bullet now says "AI
// chatbot". Every item must stay bullet-evidenced: RAG/Semantic Search (CSC,
// Stitch), AI Agents (Stitch, Agno), Evals & Observability (LangSmith,
// OpenTelemetry, CSC feedback loop), Fine-Tuning (Unsloth), REST APIs/OOP
// (Node/Express, Java/Swift). CI/CD, Agile, Distributed Systems held out —
// no bullet evidence; add only with William's say-so.
//
// Off the résumé (carousel-only): Astro, Three.js, GSAP, Prisma, MySQL, SQLite,
// Firebase, smolagents, Jupyter, Selenium, FFmpeg, and AWS (swapped out for
// GCP/Cloudflare/Vercel — William, 2026-07-17: no bullet evidences AWS).
// FastAPI dropped + Express → Express.js: the Full Stack row must fit its line;
// re-add FastAPI per JD.
export const skills: SkillGroup[] = [
  {
    // First row: AI leads — the carousel gives it two of seven slides
    // (04 ML/Data + 05 LLMs/Agents), merged into one two-line row here.
    category: 'AI/ML',
    items: [
      // scikit-learn + SciPy off (William, 2026-07-17: not confident enough
      // to defend them in an interview) — re-add per JD only if he says so.
      // Order (adversarial pass 2026-07-18): differentiators lead — row
      // starts get read; NumPy/Pandas are table stakes, so they sit last
      // before the APIs item. "Hugging Face" is the company's own spelling
      // (two words) — an ATS matching a JD's "Hugging Face" never matched
      // the one-word form. "etc." cut from the parenthetical: hand-waving
      // that no matcher rewards.
      'PyTorch', 'Hugging Face', 'Unsloth', 'LangChain', 'LangSmith',
      'Agno', 'NumPy', 'Pandas',
      'LLM APIs (Anthropic Claude, OpenAI, Gemini, Cohere, Cerebras)',
    ],
  },
  {
    category: 'Languages',
    items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'Swift', 'C++', 'SQL'],
  },
  {
    // Frontend + Backend merged into one row — five rows ate too much vertical
    // space on the one-pager and both lines ran short.
    category: 'Full Stack',
    // Supabase came off the row to make room for "Tailwind CSS" (the page's
    // only verbatim "CSS") — it survives verbatim in the Stitch bullet.
    // MySQL (carousel-backed, on Angelina's skills too) joined once
    // plain-weight tags freed the width; Firebase tried and wrapped the line.
    // Order (2026-07-18): web UI -> mobile UI -> server -> data; Tailwind
    // used to sit after SwiftUI, splitting the web cluster mid-row.
    items: ['React', 'Next.js', 'Tailwind CSS', 'SwiftUI', 'Node.js', 'Express.js', 'PostgreSQL', 'MySQL', 'MongoDB'],
  },
  {
    category: 'Cloud & Tools',
    // Claude Code: not carousel-backed but real — daily driver for this repo,
    // and tract ships a ClaudeCodeClient LLM backend (verified 2026-07-17).
    // It stays HERE, not AI/ML (adversarial pass 2026-07-18): the AI/ML row
    // is libraries you build AI with; Claude Code is a tool you build with,
    // so it sits in the dev-tools cluster (Git, Linux, Claude Code).
    // OpenTelemetry likewise belongs in this row (observability tooling is
    // infra, not an AI library or a concept) but moved beside Docker —
    // platforms (Azure..Vercel) -> runtime infra (Docker, OTel) -> dev tools.
    // GCP: flagged 2026-07-18 — no audited project shows GCP infra (Gemini
    // API calls aren't GCP); kept pending William's own evidence.
    items: ['Azure', 'GCP', 'Cloudflare', 'Vercel', 'Docker', 'OpenTelemetry', 'Git', 'Linux', 'Claude Code'],
  },
  {
    category: 'Concepts',
    items: [
      // "Machine Learning" replaced "Semantic Search" (2026-07-17): the row
      // was the only verbatim "Machine Learning" on the page, while semantic
      // search survives in the Stitch bullet — dumb matchers don't expand
      // "AI/ML". OOP paid for the extra char (the row is edge-to-edge; OOP
      // was the weakest keyword — JDs mostly spell out "object-oriented").
      // "GenAI" not "GenAI/LLMs": the LLM token already lives in the AI/ML
      // row, and the slash form wrapped the line.
      'GenAI', 'RAG', 'AI Agents', 'Machine Learning',
      'LLM Evals & Observability', 'Fine-Tuning', 'REST APIs',
    ],
  },
];
