// mf play command - live preview using FluidSynth or system MIDI player

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { Compiler } from '../../compiler/index.js';
import { generateMidi } from '../../generators/midi.js';

// Track active process for stopping playback
let activeProcess: ChildProcess | null = null;

export async function playCommand(args: string[]): Promise<number> {
  let inputFile: string | undefined;
  let soundfont: string | undefined;
  let loop = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-s' || args[i] === '--soundfont') {
      soundfont = args[i + 1];
      i++;
    } else if (args[i] === '-l' || args[i] === '--loop') {
      loop = true;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf play [file.mf] [options]

Options:
  -s, --soundfont <path>  Path to SoundFont file (.sf2)
  -l, --loop              Loop playback
  -h, --help              Show this help message

Description:
  Plays the MIDI output using FluidSynth for instant preview.
  If no file is specified, uses the main source from mfconfig.toml.
  Press Ctrl+C to stop playback.
`);
      return ExitCodes.SUCCESS;
    } else if (!inputFile && !args[i].startsWith('-')) {
      inputFile = args[i];
    }
  }

  // Setup stop handler
  setupStopHandler();

  // Find config
  const configPath = findConfigPath(process.cwd());
  if (!configPath && !inputFile) {
    console.error('No mfconfig.toml found and no input file specified.');
    return ExitCodes.IO_ERROR;
  }

  let baseDir = process.cwd();
  let mainSource: string;

  if (configPath) {
    const config = loadConfig(configPath);
    baseDir = path.dirname(configPath);
    mainSource = inputFile || path.join(baseDir, config.project.entry);
  } else {
    mainSource = inputFile!;
  }

  // Check input file exists
  if (!fs.existsSync(mainSource)) {
    console.error(`Source file not found: ${mainSource}`);
    return ExitCodes.IO_ERROR;
  }

  // Find soundfont if not specified
  if (!soundfont) {
    soundfont = findDefaultSoundfont();
  }

  if (!soundfont || !fs.existsSync(soundfont)) {
    console.error('No SoundFont found. Please specify one with -s option.');
    console.error('You can install a soundfont or configure it in mfconfig.toml');
    return ExitCodes.DEPENDENCY_MISSING;
  }

  console.log(`Compiling ${path.basename(mainSource)}...`);

  try {
    // Compile source
    const compiler = new Compiler(path.dirname(mainSource));
    const ir = compiler.compile(mainSource);

    // Generate MIDI
    const midiBuffer = generateMidi(ir);

    // Create temp MIDI file
    const tempDir = os.tmpdir();
    const tempMidi = path.join(tempDir, `takomusic-preview-${Date.now()}.mid`);
    fs.writeFileSync(tempMidi, midiBuffer);

    console.log(`Playing ${ir.title || 'Untitled'}...`);
    console.log('Press Ctrl+C to stop.\n');

    // Play using FluidSynth
    const result = await playMidi(tempMidi, soundfont, loop);

    // Cleanup temp file
    try {
      fs.unlinkSync(tempMidi);
    } catch {
      // Ignore cleanup errors
    }

    return result;
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    return ExitCodes.STATIC_ERROR;
  }
}

function setupStopHandler(): void {
  const handler = () => {
    if (activeProcess) {
      console.log('\nStopping playback...');
      activeProcess.kill('SIGTERM');
      setTimeout(() => {
        if (activeProcess && !activeProcess.killed) {
          activeProcess.kill('SIGKILL');
        }
      }, 1000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}

function findDefaultSoundfont(): string | undefined {
  // Common soundfont locations
  const locations = [
    // Windows
    'C:/tools/soundfonts/FluidR3_GM.sf2',
    'C:/tools/soundfonts/GeneralUser.sf2',
    'C:/soundfonts/FluidR3_GM.sf2',
    // Linux
    '/usr/share/sounds/sf2/FluidR3_GM.sf2',
    '/usr/share/soundfonts/FluidR3_GM.sf2',
    // macOS
    '/usr/local/share/soundfonts/FluidR3_GM.sf2',
    // User directory
    path.join(os.homedir(), '.local/share/soundfonts/FluidR3_GM.sf2'),
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  return undefined;
}

async function playMidi(midiFile: string, soundfont: string, loop: boolean): Promise<number> {
  return new Promise((resolve) => {
    // Try FluidSynth first
    const fluidsynthPath = findFluidsynth();

    if (!fluidsynthPath) {
      console.error('FluidSynth not found. Please install FluidSynth:');
      console.error('  Windows: winget install FluidSynth.FluidSynth');
      console.error('  macOS: brew install fluid-synth');
      console.error('  Linux: apt install fluidsynth');
      resolve(ExitCodes.DEPENDENCY_MISSING);
      return;
    }

    const args = [
      '-a', getAudioDriver(),
      '-m', 'alsa_seq',
      '-g', '1.0',  // Gain
      '-o', 'synth.reverb.active=yes',
      '-o', 'synth.chorus.active=yes',
    ];

    if (loop) {
      args.push('-l');
    }

    args.push('-i', soundfont, midiFile);

    const proc = spawn(fluidsynthPath, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    activeProcess = proc;

    proc.on('close', (code) => {
      activeProcess = null;
      resolve(code === 0 ? ExitCodes.SUCCESS : ExitCodes.EXTERNAL_TOOL_ERROR);
    });

    proc.on('error', (err) => {
      activeProcess = null;
      console.error(`Failed to start FluidSynth: ${err.message}`);
      resolve(ExitCodes.DEPENDENCY_MISSING);
    });
  });
}

function findFluidsynth(): string | undefined {
  const platform = os.platform();

  const locations: string[] = [];

  if (platform === 'win32') {
    locations.push(
      'C:/tools/bin/fluidsynth.exe',
      'C:/Program Files/FluidSynth/bin/fluidsynth.exe',
      'C:/Program Files (x86)/FluidSynth/bin/fluidsynth.exe',
    );
  } else if (platform === 'darwin') {
    locations.push(
      '/usr/local/bin/fluidsynth',
      '/opt/homebrew/bin/fluidsynth',
    );
  } else {
    locations.push(
      '/usr/bin/fluidsynth',
      '/usr/local/bin/fluidsynth',
    );
  }

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  // Try to find in PATH
  return 'fluidsynth';
}

function getAudioDriver(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'dsound';  // DirectSound on Windows
  } else if (platform === 'darwin') {
    return 'coreaudio';  // CoreAudio on macOS
  } else {
    return 'pulseaudio';  // PulseAudio on Linux
  }
}
