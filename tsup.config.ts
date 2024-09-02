import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/electron/consts.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
});
