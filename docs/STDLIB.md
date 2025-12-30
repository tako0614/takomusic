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
length = max(endPos(event) for all events)
```

**End position by event type:**

| Event Type | End Position |
|------------|--------------|
| `NoteEvent`, `ChordEvent`, `DrumHitEvent`, `BreathEvent` | `start + dur` |
| `ControlEvent`, `MarkerEvent` | `start` (point events) |
| `AutomationEvent` | `end` (uses the automation's end position) |

An empty clip has length `0`.

Note: `length` is distinct from cursor position. The cursor tracks where the next event would be placed, but `length` reflects the actual extent of existing events.

### Clip Composition

- `concat(a: Clip, b: Clip) -> Clip` — append `b` after `a`, shifting `b` by `length(a)`
- `overlay(a: Clip, b: Clip) -> Clip` — merge events at their original positions
- `repeat(c: Clip, n: Int) -> Clip` — repeat `c` n times, each shifted by `length(c)`
- `slice(c: Clip, start: Pos, end: Pos) -> Clip` — extract events in range (see below)
- `shift(c: Clip, offset: Dur) -> Clip` — shift all event positions by offset
- `padTo(c: Clip, endPos: Pos) -> Clip` — extend clip length to at least `endPos` (see Length and Padding)
- `mapEvents(c: Clip, f: (Event) -> Event?) -> Clip` — transform events, drop if `null`
- `updateEvent(e: Event, updates: Object) -> Event` — create modified copy of event (see Event Manipulation)

### Utility Functions

- `max(a: Rat, b: Rat) -> Rat` — returns the larger value
- `min(a: Rat, b: Rat) -> Rat` — returns the smaller value
- `abs(a: Rat) -> Rat` — returns absolute value
- `floor(a: Rat) -> Int` — rounds down to integer
- `ceil(a: Rat) -> Int` — rounds up to integer

These also work with `Pos` and `Dur` types (which are `Rat`-based internally).

### Length and Padding

**Important:** `rest(dur)` advances the cursor but does NOT create an event. Therefore, trailing rests do not contribute to `length(clip)`:

```mf
const c = clip {
  note(C4, q);  // Note at 0, dur 1
  rest(q);      // Cursor moves to 2, but no event created
};
length(c);  // Returns 1 (not 2!) — length is max event end, not cursor
```

This affects `concat` and `repeat`, which use `length` for shifting:

```mf
const pattern = clip {
  note(C4, q);
  rest(q);  // Intended 1-beat gap
};
repeat(pattern, 2);
// Result: notes at 0 and 1 (not 0 and 2!)
// The rest doesn't extend length, so no gap.
```

**Solution: Use `padTo` to explicitly set clip length:**

```mf
const pattern = padTo(clip {
  note(C4, q);
}, h);  // Explicitly set length to 2 quarters

repeat(pattern, 2);
// Result: notes at 0 and 2 (correct 2-beat spacing)
```

`padTo(c, endPos)` ensures the clip's length is at least `endPos`. If the clip already extends past `endPos`, the length is unchanged.

**IR Representation:**

In the Score IR, clips have an optional `length` field that explicitly declares the clip's duration:

```json
{
  "events": [...],
  "length": { "n": 2, "d": 1 }
}
```

When `padTo` is used, this `length` field is set to the specified value. If omitted, length is computed from events. This allows `repeat` and `concat` to use the declared length for spacing.

**Example:**

```mf
const c = padTo(clip { note(C4, q); }, h);
// IR: { "events": [...], "length": { "n": 2, "d": 1 } }
// length(c) returns h (2 quarters), not q (1 quarter)
```

### slice() Boundary Rules

`slice(c, start, end)` extracts events from the range `[start, end)` (start-inclusive, end-exclusive).

**Event handling by type:**

| Event Type | Behavior |
|------------|----------|
| `NoteEvent`, `ChordEvent`, `DrumHitEvent`, `BreathEvent` | Included if event starts within range. Events spanning the boundary are **trimmed** to fit. |
| `ControlEvent`, `MarkerEvent` | Included if `pos` is within `[start, end)`. |
| `AutomationEvent` | Included if `[event.start, event.end)` overlaps with `[start, end)`. Trimmed to fit. |

**Trimming rules:**

1. If an event starts before `start`: **dropped** (not trimmed)
2. If an event starts within range but extends past `end`: duration is shortened to `end - event.pos`
3. If an automation event overlaps: both start and end are clamped to `[start, end]`. **Note:** The standard `slice()` does NOT automatically rescale curves; for correct automation behavior, use custom logic (see `std:curves` documentation)

**Important:** Rule 1 means that notes starting before the slice range are completely excluded, even if they would still be sounding within the range. This is a simplification for clip-based editing. If you need to preserve "sounding" notes that started earlier, consider using `overlay` with adjusted positions instead.

```mf
// Example: note starts at 0, extends to position 2
const c = clip { note(C4, h); };  // h = 2 quarters

