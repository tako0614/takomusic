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
  17:1 -> 60bpm @ h;
}
```

**Tempo Definition:**

`X bpm @ unit` means the specified `unit` duration occurs `X` times per minute.

- `120bpm` = 120 quarter notes per minute (unit defaults to `q`)
- `60bpm @ h` = 60 half notes per minute = 120 quarter notes per minute
- `90bpm @ e` = 90 eighth notes per minute = 45 quarter notes per minute

If `@ unit` is omitted, the unit defaults to `q` (quarter note).

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

Sound kinds:

- `instrument`
- `drumKit`
- `vocal`
- `fx` (renderer-specific or automation-focused sounds)

Common sound fields:

- `label: String`
- `family: String`
- `tags: [String]`
- `range: PitchRange` (e.g., `A0..C8`)
- `transposition: Int` (semitones)
- `hints: Object` (renderer-specific)

`vocal { ... }` fields:

- `lang: String`
- `range: PitchRange`
- `defaultLyricMode: "text" | "syllables" | "phonemes"`
- `preferredAlphabet: String`
- `tags: [String]`

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

Score markers annotate absolute positions in the score. They use a distinct syntax from clip markers:

```
marker(posRef, kind, label);
```

Example:

```
marker(1:1, "section", "Intro");
marker(9:1, "cue", "Bridge");
```

**Note**: Score `marker` and clip `marker` are distinct constructs:
- Score marker: `marker(posRef, kind, label)` — three arguments, first is PosRef
- Clip marker: `marker(kind, label)` — two arguments, placed at current cursor

## `clip { ... }`

`clip { ... }` returns a `Clip` with a local cursor starting at 0.

Statements:

- `at(pos)` -> set cursor
- `rest(dur)` -> cursor += dur
- `breath(dur, intensity?)` -> add breath event; cursor += dur (intended for vocal tracks)
- `note(pitch, dur, opts?)` -> add note; cursor += dur
- `chord([pitch...], dur, opts?)` -> add chord; cursor += dur
- `hit(key: DrumKey, dur, opts?)` -> add drum hit; cursor += dur (DrumKey is an identifier, not a string)
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
- `breath` -> `BreathEvent`
- `cc` -> `ControlEvent`
- `automation` -> `AutomationEvent`
- `marker` -> `MarkerEvent`

## See also

- `docs/LANGUAGE.md` - language syntax and literals
- `docs/STDLIB.md` - standard library modules
