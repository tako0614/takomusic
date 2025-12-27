# Tako v3 Standard Library (std:*)

This document describes the v3 standard library modules. All std functions are backend-agnostic.

## Common Rules

- std functions are pure where possible (`Clip -> Clip`, `Score -> Score`).
- Randomness must be explicit via `Rng` values.
- Optional debug facilities (if implemented) should only embed logs into IR.

## Module List

- `std:core`
- `std:time`
- `std:random`
- `std:transform`
- `std:curves`
- `std:theory`
- `std:drums`
- `std:vocal`

---

## std:core

### Clip Properties

- `length(c: Clip) -> Pos` — returns the length of the clip

**Definition of `Clip.length`**: The length of a clip is the maximum end position of all events, calculated as:

```
length = max(event.pos + event.dur for all timed events)
```

For events without duration (cc, marker), only `pos` is considered. An empty clip has length `0`.

Note: `length` is distinct from cursor position. The cursor tracks where the next event would be placed, but `length` reflects the actual extent of existing events.

### Clip Composition

- `concat(a: Clip, b: Clip) -> Clip` — append `b` after `a`, shifting `b` by `length(a)`
- `overlay(a: Clip, b: Clip) -> Clip` — merge events at their original positions
- `repeat(c: Clip, n: Int) -> Clip` — repeat `c` n times, each shifted by `length(c)`
- `slice(c: Clip, start: Pos, end: Pos) -> Clip` — extract events in range (see below)
- `mapEvents(c: Clip, f: (Event) -> Event?) -> Clip` — transform events, drop if `null`

### slice() Boundary Rules

`slice(c, start, end)` extracts events from the range `[start, end)` (start-inclusive, end-exclusive).

**Event handling by type:**

| Event Type | Behavior |
|------------|----------|
| `NoteEvent`, `ChordEvent`, `DrumHitEvent`, `BreathEvent` | Included if event starts within range. Events spanning the boundary are **trimmed** to fit. |
| `ControlEvent`, `MarkerEvent` | Included if `pos` is within `[start, end)`. |
| `AutomationEvent` | Included if `[event.start, event.end)` overlaps with `[start, end)`. Trimmed to fit. |

**Trimming rules:**

1. If an event starts before `start`: the event is dropped (starts outside range)
2. If an event starts within range but extends past `end`: duration is shortened to `end - event.pos`
3. If an automation event overlaps: both start and end are clamped to `[start, end]`, and curve is proportionally scaled

**Position adjustment:**

All positions in the resulting clip are shifted so that `start` becomes `0`:

```tako
const c = clip { note(C4, w); };  // Note at pos 0, dur w (4 quarters)
const s = slice(c, q, h + q);     // Extract [1, 3)
// Result: note at pos 0, dur h (2 quarters)
```

### Score/Track Helpers

**Track Value Construction:**

Currently, `Track` values can only be extracted from existing scores, not constructed independently:

```tako
const tracks = getTracks(score);  // -> [Track]
const t = tracks[0];              // -> Track
```

Individual `track { ... }` blocks inside `score { ... }` are not first-class expressions. To create a score with dynamically generated tracks, use `mapTracks` or construct the full score via DSL.

**Limitations (v3):**

- No standalone `track { ... }` expression syntax
- Tracks cannot be constructed outside of `score { ... }`
- Use `mapTracks` for track transformations

**Score/Track Functions:**

- `getTracks(score: Score) -> [Track]` — extract all tracks from a score
- `withTrack(score: Score, track: Track) -> Score` — add or replace a track
- `mapTracks(score: Score, f: (Track) -> Track) -> Score` — transform all tracks

### Score Composition Rules

Scores are **not composable** in v3. Each `score { ... }` is a complete, standalone value.

**Not supported:**
- Merging two scores
- Extracting and reusing `sound` declarations across scores
- Combining meta/tempo/meter from multiple sources

