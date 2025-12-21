// mf render command - render audio using external tools

import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';

// Characters that are dangerous even with spawn() shell: false
// Since we use spawn() with shell: false, most shell metacharacters are safe
// because they're passed directly to the executable without shell interpretation.
// We only block characters that could cause issues at the OS/filesystem level:
// - Newlines: could cause argument splitting issues
// - Backticks and $: block for extra safety (command substitution patterns)
const SHELL_DANGEROUS_CHARS = /[`$\n\r]/;

/**
 * Validate that a command argument is safe for shell execution.
 * Returns true if the argument is safe, false if it contains dangerous characters.
 */
function isArgSafe(arg: string): boolean {
  return !SHELL_DANGEROUS_CHARS.test(arg);
}

/**
 * Validate all arguments in a command array.
 * Throws an error if any argument contains dangerous characters.
 */
function validateCommandArgs(cmd: string[], context: string): void {
  for (const arg of cmd) {
    if (!isArgSafe(arg)) {
      throw new Error(`Unsafe character detected in ${context} argument: "${arg}". ` +
        'Command arguments must not contain shell metacharacters.');
    }
  }
}

// Default timeout: 10 minutes
const DEFAULT_TIMEOUT = 10 * 60 * 1000;

// Track active process for cancellation
let activeProcess: ChildProcess | null = null;
let cancelled = false;

// Handle Ctrl+C gracefully
function setupCancellationHandler(): void {
  const handler = () => {
    if (activeProcess) {
      console.log('\nCancelling render...');
      cancelled = true;
      activeProcess.kill('SIGTERM');
      // Force kill after 3 seconds if still running
      setTimeout(() => {
        if (activeProcess && !activeProcess.killed) {
          activeProcess.kill('SIGKILL');
        }
      }, 3000);
    }
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}

export async function renderCommand(args: string[]): Promise<number> {
  // Parse arguments
  let profile: string | undefined;
  let timeout = DEFAULT_TIMEOUT;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      if (i + 1 >= args.length) {
        console.error('--profile requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      profile = args[i + 1];
      i++;
    } else if (args[i] === '-t' || args[i] === '--timeout') {
      if (i + 1 >= args.length) {
        console.error('--timeout requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      const parsed = parseInt(args[i + 1], 10);
      if (isNaN(parsed) || parsed <= 0) {
        console.error(`Invalid timeout value: ${args[i + 1]}`);
        return ExitCodes.STATIC_ERROR;
      }
      timeout = parsed * 1000; // Convert seconds to ms
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf render -p <profile|all> [options]

Options:
  -p, --profile <name>  Profile to render (cli, miku, or all)
  -t, --timeout <sec>   Timeout per command in seconds (default: 600)
  --dry-run             Show commands without executing
  -h, --help            Show this help message
`);
      return ExitCodes.SUCCESS;
    }
  }

  if (!profile) {
    console.error('Profile required. Usage: mf render -p <profile|all>');
    console.error('Use -h for more options.');
    return ExitCodes.STATIC_ERROR;
  }

  // Setup cancellation handler
  setupCancellationHandler();

  // Find config
  const configPath = findConfigPath(process.cwd());
  if (!configPath) {
    console.error('No mfconfig.toml found. Run "mf init" first.');
    return ExitCodes.IO_ERROR;
  }

  const config = loadConfig(configPath);
  const baseDir = path.dirname(configPath);

  // Ensure out directory exists
  const outDir = path.join(baseDir, config.project.out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Reset cancellation state
  cancelled = false;

  try {
    if (profile === 'cli' || profile === 'all') {
      const result = await renderCliProfile(config, baseDir, timeout, dryRun);
      if (cancelled) {
        console.log('Render cancelled by user.');
        return ExitCodes.EXTERNAL_TOOL_ERROR;
      }
      if (result !== ExitCodes.SUCCESS) {
        return result;
      }
    }

    if (profile === 'miku' || profile === 'all') {
      const result = await renderMikuProfile(config, baseDir, timeout, dryRun);
      if (cancelled) {
        console.log('Render cancelled by user.');
        return ExitCodes.EXTERNAL_TOOL_ERROR;
      }
      if (result !== ExitCodes.SUCCESS) {
        return result;
      }
    }

    if (dryRun) {
      console.log('\n[Dry run complete - no commands were executed]');
    } else {
      console.log('Render complete.');
    }
    return ExitCodes.SUCCESS;
  } catch (err) {
    if (cancelled) {
      console.log('Render cancelled by user.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
    return handleCliError(err);
  }
}

async function renderCliProfile(config: any, baseDir: string, timeout: number, dryRun: boolean): Promise<number> {
  const cliConfig = config.profiles.cli;
  if (!cliConfig) {
    console.log('CLI profile not configured, skipping.');
    return ExitCodes.SUCCESS;
  }

  const outDir = path.join(baseDir, config.project.out);

  // Template variables
  const vars: Record<string, string> = {
    '{musicxml}': path.join(baseDir, cliConfig.musicxmlOut),
    '{mid}': path.join(baseDir, cliConfig.bandMidOut),
    '{vocal_wav}': path.join(outDir, 'vocal.wav'),
    '{band_wav}': path.join(outDir, 'band.wav'),
    '{mix_wav}': path.join(baseDir, cliConfig.renderOut),
  };

  // Run vocal command
  if (cliConfig.vocalCmd) {
    console.log('[1/3] Running vocal synthesis...');
    if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
    const result = await runCommand(cliConfig.vocalCmd, vars, timeout, dryRun);
    if (result !== 0) {
      if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
      console.error('Vocal synthesis failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('[1/3] No vocal_cmd configured, skipping vocal synthesis.');
  }

  // Run MIDI command
  if (cliConfig.midiCmd) {
    console.log('[2/3] Running MIDI synthesis...');
    if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
    const result = await runCommand(cliConfig.midiCmd, vars, timeout, dryRun);
    if (result !== 0) {
      if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
      console.error('MIDI synthesis failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('[2/3] No midi_cmd configured, skipping MIDI synthesis.');
  }

  // Run mix command
  if (cliConfig.mixCmd) {
    console.log('[3/3] Running mix...');
    if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
    const result = await runCommand(cliConfig.mixCmd, vars, timeout, dryRun);
    if (result !== 0) {
      if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
      console.error('Mix failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('[3/3] No mix_cmd configured, skipping mix.');
  }

  return ExitCodes.SUCCESS;
}

async function renderMikuProfile(config: any, baseDir: string, timeout: number, dryRun: boolean): Promise<number> {
  const mikuConfig = config.profiles.miku;
  if (!mikuConfig) {
    console.log('Miku profile not configured, skipping.');
    return ExitCodes.SUCCESS;
  }

  if (mikuConfig.importStrategy === 'manual') {
    console.log('');
    console.log('=== Manual VSQX Import Required ===');
    console.log(`1. Open your DAW project: ${mikuConfig.dawProject || '(not configured)'}`);
    console.log(`2. Import VSQX file: ${mikuConfig.vsqxOut}`);
    console.log(`3. Import tempo MIDI: ${mikuConfig.tempoMidOut}`);
    console.log('4. Save the project');
    console.log('5. Run the render command again (or render manually)');
    console.log('');

    if (!mikuConfig.dawExe) {
      console.log('DAW executable not configured. Please render manually.');
      return ExitCodes.SUCCESS;
    }
  }

  // Run DAW render if configured
  if (mikuConfig.dawExe && mikuConfig.dawArgs) {
    const vars: Record<string, string> = {
      '{project}': path.join(baseDir, mikuConfig.dawProject || ''),
      '{vsqx}': path.join(baseDir, mikuConfig.vsqxOut),
      '{tempo_mid}': path.join(baseDir, mikuConfig.tempoMidOut),
    };

    console.log('Running DAW render...');
    if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
    const result = await runCommand([mikuConfig.dawExe, ...mikuConfig.dawArgs], vars, timeout, dryRun);
    if (result !== 0) {
      if (cancelled) return ExitCodes.EXTERNAL_TOOL_ERROR;
      console.error('DAW render failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  }

  return ExitCodes.SUCCESS;
}

function runCommand(cmdTemplate: string[], vars: Record<string, string>, timeout: number, dryRun: boolean): Promise<number> {
  return new Promise((resolve, reject) => {
    // Replace template variables
    const cmd = cmdTemplate.map((arg) => {
      let result = arg;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(key, value);
      }
      return result;
    });

    // Security: Validate command arguments to prevent injection
    try {
      validateCommandArgs(cmd, 'render command');
    } catch (err) {
      console.error(`Security error: ${(err as Error).message}`);
      reject(err);
      return;
    }

    console.log(`  > ${cmd.join(' ')}`);

    // Dry run mode - just show the command
    if (dryRun) {
      console.log('  [dry-run: skipped]');
      resolve(0);
      return;
    }

    const startTime = Date.now();
    // Security: Use shell: false to prevent shell injection
    // Arguments are passed directly to the executable without shell interpretation
    const proc = spawn(cmd[0], cmd.slice(1), {
      stdio: 'inherit',
      shell: false,
    });

    activeProcess = proc;

    // Setup timeout
    const timeoutId = setTimeout(() => {
      if (!proc.killed) {
        console.error(`\nCommand timed out after ${timeout / 1000} seconds.`);
        proc.kill('SIGTERM');
        // Force kill after 3 seconds
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 3000);
      }
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      activeProcess = null;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`  [completed in ${elapsed}s]`);
      }
      resolve(code ?? 0);
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      activeProcess = null;
      console.error(`Failed to run command: ${err.message}`);
      resolve(1);
    });
  });
}
