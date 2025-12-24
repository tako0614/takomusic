// mf build command - compile MFS to IR and profile outputs

import * as fs from 'fs';
import * as path from 'path';
import { V3Compiler } from '../../compiler.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';
import type { MFConfig } from '../../config/index.js';

export async function buildCommand(args: string[]): Promise<number> {
  // Parse arguments
  let watchMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      console.error('Profiles are not supported in v3 build yet.');
      return ExitCodes.STATIC_ERROR;
    } else if (args[i] === '-w' || args[i] === '--watch') {
      watchMode = true;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf build [options]

Options:
  -w, --watch  Watch for changes and rebuild
  -h, --help   Show this help message
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

  // Initial build
  const result = await runBuild(baseDir, entryPath, config);

  // Watch mode
  if (watchMode) {
    if (result !== ExitCodes.SUCCESS) {
      console.log('\nWaiting for changes...');
    }
    return startWatchMode(baseDir, entryPath, config);
  }

  return result;
}

async function runBuild(
  baseDir: string,
  entryPath: string,
  config: MFConfig
): Promise<number> {
  const startTime = Date.now();

  try {
    // Compile to IR using Compiler (handles imports)
    console.log('Compiling...');
    const compiler = new V3Compiler(baseDir);
    const ir = compiler.compile(entryPath);
    const diagnostics = compiler.getDiagnostics().filter((d) => d.severity === 'warning');
    for (const diag of diagnostics) {
      console.log(`[warning] ${diag.message}`);
    }

    // Ensure dist directory exists
    const distDir = path.join(baseDir, config.project.dist);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Write IR
    const irPath = path.join(distDir, `${path.basename(entryPath)}.score.json`);
    fs.writeFileSync(irPath, JSON.stringify(ir, null, 2));
    console.log(`Generated: ${path.relative(baseDir, irPath)}`);

    // v3: renderer plugin output is handled separately
    const fileCount = 1;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Build complete. ${fileCount} files generated in ${elapsed}s`);
    return ExitCodes.SUCCESS;
  } catch (err) {
    return handleCliError(err);
  }
}

function startWatchMode(
  baseDir: string,
  entryPath: string,
  config: MFConfig
): Promise<number> {
  return new Promise((resolve) => {
    // Determine watch directory from entry path
    // If entry is in a subdirectory (e.g., src/main.mf), watch that directory
    // If entry is at root (e.g., song.mf), watch the base directory
    const entryDir = path.dirname(entryPath);
    const srcDir = entryDir === baseDir ? baseDir : entryDir;
    let debounceTimer: NodeJS.Timeout | null = null;
    let isBuilding = false;
    let pendingBuild = false;

    const displayDir = srcDir === baseDir ? '.' : path.relative(baseDir, srcDir);
    console.log(`\nWatching for changes in ${displayDir}...`);
    console.log('Press Ctrl+C to stop.\n');

    const closeWatcher = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      watcher.close();
    };

    const watcher = fs.watch(srcDir, { recursive: true }, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.mf')) return;

      // If already building, mark that we need another build after this one
      if (isBuilding) {
        pendingBuild = true;
        return;
      }

      // Debounce rapid changes - set isBuilding immediately to prevent race condition
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        isBuilding = true;
        debounceTimer = null;

        try {
          console.log(`\n[${new Date().toLocaleTimeString()}] Change detected: ${filename}`);
          await runBuild(baseDir, entryPath, config);
        } catch (err) {
          console.error(`Build error: ${(err as Error).message}`);
        } finally {
          isBuilding = false;
          console.log('\nWaiting for changes...');

          // If another change came in while building, trigger a new build
          if (pendingBuild) {
            pendingBuild = false;
            watcher.emit('change', 'change', filename);
          }
        }
      }, 100);
    });

    // Handle Ctrl+C - use named function to allow removal
    const sigintHandler = () => {
      console.log('\nStopping watch mode...');
      process.removeListener('SIGINT', sigintHandler);
      closeWatcher();
      resolve(ExitCodes.SUCCESS);
    };
    process.on('SIGINT', sigintHandler);

    // Handle errors on the watcher
    watcher.on('error', (err) => {
      console.error(`Watcher error: ${err.message}`);
      process.removeListener('SIGINT', sigintHandler);
      closeWatcher();
      resolve(ExitCodes.IO_ERROR);
    });
  });
}
