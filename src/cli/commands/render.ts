// mf render command - render audio using external tools

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';

export async function renderCommand(args: string[]): Promise<number> {
  // Parse arguments
  let profile: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--profile') {
      profile = args[i + 1];
      i++;
    }
  }

  if (!profile) {
    console.error('Profile required. Usage: mf render -p <profile|all>');
    return ExitCodes.STATIC_ERROR;
  }

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

  try {
    if (profile === 'cli' || profile === 'all') {
      const result = await renderCliProfile(config, baseDir);
      if (result !== ExitCodes.SUCCESS) {
        return result;
      }
    }

    if (profile === 'miku' || profile === 'all') {
      const result = await renderMikuProfile(config, baseDir);
      if (result !== ExitCodes.SUCCESS) {
        return result;
      }
    }

    console.log('Render complete.');
    return ExitCodes.SUCCESS;
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    return ExitCodes.EXTERNAL_TOOL_ERROR;
  }
}

async function renderCliProfile(config: any, baseDir: string): Promise<number> {
  const cliConfig = config.profiles.cli;
  if (!cliConfig) {
    console.log('CLI profile not configured, skipping.');
    return ExitCodes.SUCCESS;
  }

  const outDir = path.join(baseDir, config.project.out);
  const distDir = path.join(baseDir, config.project.dist);

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
    console.log('Running vocal synthesis...');
    const result = await runCommand(cliConfig.vocalCmd, vars);
    if (result !== 0) {
      console.error('Vocal synthesis failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('No vocal_cmd configured, skipping vocal synthesis.');
  }

  // Run MIDI command
  if (cliConfig.midiCmd) {
    console.log('Running MIDI synthesis...');
    const result = await runCommand(cliConfig.midiCmd, vars);
    if (result !== 0) {
      console.error('MIDI synthesis failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('No midi_cmd configured, skipping MIDI synthesis.');
  }

  // Run mix command
  if (cliConfig.mixCmd) {
    console.log('Running mix...');
    const result = await runCommand(cliConfig.mixCmd, vars);
    if (result !== 0) {
      console.error('Mix failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  } else {
    console.log('No mix_cmd configured, skipping mix.');
  }

  return ExitCodes.SUCCESS;
}

async function renderMikuProfile(config: any, baseDir: string): Promise<number> {
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
    const result = await runCommand([mikuConfig.dawExe, ...mikuConfig.dawArgs], vars);
    if (result !== 0) {
      console.error('DAW render failed.');
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }
  }

  return ExitCodes.SUCCESS;
}

function runCommand(cmdTemplate: string[], vars: Record<string, string>): Promise<number> {
  return new Promise((resolve) => {
    // Replace template variables
    const cmd = cmdTemplate.map((arg) => {
      let result = arg;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(key, value);
      }
      return result;
    });

    console.log(`  > ${cmd.join(' ')}`);

    const proc = spawn(cmd[0], cmd.slice(1), {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      resolve(code ?? 0);
    });

    proc.on('error', (err) => {
      console.error(`Failed to run command: ${err.message}`);
      resolve(1);
    });
  });
}
