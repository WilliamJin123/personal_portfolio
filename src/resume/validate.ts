import type { ResumeLibrary, Selection } from './types';
import { tokenize } from './tokenize';
import { dateSortKey } from './data/order';

// Runtime validation for the résumé library and selections.
//
// TypeScript guarantees the *shape* of the data (required fields, unions like
// `section`), but it cannot express the invariants that actually break the
// generated résumé: id uniqueness (duplicate ids silently drop content, because
// generate.ts builds id->entry Maps), resolvable Selection references (dangling
// refs are silently filtered out), non-empty bullet lists (an empty list emits
// broken LaTeX), parseable date labels, well-formed inline markdown, and link
// URLs we can actually escape for pdflatex. This is the single gate both the
// build script and the future builder UI run before trusting the data.

const SECTIONS = new Set(['experience', 'projects', 'education']);
const URL_OK = /^(https?:|mailto:)/i;
// Chars valid in a URL that escapeLatexUrl does not round-trip cleanly into an
// \href target (it emits \textbackslash{} / \textasciitilde{} / \textasciicircum{},
// which don't reliably reproduce the literal char). They effectively never appear
// in résumé URLs; flag rather than silently mangle.
const URL_RISKY = /[\\~^]/;

export type IssueLevel = 'error' | 'warn';

export interface ValidationIssue {
  level: IssueLevel;
  path: string; // where the problem is, e.g. "entries[2].bullets[0]"
  message: string;
}

function checkHref(href: string, path: string, out: ValidationIssue[]): void {
  const h = href?.trim() ?? '';
  if (!h) {
    out.push({ level: 'error', path, message: 'empty URL' });
    return;
  }
  if (!URL_OK.test(h)) {
    out.push({ level: 'error', path, message: `unsupported URL scheme (expected http(s)/mailto): ${href}` });
  }
  if (URL_RISKY.test(h)) {
    out.push({ level: 'warn', path, message: `URL contains \\, ~ or ^ which may not render in the PDF; percent-encode it: ${href}` });
  }
}

// Inline markdown is **bold** and [label](href); anything else is literal text.
// After tokenizing, leftover "**" or "](" in the text spans signals an unclosed
// bold or a malformed link the author almost certainly didn't intend.
function checkMarkdown(text: string, path: string, out: ValidationIssue[]): void {
  const tokens = tokenize(text);
  const literal = tokens.filter((t) => t.type === 'text').map((t) => t.value).join('');
  if (literal.includes('**')) {
    out.push({ level: 'warn', path, message: 'unbalanced "**" — bold left unclosed?' });
  }
  if (literal.includes('](')) {
    out.push({ level: 'warn', path, message: 'stray "](" — malformed [label](href) link?' });
  }
  for (const t of tokens) {
    if (t.type === 'link') checkHref(t.href, `${path} link`, out);
  }
}

