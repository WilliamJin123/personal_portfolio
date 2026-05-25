import type { Token } from './types';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

// HTML-escape for text and attribute contexts. Mirrors latex.ts's escapeLatex.
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

// Mirror of tokensToLatex: same Token[], HTML output.
// href is HTML-escaped (attribute context) rather than left raw — the LaTeX
// renderer leaves URLs raw, but HTML attributes require escaping & < > ".
export function tokensToHtml(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.type === 'text') return escapeHtml(t.value);
      if (t.type === 'bold') return `<span class="rbold">${escapeHtml(t.value)}</span>`;
      return `<a class="rlink" href="${escapeHtml(t.href)}" target="_blank" rel="noreferrer">${escapeHtml(t.label)}</a>`;
    })
    .join('');
}
