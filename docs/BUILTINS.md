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

**Tempo Changes are Instantaneous:**

Each tempo entry defines an instant tempo change at the specified position. There is no built-in tempo curve (gradual rit./accel.).

**Approximating Gradual Tempo Changes:**

For ritardando or accelerando effects, use multiple tempo points:

```tako
tempo {
  1:1 -> 120bpm;
  // Gradual rit. over 4 bars (8 points for smoothness)
  5:1 -> 115bpm;
  5:3 -> 110bpm;
  6:1 -> 105bpm;
  6:3 -> 100bpm;
  7:1 -> 95bpm;
  7:3 -> 90bpm;
  8:1 -> 85bpm;
  8:3 -> 80bpm;
  9:1 -> 80bpm;  // Final tempo
}
```

**Recommendation:** For smooth tempo curves:
- Use at least 2 points per bar for gradual changes
- For half-beat precision in 4/4, use 8/8 meter temporarily
- Consider helper functions to generate tempo ramps programmatically

```tako
// Helper to generate tempo ramp (conceptual)
fn tempoRamp(startBar: Int, endBar: Int, startBpm: Int, endBpm: Int, pointsPerBar: Int) -> [TempoEvent] {
  // Generate intermediate tempo points
  // (Implementation depends on score-building patterns)
}
```

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
- `cc(num, value)` -> control event (cursor unchanged) — see CC Mapping below
- `automation(param, start, end, curve)` -> automation event (cursor unchanged)
- `marker(kind, label)` -> marker event (cursor unchanged)

### Validation Constraints

The following constraints are recommended but **not currently enforced** by the compiler. Future versions may add validation:

| Statement | Recommended Constraint | Notes |
|-----------|------------------------|-------|
| `note(pitch, dur, ...)` | `dur > 0` | Negative/zero durations produce undefined behavior |
| `chord(pitches, dur, ...)` | `dur > 0`, `pitches.length >= 1` | Empty chord array produces no event |
| `hit(key, dur, ...)` | `dur > 0` | Negative/zero durations produce undefined behavior |
| `rest(dur)` | `dur >= 0` | Negative durations move cursor backward |
| `breath(dur, ...)` | `dur > 0` | Default intensity is 0.6 if not specified |
| `automation(param, start, end, ...)` | `start < end` | Reversed ranges produce undefined behavior |
| `cc(num, value)` | `num >= 0`, `0 <= value <= 1` | Values passed as-is to IR |
| `vel: Float` | `0 <= vel <= 1` | Values passed as-is to IR |
| `breath(..., intensity)` | `0 <= intensity <= 1` | Default is 0.6 if not specified |

**Score-level constraints (not currently enforced):**

| Section | Recommended Constraint | Notes |
|---------|------------------------|-------|
| `tempo { pos -> Xbpm }` | `X > 0` | Zero/negative BPM produces undefined behavior |
| `meter { pos -> n/d }` | `n > 0`, `d > 0`, `d` is power of 2 | Non-power-of-2 denominators may cause issues |
| `meter` change | Should be at beat 1 (bar boundary) | Mid-bar changes may cause position resolution issues |
| `place posRef clip` | `posRef.bar >= 1`, `posRef.beat >= 1` | Zero/negative values produce undefined behavior |

Options (`opts`):

- `vel: Float` — velocity, normalized to [0.0, 1.0] (see Velocity below)
- `voice: Int` — voice number for polyphonic separation
- `tech: [TechniqueId]` — playing techniques (see Techniques below)
- `lyric: LyricSpan` — lyric attachment (note only)

### Velocity

Velocity values are normalized to the range `[0.0, 1.0]`:

- `0.0` = minimum (silent or near-silent)
- `1.0` = maximum (full force)
- Typical musical range: `0.3` to `0.9`

Renderers convert to target format (e.g., MIDI velocity 0-127).

```tako
note(C4, q, vel: 0.7);   // Moderately strong
note(C4, q, vel: 0.3);   // Soft
note(C4, q, vel: 1.0);   // Maximum force
```

### Techniques (TechniqueId)

`TechniqueId` values are identifiers (not strings) that describe playing techniques:

```tako
note(C4, q, tech: [legato]);
note(C4, q, tech: [staccato, accent]);
chord([C4, E4, G4], h, tech: [arpeggiate]);
```

**Standard techniques (recommended):**

| Technique | Description | Typical Use |
|-----------|-------------|-------------|
| `legato` | Smooth connection to next note | Melodic lines |
| `staccato` | Shortened, detached | Rhythmic emphasis |
| `accent` | Emphasized attack | Rhythmic stress |
| `tenuto` | Full duration, slight emphasis | Sustained phrases |
| `marcato` | Strong accent | Dramatic passages |
| `tremolo` | Rapid repetition | Sustained texture |
| `trill` | Rapid alternation with neighbor | Ornamentation |
| `arpeggiate` | Chord notes played in sequence | Harp, guitar style |
| `pizzicato` | Plucked string | Strings |
| `harmonics` | Harmonic overtones | Strings, guitar |

**Renderer behavior:**

- Renderers may support a subset of techniques
- Unknown techniques are handled per `degradePolicy`:
  - `Error`: validation fails
  - `Drop`: technique ignored
  - `Approx`: closest available approximation
- Custom techniques can be used; interpretation is renderer-dependent

## Event Mapping (IR)

- `note` -> `NoteEvent`
- `chord` -> `ChordEvent`
- `hit` -> `DrumHitEvent`
- `breath` -> `BreathEvent`
- `cc` -> `ControlEvent`
- `automation` -> `AutomationEvent`
- `marker` -> `MarkerEvent`

