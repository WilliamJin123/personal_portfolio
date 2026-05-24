import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Projects collection — backs both the home page work list AND
 * the dynamic /work/[slug] pages.
 *
 * To add a project: drop a new `.mdx` file in src/content/projects/.
 * Required frontmatter is validated below.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    /** "work" = employment / coop / role · "project" = personal side project */
    type: z.enum(['work', 'project']).default('project'),
    /** For work: company name. For project: project name. (The big text on the card.) */
    title: z.string(),
    /** For work: job title / role description. For project: contributor role. */
    role: z.string(),
    summary: z.string(),
    /** Single year or date range, e.g. "2025" or "Summer 2024". */
    year: z.string(),
    stack: z.array(z.string()),
    status: z.enum(['shipped', 'in-progress', 'sunset']).optional(),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .optional(),
    /** Hero image for the detail panel. Omit for an automatic placeholder. */
    hero: z
      .object({
        src: z.string().optional(),
        alt: z.string().optional(),
        aspect: z.string().default('16/9')
      })
      .optional(),
    draft: z.boolean().optional(),
    /** Sort order within section; lower numbers appear first. Defaults to year desc. */
    order: z.number().optional(),
    /** Short marginalia displayed in the right gutter of the home codex. Italic, conversational. */
    note: z.string().optional()
  })
});

export const collections = { projects };
