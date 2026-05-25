# Résumé Component System — Phase 1 (Library + LaTeX Generator) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn structured résumé data into a compilable `.tex` file that reproduces William's current résumé, with no UI.

**Architecture:** Pure, framework-free TypeScript. Résumé content is typed data; a tokenizer parses each bullet's constrained markdown (`**bold**`, `[label](href)`) into tokens; a LaTeX renderer turns tokens into escaped LaTeX; a generator walks the library + a selection and injects macro calls into a preamble *shell* (`shell.tex`) at a `%%RESUME_BODY%%` marker. A small Node script writes `out/resume.tex`, which William compiles as he does today (Overleaf / local `pdflatex`). No Astro runtime, no in-browser TeX.

**Tech Stack:** TypeScript (ESM), Vitest (unit tests), tsx (run the build script). No Zod in Phase 1 — TS interfaces + `astro check` cover shape; Zod returns if/when the data moves into an Astro content collection.

Reference spec: `docs/superpowers/specs/2026-05-25-resume-component-system-design.md`.

**Privacy note:** Real résumé content (incl. phone/email) lives in `src/resume/data/`, which Task 1 adds to `.gitignore`. Tests use synthetic fixtures, never the real data. This plan doc contains William's contact info in the Task 6 example — don't push it to a public repo without scrubbing, or keep this doc local.

**Commit convention:** End every commit message with the trailer:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/resume/types.ts` | All TS types: `Token`, `ResumeBullet`, `ResumeEntry`, `SkillGroup`, `Profile`, `ResumeLibrary`, `Selection`. |
| `src/resume/tokenize.ts` | `tokenize(text)` — constrained-markdown → `Token[]`. Pure. |
| `src/resume/latex.ts` | `escapeLatex(s)`, `tokensToLatex(tokens)`. Pure. |
| `src/resume/generate.ts` | `defaultSelection(lib)`, `generateBody(lib, sel)`, `generateResume(lib, sel, shell)`. Pure. |
| `src/resume/fixtures.ts` | Synthetic `ResumeLibrary` for tests (committed). |
| `src/resume/shell.tex` | Preamble shell = William's résumé preamble + `%%RESUME_BODY%%` marker (committed). |
| `src/resume/data/` | William's real résumé data (`profile.ts`, `skills.ts`, `entries.ts`, `index.ts`). **gitignored.** |
| `scripts/build-resume.ts` | Reads shell + data, writes `out/resume.tex`. |
| `out/` | Generated output. **gitignored.** |
| `*.test.ts` (beside each module) | Vitest unit tests. |

All imports inside `src/resume/` and `scripts/` are **relative and extensionless** (e.g. `./tokenize`) — works under Astro's `moduleResolution: bundler`, Vitest, and tsx without path-alias config.

---

## Task 1: Tooling — Vitest + tsx + ignores

**Files:**
- Modify: `package.json` (add devDeps + scripts)
- Modify: `.gitignore` (add `out/` and `src/resume/data/`)
- Test (temporary): `src/resume/_smoke.test.ts`

- [ ] **Step 1: Install dev tooling**

Run:
```bash
npm install -D vitest tsx
```
Expected: `vitest` and `tsx` appear under `devDependencies` in `package.json`; exit 0.

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block, add these three entries (leave existing entries untouched):
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "resume": "tsx scripts/build-resume.ts"
```

- [ ] **Step 3: Add ignores to `.gitignore`**

Append to the end of `.gitignore`:
```gitignore

# Resume system
/out/
/src/resume/data/
```

- [ ] **Step 4: Write a temporary smoke test**

Create `src/resume/_smoke.test.ts`:
```ts
import { test, expect } from 'vitest';

test('vitest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Delete the smoke test**

Run: `rm src/resume/_smoke.test.ts`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add vitest + tsx and resume-system ignores"
```

---

## Task 2: Types

**Files:**
- Create: `src/resume/types.ts`

- [ ] **Step 1: Write the types**

