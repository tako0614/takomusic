// mf check command - check MFS source for errors

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../../lexer/index.js';
import { Parser } from '../../parser/index.js';
import { Checker } from '../../checker/checker.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';

export async function checkCommand(args: string[]): Promise<number> {
  // Parse arguments
  let profile: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      if (i + 1 >= args.length) {
        console.error('--profile requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      profile = args[i + 1];
      i++;
    }
  }
  // Suppress unused variable warning
  void profile;

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
    // Read and parse
    const source = fs.readFileSync(entryPath, 'utf-8');
    const lexer = new Lexer(source, entryPath);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, entryPath);
    const ast = parser.parse();

    // Run checker
    const checker = new Checker(baseDir);
    const diagnostics = checker.check(ast, entryPath);

    // Report diagnostics
    let errorCount = 0;
    let warningCount = 0;

    for (const diag of diagnostics) {
      console.log(Checker.formatDiagnostic(diag));
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
