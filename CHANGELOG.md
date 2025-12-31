# Changelog

All notable changes to TakoMusic are documented in this file.

## [4.0.0] - 2026-01-01

### Breaking Changes

- **Versioning**: Package version updated from 3.x to 4.0.0
- **Class Naming**: Internal classes renamed (V3Lexer → V4Lexer, V3Parser → V4Parser, etc.)
- **IR Version**: Output IR uses `irVersion: 4`

### Language Features (v4)

All v4 language features are now stable:

- **Template Literals**: `"Hello ${name}"`
- **Pipeline Operator**: `x |> transform |> output`
- **Spread Operator**: `[...arr]`, `{...obj}`
- **Nullish Coalescing**: `value ?? default`
- **Tuple Destructuring**: `const (a, b, ...rest) = expr`
- **Match Expressions**: Pattern matching with guards and range patterns
- **Enum with Payload**: `enum Result { Ok(value), Err(msg) }`
- **Type Aliases**: `type Velocity = Float;`
- **Native Tuplets**: `triplet(n) { ... }`, `tuplet(n, inTime) { ... }`
- **Arpeggio**: `arp(chord, dur, direction)`
- **Anacrusis**: `meta { anacrusis q; }`
- **Gradual Tempo**: `ramp()` / `ease()` functions

### Standard Library Expansion

#### std:core
- **Generic Array Functions**: `map()`, `filter()`, `fold()`, `flatMap()`, `zip()`, `enumerate()`, `range()`, `find()`, `findIndex()`, `every()`, `some()`, `includes()`, `take()`, `drop()`
- **Clip Operations**: `merge()`, `split()`, `reverse()`, `invert()`, `retrograde()`, `augment()`, `diminish()`

#### std:theory
- **Analysis Functions**: `analyze()`, `commonTones()`, `voiceLead()`, `degreeToChord()`, `modulate()`
- **Extended Chords**: `add2()`, `add4()`, `six()`, `sixNine()`, `minorSix()`, `sharpFive()`, `flatFive()`, `sharpNine()`, `flatNine()`

#### std:rhythm (NEW)
- **Euclidean Rhythms**: `euclidean()`, `euclideanClip()`
- **Polyrhythms**: `polyrhythm()`, `crossRhythm()`
- **Grooves**: `groove()`, `applyGroove()`
- **Patterns**: `clave()`, `accent()`

### Test Coverage

- **212 total tests** across all modules
- New stdlib test suite covering:
  - Clip operations (repeat, concat, merge, reverse)
  - Theory functions (majorTriad, major7, scales)
  - Transform functions (transpose)
  - Match expressions
  - Template literals
  - Spread operator
  - Nullish coalescing
  - Tuple destructuring
  - Arpeggio and triplet

### Documentation

- Updated `docs/V4_SPEC.md` with accurate implementation status
- Updated `docs/V4_STATUS.md` with comprehensive feature tracking
- Updated `docs/BUILTINS.md` with arp() and triplet()/tuplet() documentation
- All CLI help now references v4

### Internal

