// mf fmt command - format TakoMusic source files

import * as fs from 'fs';
import * as path from 'path';
import { format } from '../../formatter.js';
import { ExitCodes } from '../../errors.js';
import { colors } from '../colors.js';

export async function fmtCommand(args: string[]): Promise<number> {
  let checkOnly = false;
  let files: string[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      return ExitCodes.SUCCESS;
    }
    if (arg === '-c' || arg === '--check') {
      checkOnly = true;
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      return ExitCodes.STATIC_ERROR;
    }
    files.push(arg);
  }

  // If no files specified, find all .mf files in current directory
  if (files.length === 0) {
    files = findMfFiles(process.cwd());
  }

  if (files.length === 0) {
    console.log('No .mf files found.');
    return ExitCodes.SUCCESS;
  }

  let hasChanges = false;
  let errorCount = 0;

  for (const file of files) {
    const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

    if (!fs.existsSync(absolutePath)) {
      console.error(colors.error('error') + `: File not found: ${file}`);
      errorCount++;
      continue;
    }

    try {
      const source = fs.readFileSync(absolutePath, 'utf-8');
      const formatted = format(source);

      if (source !== formatted) {
        hasChanges = true;
        const relativePath = path.relative(process.cwd(), absolutePath);

        if (checkOnly) {
          console.log(colors.yellow(`Would format: ${relativePath}`));
        } else {
          fs.writeFileSync(absolutePath, formatted, 'utf-8');
          console.log(colors.green(`Formatted: ${relativePath}`));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const relativePath = path.relative(process.cwd(), absolutePath);
      console.error(colors.error('error') + `: Failed to format ${relativePath}: ${message}`);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    return ExitCodes.STATIC_ERROR;
  }

  if (checkOnly && hasChanges) {
    console.log('');
    console.log(colors.yellow('Some files would be reformatted. Run without --check to apply changes.'));
    return ExitCodes.STATIC_ERROR;
  }

  if (!hasChanges) {
    console.log(colors.green('All files are already formatted.'));
  }

  return ExitCodes.SUCCESS;
}

function printHelp(): void {
  console.log(`Usage: mf fmt [options] [files...]

Format TakoMusic source files.

Options:
  -c, --check   Check if files are formatted without writing changes
  -h, --help    Show this help message

Examples:
  mf fmt                    Format all .mf files in current directory
  mf fmt src/main.mf        Format specific file
  mf fmt --check            Check formatting without changes
`);
}

function findMfFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules and hidden directories
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mf')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}
