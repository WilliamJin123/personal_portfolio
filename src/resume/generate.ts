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

function sectionBlock(title: string, body: string): string {
  return `\\section{\\textbf{${title}}}\n\\resumeSubHeadingListStart\n${body}\n\\resumeSubHeadingListEnd\n`;
}

function renderSection(lib: ResumeLibrary, sel: Selection, kind: ResumeEntry['section']): string {
  const byId = new Map(lib.entries.map((e) => [e.id, e]));
  return sel.entryIds
    .map((id) => byId.get(id))
    .filter((e): e is ResumeEntry => Boolean(e) && e!.section === kind)
    .map((e) =>
      kind === 'projects'
        ? project(e, sel.bulletIds[e.id] ?? [])
        : subheading(e, sel.bulletIds[e.id] ?? []),
    )
    .join('\n');
}

function header(p: Profile): string {
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
    // the vertical room (and the bottom margin stays honest).
    '\\vspace{-3.5mm}',
    '',
    '\\begin{center}',
    '    \\small{',
    `    ${contacts}`,
    '    }',
    '\\end{center}',
    '\\vspace{-7mm}',
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

export function generateBody(lib: ResumeLibrary, sel: Selection): string {
  // Section order: Education leads (current student — recruiters and ATS scans
  // look for it up top), then Skills, Experience, Projects.
  const parts: string[] = [header(lib.profile)];
  const edu = renderSection(lib, sel, 'education');
  if (edu.trim()) parts.push(sectionBlock('Education', edu));
  parts.push(skillsBlock(lib.skills));
  const exp = renderSection(lib, sel, 'experience');
  if (exp.trim()) parts.push(sectionBlock('Experience', exp));
  const proj = renderSection(lib, sel, 'projects');
  if (proj.trim()) parts.push(sectionBlock('Projects', proj));
  return parts.join('\n\n');
}

export function generateResume(lib: ResumeLibrary, sel: Selection, shell: string): string {
  const markerCount = shell.split(BODY_MARKER).length - 1;
  if (markerCount === 0) {
    throw new Error(`shell is missing the ${BODY_MARKER} marker`);
  }
  if (markerCount > 1) {
    throw new Error(`shell has ${markerCount} ${BODY_MARKER} markers; expected exactly one`);
  }
  // Function replacer: avoids `$`-sequences in the body being treated as
  // special replacement patterns ($&, $1, …).
  return shell.replace(BODY_MARKER, () => generateBody(lib, sel));
}
