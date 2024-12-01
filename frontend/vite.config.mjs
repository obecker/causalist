import eslintPlugin from '@nabla/vite-plugin-eslint';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// noinspection JSUnusedGlobalSymbols
export default defineConfig(() => {
  const leadingZero = (v) => v.toString().padStart(2, '0');
  const today = new Date();
  const buildNo = `v${today.getFullYear()}${leadingZero(today.getMonth() + 1)}${leadingZero(today.getDate())}`;

  return {
    build: {
      outDir: 'build',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          404: resolve(__dirname, '404.html'),
        },
      },
      commonjsOptions: {
        // see https://github.com/rollup/plugins/tree/master/packages/commonjs#strictrequires
        // the default 'strictRequires: true' increases the bundle size,
        // so let's use 'debug' to get a warning if there are any potential issues with 'auto'
        strictRequires: 'debug',
      },
    },
    plugins: [
      react(),
      // disable eslint plugin for tests
      // vitest issue: https://github.com/vitest-dev/vitest/issues/2008
      process.env.NODE_ENV !== 'test' && eslintPlugin(),
    ],
    server: {
      host: true, // make the server accessible in the local network
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': 'http://localhost:4000',
      },
    },
    define: {
      BUILD_NUMBER: JSON.stringify(buildNo),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: 'test/setup.js',
    },
  };
});
