// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// Static site — the paper landing page (src/pages/index.astro) plus the dark
// WebGL second site (src/pages/3d.astro).
export default defineConfig({
  output: 'static',
  // the 3D mode briefly shipped as /studio — keep the old URL working
  redirects: { '/studio': '/3d' },
});
