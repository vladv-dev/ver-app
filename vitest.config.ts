import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mirror tsconfig's `@/*` -> repo root alias so tests can import like source.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
