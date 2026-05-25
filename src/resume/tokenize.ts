import type { Token } from './types';

// Matches **bold** OR [label](href). Anything unmatched is literal text.
const PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ type: 'text', value: text.slice(last, idx) });
    if (m[1] !== undefined) {
      tokens.push({ type: 'bold', value: m[1] });
    } else {
      tokens.push({ type: 'link', label: m[2], href: m[3] });
    }
    last = idx + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}
