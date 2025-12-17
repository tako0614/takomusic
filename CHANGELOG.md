# Changelog

All notable changes to TakoMusic will be documented in this file.

## [1.1.0] - 2024-12-17

### Added

- **Watch Mode**: `mf build -w` now watches for file changes and auto-rebuilds
- **Build Timing**: Build command shows elapsed time and file count
- **Config Validation**: `mf doctor` validates mfconfig.toml and warns about unknown keys
- **Error Suggestions**: Errors now include helpful suggestions
  - Undefined symbols suggest similar names using Levenshtein distance
  - Error codes include context-specific help messages
- **Improved Error Format**: Rust-like error display with file:line:column and help text

### Changed

- Error messages now show in cleaner format:
  ```
  error[E400]: Undefined symbol: noot
    --> src/main.mf:5:10
    help: Did you mean: note?
  ```
- Check command shows error/warning summary count
- Doctor command validates config structure before checking dependencies

## [1.0.0] - 2024-12-17

### Added

- **Complete MFS Language**
  - Lexer with support for pitches, durations, time literals
  - Recursive descent parser for all language constructs
  - Interpreter with track state management and cursor positioning

- **Multi-format Export**
  - MIDI generator with proper tempo, time signature, and note events
  - MusicXML generator with `<sound tempo>` attribute for correct playback
  - VSQX generator with comprehensive Japanese phoneme mapping

- **Static Analysis (Checker)**
  - E050: Global function called after track started
  - E110: Pitch out of range validation
  - E200: Vocal note overlap detection
  - E210: Empty/missing lyric validation
  - E220: drum() in vocal track error
  - E221: chord() in vocal track error
  - E300: Top-level execution in imports
  - E310: Recursion detection
  - E400: Import/symbol/main validation
  - E401: For range constant check
  - W100: Short note duration warning
  - W110: Vocal range warning
  - W200: Too many tempo events warning

- **CLI Tools**
  - `mf init` - Project scaffolding
  - `mf build` - Compile to IR and output formats
  - `mf check` - Static analysis
  - `mf fmt` - Code formatting
  - `mf render` - External tool integration with timeout/cancellation
  - `mf doctor` - Configuration validation

- **Render Command Enhancements**
  - Timeout support (`-t, --timeout`)
  - Dry-run mode (`--dry-run`)
  - Graceful cancellation (Ctrl+C)
  - Progress reporting with step indicators
  - Elapsed time display

- **Module System**
  - Import/export support
  - Recursive module loading

- **External Tool Integration**
  - NEUTRINO vocal synthesis support
  - FluidSynth MIDI rendering support
  - FFmpeg audio mixing support

### Fixed

- MusicXML tempo not being read by NEUTRINO (added `<sound tempo>` attribute)
- Checker not recognizing variables inside function bodies
- Loop variables not added to scope during checking

## [0.1.0] - 2024-12-17

### Added

- Initial implementation of MFS language
- Basic lexer, parser, and interpreter
- MIDI, MusicXML, and VSQX generators
- CLI with init, build, check, fmt, render, doctor commands
- TOML-based configuration system
