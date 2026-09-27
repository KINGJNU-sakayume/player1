import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * `VITE_BASE_PATH` lets the same build run at the domain root (`/`) or under a
 * sub-path such as GitHub Pages (`/player1/`). Vite exposes the normalised value
 * to the app as `import.meta.env.BASE_URL`, which the router and the OAuth
 * redirect default both use.
 */
function normaliseBase(raw: string | undefined): string {
  const value = (raw ?? '/').trim();
  if (value === '' || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: normaliseBase(env.VITE_BASE_PATH),
    plugins: [react()],
    // Spotify no longer accepts `localhost` redirect URIs; the loopback IP literal
    // is allowed, so the dev server binds to it explicitly.
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
