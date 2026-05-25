# Résumé Phase 2A — Animated Per-Entry Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the real résumé library into the landing's "selected work" browser so each selected entry renders its bullets as animated HTML (Treatment 01 "Editorial ink-in").

**Architecture:** One library, two renderers — a new `tokensToHtml()` mirrors the existing `tokensToLatex()` over the same `Token[]`. Astro frontmatter reads `entries` at build time, renders bullet HTML, and bakes a JSON blob into a `<script type="application/json">` tag the verbatim inline client script parses. Gallery images + tech-stack icons come from a separate committed `portfolio-media.ts`, keeping the résumé library text-only.

**Tech Stack:** Astro 5, TypeScript, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-25-resume-phase2-animated-viewer-design.md`

---

## File Structure

- **Create** `src/resume/html.ts` — `escapeHtml()` + `tokensToHtml()`. Pure, no DOM.
- **Create** `src/resume/html.test.ts` — vitest unit tests (mirror `latex.test.ts`).
- **Create** `src/data/portfolio-media.ts` — `portfolioMedia` map (stack/images per entry id).
- **Create** `src/data/portfolio-media.test.ts` — invariant guard.
- **Modify** `.gitignore` — un-ignore `entries.ts`/`skills.ts`; keep `profile.ts`/`index.ts` ignored.
- **Modify** `src/pages/index.astro` — frontmatter (imports + view model + JSON tag), detail markup, inline script, work-section CSS.

---

## Pre-flight (needs William's go-ahead — do NOT skip)

`src/pages/index.astro` and `package.json` have **uncommitted prior work** (the work-section build-out, an important frontmatter build-bug fix, `@types/node`). Pushed `main` still carries the build bug. Before implementing:

- [ ] **P1: Confirm with William** that the pending landing changes should be committed to `main` first. (Standing rule: commit only when asked.)
- [ ] **P2: Commit the pending work on `main`:**

```bash
git add package.json package-lock.json src/pages/index.astro
git commit -m "$(cat <<'EOF'
fix: reword frontmatter comment to dodge esbuild parse bug; finalize work section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **P3: Create the feature branch** (implementation must not happen on `main`):

```bash
git checkout -b feat/resume-phase2a-viewer
```

Expected: `Switched to a new branch 'feat/resume-phase2a-viewer'`. All subsequent task commits land here.

---

## Task 1: `tokensToHtml` HTML renderer

**Files:**
- Create: `src/resume/html.ts`
- Test: `src/resume/html.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/resume/html.test.ts`:

```ts
import { test, expect } from 'vitest';
import { tokenize } from './tokenize';
import { escapeHtml, tokensToHtml } from './html';

test('escapeHtml escapes & < > "', () => {
  expect(escapeHtml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
});

test('plain text passes through', () => {
  expect(tokensToHtml(tokenize('used Java daily'))).toBe('used Java daily');
});

test('bold renders rbold span', () => {
  expect(tokensToHtml(tokenize('**Python**'))).toBe('<span class="rbold">Python</span>');
});

test('text around bold', () => {
  expect(tokensToHtml(tokenize('used **Java** daily')))
    .toBe('used <span class="rbold">Java</span> daily');
});

test('link renders rlink anchor', () => {
  expect(tokensToHtml(tokenize('[GH](https://github.com/x)')))
    .toBe('<a class="rlink" href="https://github.com/x" target="_blank" rel="noreferrer">GH</a>');
});

test('ampersand in href is escaped for attribute context', () => {
  expect(tokensToHtml(tokenize('[q](https://a.com?b=1&c=2)')))
    .toBe('<a class="rlink" href="https://a.com?b=1&amp;c=2" target="_blank" rel="noreferrer">q</a>');
});

test('HTML special chars in text and bold are escaped', () => {
  expect(tokensToHtml(tokenize('5 < 10 and **a & b**')))
    .toBe('5 &lt; 10 and <span class="rbold">a &amp; b</span>');
});

test('unclosed markup stays literal text', () => {
  expect(tokensToHtml(tokenize('**oops'))).toBe('**oops');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/resume/html.test.ts`