// Slice from position 1 onwards
const s = slice(c, q, h);  // Range [1, 2)

// Result: empty clip!
// The note starts at 0, which is before the slice start (1),
// so it is dropped entirely, not trimmed.
```

**Workaround for preserving ongoing notes:**

```mf
import { max, min, mapEvents, updateEvent } from "std:core";

// To keep notes that are still sounding, manually check and include them:
fn sliceWithSounding(c, start, end) {
  // Filter events that overlap with [start, end)
  return mapEvents(c, fn(e) {
    // Handle timed events (have dur field)
    return match (e.type) {
      "note" -> sliceTimedEvent(e, start, end);
      "chord" -> sliceTimedEvent(e, start, end);
      "drumHit" -> sliceTimedEvent(e, start, end);
      "breath" -> sliceTimedEvent(e, start, end);
      // Point events: include if within range
      "control" -> if (e.start >= start && e.start < end) {
        return updateEvent(e, { start: e.start - start });
      } else {
        return null;
      };
      "marker" -> if (e.pos >= start && e.pos < end) {
        return updateEvent(e, { start: e.pos - start });
      } else {
        return null;
      };
      // Automation: check overlap with [start, end)
      "automation" -> sliceAutomation(e, start, end);
      else -> null;
    };
  });
}

// Helper for timed events (Note, Chord, DrumHit, Breath)
fn sliceTimedEvent(e, start, end) {
  if (e.start + e.dur <= start) {
    return null;  // Ends before range
  }
  if (e.start >= end) {
    return null;  // Starts after range
  }
  const newStart = max(e.start, start) - start;
  const newEnd = min(e.start + e.dur, end) - start;
  return updateEvent(e, { start: newStart, dur: newEnd - newStart });
}

// Helper for automation events
fn sliceAutomation(a, start, end) {
  if (a.end <= start || a.start >= end) {
    return null;  // No overlap
  }
  const newStart = max(a.start, start) - start;
  const newEnd = min(a.end, end) - start;
  // Note: curve scaling would need additional logic
  return updateEvent(a, { start: newStart, end: newEnd });
}
```

**Note:** This example uses `match` on the `type` field to handle each event type appropriately, since only timed events have the `dur` field.

### Event Types and Manipulation

`Event` is a union type representing all clip events:

```
Event = NoteEvent | ChordEvent | DrumHitEvent | BreathEvent
      | ControlEvent | AutomationEvent | MarkerEvent
