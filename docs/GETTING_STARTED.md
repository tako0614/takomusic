# Getting Started with TakoMusic

This guide will help you get started with TakoMusic, a music programming language for creating compositions through code.

## Installation

### Prerequisites

- Node.js 18.x or later
- npm

### Install from npm

```bash
npm install -g takomusic
```

### Build from source

```bash
git clone https://github.com/user/takomusic.git
cd takomusic
npm install
npm run build
```

## Your First Composition

Create a file called `hello.mf`:

```mf
export fn main() -> Score {
  return score {
    meta {
      title "Hello TakoMusic";
      artist "Me";
    }

    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "piano" kind instrument {
      label "Piano";
      range A0..C8;
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q);
        note(E4, q);
        note(G4, q);
        note(C5, q);
      };
    }
  };
}
```

## Running Your Code

### Check for errors

```bash
mf check hello.mf
```

### Build to Score IR

```bash
mf build hello.mf
```

This produces `hello.mf.score.json`, the intermediate representation.

### Render to MIDI

```bash
tako-render-midi hello.mf.score.json profiles/midi.mf.profile.json output.mid
```

## Core Concepts

### 1. Notes and Durations

Notes are the building blocks of music:

```mf
note(C4, q);      // C4 quarter note
note(D#4, h);     // D#4 half note
note(Bb3, e);     // Bb3 eighth note
chord([C4, E4, G4], w);  // C major chord, whole note
```

**Duration reference:**
| Symbol | Name | Beats (in 4/4) |
|--------|------|----------------|
| `w` | whole | 4 |
| `h` | half | 2 |
| `q` | quarter | 1 |
| `e` | eighth | 0.5 |
| `s` | sixteenth | 0.25 |
| `t` | thirty-second | 0.125 |

### 2. Clips

Clips are sequences of musical events:

```mf
fn melody() -> Clip {
  return clip {
    note(C4, q);
    note(D4, q);
    note(E4, h);
    rest(q);      // quarter rest
    note(G4, q);
  };
}
```

### 3. Functions

Reuse musical patterns with functions:

```mf
fn arpeggio(root: Pitch) -> Clip {
  return clip {
    note(root, e);
    note(root + 4, e);    // major third
    note(root + 7, e);    // perfect fifth
    note(root + 12, e);   // octave
  };
}

// Use it
track "Piano" role Instrument sound "piano" {
  place 1:1 arpeggio(C4);
  place 1:2 arpeggio(G4);
}
```

### 4. Standard Library

Import powerful functions from the standard library:

```mf
import { concat, repeat } from "std:core";
import { transpose } from "std:transform";
import { majorTriad, minorTriad } from "std:theory";
import { kick, snare, hhc } from "std:drums";
```

### 5. Tracks and Sounds

Define instruments and organize music into tracks:

```mf
// Define sounds
sound "lead" kind instrument { range C3..C6; }
sound "drums" kind drumKit { drumKeys { kick; snare; hhc; } }

// Create tracks
track "Lead" role Instrument sound "lead" {
  place 1:1 melody();
}

track "Drums" role Drums sound "drums" {
  place 1:1 drumPattern();
}
```

## Interactive Development

### REPL Mode

Experiment with code interactively:

```bash
mf repl
```

Commands:
- `.help` - Show help
- `.vars` - List defined variables
- `.load <file>` - Load a file
- `.reset` - Reset session
- `.exit` - Exit REPL

### Watch Mode

Auto-rebuild on file changes:

```bash
mf watch myfile.mf
mf watch -b myfile.mf  # Build on change
```

### Web Playground

Try TakoMusic in your browser at the official website playground.

## VS Code Extension

Install the TakoMusic VS Code extension for:
- Syntax highlighting
- Real-time error checking
- Code completion
- Hover documentation

## Render Profiles

Profiles configure how your music is rendered:

```json
{
  "renderer": "midi.standard",
  "output": {
    "path": "output.mid",
    "ppq": 480
  },
  "bindings": [
    { "selector": { "role": "Instrument" }, "config": { "channel": 0 } },
    { "selector": { "role": "Drums" }, "config": { "channel": 9 } }
  ]
}
```

Available renderers:
- **MIDI** - Standard MIDI files
- **MusicXML** - Notation software interchange
- **Lilypond** - Sheet music / PDF generation

## Next Steps

1. Read the [Language Specification](LANGUAGE.md)
2. Explore the [Standard Library](STDLIB.md)
3. Check out [example files](../examples/)
4. Learn about [DAW Integration](daw-integration.md)

## Getting Help

- Run `mf --help` for CLI options
- Use `.help` in REPL mode
- Check the [Built-in Functions](BUILTINS.md) reference