Expected: FAIL — `Failed to resolve import "./html"` / module not found.

- [ ] **Step 3: Implement `src/resume/html.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/resume/html.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resume/html.ts src/resume/html.test.ts
git commit -m "$(cat <<'EOF'
feat(resume): add tokensToHtml renderer mirroring tokensToLatex

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Privacy boundary — commit entries + skills

**Files:**
- Modify: `.gitignore:248`

- [ ] **Step 1: Edit `.gitignore`**

Replace the single line `/src/resume/data/` (currently line 248) with:

```
/src/resume/data/profile.ts
/src/resume/data/index.ts
```

(`/out/` on line 247 stays unchanged.)

- [ ] **Step 2: Verify the boundary with `git check-ignore`**

Run: `git check-ignore -v src/resume/data/entries.ts src/resume/data/skills.ts src/resume/data/profile.ts src/resume/data/index.ts`
Expected: only `profile.ts` and `index.ts` print (they remain ignored); `entries.ts` and `skills.ts` print nothing (now tracked).

- [ ] **Step 3: Verify entries/skills carry no secrets before committing**

Run: `grep -nE "phone|\\+1|[0-9]{3}[-.][0-9]{3}[-.][0-9]{4}" src/resume/data/entries.ts src/resume/data/skills.ts`
Expected: no matches (the phone lives only in `profile.ts`). If anything matches, STOP and surface it.

- [ ] **Step 4: Commit the gitignore change and the now-tracked data**

```bash
git add .gitignore src/resume/data/entries.ts src/resume/data/skills.ts
git commit -m "$(cat <<'EOF'
chore(resume): make entries/skills public, keep profile (phone) ignored

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Portfolio media layer

**Files:**
- Create: `src/data/portfolio-media.ts`
- Test: `src/data/portfolio-media.test.ts`

- [ ] **Step 1: Write the failing invariant test**

Create `src/data/portfolio-media.test.ts`:

```ts
import { test, expect } from 'vitest';
import { entries } from '../resume/data/entries';
import { portfolioMedia } from './portfolio-media';

test('every projects/experience entry has a portfolio-media record', () => {
  const ids = entries
    .filter((e) => e.section === 'projects' || e.section === 'experience')
    .map((e) => e.id);
  for (const id of ids) {
    expect(portfolioMedia[id], `missing media for ${id}`).toBeDefined();
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/portfolio-media.test.ts`
Expected: FAIL — `Failed to resolve import "./portfolio-media"`.

- [ ] **Step 3: Implement `src/data/portfolio-media.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/portfolio-media.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/portfolio-media.ts src/data/portfolio-media.test.ts
git commit -m "$(cat <<'EOF'
feat(portfolio): add portfolio-media layer (stack/images per entry id)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontmatter view model + JSON injection (non-breaking)

This task adds the build-time data WITHOUT changing the client behavior yet — the inline script still uses its placeholder `WORK` object. After this task the page renders identically, plus a new (unused) JSON blob in the DOM.

**Files:**
- Modify: `src/pages/index.astro` frontmatter (lines 1–8) and markup (insert before line 539, the `<script is:inline>`).

- [ ] **Step 1: Add imports + view model to the frontmatter**

In `src/pages/index.astro`, change the frontmatter so the closing `---` is preceded by this code (keep the existing comment block above it):

```astro
---
// Landing page — ported from the v14 design mock.
// Self-contained (its own light theme, fonts, and client script) so it does
// NOT inherit the dark scaffold theme from Base.astro / global.css, which
// still back the /work/[slug] project pages.
//   - the global style block is emitted unscoped, verbatim
//   - the inline client script is emitted as-is, not bundled by Vite
import { entries } from '../resume/data/entries';
import { tokenize } from '../resume/tokenize';
import { tokensToHtml } from '../resume/html';
import { portfolioMedia } from '../data/portfolio-media';

