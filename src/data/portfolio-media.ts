// Portfolio presentation layer for the public work browser — NOT résumé content.
// The résumé library (src/resume) stays text-only (it feeds .tex); images and
// tech-stack icons live here, keyed by entry id. `stack` values are simple-icons
// slugs (https://simpleicons.org); `images` are paths under /public.
export interface PortfolioMedia {
  stack?: string[];
  images?: string[];
  footnotes?: string[];
}

export const portfolioMedia: Record<string, PortfolioMedia> = {
  // experience
  ualberta: { stack: ['python', 'selenium', 'microsoftsqlserver'], images: [] },
  jindon: { stack: ['openjdk', 'oracle'], images: [] },
  weaccel: { stack: ['microsoftazure', 'python'], images: [] },
  // projects
  solshare: { stack: ['swift', 'firebase'], images: [] },
  'solana-sdk': { stack: ['swift', 'solana'], images: [] },
  'email-llm': { stack: ['pytorch', 'huggingface', 'pandas', 'numpy'], images: [] },
};
