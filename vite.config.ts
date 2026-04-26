import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    // Prevents Vite from spawning cmd.exe to resolve symlinks on Windows (spawn EPERM fix)
    preserveSymlinks: true,
  },
  server: {
    port: Number(process.env['PORT'] ?? 5173),
  },
});