Create `src/resume/types.ts`:
```ts
export type Token =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'link'; label: string; href: string };

export type ResumeSection = 'experience' | 'projects' | 'education';

export interface ResumeBullet {
  id: string;
  text: string;          // constrained markdown: **bold**, [label](href)
  tags?: string[];       // hand-entered relevance metadata (unused in Phase 1)
  default?: boolean;     // default true; included in a fresh tailoring
}

export interface ResumeEntry {
  id: string;
  section: ResumeSection;
  title: string;         // company / project / school
  role?: string;         // job title / degree
  dateLabel: string;     // e.g. "July 2025 - Sept 2025"
  location?: string;
  subtitle?: string;     // projects: award / grant line
  link?: { label: string; href: string };
  bullets: ResumeBullet[];
  include?: boolean;     // default true; in the résumé pool
}

export interface SkillGroup {
  category: string;      // "Languages"
  items: string[];       // ["Python", "Java", ...]
}

export interface Profile {
  name: string;
  phone?: string;
  email?: string;
  links: { label: string; href: string; icon?: 'linkedin' | 'github' }[];
}

export interface ResumeLibrary {
  profile: Profile;
  skills: SkillGroup[];
  entries: ResumeEntry[];
}

export interface Selection {
  entryIds: string[];                  // order matters
  bulletIds: Record<string, string[]>; // entryId -> ordered bulletIds
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors (types compile under strict mode).

- [ ] **Step 3: Commit**

```bash
git add src/resume/types.ts
git commit -m "feat: resume content-model types"
```

---

## Task 3: Tokenizer

**Files:**
- Create: `src/resume/tokenize.ts`
- Test: `src/resume/tokenize.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/resume/tokenize.test.ts`:
```ts
import { test, expect } from 'vitest';
import { tokenize } from './tokenize';

