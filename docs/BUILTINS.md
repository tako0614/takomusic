# Tako v3 Core DSL / Built-ins

This document describes the language-level constructs that produce `Score` and `Clip` values.
High-level musical helpers live in `std:*` modules.

## `score { ... }`

`score { ... }` returns a `Score`.

Sections:

- `meta { ... }`
- `tempo { ... }`
- `meter { ... }`
- `sound ... { ... }`
- `track ... { ... }`
- `marker ...` (optional)

### meta

```
meta {
  title "Demo";
  artist "Someone";
}
```

Unknown fields may be stored in `meta.ext`.

### tempo

```
tempo {
  1:1 -> 120bpm;
  9:1 -> 90bpm @ q;
}
```

`@ unit` defaults to `q`.

### meter

```
meter {
  1:1 -> 4/4;
  17:1 -> 3/4;
}
```

## sound declarations

Sound declarations define abstract instruments and are bound by Render Profiles.

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
  vocal { lang "en-US"; range A3..E5; }
}
```

## track declarations

```
track "Piano" role Instrument sound "piano" {
  place 1:1 pianoPart();
}
```

- `role`: `Instrument | Drums | Vocal | Automation`
- `sound`: `SoundId` declared by `sound`
- `place`: `PosRef` + `Clip`

## score markers

Score markers annotate absolute positions in the score.

```
marker(1:1, "section", "Intro");
```

## `clip { ... }`

`clip { ... }` returns a `Clip` with a local cursor starting at 0.

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

## Event Mapping (IR)

- `note` -> `NoteEvent`
- `chord` -> `ChordEvent`
- `hit` -> `DrumHitEvent`
- `cc` -> `ControlEvent`
- `automation` -> `AutomationEvent`
- `marker` -> `MarkerEvent`

## See also

- `docs/LANGUAGE.md` - language syntax and literals
- `docs/STDLIB.md` - standard library modules
