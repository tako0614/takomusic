#!/usr/bin/env node
// TakoMusic CLI entry point

import { parseArgs } from 'util';
import { initCommand } from './commands/init.js';
import { fmtCommand } from './commands/fmt.js';
import { checkCommand } from './commands/check.js';
import { buildCommand } from './commands/build.js';
import { renderCommand } from './commands/render.js';
import { doctorCommand } from './commands/doctor.js';
import { ExitCodes } from '../errors.js';

const HELP = `
TakoMusic v1.1 - Music composition with MFS language

Usage: mf <command> [options]

Commands:
  init              Initialize a new TakoMusic project
  fmt [path...]     Format MFS source files
  check [-p profile]  Check source for errors
  build [-p profile|all]  Build IR and profile-specific outputs
  render -p <profile|all>  Render audio using external tools
  doctor [-p profile]  Check external dependencies

Options:
  -p, --profile     Target profile (miku, cli, all)
  -h, --help        Show this help message
  -v, --version     Show version

Examples:
  mf init
  mf fmt src/
  mf check
  mf build -p cli
  mf render -p miku
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log(HELP);
    return ExitCodes.SUCCESS;
  }

  if (args[0] === '-v' || args[0] === '--version') {
    console.log('TakoMusic v1.1.0');
    return ExitCodes.SUCCESS;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'init':
        return await initCommand(commandArgs);

      case 'fmt':
        return await fmtCommand(commandArgs);

      case 'check':
        return await checkCommand(commandArgs);

      case 'build':
        return await buildCommand(commandArgs);

      case 'render':
        return await renderCommand(commandArgs);

      case 'doctor':
        return await doctorCommand(commandArgs);

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

main().then((code) => {
  process.exit(code);
});
