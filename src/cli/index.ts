#!/usr/bin/env node
// TakoMusic CLI entry point

import { createRequire } from 'module';
import { initCommand } from './commands/init.js';
import { checkCommand } from './commands/check.js';
import { buildCommand } from './commands/build.js';
import { renderCommand } from './commands/render.js';
import { ExitCodes } from '../errors.js';

// Read version from package.json
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');
const VERSION = pkg.version;

const HELP = `
TakoMusic v${VERSION} - Music composition with MFS language

Usage: mf <command> [options]

Commands:
  init              Initialize a new TakoMusic v3 project
  check             Check v3 source for errors
  build             Build v3 IR (.mf.score.json)
  render            Render via profile + renderer plugin

Options:
  -h, --help        Show this help message
  -v, --version     Show version

Examples:
  mf init
  mf check
  mf build
  mf render --profile profiles/default.mf.profile.json
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log(HELP);
    return ExitCodes.SUCCESS;
  }

  if (args[0] === '-v' || args[0] === '--version') {
    console.log(`TakoMusic v${VERSION}`);
    return ExitCodes.SUCCESS;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'init':
        return await initCommand(commandArgs);

      case 'check':
        return await checkCommand(commandArgs);

      case 'build':
        return await buildCommand(commandArgs);

      case 'render':
        return await renderCommand(commandArgs);

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "mf --help" for usage information.');
        return ExitCodes.STATIC_ERROR;
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error('An unexpected error occurred');
    }
    return ExitCodes.STATIC_ERROR;
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
    process.exit(ExitCodes.STATIC_ERROR);
  });
