# Tako v3 Language Specification

Tako v3 is a deterministic DSL that evaluates to a neutral `Score` IR.
Rendering is performed by backend plugins via Render Profiles, keeping the language core backend-agnostic.

## Quick Example

```mf
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
  c = vocal.autoBreath(c);
  c = vocal.vibrato(c, depth: 0.2, rate: 5.5);
  return vocal.loudness(c, curves.easeInOut(0.2, 0.8, 4), start: 0, end: q * 4);
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

## Files and Entry Point

- Source: `*.mf`
- Render Profile: `*.mf.profile.json`
- IR dump (optional): `*.mf.score.json`
- Programs MUST export `fn main() -> Score`.

Imports are either std modules or local files:

```mf
import { repeat } from "std:core";
import * as vocal from "std:vocal";
import { foo } from "./foo.mf";
```

## Comments and Strings

- Line comments: `// ...`
- Block comments: `/* ... */` (not nested)
- Strings use double quotes with `\n`, `\t`, `\r`, `\\`, `\"` escapes.

## Operators

Tako v3 supports the following operators:

### Arithmetic Operators

| Operator | Types | Result | Notes |
|----------|-------|--------|-------|
| `+` | `Int + Int` | `Int` | |
| `+` | `Float + Float` | `Float` | |
| `+` | `Rat + Rat` | `Rat` | |
| `+` | `Dur + Dur` | `Dur` | |
| `+` | `Pos + Dur` | `Pos` | |
| `-` | `Int - Int` | `Int` | |
| `-` | `Float - Float` | `Float` | |
| `-` | `Rat - Rat` | `Rat` | |
| `-` | `Dur - Dur` | `Dur` | |
| `-` | `Pos - Pos` | `Dur` | Difference between positions |
| `*` | `Int * Int` | `Int` | |
| `*` | `Float * Float` | `Float` | |
| `*` | `Rat * Rat` | `Rat` | |
| `*` | `Dur * Int` | `Dur` | e.g., `q * 4` |
| `*` | `Dur * Rat` | `Dur` | e.g., `q * (3 / 2)` — parentheses recommended |
| `/` | `Int / Int` | `Rat` | Always produces rational |
| `/` | `Float / Float` | `Float` | |
| `/` | `Rat / Rat` | `Rat` | |
| `/` | `Dur / Int` | `Dur` | e.g., `w / 4` |
| `/` | `Dur / Dur` | `Rat` | Ratio of durations |

### Comparison Operators

`==`, `!=`, `<`, `<=`, `>`, `>=` — standard semantics.

### Logical Operators

`&&`, `||`, `!` — short-circuit evaluation.

### Null-Coalescing Operator

`??` — returns left operand if non-null, otherwise right operand:

```mf
const vel = note.velocity ?? 0.7;  // Use 0.7 if velocity is null
const name = user.nickname ?? user.name ?? "Anonymous";
```

The `??` operator has lower precedence than comparison operators but higher than `&&`:

```mf
const x = a ?? b && c;  // Parsed as: (a ?? b) && c
```

### Operator Precedence (high to low)

1. `!`, `-` (unary)
2. `..` (range)
3. `*`, `/`, `%`
4. `+`, `-`
5. `<`, `<=`, `>`, `>=`
6. `==`, `!=`
7. `??`
8. `&&`
9. `||`

### Invalid Operations

- `Pos + Pos` — compile error
- `Pos * anything` — compile error
- Division by zero — runtime error

## Time Model and Literals

Tako v3 uses rational numbers for time. There are no ticks.

### Duration Literals

- Named: `w h q e s t x` (whole, half, quarter, eighth, 16th, 32nd, 64th)
- Dotted: `q.` (= `q * 1.5` = `q + e`)

```mf
const a = q;      // quarter note
const b = q.;     // dotted quarter
const c = q * 4;  // quarter * 4 = whole
const d = 1 / 4;  // division expression: Int / Int -> Rat
```

**Note**: There is no special fraction literal syntax for durations. `1 / 4` is always parsed as integer division, yielding a `Rat`. Since `Rat` and `Dur` are the same underlying type (rational numbers), this works correctly in most contexts.

To create durations programmatically, use the `dur()` function from `std:time`:

