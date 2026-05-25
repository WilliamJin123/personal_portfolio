import type { Token } from './types';

const ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

// Single pass: each special char maps to its escape once. Replacement text
// is not re-scanned, so the braces in \textbackslash{} are safe.
export function escapeLatex(s: string): string {
  return s.replace(/[\\&%$#_{}~^]/g, (c) => ESCAPES[c]);
}

export function tokensToLatex(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.type === 'text') return escapeLatex(t.value);
      if (t.type === 'bold') return `\\textbf{${escapeLatex(t.value)}}`;
      return `\\href{${t.href}}{${escapeLatex(t.label)}}`; // URL left raw (v1)
    })
    .join('');
}
