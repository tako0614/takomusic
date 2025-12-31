// mf check command - check MFS source for errors

import * as fs from 'fs';
import * as path from 'path';
import { V4Compiler } from '../../compiler.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';
import { formatRichDiagnostic } from '../richFormatter.js';
import { colors } from '../colors.js';

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
    const compiler = new V4Compiler(baseDir);
    const diagnostics = compiler.check(entryPath);

    // Report diagnostics with rich formatting
    let errorCount = 0;
    let warningCount = 0;

    for (const diag of diagnostics) {
      console.error(formatRichDiagnostic(diag));
      console.error(''); // Blank line between diagnostics
      if (diag.severity === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
    }

    // Summary
    if (diagnostics.length === 0) {
      console.log(colors.success('No issues found.'));
    } else {
      const parts: string[] = [];
      if (errorCount > 0) {
        const label = errorCount === 1 ? 'error' : 'errors';
        parts.push(colors.error(`${errorCount} ${label}`));
      }
      if (warningCount > 0) {
        const label = warningCount === 1 ? 'warning' : 'warnings';
        parts.push(colors.warning(`${warningCount} ${label}`));
      }
      if (errorCount > 0) {
        console.error(colors.boldRed(`aborting due to ${parts.join(' and ')}`));
      } else {
        console.log(`generated ${parts.join(' and ')}`);
      }
    }

    return errorCount > 0 ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
  } catch (err) {
    return handleCliError(err);
  }
}
