# TakoMusic (v4)

TakoMusic is a music composition DSL that evaluates to a neutral `Score` IR and renders via external plugins.
The language core is backend-agnostic and pushes sound binding to Render Profiles.

## Highlights

- `score`/`clip` DSL with deterministic evaluation (`export fn main() -> Score`)
- Rational time model (Dur/Pos) without ticks
- Abstract sounds + render profiles decouple composition from output
- Renderer Plugin protocol: `capabilities` / `validate` / `render`
- Web Playground with real-time audio preview

## Quick Start

```bash
# Install
npm install -g takomusic

# Build a single file (no config needed)
mf build song.mf

# Or initialize a project
mf init
mf build
mf render
```

## Demo Song

Check out `examples/cyberpunk_drive.mf` - a complete synthwave track demonstrating TakoMusic's capabilities:

- 64 bars, 8 tracks, 128 BPM
- Drums, bass, arpeggios, pads, and lead melody
- Uses std:core, std:transform, std:theory, std:drums

```bash
# Build and render the demo
mf build examples/cyberpunk_drive.mf
mf render examples/cyberpunk_drive.mf.score.json -p profiles/midi.mf.profile.json
```

## Documentation

**Web Documentation**: https://takomusic.pages.dev (includes Playground)

Local documentation:
- Language spec: `docs/LANGUAGE.md`
- Core DSL & built-ins: `docs/BUILTINS.md`
- Standard library: `docs/STDLIB.md`
- Rendering and plugins: `docs/RENDERING.md`
- Schemas: `docs/SCHEMAS.md`

## Example (.mf)

```tako
import { concat, repeat } from "std:core";
import { kick, snare, hhc } from "std:drums";
import { majorTriad, minorTriad } from "std:theory";

fn drumPart() -> Clip {
  return clip {
    hit(kick, q, vel: 0.9);
    hit(hhc, e, vel: 0.5);
    hit(hhc, e, vel: 0.5);
    hit(snare, q, vel: 0.85);
    hit(hhc, q, vel: 0.5);
  };
}

fn chords() -> Clip {
  return clip {
    chord(majorTriad(C4), w, vel: 0.6);
    chord(minorTriad(A3), w, vel: 0.6);
    chord(majorTriad(F3), w, vel: 0.6);
    chord(majorTriad(G3), w, vel: 0.6);
  };
}

export fn main() -> Score {
  return score {
    meta { title "Simple Song"; }

    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "piano" kind instrument { range A0..C8; }
    sound "kit" kind drumKit {
      drumKeys { kick; snare; hhc; }
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 repeat(chords(), 2);
    }

    track "Drums" role Drums sound "kit" {
      place 1:1 repeat(drumPart(), 8);
    }
  };
}
```

## Pipeline

1. Parse `.mf` -> AST
2. Resolve/import + typecheck (Pos/Dur separation)
3. Evaluate `main()` -> `Score`
4. Normalize IR (bar:beat -> absolute Pos)
5. Emit `score.json` (IR v4)
6. Render via profile + renderer plugin

## CLI

```bash
# Check syntax and types
mf check song.mf

# Build single file (no config required)
mf build song.mf
mf build song.mf -o output.json

# Build project with mfconfig.toml
mf build
mf build -w  # Watch mode

# Render to output format
mf render score.json -p profile.json
```

Renderer plugins are external executables; use `--plugin` to override the resolver if needed.

## Standard Library

| Module | Description |
|--------|-------------|
| `std:core` | `concat`, `repeat`, `overlay`, `padTo`, `slice`, `shift` |
| `std:transform` | `transpose`, `stretch`, `quantize`, `swing`, `humanize` |
| `std:theory` | Chords, scales, intervals, progressions |
| `std:curves` | `linear`, `easeInOut`, `piecewise` |
| `std:drums` | Drum keys and patterns |
| `std:vocal` | `text`, `align`, `vibrato`, `autoBreath` |

## Versioning

- Language: v4
- IR schema: `tako.irVersion = 4`
- Profile schema: `tako.profileVersion = 1`
- Plugin protocol: `tako.pluginProtocolVersion = 1`

## License

AGPL-3.0
