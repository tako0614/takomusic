# Tako v3 Language Specification

Tako v3 is a deterministic DSL that evaluates to a neutral `Score` IR.
Rendering is performed by backend plugins via Render Profiles, keeping the language core backend-agnostic.

## Quick Example

```tako
import { repeat } from "std:core";
import * as vocal from "std:vocal";

fn vocalPart() -> Clip {
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
      place 1:1 repeat(vocalPart(), 4);
    }
  };
}
```

## Files and Entry Point

- Source: `*.mf`
- Render Profile: `*.mf.profile.json`
- IR dump (optional): `*.mf.score.json`
- Programs MUST export `fn main() -> Score`.

Imports are either std modules or local files:

```tako
import { repeat } from "std:core";
import { foo } from "./foo.mf";
```

## Time Model and Literals

Tako v3 uses rational numbers for time. There are no ticks.

- Dur literals: `w h q e s t x` (whole..64th), dotted (`q.`), or fraction (`1/4`)
- PosRef literals: `bar:beat` (1-indexed), e.g. `1:1`, `2:3`
- Tick form (`bar:beat:tick`) is NOT allowed
- Pitch literals: `C4`, `F#3`, `Bb5`, `C4+25c`

`Dur` and `Pos` are distinct types:

- `Pos + Dur -> Pos`
- `Dur + Dur -> Dur`
- `Pos + Pos` is invalid

## Match Expression

`match` compares a value against patterns and returns the first matching arm.

```
const label = match (mode) {
  0 -> "intro";
  1 -> "verse";
  else -> "other";
};
```

- Patterns are expressions evaluated and compared with `==` semantics.
- `else` is optional; if omitted and no arm matches, the result is `null`.

## Score DSL (`score { ... }`)

`score { ... }` returns a `Score` value.

Supported sections:

- `meta { ... }`
- `tempo { ... }`
- `meter { ... }`
- `sound ... { ... }`
- `track ... { ... }`
- `marker ...` (optional)

### Meta

```
meta {
  title "Demo";
  artist "Someone";
}
```

Unknown fields may be stored in `meta.ext`.

### Tempo

```
tempo {
  1:1 -> 120bpm;
  9:1 -> 90bpm @ q;
}
```

`@ unit` defaults to `q`.

### Meter

```
meter {
  1:1 -> 4/4;
  17:1 -> 3/4;
}
```

### Sound Declarations (Abstract)

Sound declarations define abstract instruments and are bound to concrete backends by Render Profiles.

```
sound "piano" kind instrument {
  label "Piano";
  family "keyboard";
  range A0..C8;
}

sound "kit_standard" kind drumKit {
  drumKeys { kick; snare; hhc; hho; crash; ride; }
}

sound "lead_vocal" kind vocal {
  vocal {
    lang "en-US";
    range A3..E5;
  }
}
```

### Track Declarations

```
track "Piano" role Instrument sound "piano" {
  place 1:1 pianoPart();
}
```

- `role`: `Instrument | Drums | Vocal | Automation`
- `sound`: `SoundId` declared by `sound`
- `place`: `PosRef` + `Clip`

Undefined `SoundId` is a compile error.

### Score Markers

Score markers annotate absolute positions in the score (not per-clip).

```
marker(1:1, "section", "Intro");
```

## Clip DSL (`clip { ... }`)

`clip { ... }` returns a `Clip`. Each clip has a local `cursor: Pos` starting at 0.

Statements:

- `at(pos)` -> set cursor
- `rest(dur)` -> cursor += dur
- `note(pitch, dur, opts?)` -> add note; cursor += dur
- `chord([pitch...], dur, opts?)` -> add chord; cursor += dur
- `hit(key, dur, opts?)` -> add drum hit; cursor += dur
- `cc(num, value)` -> control event (cursor unchanged)
- `automation(param, start, end, curve)` -> automation event (cursor unchanged)
- `marker(kind, label)` -> marker event (cursor unchanged)

Options (`opts`):

- `vel: Float` (0..1 recommended)
- `voice: Int`
- `tech: [TechniqueId]`
- `lyric: LyricSpan` (note only)

Example:

```
clip {
  note(C4, q, vel: 0.7);
  rest(e);
  hit("kick", q, vel: 0.9);
}
```

## Lyrics (std:vocal)

Lyrics are not forced by the core language. Use `std:vocal` for alignment.

```
import * as vocal from "std:vocal";

const lyr = vocal.text("hello", "en-US");
c = vocal.align(c, lyr);
```

## Determinism

`main()` is pure. Randomness must flow through `std:random` (`rng(seed)`).

## Related Specs

- IR schema: `tako_v3_spec/IR_V3.schema.json`
- Render Profile schema: `tako_v3_spec/PROFILE_V3.schema.json`
- Renderer Plugin protocol: `tako_v3_spec/PLUGIN_V3.md`
