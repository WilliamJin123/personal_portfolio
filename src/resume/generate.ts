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
  return [
    '  \\resumeSubheading',
    `      {${escapeLatex(e.title)}}`,
    `      {${escapeLatex(e.location ?? '')}}`,
    `      {${escapeLatex(e.role ?? '')}}{${escapeLatex(e.dateLabel)}}`,
    items(e, ids),
  ].join('\n');
}

function project(e: ResumeEntry, ids: string[]): string {
  const links = e.links ?? [];
  const primary = links[0];
  const name = primary
    ? `{\\href{${escapeLatexUrl(primary.href)}}{\\textcolor{black}{${escapeLatex(e.title)}~\\raisebox{0.1em}{\\scalebox{0.8}{\\faExternalLink*}}}}}`
    : `{${escapeLatex(e.title)}}`;
  const subtitle = [
    ...(e.awards ?? []).map((a) => `\\award{${escapeLatex(a)}}`),
    ...(e.grants ?? []).map((g) => `\\grant{${escapeLatex(g)}}`),
    e.subtitle ? escapeLatex(e.subtitle) : '',
    ...links.slice(1).map((l) =>
      /github\.com/i.test(l.href)
        ? `\\repolink{${escapeLatexUrl(l.href)}}{${escapeLatex(l.label)}}`
        : `\\weblink{${escapeLatexUrl(l.href)}}{${escapeLatex(l.label)}}`,
    ),
  ]
    .filter(Boolean)
    .join(' ');
  return [
    '  \\resumeProject',
    `  ${name}`,
    `  {${subtitle}}`,
    `  {${escapeLatex(e.dateLabel)}}{}`,
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
  const iconCmd = (i?: string) =>
    i === 'linkedin'
      ? '\\socialicon{\\faLinkedin} '
      : i === 'github'
        ? '\\socialicon{\\faGithub} '
        : '';
  const contacts = [
    p.phone,
    p.email ? `\\href{mailto:${escapeLatexUrl(p.email)}}{${escapeLatex(p.email)}}` : undefined,
    ...p.links.map((l) => `${iconCmd(l.icon)}\\href{${escapeLatexUrl(l.href)}}{${escapeLatex(l.label)}}`),
  ]
    .filter((x): x is string => Boolean(x))
    .join(' | \n    ');
  return [
    '\\begin{center}',
    `    {\\Huge\\textbf{${escapeLatex(p.name)}}}`,
    '\\end{center}',
    '\\vspace{-6mm}',
    '',
    '\\begin{center}',
    '    \\small{',
    `    ${contacts}`,
    '    }',
    '\\end{center}',
    '\\vspace{-6mm}',
  ].join('\n');
}

function skillsBlock(groups: SkillGroup[]): string {
  const rows = groups
    .map(
      (g) =>
        `  \\item \\makebox[85pt][l]{\\fontsize{12pt}{12pt}\\selectfont ${escapeLatex(
          g.category,
        )}:}\n        ${g.items.map((s) => `\\skilltag{${escapeLatex(s)}}`).join(' ')}`,
    )
    .join('\n');
  return [
    '\\section{\\textbf{Skills}}',
    '\\vspace{-0.4mm}',
    '\\begin{itemize}[leftmargin=*, itemsep=1mm, rightmargin=2ex, label={}]',
    rows,
    '\\end{itemize}',
    '\\vspace{-3.5mm}',
  ].join('\n');
}

export function generateBody(lib: ResumeLibrary, sel: Selection): string {
  const parts: string[] = [header(lib.profile), skillsBlock(lib.skills)];
  const exp = renderSection(lib, sel, 'experience');
  if (exp.trim()) parts.push(sectionBlock('Experience', exp));
  const proj = renderSection(lib, sel, 'projects');
  if (proj.trim()) parts.push(sectionBlock('Projects', proj));
  const edu = renderSection(lib, sel, 'education');
  if (edu.trim()) parts.push(sectionBlock('Education', edu));
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
