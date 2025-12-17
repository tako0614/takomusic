// Configuration file parser for mfconfig.toml

import * as fs from 'fs';
import * as path from 'path';
import TOML from 'toml';

export interface ProjectConfig {
  entry: string;
  dist: string;
  out: string;
  defaultProfile: string;
}

export interface MikuProfile {
  backend: 'miku-daw';
  importStrategy: 'manual';
  dawExe?: string;
  dawArgs?: string[];
  dawProject?: string;
  vsqxOut: string;
  tempoMidOut: string;
  renderOut: string;
}

export interface CliProfile {
  backend: 'headless';
  vocalCmd?: string[];
  midiCmd?: string[];
  mixCmd?: string[];
  musicxmlOut: string;
  bandMidOut: string;
  renderOut: string;
}

export type Profile = MikuProfile | CliProfile;

export interface MFConfig {
  project: ProjectConfig;
  profiles: {
    miku?: MikuProfile;
    cli?: CliProfile;
  };
}

const DEFAULT_CONFIG: MFConfig = {
  project: {
    entry: 'src/main.mf',
    dist: 'dist',
    out: 'out',
    defaultProfile: 'cli',
  },
  profiles: {
    miku: {
      backend: 'miku-daw',
      importStrategy: 'manual',
      vsqxOut: 'dist/vocal.vsqx',
      tempoMidOut: 'dist/tempo.mid',
      renderOut: 'out/mix.wav',
    },
    cli: {
      backend: 'headless',
      musicxmlOut: 'dist/vocal.musicxml',
      bandMidOut: 'dist/band.mid',
      renderOut: 'out/mix.wav',
    },
  },
};

export function loadConfig(configPath: string): MFConfig {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = TOML.parse(content);
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Config file not found: ${configPath}`);
    }
    throw err;
  }
}

export function findConfigPath(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    const configPath = path.join(currentDir, 'mfconfig.toml');
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function mergeConfig(defaults: MFConfig, parsed: any): MFConfig {
  return {
    project: {
      entry: parsed.project?.entry ?? defaults.project.entry,
      dist: parsed.project?.dist ?? defaults.project.dist,
      out: parsed.project?.out ?? defaults.project.out,
      defaultProfile: parsed.project?.default_profile ?? defaults.project.defaultProfile,
    },
    profiles: {
      miku: parsed.profiles?.miku
        ? {
            backend: 'miku-daw',
            importStrategy: parsed.profiles.miku.import_strategy ?? 'manual',
            dawExe: parsed.profiles.miku.daw_exe,
            dawArgs: parsed.profiles.miku.daw_args,
            dawProject: parsed.profiles.miku.daw_project,
            vsqxOut: parsed.profiles.miku.vsqx_out ?? defaults.profiles.miku!.vsqxOut,
            tempoMidOut: parsed.profiles.miku.tempo_mid_out ?? defaults.profiles.miku!.tempoMidOut,
            renderOut: parsed.profiles.miku.render_out ?? defaults.profiles.miku!.renderOut,
          }
        : defaults.profiles.miku,
      cli: parsed.profiles?.cli
        ? {
            backend: 'headless',
            vocalCmd: parsed.profiles.cli.vocal_cmd,
            midiCmd: parsed.profiles.cli.midi_cmd,
            mixCmd: parsed.profiles.cli.mix_cmd,
            musicxmlOut: parsed.profiles.cli.musicxml_out ?? defaults.profiles.cli!.musicxmlOut,
            bandMidOut: parsed.profiles.cli.band_mid_out ?? defaults.profiles.cli!.bandMidOut,
            renderOut: parsed.profiles.cli.render_out ?? defaults.profiles.cli!.renderOut,
          }
        : defaults.profiles.cli,
    },
  };
}

export function generateDefaultConfig(): string {
  return `[project]
entry = "src/main.mf"
dist  = "dist"
out   = "out"
default_profile = "cli"

[profiles.miku]
backend = "miku-daw"
import_strategy = "manual"
# daw_exe  = "reaper"
# daw_args = ["-renderproject", "{project}"]
# daw_project = "reaper/song.rpp"
vsqx_out     = "dist/vocal.vsqx"
tempo_mid_out= "dist/tempo.mid"
render_out   = "out/mix.wav"

[profiles.cli]
backend = "headless"
# vocal_cmd = ["neutrino-run", "{musicxml}", "{vocal_wav}"]
# midi_cmd  = ["fluidsynth-run", "{mid}", "{band_wav}"]
# mix_cmd   = ["ffmpeg", "-i", "{vocal_wav}", "-i", "{band_wav}", "{mix_wav}"]
musicxml_out = "dist/vocal.musicxml"
band_mid_out = "dist/band.mid"
render_out   = "out/mix.wav"
`;
}
