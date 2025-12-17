# TakoMusic

A domain-specific language (DSL) for music composition that generates VSQX, MusicXML, and MIDI files.

## Features

- **MFS Language**: Write music using a simple, readable syntax
- **Multi-format Export**: Generate VSQX (Vocaloid), MusicXML (vocals), and MIDI (instruments)
- **Module System**: Organize code with imports/exports
- **CLI Tools**: Build, check, format, and render your projects
- **External Tool Integration**: Connect to NEUTRINO, FluidSynth, and more

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Create a new project

```bash
mf init myproject
cd myproject
```

### 2. Edit src/main.mf

```mfs
export proc main() {
  // Setup
  title("My First Song");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  // Vocal track
  track(vocal, v1, {}) {
    at(1:1);
    note(C4, 1/4, "ド");
    note(D4, 1/4, "レ");
    note(E4, 1/4, "ミ");
    note(F4, 1/4, "ファ");
  }

  // Piano track
  track(midi, piano, { ch: 1, program: 0 }) {
    at(1:1);
    chord([C4, E4, G4], 1/1);
  }

  // Drum track
  track(midi, drums, { ch: 10 }) {
    at(1:1);
    drum(kick, 1/4);
    drum(hhc, 1/4);
    drum(snare, 1/4);
    drum(hhc, 1/4);
  }
}
```

### 3. Build and render

```bash
mf build              # Generate IR, MIDI, MusicXML, VSQX
mf render -p cli      # Render audio using external tools
```

## Language Reference

### Global Functions

| Function | Description | Example |
|----------|-------------|---------|
| `title(name)` | Set song title | `title("My Song")` |
| `ppq(value)` | Pulses per quarter note | `ppq(480)` |
| `tempo(bpm)` | Set tempo | `tempo(128)` |
| `timeSig(num, den)` | Time signature | `timeSig(4, 4)` |

### Track Functions

| Function | Description | Example |
|----------|-------------|---------|
| `track(kind, name, opts)` | Create track | `track(vocal, v1, {})` |
| `at(time)` | Set cursor position | `at(1:1)` or `at(2:3:240)` |
| `atTick(tick)` | Set cursor by tick | `atTick(1920)` |
| `advance(dur)` | Move cursor forward | `advance(1/4)` |

### Note Functions

| Function | Description | Example |
|----------|-------------|---------|
| `note(pitch, dur, [lyric])` | Add note | `note(C4, 1/4, "あ")` |
| `rest(dur)` | Add rest | `rest(1/8)` |
| `chord(pitches, dur)` | Add chord (MIDI only) | `chord([C4, E4, G4], 1/2)` |
| `drum(name, dur, [vel])` | Add drum hit | `drum(kick, 1/4, 100)` |

### Pitch Literals

- Natural: `C4`, `D4`, `E4`, `F4`, `G4`, `A4`, `B4`
- Sharp: `C#4`, `D#4`, `F#4`, `G#4`, `A#4`
- Flat: `Db4`, `Eb4`, `Gb4`, `Ab4`, `Bb4`

### Duration Literals

- `1/1` = whole note
- `1/2` = half note
- `1/4` = quarter note
- `1/8` = eighth note
- `1/16` = sixteenth note
- `3/8` = dotted quarter note

### Time Literals

- `1:1` = bar 1, beat 1
- `2:3` = bar 2, beat 3
- `1:1:240` = bar 1, beat 1, tick 240

### Drum Names

`kick`, `snare`, `hhc` (hi-hat closed), `hho` (hi-hat open), `tom1`, `crash`, `ride`

### Control Structures

```mfs
// Procedures
proc myPattern() {
  note(C4, 1/4, "あ");
}

// Loops
for (i in 1..=4) {
  myPattern();
}

// Conditionals
if (x > 0) {
  note(C4, 1/4, "あ");
} else {
  rest(1/4);
}
```

### Modules

```mfs
// phrases/drums.mf
export proc BEAT_8() {
  drum(kick, 1/8);
  drum(hhc, 1/8);
  // ...
}

// main.mf
import { BEAT_8 } from "./phrases/drums.mf";

export proc main() {
  // ...
  track(midi, drums, { ch: 10 }) {
    for (bar in 1..=4) {
      BEAT_8();
    }
  }
}
```

## CLI Commands

### mf init

Create a new project.

```bash
mf init [project-name]
```

### mf build

Compile MFS to IR and generate output files.

```bash
mf build [--main <file>]
```

### mf check

Run static analysis.

```bash
mf check [file]
```

### mf fmt

Format source files.

```bash
mf fmt [file]
```

### mf render

Render audio using external tools.

```bash
mf render -p <profile> [options]

Options:
  -p, --profile <name>  Profile to use (cli, miku, all)
  -t, --timeout <sec>   Timeout per command (default: 600)
  --dry-run             Show commands without executing
```

### mf doctor

Check project configuration and dependencies.

```bash
mf doctor
```

## Configuration (mfconfig.toml)

```toml
[project]
name = "my-song"
version = "1.0.0"
main = "src/main.mf"
dist = "dist"
out = "out"

[profiles.cli]
backend = "headless"
musicxml_out = "dist/vocal.musicxml"
band_mid_out = "dist/band.mid"
render_out = "out/mix.mp3"
vocal_cmd = ["neutrino", "{musicxml}", "{vocal_wav}"]
midi_cmd = ["fluidsynth", "-ni", "soundfont.sf2", "{mid}", "-F", "{band_wav}"]
mix_cmd = ["ffmpeg", "-i", "{vocal_wav}", "-i", "{band_wav}", "-y", "{mix_wav}"]

[profiles.miku]
backend = "daw"
import_strategy = "manual"
vsqx_out = "dist/vocal.vsqx"
tempo_mid_out = "dist/tempo.mid"
```

## Error Codes

| Code | Description |
|------|-------------|
| E050 | Global function called after track started |
| E110 | Pitch out of range (0-127) |
| E200 | Vocal note overlap |
| E210 | Invalid/empty lyric in vocal track |
| E220 | drum() used in vocal track |
| E221 | chord() used in vocal track |
| E300 | Top-level execution in imported module |
| E310 | Recursion detected |
| E400 | Import not found / undefined symbol / no main() |
| E401 | For range bounds must be compile-time constants |

## Warning Codes

| Code | Description |
|------|-------------|
| W100 | Extremely short note duration (< 1/64) |
| W110 | Pitch outside typical vocal range |
| W200 | Too many tempo events (> 128) |

## External Tools Setup

### NEUTRINO (Vocal Synthesis)

1. Download NEUTRINO from official site
2. Set `NEUTRINO_DIR` environment variable
3. Configure `vocal_cmd` in mfconfig.toml

### FluidSynth (MIDI Rendering)

1. Install FluidSynth
2. Download a SoundFont (.sf2)
3. Configure `midi_cmd` in mfconfig.toml

### FFmpeg (Audio Mixing)

1. Install FFmpeg
2. Configure `mix_cmd` in mfconfig.toml

## License

MIT
