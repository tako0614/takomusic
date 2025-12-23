# TakoScore Language Specification v2.0

TakoScore is a domain-specific language for vocal synthesis composition, optimized for NEUTRINO.

## Design Principles

### Core Invariants

1. **One note = one mora (or phoneme)** - Long lyrics cannot be attached to a single note
2. **Lyrics are mora/phoneme sequences** - Not arbitrary strings
3. **Melisma is extension, not splitting** - Use `_` to extend syllables across notes
4. **Phrase-first structure** - NEUTRINO's generation unit is explicit in syntax
5. **Tie preserves onset** - Tied notes don't advance lyrics

---

## Table of Contents

- [Score Structure](#score-structure)
- [Backend Configuration](#backend-configuration)
- [Parts and Phrases](#parts-and-phrases)
- [Notes and Lyrics](#notes-and-lyrics)
- [Underlay Rules](#underlay-rules)
- [Ties and Slurs](#ties-and-slurs)
- [Rests and Breaths](#rests-and-breaths)
- [Voice Tuning](#voice-tuning)
- [MIDI Tracks](#midi-tracks)
- [Types and Literals](#types-and-literals)
- [Control Structures](#control-structures)
- [Procedures](#procedures)
- [Modules](#modules)
- [Error Codes](#error-codes)

---

## Score Structure

A TakoScore file (`.mf` extension) defines a single score with metadata, backend configuration, and parts.

```mf
score "Song Title" {
  backend neutrino {
    singer "KIRITAN"
    lang ja
  }

  tempo 120
  time 4/4
  key C major

  part Vocal {
    // phrases go here
  }

  part Piano {
    // MIDI track
  }
}
```

### Required Elements

- `tempo` - BPM (required at start)
- `time` - Time signature (required at start)

### Optional Elements

- `key` - Key signature (default: C major)
- `ppq` - Ticks per quarter note (default: 480)

---

## Backend Configuration

The `backend` block configures the synthesis engine.

```mf
backend neutrino {
  singer "KIRITAN"           // Voice model name
  lang ja                    // Language: ja (Japanese)
  phonemeBudgetPerOnset 8    // Max phonemes per note onset
  maxPhraseSeconds 10        // Warn if phrase exceeds this
}
```

### Backend Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `singer` | string | Voice model name | required |
| `lang` | identifier | Language code | `ja` |
| `phonemeBudgetPerOnset` | int | Max phonemes per onset | 8 |
| `maxPhraseSeconds` | float | Phrase length warning threshold | 10.0 |

---

## Parts and Phrases

### Part Declaration

```mf
part PartName {
  // part body
}
```

Parts can be `vocal` (for synthesis) or `midi` (for accompaniment).

### Vocal Part with Phrases

Phrases are the fundamental unit for NEUTRINO. A phrase is bounded by rests or breaths.

```mf
part Vocal {
  phrase {
    notes:
      | C4 q  D4 q  E4 q  F4 q |
      | G4 h         A4 h     |;

    lyrics mora:
      き ず だ ら け の;
  }

  rest q    // Rest separates phrases

  phrase {
    notes:
      | B4 q  C5 q  D5 q  E5 q |;

    lyrics mora:
      ま ま で い て;
  }
}
```

### Notes Section

Notes are written in a bar-like notation:

```mf
notes:
  | C4 q  D4 q  E4 q  F4 q |    // Bar 1
  | G4 h         A4 h     |;   // Bar 2
```

Duration suffixes:
- `w` - whole note
- `h` - half note
- `q` - quarter note
- `e` - eighth note
- `s` - sixteenth note
- `t` - thirty-second note
- `x` - sixty-fourth note

Dotted notes: append `.` (e.g., `q.` = dotted quarter)

### Lyrics Section

Lyrics are mora (syllable) sequences:

```mf
lyrics mora:
  き ず だ ら け の ま ま;
```

Or phoneme sequences for advanced control:

```mf
lyrics phoneme:
  k i z u d a r a k e n o m a m a;
```

---

## Underlay Rules

The underlay system connects notes to lyrics.

### Basic Rule

Each **onset** (new note, excluding tied continuations) consumes one lyric token.

```mf
notes:
  | C4 q  D4 q  E4 q  F4 q |;

lyrics mora:
  き   ず   だ   ら;
```

Result: C4="き", D4="ず", E4="だ", F4="ら"

### Melisma (Extension)

Use `_` to extend the previous syllable across multiple notes:

```mf
notes:
  | G4 q  A4 q  B4 q  C5 q |;

lyrics mora:
  ま   _   _   ま;
```

Result: G4="ま", A4=(melisma), B4=(melisma), C5="ま"

This maps to MusicXML `<extend>` element.

### Count Validation

The number of lyric tokens must match the number of note onsets:

```
onset_count = count(notes) - count(tied_continuations)
lyric_count = count(mora_tokens)  // including _ tokens

// Must be equal, otherwise compile error
```

---

## Ties and Slurs

### Ties

Ties connect two notes of the same pitch. The second note is **not an onset**.

```mf
notes:
  | C4 h~  C4 h   D4 q  E4 q |;

lyrics mora:
  こ          ん   に;
```

The `~` indicates tie start. The tied C4 doesn't consume a lyric.

### Slurs (Planned)

> **Note**: Slur syntax is planned for a future release.

Slurs will connect different pitches for phrasing (not pitch connection).

---

## Rests and Breaths

### Rest Between Phrases

```mf
part Vocal {
  phrase { ... }
  rest q           // Quarter rest = phrase boundary
  phrase { ... }
}
```

### Breath Mark

```mf
phrase {
  notes:
    | C4 q  D4 q |;
  breath;          // Breath = phrase boundary within phrase block
  notes:
    | E4 q  F4 q |;

  lyrics mora:
    き ず だ ら;
}
```

Breath marks are recognized by NEUTRINO as phrase boundaries.

---

## Voice Tuning

Voice parameters control vocal expression in NEUTRINO synthesis.

### Per-Note Parameters

Attach voice parameters to individual notes using bracket syntax:

```mf
phrase {
  notes:
    | C4 q [dyn:100 bre:30]  D4 q [dyn:80]  E4 h |;
  lyrics mora:
    あ い う;
}
```

Multiple parameters can be specified in a single bracket:

```mf
| C4 q [dyn:100 bre:30 bri:64] |
```

### Automation Curves

Define parameter changes over time using automation statements:

```mf
part Vocal {
  // Parameter automation: paramType time value, time value, ...
  dyn 1:0 100, 2:0 80, 3:0 120
  bre 1:0 0, 2:0 50, 3:0 0

  phrase {
    notes: | C4 w  D4 w  E4 w |;
    lyrics mora: あ い う;
  }
}
```

Time format is `bar:beat` (1-indexed bars, 0-indexed beats).

### Available Parameters

| Parameter | IR Type | Description | Range |
|-----------|---------|-------------|-------|
| `dyn` | DYN | Dynamics (volume) | 0-127 |
| `bre` | BRE | Breathiness | 0-127 |
| `bri` | BRI | Brightness | 0-127 |
| `cle` | CLE | Clearness | 0-127 |
| `gen` | GEN | Gender factor | 0-127 |
| `por` | POR | Portamento | 0-127 |
| `ope` | OPE | Opening | 0-127 |
| `pit` | PIT | Pitch bend | varies |

---

## MIDI Tracks

MIDI parts use simpler syntax without underlay:

```mf
part Piano {
  midi ch:1 program:0

  | C4 q  E4 q  G4 q  C5 q |
  | [C4 E4 G4] h            |   // Chord
}

part Drums {
  midi ch:10

  | kick q  snare q  kick q  snare q |
}
```

### MIDI Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `ch` | int | MIDI channel (1-16) | 1 |
| `program` | int | GM program (0-127) | 0 |
| `vel` | int | Default velocity | 96 |

### Drum Names

Built-in drum names for channel 10:

| Name | MIDI | Description |
|------|------|-------------|
| `kick` | 36 | Bass Drum |
| `snare` | 38 | Snare Drum |
| `hhc` | 42 | Closed Hi-Hat |
| `hho` | 46 | Open Hi-Hat |
| `tom1` | 50 | High Tom |
| `crash` | 49 | Crash Cymbal |
| `ride` | 51 | Ride Cymbal |

---

## Types and Literals

### Primitive Types

| Type | Description | Example |
|------|-------------|---------|
| `int` | Integer | `42`, `-7` |
| `float` | Floating-point | `3.14`, `-0.5` |
| `string` | Text | `"hello"` |
| `bool` | Boolean | `true`, `false` |
| `pitch` | MIDI pitch | `C4`, `F#5`, `Bb3` |
| `dur` | Duration | `q`, `h.`, `480t` |
| `time` | Time position | `1:1`, `3:2:240` |

### Pitch Literals

```mf
C4      // Middle C (MIDI 60)
C#4     // C sharp
Db4     // D flat (enharmonic to C#4)
Bb3     // B flat
```

### Duration Literals

```mf
w       // Whole note
h       // Half note
q       // Quarter note
e       // Eighth note
s       // Sixteenth note
q.      // Dotted quarter
480t    // 480 ticks
```

### Time Literals

```mf
1:1       // Bar 1, beat 1
2:3       // Bar 2, beat 3
1:1:240   // Bar 1, beat 1, tick 240
```

---

## Control Structures

### Variables

```mf
const root = C4;        // Immutable (global or local)
```

Inside procedures or parts:

```mf
proc example() {
  let count = 0;        // Mutable (local only)
  count = count + 1;
}
```

### Conditionals

```mf
if (condition) {
  // ...
} else if (other) {
  // ...
} else {
  // ...
}
```

### Loops

```mf
for (i in 0..4) {
  // i = 0, 1, 2, 3
}

for (i in 0..=4) {
  // i = 0, 1, 2, 3, 4
}
```

### Control Flow in Part Bodies

Control structures (`if`, `for`, `while`) can be used inside part bodies for conditional or repeated patterns. They work best with procedure calls:

```mf
part Vocal {
  midi ch:1
  for (i in 0..4) {
    myPattern();
  }
}
```

---

## Procedures

Procedures allow you to define reusable musical patterns.

```mf
proc myVerse() {
  phrase {
    notes:
      | C4 q  D4 q  E4 q  F4 q |;

    lyrics mora:
      ら ら ら ら;
  }
}

part Vocal {
  myVerse();
  rest q;
  myVerse();
}
```

### Procedures with Parameters

Procedures can accept parameters:

```mf
proc makeChord(root, type) {
  // Use parameters in logic
  if (type == "major") {
    | [C4 E4 G4] w |
  }
}
```

> **Note**: Template interpolation (`${expr}`) in notes section is planned for a future release.

### Procedures in Parts

Procedures can contain `phrase`, `rest`, and MIDI bars (`| ... |`). When called from within a part body, these elements are executed in the part's context.

---

## Modules

### Import

```mf
import { verse, chorus } from "./sections.mf";
import { majorScale } from "std:theory";
```

### Export

```mf
export proc myPhrase() { ... }
export const ROOT = C4;
```

---

## Mora Helper Function

For convenience, a mora splitter function is available:

```mf
lyrics mora:
  ${mora("きずだらけ")};   // Expands to: き ず だ ら け
```

This is **explicit expansion**, not automatic splitting.

---

## Error Codes

### Compile-Time Errors

| Code | Description |
|------|-------------|
| E001 | PPQ not set |
| E010 | Tempo at tick=0 not set |
| E011 | Time signature at tick=0 not set |
| E100 | Lyric count mismatch (onset count ≠ lyric tokens) |
| E101 | Duration doesn't resolve to integer ticks |
| E102 | Invalid time position |
| E110 | Pitch out of range (0-127) |
| E200 | Vocal note overlap |
| E210 | Empty lyric in vocal track |
| E211 | Kanji in lyric (NEUTRINO requires kana) |
| E220 | Phoneme budget exceeded for onset |
| E300 | Phrase too long (exceeds maxPhraseSeconds) |
| E310 | Recursive procedure call |
| E400 | Undefined symbol |

### Warnings

| Code | Description |
|------|-------------|
| W100 | Extremely short note |
| W110 | Note outside comfortable vocal range |
| W200 | Many tempo changes (may cause sync issues) |
| W300 | Fine-grained rests may flatten expression |

---

## MusicXML Mapping

TakoScore maps cleanly to MusicXML:

| TakoScore | MusicXML |
|-----------|----------|
| mora token | `<lyric><text>` |
| `_` (melisma) | `<extend>` |
| tie `~` | `<tie>`, `<tied>` |
| phrase boundary | Rest or breath mark |

### Syllabic Mapping

| Context | `<syllabic>` |
|---------|--------------|
| Single mora word | `single` |
| Word start | `begin` |
| Word middle | `middle` |
| Word end | `end` |

---

## Complete Example

```mf
score "はじめまして" {
  backend neutrino {
    singer "KIRITAN"
    lang ja
  }

  tempo 120
  time 4/4

  part Vocal {
    phrase {
      notes:
        | C4 q  D4 q  E4 q  F4 q |
        | G4 h         A4 h     |;

      lyrics mora:
        は じ め ま し て;
    }

    rest q

    phrase {
      notes:
        | G4 q  A4 q  B4 q  C5 q |;

      lyrics mora:
        よ ろ し く;
    }
  }

  part Piano {
    midi ch:1 program:0

    | [C4 E4 G4] w |
    | [F4 A4 C5] w |
  }
}
```

---

## Reserved Words

```
score backend part phrase notes lyrics mora phoneme
midi vocal rest breath tie
const let proc export import
if else for in while match case default
return break continue
true false null
```

## See Also

- [Builtin Functions](BUILTINS.md) - Runtime functions
- [Standard Library](STDLIB.md) - Music theory helpers
