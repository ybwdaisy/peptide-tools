import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://peptides.ybwdaisy.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: { build: { sourcemap: false } },
});