```

**Common fields (all events):**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `String` | Event type: `"note"`, `"chord"`, `"drumHit"`, `"breath"`, `"control"`, `"automation"`, `"marker"` |
| `start` | `Pos` | Start position within clip |

**Timed event fields (NoteEvent, ChordEvent, DrumHitEvent, BreathEvent):**

| Field | Type | Description |
|-------|------|-------------|
| `dur` | `Dur` | Duration |
| `velocity` | `Float?` | Velocity (0.0-1.0), optional |
| `voice` | `Int?` | Voice number, optional |
| `techniques` | `[String]?` | Technique identifiers, optional |

**Type-specific fields:**

| Event Type | Additional Fields |
|------------|-------------------|
| `NoteEvent` | `pitch: Pitch`, `lyric: LyricSpan?` |
| `ChordEvent` | `pitches: [Pitch]` |
| `DrumHitEvent` | `key: String` (DrumKey as string in IR) |
| `BreathEvent` | `intensity: Float?` |
| `ControlEvent` | `kind: String`, `data: Object` |
| `AutomationEvent` | `param: String`, `end: Pos`, `curve: Curve` |
| `MarkerEvent` | `kind: String`, `label: String` |

**Type narrowing in mapEvents:**

Use `match` on the `type` field to handle different event types:

```mf
mapEvents(c, fn(e) {
  return match (e.type) {
    "note" -> {
      // velocity is Float? — handle null with default
      const vel = e.velocity ?? 0.7;  // Default if null
      return updateEvent(e, { velocity: vel * 0.8 });
    };
    "drumHit" -> {
      const vel = e.velocity ?? 0.8;
      return updateEvent(e, { velocity: vel * 0.9 });
    };
    else -> e;  // Pass through other events unchanged
  };
});
```

**Null-coalescing operator (`??`):**

The `??` operator returns the left operand if non-null, otherwise the right operand:

```mf
const vel = note.velocity ?? 0.7;  // Use 0.7 if velocity is null
const voice = note.voice ?? 1;     // Default voice 1
```

**updateEvent function:**

`updateEvent(e: Event, updates: Object) -> Event`

Creates a copy of the event with specified fields updated. The `updates` parameter is an object containing the fields to update. Only fields valid for the event type can be updated:

```mf
// Update note timing
updateEvent(note, { start: q, dur: h });

// Update velocity
updateEvent(note, { velocity: 0.8 });

// Multiple fields
updateEvent(note, { start: 0, dur: q, velocity: 0.7 });
```

**Note:** `updateEvent` is the only way to create modified events. Events are immutable; you cannot assign to fields directly.

**Position adjustment:**

All positions in the resulting clip are shifted so that `start` becomes `0`:

```mf
const c = clip { note(C4, w); };  // Note at pos 0, dur w (4 quarters)
const s = slice(c, q, h + q);     // Extract [1, 3)
// Result: note at pos 0, dur h (2 quarters)
```

### Score/Track Helpers

**Track Value Construction:**

Currently, `Track` values can only be extracted from existing scores, not constructed independently:

```mf
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
- `withTrack(score: Score, track: Track) -> Score` — add a track to the score (appends to existing tracks)
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

```mf
import { barBeat } from "std:time";

fn buildScore(parts: [Clip]) -> Score {
  return score {
    // Dynamically place clips using barBeat() function
    track "Main" role Instrument sound "piano" {
      for (i in 0..parts.length) {
        place barBeat(i + 1, 1) parts[i];
      }
    }
  };
}
```

**Note:** `PosRef` literals (`1:1`, `2:3`) are compile-time constants. To construct a `PosRef` from computed values, use `barBeat(bar, beat)` from `std:time`. The `:` syntax is NOT an operator and cannot be used with expressions.

---

## std:time

### Position Resolution

- `barBeat(bar: Int, beat: Int) -> PosRef`
- `resolvePos(posRef: PosRef, meterMap: [MeterEvent]) -> Pos`
- `getMeterMap(score: Score) -> [MeterEvent]` — extract meter events from a score

**Obtaining `meterMap`:**

The `meterMap` parameter required by `resolvePos` can be obtained in several ways:

1. **From an existing Score:** Use `getMeterMap(score)` to extract the meter events.

2. **Manual construction:** Create a `[MeterEvent]` array directly for simple cases.

3. **Within score context:** The host provides `meterMap` implicitly in certain contexts.

```mf
import { getMeterMap, resolvePos, barBeat } from "std:time";

// Method 1: Extract from score
fn example(s: Score) -> Pos {
  const meters = getMeterMap(s);
  return resolvePos(barBeat(5, 2), meters);
}

// Method 2: Manual construction for known meters
const simpleMeterMap: [MeterEvent] = [
  { bar: 1, meter: { n: 4, d: 4 } }  // 4/4 from bar 1
];
const pos = resolvePos(3:2, simpleMeterMap);
```

