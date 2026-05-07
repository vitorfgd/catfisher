/**
 * Port-readiness checks for the future Meta Horizon Studio build.
 * Execute: npm run check:port
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BrowserAssetManifest } from '../src/platform/AssetManifest';
import { MHS_TEXTURE_PATHS } from '../src/shared/MhsAssetMap';

const repoRoot = process.cwd();

const portableRoots = [
  'src/core',
  'src/shared',
  'src/render',
];

const excludedPortableFiles = new Set([
  'src/render/Canvas2DRenderer.ts',
]);

const forbiddenImportFragments = [
  'meta/',
  'meta\\',
  'src/platform',
  '../platform',
  './platform',
  'vite',
];

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      out.push(...walkTsFiles(abs));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.test.ts')) continue;
    out.push(abs);
  }
  return out;
}

function checkPortableImports(): string[] {
  const failures: string[] = [];
  for (const root of portableRoots) {
    const absRoot = join(repoRoot, root);
    if (!existsSync(absRoot)) continue;
    for (const absFile of walkTsFiles(absRoot)) {
      const rel = normalizePath(relative(repoRoot, absFile));
      if (excludedPortableFiles.has(rel)) continue;

      const source = readFileSync(absFile, 'utf8');
      const importSpecs = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
      const sideEffectImports = [...source.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const specifier of [...importSpecs, ...sideEffectImports]) {
        const normalized = normalizePath(specifier);
        if (forbiddenImportFragments.some((fragment) => normalized.includes(fragment))) {
          failures.push(`${rel} imports forbidden platform module "${specifier}"`);
        }
      }
    }
  }
  return failures;
}

function checkAssetMap(): string[] {
  const failures: string[] = [];
  const browserIds = Object.keys(BrowserAssetManifest.images).sort();
  const mhsIds = Object.keys(MHS_TEXTURE_PATHS).sort();
  const mhsSet = new Set(mhsIds);

  for (const id of browserIds) {
    if (!mhsSet.has(id)) {
      failures.push(`Missing MHS texture mapping for browser asset "${id}"`);
    }
  }

  for (const [id, path] of Object.entries(MHS_TEXTURE_PATHS)) {
    if (!path.startsWith('@sprites/')) {
      failures.push(`MHS texture mapping for "${id}" must start with @sprites/: ${path}`);
    }
  }

  return failures;
}

const failures = [
  ...checkPortableImports(),
  ...checkAssetMap(),
];

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[check-port] ${failure}`);
  }
  process.exit(1);
}

console.log('[check-port] OK');
