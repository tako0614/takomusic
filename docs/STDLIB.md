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

### Clip composition

- `concat(a: Clip, b: Clip) -> Clip` (shift `b` by `a.length`)
- `overlay(a: Clip, b: Clip) -> Clip`
- `repeat(c: Clip, n: Int) -> Clip`
- `slice(c: Clip, start: Pos, end: Pos) -> Clip`
- `mapEvents(c: Clip, f: (Event) -> Event?) -> Clip`

### Score/Track helpers

- `withTrack(score: Score, track: Track) -> Score`
- `mapTracks(score: Score, f: (Track) -> Track) -> Score`

---

## std:time

- `barBeat(bar: Int, beat: Int) -> PosRef`
- `resolvePos(posRef: PosRef, meterMap: [MeterEvent]) -> Pos`
- `dur(n: Int, d: Int) -> Dur`
- Duration constants (SHOULD): `w h q e s t x`
- `dot(d: Dur) -> Dur`

---

## std:random

- `rng(seed: Int) -> Rng`
- `nextFloat(r: Rng) -> [Rng, Float]` (0..1)
- `nextInt(r: Rng, lo: Int, hi: Int) -> [Rng, Int]` ([lo, hi))

---

## std:transform

- `transpose(c: Clip, semitones: Int) -> Clip`
- `stretch(c: Clip, factor: Rat) -> Clip`
- `quantize(c: Clip, grid: Dur, strength: Float) -> Clip`
- `swing(c: Clip, grid: Dur, amount: Float) -> Clip`
- `humanize(c: Clip, r: Rng, timing: Float, velocity: Float) -> Clip`

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

## std:drums (abstract keys)

- Abstract keys (SHOULD): `kick`, `snare`, `hhc`, `hho`, `crash`, `ride`, `tom1`, `tom2`, `tom3`, `clap`, `perc1`, ...
- `fourOnFloor(bars: Int, unit: Dur) -> Clip`
- `basicRock(bars: Int, unit: Dur) -> Clip`
- `fill(kind: String, length: Dur) -> Clip`
- `ghost(c: Clip, amount: Float) -> Clip`

---

## std:vocal

### Lyric creation

- `text(text: String, lang?: String) -> Lyric`
- `syllables(tokens: [String|LyricToken], lang?: String, words?: [String]) -> Lyric`
- `phonemes(groups: [[String]], lang?: String, alphabet?: String, words?: [String]) -> Lyric`
- `ext() -> LyricToken`

LyricToken:

- `S(text: String)`
- `Ext`

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

Options:
- `minGap: Dur` - minimum gap between notes to insert breath (default: `s`)
- `breathDur: Dur` - duration of inserted breath (default: `s`)
- `intensity: Float` - breath intensity 0..1 (default: 0.6)
- `shortenPrev: Bool` - shorten previous note to make room for breath (default: true)

The algorithm:
1. Scans notes sequentially
2. When gap >= `minGap` is found, inserts breath before the next note
3. If `shortenPrev` is true, trims the previous note's end to create space
4. First note of the clip gets a breath if there's room at the start

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
