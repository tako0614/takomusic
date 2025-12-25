// mf check command - check MFS source for errors

import * as fs from 'fs';
import * as path from 'path';
import { V3Compiler } from '../../compiler.js';
import { formatDiagnostic } from '../../diagnostics.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';

export async function checkCommand(args: string[]): Promise<number> {
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      console.error('Profiles are used by "mf render", not "mf check".');
      return ExitCodes.STATIC_ERROR;
    }
    if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf check

Options:
  -h, --help  Show this help message
`);
      return ExitCodes.SUCCESS;
    }
  }

  // Find config
  const configPath = findConfigPath(process.cwd());
  if (!configPath) {
    console.error('No mfconfig.toml found. Run "mf init" first.');
    return ExitCodes.IO_ERROR;
  }

  const config = loadConfig(configPath);
  const baseDir = path.dirname(configPath);
  const entryPath = path.join(baseDir, config.project.entry);

  // Check if entry file exists
  if (!fs.existsSync(entryPath)) {
    console.error(`Entry file not found: ${config.project.entry}`);
    return ExitCodes.IO_ERROR;
  }

  try {
    const compiler = new V3Compiler(baseDir);
    const diagnostics = compiler.check(entryPath);

    // Report diagnostics
    let errorCount = 0;
    let warningCount = 0;

    for (const diag of diagnostics) {
      console.log(formatDiagnostic(diag));
      if (diag.severity === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
    }

    // Summary
    if (diagnostics.length === 0) {
      console.log('No issues found.');
    } else {
      console.log('');
      const parts: string[] = [];
      if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
      if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
      console.log(`Found ${parts.join(', ')}.`);
    }

    return errorCount > 0 ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
  } catch (err) {
    return handleCliError(err);
  }
}
