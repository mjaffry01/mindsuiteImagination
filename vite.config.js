import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // During development, /api requests go to the enquiry server (npm run server).
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