export function validateLibrary(lib: ResumeLibrary): ValidationIssue[] {
  const out: ValidationIssue[] = [];

  if (!lib.profile.name?.trim()) {
    out.push({ level: 'error', path: 'profile.name', message: 'name is required' });
  }
  lib.profile.links.forEach((l, i) => {
    checkHref(l.href, `profile.links[${i}]`, out);
    if (!l.label?.trim()) out.push({ level: 'warn', path: `profile.links[${i}]`, message: 'empty link label' });
  });

  lib.skills.forEach((g, i) => {
    if (!g.category?.trim()) out.push({ level: 'error', path: `skills[${i}]`, message: 'skill group needs a category' });
    if (g.items.length === 0) out.push({ level: 'warn', path: `skills[${i}]`, message: `skill group "${g.category}" has no items` });
  });

  if (lib.entries.length === 0) {
    out.push({ level: 'warn', path: 'entries', message: 'library has no entries' });
  }

  const seenEntryIds = new Set<string>();
  lib.entries.forEach((e, i) => {
    const at = `entries[${i}]`;
    if (!e.id?.trim()) {
      out.push({ level: 'error', path: at, message: 'entry id is required' });
    } else if (seenEntryIds.has(e.id)) {
      out.push({ level: 'error', path: at, message: `duplicate entry id "${e.id}" — one entry will be silently dropped` });
    } else {
      seenEntryIds.add(e.id);
    }

    if (!SECTIONS.has(e.section)) {
      out.push({ level: 'error', path: `${at}.section`, message: `invalid section "${e.section}"` });
    }
    if (!e.title?.trim()) out.push({ level: 'error', path: `${at}.title`, message: 'title is required' });
    if (!e.dateLabel?.trim()) {
      out.push({ level: 'error', path: `${at}.dateLabel`, message: 'dateLabel is required' });
    } else if (dateSortKey(e.dateLabel) === -Infinity) {
      out.push({ level: 'warn', path: `${at}.dateLabel`, message: `unparseable dateLabel "${e.dateLabel}" — entry will sort last` });
    }

    (e.links ?? []).forEach((l, li) => {
      checkHref(l.href, `${at}.links[${li}]`, out);
      if (!l.label?.trim()) out.push({ level: 'warn', path: `${at}.links[${li}]`, message: 'empty link label' });
    });

    const included = e.include !== false;
    if (included && e.bullets.length === 0) {
      out.push({ level: 'error', path: `${at}.bullets`, message: 'an included entry needs at least one bullet (empty list breaks the LaTeX list)' });
    }
    const seenBulletIds = new Set<string>();
    e.bullets.forEach((b, bi) => {
      const bat = `${at}.bullets[${bi}]`;
      if (!b.id?.trim()) {
        out.push({ level: 'error', path: bat, message: 'bullet id is required' });
      } else if (seenBulletIds.has(b.id)) {
        out.push({ level: 'error', path: bat, message: `duplicate bullet id "${b.id}" in entry "${e.id}"` });
      } else {
        seenBulletIds.add(b.id);
      }
      if (!b.text?.trim()) out.push({ level: 'error', path: bat, message: 'bullet text is empty' });
      else checkMarkdown(b.text, bat, out);
    });
  });

  return out;
}

export function validateSelection(lib: ResumeLibrary, sel: Selection): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const entryById = new Map(lib.entries.map((e) => [e.id, e]));

  const seen = new Set<string>();
  sel.entryIds.forEach((id, i) => {
    if (seen.has(id)) out.push({ level: 'error', path: `selection.entryIds[${i}]`, message: `duplicate entry id "${id}"` });
    seen.add(id);
    if (!entryById.has(id)) out.push({ level: 'error', path: `selection.entryIds[${i}]`, message: `references unknown entry "${id}"` });
  });

  for (const [entryId, bulletIds] of Object.entries(sel.bulletIds)) {
    const entry = entryById.get(entryId);
    if (!entry) {
      out.push({ level: 'error', path: `selection.bulletIds["${entryId}"]`, message: `references unknown entry "${entryId}"` });
      continue;
    }
    const bulletIdSet = new Set(entry.bullets.map((b) => b.id));
    bulletIds.forEach((bid, i) => {
      if (!bulletIdSet.has(bid)) {
        out.push({ level: 'error', path: `selection.bulletIds["${entryId}"][${i}]`, message: `references unknown bullet "${bid}" in entry "${entryId}"` });
      }
    });
  }

  return out;
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((i) => `  [${i.level}] ${i.path}: ${i.message}`).join('\n');
}

// Throw on any error-level issue. Returns the warn-level issues so the caller
// can surface them without failing. `entry` is optional so the library can be
// validated on its own (e.g. before a selection exists).
export function assertValid(lib: ResumeLibrary, sel?: Selection): ValidationIssue[] {
  const issues = [...validateLibrary(lib), ...(sel ? validateSelection(lib, sel) : [])];
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    throw new Error(`Résumé validation failed with ${errors.length} error(s):\n${formatIssues(errors)}`);
  }
  return issues.filter((i) => i.level === 'warn');
}
