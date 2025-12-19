# Changelog

All notable changes to TakoMusic will be documented in this file.

## [1.3.0] - 2024-12-20

### Added

- **Third Batch: Ornaments & Extended Notation**
  - `harmonic(pitch, type)` - Natural/artificial harmonics
  - `pedal(type, action)` - Piano sustain/sostenuto/una corda pedals
  - `pedalLine(type, dur)` - Pedal markings with duration
  - `swingEvent(amount, subdivision)` - Swing timing
  - `probabilityNote(pitch, dur, prob)` - Probability-based notes
  - `featheredBeam(accel)` - Feathered beams (accel/decel)
  - `quarterTone(direction)` - Quarter tone accidentals
  - `cluster(low, high, dur)` - Tone clusters
  - `sprechstimme(pitch, dur, lyric)` - Sprechstimme notation
  - `customNotehead(type, pitch)` - Custom notehead shapes
  - `bracketGroup(tracks, type)` - Score bracket groupings
  - `cueStaff(instrument, dur)` - Cue staff notation
  - `noteColor(color)` - Colored notes for analysis

- **Fourth Batch: Score Structure & Instrument Techniques**
  - `volta(number, text)`, `voltaEnd()` - Volta brackets
  - `cadenza(callback)` - Cadenza passages
  - `divisiMark(parts, method)` - Divisi markings
  - `metricModulation(from, to)` - Metric modulations
  - `conductorCue(text, beat)` - Conductor cues
  - `editorial(text, type)` - Editorial markings
  - `brassMute(type)` - Brass mute types (straight, cup, harmon, etc.)
  - `stringPosition(position)` - String playing positions
  - `multiphonic(pitches)` - Wind multiphonics
  - `electronicsCue(cueId, action, channel)` - Electronics/tape cues
  - `bendCurve(points)` - Custom guitar bend curves
  - `slideAdv(target, type)` - Advanced slide techniques
  - `tapAdv(pitch, hand)` - Two-hand tapping
  - `arrangerSection(name, color, length)` - DAW arranger sections
  - `chordTrack(chords)` - Global chord track
  - `scaleLockEvent(root, scale)` - Scale locking
  - `stepInput(enable)` - Step input mode
  - `measureComment(text)` - Measure comments
  - `versionCheckpoint(name)` - Version checkpoints

- **Fifth Batch: Diagrams, Synthesis & Video**
  - `chordDiagram(name, strings, frets)` - Guitar/ukulele chord diagrams
  - `scaleDiagram(name, root, intervals)` - Scale diagrams
  - `harpPedalDiagram(pedals)` - Harp pedal diagrams
  - `partExtraction(partId, name, transposition)` - Part extraction config
  - `transpositionDisplay(concert, written)` - Transposition display settings
  - `measureNumberConfig(show, interval, style)` - Measure number configuration
  - `wavetable(wt, position, morph)` - Wavetable synthesis
  - `fmSynth(algorithm, operators)` - FM synthesis (DX7-style)
  - `additiveSynth(partials)` - Additive synthesis
  - `subtractiveSynth(osc, filter)` - Subtractive synthesis
  - `physicalModel(model, params)` - Physical modeling synthesis
  - `formantShift(semitones)` - Formant shifting
  - `videoSync(path, startFrame, frameRate)` - Video synchronization
  - `hitPoint(timecode, desc, priority)` - Film scoring hit points
  - `timecodeDisplay(format, frameRate)` - Timecode display
  - `trackFolder(name, tracks)` - Track folders/grouping
  - `projectTemplate(name, settings)` - Project templates
  - `collaboratorSession(sessionId, host, port)` - Live collaboration sessions
  - `versionDiff(fromVersion, toVersion)` - Version comparison

### Changed

- README.md updated with comprehensive documentation for all new features
- Extended notation section expanded with modern notation techniques
- Added missing documentation for:
  - MIDI shortcuts: `expression`, `modulation`, `pan`, `volume`, `sustain`, `rpn`
  - Automation curves: `ccCurve`, `expressionCurve`, `pitchBendCurve`
  - Vocaloid shortcuts: `pit`, `dyn`, `bre`, `bri`, `cle`, `gen`, `ope`, `pitCurve`, `dynCurve`, `breCurve`
  - Vocaloid advanced: `phoneme`, `consonantOffset`, `autoBreath`, `portamentoShape`, `vocalStyle`, `noteEnvelope`, `tension`, `melisma`
  - Notation: `acciaccatura`, `appoggiatura`, `ottavaEnd`, `clef`, `key`, `fingering`, `multiRest`, `slashNotation`, `barline`, `tempoText`, `hideEmptyStaves`, `crossStaff`
  - Theory: `scaleChord`, `chordNotes`
  - Track: `advanceTick`
  - Articulations: `articulations` (stacked)
  - Slurs: `tie`
  - Dynamics: `crescendo`, `decrescendo` (aliases)
  - Vocaloid: `portamento`

## [1.2.0] - 2024-12-18

### Added

