# personal_portfolio

Personal portfolio site — Paper aesthetic. Built with **Astro 5 + React + TypeScript**, MDX-backed project pages, deployed as a static build to **Cloudflare Pages**.

## Stack

- **Astro 5** — static-first, page routing, content collections
- **React 19** — used for the `ProjectPage` layout (server-rendered, no client JS shipped). Available as an island for future interactive components.
- **MDX** (`@astrojs/mdx`) — project write-ups live as `.mdx` files in `src/content/projects/`
- **TypeScript** — strict mode (`astro check` clean)
- **Vanilla CSS** — design tokens in `src/styles/global.css`; component-scoped styles in `*.css` siblings or `<style>` blocks on `.astro` components

## Run

```bash
npm install
npm run dev          # localhost:4321
npm run build        # → dist/
npm run preview      # serve dist/ locally
npm run check        # astro check (types + diagnostics)
```

## Structure

```
src/
├── components/
│   ├── ProjectPage.tsx       — React: blog-style layout for a project page
│   │   ProjectPage.css         (header, meta, body slot, foot nav)
│   └── illustrations/
│       ├── ContextAssembly.astro  — FIG. sources → context window (with traveling dot)
│       ├── CausalAttention.astro  — FIG. 8×8 causal attention grid (with diagonal scan)
│       └── EverydayCraft.astro    — FIG. ui → service → data sketch
├── content/
│   └── projects/
│       ├── project-alpha.mdx   ← placeholder template, year 2025
│       ├── project-beta.mdx    ← placeholder template, year 2024
│       └── project-gamma.mdx   ← placeholder template, year 2023
├── content.config.ts         — projects collection schema (zod)
├── layouts/
│   └── Base.astro            — html shell, font preconnects, global.css import
├── pages/
│   ├── index.astro           — home: hero · Currently (3 beats) · work · about
│   └── work/
│       └── [...slug].astro   — dynamic route → renders ProjectPage with MDX body
└── styles/
    └── global.css            — design tokens (paper/ink/serif/sans/mono) + reset

public/
├── favicon.svg               — orbital-mark placeholder, swap for your own
└── resume.pdf                — DROP YOUR RESUME HERE (not committed)
```

## How content flows

1. **Add a project**: drop `src/content/projects/[your-slug].mdx` with frontmatter (title, summary, year, role, stack, status, links). Optional: `order`, `draft`.
2. The home page (`src/pages/index.astro`) reads the collection at build time, sorts by `order` then by year desc, and renders the work list.
3. The dynamic route (`src/pages/work/[...slug].astro`) generates a static page per project and pipes the MDX body into `<ProjectPage>` as `children`.
4. Adjacent-project navigation (prev / next) is computed at build time from the sorted list.

## Placeholders to replace

Search for `[` to find every bracket placeholder. The hit list:

- `[Your Name]` — in `Base.astro` defaults, `index.astro` topline + hero + about
- `[city]`, `[you@email.com]`, `[@yourhandle]` — `index.astro`
- Hero h1 + sub copy — `index.astro`
- The three Currently beats (titles + bodies) — `index.astro`
- The two paragraphs in About — `index.astro`
- `[Project Alpha/Beta/Gamma]` — `src/content/projects/*.mdx` frontmatter + bodies
- `public/resume.pdf` — drop your actual file
- `public/favicon.svg` — swap with your own mark

The three FIG. illustrations under `src/components/illustrations/` are scaffolding-level — they convey the *kind* of thing each beat is about (context plumbing / attention / stack). Swap or refine them when you have a clearer story to tell.

## Adding interactivity

The site ships zero client JS today (React components render server-side, illustrations are pure SVG + CSS/SMIL animations). To add a client island:

- Drop a `.tsx` component, import in any `.astro` page, add a `client:*` directive (`client:load`, `client:visible`, `client:idle`).
- Reuse `ProjectPage`: it's a pure presentational component. Wrap it in an Astro page; pass `data` + `<Content />` as children.

## Deploy (Cloudflare Pages)

Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 20+

Static output — no adapter needed. CF Pages serves with smart caching automatically (hashed asset filenames bust on rebuild).

## Roadmap (from the original notes)

- [x] Sleek UI design (Paper)
- [x] Mobile-friendly interface
- [x] Opinionated animations (cursor blink, node pulse, traveling curve dot, scroll-anchored row→plane sync)
- [x] Smart caching (free with CF Pages static)
- [x] Blog post-esque project explanations (`ProjectPage` + MDX content collection)
- [ ] Drop your `resume.pdf` into `public/`
- [ ] LaTeX resume source — separate repo or `/resume/` source folder

## Reference

`aesthetic-playground.html` at the repo root is the original design playground with all 5 variants. Safe to delete once you're happy with this build.
