# MFS Language Specification

MFS (Music Format Script) is a domain-specific language for music composition.

## Table of Contents

- [Types](#types)
- [Literals](#literals)
- [Variables](#variables)
- [Operators](#operators)
- [Control Structures](#control-structures)
- [Procedures](#procedures)
- [Lambda Expressions](#lambda-expressions)
- [Tracks](#tracks)
- [Modules](#modules)
- [Comments](#comments)

---

## Types

MFS has the following built-in types:

| Type | Description | Example |
|------|-------------|---------|
| `int` | Integer number | `42`, `-7`, `0` |
| `float` | Floating-point number | `3.14`, `-0.5` |
| `string` | Text string | `"hello"`, `"lyrics"` |
| `bool` | Boolean value | `true`, `false` |
| `pitch` | Musical pitch (MIDI note) | `C4`, `F#5`, `Bb3` |
| `dur` | Duration value | `4n`, `8n.`, `480t` |
| `time` | Position in song | `1:1`, `3:2:240` |
| `array` | List of values | `[C4, E4, G4]` |
| `object` | Key-value pairs | `{ch: 1, vel: 100}` |
| `function` | Lambda function | `(x) => x + 1` |
| `null` | No value | (internal) |

---

## Literals

### Integer Literals

```mfs
42
-7
0
127
```

### Float Literals

```mfs
3.14
-0.5
1.0
```

### String Literals

```mfs
"Hello, World!"
"lyrics here"
""
```

### Boolean Literals

```mfs
true
false
```

### Null Literal

```mfs
null
```

### Template Literals

String interpolation using backticks.

```mfs
const name = "World";
const msg = `Hello, ${name}!`;   // "Hello, World!"

const x = 5;
const y = 10;
const sum = `${x} + ${y} = ${x + y}`;  // "5 + 10 = 15"
```

### Pitch Literals

Musical notes with octave number (MIDI range 0-127).

**Natural notes:**
```mfs
C4    // Middle C (MIDI 60)
D4    // MIDI 62
E4    // MIDI 64
F4    // MIDI 65
G4    // MIDI 67
A4    // MIDI 69 (440Hz)
B4    // MIDI 71
```

**Sharp notes (# or s):**
```mfs
C#4   // C sharp
Cs4   // Same as C#4
F#5   // F sharp, octave 5
```

**Flat notes (b):**
```mfs
Bb3   // B flat
Eb4   // E flat
Db5   // D flat
```

**Octave range:** 0-9 (C0 = MIDI 12, C4 = MIDI 60)

### Duration Literals

**Note values:**
```mfs
1n    // Whole note
2n    // Half note
4n    // Quarter note
8n    // Eighth note
16n   // Sixteenth note
32n   // Thirty-second note
64n   // Sixty-fourth note
```

**Dotted notes (1.5x duration):**
```mfs
4n.   // Dotted quarter
8n.   // Dotted eighth
2n.   // Dotted half
```

**Tick-based duration:**
```mfs
480t  // 480 ticks (= quarter note at ppq 480)
240t  // 240 ticks
120t  // 120 ticks
```

**Fraction syntax:**
```mfs
1/4   // Quarter note
1/8   // Eighth note
3/8   // Dotted quarter
```

### Time Literals

Position in the song as `bar:beat` or `bar:beat:ticks`.

```mfs
1:1       // Bar 1, beat 1
2:3       // Bar 2, beat 3
1:1:240   // Bar 1, beat 1, tick 240
5:1       // Bar 5, beat 1
```

### Array Literals

```mfs
[C4, E4, G4]           // Pitch array (chord)
[1, 2, 3, 4]           // Integer array
["a", "b", "c"]        // String array
[]                     // Empty array
```

### Object Literals

```mfs
{ch: 1, program: 30}
{vel: 100}
{}
```

---

## Variables

### Constants (immutable)

```mfs
const name = value;
```

```mfs
const root = C4;
const tempo = 120;
const notes = [C4, E4, G4];
```

### Variables (mutable)

```mfs
let name = value;
name = newValue;
```

```mfs
let count = 0;
count = count + 1;

let vel = 80;
vel += 10;  // Compound assignment
```

### Compound Assignment Operators

```mfs
x += 5    // x = x + 5
x -= 3    // x = x - 3
x *= 2    // x = x * 2
x /= 4    // x = x / 4
x %= 3    // x = x % 3
x &= 7    // x = x & 7
x |= 8    // x = x | 8
x ^= 15   // x = x ^ 15
x <<= 2   // x = x << 2
x >>= 1   // x = x >> 1
```

---

## Operators

### Arithmetic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `3 + 4` → `7` |
| `-` | Subtraction | `10 - 3` → `7` |
| `*` | Multiplication | `6 * 7` → `42` |
| `/` | Division | `15 / 3` → `5` |
| `%` | Modulo | `17 % 5` → `2` |
| `-` | Negation (unary) | `-x` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `x == 5` |
| `!=` | Not equal | `x != 0` |
| `<` | Less than | `x < 10` |
| `>` | Greater than | `x > 0` |
| `<=` | Less or equal | `x <= 100` |
| `>=` | Greater or equal | `x >= 1` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | Logical AND | `a && b` |
| `\|\|` | Logical OR | `a \|\| b` |
| `!` | Logical NOT | `!a` |

### Bitwise Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | Bitwise AND | `5 & 3` → `1` |
| `\|` | Bitwise OR | `5 \| 3` → `7` |
| `^` | Bitwise XOR | `5 ^ 3` → `6` |
| `~` | Bitwise NOT | `~5` → `-6` |
| `<<` | Left shift | `5 << 1` → `10` |
| `>>` | Right shift | `5 >> 1` → `2` |

### typeof Operator

```mfs
typeof 42           // "int"
typeof 3.14         // "float"
typeof "hello"      // "string"
typeof true         // "bool"
typeof C4           // "pitch"
typeof 1/4          // "dur"
typeof [1, 2, 3]    // "array"
typeof {a: 1}       // "object"
typeof null         // "null"
```

### Optional Chaining

Access properties safely without null checks.

```mfs
const obj = {nested: {value: 42}};
obj?.nested?.value    // 42
obj?.missing?.value   // null (no error)

const arr = [1, 2, 3];
arr?.[0]              // 1
arr?.[10]             // null
```

### Nullish Coalescing

Use `??` to provide default values for null.

```mfs
const a = null;
const b = a ?? 10;    // 10 (a is null)

const c = 0;
const d = c ?? 10;    // 0 (c is not null)
```

### Range Operators

```mfs
0..4      // Exclusive: 0, 1, 2, 3
0..=4     // Inclusive: 0, 1, 2, 3, 4
1..=8     // 1, 2, 3, 4, 5, 6, 7, 8
```

### Member Access

```mfs
array[0]      // Array index
array[i]      // Dynamic index
object.key    // Object property
```

---

## Control Structures

### If Statement

```mfs
if (condition) {
  // statements
}

if (condition) {
  // true branch
} else {
  // false branch
}

if (x > 0) {
  note(C4, 4n);
} else if (x < 0) {
  note(G3, 4n);
} else {
  rest(4n);
}
```

### For Loop

**Range-based:**
```mfs
// Exclusive range (0, 1, 2, 3)
for (i in 0..4) {
  note(C4, 8n);
}

// Inclusive range (1, 2, 3, 4)
for (bar in 1..=4) {
  drum(kick, 4n);
}
```

**Array iteration:**
```mfs
const notes = [C4, E4, G4];
for (n in notes) {
  note(n, 4n);
}
```

### While Loop

```mfs
let i = 0;
while (i < 4) {
  note(C4, 4n);
  i += 1;
}
```

### Break and Continue

```mfs
for (i in 0..10) {
  if (i == 5) {
    break;      // Exit loop
  }
  if (i % 2 == 0) {
    continue;   // Skip to next iteration
  }
  note(C4, 8n);
}
```

### Match Statement

Pattern matching for cleaner conditionals.

```mfs
match (note) {
  case C4 {
    print("Do");
  }
  case D4 {
    print("Re");
  }
  case E4 {
    print("Mi");
  }
  default {
    print("Other");
  }
}
```

---

## Procedures

### Declaration

```mfs
proc name(param1, param2) {
  // body
}
```

```mfs
proc playChord(root, dur) {
  chord([root, transpose(root, 4), transpose(root, 7)], dur);
}
```

### Default Parameters

Parameters can have default values.

```mfs
proc greet(name, greeting = "Hello") {
  print(`${greeting}, ${name}!`);
}

greet("World");           // "Hello, World!"
greet("World", "Hi");     // "Hi, World!"
```

Default values can reference earlier parameters.

```mfs
proc range(start, end = start + 10) {
  for (i in start..end) {
    print(i);
  }
}

range(5);      // 5 to 14
range(0, 5);   // 0 to 4
```

### Export

```mfs
export proc main() {
  // Entry point
}

export proc myPattern() {
  // Can be imported by other modules
}
```

### Return Values

```mfs
proc double(x) {
  return x * 2;
}

proc makeChord(root) {
  return [root, transpose(root, 4), transpose(root, 7)];
}
```

---

## Lambda Expressions

Anonymous functions for functional programming.

### Syntax

```mfs
(params) => expression
(params) => { statements }
```

### Examples

```mfs
// Single parameter
const double = (x) => x * 2;

// Multiple parameters
const add = (a, b) => a + b;

// With map
const notes = [C4, E4, G4];
const raised = map(notes, (n) => transpose(n, 12));

// With forEach
forEach([C4, D4, E4], (n) => note(n, 4n));
```

---

## Tracks

### Track Declaration

```mfs
track(kind, name, options) {
  // track body
}
```

**Kind:** `midi` or `vocal`

### MIDI Track

```mfs
track(midi, piano, {ch: 1, program: 0}) {
  note(C4, 4n);
}
```

### Vocal Track

```mfs
track(vocal, lead, {}) {
  note(C4, 4n, "ら");  // Requires lyric
}
```

**Lyric Restrictions:**

Vocal tracks are synthesized using NEUTRINO, which has specific requirements:

1. **Hiragana/Katakana only** - Kanji characters are not supported (E211)
2. **1-2 syllables per note** - Each note can have at most 2 syllables (E212)

Small kana (ゃゅょぁぃぅぇぉっ) combine with the previous character and don't count as separate syllables.

```mfs
// ✓ Correct - hiragana, 2 syllables
note(C4, 4n, "こん");
note(D4, 4n, "にち");
note(E4, 4n, "は");

// ✓ Correct - katakana
note(C4, 4n, "ラ");

// ✓ Correct - きょ counts as 1 syllable (ょ is small)
note(C4, 4n, "きょう");  // 2 syllables: きょ + う

// ✗ Error E211 - kanji not supported
note(C4, 4n, "今日は");  // Use "きょうは" instead

// ✗ Error E212 - too many syllables
note(C4, 4n, "こんにちは");  // 5 syllables - split into multiple notes
```

### Track Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `ch` | int | MIDI channel (1-16) | 1 |
| `program` | int | GM program number (0-127) | 0 |
| `vel` | int | Default velocity (1-127) | 96 |

**Note:** `ch` is 1-based in MFS, converted to 0-based internally.

### Common GM Programs

| Program | Instrument |
|---------|------------|
| 0 | Acoustic Grand Piano |
| 25 | Acoustic Guitar (steel) |
| 26 | Electric Guitar (jazz) |
| 27 | Electric Guitar (clean) |
| 29 | Overdriven Guitar |
| 30 | Distortion Guitar |
| 32 | Acoustic Bass |
| 33 | Electric Bass (finger) |
| 34 | Electric Bass (pick) |
| 40 | Violin |
| 48 | String Ensemble 1 |
| 56 | Trumpet |
| 73 | Flute |

**Drums:** Use `ch: 10` for GM drum kit.

---

## Modules

### Import

```mfs
// Named imports from local file
import { func1, func2 } from "./path/to/file.mf";

// From standard library
import { majorTriad, QUARTER } from "std:theory";
import { euclidean } from "std:patterns";
```

### Export

```mfs
// Export procedure
export proc myFunction() { }

// Export constant
export const MY_VALUE = 42;
```

### Standard Library Modules

| Module | Description |
|--------|-------------|
| `std:theory` | Scales, chords, intervals, durations |
| `std:patterns` | Euclidean rhythms, arpeggios |
| `std:dynamics` | Crescendo, diminuendo |
| `std:articulation` | Staccato, legato, accent |
| `std:ornaments` | Trill, mordent, turn |
| `std:rhythm` | Swing, shuffle |
| `std:notation` | Tuplets, grace notes |
| `std:expression` | Expression curves |
| `std:curves` | Interpolation functions |
| `std:utils` | Utility functions |

---

## Comments

```mfs
// Single-line comment

/*
  Multi-line
  comment
*/

note(C4, 4n);  // Inline comment
```

---

## Complete Example

```mfs
// Rock song example
import { powerChord, QUARTER, EIGHTH } from "std:theory";
import { accent } from "std:articulation";

proc guitarRiff() {
  const eChord = powerChord(E2);
  chord(eChord, EIGHTH);
  rest(EIGHTH);
  chord(eChord, EIGHTH);
  rest(EIGHTH);

  const aChord = powerChord(A2);
  chord(aChord, QUARTER);
}

proc drumPattern() {
  for (beat in 0..4) {
    drum(kick, EIGHTH);
    drum(hhc, EIGHTH);
  }
}

export proc main() {
  title("My Rock Song");
  ppq(480);
  tempo(140);
  timeSig(4, 4);

  // Distortion Guitar
  track(midi, guitar, {ch: 1, program: 30}) {
    for (bar in 0..4) {
      guitarRiff();
    }
  }

  // Drums
  track(midi, drums, {ch: 10}) {
    for (bar in 0..4) {
      drumPattern();
    }
  }

  // Vocals
  track(vocal, lead, {}) {
    at(1:1);
    note(E4, QUARTER, "Yeah");
    note(G4, QUARTER, "rock");
    note(A4, QUARTER, "and");
    note(B4, QUARTER, "roll");
  }
}
```

---

## Reserved Words

```
import export proc const let
if else for while in match case default
return break continue
true false null
typeof
vocal midi
```

## See Also

- [Builtin Functions](BUILTINS.md) - Low-level runtime functions
- [Standard Library](STDLIB.md) - High-level music functions