test('plain text is one text token', () => {
  expect(tokenize('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
});

test('bold span', () => {
  expect(tokenize('**Python**')).toEqual([{ type: 'bold', value: 'Python' }]);
});

test('text around bold', () => {
  expect(tokenize('used **Java** daily')).toEqual([
    { type: 'text', value: 'used ' },
    { type: 'bold', value: 'Java' },
    { type: 'text', value: ' daily' },
  ]);
});

test('two bold spans', () => {
  expect(tokenize('**Firebase** and **Firestore**')).toEqual([
    { type: 'bold', value: 'Firebase' },
    { type: 'text', value: ' and ' },
    { type: 'bold', value: 'Firestore' },
  ]);
});

test('link span', () => {
  expect(tokenize('[GH](https://github.com/x)')).toEqual([
    { type: 'link', label: 'GH', href: 'https://github.com/x' },
  ]);
});

test('unclosed markup stays literal text', () => {
  expect(tokenize('**oops')).toEqual([{ type: 'text', value: '**oops' }]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/resume/tokenize.test.ts`
Expected: FAIL — cannot find module `./tokenize`.

- [ ] **Step 3: Write the tokenizer**

Create `src/resume/tokenize.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/resume/tokenize.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/resume/tokenize.ts src/resume/tokenize.test.ts
git commit -m "feat: constrained-markdown tokenizer"
```

---

## Task 4: LaTeX rendering

**Files:**
- Create: `src/resume/latex.ts`
- Test: `src/resume/latex.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/resume/latex.test.ts`:
```ts
import { test, expect } from 'vitest';
import { escapeLatex, tokensToLatex } from './latex';
import { tokenize } from './tokenize';

test('escapes LaTeX specials', () => {
  expect(escapeLatex('72%')).toBe('72\\%');
  expect(escapeLatex('A & B')).toBe('A \\& B');
  expect(escapeLatex('a_b #1')).toBe('a\\_b \\#1');
});

test('backslash does not double-escape', () => {
  expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
});

test('bold token -> \\textbf with escaped content', () => {
  expect(tokensToLatex([{ type: 'bold', value: '72%' }])).toBe('\\textbf{72\\%}');
});

test('link token -> \\href, href left raw', () => {
  expect(tokensToLatex([{ type: 'link', label: 'GH', href: 'https://x/y' }])).toBe(
    '\\href{https://x/y}{GH}',
  );
});

test('end-to-end: tokenize then render', () => {
  expect(tokensToLatex(tokenize('hit **72%** with Azure & AI'))).toBe(
    'hit \\textbf{72\\%} with Azure \\& AI',
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/resume/latex.test.ts`
Expected: FAIL — cannot find module `./latex`.

- [ ] **Step 3: Write the renderer**

Create `src/resume/latex.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/resume/latex.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/resume/latex.ts src/resume/latex.test.ts
git commit -m "feat: token -> LaTeX renderer with escaping"
```

---

## Task 5: Generator

**Files:**
- Create: `src/resume/generate.ts`
- Create: `src/resume/fixtures.ts`
- Test: `src/resume/generate.test.ts`

- [ ] **Step 1: Write the test fixture**

Create `src/resume/fixtures.ts`:
```ts
import type { ResumeLibrary } from './types';

// Synthetic library exercising: a `&` in a title, a `%` + bold in a bullet,
// a project with a link, a default:false bullet, and all three sections.
export const fixtureLibrary: ResumeLibrary = {
  profile: {
    name: 'Ada Test',
    phone: '+1-000-000-0000',
    email: 'ada@example.com',
    links: [{ label: 'gh/ada', href: 'https://github.com/ada', icon: 'github' }],
  },
  skills: [{ category: 'Languages', items: ['Python', 'C++'] }],
  entries: [
    {
      id: 'lab',
      section: 'experience',
      title: 'R&D Lab',
      role: 'Developer',
      location: 'Edmonton',
      dateLabel: 'July 2025 - Sept 2025',
      bullets: [
        { id: 'a', text: 'Cut latency by **40%** in **Python**' },
        { id: 'b', text: 'A dropped bullet', default: false },
      ],
    },
    {
      id: 'sol',
      section: 'projects',
      title: 'SolShare',
      subtitle: 'Won at Hack the North',
      dateLabel: 'Sept 2025',
      link: { label: 'repo', href: 'https://github.com/x/sol' },
      bullets: [{ id: 'a', text: 'Built an **iOS** app' }],
    },
    {
      id: 'uw',
      section: 'education',
      title: 'University of Waterloo',
      role: 'BSE',
      location: 'Waterloo',
      dateLabel: 'Sept 2024 - May 2029',
      bullets: [{ id: 'a', text: 'GPA: 3.90/4.00' }],
    },
  ],
};
```

- [ ] **Step 2: Write the failing tests**

Create `src/resume/generate.test.ts`:
```ts
import { test, expect } from 'vitest';
import { defaultSelection, generateBody, generateResume } from './generate';
import { fixtureLibrary as lib } from './fixtures';

test('defaultSelection includes all entries and default:true bullets in order', () => {
  const sel = defaultSelection(lib);
  expect(sel.entryIds).toEqual(['lab', 'sol', 'uw']);
  expect(sel.bulletIds.lab).toEqual(['a']); // 'b' is default:false
  expect(sel.bulletIds.sol).toEqual(['a']);
});

test('body escapes titles and bullets', () => {
  const body = generateBody(lib, defaultSelection(lib));
  expect(body).toContain('{R\\&D Lab}');          // title escaped
  expect(body).toContain('\\textbf{40\\%}');       // bold + escaped bullet
  expect(body).not.toContain('A dropped bullet');  // default:false excluded
});

test('body emits the right macros per section, in order', () => {
  const body = generateBody(lib, defaultSelection(lib));
  expect(body).toContain('\\resumeSubheading');
  expect(body).toContain('\\resumeProject');
  expect(body).toContain('\\href{https://github.com/x/sol}'); // project link
  expect(body.indexOf('Experience')).toBeLessThan(body.indexOf('Projects'));
  expect(body.indexOf('Projects')).toBeLessThan(body.indexOf('Education'));
});

test('generateResume injects body at the marker', () => {
  const out = generateResume(lib, defaultSelection(lib), 'PRE\n%%RESUME_BODY%%\nPOST');
  expect(out.startsWith('PRE')).toBe(true);
  expect(out.endsWith('POST')).toBe(true);
  expect(out).toContain('\\resumeSubheading');
});

test('generateResume throws if the marker is missing', () => {
  expect(() => generateResume(lib, defaultSelection(lib), 'no marker here')).toThrow(
    /RESUME_BODY/,
  );
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/resume/generate.test.ts`
Expected: FAIL — cannot find module `./generate`.

- [ ] **Step 4: Write the generator**

Create `src/resume/generate.ts`:
```ts
import type {
  ResumeLibrary,
  ResumeEntry,
  ResumeBullet,
  Selection,
  Profile,
  SkillGroup,
} from './types';
import { tokenize } from './tokenize';
import { tokensToLatex, escapeLatex } from './latex';

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
  const name = e.link
    ? `{\\href{${e.link.href}}{\\textcolor{black}{${escapeLatex(e.title)}~\\raisebox{0.1em}{\\scalebox{0.8}{\\faExternalLink*}}}}}`
    : `{${escapeLatex(e.title)}}`;
  return [
    '  \\resumeProject',
    `  ${name}`,
    `  {${escapeLatex(e.subtitle ?? '')}}`,
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
    .map((e) => (kind === 'projects' ? project(e, sel.bulletIds[e.id] ?? []) : subheading(e, sel.bulletIds[e.id] ?? [])))
    .join('\n');
}

function header(p: Profile): string {
  const iconCmd = (i?: string) =>
    i === 'linkedin' ? '\\socialicon{\\faLinkedin} ' : i === 'github' ? '\\socialicon{\\faGithub} ' : '';
  const contacts = [
    p.phone,
    p.email ? `\\href{mailto:${p.email}}{${escapeLatex(p.email)}}` : undefined,
    ...p.links.map((l) => `${iconCmd(l.icon)}\\href{${l.href}}{${escapeLatex(l.label)}}`),
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
        `  \\item \\makebox[85pt][l]{\\fontsize{12pt}{12pt}\\selectfont ${escapeLatex(g.category)}:}\n        ${g.items
          .map((s) => `\\skilltag{${escapeLatex(s)}}`)
          .join(' ')}`,
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
  if (!shell.includes(BODY_MARKER)) {
    throw new Error(`shell is missing the ${BODY_MARKER} marker`);
  }
  return shell.replace(BODY_MARKER, generateBody(lib, sel));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/resume/generate.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 6: Run the full suite + type-check**

Run: `npm test && npm run check`
Expected: all tests pass; 0 type errors.

- [ ] **Step 7: Commit**

```bash
git add src/resume/generate.ts src/resume/fixtures.ts src/resume/generate.test.ts
git commit -m "feat: resume body + .tex generator"
```

---

## Task 6: Shell, real data, build script, and the fidelity check

This task has no unit test — its acceptance criterion is **the generated PDF matching William's current résumé**, verified by compiling and eyeballing.

**Files:**
- Create: `src/resume/shell.tex`
- Create: `src/resume/data/profile.ts`, `skills.ts`, `entries.ts`, `index.ts` (gitignored)
- Create: `scripts/build-resume.ts`

- [ ] **Step 1: Create the preamble shell**

Create `src/resume/shell.tex`. Copy the **entire preamble** of William's current résumé verbatim — everything from the top comment block down through the line `\headerfontxi` (the first line after `\begin{document}`). Then, in place of all the hand-written body (Skills/Experience/Projects/Education), put the marker. The tail of the file must look exactly like this:
```latex
\begin{document}
\headerfontxi

% \skilltag is used by the generated body; define it here in the shell.
\newcommand{\skilltag}[1]{{\textbf{#1}}\hspace{5pt}}

%%RESUME_BODY%%

\end{document}
```
Everything above `\begin{document}` is the copied preamble (documentclass, package imports, color/page setup, `\titleformat`, the `\resume*` and `\headerfont*` `\newcommand` definitions). Do **not** keep any of the old hand-written `\section{...}` body — the generator produces all of it.

- [ ] **Step 2: Create the profile data**

Create `src/resume/data/profile.ts` (gitignored — real contact info):
```ts
import type { Profile } from '../types';

export const profile: Profile = {
  name: 'William Jin',
  phone: '+1-XXX-XXX-XXXX', // real value lives only in this gitignored file
  email: 'w3jin@uwaterloo.ca',
  links: [
    { label: 'in/william-jin-874b572a1', href: 'https://www.linkedin.com/in/william-jin-874b572a1', icon: 'linkedin' },
    { label: 'WilliamJin123', href: 'https://github.com/WilliamJin123', icon: 'github' },
  ],
};
```

- [ ] **Step 3: Create the skills data**

Create `src/resume/data/skills.ts`:
```ts
import type { SkillGroup } from '../types';

export const skills: SkillGroup[] = [
  { category: 'Languages', items: ['Python', 'Java', 'Swift', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SQL', 'C++', 'VHDL'] },
  { category: 'Technologies', items: ['ReactJS', 'NodeJS', 'MongoDB', 'Oracle', 'Microsoft Azure', 'Cloudflare', 'Firebase'] },
  { category: 'AI', items: ['Ollama', 'LangChain', 'Unsloth', 'Huggingface', 'PyTorch', 'NumPy', 'Pandas'] },
];
```

- [ ] **Step 4: Create the entries data**

Create `src/resume/data/entries.ts` (transcribe each entry from the current résumé; bold the same spans the résumé bolds):
```ts
import type { ResumeEntry } from '../types';

export const entries: ResumeEntry[] = [
  {
    id: 'ualberta', section: 'experience',
    title: 'University of Alberta Energy Mechatronics Lab', location: 'Edmonton, Alberta',
    role: 'Python Developer', dateLabel: 'July 2025 - Sept 2025',
    bullets: [
      { id: 'scraper', text: 'Developed a web scraper to automatically track citations of **7,000+** papers across 2,000+ journal websites using Selenium, Beautiful Soup with **Python**', tags: ['python', 'scraping'] },
      { id: 'map', text: 'Created a publication map to visualize citation networks and communicate research impact', tags: ['dataviz'] },
      { id: 'db', text: 'Designed and deployed a **SQL Server** database to organize **5,000+** experimental fuel cell files', tags: ['sql', 'data'] },
    ],
  },
  {
    id: 'jindon', section: 'experience',
    title: 'Jindon International Ltd.', location: 'Waterloo, Ontario',
    role: 'Full Stack Software Engineer', dateLabel: 'June 2025 - July 2025',
    bullets: [
      { id: 'intake', text: 'Built search functions and intake forms for Ontario’s social assistance management system using **Java**', tags: ['java', 'fullstack'] },
      { id: 'sql', text: 'Optimized **SQL** queries (**10x** faster) by eliminating redundant table joins and adding indexes', tags: ['sql', 'performance'] },
      { id: 'tests', text: 'Wrote **JMockit** unit tests and debugged UI issues in Curam components', tags: ['testing', 'java'] },
    ],
  },
  {
    id: 'weaccel', section: 'experience',
    title: 'WE Accelerate Azure & AI Stream', location: 'Waterloo, Ontario',
    role: 'Professional Development Participant', dateLabel: 'June 2025 - Aug 2025',
    bullets: [
      { id: 'chatbot', text: 'Designed and presented a healthcare chatbot MVP for hospital symptom triage in a 7-person team', tags: ['ai', 'product'] },
      { id: 'data', text: 'Led data preprocessing by sourcing datasets from the CDC and created a workflow for model training', tags: ['ml', 'data'] },
      { id: 'certs', text: 'Earned Azure Fundamentals (**AZ-900**) and Azure AI Fundamentals (**AI-900**) certifications', tags: ['azure', 'certification'] },
    ],
  },
  {
    id: 'solshare', section: 'projects',
    title: 'SolShare', subtitle: 'Won 1st for Cohere API best use, and Solana best consumer payment experience at Hack the North',
    dateLabel: 'Sept 2025', link: { label: 'repo', href: 'https://github.com/orgs/HTN-2025/repositories' },
    bullets: [
      { id: 'ios', text: 'Developed a bill-splitting **iOS** application that automates receipt parsing and payment processing', tags: ['ios', 'swift'] },
      { id: 'cohere', text: 'Extracted receipt data using Cohere’s vision and reasoning models through a **self-critic** workflow', tags: ['ai', 'llm'] },
      { id: 'backend', text: 'Built the backend using **Firebase Cloud Functions** and **Firestore** and the frontend using **SwiftUI**', tags: ['firebase', 'swiftui'] },
    ],
  },
  {
    id: 'solana-sdk', section: 'projects',
    title: 'Solana Swift SDK', subtitle: 'Grant-Funded Development - Solana Foundation',
    dateLabel: 'Oct 2025 - Nov 2025', link: { label: 'repo', href: 'https://github.com/The-SolShare-Team' },
    bullets: [
      { id: 'sdk', text: 'Developed Solana’s first official native **Swift SDK** enabling **iOS** apps to easily integrate multi-wallet functionality for leading crypto wallet providers: Phantom, Backpack, and Solflare', tags: ['swift', 'sdk'] },
      { id: 'ship', text: 'Shipping open-source SDK via Swift Package Manager with documentation by early-mid November', tags: ['open-source'] },
    ],
  },
  {
    id: 'email-llm', section: 'projects',
    title: 'Email Assistant', subtitle: 'Personal Project',
    dateLabel: 'Sept 2025', link: { label: 'repo', href: 'https://github.com/WilliamJin123/email-llm' },
    bullets: [
      { id: 'lora', text: 'Created an email LoRA by fine-tuning Qwen3-14B using **Unsloth** and **Huggingface**', tags: ['ml', 'llm'] },
      { id: 'data', text: 'Trained model on 5,000+ synthetic email datasets preprocessed with **Pandas** and **NumPy**', tags: ['ml', 'data'] },
      { id: 'eval', text: 'Outperformed Qwen3-14B thinking mode in human preference tests (**72%** pref. rate)', tags: ['ml', 'eval'] },
    ],
  },
  {
    id: 'uwaterloo', section: 'education',
    title: 'University of Waterloo', location: 'Waterloo, Ontario',
    role: 'Bachelor of Software Engineering', dateLabel: 'Sept 2024 - May 2029',
    bullets: [
      { id: 'gpa', text: 'GPA: 3.90/4.00' },
      { id: 'courses', text: 'Relevant Coursework: Intro to Data Abstraction and Implementation, Statistics, Foundations of Sequential Programs, Digital Computers' },
    ],
  },
];
```

- [ ] **Step 5: Create the data barrel**

Create `src/resume/data/index.ts`:
```ts
import type { ResumeLibrary } from '../types';
import { profile } from './profile';
import { skills } from './skills';
import { entries } from './entries';

export const library: ResumeLibrary = { profile, skills, entries };
```

- [ ] **Step 6: Create the build script**

Create `scripts/build-resume.ts`:
```ts
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume } from '../src/resume/generate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(resolve(root, 'src/resume/shell.tex'), 'utf8');
const tex = generateResume(library, defaultSelection(library), shell);

mkdirSync(resolve(root, 'out'), { recursive: true });
writeFileSync(resolve(root, 'out/resume.tex'), tex);
console.log('Wrote out/resume.tex');
```

- [ ] **Step 7: Generate the .tex**

Run: `npm run resume`
Expected: prints `Wrote out/resume.tex`; the file exists and contains `\documentclass`, `\begin{document}`, the generated sections, and `\end{document}`.

- [ ] **Step 8: Compile and eyeball (the acceptance check)**

Compile `out/resume.tex` the way William compiles today:
- **Overleaf:** upload `out/resume.tex`, compile. (Recommended — the template needs `cfr-lm`, `fontawesome5`, `tcolorbox`, etc.)
- **Local:** `cd out && pdflatex resume.tex` (requires a TeX Live install with those packages).

Expected: a PDF that matches the current résumé — same header, Skills/Experience/Projects/Education sections, same bullets, same bolded terms. Note any differences (spacing, a missing bold, an escaping glitch) and fix the generator or data, then re-run `npm run resume` and recompile. Iterate until it matches.

- [ ] **Step 9: Commit**

`src/resume/data/` and `out/` are gitignored, so only the script and shell are committed:
```bash
git add scripts/build-resume.ts src/resume/shell.tex
git commit -m "feat: resume build script + preamble shell"
```

---

## Self-Review

- **Spec coverage:** content model (Tasks 2, 6) ✓ · constrained-markdown tokenizer (Task 3) ✓ · token→LaTeX + escaping (Task 4) ✓ · generator + shell/body split + marker (Tasks 5, 6) ✓ · manual selection via `Selection`/`defaultSelection`, tags stored-but-unused (Tasks 2, 5) ✓ · `.tex` export, no in-browser TeX (Task 6) ✓ · profile/skills (Task 6) ✓ · fidelity acceptance test (Task 6, Step 8) ✓. Phases 2–3 intentionally out of scope.
- **Placeholder scan:** every code/test step contains complete code; the only "fill from source" step (Task 6 shell + entries) names an unambiguous source (the résumé) and shows the exact framing/marker. No TBDs.
- **Type consistency:** `tokenize → Token[]`, `tokensToLatex(Token[]) → string`, `defaultSelection(ResumeLibrary) → Selection`, `generateResume(ResumeLibrary, Selection, string) → string`, `library: ResumeLibrary` all match `types.ts`. Imports are relative + extensionless throughout.

## Known limitations (deferred, by design)
- Link URLs are not LaTeX-escaped (his URLs have no specials). A URL with `%`/`#`/`&` is a future edge case.
- No bold-inside-link-label.
- Header/Skills presentation lives in the generator (not as macros); fine for v1, can become shell macros later.
