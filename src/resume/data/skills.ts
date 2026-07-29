import type { SkillGroup } from '../types';

// Mirrors the live site's stack drum (src/pages/index.astro), curated to a
// résumé-appropriate subset — the site is exhaustive + icon-driven; here we keep
// the recognizable, project-backed tools. Not a shared source of truth (the site
// carries per-chip icon URLs in template markup); keep the two in rough sync by hand.
//
// Line budget (William, 2026-07-17): rows should render as ONE line in the
// classic variant. AI/ML used to be the deliberate two-line exception; since
// the "LLM APIs (...)" item came off (below) it fits one line like the rest.
// Concepts is now the exception and stays one — it carries nine JD keywords
// and wraps to a second line, which is fine where it sits (last row, page has
// room, the wrap breaks cleanly between items rather than orphaning one).
// Test any change against both PDFs.
//
// Concepts row (2026-07-17, from the AngelinaWang_Bitgo comparison): concept
// keywords JDs search for that a pure-tools section never matches — and the
// only place "RAG" survives on the résumé since the CSC bullet now says "AI
// chatbot". Every item must stay bullet-evidenced.
//
// Rebalanced 2026-07-26 (external review: "concepts should be more broad &
// tailored to job description keywords"). The row had drifted specialist —
// "LLM Evals & Observability" and "Fine-Tuning" are things a JD names only if
// it is already an LLM-infra posting, and he is applying to general SWE roles.
// Traded both for the terms ordinary SWE postings actually spell out, each
// still bullet-evidenced: Backend Development (Jindon Java/Oracle, UAlberta SQL
// Server, SolShare Firebase), Full-Stack Development (Stitch, VolleyClip),
// Data Structures & Algorithms (CS 240 on the Education line), Object-Oriented
// Programming (Java/Swift/C++). The AI concepts that ARE his differentiator
// (RAG, AI Agents, GenAI) stay. CI/CD, Agile, Distributed Systems still held
// out — no bullet evidence; add only with William's say-so.
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
      // "LLM APIs (Anthropic Claude, OpenAI, Gemini, Cohere, Cerebras)" removed
      // 2026-07-26 (external review). It was the single longest item on the
      // page and cost the row an entire second line, and "LLM APIs" is not a
      // skill — calling a hosted endpoint is not a competency a screener
      // credits. The provider names it carried are not lost: Gemini survives in
      // the Stitch bullet and Cohere in SolShare's, where they are attached to
      // something he actually built.
      'PyTorch', 'Hugging Face', 'Unsloth', 'LangChain', 'LangSmith',
      'Agno', 'NumPy', 'Pandas',
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
    // only verbatim "CSS"); it is back as of 2026-07-26, on the width the
    // shorter comma separator freed. It is bullet-evidenced twice (Stitch,
    // Hiya) and is a name reviewers recognize on sight.
    // MySQL (carousel-backed, on Angelina's skills too) joined once
    // plain-weight tags freed the width; Firebase tried and wrapped the line.
    // Order (2026-07-18): web UI -> mobile UI -> server -> data; Tailwind
    // used to sit after SwiftUI, splitting the web cluster mid-row.
    items: ['React', 'Next.js', 'Tailwind CSS', 'SwiftUI', 'Node.js', 'Express.js', 'PostgreSQL', 'MySQL', 'Supabase'],
  },
  {
    category: 'Cloud & Tools',
    // Claude Code removed 2026-07-26 (external review). It is genuinely his
    // daily driver and tract ships a ClaudeCodeClient backend, but listing an
    // AI coding assistant as a skill reads to a screener as a claim that using
    // one is an achievement, and at some shops it reads worse than that. The
    // work it produced is on the page; the tool does not need to be.
    // OpenTelemetry belongs in this row (observability tooling is infra, not an
    // AI library or a concept), beside Docker — platforms (Azure..Vercel) ->
    // runtime infra (Docker, OTel) -> dev tools.
    // GCP: flagged 2026-07-18 — no audited project shows GCP infra (Gemini
    // API calls aren't GCP); kept pending William's own evidence.
    items: ['Azure', 'GCP', 'Cloudflare', 'Vercel', 'Docker', 'OpenTelemetry', 'Git', 'Linux'],
  },
  {
    category: 'Concepts',
    items: [
      // Order: the broad terms a general SWE posting screens on lead, the AI
      // specialization follows. "Machine Learning" is the row's only verbatim
      // "Machine Learning" on the page — dumb matchers don't expand "AI/ML".
      // "Object-Oriented Programming" spelled out, not "OOP": JDs write it long
      // and a literal matcher never expands the acronym (the earlier row used
      // OOP only because it was edge-to-edge on width).
      // "GenAI" not "GenAI/LLMs": the LLM token already lives in the AI/ML
      // row, and the slash form wrapped the line.
      // "Software Development" cut on width: it is the one term on the row that
      // the rest of the page already proves twice over, so it was the cheapest
      // line to buy back.
      'Backend Development', 'Full-Stack Development',
      'Data Structures & Algorithms', 'Object-Oriented Programming',
      'REST APIs', 'Machine Learning', 'GenAI', 'RAG', 'AI Agents',
    ],
  },
];
