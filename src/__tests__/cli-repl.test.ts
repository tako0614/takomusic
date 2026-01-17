import { describe, it, expect } from 'vitest';
import { replCommand } from '../cli/commands/repl.js';
import { ExitCodes } from '../errors.js';

describe('repl command - Smoke Tests', () => {
  describe('argument parsing', () => {
    it('shows help with --help flag', async () => {
      const exitCode = await replCommand(['--help']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });

    it('shows help with -h flag', async () => {
      const exitCode = await replCommand(['-h']);
      expect(exitCode).toBe(ExitCodes.SUCCESS);
    });
  });

  // Note: Full REPL tests would require mocking readline and process.stdin/stdout
  // These smoke tests verify the command initializes and handles help correctly
  // Integration tests should be done manually or in a separate test suite
});
