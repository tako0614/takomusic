// mf fmt command - format MFS source files

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../../lexer/index.js';
import { Parser } from '../../parser/index.js';
import { Formatter } from '../../formatter/formatter.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';

export async function fmtCommand(args: string[]): Promise<number> {
  // Find config
  const configPath = findConfigPath(process.cwd());
  const baseDir = configPath ? path.dirname(configPath) : process.cwd();

  // Get files to format
  let files: string[] = [];

  if (args.length === 0) {
    // Format all .mf files in src/
    const srcDir = path.join(baseDir, 'src');
    if (fs.existsSync(srcDir)) {
      files = findMfFiles(srcDir);
    }
  } else {
    for (const arg of args) {
      const fullPath = path.resolve(arg);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push(...findMfFiles(fullPath));
      } else if (arg.endsWith('.mf')) {
        files.push(fullPath);
      }
    }
  }

  if (files.length === 0) {
    console.log('No .mf files found to format.');
    return ExitCodes.SUCCESS;
  }

  let hasErrors = false;

  for (const file of files) {
    try {
      const source = fs.readFileSync(file, 'utf-8');
      const lexer = new Lexer(source, file);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, file);
      const ast = parser.parse();
      const formatter = new Formatter();
      const formatted = formatter.format(ast);

      if (source !== formatted) {
        fs.writeFileSync(file, formatted);
        console.log(`Formatted: ${path.relative(baseDir, file)}`);
      }
    } catch (err) {
      console.error(`Error formatting ${file}: ${(err as Error).message}`);
      hasErrors = true;
    }
  }

  return hasErrors ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
}

function findMfFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMfFiles(fullPath));
    } else if (entry.name.endsWith('.mf')) {
      files.push(fullPath);
    }
  }

  return files;
}