```mf
import { dur } from "std:time";

const d1 = dur(1, 4);     // quarter note (1/4)
const d2 = dur(3, 8);     // 3 eighths
const d3 = e * 3;         // 3 eighths via multiplication
const d4 = q + e;         // quarter + eighth = 3 eighths
```

**Best Practice:** Prefer named duration literals (`q`, `e`, etc.) or `dur(n, d)` from `std:time` for clarity.

### Position Literals

- PosRef literals: `bar:beat` (1-indexed), e.g. `1:1`, `2:3`
- Tick form (`bar:beat:tick`) is NOT allowed
- **PosRef literals are compile-time constants.** The `:` is NOT an operator.
- To construct PosRef from computed values, use `std:time.barBeat(bar, beat)`
- Use `std:time.resolvePos(posRef, meterMap)` to convert `PosRef` to absolute `Pos`

```mf
// Correct usage:
place 1:1 myClip();           // Literal PosRef
place barBeat(n, 1) myClip(); // Computed PosRef via function

// INVALID:
place (n + 1):1 myClip();     // ERROR: : is not an operator
```

### Pitch Literals

- `C4`, `F#3`, `Bb5`, `C4+25c` (with cent offset)

### DrumKey Literals

`DrumKey` represents abstract drum/percussion keys. In the DSL, DrumKeys are written as bare identifiers, which are resolved to string constants from `std:drums`:

```mf
import { kick, snare } from "std:drums";

hit(kick, q, vel: 0.9);    // Correct: identifier from std:drums
hit(snare, e);             // Correct: identifier from std:drums
```

Standard abstract keys (defined in `std:drums` as string constants):
- `kick`, `snare`, `hhc` (hi-hat closed), `hho` (hi-hat open)
- `crash`, `ride`, `tom1`, `tom2`, `tom3`
- `clap`, `perc1`, `perc2`, ...

Custom keys can be declared in `sound ... kind drumKit { drumKeys { ... } }`.

**Implementation note:** The `std:drums` module exports these keys as string constants (e.g., `export const kick = "kick";`). This allows them to be used as identifiers in code while being stored as strings in the IR.

### Type Arithmetic Rules

`Dur` and `Pos` are distinct types:

- `Pos + Dur -> Pos`
- `Dur + Dur -> Dur`
- `Pos - Pos -> Dur`
- `Pos + Pos` is invalid (compile error)

### Implicit Type Conversions

The following implicit conversions are allowed in contexts expecting `Pos`:

| From | To | Rule |
|------|-----|------|
| `Int` | `Pos` | Integer `n` becomes position `n` (in quarter notes) |
| `Dur` | `Pos` | Duration `d` becomes position with same rational value |

```mf
clip {
  at(0);    // Int -> Pos: position 0
  at(q);    // Dur -> Pos: position 1 (one quarter note)
  at(h);    // Dur -> Pos: position 2 (one half note)
  at(q + e); // Dur -> Pos: position 1.5
}
```

**Note:** These conversions are one-way. `Pos` does not implicitly convert to `Dur` or `Int`. Use explicit arithmetic when needed:

```mf
const pos: Pos = h;           // OK: Dur -> Pos
const dur: Dur = pos;         // ERROR: Pos does not convert to Dur
const dur: Dur = pos - 0;     // OK: Pos - Pos -> Dur (using 0 as Pos)
```

## Match Expression

`match` compares a value against patterns and returns the first matching arm.

```mf
const label = match (mode) {
  0 -> "intro";
  1 -> "verse";
  else -> "other";
};
```

### Pattern Types

Tako currently supports the following pattern forms:

| Pattern | Syntax | Description |
|---------|--------|-------------|
| Literal | `0`, `"foo"`, `true` | Matches if value `== pattern` |
| Wildcard | `else` | Always matches (must be last) |

### Value Patterns

Value patterns are expressions evaluated and compared with `==` semantics:

```mf
const result = match (n) {
  0 -> "zero";
  1 -> "one";
  else -> "many";
};
```

### Type Patterns with Binding (Future Feature)

> **Note:** Type patterns with binding (`name: Type`) are planned for a future version but not yet implemented. Currently, use `else` with runtime type checking via the `type` field for event types.

The following syntax is reserved for future use:

