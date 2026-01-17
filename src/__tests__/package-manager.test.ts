import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  normalizeUrl,
  urlToCachePath,
  hashContent,
  loadLockFile,
  saveLockFile,
  isCached,
  type PackageLock,
} from '../package/manager.js';

describe('Package Manager', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = path.join(
      os.tmpdir(),
      `mf-pkg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('normalizeUrl', () => {
    it('passes through full HTTPS URLs', () => {
      const url = 'https://example.com/lib.mf';
      expect(normalizeUrl(url)).toBe(url);
    });

    it('passes through full HTTP URLs', () => {
      const url = 'http://example.com/lib.mf';
      expect(normalizeUrl(url)).toBe(url);
    });

    it('converts GitHub shorthand to raw URL', () => {
      const shorthand = 'github.com/user/repo/lib/chords.mf';
      const result = normalizeUrl(shorthand);

      expect(result).toContain('raw.githubusercontent.com');
      expect(result).toContain('/user/repo/');
      expect(result).toContain('/main/');
      expect(result).toContain('lib/chords.mf');
    });

    it('handles GitHub shorthand without file path', () => {
      const shorthand = 'github.com/user/repo';
      const result = normalizeUrl(shorthand);

      expect(result).toContain('raw.githubusercontent.com');
      expect(result).toContain('lib/index.mf');
    });

    it('converts GitLab shorthand to raw URL', () => {
      const shorthand = 'gitlab.com/user/repo/lib/chords.mf';
      const result = normalizeUrl(shorthand);

      expect(result).toContain('gitlab.com');
      expect(result).toContain('/-/raw/main/');
      expect(result).toContain('lib/chords.mf');
    });

    it('handles GitLab shorthand without file path', () => {
      const shorthand = 'gitlab.com/user/repo';
      const result = normalizeUrl(shorthand);

      expect(result).toContain('lib/index.mf');
    });

    it('passes through relative paths unchanged', () => {
      const relativePath = './lib/utils.mf';
      expect(normalizeUrl(relativePath)).toBe(relativePath);
    });

    it('passes through standard library imports', () => {
      const stdImport = 'std:arrays';
      expect(normalizeUrl(stdImport)).toBe(stdImport);
    });
  });

  describe('urlToCachePath', () => {
    it('creates deterministic cache path for URL', () => {
      const url = 'https://example.com/lib/chords.mf';
      const path1 = urlToCachePath(tempDir, url);
      const path2 = urlToCachePath(tempDir, url);

      expect(path1).toBe(path2);
    });

    it('includes cache directory in path', () => {
      const url = 'https://example.com/lib/chords.mf';
      const cachePath = urlToCachePath(tempDir, url);

      expect(cachePath).toContain('.mf_cache');
    });

    it('includes hostname in path', () => {
      const url = 'https://example.com/lib/chords.mf';
      const cachePath = urlToCachePath(tempDir, url);

      expect(cachePath).toContain('example.com');
    });

    it('includes filename in path', () => {
      const url = 'https://example.com/lib/chords.mf';
      const cachePath = urlToCachePath(tempDir, url);

      expect(cachePath).toContain('chords.mf');
    });

    it('creates different paths for different URLs', () => {
      const url1 = 'https://example.com/lib/chords.mf';
      const url2 = 'https://example.com/lib/scales.mf';
      const path1 = urlToCachePath(tempDir, url1);
      const path2 = urlToCachePath(tempDir, url2);

      expect(path1).not.toBe(path2);
    });

    it('handles URLs with query parameters', () => {
      const url = 'https://example.com/lib.mf?version=1.0';
      const cachePath = urlToCachePath(tempDir, url);

      expect(cachePath).toBeDefined();
      expect(cachePath).toContain('.mf_cache');
    });
  });

  describe('hashContent', () => {
    it('generates SHA256 hash', () => {
      const content = 'test content';
      const hash = hashContent(content);

      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates same hash for same content', () => {
      const content = 'test content';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);

      expect(hash1).toBe(hash2);
    });

    it('generates different hash for different content', () => {
      const hash1 = hashContent('content 1');
      const hash2 = hashContent('content 2');

      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
      const hash = hashContent('');
      expect(hash).toHaveLength(64);
    });

    it('handles unicode content', () => {
      const hash = hashContent('こんにちは 🎵');
      expect(hash).toHaveLength(64);
    });
  });

  describe('loadLockFile', () => {
    it('returns empty lock when file does not exist', () => {
      const lock = loadLockFile(tempDir);

      expect(lock.version).toBe(1);
      expect(lock.packages).toEqual({});
    });

    it('loads existing lock file', () => {
      const lockData: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      const lockPath = path.join(tempDir, 'mf.lock');
      fs.writeFileSync(lockPath, JSON.stringify(lockData), 'utf-8');

      const lock = loadLockFile(tempDir);
      expect(lock.packages).toHaveProperty('https://example.com/lib.mf');
      expect(lock.packages['https://example.com/lib.mf'].hash).toBe('abc123');
    });

    it('returns empty lock on corrupted file', () => {
      const lockPath = path.join(tempDir, 'mf.lock');
      fs.writeFileSync(lockPath, 'invalid json{', 'utf-8');

      const lock = loadLockFile(tempDir);
      expect(lock.version).toBe(1);
      expect(lock.packages).toEqual({});
    });
  });

  describe('saveLockFile', () => {
    it('creates lock file', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);

      const lockPath = path.join(tempDir, 'mf.lock');
      expect(fs.existsSync(lockPath)).toBe(true);
    });

    it('saves lock file with correct content', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);

      const lockPath = path.join(tempDir, 'mf.lock');
      const content = fs.readFileSync(lockPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe(1);
      expect(parsed.packages).toHaveProperty('https://example.com/lib.mf');
    });

    it('formats lock file with indentation', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);

      const lockPath = path.join(tempDir, 'mf.lock');
      const content = fs.readFileSync(lockPath, 'utf-8');

      expect(content).toContain('  '); // Should have indentation
      expect(content).toContain('\n'); // Should have newlines
    });

    it('overwrites existing lock file', () => {
      const lockPath = path.join(tempDir, 'mf.lock');
      fs.writeFileSync(lockPath, 'old content', 'utf-8');

      const lock: PackageLock = {
        version: 1,
        packages: {},
      };

      saveLockFile(tempDir, lock);

      const content = fs.readFileSync(lockPath, 'utf-8');
      expect(content).not.toContain('old content');
      expect(content).toContain('"version": 1');
    });
  });

  describe('isCached', () => {
    it('returns false when package not cached', () => {
      const url = 'https://example.com/lib.mf';
      expect(isCached(tempDir, url)).toBe(false);
    });

    it('returns true when package is cached', () => {
      const url = 'https://example.com/lib.mf';
      const cachePath = urlToCachePath(tempDir, url);

      // Create cache directory and file
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, 'cached content', 'utf-8');

      expect(isCached(tempDir, url)).toBe(true);
    });

    it('handles GitHub shorthand', () => {
      const shorthand = 'github.com/user/repo/lib/chords.mf';
      expect(isCached(tempDir, shorthand)).toBe(false);
    });
  });

  describe('cache directory structure', () => {
    it('creates nested cache directory structure', () => {
      const url = 'https://example.com/deep/path/to/lib.mf';
      const cachePath = urlToCachePath(tempDir, url);

      // Create the cache file
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, 'content', 'utf-8');

      expect(fs.existsSync(cachePath)).toBe(true);
    });

    it('isolates packages by hostname', () => {
      const url1 = 'https://example.com/lib.mf';
      const url2 = 'https://other.com/lib.mf';

      const path1 = urlToCachePath(tempDir, url1);
      const path2 = urlToCachePath(tempDir, url2);

      expect(path1).toContain('example.com');
      expect(path2).toContain('other.com');
      expect(path1).not.toContain('other.com');
      expect(path2).not.toContain('example.com');
    });
  });

  describe('package entry metadata', () => {
    it('includes URL in package entry', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      expect(loaded.packages['https://example.com/lib.mf'].url).toBe(
        'https://example.com/lib.mf'
      );
    });

    it('includes hash in package entry', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123def456',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      expect(loaded.packages['https://example.com/lib.mf'].hash).toBe(
        'abc123def456'
      );
    });

    it('includes timestamp in package entry', () => {
      const timestamp = '2024-01-01T12:30:45.000Z';
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib.mf': {
            url: 'https://example.com/lib.mf',
            hash: 'abc123',
            fetchedAt: timestamp,
          },
        },
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      expect(loaded.packages['https://example.com/lib.mf'].fetchedAt).toBe(
        timestamp
      );
    });
  });

  describe('multiple packages', () => {
    it('handles multiple packages in lock file', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://example.com/lib1.mf': {
            url: 'https://example.com/lib1.mf',
            hash: 'hash1',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
          'https://example.com/lib2.mf': {
            url: 'https://example.com/lib2.mf',
            hash: 'hash2',
            fetchedAt: '2024-01-02T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      expect(Object.keys(loaded.packages)).toHaveLength(2);
      expect(loaded.packages).toHaveProperty('https://example.com/lib1.mf');
      expect(loaded.packages).toHaveProperty('https://example.com/lib2.mf');
    });

    it('maintains package order', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {
          'https://c.com/lib.mf': {
            url: 'https://c.com/lib.mf',
            hash: 'hash1',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
          'https://a.com/lib.mf': {
            url: 'https://a.com/lib.mf',
            hash: 'hash2',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
          'https://b.com/lib.mf': {
            url: 'https://b.com/lib.mf',
            hash: 'hash3',
            fetchedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      const keys = Object.keys(loaded.packages);
      expect(keys).toEqual([
        'https://c.com/lib.mf',
        'https://a.com/lib.mf',
        'https://b.com/lib.mf',
      ]);
    });
  });

  describe('lock file versioning', () => {
    it('includes version number', () => {
      const lock = loadLockFile(tempDir);
      expect(lock.version).toBe(1);
    });

    it('preserves version when saving', () => {
      const lock: PackageLock = {
        version: 1,
        packages: {},
      };

      saveLockFile(tempDir, lock);
      const loaded = loadLockFile(tempDir);

      expect(loaded.version).toBe(1);
    });
  });
});