- **Advanced MIDI Events**
  - `cc(controller, value)` - MIDI Control Change messages
  - `pitchBend(value)` - Pitch bend (-8192 to 8191)
  - `aftertouch(value)` - Channel aftertouch (pressure)
  - `polyAftertouch(key, value)` - Polyphonic aftertouch
  - `nrpn(paramMSB, paramLSB, valueMSB, valueLSB)` - NRPN messages
  - `rpn(paramMSB, paramLSB, valueMSB, valueLSB)` - RPN messages
  - `sysex(bytes...)` - System Exclusive messages

- **Articulations**
  - `staccato()`, `legato()`, `accent()`, `tenuto()`, `marcato()`

- **Dynamics**
  - `ppp()`, `pp()`, `p()`, `mp()`, `mf()`, `f()`, `ff()`, `fff()`, `sfz()`, `fp()`
  - `cresc(endTick)`, `decresc(endTick)` - Hairpin dynamics

- **Tempo & Automation**
  - `tempoCurve(targetBpm, duration)` - Gradual tempo changes
  - `automateCC(controller, startVal, endVal, duration)` - CC automation
  - `automatePB(startVal, endVal, duration)` - Pitch bend automation

- **Timing Expressions**
  - `swing(amount)` - Swing feel (0.5 = straight, 0.67 = triplet swing)
  - `humanize(timing, velocity)` - Humanization
  - `quantize(grid)` - Quantization
  - `groove(template)` - Groove templates

- **Ornaments**
  - `trill(interval, speed)`, `mordent(upper)`, `turn()`, `tremolo(speed)`
  - `glissando(targetPitch, duration)`, `portamento(targetPitch, duration)`
  - `arpeggio(direction, speed)`

- **Music Theory Helpers**
  - `transpose(semitones, callback)` - Transpose a section
  - `invert(axisPitch, callback)` - Melodic inversion
  - `retrograde(callback)` - Reverse notes
  - `augment(factor, callback)`, `diminish(factor, callback)` - Time scaling

- **Slurs and Ties**
  - `slurStart()`, `slurEnd()` - Slur markings
  - `tieStart()`, `tieEnd()` - Tie markings

- **Vocaloid Parameters**
  - `vocaloidParam(param, value)` - Set Vocaloid parameters (DYN, BRE, BRI, CLE, GEN, POR, OPE)
  - `vibrato(depth, rate, delay)` - Vocaloid vibrato
  - `portamento(duration, mode)` - Portamento control
  - `growl(duration, intensity)` - Growl effect
  - `xsynth(voice1, voice2, balance)` - Cross-synthesis

- **Extended Notation**
  - `tuplet(actual, normal, type, callback)` - Tuplets
  - `triplet(callback)` - Shorthand for triplets
  - `grace(pitch, slash)` - Grace notes
  - `fermata(shape)` - Fermata markings
  - `ottava(shift, callback)` - Ottava lines (8va, 8vb, 15ma, 15mb)
  - `voice(number)` - Multiple voices per staff
  - `repeatStart()`, `repeatEnd()` - Repeat barlines
  - `dc()`, `ds()`, `fine()`, `coda()`, `segno()`, `toCoda()` - Navigation

- **Grand Staff & Tablature**
  - `grandStaff(upperClef, lowerClef, splitPoint)` - Piano grand staff
  - `tablature(strings, tuning, instrument)` - Guitar/bass tablature
  - `tabNote(string, fret, dur, technique)` - Tab notation

- **Chord Symbols & Figured Bass**
  - `chordSymbol(root, quality, bass, extensions...)` - Lead sheet chords
  - `figuredBass(figures...)` - Baroque figured bass

- **Markers & Cue Points**
  - `marker(name, color)` - Add markers
  - `cuePoint(name, action)` - Cue points (start/stop/loop)

- **Pattern Sequencer**
  - `pattern(id, length, callback)` - Define reusable patterns
  - `usePattern(id, repetitions)` - Use patterns

- **Audio Features**
  - `audioClip(file, duration, gain, pan)` - Import audio clips
  - `effect(type, params...)` - Add effects
  - `reverb(room, mix)`, `delay(time, feedback, mix)`
  - `eq(lowGain, midGain, highGain)`, `compressor(threshold, ratio, attack, release)`

- **New CLI Commands**
  - `mf play [file]` - Live preview using FluidSynth
    - `-s, --soundfont` - Specify SoundFont
    - `-l, --loop` - Loop playback
  - `mf import <file>` - Import MusicXML/MIDI to MFS
    - `-f, --format` - Specify format (musicxml, midi, auto)
    - `-o, --output` - Output file path
  - `mf record` - Record MIDI input from keyboard
    - `-t, --tempo` - Recording tempo
    - `-q, --quantize` - Quantize notes (4n, 8n, 16n, off)
    - `-d, --device` - MIDI input device
    - `-l, --list` - List MIDI devices

- **Project Templates**
  - `mf init -t <template>` - Initialize with template
  - Available templates: `default`, `piano`, `orchestral`, `edm`, `chiptune`, `jazz`, `vocaloid`, `minimal`
  - `mf init --list` - List available templates

- **MusicXML Import**
  - Automatic format detection
  - Preserves tempo, time signature, key signature
  - Converts notes, rests, chords
  - Handles articulations and dynamics
  - Generates clean MFS code

### Changed

- `mf init` now supports `-t, --template` option
- Help messages updated with new commands

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