const toView = (e: (typeof entries)[number]) => {
  const m = portfolioMedia[e.id] ?? {};
  return {
    id: e.id,
    title: e.title,
    role: e.role ?? '',
    dateLabel: e.dateLabel,
    location: e.location ?? '',
    subtitle: e.subtitle ?? '',
    link: e.link ?? null,
    bulletsHtml: e.bullets.map((b) => tokensToHtml(tokenize(b.text))),
    stack: m.stack ?? [],
    images: m.images ?? [],
    footnotes: m.footnotes ?? [],
  };
};

const workData = {
  projects: entries.filter((e) => e.section === 'projects').map(toView),
  work: entries.filter((e) => e.section === 'experience').map(toView),
};
// Escape `<` so the serialized JSON can't break out of the <script> tag.
const workJson = JSON.stringify(workData).replace(/</g, '\\u003c');
---
```

- [ ] **Step 2: Inject the JSON blob into the markup**

Immediately before the `<script is:inline>` line (currently line 539), add:

```astro
<script type="application/json" id="work-data" set:html={workJson}></script>
```

- [ ] **Step 3: Verify types and build**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

Run: `npm run build`
Expected: build completes; `dist/index.html` written.

Run: `grep -c 'id="work-data"' dist/index.html`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "$(cat <<'EOF'
feat(landing): build résumé view model and inject work-data JSON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Switch the browser to real data

Replace the placeholder `WORK` object with the injected JSON and render the detail panel as a résumé block (header + bullets + stack). Uses the existing `.swap` crossfade for now; Task 6 swaps in the ink-in animation.

**Files:**
- Modify: `src/pages/index.astro` — detail markup (lines 517–523) and inline script (lines 689–718).

- [ ] **Step 1: Replace the detail-panel markup**

Replace lines 517–523 (the `<div class="wdetail" id="wdetail"> … </div>` block) with:

```html
        <div class="wdetail" id="wdetail">
          <div class="wd-idx m" id="wdidx">01</div>
          <h3 class="wd-name" id="wdname">—</h3>
          <div class="wd-meta m" id="wdmeta">—</div>
          <div class="wd-subtitle" id="wdsubtitle" hidden></div>
          <ul class="rbul" id="wdbullets"></ul>
          <div class="wd-stack" id="wdstack"></div>
        </div>
```

- [ ] **Step 2: Replace the placeholder `WORK` object with the parsed JSON**

In the inline script, replace the entire `const WORK={ … };` literal (currently lines 689–701) with:

```js
    const WORK=JSON.parse(document.getElementById('work-data').textContent);
```

- [ ] **Step 3: Update the detail element refs**

Replace the element-ref line (currently line 704):

```js
    const nameEl=document.getElementById('wdname'), subEl=document.getElementById('wdsub'), descEl=document.getElementById('wddesc'), idxEl=document.getElementById('wdidx'), stackEl=document.getElementById('wdstack');
```

with:

```js
    const nameEl=document.getElementById('wdname'), metaEl=document.getElementById('wdmeta'), subtitleEl=document.getElementById('wdsubtitle'), bulletsEl=document.getElementById('wdbullets'), idxEl=document.getElementById('wdidx'), stackEl=document.getElementById('wdstack');