**Rationale:** Score composition introduces ambiguity around:
- Sound ID collisions
- Conflicting tempo/meter maps
- Track name conflicts

If you need to share logic across scores, use functions that return `Clip` values and compose at the clip level.

**Workaround for dynamic scores:**

```tako
fn buildScore(parts: [Clip]) -> Score {
  return score {
    // Dynamically place clips
    track "Main" role Instrument sound "piano" {
      for (i in 0..parts.length) {
        place (i + 1):1 parts[i];
      }
    }
  };
}
```

---

## std:time

### Position Resolution

- `barBeat(bar: Int, beat: Int) -> PosRef`
- `resolvePos(posRef: PosRef, meterMap: [MeterEvent]) -> Pos`

**PosRef Resolution Rules:**

`PosRef` uses 1-indexed bar and beat numbers. The `beat` is counted in units of the meter's **denominator**:

| Meter | Valid beats | Unit |
|-------|-------------|------|
| 4/4 | 1, 2, 3, 4 | quarter note |
| 3/4 | 1, 2, 3 | quarter note |
| 6/8 | 1, 2, 3, 4, 5, 6 | eighth note |
| 12/8 | 1, 2, 3, ..., 12 | eighth note |
| 5/4 | 1, 2, 3, 4, 5 | quarter note |

**Resolution algorithm:**

```
resolvePos(posRef, meterMap):
  1. Find the meter in effect at posRef.bar
  2. Validate: beat must be in range [1, numerator]
  3. Calculate absolute position:
     - Sum durations of all complete bars before posRef.bar
     - Add (beat - 1) * (1 / denominator) in quarter-note units
  4. Return absolute Pos
```

**Error conditions:**

- `beat < 1` — compile error
- `beat > numerator` — compile error (beat exceeds bar length)
- `bar < 1` — compile error

**Example:**

```tako
// With meter 6/8 starting at bar 1
// 1:1 = start of bar 1
// 1:4 = fourth eighth note in bar 1
// 2:1 = start of bar 2

const pos = resolvePos(2:3, meterMap);
// If bar 1 is 6/8: pos = 6/8 (bar 1) + 2/8 (beats 1-2 of bar 2) = 1 whole note
```

### Duration Utilities

- `dur(n: Int, d: Int) -> Dur` — construct duration as n/d (e.g., `dur(3, 8)` = dotted quarter)
- Duration constants: `w h q e s t x` (whole, half, quarter, eighth, 16th, 32nd, 64th)
- `dot(d: Dur) -> Dur` — returns `d * 3/2`

---

## std:random

- `rng(seed: Int) -> Rng`
- `nextFloat(r: Rng) -> (Rng, Float)` — returns value in range [0, 1)
- `nextInt(r: Rng, lo: Int, hi: Int) -> (Rng, Int)` — returns value in range [lo, hi)

**Usage pattern:**

```tako
let r = rng(42);
const (r2, val) = nextFloat(r);  // Destructure tuple
const (r3, num) = nextInt(r2, 1, 10);
```

---

## std:transform

### transpose

`transpose(c: Clip, semitones: Int) -> Clip`

Shifts all pitched events by the specified number of semitones.

- **Affected events:** `NoteEvent`, `ChordEvent`
- **Unaffected:** `DrumHitEvent`, `BreathEvent`, `ControlEvent`, `MarkerEvent`, `AutomationEvent`

### stretch

`stretch(c: Clip, factor: Rat) -> Clip`

Scales all time values (positions and durations) by the factor.

- **Affected:** All event positions and durations
- `factor > 1` slows down (longer durations)
- `factor < 1` speeds up (shorter durations)
- Preserves relative timing between events

### quantize

`quantize(c: Clip, grid: Dur, strength: Float) -> Clip`

Snaps event start positions to the specified grid.