### DSL to IR Field Name Mapping

The clip DSL uses abbreviated option names for conciseness. These map to full field names in the IR:

| DSL Option | IR Field | Type | Notes |
|------------|----------|------|-------|
| `vel` | `velocity` | `Float` | Normalized 0.0-1.0 |
| `tech` | `techniques` | `[String]` | Array of TechniqueId strings |
| `voice` | `voice` | `Int` | Voice number |
| `lyric` | `lyric` | `LyricSpan` | Lyric attachment |

**Example:**

```tako
// DSL
note(C4, q, vel: 0.7, tech: [legato, staccato], voice: 1);
```

```json
// IR (NoteEvent)
{
  "type": "note",
  "start": { "n": 0, "d": 1 },
  "dur": { "n": 1, "d": 4 },
  "pitch": { "note": "C", "octave": 4 },
  "velocity": 0.7,
  "techniques": ["legato", "staccato"],
  "voice": 1
}
```

**Important for `mapEvents` users:** When accessing event fields in `mapEvents`, use the IR field names (`velocity`, `techniques`), not the DSL option names (`vel`, `tech`):

```tako
mapEvents(c, fn(e: Event) -> Event? {
  return match (e) {
    n: NoteEvent -> {
      const v = n.velocity ?? 0.7;  // Correct: velocity
      // const v = n.vel;           // ERROR: vel is not a field
      updateEvent(n, velocity: v * 0.8);
    };
    else -> e;
  };
});
```

### CC to ControlEvent Mapping

The `cc(num, value)` statement maps to a `ControlEvent` in the IR:

```tako
cc(1, 0.75);  // Modulation wheel at 75%
```

**IR representation:**

```json
{
  "type": "control",
  "start": { "n": 0, "d": 1 },
  "kind": "cc",
  "data": {
    "number": 1,
    "value": 0.75
  }
}
```

**Value normalization:**

- `value` is normalized to range `[0.0, 1.0]`
- Renderers convert to target format (e.g., MIDI CC uses 0-127)
- Values outside [0, 1] are clamped by renderers

**Common CC numbers:**

| Number | Name | Typical Use |
|--------|------|-------------|
| 1 | Modulation | Vibrato depth, expression |
| 7 | Volume | Track volume |
| 10 | Pan | Stereo position |
| 11 | Expression | Dynamic control |
| 64 | Sustain | Damper pedal (0 = off, 1 = on) |
| 74 | Brightness | Filter cutoff |

**Note:** CC semantics depend on the renderer and target format. The IR preserves the abstract representation; renderers apply format-specific mappings.

## Pickup / Anacrusis Handling

A **pickup** (or **anacrusis**) is a partial bar before the first full bar. Common examples:
- "Happy Birthday" starts with one quarter note pickup
- Many classical pieces begin on beat 3 or 4

### Design Limitation

Tako v3 uses 1-indexed bars, so there is no built-in "bar 0" concept for pickups. The recommended workaround is to use clip-level positioning with negative offsets.

### Recommended Pattern

Use `shift()` with a negative offset to create a pickup:

```tako
import { concat, shift } from "std:core";

fn withPickup() -> Clip {
  // Pickup: one quarter note before bar 1
  const pickup = clip {
    note(G4, q, vel: 0.6);  // The pickup note
  };

  // Main content starting at bar 1
  const main = clip {
    note(C5, h, vel: 0.7);
    note(E5, h, vel: 0.7);
  };

  // Shift pickup to start at position -1 (one quarter before 0)
  return concat(shift(pickup, -q), main);
}

export fn main() -> Score {
  return score {
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "piano" kind instrument { range A0..C8; }

    track "Piano" role Instrument sound "piano" {
      // Place at 1:1; the shifted pickup will appear before bar 1
      place 1:1 withPickup();
    }
  };
}
```

### How It Works

1. Create the pickup notes as a normal clip
2. Use `shift(clip, -duration)` to move the clip backward in time
3. When placed at `1:1`, events with negative positions appear before bar 1

### IR Representation

Events with negative start positions are valid in the IR:

```json
{
  "type": "note",
  "start": { "n": -1, "d": 1 },
  "dur": { "n": 1, "d": 1 },
  "pitch": { "note": "G", "octave": 4 }
}
```

Renderers should handle negative positions by:
1. Adjusting the audio/MIDI start time accordingly
2. Using pre-roll if the target format requires it
3. Reporting an error if the format cannot represent negative time

### Alternative: Explicit Bar 0 Meter

For complex pickups, use a short initial meter:

```tako
meter {
  1:1 -> 1/4;  // Bar 1 is just one quarter note (the pickup)
  2:1 -> 4/4;  // Bar 2 onward is normal 4/4
}
```

This approach:
- Keeps all positions positive
- Makes `1:1` the pickup bar
- Actual "bar 1" musically becomes bar 2 in the score
- May require adjusting all other bar references

### Choosing an Approach

| Approach | Pros | Cons |
|----------|------|------|
| Negative `shift()` | Intuitive bar numbering, clean code | Negative positions in IR |
| Short initial meter | All positions positive | Bar numbers shifted by 1 |

**Recommendation:** Use negative `shift()` for simple pickups (1-2 beats). Use explicit short meter for complex cases or when target format requires positive positions.

## See also

- `docs/LANGUAGE.md` - language syntax and literals
- `docs/STDLIB.md` - standard library modules
