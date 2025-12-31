#!/usr/bin/env node
/**
 * MusicXML Renderer Plugin for TakoMusic
 *
 * CLI interface following the TakoMusic Renderer Plugin Protocol
 *
 * Commands:
 *   capabilities              Output plugin capabilities as JSON
 *   validate --score --profile  Validate IR against profile
 *   render --score --profile    Render IR to MusicXML file
 */

import { capabilities } from './capabilities.js';
import { validate, render } from './render.js';

function parseArgs(args: string[]): { command: string; options: Record<string, string> } {
  const command = args[0] ?? '';
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[++i] ?? '';
      options[key] = value;
    }
  }

  return { command, options };
}

function main(): void {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  switch (command) {
    case 'capabilities':
      console.log(JSON.stringify(capabilities, null, 2));
      break;

    case 'validate': {
      const scorePath = options['score'];
      const profilePath = options['profile'];

      if (!scorePath || !profilePath) {
        console.error('Usage: tako-render-musicxml validate --score <path> --profile <path>');
        process.exit(1);
      }

      try {
        const diagnostics = validate(scorePath, profilePath);
        console.log(JSON.stringify(diagnostics, null, 2));

        // Exit with error if there are any error-level diagnostics
        const hasErrors = diagnostics.some((d) => d.level === 'error');
        process.exit(hasErrors ? 1 : 0);
      } catch (err) {
        console.error(
          JSON.stringify([
            { level: 'error', message: `Validation failed: ${(err as Error).message}` },
          ])
        );
        process.exit(1);
      }
      break;
    }

    case 'render': {
      const scorePath = options['score'];
      const profilePath = options['profile'];

      if (!scorePath || !profilePath) {
        console.error('Usage: tako-render-musicxml render --score <path> --profile <path>');
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
      console.error('Commands: capabilities, validate, render');
      process.exit(1);
  }
}

main();