**MeterEvent structure:**

```mf
type MeterEvent = {
  bar: Int,           // Bar number (1-indexed)
  meter: { n: Int, d: Int }  // Numerator and denominator
};
```

**Note:** `resolvePos` is primarily useful for clip-level calculations where you need absolute positions. For score-level constructs (`tempo`, `marker`, `place`), use `PosRef` directly.

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
     - Add (beat - 1) * (4 / denominator) in quarter-note units
       (e.g., 4/4: beat unit = 4/4 = 1 quarter; 6/8: beat unit = 4/8 = 0.5 quarter)
  4. Return absolute Pos
```

**Bar duration formula:**

```
bar_duration_in_quarters = numerator * (4 / denominator)
```

| Meter | Bar duration (quarters) |
|-------|------------------------|
| 4/4 | 4 × (4/4) = 4 |
| 3/4 | 3 × (4/4) = 3 |
| 6/8 | 6 × (4/8) = 3 |
| 12/8 | 12 × (4/8) = 6 |
| 5/4 | 5 × (4/4) = 5 |

**Error conditions:**

- `beat < 1` — compile error
- `beat > numerator` — compile error (beat exceeds bar length)
- `bar < 1` — compile error

**Meter change constraint:**

Meter changes MUST occur at bar boundaries (beat 1). The PosRef in `meter { ... }` declarations must have beat = 1:

```mf
meter {
  1:1 -> 4/4;   // Valid: bar 1, beat 1
  17:1 -> 3/4;  // Valid: bar 17, beat 1
  9:3 -> 6/8;   // COMPILE ERROR: meter change not at bar boundary
}
```

This constraint ensures unambiguous bar duration calculation. Mid-bar meter changes would create undefined behavior for position resolution.

**Example:**

```mf
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
- `dot(d: Dur) -> Dur` — returns `d * 1.5` (e.g., `dot(q)` = `q.`)

### Sub-beat Positioning

`PosRef` (bar:beat) can only address beat boundaries defined by the meter. For sub-beat positions in score-level constructs (`tempo`, `marker`, `place`), use one of these approaches:

**Approach 1: Offset via clip rest**

Place a clip with leading rest to offset the actual content:

```mf
import { overlay, shift } from "std:core";

fn offsetClip(offset: Dur, content: Clip) -> Clip {
  // Shift all events in content by offset duration
  return shift(content, offset);
}

track "Lead" role Instrument sound "synth" {
  // Start content at beat 1.5 (1 + eighth note)
  place 1:1 offsetClip(e, myClip());
}
```

**Approach 2: Use 8-based meter for finer granularity**

```mf
meter { 1:1 -> 8/8; }  // 8 beats per bar, each an eighth note
tempo { 1:5 -> 100bpm; }  // Tempo change at beat 5 (= beat 2.5 in 4/4 terms)
```

**Approach 3: Resolve to absolute Pos (for internal calculations)**

```mf
const meterMap = [...];  // from score context
const basePos = resolvePos(2:1, meterMap);
const subBeatPos = basePos + e;  // Add eighth note offset
// Use subBeatPos in clip-level logic
```

**Limitation:** Score-level `tempo` and `marker` currently only accept `PosRef`, not absolute `Pos`. For tempo changes on sub-beats, use Approach 2 (finer meter) or approximate to the nearest beat.

---

## std:random

- `rng(seed: Int) -> Rng`
- `nextFloat(r: Rng) -> [Rng, Float]` — returns value in range [0, 1)
- `nextInt(r: Rng, lo: Int, hi: Int) -> [Rng, Int]` — returns value in range [lo, hi)

**Usage pattern:**

```mf
let r = rng(42);
const result1 = nextFloat(r);
const r2 = result1[0];
const val = result1[1];
const result2 = nextInt(r2, 1, 10);
const r3 = result2[0];
const num = result2[1];
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

```mf
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

