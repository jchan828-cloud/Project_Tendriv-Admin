import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Next's tsconfig sets jsx:preserve, which Vite would otherwise inherit and
  // fail to parse in .tsx tests — the react plugin owns the JSX transform.
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
});