```

- [ ] **Step 4: Update the render functions for real fields**

Replace `renderList`, `renderCards`, `paintGallery`, and `paint` (currently lines 712–715) with:

```js
    const metaLine=e=>[e.role,e.dateLabel,e.location].filter(Boolean).join(' · ');
    const cardSub=e=>e.subtitle || metaLine(e);
    const renderList=()=>{listEl.innerHTML=data().map((e,i)=>`<button class="witem${i===sel?' active':''}" data-i="${i}"><span class="wbar"></span><span class="wn">${pad(i+1)}</span><span class="wt">${e.title}</span></button>`).join('');};
    const renderCards=()=>{wcards.innerHTML=data().map((e,i)=>`<button class="wcard" data-i="${i}"><div class="wc-img"><span class="m">image — tbd</span></div><div class="wc-b"><div class="wc-n">${e.title}</div><div class="wc-s">${cardSub(e)}</div></div></button>`).join('');};
    const paintGallery=()=>{const e=data()[sel],n=e.images.length;gcount.textContent=pad(img+1)+' / '+pad(Math.max(n,1));gfoot.textContent=e.footnotes[img]||'image — optional';gph.textContent=n?('image '+pad(img+1)):'image — tbd';};
    const paint=()=>{const e=data()[sel];idxEl.textContent=pad(sel+1);nameEl.textContent=e.title;metaEl.textContent=metaLine(e);if(e.subtitle){subtitleEl.textContent=e.subtitle;subtitleEl.hidden=false;}else{subtitleEl.hidden=true;}bulletsEl.innerHTML=e.bulletsHtml.map((h,i)=>`<li class="rbullet" style="--bi:${i}">${h}</li>`).join('');stackEl.innerHTML=chips(e.stack);img=0;paintGallery();};
```

- [ ] **Step 5: Guard the gallery nav against zero images**

Replace the `gprev`/`gnext` listeners (currently lines 734–735) with:

```js
    gprev.addEventListener('click',()=>{const e=data()[sel];if(!e.images.length)return;img=(img-1+e.images.length)%e.images.length;paintGallery();});
    gnext.addEventListener('click',()=>{const e=data()[sel];if(!e.images.length)return;img=(img+1)%e.images.length;paintGallery();});
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev` (background) then load `http://localhost:4321/` and scroll to "selected work".
Expected: the list shows **SolShare / Solana Swift SDK / Email Assistant** under Projects and the three real roles under Work Experience; selecting an entry shows its real bullets (with bold + the repo link) in the detail panel; stack chips render; gallery shows the `image — tbd` placeholder (no images yet).

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro
git commit -m "$(cat <<'EOF'
feat(landing): render real résumé entries in the work browser detail panel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Treatment 01 "Editorial ink-in" animation

Swap the `.swap` crossfade for the per-bullet ink-in; trigger it on every selection and once when the section scrolls into view.

**Files:**
- Modify: `src/pages/index.astro` — work CSS (lines 157–166) and inline script (`renderDetail` line 716, plus a reveal observer in the IIFE).

- [ ] **Step 1: Replace the detail CSS block**

Replace lines 157–166 (from `.wdetail{padding-top:2px}` through `.wd-stack span .ic{…}`) with:

```css
  .wdetail{padding-top:2px}
  .wd-idx{color:var(--amber);margin-bottom:12px}
  .wd-name{font-size:clamp(24px,2.9vw,38px);font-weight:540;letter-spacing:-.025em;line-height:1.06}
  .wd-meta{margin-top:9px;color:var(--mute);text-transform:none;letter-spacing:.04em}
  .wd-subtitle{margin-top:8px;font-size:13px;font-style:italic;color:var(--mute);line-height:1.45}
  .rbul{list-style:none;margin:18px 0 0;padding:0}
  .rbullet{position:relative;font-size:14px;line-height:1.6;color:var(--ink);margin-bottom:13px;padding-left:16px}
  .rbullet::before{content:"–";position:absolute;left:0;color:var(--faint)}
  .rbold{font-weight:680;color:var(--ink)}
  .rlink{color:var(--ink);text-decoration:none;background:linear-gradient(var(--amber),var(--amber)) left bottom/100% 1.6px no-repeat;padding-bottom:1px}
  .rlink:hover{color:var(--amber)}
  .wd-stack{margin-top:20px;display:flex;flex-wrap:wrap;gap:9px}
  .wd-stack span{font-family:var(--mono);font-size:12px;border:1px solid var(--rule);border-radius:999px;padding:6px 12px;color:var(--ink);background:var(--paper);display:flex;align-items:center;gap:8px;white-space:nowrap}
  .wd-stack span .ic{width:14px;height:14px;flex-shrink:0;background:var(--ink);-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}

  @keyframes rRise{from{opacity:0;transform:translateY(11px)}to{opacity:1;transform:none}}
  @keyframes rInk{0%{color:var(--mute)}45%{color:var(--amber)}100%{color:var(--ink)}}
  @keyframes rUl{from{background-size:0 1.6px}to{background-size:100% 1.6px}}
  .wdetail.play .rbullet{animation:rRise .6s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:calc(var(--bi)*.11s)}
  .wdetail.play .rbold{animation:rInk .75s ease backwards;animation-delay:calc(var(--bi)*.11s + .12s)}
  .wdetail.play .rlink{animation:rUl .55s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:calc(var(--bi)*.11s + .2s)}
```

