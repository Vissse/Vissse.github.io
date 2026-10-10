import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server answers every unknown path with the app's index.html, so
// /privacy/ (a static page in public/) would show the app. Production hosts
// serve the directory index themselves.
const staticPages: Plugin = {
  name: 'static-pages',
  configureServer(server) {
    server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
      if (req.url === '/privacy' || req.url === '/privacy/') req.url = '/privacy/index.html';
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), staticPages],
  resolve: { alias: { '@': '/src' } },
});
