import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.obj'],
  server: {
    port: 5173,
  },
});
