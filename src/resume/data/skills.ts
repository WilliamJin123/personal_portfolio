import type { SkillGroup } from '../types';

// Mirrors the live site's stack drum (src/pages/index.astro), curated to a
// résumé-appropriate subset — the site is exhaustive + icon-driven; here we keep
// the recognizable, project-backed tools. Not a shared source of truth (the site
// carries per-chip icon URLs in template markup); keep the two in rough sync by hand.
//
// Trimmed (ATS review, July 2026): Astro, Three.js, SQLite, Firebase, Cerebras,
// GCP, Cloudflare, Vercel. Re-add an item only if a target job description asks
// for it AND you can defend it in an interview — AWS in particular: keep only if
// defensible, since no bullet currently evidences it.
export const skills: SkillGroup[] = [
  {
    category: 'Languages',
    items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'Swift', 'C++', 'SQL'],
  },
  {
    // Frontend + Backend merged into one row — five rows ate too much vertical
    // space on the one-pager and both lines ran short.
    category: 'Full Stack',
    items: ['React', 'Next.js', 'SwiftUI', 'Tailwind', 'Node.js', 'Express', 'FastAPI', 'PostgreSQL', 'Supabase', 'MongoDB'],
  },
  {
    category: 'AI/ML',
    items: [
      'PyTorch', 'Hugging Face', 'Pandas', 'LangChain',
      'LLM APIs (Anthropic, OpenAI, Gemini, Cohere)',
    ],
  },
  {
    category: 'Cloud & Tools',
    items: ['Azure', 'AWS', 'Docker', 'Git', 'Linux', 'Selenium', 'FFmpeg'],
  },
];
