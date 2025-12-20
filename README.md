# TakoMusic

A domain-specific language (DSL) for music composition that generates VSQX, MusicXML, and MIDI files.

## Features

- **MFS Language**: Write music using a simple, readable syntax
- **Multi-format Export**: Generate VSQX (Vocaloid), MusicXML (notation), and MIDI (instruments)
- **Advanced MIDI**: CC, pitch bend, aftertouch, NRPN, SysEx, MPE support
- **Extended Notation**: Tuplets, grace notes, articulations, dynamics, ornaments
- **Vocaloid Support**: Full parameter control, vibrato, growl, cross-synthesis
- **Algorithmic Composition**: Euclidean rhythms, Markov chains, pattern generation
- **Module System**: Organize code with imports/exports
- **CLI Tools**: Build, check, format, play, import, record, and render

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Create a new project

```bash
mf init myproject           # Default template
mf init myproject -t piano  # Piano template
mf init --list              # List all templates
```

### 2. Edit src/main.mf

```mfs
export proc main() {
  title("My First Song");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  track(midi, piano, { ch: 1, program: 0 }) {
    at(1:1);
    chord([C4, E4, G4], 1n);
  }

  track(midi, drums, { ch: 10, vel: 100 }) {
    at(1:1);
    drum(kick, 4n); drum(hhc, 4n);
    drum(snare, 4n); drum(hhc, 4n);
  }
}
```

### 3. Build and play

```bash
mf check              # Check for errors
mf build              # Generate MIDI, MusicXML, VSQX
mf play               # Live preview with FluidSynth
mf render -p cli      # Render audio
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `mf init [dir]` | Initialize new project |
| `mf build` | Compile to IR and output formats |
| `mf check` | Static analysis |
| `mf fmt` | Format source files |
| `mf play [file]` | Live preview with FluidSynth |
| `mf import <file>` | Import MusicXML to MFS |
| `mf record` | Record MIDI input |
| `mf render -p <profile>` | Render audio |
| `mf doctor` | Check dependencies |

**Available Templates:** `default`, `piano`, `orchestral`, `edm`, `chiptune`, `jazz`, `vocaloid`, `minimal`

## Documentation

- **[Builtin Functions](docs/BUILTINS.md)** - Low-level runtime functions (IR operations, MIDI control)
- **[Standard Library](docs/STDLIB.md)** - High-level music functions (theory, patterns, dynamics, etc.)

## Language Basics

### Pitch & Duration Literals

**Pitches:**
- Natural: `C4`, `D4`, `E4`, `F4`, `G4`, `A4`, `B4`
- Sharp: `C#4`, `D#4`, `F#4`, `G#4`, `A#4`
- Flat: `Db4`, `Eb4`, `Gb4`, `Ab4`, `Bb4`

**Durations:**
- `1n` = whole, `2n` = half, `4n` = quarter
- `8n` = eighth, `16n` = sixteenth, `32n` = thirty-second
- `4n.` = dotted quarter, `8n.` = dotted eighth
- `480t` = 480 ticks

**Time:**
- `1:1` = bar 1, beat 1
- `2:3` = bar 2, beat 3
- `1:1:240` = bar 1, beat 1, tick 240

**Drum Names:** `kick`, `snare`, `hhc`, `hho`, `tom1`, `crash`, `ride`

### Control Structures

```mfs
// Procedures
proc myPattern() {
  note(C4, 4n);
}

// Loops
for (i in 1..=4) {
  myPattern();
}

// Conditionals
if (x > 0) {
  note(C4, 4n);
} else {
  rest(4n);
}
```

### Modules

```mfs
// phrases/drums.mf
export proc BEAT_8() {
  drum(kick, 8n);
  drum(hhc, 8n);
}

// main.mf
import { BEAT_8 } from "./phrases/drums.mf";

export proc main() {
  track(midi, drums, { ch: 10 }) {
    for (bar in 1..=4) {
      BEAT_8();
    }
  }
}
```

### Standard Library Import

```mfs
import { major, minor } from "std:theory";
import { euclidean } from "std:patterns";
import { crescendo } from "std:dynamics";
```

## Configuration (mfconfig.toml)

```toml
[project]
name = "my-song"
version = "1.0.0"
entry = "src/main.mf"
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
```

## External Tools

### FluidSynth (Live Preview & MIDI Rendering)

```bash
# Windows
winget install FluidSynth.FluidSynth

# macOS
brew install fluid-synth

# Linux
apt install fluidsynth
```

### NEUTRINO (Vocal Synthesis)

1. Download from official site
2. Set `NEUTRINO_DIR` environment variable
3. Configure `vocal_cmd` in mfconfig.toml

### FFmpeg (Audio Mixing)

```bash
# Windows
winget install FFmpeg

# macOS
brew install ffmpeg

# Linux
apt install ffmpeg
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

## License

AGPL-3.0
