// Portfolio presentation layer for the public work browser — NOT résumé content.
// The résumé library (src/resume) stays text-only (it feeds .tex); images and
// tech-stack icons live here, keyed by entry id. `stack` values are simple-icons
// slugs (https://simpleicons.org); `images` are paths under /public.
export interface PortfolioMedia {
  // A stack item is either a simple-icons slug (label = slug) or, for tech the
  // icon set doesn't carry, an explicit { label, icon } — where icon is a slug
  // or a "/public" path (or omitted for a label-only chip).
  stack?: (string | { label: string; icon?: string })[];
  images?: string[];
  footnotes?: string[];
  // Site-only curation: omit this entry from the public "selected work" browser.
  // The entry still lives in the résumé library/pool — this only trims the site.
  hidden?: boolean;
}

export const portfolioMedia: Record<string, PortfolioMedia> = {
  // experience
  csc: { stack: ['python', 'typescript', 'microsoftazure', 'openai', 'docker'], images: [] },
  ualberta: { stack: ['python', 'selenium', 'microsoftsqlserver'], images: [] },
  jindon: { stack: ['openjdk', 'oracle', { label: 'Cúram', icon: 'ibm' }], images: [] },
  weaccel: { stack: ['microsoftazure', 'python'], images: [] },
  // projects
  solshare: { stack: ['swift', 'firebase'], images: [] },
  stitch: {
    stack: [
      { label: 'Next.js', icon: 'nextdotjs' },
      'react',
      'typescript',
      { label: 'Gemini', icon: 'googlegemini' },
      { label: 'Twelve Labs', icon: '/icons/twelvelabs.png' },
      { label: 'ElevenLabs', icon: 'elevenlabs' },
      'supabase',
    ],
    images: [],
  },
  volleyclip: {
    stack: [
      { label: 'Next.js', icon: 'nextdotjs' },
      'typescript',
      'tailwindcss',
      'python',
      'fastapi',
      { label: 'Twelve Labs', icon: '/icons/twelvelabs.png' },
      'ffmpeg',
      { label: 'Cloudflare R2', icon: 'cloudflare' },
      'supabase',
      'docker',
      'vercel',
    ],
    images: [],
  },
  tract: {
    stack: ['python', { label: 'Anthropic', icon: 'anthropic' }, 'pydantic', 'sqlalchemy', 'sqlite', 'pytest'],
    images: [],
  },
  'rlm-plus-plus': {
    stack: [
      'python',
      { label: 'Agno', icon: '/icons/agno.svg' },
      { label: 'Gemini', icon: 'googlegemini' },
      { label: 'Cerebras', icon: '/icons/cerebras.svg' },
      { label: 'OpenRouter', icon: 'openrouter' },
      { label: 'Anthropic', icon: 'anthropic' },
      'sqlite',
    ],
    images: [],
  },
  'kan-cppn': {
    stack: ['pytorch', 'numpy', 'scipy', 'pytest'],
    images: [],
  },
  'swarm-rag': {
    stack: ['pytorch', 'numpy', 'openai', { label: 'Gemini', icon: 'googlegemini' }, { label: 'Cohere', icon: '/icons/cohere.svg' }],
    images: [],
  },
  'solana-sdk': { stack: ['swift', 'solana'], images: [] },
  'graphrag-agent': {
    stack: [
      'python',
      { label: 'FalkorDB', icon: '/icons/falkordb.svg' },
      { label: 'Agno', icon: '/icons/agno.svg' },
      { label: 'Cerebras', icon: '/icons/cerebras.svg' },
      { label: 'Cohere', icon: '/icons/cohere.svg' },
      'docker',
    ],
    images: [],
  },
  'email-llm': { stack: [{ label: 'Unsloth', icon: '/icons/unsloth.svg' }, 'pytorch', 'huggingface', 'pandas', 'numpy'], images: [], hidden: true },
};
