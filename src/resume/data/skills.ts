import type { SkillGroup } from '../types';

// Mirrors the live site's stack drum (src/pages/index.astro), curated to a
// résumé-appropriate subset — the site is exhaustive + icon-driven; here we keep
// the recognizable, project-backed tools. Not a shared source of truth (the site
// carries per-chip icon URLs in template markup); keep the two in rough sync by hand.
export const skills: SkillGroup[] = [
  {
    category: 'Languages',
    items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'Swift', 'C++', 'SQL'],
  },
  {
    category: 'Frontend',
    items: ['React', 'Next.js', 'SwiftUI', 'Tailwind', 'Astro', 'Three.js'],
  },
  {
    category: 'Backend',
    items: ['Node', 'Express', 'FastAPI', 'PostgreSQL', 'SQLite', 'Supabase', 'Firebase', 'MongoDB'],
  },
  {
    category: 'AI / ML',
    items: [
      'PyTorch', 'Hugging Face', 'Pandas',
      'OpenAI', 'Anthropic', 'Gemini', 'Cohere', 'Cerebras', 'LangChain',
    ],
  },
  {
    category: 'Cloud / Tools',
    items: ['AWS', 'Azure', 'GCP', 'Cloudflare', 'Docker', 'Vercel', 'Git', 'Linux', 'FFmpeg', 'Selenium'],
  },
];
