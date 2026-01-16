# TakoMusic v7 Tutorial

This guide walks through the v7 workflow: writing code, using the web app, rendering, and VSCode features.

## 1) Quick Start

Create a file `src/main.mf`:

```mf
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }

    sound "piano" kind instrument { range A0..C8; }

    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q, vel: 0.7);
        note(E4, q, vel: 0.7);
        note(G4, q, vel: 0.7);
        note(C5, q, vel: 0.7);
      };
    }
  };
}
```

Compile:

```bash
mf build src/main.mf
```

## 2) Web Playground

- Sign in with a simple username.
- Save or load projects (IndexedDB).
- Click **Compile** to view IR/AST.
- Click **Play** to hear the score.
- Click **MIDI** to download a MIDI file.
- Click **WAV** to download a rendered audio file.

## 3) VSCode Extension

Features:

- LSP diagnostics, hover, completion, format, code actions.

No additional commands are required.

## 4) Browser Audio Export

Audio export is rendered locally in the browser (OfflineAudioContext) and downloaded as WAV.

## 5) Tips

- Use small motifs and combine with `repeat`, `concat`, and `merge`.
- Use `std:autogen` for basslines and accompaniment.
