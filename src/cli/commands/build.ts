// mf build command - compile MFS to IR and profile outputs

import * as fs from 'fs';
import * as path from 'path';
import { Compiler } from '../../compiler/index.js';
import { ExitCodes, MFError } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import type { SongIR } from '../../types/ir.js';
import { generateMusicXML } from '../../generators/musicxml.js';
import { generateMidi } from '../../generators/midi.js';
import { generateVsqx } from '../../generators/vsqx.js';
import { generateTempoMidi } from '../../generators/tempo-midi.js';

export async function buildCommand(args: string[]): Promise<number> {
  // Parse arguments
  let profile: string = 'all';
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
    // Compile to IR using Compiler (handles imports)
    console.log('Compiling...');
    const compiler = new Compiler(baseDir);
    const ir = compiler.compile(entryPath);

    // Ensure dist directory exists
    const distDir = path.join(baseDir, config.project.dist);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Write IR
    const irPath = path.join(distDir, 'song.ir.json');
    fs.writeFileSync(irPath, JSON.stringify(ir, null, 2));
    console.log(`Generated: ${path.relative(baseDir, irPath)}`);

    // Generate profile-specific outputs
    if (profile === 'cli' || profile === 'all') {
      await buildCliProfile(ir, config, baseDir);
    }

    if (profile === 'miku' || profile === 'all') {
      await buildMikuProfile(ir, config, baseDir);
    }

    console.log('Build complete.');
    return ExitCodes.SUCCESS;
  } catch (err) {
    if (err instanceof MFError) {
      console.error(err.toString());
    } else {
      console.error(`Error: ${(err as Error).message}`);
    }
    return ExitCodes.STATIC_ERROR;
  }
}

async function buildCliProfile(ir: SongIR, config: any, baseDir: string): Promise<void> {
  const cliConfig = config.profiles.cli;
  if (!cliConfig) {
    console.log('CLI profile not configured, skipping.');
    return;
  }

  // Generate MusicXML for vocal tracks
  const musicxmlPath = path.join(baseDir, cliConfig.musicxmlOut);
  fs.mkdirSync(path.dirname(musicxmlPath), { recursive: true });
  const musicxml = generateMusicXML(ir);
  fs.writeFileSync(musicxmlPath, musicxml);
  console.log(`Generated: ${path.relative(baseDir, musicxmlPath)}`);

  // Generate MIDI for band tracks
  const midiPath = path.join(baseDir, cliConfig.bandMidOut);
  fs.mkdirSync(path.dirname(midiPath), { recursive: true });
  const midi = generateMidi(ir);
  fs.writeFileSync(midiPath, midi);
  console.log(`Generated: ${path.relative(baseDir, midiPath)}`);
}

async function buildMikuProfile(ir: SongIR, config: any, baseDir: string): Promise<void> {
  const mikuConfig = config.profiles.miku;
  if (!mikuConfig) {
    console.log('Miku profile not configured, skipping.');
    return;
  }

  // Generate VSQX for vocal tracks
  const vsqxPath = path.join(baseDir, mikuConfig.vsqxOut);
  fs.mkdirSync(path.dirname(vsqxPath), { recursive: true });
  const vsqx = generateVsqx(ir);
  fs.writeFileSync(vsqxPath, vsqx);
  console.log(`Generated: ${path.relative(baseDir, vsqxPath)}`);

  // Generate tempo MIDI
  const tempoMidiPath = path.join(baseDir, mikuConfig.tempoMidOut);
  fs.mkdirSync(path.dirname(tempoMidiPath), { recursive: true });
  const tempoMidi = generateTempoMidi(ir);
  fs.writeFileSync(tempoMidiPath, tempoMidi);
  console.log(`Generated: ${path.relative(baseDir, tempoMidiPath)}`);
}
