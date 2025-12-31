#!/usr/bin/env node
/**
 * MIDI Renderer Plugin for TakoMusic
 *
 * CLI interface following the TakoMusic Renderer Plugin Protocol v1
 *
 * Commands:
 *   capabilities                               Output plugin capabilities as JSON
 *   validate --score <path> --profile <path>   Validate IR against profile
 *   render --score <path> --profile <path>     Render IR to MIDI file
 *
 * @see docs/RENDERING.md for protocol specification
 */

import { capabilities } from './capabilities.js';
import { validate } from './validate.js';
import { render } from './render.js';

interface ParsedArgs {
  command: string;
  options: Record<string, string>;
}

function parseArgs(args: string[]): ParsedArgs {
  const command = args[0] ?? '';
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[++i] ?? '';
      options[key] = value;
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short options: -o value
      const key = arg.slice(1);
      const value = args[++i] ?? '';
      options[key] = value;
    }
  }

  return { command, options };
}

function printUsage(): void {
  console.error(`
tako-render-midi - MIDI Renderer Plugin for TakoMusic

Usage:
  tako-render-midi capabilities
  tako-render-midi validate --score <path> --profile <path>
  tako-render-midi render --score <path> --profile <path>

Commands:
  capabilities    Output plugin capabilities as JSON
  validate        Validate Score IR against render profile
  render          Render Score IR to MIDI file

Options:
  --score <path>    Path to Score IR JSON file
  --profile <path>  Path to render profile JSON file
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  const { command, options } = parseArgs(args);

  switch (command) {
    case 'capabilities':
      // Output capabilities as JSON
      console.log(JSON.stringify(capabilities, null, 2));
      process.exit(0);
      break;

    case 'validate': {
      const scorePath = options['score'];
      const profilePath = options['profile'];

      if (!scorePath || !profilePath) {
        console.error('Error: Missing required options');
        console.error('Usage: tako-render-midi validate --score <path> --profile <path>');
        process.exit(1);
      }

      try {
        const diagnostics = validate(scorePath, profilePath);
        console.log(JSON.stringify(diagnostics, null, 2));

        // Exit with error code if there are any error-level diagnostics
        const hasErrors = diagnostics.some((d) => d.level === 'error');
        process.exit(hasErrors ? 1 : 0);
      } catch (err) {
        const errorDiagnostics = [
          {
            level: 'error',
            code: 'VALIDATION_FAILED',
            message: `Validation failed: ${(err as Error).message}`,
          },
        ];
        console.log(JSON.stringify(errorDiagnostics, null, 2));
        process.exit(1);
      }
      break;
    }

    case 'render': {
      const scorePath = options['score'];
      const profilePath = options['profile'];

      if (!scorePath || !profilePath) {
        console.error('Error: Missing required options');
        console.error('Usage: tako-render-midi render --score <path> --profile <path>');
        process.exit(1);
      }

      try {
        const artifacts = render(scorePath, profilePath);
        console.log(JSON.stringify(artifacts, null, 2));
        process.exit(0);
      } catch (err) {
        console.error(`Render failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
