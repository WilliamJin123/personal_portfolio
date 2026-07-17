import type {
  ResumeLibrary,
  ResumeEntry,
  ResumeBullet,
  Selection,
  Profile,
  SkillGroup,
} from './types';
import { tokenize } from './tokenize';
import { tokensToLatex, escapeLatex, escapeLatexUrl } from './latex';

const BODY_MARKER = '%%RESUME_BODY%%';

// Two layouts share one generator. 'modern' is the current dense one-pager
// (shell.tex); 'classic' is the W25/cycle-3 design (shell-classic.tex) — the
// two coexist, and `npm run resume` emits both. Each variant's body targets
// the \resume* macros of its own shell.
export type ResumeVariant = 'modern' | 'classic';

export function defaultSelection(lib: ResumeLibrary): Selection {
  const entries = lib.entries.filter((e) => e.include !== false);
  return {
    entryIds: entries.map((e) => e.id),
    bulletIds: Object.fromEntries(
      entries.map((e) => [e.id, e.bullets.filter((b) => b.default !== false).map((b) => b.id)]),
    ),
  };
}

function items(entry: ResumeEntry, ids: string[]): string {
  const byId = new Map(entry.bullets.map((b) => [b.id, b]));
  const lines = ids
    .map((id) => byId.get(id))
    .filter((b): b is ResumeBullet => Boolean(b))
    .map((b) => `        \\item ${tokensToLatex(tokenize(b.text))}`)
    .join('\n');
  return `      \\resumeItemListStart\n${lines}\n      \\resumeItemListEnd`;
}

function subheading(e: ResumeEntry, ids: string[]): string {
  // Location travels in the right-hand cell with the date ("Ottawa, ON (Remote)
  // | Jan 2026 - May 2026") so every entry carries a visible, ATS-parseable
  // location without adding a second heading line.
  const when = [e.location, e.dateLabel].filter(Boolean).join(' | ');
  return [
    '  \\resumeSubheading',
    `      {${escapeLatex(e.title)}}`,
    '      {}',
    `      {${escapeLatex(e.role ?? '')}}{${escapeLatex(when)}}`,
    items(e, ids),
  ].join('\n');
}

function project(e: ResumeEntry, ids: string[]): string {
  const links = e.links ?? [];
  const repo = links.find((l) => /github\.com/i.test(l.href));
  const showcase = links.find((l) => !/github\.com/i.test(l.href)); // devpost / live demo / paper
  const extras = links.filter((l) => l !== repo && l !== showcase);

  // Title -> the GitHub repo when there is one (consistent across every project),
  // else its first link, else plain. The underline is the only link affordance.
  const titleHref = repo?.href ?? links[0]?.href;
  const title = titleHref
    ? `\\textbf{\\reslink{${escapeLatexUrl(titleHref)}}{${escapeLatex(e.title)}}}`
    : `\\textbf{${escapeLatex(e.title)}}`;

  // Event/context sits inline after the title. A real event name (a hackathon)
  // links to its Devpost/showcase; a generic label ("Personal Project") stays
  // plain text and the showcase, if any, trails as a small labelled link instead.
  const generic = /personal project|research project/i.test(e.subtitle ?? '');
  const context = e.subtitle
    ? showcase && !generic
      ? `\\reslink{${escapeLatexUrl(showcase.href)}}{${escapeLatex(e.subtitle)}}`
      : escapeLatex(e.subtitle)
    : '';
  const trailing = [...(showcase && (generic || !e.subtitle) ? [showcase] : []), ...extras].map(
    (l) => `\\weblink{${escapeLatexUrl(l.href)}}{${escapeLatex(l.label)}}`,
  );
  const left = [title, context ? `| ${context}` : '', trailing.join(' ')]
    .filter(Boolean)
    .join(' ');

  // Awards/grants are plain text (icons extract as ATS garbage), rendered as one
  // consistent italic sub-line under the heading for every project that has any.
  // The leading \\ lives here so a badge-less project is a single row.
  const badges = [...(e.awards ?? []), ...(e.grants ?? [])];
  const badgeRow = badges.length
    ? `\\\\ \\multicolumn{2}{@{}p{0.97\\textwidth}@{}}{\\small\\textit{${badges
        .map((b) => escapeLatex(b))
        .join('; ')}}}`
    : '';

  return [
    '  \\resumeProject',
    `  {${left}}`,
    `  {${escapeLatex(e.dateLabel)}}`,
    `  {${badgeRow}}`,
    items(e, ids),
  ].join('\n');
}