- Standardized error message prefixes (`[lexer]`, `[parser]`, `[eval]`)
- Standard library comments updated to v4
- VirtualFS synced with lib/*.mf for browser compatibility
- Test files renamed and updated

---

## [3.3.0] - 2025-12-31

### Added

#### Web Audio Playback
- `website/src/lib/audioPlayer.ts` - Web Audio synthesizer for browser playback
- Play/Stop button in Playground with real-time audio synthesis
- Synthesized piano sounds (triangle wave with ADSR)
- Synthesized drum kit (kick, snare, hi-hat, cymbal, toms)
- Tempo-aware playback from Score IR
- Volume control and playback state management

#### Code Formatter (`mf fmt`)
- `src/formatter.ts` - AST-based code formatter
- `src/cli/commands/fmt.ts` - CLI command for formatting
- `--check` flag for CI/pre-commit hook usage
- Consistent 2-space indentation, proper spacing

#### HTTP URL-based Package Management (`mf install`)
- `src/package/manager.ts` - Go/Deno-style package manager
- No central registry - packages fetched directly from URLs
- GitHub/GitLab shorthand support (e.g., `github.com/user/repo/lib/file.mf`)
- Lock file (`mf.lock`) with SHA256 hash verification
- Local cache directory (`.mf_cache/`)
- Commands: `install`, `remove`, `list`, `verify`, `update`

#### MusicXML Renderer Plugin
- `tools/tako-render-musicxml/` - Standard MusicXML renderer
- Pure TypeScript MusicXML 4.0 writer (no external dependencies)
- Supports instruments, drums, vocals, tempo, meter
- Automatic clef selection based on pitch range
- Lyric support for vocal tracks

#### Standard Library Expansion (`std:theory`)
- Extended chord types: 7ths, 9ths, 11ths, 13ths, sus, aug, dim
- Chord inversions: `invert1()`, `invert2()`, `invert3()`
- All major modes: ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian
- Minor scale variants: harmonic, melodic
- Pentatonic scales: major, minor
- Blues and jazz scales: blues, bebop, whole tone, diminished
- World music scales: japanese, hirajoshi, hungarian, gypsy, arabian
- Interval functions: unison through octave
- Transpose utilities: `transposeUp()`, `transposeDown()`, `transposeOctave()`
- Pitch utilities: `pitchClass()`, `octaveOf()`, `makePitch()`
- Arpeggio patterns: `arpeggioUp()`, `arpeggioDown()`, `arpeggioAlberti()`, `arpeggioBroken()`
- Chord progressions: `progressionTwoFiveOne()`, `progressionPopCanon()`, `progressionBlues()`, etc.
- Expression/dynamics: velocity constants (ppp-fff), `crescendo()`, `decrescendo()`, `accentPattern()`
- Rhythm utilities: `rhythmStraightFour()`, `rhythmSyncopated()`, `rhythmDotted()`

#### REPL Mode (`mf repl`)
- `src/cli/commands/repl.ts` - Interactive REPL session
- Define variables with `const` and `let`
- Define functions with `fn`
- Multi-line input with automatic brace detection
- Commands: `.help`, `.clear`, `.reset`, `.vars`, `.history`, `.load`, `.exit`

#### Watch Mode (`mf watch`)
- `src/cli/commands/watch.ts` - File watcher with auto-rebuild
- Watch and check (`mf watch`) or build (`mf watch -b`)
- Debounce support to handle rapid file changes
- Recursive directory watching

#### Lilypond/Sheet Music Renderer
- `tools/tako-render-lilypond/` - Lilypond notation renderer plugin
- MIDI to Lilypond pitch conversion with octave markers
- Duration conversion to Lilypond notation
- Automatic clef selection based on pitch range
- Drum staff support with General MIDI mapping
- Lyric support for vocal tracks
- `profiles/lilypond.mf.profile.json` - Lilypond profile

#### DAW Integration
- `docs/daw-integration.md` - Comprehensive DAW integration guide
- `profiles/ableton-live.mf.profile.json` - Ableton Live profile
- `profiles/logic-pro.mf.profile.json` - Logic Pro profile
- Documentation for Ableton, Logic, FL Studio, Reaper workflows

#### Error Message Improvements
- `src/suggestions.ts` - "Did you mean?" suggestion system
- Levenshtein distance-based similarity matching
- Suggestions for undefined symbols in error messages
- Built-in keyword, function, and stdlib candidate lists

#### CI/CD Pipeline
- `.github/workflows/ci.yml` - GitHub Actions workflow
- Multi-version Node.js testing (18.x, 20.x, 22.x)
- Separate jobs for core tests, MIDI renderer, MusicXML renderer, Lilypond renderer
- `.github/dependabot.yml` - Automated dependency updates

#### Documentation Expansion
- `docs/GETTING_STARTED.md` - Quick start guide for new users
- `docs/CLI.md` - Complete CLI reference with all commands
- `examples/tutorial_06_theory.mf` - Music theory library tutorial
- `examples/tutorial_07_arrangement.mf` - Advanced arrangement and song structure

#### Website Documentation Integration
- `website/src/components/Docs.tsx` - Integrated documentation viewer
- All docs (LANGUAGE, STDLIB, CLI, etc.) now viewable on website
- Full-text search across all documentation
- Japanese/English language support
- Tailwind Typography for markdown rendering

### Changed
- CLI help updated with new commands

## [3.2.0] - 2025-12-31

### Added

#### Test Infrastructure
- Comprehensive test suite with 182+ tests
- `src/__tests__/lexer.test.ts` - 61 tests for lexer/tokenization
- `src/__tests__/parser.test.ts` - 73 tests for AST generation
- `src/__tests__/typecheck.test.ts` - 23 tests for type checking
- `src/__tests__/evaluator.test.ts` - 18 tests for evaluation
- `src/__tests__/helpers/testUtils.ts` - Test utilities and helpers

#### Error Messages
- Rich Rust-style error formatting with ANSI colors
- Source code snippets in error output
- `src/cli/colors.ts` - ANSI color utilities
- `src/cli/sourceSnippet.ts` - Source snippet extraction
- `src/cli/richFormatter.ts` - Rich diagnostic formatting

#### LSP Server
- Language Server Protocol support for VSCode
- `src/lsp/server.ts` - LSP server implementation
- Real-time diagnostics as you type
- Hover information for functions and keywords
- Code completion for keywords, types, and stdlib
- Document symbols for navigation
- `mf lsp` CLI command to start the server
- Updated VSCode extension with language client

#### MIDI Renderer Plugin
- `tools/tako-render-midi/` - Standard MIDI file renderer
- Pure TypeScript MIDI writer (no external dependencies)
- Supports instruments, drums, tempo, meter
- General MIDI drum mapping
- Follows the TakoMusic Renderer Plugin Protocol

#### Web Playground
- `src/browser/index.ts` - Browser-compatible compiler entry
- `website/src/lib/compiler.ts` - Compiler integration for web
- Syntax validation in the browser
- IR structure preview

#### Tutorial Examples
- `examples/tutorial_01_basics.mf` - Basic concepts
- `examples/tutorial_02_functions.mf` - Functions and clips
- `examples/tutorial_03_drums.mf` - Drum patterns
- `examples/tutorial_04_vocal.mf` - Vocal synthesis
- `examples/tutorial_05_automation.mf` - Automation curves

### Changed
- VSCode extension version bumped to 3.2.0
- `mf check` now uses rich colored output
- Error handler uses rich formatting

## [3.1.0] - Previous Release
- v3 specification and docs refreshed
- v3 examples and profile filenames aligned to `.mf`
- Website copy updated for the v3 pipeline and std modules
