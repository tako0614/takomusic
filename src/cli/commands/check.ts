// mf check command - check MFS source for errors

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../../lexer/index.js';
import { Parser } from '../../parser/index.js';
import { Checker } from '../../checker/checker.js';
import { ExitCodes, MFError } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';

export async function checkCommand(args: string[]): Promise<number> {
  // Parse arguments
  let profile: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      profile = args[i + 1];
      i++;
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
    let hasErrors = false;
    for (const diag of diagnostics) {
      const level = diag.severity === 'error' ? 'error' : 'warning';
      const loc = diag.position
        ? `:${diag.position.line}:${diag.position.column}`
        : '';
      console.log(`[${diag.code}] ${level}${loc}: ${diag.message}`);

      if (diag.severity === 'error') {
        hasErrors = true;
      }
    }

    if (diagnostics.length === 0) {
      console.log('No issues found.');
    }

    return hasErrors ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
  } catch (err) {
    if (err instanceof MFError) {
      console.error(err.toString());
    } else {
      console.error(`Error: ${(err as Error).message}`);
    }
    return ExitCodes.STATIC_ERROR;
  }
}
