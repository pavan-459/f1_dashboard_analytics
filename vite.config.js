import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Component + integration tests only; unit tests run under Jasmine (spec/).
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      // transforms/ and data/ are measured by c8 over the Jasmine run.
      exclude: ['src/main.jsx', 'src/transforms/**', 'src/data/**'],
    },
  },
});
