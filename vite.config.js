import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { writeSeoPages } from './seo/pages.mjs';

/**
 * Builds:
 *   npm run build              GitHub Pages (https://mjaffry01.github.io/mindsuiteImagination)
 *   npm run build:mindsuite    https://dev.mindsuite.in, served from the domain root
 * SITE_URL, if set, overrides the public address either way.
 */
const SITES = { mindsuite: 'https://dev.mindsuite.in' };

/** Hosts the page may load from or talk to, besides its own. */
const IMAGE_HOSTS = ['https://www.mindsuite.in']; // team photos
const originOf = (url) => {
  try {
    return /^https?:\/\//.test(url) ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

/**
 * Content Security Policy: only this site's own scripts run, nothing can be framed or posted
 * elsewhere. Styles allow 'unsafe-inline' because the pre-rendered pages carry a small
 * <style> block and inline colours; no script can be injected through them.
 */
function contentSecurityPolicy(env) {
  const connect = ["'self'", ...[env.VITE_ENQUIRY_URL, env.VITE_ASSISTANT_URL].map(originOf).filter(Boolean)];
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${[...new Set(connect)].join(' ')}`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * Security in two layers:
 *   - <meta> tags in every page: CSP and referrer policy (all a static host such as GitHub
 *     Pages allows)
 *   - a _headers file with the full set as real HTTP headers, including anti-framing, which
 *     Cloudflare Pages applies automatically. Other hosts ignore it; see SECURITY-HEADERS.md.
 */
function securityHeaders(env) {
  const csp = contentSecurityPolicy(env);
  let outDir = 'dist';
  return {
    name: 'security-headers',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ],
    closeBundle() {
      const headers = {
        'Content-Security-Policy': `${csp}; frame-ancestors 'none'`,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Cross-Origin-Opener-Policy': 'same-origin',
      };
      const lines = Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`);
      writeFileSync(join(outDir, '_headers'), `/*\n${lines.join('\n')}\n`);
    },
  };
}

/**
 * GitHub Pages only serves real files. After the build, seo/pages.mjs writes a page for every
 * readable address (/ai-for-business, /team, /offerings/<name>, /privacy …) with its own title,
 * description, canonical URL, link-preview tags, structured data and readable content, plus
 * sitemap.xml, robots.txt and 404.html (which catches anything else, such as /careers/<role>).
 */
function seoPages(env, site) {
  let outDir = 'dist';
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const deployment = { server: Boolean(env.VITE_ENQUIRY_URL), remoteGuide: Boolean(env.VITE_ASSISTANT_URL) };
      const count = await writeSeoPages({ root: process.cwd(), outDir, site, deployment });
      console.log(`  seo: wrote ${count} pages, sitemap.xml and robots.txt for ${site || 'the default site'}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = process.env.SITE_URL || SITES[mode];
  return {
    plugins: [react(), securityHeaders(env), seoPages(env, site)],
    // During development, /api requests go to the enquiry server (npm run server).
    server: { proxy: { '/api': 'http://localhost:8787' } },
  };
});