```mf
// FUTURE SYNTAX - not yet implemented
fn process(token: String | LyricToken) -> String {
  return match (token) {
    s: String -> "text: " + s;
    t: LyricToken -> "token: " + t.text;
  };
}
```

**Current workaround for event types:**

```mf
fn processEvent(ev) {
  return match (ev.type) {
    "note" -> "It's a note";
    "chord" -> "It's a chord";
    else -> "Other event";
  };
}
```

### Match Rules

- Patterns are evaluated top-to-bottom; first match wins
- `else` is optional; if omitted and no arm matches, the result is `null`
- All arms must return the same type (or compatible types for union result)

### Match and Null Typing

When `else` is omitted, the match expression may return `null`. The result type is automatically widened to nullable:

```mf
// With else: result type is String
const a: String = match (n) {
  0 -> "zero";
  else -> "other";
};

// Without else: result type is String? (nullable)
const b: String? = match (n) {
  0 -> "zero";
  1 -> "one";
};  // Returns null if n is 2, 3, etc.
```

## Function Calls and Named Arguments

Tako v3 supports named arguments using a trailing options syntax:

```mf
note(C4, q, vel: 0.7, tech: [legato]);
vocal.vibrato(c, depth: 0.2, rate: 5.5);
```

Rules:

1. **Positional arguments** come first, in declaration order
2. **Named arguments** follow, using `name: value` syntax
3. Named arguments are collected into an implicit options object
4. Positional and named arguments MUST NOT be interleaved
5. If a function declares `opts?` as its last parameter, named arguments populate it
6. Unknown named argument keys are a compile error
7. Named arguments with missing values use their declared defaults

Examples:

```mf
// Function with optional parameters
fn example(a: Int, b: Int, opts?) -> Int { ... }

// All of these are equivalent:
example(1, 2, { vel: 0.5 });  // Explicit object
example(1, 2, vel: 0.5);      // Named argument sugar

// Error: named arguments must come after positional
example(1, vel: 0.5, 2);      // Compile error!
```

## Type System

Tako v3 has a static type system with the following features.

### Primitive Types

- `Int` — signed integer
- `Float` — 64-bit floating point
- `Rat` — rational number (exact fractions)
- `Bool` — `true` or `false`
- `String` — UTF-8 string

### Music-Domain Types

- `Pitch` — pitch with optional cent offset (e.g., `C4`, `F#3+25c`)
- `Dur` — duration as rational (e.g., `q`, `1/4`)
- `Pos` — absolute position within a clip (rational, quarter-note based)
- `PosRef` — bar:beat reference (e.g., `1:1`, `2:3`)
- `DrumKey` — abstract drum key identifier (e.g., `kick`, `snare`)
- `Clip` — sequence of musical events
- `Score` — complete musical score
- `Track` — track within a score
- `Event` — base type for all events (Note, Chord, Hit, etc.)
- `Curve` — automation curve
- `Lyric` — lyric data for vocal tracks
- `LyricToken` — syllable or extension marker

### Nullable Types (`T?`)

The `T?` syntax denotes a nullable type, meaning the value can be either `T` or `null`.

```mf
fn findNote(c: Clip, index: Int) -> Event? {
  // Returns Event or null
}

const e = findNote(c, 5);
if (e != null) {
  // e is narrowed to Event here
}
```

Rules:

- `T?` is shorthand for "T or null"
- `null` is a distinct value, not a member of any non-nullable type
- The `match` expression returns `null` when no arm matches and `else` is omitted
- Functions returning `T?` must be explicitly handled (no implicit null propagation)
- Use `!= null` or `== null` checks for null narrowing

### Tuple Types

Tuples are fixed-length, heterogeneous sequences. They are written as `(T1, T2, ...)`:

```mf
fn split(s: String) -> [String] { ... }

const pair = split("hello:world");
const first = pair[0];   // String
const second = pair[1];  // String
```

> **Note:** Tuple destructuring (`const (a, b) = ...`) is planned for a future version but not yet implemented. Currently, use array index access to retrieve individual elements.

**Tuple vs Array syntax:**

| Syntax | Meaning | Example |
|--------|---------|---------|
| `[T]` | Array of any length | `[Int]` — zero or more Ints |

