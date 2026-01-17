import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { buildCommand } from '../cli/commands/build.js';
import { fmtCommand } from '../cli/commands/fmt.js';
import { checkCommand } from '../cli/commands/check.js';
import { ExitCodes } from '../errors.js';

describe('CLI Commands - Smoke Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `mf-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('build command', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await buildCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('fails when file does not exist', async () => {
      const exitCode = await buildCommand([path.join(tempDir, 'nonexistent.mf')]);
      expect(exitCode).not.toBe(ExitCodes.SUCCESS);
    });

    it('compiles valid minimal file', async () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const inputFile = path.join(tempDir, 'test.mf');
      fs.writeFileSync(inputFile, source);

      const exitCode = await buildCommand([inputFile]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const outputFile = inputFile + '.score.json';
      expect(fs.existsSync(outputFile)).toBe(true);

      const outputContent = fs.readFileSync(outputFile, 'utf-8');
      const ir = JSON.parse(outputContent);
      expect(ir.tako.irVersion).toBe(4);
    });

    it('fails on syntax error', async () => {
      const source = 'fn broken() { invalid syntax }';
      const inputFile = path.join(tempDir, 'broken.mf');
      fs.writeFileSync(inputFile, source);

      const exitCode = await buildCommand([inputFile]);
      expect(exitCode).not.toBe(ExitCodes.SUCCESS);
    });
  });

  describe('fmt command', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await fmtCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('formats a single file', async () => {
      const source = 'fn test()->Int{return 42;}';
      const inputFile = path.join(tempDir, 'test.mf');
      fs.writeFileSync(inputFile, source);

      const exitCode = await fmtCommand([inputFile]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      const formatted = fs.readFileSync(inputFile, 'utf-8');
      expect(formatted).toContain('fn test() -> Int {');
      expect(formatted).toContain('  return 42;');
    });

    it('fails when file does not exist', async () => {
      const exitCode = await fmtCommand([path.join(tempDir, 'nonexistent.mf')]);
      expect(exitCode).not.toBe(ExitCodes.SUCCESS);
    });
  });

  describe('check command', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await checkCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('succeeds for valid file', async () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const inputFile = path.join(tempDir, 'test.mf');
      fs.writeFileSync(inputFile, source);

      const exitCode = await checkCommand([inputFile]);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('fails for invalid syntax', async () => {
      const source = 'fn broken() { invalid syntax }';
      const inputFile = path.join(tempDir, 'broken.mf');
      fs.writeFileSync(inputFile, source);

      const exitCode = await checkCommand([inputFile]);
      expect(exitCode).not.toBe(ExitCodes.SUCCESS);
    });
  });
});