- **Affected events:** `NoteEvent`, `ChordEvent`, `DrumHitEvent`, `BreathEvent`
- **Unaffected:** `ControlEvent`, `MarkerEvent`, `AutomationEvent`
- `grid`: The quantization grid (e.g., `q` for quarter notes, `e` for eighths)
- `strength`: 0.0 = no change, 1.0 = fully quantized, values in between interpolate
- **Duration behavior:** Duration is preserved; only start position is quantized

```tako
// Quantize to sixteenth notes, 50% strength
const q = quantize(c, s, 0.5);
```

### swing

`swing(c: Clip, grid: Dur, amount: Float) -> Clip`

Applies swing feel by delaying off-beat events.

- **Affected events:** `NoteEvent`, `ChordEvent`, `DrumHitEvent`, `BreathEvent`
- `grid`: The swing grid (typically `e` for eighth-note swing)
- `amount`: 0.0 = straight, 0.5 = triplet feel, 1.0 = maximum swing
- Events on even grid positions are unchanged; odd positions are delayed

### humanize

`humanize(c: Clip, r: Rng, timing: Float, velocity: Float) -> Clip`

Adds random variations to timing and velocity for a more human feel.

- **Affected events:** `NoteEvent`, `ChordEvent`, `DrumHitEvent`
- `r`: Random number generator (for determinism)
- `timing`: Maximum timing deviation in quarter notes (e.g., 0.02 = ±2% of a quarter)
- `velocity`: Maximum velocity deviation (e.g., 0.1 = ±10% of velocity)
- Returns the same Rng state for reproducibility

```tako
const r = rng(42);
const h = humanize(c, r, timing: 0.01, velocity: 0.05);
```

---

## std:curves

- `linear(a: Float, b: Float, steps: Int) -> Curve`
- `easeInOut(a: Float, b: Float, steps: Int) -> Curve`
- `piecewise(points: [(Float t, Float v)]) -> Curve` (t in 0..1)

---

## std:theory (minimal set)

- `majorTriad(root: Pitch) -> [Pitch]`
- `minorTriad(root: Pitch) -> [Pitch]`
- `scaleMajor(root: Pitch) -> [Pitch]`
- `scaleMinor(root: Pitch) -> [Pitch]`

---

## std:drums

### DrumKey Constants

Abstract drum keys are exposed as constants (identifiers, not strings):

- `kick`, `snare`, `hhc` (hi-hat closed), `hho` (hi-hat open)
- `crash`, `ride`, `tom1`, `tom2`, `tom3`
- `clap`, `perc1`, `perc2`, ...

Usage in clips:

```tako
import * as drums from "std:drums";

clip {
  hit(drums.kick, q, vel: 0.9);   // Using qualified name
  hit(kick, q);                    // Or import keys directly
}
```

### Pattern Generators

- `fourOnFloor(bars: Int, unit: Dur) -> Clip`
- `basicRock(bars: Int, unit: Dur) -> Clip`
- `fill(kind: String, length: Dur) -> Clip`
- `ghost(c: Clip, amount: Float) -> Clip`

**Bar Length and Meter:**

Drum pattern generators are **meter-agnostic**. They generate clips based on fixed durations, not bar/beat references.

| Function | Generated Length |
|----------|------------------|
| `fourOnFloor(bars, q)` | `bars * 4 * q` = `bars * w` (whole notes) |
| `basicRock(bars, q)` | `bars * 4 * q` = `bars * w` |
| `fill("crash", h)` | `h` (half note) |

**Interpretation:**

- `bars` is the number of "logical bars" based on 4/4 meter assumption
- Each "bar" equals 4 × `unit` in duration
- For non-4/4 meters, the pattern will not align with bar lines

**Example with meter changes:**

```tako
// 4/4 section: pattern aligns perfectly
track "Drums" role Drums sound "kit" {
  place 1:1 drums.basicRock(4, q);  // 4 bars of 4/4
}

// 6/8 section: pattern length doesn't match bar length
// drums.basicRock(2, q) = 8 quarter notes = 16 eighth notes
// 6/8 bar = 6 eighth notes, so pattern spans ~2.67 bars
```