**Note:** Tako v3 currently uses arrays for multi-value returns instead of tuples. Access elements by index:

```mf
// Array types:
fn items() -> [Int] { ... }           // Array of Ints
fn nested() -> [[String]] { ... }     // Array of String arrays

// Multi-value return uses arrays:
fn divmod(a: Int, b: Int) -> [Int] {
  return [a / b, a % b];
}

const result = divmod(10, 3);
const quotient = result[0];   // 3
const remainder = result[1];  // 1
```

### Union Types

Union types are written as `T1 | T2` in type annotations:

```mf
fn process(token: String | LyricToken) -> Lyric { ... }
```

Rules:

- Union types are used primarily in stdlib API signatures
- Type narrowing via `match` on a discriminator field:

```mf
// Current approach: match on type field
const result = match (token.kind) {
  "syllable" -> handleSyllable(token);
  "extend" -> handleExtend(token);
  else -> handleOther(token);
};
```

### Array Types

Arrays are written as `[T]`:

```mf
const notes: [Pitch] = [C4, E4, G4];
const mixed: [String | Int] = ["hello", 42];
```

### Object Types

Objects have string keys and typed values:

```mf
const opts: { vel: Float, voice: Int } = { vel: 0.8, voice: 1 };
```

## Statements and Expressions

Core statements:

- `const` / `let` declarations
- `return` statements
- `if (...) { ... } else { ... }`
- `for (name in expr) { ... }` (arrays or numeric ranges)

Core expressions:

- Arrays: `[a, b, c]`
- Objects: `{ key: value }`
- Member access: `obj.key`
- Index access: `arr[i]`
- Tuple index: `tuple.0`, `tuple.1`
- Ranges: `a..b` (used for numeric ranges and pitch ranges like `C2..C6`)

### Range Semantics

Ranges use **closed interval** `[a, b]` semantics (both endpoints inclusive):

```mf
for (i in 0..3) { ... }  // i = 0, 1, 2, 3 (4 iterations)
for (i in 1..n) { ... }  // i = 1, 2, ..., n

// Common pattern for array iteration:
for (i in 0..(arr.length - 1)) {
  const elem = arr[i];  // Valid indices: 0 to length-1
}
```

For pitch ranges (e.g., `C2..C6`), both endpoints are also **inclusive**:

