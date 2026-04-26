import { defineConfig } from 'vite';

// GitHub Actions sets GITHUB_BASE: "/" for <user>.github.io, else "/<repo>/" for project pages
const defaultBase = './';
const fromEnv = process.env['GITHUB_BASE']?.trim();
const base = fromEnv && fromEnv.length > 0 ? fromEnv : defaultBase;

export default defineConfig({
  base,
  resolve: {
    // Prevents Vite from spawning cmd.exe to resolve symlinks on Windows (spawn EPERM fix)
    preserveSymlinks: true,
  },
  server: {
    port: Number(process.env['PORT'] ?? 5173),
  },
});
