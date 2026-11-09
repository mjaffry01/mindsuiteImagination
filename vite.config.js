import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeSeoPages } from './seo/pages.mjs';

/**
 * GitHub Pages only serves real files. After the build, seo/pages.mjs writes a page for every
 * readable address (/ai-for-business, /team, /offerings/<name> …) with its own title,
 * description, canonical URL, link-preview tags, structured data and readable content, plus
 * sitemap.xml, robots.txt and 404.html (which catches anything else, such as /careers/<role>).
 */
function seoPages() {
  let outDir = 'dist';
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const count = await writeSeoPages({ root: process.cwd(), outDir });
      console.log(`  seo: wrote ${count} pages, sitemap.xml and robots.txt`);
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPages()],
  // During development, /api requests go to the enquiry server (npm run server).
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
