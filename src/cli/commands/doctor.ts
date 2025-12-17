// mf doctor command - check external dependencies

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';

interface DependencyCheck {
  name: string;
  command: string;
  required: boolean;
  profile?: string;
}

export async function doctorCommand(args: string[]): Promise<number> {
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

  console.log('MusicForge Doctor');
  console.log('=================\n');

  let hasIssues = false;

  // Check project structure
  console.log('Project Structure:');

  const entryPath = path.join(baseDir, config.project.entry);
  if (fs.existsSync(entryPath)) {
    console.log(`  ✓ Entry file: ${config.project.entry}`);
  } else {
    console.log(`  ✗ Entry file not found: ${config.project.entry}`);
    hasIssues = true;
  }

  const distDir = path.join(baseDir, config.project.dist);
  if (fs.existsSync(distDir)) {
    console.log(`  ✓ Dist directory: ${config.project.dist}`);
  } else {
    console.log(`  ○ Dist directory will be created: ${config.project.dist}`);
  }

  const outDir = path.join(baseDir, config.project.out);
  if (fs.existsSync(outDir)) {
    console.log(`  ✓ Out directory: ${config.project.out}`);
  } else {
    console.log(`  ○ Out directory will be created: ${config.project.out}`);
  }

  console.log('');

  // Check CLI profile dependencies
  if (!profile || profile === 'cli' || profile === 'all') {
    console.log('CLI Profile Dependencies:');
    const cliConfig = config.profiles.cli;

    if (cliConfig) {
      if (cliConfig.vocalCmd) {
        const cmd = cliConfig.vocalCmd[0];
        const available = await checkCommand(cmd);
        if (available) {
          console.log(`  ✓ Vocal synthesizer: ${cmd}`);
        } else {
          console.log(`  ✗ Vocal synthesizer not found: ${cmd}`);
          hasIssues = true;
        }
      } else {
        console.log('  ○ Vocal synthesizer: not configured');
      }

      if (cliConfig.midiCmd) {
        const cmd = cliConfig.midiCmd[0];
        const available = await checkCommand(cmd);
        if (available) {
          console.log(`  ✓ MIDI synthesizer: ${cmd}`);
        } else {
          console.log(`  ✗ MIDI synthesizer not found: ${cmd}`);
          hasIssues = true;
        }
      } else {
        console.log('  ○ MIDI synthesizer: not configured');
      }

      if (cliConfig.mixCmd) {
        const cmd = cliConfig.mixCmd[0];
        const available = await checkCommand(cmd);
        if (available) {
          console.log(`  ✓ Audio mixer: ${cmd}`);
        } else {
          console.log(`  ✗ Audio mixer not found: ${cmd}`);
          hasIssues = true;
        }
      } else {
        console.log('  ○ Audio mixer: not configured');
      }
    } else {
      console.log('  ○ CLI profile not configured');
    }

    console.log('');
  }

  // Check Miku profile dependencies
  if (!profile || profile === 'miku' || profile === 'all') {
    console.log('Miku Profile Dependencies:');
    const mikuConfig = config.profiles.miku;

    if (mikuConfig) {
      if (mikuConfig.dawExe) {
        const available = await checkCommand(mikuConfig.dawExe);
        if (available) {
          console.log(`  ✓ DAW: ${mikuConfig.dawExe}`);
        } else {
          console.log(`  ✗ DAW not found: ${mikuConfig.dawExe}`);
          hasIssues = true;
        }
      } else {
        console.log('  ○ DAW: not configured');
      }

      if (mikuConfig.dawProject) {
        const projectPath = path.join(baseDir, mikuConfig.dawProject);
        if (fs.existsSync(projectPath)) {
          console.log(`  ✓ DAW project: ${mikuConfig.dawProject}`);
        } else {
          console.log(`  ○ DAW project not found: ${mikuConfig.dawProject}`);
        }
      } else {
        console.log('  ○ DAW project: not configured');
      }

      console.log(`  ○ Import strategy: ${mikuConfig.importStrategy}`);
    } else {
      console.log('  ○ Miku profile not configured');
    }

    console.log('');
  }

  // Summary
  console.log('Summary:');
  if (hasIssues) {
    console.log('  Some dependencies are missing. Install them to use all features.');
    return ExitCodes.DEPENDENCY_MISSING;
  } else {
    console.log('  All checks passed!');
    return ExitCodes.SUCCESS;
  }
}

function checkCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? 'where' : 'which';

    const proc = spawn(checkCmd, [cmd], {
      stdio: 'pipe',
      shell: true,
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}
