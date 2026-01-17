import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { installCommand } from '../cli/commands/install.js';
import { ExitCodes } from '../errors.js';
import * as packageManager from '../package/manager.js';

describe('install command - Smoke Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `mf-install-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('help and usage', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await installCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('shows help with -h flag', async () => {
      const exitCode = await installCommand(['-h']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('shows help when no arguments provided', async () => {
      const exitCode = await installCommand([]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('add subcommand', () => {
    it('fails when no URL specified', async () => {
      const exitCode = await installCommand(['add']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('accepts URL as direct argument', async () => {
      // Mock the installPackage function
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://example.com/test.mf',
        hash: 'abc123def456',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      const exitCode = await installCommand(['https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(packageManager.installPackage).toHaveBeenCalled();
    });

    it('accepts URL with add subcommand', async () => {
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://example.com/test.mf',
        hash: 'abc123def456',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      const exitCode = await installCommand(['add', 'https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles multiple URLs', async () => {
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://example.com/test.mf',
        hash: 'abc123def456',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      const exitCode = await installCommand([
        'https://example.com/test1.mf',
        'https://example.com/test2.mf',
      ]);

      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(packageManager.installPackage).toHaveBeenCalledTimes(2);
    });

    it('handles GitHub shorthand URLs', async () => {
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://raw.githubusercontent.com/user/repo/main/lib/test.mf',
        hash: 'abc123def456',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      const exitCode = await installCommand(['github.com/user/repo/lib/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('skips already cached packages', async () => {
      vi.spyOn(packageManager, 'isCached').mockReturnValue(true);

      const exitCode = await installCommand(['https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles installation errors gracefully', async () => {
      vi.spyOn(packageManager, 'installPackage').mockRejectedValue(
        new Error('Network error')
      );

      const exitCode = await installCommand(['https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('reports partial success when some packages fail', async () => {
      let callCount = 0;
      vi.spyOn(packageManager, 'installPackage').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            url: 'https://example.com/test1.mf',
            hash: 'abc123',
            path: path.join(tempDir, '.mf_cache', 'test1.mf'),
          };
        } else {
          throw new Error('Failed to fetch');
        }
      });

      const exitCode = await installCommand([
        'https://example.com/test1.mf',
        'https://example.com/test2.mf',
      ]);

      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });
  });

  describe('remove subcommand', () => {
    it('fails when no URL specified', async () => {
      const exitCode = await installCommand(['remove']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('removes specified package', async () => {
      vi.spyOn(packageManager, 'removePackage').mockReturnValue(true);

      const exitCode = await installCommand(['remove', 'https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(packageManager.removePackage).toHaveBeenCalled();
    });

    it('accepts rm as alias', async () => {
      vi.spyOn(packageManager, 'removePackage').mockReturnValue(true);

      const exitCode = await installCommand(['rm', 'https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles non-existent package', async () => {
      vi.spyOn(packageManager, 'removePackage').mockReturnValue(false);

      const exitCode = await installCommand(['remove', 'https://example.com/nonexistent.mf']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles multiple removals', async () => {
      vi.spyOn(packageManager, 'removePackage').mockReturnValue(true);

      const exitCode = await installCommand([
        'remove',
        'https://example.com/test1.mf',
        'https://example.com/test2.mf',
      ]);

      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(packageManager.removePackage).toHaveBeenCalledTimes(2);
    });
  });

  describe('list subcommand', () => {
    it('lists installed packages', async () => {
      vi.spyOn(packageManager, 'listPackages').mockReturnValue([
        {
          url: 'https://example.com/test.mf',
          hash: 'abc123def456',
          fetchedAt: '2024-01-01T00:00:00Z',
        },
      ]);

      const exitCode = await installCommand(['list']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(packageManager.listPackages).toHaveBeenCalled();
    });

    it('accepts ls as alias', async () => {
      vi.spyOn(packageManager, 'listPackages').mockReturnValue([]);

      const exitCode = await installCommand(['ls']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles empty package list', async () => {
      vi.spyOn(packageManager, 'listPackages').mockReturnValue([]);

      const exitCode = await installCommand(['list']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('displays multiple packages', async () => {
      vi.spyOn(packageManager, 'listPackages').mockReturnValue([
        {
          url: 'https://example.com/test1.mf',
          hash: 'abc123',
          fetchedAt: '2024-01-01T00:00:00Z',
        },
        {
          url: 'https://example.com/test2.mf',
          hash: 'def456',
          fetchedAt: '2024-01-02T00:00:00Z',
        },
      ]);

      const exitCode = await installCommand(['list']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('verify subcommand', () => {
    it('verifies all packages successfully', async () => {
      vi.spyOn(packageManager, 'verifyPackages').mockResolvedValue({
        valid: ['https://example.com/test.mf'],
        invalid: [],
        missing: [],
      });

      const exitCode = await installCommand(['verify']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('reports invalid packages', async () => {
      vi.spyOn(packageManager, 'verifyPackages').mockResolvedValue({
        valid: [],
        invalid: ['https://example.com/modified.mf'],
        missing: [],
      });

      const exitCode = await installCommand(['verify']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('reports missing packages', async () => {
      vi.spyOn(packageManager, 'verifyPackages').mockResolvedValue({
        valid: [],
        invalid: [],
        missing: ['https://example.com/missing.mf'],
      });

      const exitCode = await installCommand(['verify']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles mixed results', async () => {
      vi.spyOn(packageManager, 'verifyPackages').mockResolvedValue({
        valid: ['https://example.com/valid.mf'],
        invalid: ['https://example.com/invalid.mf'],
        missing: ['https://example.com/missing.mf'],
      });

      const exitCode = await installCommand(['verify']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });
  });

  describe('update subcommand', () => {
    it('updates all packages successfully', async () => {
      vi.spyOn(packageManager, 'updatePackages').mockResolvedValue({
        updated: ['https://example.com/test.mf'],
        failed: [],
      });

      const exitCode = await installCommand(['update']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles update failures', async () => {
      vi.spyOn(packageManager, 'updatePackages').mockResolvedValue({
        updated: [],
        failed: ['https://example.com/test.mf'],
      });

      const exitCode = await installCommand(['update']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles partial success', async () => {
      vi.spyOn(packageManager, 'updatePackages').mockResolvedValue({
        updated: ['https://example.com/test1.mf'],
        failed: ['https://example.com/test2.mf'],
      });

      const exitCode = await installCommand(['update']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles no packages to update', async () => {
      vi.spyOn(packageManager, 'updatePackages').mockResolvedValue({
        updated: [],
        failed: [],
      });

      const exitCode = await installCommand(['update']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('error handling', () => {
    it('handles package manager errors gracefully', async () => {
      vi.spyOn(packageManager, 'installPackage').mockRejectedValue(
        new Error('Unexpected error')
      );

      const exitCode = await installCommand(['https://example.com/test.mf']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles invalid URL errors', async () => {
      vi.spyOn(packageManager, 'installPackage').mockRejectedValue(
        new Error('Invalid URL')
      );

      // Unknown/invalid URLs should fail gracefully
      const exitCode = await installCommand(['unknown-subcommand']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });
  });

  describe('URL normalization', () => {
    it('normalizes GitHub shorthand', async () => {
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://raw.githubusercontent.com/user/repo/main/lib/test.mf',
        hash: 'abc123',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      await installCommand(['github.com/user/repo/lib/test.mf']);

      expect(packageManager.installPackage).toHaveBeenCalled();
    });

    it('accepts full HTTPS URLs', async () => {
      vi.spyOn(packageManager, 'installPackage').mockResolvedValue({
        url: 'https://example.com/lib/test.mf',
        hash: 'abc123',
        path: path.join(tempDir, '.mf_cache', 'test.mf'),
      });

      await installCommand(['https://example.com/lib/test.mf']);

      expect(packageManager.installPackage).toHaveBeenCalled();
    });
  });
});
