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
      'PyTorch', 'NumPy', 'Pandas', 'scikit-learn', 'SciPy', 'HuggingFace', 'Unsloth',
      'LangChain', 'LangSmith', 'Agno',
      'LLM APIs (Anthropic, OpenAI, Gemini, Cohere, Cerebras, etc.)',
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
    items: ['React', 'Next.js', 'SwiftUI', 'Tailwind', 'Node.js', 'Express.js', 'PostgreSQL', 'Supabase', 'MongoDB'],
  },
  {
    category: 'Cloud & Tools',
    items: ['Azure', 'GCP', 'Cloudflare', 'Vercel', 'Docker', 'Git', 'Linux', 'OpenTelemetry'],
  },
];