// Classic link labels read as proper sources ("Devpost · GitHub"), not the
// modern shell's lowercase artifact labels ("devpost", "repo") — named for
// where the link goes, derived from the domain so entries.ts stays shared.
function sourceName(l: { label: string; href: string }): string {
  if (/github\.com/i.test(l.href)) return 'GitHub';
  if (/devpost\.com/i.test(l.href)) return 'Devpost';
  return l.label.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

// Classic project heading: bold \large name, links as small dot-separated
// source names (where the old design put its external-link icon; dark blue is
// the affordance), and one italic context row underneath carrying awards/
// grants and the event — the W25 résumé's "1st for Cohere API best use … at
// Hack the North" line, composed from structured fields as "awards (event)".
function projectClassic(e: ResumeEntry, ids: string[]): string {
  const trailing = (e.links ?? [])
    .map((l) => `\\reslink{${escapeLatexUrl(l.href)}}{${escapeLatex(sourceName(l))}}`)
    .join(' · ');
  const title = [`\\textbf{\\large ${escapeLatex(e.title)}}`, trailing ? `{\\footnotesize ${trailing}}` : '']
    .filter(Boolean)
    .join('\\hspace{4pt}');

  // The badge's leading token carries the weight — "Winner:", "1st Place:",
  // "$40K USD" — so it renders bold inside the italic row; the wording itself
  // stays plain in entries.ts (presentation, not content).
  const boldBadge = (b: string): string => {
    const m = b.match(/^([^:]+:|\$\S+ USD\b)\s*(.*)$/);
    return m ? `\\textbf{${escapeLatex(m[1])}} ${escapeLatex(m[2])}` : escapeLatex(b);
  };
  const badges = [...(e.awards ?? []), ...(e.grants ?? [])];
  const context = badges.length
    ? `${badges.map(boldBadge).join('; ')}${e.subtitle ? ` (${escapeLatex(e.subtitle)})` : ''}`
    : e.subtitle
      ? escapeLatex(e.subtitle)
      : '';
  // The context row spans both columns: award lines run long, and inside the
  // l/r tabular* they would otherwise stretch the left column past the date.
  const contextRow = context
    ? `\\\\ \\multicolumn{2}{@{}p{0.97\\textwidth}@{}}{\\textit{${context}}}`
    : '';

  return [
    '  \\resumeProject',
    `  {${title}}`,
    `  {${escapeLatex(e.dateLabel)}}`,
    `  {${contextRow}}`,
    items(e, ids),
  ].join('\n');
}

function sectionBlock(title: string, body: string): string {
  return `\\section{\\textbf{${title}}}\n\\resumeSubHeadingListStart\n${body}\n\\resumeSubHeadingListEnd\n`;
}

function renderSection(
  lib: ResumeLibrary,
  sel: Selection,
  kind: ResumeEntry['section'],
  variant: ResumeVariant,
): string {
  const byId = new Map(lib.entries.map((e) => [e.id, e]));
  const renderProject = variant === 'classic' ? projectClassic : project;
  return sel.entryIds
    .map((id) => byId.get(id))
    .filter((e): e is ResumeEntry => Boolean(e) && e!.section === kind)
    .map((e) =>
      kind === 'projects'
        ? renderProject(e, sel.bulletIds[e.id] ?? [])
        : subheading(e, sel.bulletIds[e.id] ?? []),
    )
    .join('\n');
}

function header(p: Profile, variant: ResumeVariant): string {
  // Contact line: no icon glyphs (they extract as private-use garbage in ATS
  // parsers). Links render as short labels ("linkedin", "github") with the full
  // URL underneath as the hyperlink target — per William's preference over
  // printing raw URLs.
  const contacts = [
    p.location,
    p.phone,
    p.email ? `\\reslink{mailto:${escapeLatexUrl(p.email)}}{${escapeLatex(p.email)}}` : undefined,
    ...p.links.map(
      (l) => `\\reslink{${escapeLatexUrl(l.href)}}{${escapeLatex(l.label)}}`,
    ),
  ]
    .filter((x): x is string => Boolean(x))
    .join(' | \n    ');
  return [
    '\\begin{center}',
    `    {\\Huge\\textbf{${escapeLatex(p.name)}}}`,
    '\\end{center}',
    // Tight header: the name and contact line sit close so the content gets
    // the vertical room (and the bottom margin stays honest). The classic
    // variant opens the name→contacts gap instead, like the W25 original.
    variant === 'classic' ? '\\vspace{-4mm}' : '\\vspace{-3.5mm}',
    '',
    '\\begin{center}',
    '    \\small{',
    `    ${contacts}`,
    '    }',
    '\\end{center}',
    variant === 'classic' ? '\\vspace{-6mm}' : '\\vspace{-7mm}',
  ].join('\n');
}

function skillsBlock(groups: SkillGroup[]): string {
  // Comma-separated, tight: category label bold at body size (same size as the
  // items, per review — differentiate by weight, not size), rows packed close.
  const rows = groups
    .map(
      (g) =>
        `  \\item {\\normalfont\\textbf{${escapeLatex(g.category)}:}}~ ${g.items
          .map((s) => escapeLatex(s))
          .join(', ')}`,
    )
    .join('\n');
  return [
    '\\section{\\textbf{Skills}}',
    '\\vspace{-0.4mm}',
    '\\begin{itemize}[leftmargin=*, itemsep=0.2mm, rightmargin=2ex, label={}]',
    rows,
    '\\end{itemize}',
    '\\vspace{-3.5mm}',
  ].join('\n');
}

// Classic skills table: a fixed-width label column ("Languages:" at 11pt; the
// original was 12pt/85pt — 88pt fits "Cloud & Tools:") and bold space-separated
// \skilltag items, vs the modern comma-separated line. The items sit in a
// top-aligned \parbox so a row that overflows wraps under its own first item
// (hanging indent), not back under the label column.
function skillsBlockClassic(groups: SkillGroup[]): string {
  const rows = groups
    .map(
      (g) =>
        `  \\item \\makebox[88pt][l]{\\fontsize{11pt}{11pt}\\selectfont ${escapeLatex(
          g.category,
        )}:}%\n        \\parbox[t]{\\dimexpr\\linewidth-88pt\\relax}{\\raggedright ${g.items
          .map((s) => `\\skilltag{${escapeLatex(s)}}`)
          .join(' ')}}`,
    )
    .join('\n');
  return [
    '\\section{\\textbf{Skills}}',
    '\\vspace{-0.4mm}',
    '\\begin{itemize}[leftmargin=*, itemsep=0.8mm, rightmargin=2ex, label={}]',
    rows,
    '\\end{itemize}',
    // -4.5mm (modern: -3.5): Skills hands its boundary space to Experience.
    '\\vspace{-4.5mm}',
  ].join('\n');
}

export function generateBody(
  lib: ResumeLibrary,
  sel: Selection,
  variant: ResumeVariant = 'modern',
): string {
  // Section order: the modern one-pager leads with Education (current student —
  // recruiters and ATS scans look for it up top), then Skills, Experience,
  // Projects. The classic layout keeps the W25 order: Skills first, Education
  // closing the page.
  const parts: string[] = [header(lib.profile, variant)];
  const edu = renderSection(lib, sel, 'education', variant);
  const exp = renderSection(lib, sel, 'experience', variant);
  const proj = renderSection(lib, sel, 'projects', variant);
  const skills = variant === 'classic' ? skillsBlockClassic(lib.skills) : skillsBlock(lib.skills);

  if (variant === 'classic') {
    parts.push(skills);
    if (exp.trim()) parts.push(sectionBlock('Experience', exp));
    if (proj.trim()) parts.push(sectionBlock('Projects', proj));
    if (edu.trim()) parts.push(sectionBlock('Education', edu));
  } else {
    if (edu.trim()) parts.push(sectionBlock('Education', edu));
    parts.push(skills);
    if (exp.trim()) parts.push(sectionBlock('Experience', exp));
    if (proj.trim()) parts.push(sectionBlock('Projects', proj));
  }
  return parts.join('\n\n');
}

export function generateResume(
  lib: ResumeLibrary,
  sel: Selection,
  shell: string,
  variant: ResumeVariant = 'modern',
): string {
  const markerCount = shell.split(BODY_MARKER).length - 1;
  if (markerCount === 0) {
    throw new Error(`shell is missing the ${BODY_MARKER} marker`);
  }
  if (markerCount > 1) {
    throw new Error(`shell has ${markerCount} ${BODY_MARKER} markers; expected exactly one`);
  }
  // Function replacer: avoids `$`-sequences in the body being treated as
  // special replacement patterns ($&, $1, …).
  return shell.replace(BODY_MARKER, () => generateBody(lib, sel, variant));
}
