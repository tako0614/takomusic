import { describe, it, expect, afterEach } from 'vitest';
import {
  isStdlibImport,
  resolveStdlibPath,
  getStdlibDir,
  STDLIB_MODULES,
} from '../utils/stdlib.js';
import * as path from 'path';
import * as fs from 'fs';

describe('stdlib registry', () => {
  // Store original length to detect pollution
  const originalLength = STDLIB_MODULES.length;

  afterEach(() => {
    // Clean up any pollution from tests that modify the const array
    while (STDLIB_MODULES.length > originalLength) {
      (STDLIB_MODULES as any).pop();
    }
  });
  describe('isStdlibImport', () => {
    it('recognizes stdlib imports with std: prefix', () => {
      expect(isStdlibImport('std:theory')).toBe(true);
      expect(isStdlibImport('std:harmony')).toBe(true);
      expect(isStdlibImport('std:rhythm')).toBe(true);
      expect(isStdlibImport('std:core')).toBe(true);
    });

    it('rejects non-stdlib imports', () => {
      expect(isStdlibImport('./local.mf')).toBe(false);
      expect(isStdlibImport('../parent/module.mf')).toBe(false);
      expect(isStdlibImport('/absolute/path.mf')).toBe(false);
      expect(isStdlibImport('theory')).toBe(false);
    });

    it('rejects empty strings', () => {
      expect(isStdlibImport('')).toBe(false);
    });

    it('rejects paths with std: not at start', () => {
      expect(isStdlibImport('./std:theory')).toBe(false);
      expect(isStdlibImport('not-std:theory')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isStdlibImport('std:')).toBe(true);
      expect(isStdlibImport('std::')).toBe(true);
      expect(isStdlibImport('std')).toBe(false);
    });
  });

  describe('resolveStdlibPath', () => {
    it('resolves valid stdlib module paths', () => {
      const theoryPath = resolveStdlibPath('std:theory');
      expect(theoryPath).toContain('lib');
      expect(theoryPath).toContain('theory.mf');
      expect(path.isAbsolute(theoryPath)).toBe(true);
    });

    it('resolves all known stdlib modules', () => {
      for (const module of STDLIB_MODULES) {
        const modulePath = resolveStdlibPath(`std:${module}`);
        expect(modulePath).toContain('lib');
        expect(modulePath).toContain(`${module}.mf`);
        expect(path.isAbsolute(modulePath)).toBe(true);
      }
    });

    it('throws error for non-stdlib imports', () => {
      expect(() => resolveStdlibPath('./local.mf')).toThrow('Not a stdlib import');
      expect(() => resolveStdlibPath('../parent.mf')).toThrow('Not a stdlib import');
      expect(() => resolveStdlibPath('theory')).toThrow('Not a stdlib import');
    });

    it('throws error for unknown stdlib modules', () => {
      expect(() => resolveStdlibPath('std:unknown')).toThrow('Unknown stdlib module');
      expect(() => resolveStdlibPath('std:invalid')).toThrow('Unknown stdlib module');
      expect(() => resolveStdlibPath('std:fake')).toThrow('Unknown stdlib module');
    });

    it('provides helpful error message with available modules', () => {
      try {
        resolveStdlibPath('std:nonexistent');
        expect.fail('Should have thrown an error');
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain('Unknown stdlib module');
        expect(message).toContain('nonexistent');
        expect(message).toContain('Available:');
        expect(message).toContain('theory');
        expect(message).toContain('harmony');
      }
    });

    it('resolves to correct file extension', () => {
      const corePath = resolveStdlibPath('std:core');
      expect(corePath.endsWith('.mf')).toBe(true);
    });

    it('resolves paths in the same directory structure', () => {
      const path1 = resolveStdlibPath('std:theory');
      const path2 = resolveStdlibPath('std:harmony');

      const dir1 = path.dirname(path1);
      const dir2 = path.dirname(path2);

      expect(dir1).toBe(dir2);
    });

    it('throws error for empty module name', () => {
      expect(() => resolveStdlibPath('std:')).toThrow('Unknown stdlib module');
    });

    it('handles module names with special characters correctly', () => {
      expect(() => resolveStdlibPath('std:theory/extra')).toThrow('Unknown stdlib module');
      expect(() => resolveStdlibPath('std:theory.mf')).toThrow('Unknown stdlib module');
    });
  });

  describe('getStdlibDir', () => {
    it('returns an absolute path', () => {
      const stdlibDir = getStdlibDir();
      expect(path.isAbsolute(stdlibDir)).toBe(true);
    });

    it('returns path ending with lib', () => {
      const stdlibDir = getStdlibDir();
      expect(stdlibDir.endsWith('lib')).toBe(true);
    });

    it('returns consistent path across multiple calls', () => {
      const dir1 = getStdlibDir();
      const dir2 = getStdlibDir();
      const dir3 = getStdlibDir();

      expect(dir1).toBe(dir2);
      expect(dir2).toBe(dir3);
    });

    it('returns directory that exists', () => {
      const stdlibDir = getStdlibDir();
      expect(fs.existsSync(stdlibDir)).toBe(true);
      expect(fs.statSync(stdlibDir).isDirectory()).toBe(true);
    });

    it('returns parent directory of resolved module paths', () => {
      const stdlibDir = getStdlibDir();
      const theoryPath = resolveStdlibPath('std:theory');

      expect(path.dirname(theoryPath)).toBe(stdlibDir);
    });
  });

  describe('STDLIB_MODULES constant', () => {
    it('contains expected core modules', () => {
      expect(STDLIB_MODULES).toContain('core');
      expect(STDLIB_MODULES).toContain('theory');
      expect(STDLIB_MODULES).toContain('harmony');
      expect(STDLIB_MODULES).toContain('rhythm');
      expect(STDLIB_MODULES).toContain('melody');
    });

    it('contains algorithmic modules', () => {
      expect(STDLIB_MODULES).toContain('algorithm');
      expect(STDLIB_MODULES).toContain('markov');
      expect(STDLIB_MODULES).toContain('lsystem');
      expect(STDLIB_MODULES).toContain('euclidean');
    });

    it('contains utility modules', () => {
      expect(STDLIB_MODULES).toContain('random');
      expect(STDLIB_MODULES).toContain('prob');
      expect(STDLIB_MODULES).toContain('result');
      expect(STDLIB_MODULES).toContain('time');
    });

    it('contains music domain modules', () => {
      expect(STDLIB_MODULES).toContain('drums');
      expect(STDLIB_MODULES).toContain('lyrics');
      expect(STDLIB_MODULES).toContain('vocal');
      expect(STDLIB_MODULES).toContain('pedal');
    });

    it('contains composition modules', () => {
      expect(STDLIB_MODULES).toContain('counterpoint');
      expect(STDLIB_MODULES).toContain('canon');
      expect(STDLIB_MODULES).toContain('form');
      expect(STDLIB_MODULES).toContain('structure');
    });

    it('contains world music modules', () => {
      expect(STDLIB_MODULES).toContain('gamelan');
      expect(STDLIB_MODULES).toContain('raga');
    });

    it('contains technical modules', () => {
      expect(STDLIB_MODULES).toContain('microtonal');
      expect(STDLIB_MODULES).toContain('tuning');
      expect(STDLIB_MODULES).toContain('spectral');
    });

    it('has no duplicate entries', () => {
      const unique = new Set(STDLIB_MODULES);
      expect(unique.size).toBe(STDLIB_MODULES.length);
    });

    it('contains only lowercase module names', () => {
      for (const module of STDLIB_MODULES) {
        expect(module).toBe(module.toLowerCase());
      }
    });

    it('contains no spaces in module names', () => {
      for (const module of STDLIB_MODULES) {
        expect(module).not.toContain(' ');
      }
    });

    it('is a const array', () => {
      // TypeScript prevents modification at compile time
      // At runtime, it's a regular array, but modifications would break type safety
      expect(Array.isArray(STDLIB_MODULES)).toBe(true);
      expect(STDLIB_MODULES.length).toBeGreaterThan(0);
    });
  });

  describe('module file existence', () => {
    it('all stdlib modules have corresponding files', () => {
      const stdlibDir = getStdlibDir();

      for (const module of STDLIB_MODULES) {
        const modulePath = path.join(stdlibDir, `${module}.mf`);
        expect(fs.existsSync(modulePath), `Module file should exist: ${module}.mf`).toBe(true);
      }
    });

    it('resolved paths point to actual files', () => {
      for (const module of STDLIB_MODULES) {
        const resolvedPath = resolveStdlibPath(`std:${module}`);
        expect(fs.existsSync(resolvedPath), `Resolved path should exist for: std:${module}`).toBe(true);
        expect(fs.statSync(resolvedPath).isFile()).toBe(true);
      }
    });
  });

  describe('import path patterns', () => {
    it('handles common import patterns correctly', () => {
      const patterns = [
        { path: 'std:core', expected: true },
        { path: './local.mf', expected: false },
        { path: '../parent.mf', expected: false },
        { path: 'std:theory', expected: true },
        { path: 'theory', expected: false },
        { path: '/abs/path.mf', expected: false },
        { path: 'std:harmony', expected: true },
      ];

      for (const { path, expected } of patterns) {
        expect(isStdlibImport(path)).toBe(expected);
      }
    });

    it('correctly distinguishes stdlib from relative imports', () => {
      expect(isStdlibImport('std:core')).toBe(true);
      expect(isStdlibImport('./core.mf')).toBe(false);
      expect(isStdlibImport('core')).toBe(false);
    });
  });

  describe('path resolution consistency', () => {
    it('resolves same module to same path', () => {
      const path1 = resolveStdlibPath('std:theory');
      const path2 = resolveStdlibPath('std:theory');
      const path3 = resolveStdlibPath('std:theory');

      expect(path1).toBe(path2);
      expect(path2).toBe(path3);
    });

    it('resolves different modules to different paths', () => {
      const theoryPath = resolveStdlibPath('std:theory');
      const harmonyPath = resolveStdlibPath('std:harmony');
      const rhythmPath = resolveStdlibPath('std:rhythm');

      expect(theoryPath).not.toBe(harmonyPath);
      expect(harmonyPath).not.toBe(rhythmPath);
      expect(rhythmPath).not.toBe(theoryPath);
    });

    it('all resolved paths use same base directory', () => {
      const paths = STDLIB_MODULES.map((mod) => resolveStdlibPath(`std:${mod}`));
      const dirs = paths.map((p) => path.dirname(p));
      const uniqueDirs = new Set(dirs);

      expect(uniqueDirs.size).toBe(1);
    });
  });

  describe('error handling edge cases', () => {
    it('handles malformed import strings', () => {
      expect(() => resolveStdlibPath('std::theory')).toThrow();
      expect(() => resolveStdlibPath('std:theory:extra')).toThrow();
      expect(() => resolveStdlibPath('std:theory/submodule')).toThrow();
    });

    it('provides informative error for case mismatches', () => {
      expect(() => resolveStdlibPath('std:Theory')).toThrow('Unknown stdlib module');
      expect(() => resolveStdlibPath('std:CORE')).toThrow('Unknown stdlib module');
    });

    it('rejects special characters in module names', () => {
      expect(() => resolveStdlibPath('std:theory!')).toThrow();
      expect(() => resolveStdlibPath('std:theory@')).toThrow();
      expect(() => resolveStdlibPath('std:theory#')).toThrow();
    });
  });

  describe('type safety', () => {
    it('module names match StdlibModule type', () => {
      // This test verifies type consistency at runtime
      const moduleSet = new Set(STDLIB_MODULES);

      expect(moduleSet.has('core')).toBe(true);
      expect(moduleSet.has('theory')).toBe(true);
      expect(moduleSet.has('nonexistent' as any)).toBe(false);
    });
  });
});
