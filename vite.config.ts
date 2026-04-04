import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defaultSiteUrl = 'https://pzarzycki.github.io/artemis-2/';
  const defaultSourceUrl = 'https://github.com/pzarzycki/artemis-2';
  const base = command === 'build' ? env.VITE_BASE_PATH || '/artemis-2/' : '/';
  const siteUrl = (env.VITE_APP_URL || defaultSiteUrl).replace(/\/?$/, '/');
  const sourceUrl = env.VITE_SOURCE_URL || defaultSourceUrl;

  return {
    base,
    plugins: [
      react(),
      {
        name: 'project-html-meta',
        transformIndexHtml(html) {
          return html
            .replaceAll('__APP_URL__', siteUrl)
            .replaceAll('__SOURCE_URL__', sourceUrl);
        },
      },
    ],
    cacheDir: '/tmp/artemis-2-vite-cache',
    assetsInclude: ['**/*.gltf', '**/*.glb'],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three/')) return 'three';
            if (id.includes('@react-three/')) return 'r3f';
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  };
});