`humanize(c: Clip, r: Rng, timing: Float, velocity: Float) -> [Rng, Clip]`

Adds random variations to timing and velocity for a more human feel.

- **Affected events:** `NoteEvent`, `ChordEvent`, `DrumHitEvent`
- `r`: Random number generator (for determinism)
- `timing`: Maximum timing deviation in quarter notes (e.g., 0.02 = ±2% of a quarter)
- `velocity`: Maximum velocity deviation (e.g., 0.1 = ±10% of velocity)
- **Returns:** `[Rng, Clip]` array — updated Rng state and humanized clip

```mf
let r = rng(42);
const result1 = humanize(clip1, r, timing: 0.01, velocity: 0.05);
const r2 = result1[0];
const h1 = result1[1];
const result2 = humanize(clip2, r2, timing: 0.01, velocity: 0.05);
const r3 = result2[0];
const h2 = result2[1];
// r3 carries the updated state for further randomization
```

**Note:** Like other `std:random` functions, `humanize` returns an updated `Rng` to maintain deterministic reproducibility across multiple calls. The result is an array `[newRng, newClip]` which can be accessed by index.

### Float-to-Rational Conversion

Several `std:transform` functions accept `Float` parameters for timing adjustments (`strength`, `amount`, `timing`). These are converted to `Rat` (rational numbers) internally to maintain Tako's deterministic time model.

**Conversion rules:**

| Parameter | Unit | Conversion |
|-----------|------|------------|
| `strength` (quantize) | Ratio [0, 1] | Used as interpolation factor |
| `amount` (swing) | Ratio [0, 1] | Determines delay fraction of grid |
| `timing` (humanize) | Quarter notes | Converted to Rat with denominator ≤ 960 |
| `velocity` (humanize) | Ratio [0, 1] | Applied as velocity delta |

**Precision guarantee:**

Timing values are converted using a maximum denominator of 960 (common PPQN in MIDI). This ensures:
- Sub-tick precision for typical use cases
- Deterministic behavior across implementations
- No floating-point drift in repeated operations

**Example:**

```mf
// timing: 0.02 quarters ≈ 1/50 quarter
// Converted to Rat: 19/960 (closest rational ≤ 960 denominator)
humanize(c, r, timing: 0.02, velocity: 0.05);
```

**Recommendation:** For maximum determinism in generated code, prefer rational-friendly values:

```mf
// Preferred: values that convert cleanly
quantize(c, e, strength: 0.5);   // 1/2
swing(c, e, amount: 0.333);      // ≈1/3 -> 320/960

// Avoid: values with poor rational approximations
swing(c, e, amount: 0.123456);   // May round unexpectedly
```

---

## std:curves

Curve functions create `Curve` values for use in automation events.

- `linear(a: Float, b: Float, steps: Int) -> Curve`
- `easeInOut(a: Float, b: Float, steps: Int) -> Curve`
- `piecewise(points: [(Float t, Float v)]) -> Curve` (t in 0..1)

**Validation behavior:**

| Function | Constraint | Behavior |
|----------|------------|----------|
| `linear(a, b, steps)` | `steps < 2` | Automatically adjusted to 2 |
| `easeInOut(a, b, steps)` | `steps < 2` | Automatically adjusted to 2 |
| `piecewise(points)` | Any points array | Points are used as-is (no validation) |

**Note:** The implementation is lenient and does not enforce strict validation. For best results, ensure:
- `steps >= 2` for `linear` and `easeInOut`
- `piecewise` points should span `[0, 1]` with `t` values monotonically increasing

**Automation constraints (in clips):**

When using `automation(param, start, end, curve)`:

| Constraint | Status |
|------------|--------|
| `start < end` | Recommended (not currently enforced by compiler) |
| `start >= 0` | Recommended (not currently enforced by compiler) |
| `param` non-empty | Recommended (not currently enforced by compiler) |

**Note:** These constraints are recommended for correct behavior but are not currently enforced at compile time. Future versions may add validation. Violating these constraints may produce undefined behavior in renderers.

**Curve scaling in slice operations:**

