import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Same rule as slugify() in src/hooks/useRoute.js: "Software & Product" → "software-product".
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Every readable address the app knows: sections, families and each offering. */
function sitePaths() {
  const catalogue = JSON.parse(readFileSync('src/data/catalogue.json', 'utf8'));
  return [
    'offerings',
    'platforms',
    'clients',
    'team',
    'careers',
    ...catalogue.map((f) => slugify(f.short)),
    ...catalogue.flatMap((f) => f.areas.flatMap((a) => a.offerings.map((o) => `offerings/${slugify(o.name)}`))),
  ];
}

/**
 * GitHub Pages only serves real files. The build copies index.html to <path>/index.html for
 * every readable address (/ai-for-business, /team, /offerings/<name> …) so they open with a
 * normal 200 response, which link previews on LinkedIn and WhatsApp need. 404.html (also a
 * copy) catches anything else, such as /careers/<role>, and the app opens the right view.
 */
function staticAddresses() {
  let outDir = 'dist';
  return {
    name: 'static-addresses',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const index = join(outDir, 'index.html');
      copyFileSync(index, join(outDir, '404.html'));
      for (const path of sitePaths()) {
        mkdirSync(join(outDir, path), { recursive: true });
        copyFileSync(index, join(outDir, path, 'index.html'));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), staticAddresses()],
  // During development, /api requests go to the enquiry server (npm run server).
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