(This removes the now-unused `.wdetail>*` transition and `.wdetail.swap>*` rules, and the old `.wd-sub`/`.wd-desc` rules.)

- [ ] **Step 2: Replace `renderDetail` to trigger the ink-in**

Replace `renderDetail` (currently line 716):

```js
    const renderDetail=animate=>{if(animate){wdetail.classList.add('swap');setTimeout(()=>{paint();wdetail.classList.remove('swap');},250);}else paint();};
```

with:

```js
    const renderDetail=animate=>{paint();if(animate){wdetail.classList.remove('play');void wdetail.offsetWidth;wdetail.classList.add('play');}};
```

- [ ] **Step 3: Play the ink-in when the section first scrolls into view**

In the IIFE, just before the closing `})();` (currently line 742), add:

```js
    let workSeen=false;
    new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting&&!workSeen){workSeen=true;renderDetail(true);}});},{threshold:.25}).observe(document.getElementById('work'));
```

- [ ] **Step 4: Verify the motion in the browser**

Run: `npm run dev` (if not already running), load `http://localhost:4321/`, scroll to "selected work".
Expected: bullets rise in line-by-line; **bold** spans flash amber then settle to ink; the repo link draws its amber underline left-to-right. Re-plays when you click a different entry or toggle Projects/Work.

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "$(cat <<'EOF'
feat(landing): Editorial ink-in animation for résumé bullets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] **Run the full test suite:** `npm test` → all pass (Phase 1 tests + new `html.test.ts` + `portfolio-media.test.ts`).
- [ ] **Type-check:** `npm run check` → 0 errors.
- [ ] **Production build:** `npm run build` → completes; `dist/` written.
- [ ] **Résumé generator unaffected:** `npm run resume` → still writes `out/resume.tex` (profile/index untouched).
- [ ] **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, then merge/PR `feat/resume-phase2a-viewer`.

---

## Self-Review (done while writing)

**Spec coverage:** master-detail kept (no code = no timeline ✓); `tokensToHtml` mirror (Task 1); build-time JSON injection (Task 4); privacy boundary (Task 2); portfolio-media layer (Task 3); detail = résumé block with meta/subtitle/bullets/stack (Task 5); Treatment 01 + trigger (Task 6); education excluded via `section` filter (Task 4); images default to placeholder (Tasks 3/5); testing per spec (Tasks 1/3 + Final). Editability/Phase 2B/3 are explicitly out of scope — no tasks, correct.

**Placeholder scan:** every code step has complete code; no TBD/"handle edge cases". Image placeholder is intended behavior, not an unfinished step.

**Type/name consistency:** view-model field names (`title`, `role`, `dateLabel`, `location`, `subtitle`, `link`, `bulletsHtml`, `stack`, `images`, `footnotes`) are produced in Task 4 and consumed verbatim in Task 5. Element ids (`wdmeta`, `wdsubtitle`, `wdbullets`) match between markup (Task 5 Step 1) and refs (Task 5 Step 3). CSS classes (`rbul`, `rbullet`, `rbold`, `rlink`, `wdetail.play`) match between renderer output (`html.ts`, Task 1), markup/JS (Task 5), and CSS (Task 6). `set` keys `projects`/`work` match `WORK[set]` access.