When `slice()` or custom clip editing operations trim an automation event, the curve must be proportionally scaled:

```mf
// Original automation: start=0, end=4, curve spans [0, 1]
// After slice(c, 1, 3): new automation: start=0, end=2
// Curve must be rescaled: original t=0.25 becomes t=0, t=0.75 becomes t=1

fn scaleCurve(curve: Curve, originalStart: Pos, originalEnd: Pos,
              newStart: Pos, newEnd: Pos) -> Curve {
  // Scale t values: t_new = (t_old - offset) / scale
  // where offset = (newStart - originalStart) / (originalEnd - originalStart)
  // and scale = (newEnd - newStart) / (originalEnd - originalStart)
  // Implementation depends on curve representation
}
```

**Note:** The standard `slice()` function does NOT automatically rescale curves. For accurate automation slicing, use custom logic or the `sliceAutomation` helper pattern shown in `std:core` documentation.

**IR Representation:**

All curves are converted to `piecewiseLinear` format in the IR. Higher-level functions like `easeInOut` generate approximation points:

```mf
// Source
const c = easeInOut(0.0, 1.0, 4);

// IR output (approximated)
{
  "kind": "piecewiseLinear",
  "points": [
    { "t": 0.0, "v": 0.0 },
    { "t": 0.25, "v": 0.1 },
    { "t": 0.5, "v": 0.5 },
    { "t": 0.75, "v": 0.9 },
    { "t": 1.0, "v": 1.0 }
  ]
}
```

**Parameters:**

- `a`, `b`: Start and end values
- `steps`: Number of interpolation points (higher = smoother curve)
- `points`: Array of `(t, v)` tuples where `t` is normalized time [0, 1]

**Curve semantics:**

- `t = 0` corresponds to the automation's `start` position
- `t = 1` corresponds to the automation's `end` position
- Values between points are linearly interpolated by renderers

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

```mf
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

```mf
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

```mf
const lyr = vocal.syllables(["star", "light", vocal.Ext], "en-US");
```

### Underlay

- `align(c: Clip, lyric: Lyric, policy?: AlignPolicy) -> Clip`

Attaches lyric syllables to notes in the clip. Each note receives a `LyricSpan` in its `lyric` field.

**LyricSpan structure (in IR):**

```json
{
  "kind": "syllable" | "extend",
  "text": "la",           // Only for "syllable"
  "wordPos": "begin" | "middle" | "end" | "single"
}
```

**Alignment behavior:**

1. Notes are processed in start-position order
2. Each syllable token maps to one note, setting `kind: "syllable"` with the text
3. `vocal.Ext` tokens map to notes with `kind: "extend"` (melisma continuation)
4. `wordPos` indicates syllable position within a word (derived from `words` parameter or heuristics)

```mf
const lyr = vocal.syllables(["hel", "lo", vocal.Ext], "en-US", words: ["hello"]);
let c = clip {
  note(C4, q);  // -> LyricSpan { kind: "syllable", text: "hel", wordPos: "begin" }
  note(D4, q);  // -> LyricSpan { kind: "syllable", text: "lo", wordPos: "end" }
  note(E4, h);  // -> LyricSpan { kind: "extend" }
};
c = vocal.align(c, lyr);
```

**Error conditions:**

- More syllables than notes: extra syllables are dropped (warning)
- More notes than syllables: extra notes have no lyric attached

AlignPolicy (reserved):

- `Strict` — error on mismatch
- `BestEffort` — align what's possible
- `MelismaHeuristic` — auto-extend syllables across multiple notes

Current implementations may ignore `policy` values.

### Expression (vocal:* automation)

- `vibrato(c: Clip, depth: Float, rate?: Float, start?: Pos, end?: Pos) -> Clip`
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

```mf
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

```mf
// Ensure monophonic input for best results
let c = vocal.align(clip { ... }, lyrics);
c = vocal.autoBreath(c, minGap: e, breathDur: s, intensity: 0.5);
```

**Warning:** Using `autoBreath` on polyphonic clips may produce unexpected results. Consider separating voices first.

---

## Example

```mf
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
