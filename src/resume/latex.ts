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

// Escape a URL for use as hyperref's \href target. \href reads its target as a
// normal LaTeX argument, so specials that legitimately appear in URLs — most
// commonly _ # % & (e.g. github.com/foo_bar, ?a=1&b=2, #frag) — must be escaped
// or the pdflatex build fails. The \x forms hyperref expects (\_ \# \% \&) come
// straight from escapeLatex. The validator flags the rarer \ ~ ^ chars, which
// effectively never occur in résumé URLs and don't round-trip as cleanly.
export function escapeLatexUrl(href: string): string {
  return escapeLatex(href);
}

export function tokensToLatex(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.type === 'text') return escapeLatex(t.value);
      if (t.type === 'bold') return `\\textbf{${escapeLatex(t.value)}}`;
      return `\\reslink{${escapeLatexUrl(t.href)}}{${escapeLatex(t.label)}}`;
    })
    .join('');
}
