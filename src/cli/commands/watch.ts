// mf watch command - watch for file changes and rebuild

import * as fs from 'fs';
import * as path from 'path';
import { ExitCodes } from '../../errors.js';
import { colors } from '../colors.js';
import { buildCommand } from './build.js';
import { checkCommand } from './check.js';

interface WatchOptions {
  mode: 'check' | 'build';
  debounceMs: number;
  verbose: boolean;
}

export async function watchCommand(args: string[]): Promise<number> {
  let options: WatchOptions = {
    mode: 'check',
    debounceMs: 300,
    verbose: false,
  };
  let targetFile: string | null = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      return ExitCodes.SUCCESS;
    }
    if (arg === '-b' || arg === '--build') {
      options.mode = 'build';
      continue;
    }
    if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
      continue;
    }
    if (arg === '-d' || arg === '--debounce') {
      const next = args[++i];
      if (next) {
        options.debounceMs = parseInt(next, 10) || 300;
      }
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      return ExitCodes.STATIC_ERROR;
    }
    targetFile = arg;
  }

  // Find the main file
  if (!targetFile) {
    targetFile = findMainFile(process.cwd());
  }

  if (!targetFile) {
    console.error(colors.error('error') + ': No .mf file found');
    console.log('Specify a file or create src/main.mf');
    return ExitCodes.STATIC_ERROR;
  }

  const absolutePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.join(process.cwd(), targetFile);

  if (!fs.existsSync(absolutePath)) {
    console.error(colors.error('error') + `: File not found: ${targetFile}`);
    return ExitCodes.STATIC_ERROR;
  }

  const watchDir = path.dirname(absolutePath);

  console.log(colors.cyan('Watching') + ` for changes in ${path.relative(process.cwd(), watchDir) || '.'}`);
  console.log(`Mode: ${options.mode === 'build' ? 'build' : 'check'}`);
  console.log('Press Ctrl+C to stop\n');

  // Initial run
  await runCommand(targetFile, options);

  // Watch for changes
  return await watchFiles(watchDir, targetFile, options);
}

function findMainFile(dir: string): string | null {
  // Try common locations
  const candidates = [
    'src/main.mf',
    'main.mf',
    'index.mf',
  ];

  for (const candidate of candidates) {
    const fullPath = path.join(dir, candidate);
    if (fs.existsSync(fullPath)) {
      return candidate;
    }
  }

  // Find any .mf file in current directory
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry.endsWith('.mf')) {
      return entry;
    }
  }

  return null;
}

async function runCommand(targetFile: string, options: WatchOptions): Promise<void> {
  const startTime = Date.now();

  console.log(colors.dim(`[${formatTime(new Date())}]`) + ' Running ' + options.mode + '...');

  try {
    let exitCode: number;

    if (options.mode === 'build') {
      exitCode = await buildCommand([targetFile]);
    } else {
      exitCode = await checkCommand([targetFile]);
    }

    const elapsed = Date.now() - startTime;

    if (exitCode === 0) {
      console.log(colors.green(`Done`) + colors.dim(` (${elapsed}ms)`));
    } else {
      console.log(colors.yellow(`Completed with errors`) + colors.dim(` (${elapsed}ms)`));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(colors.error('error') + `: ${message}`);
  }

  console.log('');
}

async function watchFiles(
  watchDir: string,
  targetFile: string,
  options: WatchOptions
): Promise<number> {
  return new Promise((resolve) => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let isRunning = false;

    const watchers: fs.FSWatcher[] = [];

    // Collect all directories to watch
    const dirsToWatch = new Set<string>();
    dirsToWatch.add(watchDir);

    // Also watch lib directory if it exists
    const libDir = path.join(process.cwd(), 'lib');
    if (fs.existsSync(libDir)) {
      dirsToWatch.add(libDir);
    }

    // Find all subdirectories
    function findDirs(dir: string): void {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
              continue;
            }
            const subDir = path.join(dir, entry.name);
            dirsToWatch.add(subDir);
            findDirs(subDir);
          }
        }
      } catch {
        // Ignore errors
      }
    }

    findDirs(watchDir);

    // Set up watchers
    for (const dir of dirsToWatch) {
      try {
        const watcher = fs.watch(dir, (eventType, filename) => {
          if (!filename || !filename.endsWith('.mf')) {
            return;
          }

          if (options.verbose) {
            console.log(colors.dim(`[${eventType}] ${path.join(dir, filename)}`));
          }

          // Debounce rapid changes
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(async () => {
            if (isRunning) return;
            isRunning = true;

            console.log(colors.cyan('File changed:') + ` ${filename}`);
            await runCommand(targetFile, options);

            isRunning = false;
          }, options.debounceMs);
        });

        watchers.push(watcher);
      } catch (err) {
        if (options.verbose) {
          console.error(colors.yellow('warning') + `: Could not watch ${dir}`);
        }
      }
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n' + colors.cyan('Stopping watch...'));
      for (const watcher of watchers) {
        watcher.close();
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      resolve(ExitCodes.SUCCESS);
    });

    // Keep the process running
    process.stdin.resume();
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function printHelp(): void {
  console.log(`Usage: mf watch [options] [file]

Watch for file changes and automatically rebuild.

Options:
  -b, --build       Build IR instead of just checking
  -d, --debounce    Debounce time in ms (default: 300)
  -v, --verbose     Show verbose output
  -h, --help        Show this help message

Examples:
  mf watch                  Watch and check src/main.mf
  mf watch -b               Watch and build
  mf watch src/song.mf      Watch specific file
  mf watch --debounce 500   Set debounce time to 500ms
`);
}
