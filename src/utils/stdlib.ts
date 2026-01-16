// Standard library path resolution
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package root (where lib/ is located)
const packageRoot = path.resolve(__dirname, '..', '..');

// Available standard library modules
export const STDLIB_MODULES = [
  'algorithm',
  'articulations',
  'autogen',
  'canon',
  'cluster',
  'constraint',
  'core',
  'counterpoint',
  'curves',
  'drums',
  'dynamics',
  'effects',
  'euclidean',
  'expression',
  'form',
  'gamelan',
  'harmony',
  'instrument',
  'lsystem',
  'lyrics',
  'markov',
  'melody',
  'metadata',
  'microtonal',
  'modulation',
  'motif',
  'notation',
  'orchestration',
  'ornament',
  'pedal',
  'prob',
  'raga',
  'random',
  'result',
  'rhythm',
  'routing',
  'serial',
  'spatial',
  'spectral',
  'structure',
  'sync',
  'texture',
  'theory',
  'time',
  'transform',
  'tuning',
  'tuplet',
  'vocal',
] as const;

export type StdlibModule = typeof STDLIB_MODULES[number];

/**
 * Check if an import path is a standard library import
 * @param importPath The import path (e.g., "std:theory" or "./local.mf")
 */
export function isStdlibImport(importPath: string): boolean {
  return importPath.startsWith('std:');
}

/**
 * Resolve a standard library import to its file path
 * @param importPath The import path (e.g., "std:theory")
 * @returns The absolute path to the stdlib module file
 */
export function resolveStdlibPath(importPath: string): string {
  if (!isStdlibImport(importPath)) {
    throw new Error(`Not a stdlib import: ${importPath}`);
  }

  const moduleName = importPath.slice(4); // Remove "std:" prefix

  if (!STDLIB_MODULES.includes(moduleName as StdlibModule)) {
    throw new Error(`Unknown stdlib module: ${moduleName}. Available: ${STDLIB_MODULES.join(', ')}`);
  }

  return path.join(packageRoot, 'lib', `${moduleName}.mf`);
}

/**
 * Get the standard library directory path
 */
export function getStdlibDir(): string {
  return path.join(packageRoot, 'lib');
}
