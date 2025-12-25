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
- v3 spec package: `tako_v3_spec/README.md`
- Plan: `PLAN.md`

## Status

The v3 core compiler/evaluator, IR normalization, and renderer plugin host are implemented. `mf render` requires an external renderer plugin to be installed.

## Example (.mf)

```tako
import { repeat } from "std:core";
import * as vocal from "std:vocal";

fn lead() -> Clip {
  let c = clip {
    note(C4, q, vel: 0.75);
    note(D4, q, vel: 0.75);
    note(E4, h, vel: 0.78);
  };

  const lyr = vocal.text("hello", "en-US");
  c = vocal.align(c, lyr);

  return c;
}

export fn main() -> Score {
  return score {
    meta { title "Demo v3"; }

    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "lead_vocal" kind vocal {
      vocal { lang "en-US"; range A3..E5; }
    }

    track "Vocal" role Vocal sound "lead_vocal" {
      place 1:1 repeat(lead(), 4);
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
