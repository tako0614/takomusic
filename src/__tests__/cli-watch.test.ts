import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { watchCommand } from '../cli/commands/watch.js';
import { ExitCodes } from '../errors.js';

describe('watch command - Smoke Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `mf-watch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('argument parsing', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await watchCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('shows help with -h flag', async () => {
      const exitCode = await watchCommand(['-h']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('file validation', () => {
    it('fails when specified file does not exist', async () => {
      const exitCode = await watchCommand([path.join(tempDir, 'nonexistent.mf')]);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });

    it('accepts absolute path to existing file', async () => {
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

      const watchPromise = watchCommand([inputFile]);

      // Stop after initial run
      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 300);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  describe('mode options', () => {
    it('accepts --build flag', async () => {
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

      const watchPromise = watchCommand(['--build', inputFile]);

      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 300);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);

      // Build mode should create the output file
      const outputFile = inputFile + '.score.json';
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('accepts -b flag as shorthand', async () => {
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

      const watchPromise = watchCommand(['-b', inputFile]);

      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 300);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('accepts --verbose flag', async () => {
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

      const watchPromise = watchCommand(['-v', inputFile]);

      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 300);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('accepts --debounce with custom value', async () => {
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

      const watchPromise = watchCommand(['--debounce', '500', inputFile]);

      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 300);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('rejects unknown options', async () => {
      const exitCode = await watchCommand(['--unknown-option']);
      expect(exitCode).toBe(ExitCodes.STATIC_ERROR);
    });
  });

  describe('watch behavior', () => {
    it('performs initial check run', async () => {
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

      const watchPromise = watchCommand([inputFile]);

      // Stop after initial run
      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 400);

      const exitCode = await watchPromise;
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('handles syntax errors gracefully', async () => {
      const source = 'fn broken() { invalid syntax }';
      const inputFile = path.join(tempDir, 'broken.mf');
      fs.writeFileSync(inputFile, source);

      const watchPromise = watchCommand([inputFile]);

      setTimeout(() => {
        process.emit('SIGINT', 'SIGINT');
      }, 400);

      const exitCode = await watchPromise;
      // Watch should continue even with errors
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });
});
