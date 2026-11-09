import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages only knows index.html. Readable addresses such as /ai-for-business or /careers
 * are handled in the app, so the build also writes 404.html (a copy of index.html): Pages serves
 * it for any unknown path, and the app opens the matching section.
 */
function spaFallback() {
  let outDir = 'dist';
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  // During development, /api requests go to the enquiry server (npm run server).
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
