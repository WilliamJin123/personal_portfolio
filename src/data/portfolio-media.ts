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
}

export const portfolioMedia: Record<string, PortfolioMedia> = {
  // experience
  csc: { stack: ['python', 'typescript', 'microsoftazure', 'openai'], images: [] },
  ualberta: { stack: ['python', 'selenium', 'microsoftsqlserver'], images: [] },
  jindon: { stack: ['openjdk', 'oracle', { label: 'Cúram', icon: 'ibm' }], images: [] },
  weaccel: { stack: ['microsoftazure', 'python'], images: [] },
  // projects
  solshare: { stack: ['swift', 'firebase'], images: [] },
  'swarm-rag': {
    stack: ['pytorch', 'numpy', 'openai', { label: 'Gemini', icon: 'googlegemini' }, { label: 'Cohere', icon: '/icons/cohere.svg' }],
    images: [],
  },
  'solana-sdk': { stack: ['swift', 'solana'], images: [] },
  'graphrag-agent': {
    stack: ['python', { label: 'FalkorDB' }, { label: 'Agno' }, { label: 'Cerebras' }, { label: 'Cohere' }],
    images: [],
  },
  'email-llm': { stack: ['pytorch', 'huggingface', 'pandas', 'numpy'], images: [] },
};