**Recommendation:** For non-4/4 meters, either:
1. Calculate the desired duration manually and use `stretch`
2. Create custom patterns using `clip { ... }` that match your meter
3. Use `slice` to trim patterns to exact bar boundaries

---

## std:vocal

### Lyric creation

- `text(text: String, lang?: String) -> Lyric`
- `syllables(tokens: [String | LyricToken], lang?: String, words?: [String]) -> Lyric`
- `phonemes(groups: [[String]], lang?: String, alphabet?: String, words?: [String]) -> Lyric`

LyricToken values:

- `vocal.S(text: String)` — syllable with explicit text
- `vocal.Ext` — extension marker (melisma continuation)

Note: `vocal.Ext` is a constant value, not a function call. Use it directly in arrays:

```tako
const lyr = vocal.syllables(["star", "light", vocal.Ext], "en-US");
```

### Underlay

- `align(c: Clip, lyric: Lyric, policy?: AlignPolicy) -> Clip`

AlignPolicy (reserved):

- `Strict`
- `BestEffort`
- `MelismaHeuristic`

Current implementations may ignore `policy` values.

### Expression (vocal:* automation)

- `vibrato(c: Clip, depth: Float, rate: Float, start?: Pos, end?: Pos) -> Clip`
- `portamento(c: Clip, amount: Float, start?: Pos, end?: Pos) -> Clip`
- `breathiness(c: Clip, amount: Float, start?: Pos, end?: Pos) -> Clip`
- `loudness(c: Clip, curve: Curve, start: Pos, end: Pos) -> Clip`

### Breath insertion

- `autoBreath(c: Clip, opts?) -> Clip`

Automatically inserts breath events before phrases for natural vocal phrasing.

**Options:**

- `minGap: Dur` — minimum gap between notes to insert breath (default: `s`)
- `breathDur: Dur` — duration of inserted breath (default: `s`)
- `intensity: Float` — breath intensity 0..1 (default: 0.6)
- `shortenPrev: Bool` — shorten previous note to make room for breath (default: true)

**Algorithm:**

1. Scans notes sequentially by start position
2. When gap >= `minGap` is found, inserts breath before the next note
3. If `shortenPrev` is true, trims the previous note's end to create space
4. First note of the clip gets a breath if there's room at the start

**Polyphony and Chord Handling:**

- **Monophonic assumption:** `autoBreath` is designed for monophonic vocal lines
- **ChordEvent:** Treated as a single note (breath inserted before/after the chord, not between pitches)
- **Overlapping notes:** When notes overlap, only the gap after ALL overlapping notes end is considered
- **Voice separation:** If `voice` attribute is used, each voice is processed independently

```tako
// Example: overlapping notes
clip {
  note(C4, h);      // 0 to 2
  at(q);
  note(E4, h);      // 1 to 3
  note(G4, q);      // 3 to 4 (gap of 0 after overlap ends at 3)
}
// autoBreath sees: notes end at 3, next note at 3, gap = 0 (no breath)
```

**Recommended usage:**

```tako
// Ensure monophonic input for best results
let c = vocal.align(clip { ... }, lyrics);
c = vocal.autoBreath(c, minGap: e, breathDur: s, intensity: 0.5);
```

**Warning:** Using `autoBreath` on polyphonic clips may produce unexpected results. Consider separating voices first.

---

## Example

```tako
import { repeat } from "std:core";
import { majorTriad } from "std:theory";

fn part() -> Clip {
  return clip {
    chord(majorTriad(C4), q, vel: 0.6);
    rest(q);
  };
}

export fn main() -> Score {
  return score {
    meter { 1:1 -> 4/4; }
    tempo { 1:1 -> 120bpm; }

    sound "piano" kind instrument { range A0..C8; }
    track "Piano" role Instrument sound "piano" {
      place 1:1 repeat(part(), 4);
    }
  };
}
```