```mf
sound "piano" kind instrument {
  range C2..C6;  // Includes both C2 and C6
}
```

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
  17:1 -> 60bpm @ h;
}
```

**Tempo Definition:**

`X bpm @ unit` means the specified `unit` duration occurs `X` times per minute.

| Notation | Meaning |
|----------|---------|
| `120bpm` | 120 quarter notes per minute (default unit is `q`) |
| `120bpm @ q` | Same as above (explicit quarter note) |
| `60bpm @ h` | 60 half notes per minute (= 120 quarter notes per minute) |
| `90bpm @ e` | 90 eighth notes per minute (= 45 quarter notes per minute) |
| `72bpm @ q.` | 72 dotted quarters per minute |

**Conversion formula:**

```
quarter_notes_per_minute = bpm * (unit_duration_in_quarters)
```

Where `q` = 1, `h` = 2, `e` = 0.5, `q.` = 1.5, etc.

**Default:** If `@ unit` is omitted, the unit defaults to `q` (quarter note).

### Meter

```
meter {
  1:1 -> 4/4;
  17:1 -> 3/4;
}
```

**Meter Literal Syntax:**

Meter values use the syntax `numerator/denominator` (e.g., `4/4`, `6/8`, `3/4`). This is a **distinct construct** from duration literals and division expressions:

| Context | Syntax | Type | Notes |
|---------|--------|------|-------|
| `meter { }` block | `4/4` | Meter literal | Parsed as meter signature |
| Duration literal | `1/4` | `Dur` | Only numerator=1 allowed |
| Division expression | `1 / 4` | `Rat` | Spaces trigger division |

**Important:** The meter literal `4/4` is ONLY valid inside a `meter { }` block. Outside this context, `4/4` would be parsed as integer division (yielding `Rat`).

```mf
meter { 1:1 -> 4/4; }   // Valid: meter literal
const m = 4/4;          // Parsed as 4 / 4 -> Rat (value 1)
const d = 1/4;          // Valid: Dur literal (quarter note)
```

**Meter change constraints:** See `std:time` in STDLIB.md for rules on when meter changes are allowed (must be at bar boundaries).

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

Score markers annotate absolute positions in the score (not per-clip). They use a distinct syntax from clip markers:

```
marker(posRef, kind, label);
```

- `posRef`: A `PosRef` literal (e.g., `1:1`, `2:3`)
- `kind`: A string identifying the marker type (e.g., `"section"`, `"cue"`)
- `label`: A string value for the marker

Example:

```
marker(1:1, "section", "Intro");
marker(9:1, "section", "Verse");
```

**Note**: Score `marker` and clip `marker` are distinct constructs, not overloaded functions:
- Score marker: `marker(posRef, kind, label)` — three arguments, first is PosRef
- Clip marker: `marker(kind, label)` — two arguments, placed at current cursor

## Clip DSL (`clip { ... }`)

`clip { ... }` returns a `Clip`. Each clip has a local `cursor: Pos` starting at 0.

### Pos (Position) in Clips

`Pos` is the position type used within clips. It represents an absolute offset from the clip's start, measured in **quarter notes** as the base unit.

- `Pos` is a rational number (uses `Rat` internally)
- The unit is quarter notes: `1` = one quarter note, `0.5` = one eighth note
- `Pos` can be constructed from:
  - Integer literals: `0`, `1`, `4` (interpreted as quarter notes)
  - Duration values: `q` (= 1), `h` (= 2), `w` (= 4), `e` (= 0.5)
  - Arithmetic: `q + e` (= 1.5), `w * 2` (= 8)
  - `std:time.dur(n, d)` for explicit rationals

```mf
clip {
  at(0);        // Start of clip
  note(C4, q);
  at(q);        // Same as at(1) - one quarter note from start
  at(h);        // Same as at(2) - one half note from start
  at(q + e);    // 1.5 quarter notes from start
}
```

### Statements

- `at(pos: Pos)` — set cursor to absolute position
- `rest(dur: Dur)` — advance cursor by dur (no event)
- `breath(dur: Dur, intensity?: Float)` — add breath event; cursor += dur
- `note(pitch: Pitch, dur: Dur, opts?)` — add note; cursor += dur
- `chord(pitches: [Pitch], dur: Dur, opts?)` — add chord; cursor += dur
- `hit(key: DrumKey, dur: Dur, opts?)` — add drum hit; cursor += dur
- `cc(num: Int, value: Float)` — control event at current cursor (cursor unchanged)
- `automation(param: String, start: Pos, end: Pos, curve: Curve)` — automation event (cursor unchanged)
- `marker(kind: String, label: String)` — marker event at current cursor (cursor unchanged)

### Event Position Rules

Each statement generates events with positions as follows:

| Statement | Event Position | Cursor After |
|-----------|---------------|--------------|
| `at(pos)` | (no event) | `pos` |
| `rest(dur)` | (no event) | `cursor + dur` |
| `note(...)` | `cursor` | `cursor + dur` |
| `chord(...)` | `cursor` | `cursor + dur` |
| `hit(...)` | `cursor` | `cursor + dur` |
| `breath(...)` | `cursor` | `cursor + dur` |
| `cc(...)` | `cursor` | `cursor` (unchanged) |
| `marker(...)` | `cursor` | `cursor` (unchanged) |
| `automation(...)` | `start` to `end` | `cursor` (unchanged) |

### Options (`opts`)

- `vel: Float` — velocity (0..1 recommended)
- `voice: Int` — voice number for polyphonic separation
- `tech: [TechniqueId]` — playing techniques (e.g., `[legato]`, `[staccato]`)
- `lyric: LyricSpan` — lyric attachment (note only)

### Example

```mf
clip {
  note(C4, q, vel: 0.7);
  rest(e);
  hit(kick, q, vel: 0.9);
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

## Additional Examples

- `docs/examples/v3/demo_v3.mf`
- `docs/examples/v3/ir/demo_v3.mf.score.json`
- `docs/examples/v3/profiles/*.mf.profile.json`

## Related Docs

- Schemas: `docs/SCHEMAS.md`
- Rendering and plugins: `docs/RENDERING.md`
