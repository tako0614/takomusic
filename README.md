# TakoMusic (Tako v3)

TakoMusic is a music composition DSL that evaluates to a neutral `Score` IR and renders via external plugins.
The v3 design keeps the language core backend-agnostic and pushes sound binding to Render Profiles.

## Highlights

- `score`/`clip` DSL with deterministic evaluation (`export fn main() -> Score`)
- Rational time model (Dur/Pos) without ticks
- Abstract sounds + render profiles decouple composition from output
- Renderer Plugin protocol: `capabilities` / `validate` / `render`

## Documentation

- Language spec: `docs/LANGUAGE.md`
- Core DSL & built-ins: `docs/BUILTINS.md`
- Standard library: `docs/STDLIB.md`
- Rendering and plugins: `docs/RENDERING.md`
- Schemas: `docs/SCHEMAS.md`
- Plan: `PLAN.md`

## Status

The v3 core compiler/evaluator, IR normalization, and renderer plugin host are implemented. `mf render` requires an external renderer plugin to be installed.

## Example (.mf)

```tako
import { concat, repeat } from "std:core";
import * as transform from "std:transform";
import * as curves from "std:curves";
import * as vocal from "std:vocal";
import * as drums from "std:drums";

fn motif() -> Clip {
  return clip {
    note(C4, q, vel: 0.7);
    note(E4, q, vel: 0.72);
    note(G4, h, vel: 0.75);
  };
}

fn synthPart() -> Clip {
  const up = transform.transpose(motif(), 12);
  return concat(motif(), up);
}

fn vocalPart() -> Clip {
  let c = clip {
    note(A3, q, vel: 0.75);
    note(B3, q, vel: 0.76);
    note(C4, h, vel: 0.78);
  };

  const lyr = vocal.syllables(["star", "light", vocal.Ext], "en-US");
  c = vocal.align(c, lyr);
  c = vocal.vibrato(c, depth: 0.2, rate: 5.5);
  return vocal.loudness(c, curves.easeInOut(0.2, 0.8, 4), start: 0 / 1, end: q * 4);
}

export fn main() -> Score {
  const section = match (2) {
    1 -> "Intro";
    2 -> "Verse";
    else -> "Outro";
  };

  return score {
    meta { title "Starlight"; }

    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 110bpm; }
    marker(1:1, "section", section);

    sound "synth" kind instrument { label "Synth"; range C2..C6; }
    sound "lead_vocal" kind vocal { vocal { lang "en-US"; range A3..E5; } }
    sound "kit_standard" kind drumKit {
      drumKeys { kick; snare; hhc; hho; crash; ride; }
    }

    track "Synth" role Instrument sound "synth" {
      place 1:1 repeat(synthPart(), 2);
    }

    track "Drums" role Drums sound "kit_standard" {
      place 1:1 drums.basicRock(2, q);
    }

    track "Vocal" role Vocal sound "lead_vocal" {
      place 1:1 vocalPart();
    }
  };
}
```

## Pipeline (v3)

1. Parse `.mf` -> AST
2. Resolve/import + typecheck (Pos/Dur separation)
3. Evaluate `main()` -> `Score`
4. Normalize IR (bar:beat -> absolute Pos)
5. Emit `score.json` (IR v3)
6. Render via profile + renderer plugin

## CLI

- `mf check` checks the entry `.mf`
- `mf build` writes `.mf.score.json` into `dist`
- `mf render` runs validate + render using `profiles/default.mf.profile.json` (or `--profile`)

Renderer plugins are external executables; use `--plugin` to override the resolver if needed.

## Versioning

- Language: v3
- IR schema: `tako.irVersion = 3`
- Profile schema: `tako.profileVersion = 1`
- Plugin protocol: `tako.pluginProtocolVersion = 1`

## License

AGPL-3.0
