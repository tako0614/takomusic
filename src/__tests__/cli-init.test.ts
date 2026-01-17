import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { initCommand } from '../cli/commands/init.js';
import { ExitCodes } from '../errors.js';

describe('init command - Smoke Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `mf-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('help and usage', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await initCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('shows help with -h flag', async () => {
      const exitCode = await initCommand(['-h']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('template listing', () => {
    it('lists available templates with --list flag', async () => {
      const exitCode = await initCommand(['--list']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('lists available templates with -l flag', async () => {
      const exitCode = await initCommand(['-l']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('default initialization', () => {
    it('initializes project in current directory', async () => {
      const exitCode = await initCommand([tempDir]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      // Check that required directories were created
      expect(fs.existsSync(path.join(tempDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'dist'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'out'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'profiles'))).toBe(true);

      // Check that required files were created
      expect(fs.existsSync(path.join(tempDir, 'mfconfig.toml'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'src', 'main.mf'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'profiles', 'default.mf.profile.json'))).toBe(
        true
      );
      expect(fs.existsSync(path.join(tempDir, '.gitignore'))).toBe(true);
    });

    it('creates valid mfconfig.toml', async () => {
      await initCommand([tempDir]);

      const configPath = path.join(tempDir, 'mfconfig.toml');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('[project]');
    });

    it('creates valid main.mf with default template', async () => {
      await initCommand([tempDir]);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      expect(fs.existsSync(mainPath)).toBe(true);

      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('export fn main()');
      expect(content).toContain('Score');
    });

    it('creates valid render profile', async () => {
      await initCommand([tempDir]);

      const profilePath = path.join(tempDir, 'profiles', 'default.mf.profile.json');
      expect(fs.existsSync(profilePath)).toBe(true);

      const content = fs.readFileSync(profilePath, 'utf-8');
      const profile = JSON.parse(content);
      expect(profile.tako).toBeDefined();
      expect(profile.tako.profileVersion).toBe(1);
      expect(profile.renderer).toBeDefined();
    });

    it('creates .gitignore with proper excludes', async () => {
      await initCommand([tempDir]);

      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('dist/');
      expect(content).toContain('out/');
    });

    it('fails when project already initialized', async () => {
      // Initialize once
      await initCommand([tempDir]);

      // Try to initialize again
      const exitCode = await initCommand([tempDir]);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });
  });

  describe('target directory', () => {
    it('initializes in specified directory', async () => {
      const targetDir = path.join(tempDir, 'my-project');

      const exitCode = await initCommand([targetDir]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      expect(fs.existsSync(path.join(targetDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'mfconfig.toml'))).toBe(true);
    });

    it('creates target directory if it does not exist', async () => {
      const targetDir = path.join(tempDir, 'nested', 'project');

      const exitCode = await initCommand([targetDir]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      expect(fs.existsSync(targetDir)).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'src'))).toBe(true);
    });
  });

  describe('templates', () => {
    it('initializes with default template', async () => {
      const exitCode = await initCommand([tempDir, '--template', 'default']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('Starter');
    });

    it('initializes with piano template', async () => {
      const exitCode = await initCommand([tempDir, '-t', 'piano']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('Piano');
    });

    it('initializes with vocaloid template', async () => {
      const exitCode = await initCommand([tempDir, '--template', 'vocaloid']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('Vocal');
    });

    it('initializes with minimal template', async () => {
      const exitCode = await initCommand([tempDir, '-t', 'minimal']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('Minimal');
    });

    it('fails with unknown template', async () => {
      const exitCode = await initCommand([tempDir, '--template', 'nonexistent']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('combines directory and template options', async () => {
      const targetDir = path.join(tempDir, 'my-song');

      const exitCode = await initCommand([targetDir, '-t', 'piano']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const mainPath = path.join(targetDir, 'src', 'main.mf');
      expect(fs.existsSync(mainPath)).toBe(true);
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain('Piano');
    });
  });

  describe('file preservation', () => {
    it('does not overwrite existing src/main.mf', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const customContent = '// My custom file\nexport fn main() -> Score { }';
      fs.writeFileSync(path.join(srcDir, 'main.mf'), customContent);

      await initCommand([tempDir]);

      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toBe(customContent);
    });

    it('does not overwrite existing .gitignore', async () => {
      const customContent = '# Custom gitignore\nnode_modules/';
      fs.writeFileSync(path.join(tempDir, '.gitignore'), customContent);

      await initCommand([tempDir]);

      const gitignorePath = path.join(tempDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe(customContent);
    });

    it('does not overwrite existing profile', async () => {
      const profilesDir = path.join(tempDir, 'profiles');
      fs.mkdirSync(profilesDir, { recursive: true });

      const customProfile = '{"custom": true}';
      fs.writeFileSync(
        path.join(profilesDir, 'default.mf.profile.json'),
        customProfile
      );

      await initCommand([tempDir]);

      const profilePath = path.join(tempDir, 'profiles', 'default.mf.profile.json');
      const content = fs.readFileSync(profilePath, 'utf-8');
      expect(content).toBe(customProfile);
    });
  });

  describe('template content validation', () => {
    it('default template contains vocal and piano tracks', async () => {
      const projectDir = path.join(tempDir, 'default-test');
      await initCommand([projectDir, '--template', 'default']);

      const mainPath = path.join(projectDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');

      expect(content).toContain('pianoPart');
      expect(content).toContain('vocalPart');
      expect(content).toContain('import * as vocal');
    });

    it('piano template is minimal and functional', async () => {
      const projectDir = path.join(tempDir, 'piano-test');
      await initCommand([projectDir, '--template', 'piano']);

      const mainPath = path.join(projectDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');

      expect(content).toContain('Piano Solo');
      expect(content).toContain('chord');
      expect(content).not.toContain('vocal');
    });

    it('vocaloid template includes vocal synthesis', async () => {
      const projectDir = path.join(tempDir, 'vocaloid-test');
      await initCommand([projectDir, '--template', 'vocaloid']);

      const mainPath = path.join(projectDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');

      expect(content).toContain('vocal');
      expect(content).toContain('align');
      expect(content).toContain('text');
    });

    it('minimal template is bare bones', async () => {
      const projectDir = path.join(tempDir, 'minimal-test');
      await initCommand([projectDir, '--template', 'minimal']);

      const mainPath = path.join(projectDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');

      expect(content).toContain('Minimal');
      expect(content).not.toContain('import');
      expect(content.split('\n').length).toBeLessThan(30);
    });
  });

  describe('option parsing', () => {
    it('requires template value after --template flag', async () => {
      const exitCode = await initCommand([tempDir, '--template']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('handles multiple flags correctly', async () => {
      const targetDir = path.join(tempDir, 'test-project');
      const exitCode = await initCommand([
        targetDir,
        '--template',
        'piano',
      ]);

      expect(exitCode).toBe(ExitCodes.SUCCESS);
      expect(fs.existsSync(path.join(targetDir, 'src', 'main.mf'))).toBe(true);
    });

    it('ignores unknown flags gracefully', async () => {
      const exitCode = await initCommand([tempDir, '--unknown-flag']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('directory structure', () => {
    it('creates all required directories', async () => {
      await initCommand([tempDir]);

      const requiredDirs = ['src', 'dist', 'out', 'profiles'];
      for (const dir of requiredDirs) {
        const dirPath = path.join(tempDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      }
    });

    it('does not create duplicate directories', async () => {
      // Pre-create some directories
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'out'), { recursive: true });

      const exitCode = await initCommand([tempDir]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      // Should still succeed and not error
      expect(fs.existsSync(path.join(tempDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'dist'))).toBe(true);
    });
  });

  describe('integration', () => {
    it('creates a project that can be checked', async () => {
      await initCommand([tempDir]);

      // Verify the created main.mf is valid
      const mainPath = path.join(tempDir, 'src', 'main.mf');
      const content = fs.readFileSync(mainPath, 'utf-8');

      // Should contain proper function signature
      expect(content).toContain('export fn main() -> Score');
      expect(content).toContain('return score');
    });

    it('creates different content for different templates', async () => {
      const dir1 = path.join(tempDir, 'project1');
      const dir2 = path.join(tempDir, 'project2');

      await initCommand([dir1, '-t', 'piano']);
      await initCommand([dir2, '-t', 'vocaloid']);

      const content1 = fs.readFileSync(path.join(dir1, 'src', 'main.mf'), 'utf-8');
      const content2 = fs.readFileSync(path.join(dir2, 'src', 'main.mf'), 'utf-8');

      expect(content1).not.toBe(content2);
      expect(content1).toContain('Piano');
      expect(content2).toContain('Vocal');
    });
  });
});
