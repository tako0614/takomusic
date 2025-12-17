# TakoMusic

A domain-specific language (DSL) for music composition that generates VSQX, MusicXML, and MIDI files.

## Features

- **MFS Language**: Write music using a simple, readable syntax
- **Multi-format Export**: Generate VSQX (Vocaloid), MusicXML (notation), and MIDI (instruments)
- **Advanced MIDI**: CC, pitch bend, aftertouch, NRPN, SysEx, MPE support
- **Extended Notation**: Tuplets, grace notes, articulations, dynamics, ornaments
- **Vocaloid Support**: Full parameter control, vibrato, growl, cross-synthesis
- **Microtonality**: Custom tuning systems, cents deviation, quarter tones
- **Algorithmic Composition**: Euclidean rhythms, Markov chains, cellular automata, L-systems
- **Instrument Techniques**: String bowing, wind techniques, guitar bends, harp pedals
- **Live Performance**: MIDI mapping, scenes, live looping
- **Score Layout**: Page/system breaks, staff spacing, rehearsal marks, text annotations
- **Audio Effects**: Reverb, delay, EQ, compressor, phaser, flanger, chorus, distortion, filter, sidechain
- **Audio Manipulation**: Time stretch, pitch shift, sample slicing, granular synthesis
- **Advanced Automation**: Bezier curves, LFO modulation, envelope followers, modulation matrix
- **Mixing/Mastering**: Bus routing, sends, limiter, maximizer, multiband compression, spatial audio (5.1, 7.1, Atmos)
- **MIDI Extensions**: MPE, arpeggiator patterns, chord memory/triggers
- **Advanced Notation**: Additive time signatures, polymetric, proportional, graphic, aleatoric notation
- **Sampling**: Multi-sample instruments, round robin, velocity layers, key switches
- **Analysis**: Spectrum analyzer, loudness meter (LUFS), phase correlation
- **Advanced Audio Processing**: Vocoder, convolution reverb, amp/cabinet simulation, tape saturation, transient shaper, de-esser, exciter, noise reduction, spectral editing
- **Sequencing Extensions**: Step sequencer, follow actions, scale/chord lock, divisi, expression maps
- **Sync & Communication**: OSC, network MIDI (RTP-MIDI), MIDI clock, timecode (MTC/SMPTE)
- **Mastering**: Dithering, loudness matching, reference track comparison
- **Metadata**: ID3 tags, ISRC codes, song structure markers
- **Audio Editing**: Freeze, warp, beat slicing, spectral repair, audio restoration, vocal alignment
- **Dynamics Processing**: Mid/side, dynamic EQ, linear phase EQ, parallel processing
- **Recording**: Take lanes, comping, punch in/out, loop recording, automation recording
- **Groove & Humanize**: Groove templates, humanization, randomization
- **Controller & Macro**: MIDI learn, macro controls with mappings
- **Export & Batch**: Stem export, batch processing, export presets
- **Atmos/Spatial**: Object-based audio, headphone virtualization, surround automation
- **Collaboration**: Project notes, collaborator management
- **Module System**: Organize code with imports/exports
- **Project Templates**: Quick start with piano, orchestral, EDM, jazz, and more
- **CLI Tools**: Build, check, format, play, import, record, and render
- **External Tool Integration**: NEUTRINO, FluidSynth, FFmpeg support

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Create a new project

```bash
mf init myproject           # Default template
mf init myproject -t piano  # Piano template
mf init --list              # List all templates
```

### 2. Edit src/main.mf

```mfs
export proc main() {
  title("My First Song");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  // Vocal track with dynamics
  track(vocal, v1, { engine: "piapro", voice: "miku" }) {
    at(1:1);
    mf();
    n(C4, 4n, "ド"); n(D4, 4n, "レ");
    n(E4, 4n, "ミ"); n(F4, 4n, "ファ");
  }

  // Piano with articulations
  track(midi, piano, { ch: 1, program: 0 }) {
    at(1:1);
    legato();
    chord([C4, E4, G4], 1n);
  }

  // Drums
  track(midi, drums, { ch: 10, vel: 100 }) {
    at(1:1);
    drum(kick, 4n); drum(hhc, 4n);
    drum(snare, 4n); drum(hhc, 4n);
  }
}
```

### 3. Build and play

```bash
mf check              # Check for errors
mf build              # Generate MIDI, MusicXML, VSQX
mf play               # Live preview with FluidSynth
mf render -p cli      # Render audio
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `mf init [dir]` | Initialize new project |
| `mf build` | Compile to IR and output formats |
| `mf check` | Static analysis |
| `mf fmt` | Format source files |
| `mf play [file]` | Live preview with FluidSynth |
| `mf import <file>` | Import MusicXML to MFS |
| `mf record` | Record MIDI input |
| `mf render -p <profile>` | Render audio |
| `mf doctor` | Check dependencies |

### mf init

```bash
mf init                    # Create in current directory
mf init myproject          # Create new directory
mf init -t piano           # Use piano template
mf init -t orchestral      # Use orchestral template
mf init --list             # List templates
```

**Available Templates:**
- `default` - Basic vocal and drum tracks
- `piano` - Piano solo with grand staff
- `orchestral` - Full orchestra (strings, brass, timpani)
- `edm` - Electronic dance music
- `chiptune` - 8-bit style music
- `jazz` - Jazz combo with swing
- `vocaloid` - Vocaloid song structure
- `minimal` - Empty project

### mf play

```bash
mf play                    # Play main source
mf play src/demo.mf        # Play specific file
mf play -s soundfont.sf2   # Use specific SoundFont
mf play -l                 # Loop playback
```

### mf import

```bash
mf import song.xml              # Import MusicXML
mf import score.musicxml -o out.mf  # Specify output
```

### mf record

```bash
mf record                  # Start recording
mf record -t 100           # Set tempo to 100 BPM
mf record -q 8n            # Quantize to eighth notes
mf record -l               # List MIDI devices
```

## Language Reference

### Global Functions

| Function | Description | Example |
|----------|-------------|---------|
| `title(name)` | Set song title | `title("My Song")` |
| `ppq(value)` | Pulses per quarter note | `ppq(480)` |
| `tempo(bpm)` | Set tempo | `tempo(128)` |
| `timeSig(num, den)` | Time signature | `timeSig(4, 4)` |
| `tempoCurve(target, dur)` | Gradual tempo change | `tempoCurve(140, 4n)` |

### Track Functions

| Function | Description | Example |
|----------|-------------|---------|
| `track(kind, name, opts)` | Create track | `track(vocal, v1, {})` |
| `at(time)` | Set cursor position | `at(1:1)` |
| `atTick(tick)` | Set cursor by tick | `atTick(1920)` |
| `advance(dur)` | Move cursor forward | `advance(4n)` |

### Note Functions

| Function | Description | Example |
|----------|-------------|---------|
| `n(pitch, dur, [lyric])` | Add note | `n(C4, 4n, "あ")` |
| `note(pitch, dur, [lyric])` | Add note (alias) | `note(C4, 4n)` |
| `r(dur)` | Add rest | `r(8n)` |
| `rest(dur)` | Add rest (alias) | `rest(4n)` |
| `chord(pitches, dur)` | Add chord | `chord([C4, E4, G4], 2n)` |
| `drum(name, dur, [vel])` | Add drum hit | `drum(kick, 4n, 100)` |

### Dynamics

| Function | Description |
|----------|-------------|
| `ppp()`, `pp()`, `p()` | Pianissimo to piano |
| `mp()`, `mf()` | Mezzo piano/forte |
| `f()`, `ff()`, `fff()` | Forte to fortissimo |
| `sfz()`, `fp()` | Sforzando, forte-piano |
| `cresc(endTick)` | Crescendo |
| `decresc(endTick)` | Decrescendo |

### Articulations

| Function | Description |
|----------|-------------|
| `staccato()` | Short, detached |
| `legato()` | Smooth, connected |
| `accent()` | Emphasized |
| `tenuto()` | Held full value |
| `marcato()` | Strongly accented |

### MIDI Control

| Function | Description | Example |
|----------|-------------|---------|
| `cc(ctrl, val)` | Control Change | `cc(1, 64)` |
| `pitchBend(val)` | Pitch bend | `pitchBend(4096)` |
| `aftertouch(val)` | Channel pressure | `aftertouch(100)` |
| `polyAftertouch(key, val)` | Poly pressure | `polyAftertouch(60, 80)` |
| `nrpn(pMSB, pLSB, vMSB, vLSB)` | NRPN | `nrpn(0, 1, 64, 0)` |
| `sysex(bytes...)` | System Exclusive | `sysex(0x41, 0x10)` |

### Automation

| Function | Description | Example |
|----------|-------------|---------|
| `automateCC(ctrl, start, end, dur)` | CC automation | `automateCC(11, 0, 127, 1n)` |
| `automatePB(start, end, dur)` | Pitch bend automation | `automatePB(0, 8191, 2n)` |

### Timing

| Function | Description | Example |
|----------|-------------|---------|
| `swing(amount)` | Swing feel | `swing(0.67)` |
| `humanize(time, vel)` | Humanization | `humanize(10, 5)` |
| `quantize(grid)` | Quantize notes | `quantize(16n)` |
| `groove(template)` | Apply groove | `groove("shuffle")` |

### Ornaments

| Function | Description | Example |
|----------|-------------|---------|
| `trill(interval, speed)` | Trill | `trill(2, 32n)` |
| `mordent(upper)` | Mordent | `mordent(true)` |
| `turn()` | Turn | `turn()` |
| `tremolo(speed)` | Tremolo | `tremolo(32n)` |
| `glissando(target, dur)` | Glissando | `glissando(C5, 8n)` |
| `arpeggio(dir, speed)` | Arpeggio | `arpeggio("up", 32n)` |

### Theory Helpers

| Function | Description | Example |
|----------|-------------|---------|
| `transpose(semi, cb)` | Transpose | `transpose(12, { ... })` |
| `invert(axis, cb)` | Inversion | `invert(C4, { ... })` |
| `retrograde(cb)` | Reverse | `retrograde({ ... })` |
| `augment(factor, cb)` | Augmentation | `augment(2, { ... })` |
| `diminish(factor, cb)` | Diminution | `diminish(0.5, { ... })` |

### Notation

| Function | Description | Example |
|----------|-------------|---------|
| `tuplet(actual, normal, type, cb)` | Tuplet | `tuplet(3, 2, "8n", {...})` |
| `triplet(cb)` | Triplet shorthand | `triplet({ n(C4, 8n); ... })` |
| `grace(pitch, slash)` | Grace note | `grace(D4, true)` |
| `fermata(shape)` | Fermata | `fermata("normal")` |
| `ottava(shift, cb)` | Ottava | `ottava(8, { ... })` |
| `voice(num)` | Voice number | `voice(2)` |

### Repeats & Navigation

| Function | Description |
|----------|-------------|
| `repeatStart()` | Start repeat |
| `repeatEnd()` | End repeat |
| `dc()` | Da Capo |
| `ds()` | Dal Segno |
| `fine()` | Fine |
| `coda()` | Coda |
| `segno()` | Segno |
| `toCoda()` | To Coda |

### Slurs & Ties

| Function | Description |
|----------|-------------|
| `slurStart()` | Begin slur |
| `slurEnd()` | End slur |
| `tieStart()` | Begin tie |
| `tieEnd()` | End tie |

### Grand Staff & Tablature

| Function | Description | Example |
|----------|-------------|---------|
| `grandStaff(upper, lower, split)` | Piano staff | `grandStaff("treble", "bass", 60)` |
| `tablature(strings, tuning, inst)` | Tab notation | `tablature(6, [40,45,50,55,59,64], "guitar")` |
| `tabNote(string, fret, dur)` | Tab note | `tabNote(1, 5, 4n)` |

### Chord Symbols & Figured Bass

| Function | Description | Example |
|----------|-------------|---------|
| `chordSymbol(root, qual, bass)` | Chord symbol | `chordSymbol("C", "maj7", "E")` |
| `figuredBass(figures...)` | Figured bass | `figuredBass("6", "4", "3")` |

### Markers & Patterns

| Function | Description | Example |
|----------|-------------|---------|
| `marker(name, color)` | Add marker | `marker("Chorus", "#ff0000")` |
| `cuePoint(name, action)` | Cue point | `cuePoint("Loop", "start")` |
| `pattern(id, len, cb)` | Define pattern | `pattern("verse", 1920, {...})` |
| `usePattern(id, reps)` | Use pattern | `usePattern("verse", 4)` |

### Audio & Effects

| Function | Description | Example |
|----------|-------------|---------|
| `audioClip(file, dur, gain, pan)` | Import audio | `audioClip("vocal.wav", 1920)` |
| `effect(type, params...)` | Add effect | `effect("reverb", ...)` |
| `reverb(room, mix)` | Reverb | `reverb(0.8, 0.3)` |
| `delay(time, fb, mix)` | Delay | `delay(250, 0.4, 0.25)` |
| `eq(low, mid, high)` | EQ | `eq(3, 0, -2)` |
| `compressor(thresh, ratio)` | Compressor | `compressor(-20, 4)` |
| `phaser(rate, depth, feedback)` | Phaser | `phaser(0.5, 50, 60)` |
| `flanger(rate, depth, feedback)` | Flanger | `flanger(0.3, 40, 50)` |
| `chorus(rate, depth, mix)` | Chorus | `chorus(1.0, 30, 50)` |
| `distortion(type, drive, tone)` | Distortion | `distortion("overdrive", 60, 50)` |
| `filter(type, freq, resonance)` | Filter | `filter("lowpass", 2000, 0.7)` |
| `sidechain(source, ratio, attack, release)` | Sidechain | `sidechain("kick", 4, 10, 100)` |

### Microtonality & Tuning

| Function | Description | Example |
|----------|-------------|---------|
| `tuning(system)` | Set tuning system | `tuning("just")` |
| `cents(deviation)` | Cents deviation for next note | `cents(50)` |
| `quarterTone(direction)` | Quarter tone modifier | `quarterTone("sharp")` |
| `pitchCorrection(speed, strength)` | Pitch correction | `pitchCorrection(50, 80)` |

**Tuning Systems:** `equal`, `just`, `pythagorean`, `meantone`, `werckmeister`, `custom`

### Algorithmic Composition

| Function | Description | Example |
|----------|-------------|---------|
| `euclidean(pulses, steps, rotation)` | Euclidean rhythm | `euclidean(5, 8, 0)` |
| `probability(pitch, dur, prob)` | Probability note | `probability(C4, 4n, 0.7)` |
| `markov(stateMap, startState)` | Markov chain | `markov({...}, "A")` |
| `randomSeed(seed)` | Set random seed | `randomSeed(12345)` |
| `randomNote(minPitch, maxPitch, dur)` | Random pitch | `randomNote(C3, C5, 4n)` |
| `randomRhythm(pitches, durs, count)` | Random rhythm | `randomRhythm([C4, E4], [4n, 8n], 8)` |
| `constraint(rule)` | Add constraint | `constraint("noParallelFifths")` |
| `cellular(rule, steps, seed)` | Cellular automata | `cellular(110, 16, "10101")` |
| `lsystem(axiom, rules, iterations)` | L-system | `lsystem("A", {"A": "AB"}, 3)` |

### Advanced Notation

| Function | Description | Example |
|----------|-------------|---------|
| `verse(verseNum, text)` | Multi-verse lyrics | `verse(2, "second verse")` |
| `ossia(callback)` | Ossia passage | `ossia(altMelody())` |
| `cueNote(pitch, dur, instrument)` | Cue note | `cueNote(C4, 4n, "flute")` |
| `instrumentChange(name)` | Instrument change | `instrumentChange("muted trumpet")` |
| `notehead(type, pitch)` | Custom notehead | `notehead("x", C4)` |

**Notehead Types:** `normal`, `x`, `diamond`, `triangle`, `slash`, `cross`, `circle-x`

### String Techniques

| Function | Description |
|----------|-------------|
| `bowUp()` | Up bow |
| `bowDown()` | Down bow |
| `pizz()` | Pizzicato |
| `arco()` | Arco (bow) |
| `colLegno()` | Col legno |
| `sulPont()` | Sul ponticello |
| `sulTasto()` | Sul tasto |
| `snapPizz()` | Snap (Bartok) pizzicato |
| `harmonics()` | Natural harmonics |

### Wind & Brass Techniques

| Function | Description |
|----------|-------------|
| `breath()` | Breath mark |
| `mute()` | Muted |
| `open()` | Open (unmuted) |
| `stopped()` | Stopped horn |
| `flutter()` | Flutter tongue |
| `doubleTongue()` | Double tongue |
| `tripleTongue()` | Triple tongue |

### Guitar Techniques

| Function | Description | Example |
|----------|-------------|---------|
| `bend(pitch, dur)` | Bend | `bend(D4, 8n)` |
| `hammerOn(pitch, dur)` | Hammer-on | `hammerOn(E4, 8n)` |
| `pullOff(pitch, dur)` | Pull-off | `pullOff(D4, 8n)` |
| `slide(pitch, dur)` | Slide | `slide(G4, 8n)` |
| `tap(pitch, dur)` | Tap | `tap(C5, 8n)` |
| `naturalHarmonic(fret, string)` | Natural harmonic | `naturalHarmonic(12, 1)` |
| `artificialHarmonic(fret, string)` | Artificial harmonic | `artificialHarmonic(5, 2)` |
| `palmMute()` | Palm mute |
| `letRing()` | Let ring |
| `harpPedal(pedals...)` | Harp pedal diagram | `harpPedal("D#", "C", "B")` |

### Live Performance

| Function | Description | Example |
|----------|-------------|---------|
| `midiMap(cc, param, min, max)` | MIDI CC mapping | `midiMap(1, "filter", 0, 127)` |
| `scene(name, clips...)` | Define scene | `scene("verse", {...})` |
| `launchScene(name)` | Launch scene | `launchScene("verse")` |
| `liveLoop(name, len, callback)` | Live loop | `liveLoop("drums", 1920, drumPattern())` |

### Score Layout

| Function | Description | Example |
|----------|-------------|---------|
| `pageBreak()` | Force page break |
| `systemBreak()` | Force system break |
| `staffSpacing(value)` | Staff spacing | `staffSpacing(12)` |
| `text(content, placement)` | Text annotation | `text("Solo", "above")` |
| `rehearsalMark(label)` | Rehearsal mark | `rehearsalMark("A")` |
| `direction(text)` | Direction text | `direction("rit.")` |

### Audio Manipulation

| Function | Description | Example |
|----------|-------------|---------|
| `timeStretch(clip, ratio, preservePitch)` | Time stretch | `timeStretch("vocal", 0.5, true)` |
| `pitchShift(clip, semi, cents)` | Pitch shift | `pitchShift("vocal", 12, 0)` |
| `sampleSlicer(clip, mode)` | Slice samples | `sampleSlicer("drums", "transient")` |
| `granular(clip, grainSize, density)` | Granular synthesis | `granular("pad", 50, 20)` |

### Advanced Automation

| Function | Description | Example |
|----------|-------------|---------|
| `automationLane(param)` | Create automation lane | `automationLane("volume")` |
| `automationPoint(param, value, curve)` | Add automation point | `automationPoint("volume", 0.8, "bezier")` |
| `lfo(target, waveform, rate, depth)` | LFO modulation | `lfo("filter", "sine", 2, 50)` |
| `envelopeFollower(source, target, attack, release)` | Envelope follower | `envelopeFollower("kick", "filter", 10, 100)` |
| `modMatrix(source, dest, amount)` | Modulation matrix | `modMatrix("velocity", "filter", 50)` |

**Automation Curves:** `linear`, `exponential`, `logarithmic`, `bezier`, `step`, `s-curve`

### Mixing & Mastering

| Function | Description | Example |
|----------|-------------|---------|
| `bus(name, type)` | Create bus | `bus("drums", "aux")` |
| `send(toBus, amount, preFader)` | Send effect | `send("reverb", 50, false)` |
| `stereoWidth(width)` | Stereo width | `stereoWidth(150)` |
| `limiter(threshold, ceiling)` | Limiter | `limiter(-3, -0.1)` |
| `maximizer(threshold, ceiling)` | Maximizer | `maximizer(-6, -0.1)` |
| `multibandComp(low, high, thresh, ratio)` | Multiband compressor | `multibandComp(200, 2000, -20, 4)` |
| `spatial(format, x, y, z)` | Spatial audio | `spatial("5.1", 0.5, 0, 0)` |
| `surroundPan(L, R, C, LFE, Ls, Rs)` | Surround panning | `surroundPan(1, 1, 0.5, 0, 0.7, 0.7)` |

**Spatial Formats:** `stereo`, `5.1`, `7.1`, `atmos`, `binaural`, `ambisonic-1`, `ambisonic-2`, `ambisonic-3`

### MIDI Extensions

| Function | Description | Example |
|----------|-------------|---------|
| `mpe(masterCh, memberChs, bendRange)` | Configure MPE | `mpe(1, 15, 48)` |
| `mpeNote(pitch, dur, slide, pressure)` | MPE note | `mpeNote(C4, 4n, 64, 100)` |
| `arpeggiator(mode, rate, octaves, gate)` | Arpeggiator | `arpeggiator("up", "16n", 2, 75)` |
| `chordMemory(trigger, chord)` | Chord memory | `chordMemory(C2, [C4, E4, G4])` |
| `chordTrigger(root, type, voicing)` | Chord trigger | `chordTrigger(C4, "maj7", "drop2")` |

**Arpeggiator Modes:** `up`, `down`, `up-down`, `down-up`, `random`, `order`, `chord`

### Advanced Notation (Extended)

| Function | Description | Example |
|----------|-------------|---------|
| `additiveTimeSig(groups, denom)` | Additive time sig | `additiveTimeSig([3, 2, 2], 8)` |
| `polymetric(dur)` | Polymetric section | `polymetric(4n)` |
| `proportional(dur, spacing)` | Proportional notation | `proportional(1n, 10)` |
| `graphic(shape, dur, desc)` | Graphic notation | `graphic("curve", 2n, "glissando")` |
| `aleatoric(dur, instructions)` | Aleatoric box | `aleatoric(4n, "improvise freely")` |
| `cutaway(trackId, dur)` | Cutaway score | `cutaway("flute", 2n)` |
| `transposing(semitones)` | Transposing instrument | `transposing(-2)` |

**Graphic Shapes:** `line`, `curve`, `cluster`, `box`, `arrow`, `custom`

### Sampling

| Function | Description | Example |
|----------|-------------|---------|
| `sampler(name)` | Create sampler | `sampler("piano")` |
| `sampleZone(file, root, low, high)` | Add sample zone | `sampleZone("C4.wav", C4, C3, C5)` |
| `roundRobin(mode)` | Round robin group | `roundRobin("cycle")` |
| `velocityLayer(low, high, crossfade)` | Velocity layer | `velocityLayer(1, 64, 10)` |
| `keySwitch(trigger, articulation)` | Key switch | `keySwitch(C0, "staccato")` |

**Round Robin Modes:** `cycle`, `random`, `random-no-repeat`

### Analysis

| Function | Description | Example |
|----------|-------------|---------|
| `spectrumAnalyzer(fftSize, scale)` | Spectrum analyzer | `spectrumAnalyzer(2048, "logarithmic")` |
| `loudnessMeter(standard, targetLUFS)` | Loudness meter | `loudnessMeter("EBU-R128", -14)` |
| `phaseMeter(displayMode)` | Phase correlation | `phaseMeter("goniometer")` |
| `analyzerSnapshot()` | Take snapshot | `analyzerSnapshot()` |

**Loudness Standards:** `EBU-R128`, `ATSC-A85`, `BS.1770`

### Advanced Audio Processing

| Function | Description | Example |
|----------|-------------|---------|
| `vocoder(carrier, bands, formantShift)` | Vocoder effect | `vocoder("synth", 16, 0)` |
| `convolutionReverb(irFile, predelay, decay, mix)` | Convolution reverb | `convolutionReverb("hall.wav", 10, 100, 30)` |
| `ampSim(type, gain, master)` | Amp simulator | `ampSim("high-gain", 70, 50)` |
| `cabinetSim(cab, mic, position)` | Cabinet simulator | `cabinetSim("4x12", "dynamic", "on-axis")` |
| `tapeSaturation(type, saturation, gain)` | Tape saturation | `tapeSaturation("15ips", 50, 0)` |
| `transientShaper(attack, sustain, gain)` | Transient shaper | `transientShaper(20, -10, 0)` |
| `deEsser(freq, threshold, ratio)` | De-esser | `deEsser(6000, -20, 4)` |
| `exciter(freq, harmonics, mix, mode)` | Exciter/enhancer | `exciter(3000, 50, 30, "tube")` |
| `noiseReduction(threshold, reduction, mode)` | Noise reduction | `noiseReduction(-40, 20, "spectral")` |
| `spectralEdit(lowFreq, highFreq, dur, operation)` | Spectral editing | `spectralEdit(100, 500, 2n, "cut")` |

**Amp Types:** `clean`, `crunch`, `high-gain`, `bass`, `acoustic`
**Cabinet Types:** `1x12`, `2x12`, `4x12`, `1x15`, `8x10`
**Tape Types:** `15ips`, `30ips`, `cassette`
**Noise Reduction Modes:** `broadband`, `spectral`, `adaptive`

### Sequencing Extensions

| Function | Description | Example |
|----------|-------------|---------|
| `stepSequencer(id, steps, rate, direction)` | Create step sequencer | `stepSequencer("bass", 16, "16n", "forward")` |
| `step(num, note, vel, gate, prob)` | Add step to sequencer | `step(1, C3, 100, 80, 100)` |
| `followAction(clipId, action, probability, time)` | Follow action | `followAction("clip1", "next", 100, 0)` |
| `scaleLock(root, scale, mode)` | Lock to scale | `scaleLock(0, "minor", "nearest")` |
| `chordLock(root, type, voicing)` | Lock to chord | `chordLock(0, "maj7", "close")` |
| `divisi(parts, dur, method)` | Divisi section | `divisi(2, 4n, "top-down")` |
| `expressionMap(id, name)` | Create expression map | `expressionMap("strings", "Strings")` |
| `articulation(name, keyswitch, programChange)` | Add articulation mapping | `articulation("pizzicato", C0, 48)` |

**Follow Actions:** `next`, `previous`, `first`, `last`, `any`, `other`, `jump`
**Scale Types:** `major`, `minor`, `harmonic-minor`, `melodic-minor`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `locrian`, `pentatonic-major`, `pentatonic-minor`, `blues`, `whole-tone`, `diminished`, `chromatic`
**Sequencer Directions:** `forward`, `backward`, `pingpong`, `random`

### Sync & Communication

| Function | Description | Example |
|----------|-------------|---------|
| `osc(sendPort, receivePort, host)` | Configure OSC | `osc(8000, 9000, "127.0.0.1")` |
| `oscMap(address, target, min, max)` | Map OSC to parameter | `oscMap("/fader1", "volume", 0, 127)` |
| `networkMidi(sessionName, port, protocol)` | Network MIDI | `networkMidi("TakoMusic", 5004, "rtp-midi")` |
| `midiClock(mode, outputPort)` | MIDI clock sync | `midiClock("master", "IAC Driver")` |
| `timecode(format, frameRate, mode, offset)` | Timecode config | `timecode("mtc", 30, "generate", "00:00:00:00")` |

**Timecode Formats:** `mtc`, `smpte`
**Frame Rates:** `24`, `25`, `29.97`, `30`
**MIDI Clock Modes:** `master`, `slave`
**Network MIDI Protocols:** `rtp-midi`, `ipMIDI`

### Mastering

| Function | Description | Example |
|----------|-------------|---------|
| `dithering(bitDepth, noiseShaping, type)` | Dithering | `dithering(16, "pow-r", "triangular")` |
| `loudnessMatch(targetLUFS, maxTruePeak, algorithm)` | Loudness matching | `loudnessMatch(-14, -1, "lufs")` |
| `referenceTrack(filePath, gain)` | Reference track | `referenceTrack("reference.wav", 0)` |

**Dithering Types:** `rectangular`, `triangular`, `gaussian`
**Noise Shaping:** `none`, `hpf`, `f-weighted`, `modified-e-weighted`, `pow-r`
**Loudness Algorithms:** `peak`, `rms`, `lufs`

### Metadata

| Function | Description | Example |
|----------|-------------|---------|
| `id3(field, value)` | Set ID3 metadata | `id3("title", "My Song")` |
| `isrc(code, trackId)` | ISRC code | `isrc("US-S1Z-99-00001")` |
| `songStructure(section, label, color)` | Song structure marker | `songStructure("verse", "Verse 1", "#FF0000")` |

**ID3 Fields:** `title`, `artist`, `album`, `year`, `track`, `genre`, `comment`, `composer`, `albumArtist`, `discNumber`, `bpm`, `key`, `copyright`, `encodedBy`, `artwork`
**Song Sections:** `intro`, `verse`, `pre-chorus`, `chorus`, `post-chorus`, `bridge`, `breakdown`, `buildup`, `drop`, `outro`, `solo`, `custom`

### Audio Editing & Restoration

| Function | Description | Example |
|----------|-------------|---------|
| `freeze(dur)` | Freeze track to audio | `freeze(4n)` |
| `audioWarp(clipId, mode, quantize)` | Warp audio to grid | `audioWarp("clip1", "beats", 100)` |
| `warpMarker(clipId, original, warped)` | Add warp marker | `warpMarker("clip1", 44100, 48000)` |
| `beatSlice(clipId, sensitivity, minLen)` | Slice at transients | `beatSlice("clip1", 50, 50)` |
| `spectralRepair(lowFreq, highFreq, dur, type)` | Spectral repair | `spectralRepair(100, 500, 2n, "attenuate")` |
| `audioRestore(mode, threshold, strength)` | Audio restoration | `audioRestore("declip", -20, 50)` |
| `vocalAlign(refTrack, alignTrack, tightness)` | Align vocals | `vocalAlign("lead", "double", 80)` |

**Warp Modes:** `beats`, `tonal`, `texture`, `repitch`, `complex`
**Restoration Modes:** `declip`, `decrackle`, `dehum`, `denoise`, `declick`
**Repair Types:** `attenuate`, `replace`, `pattern`, `interpolate`

### Dynamics Processing (Extended)

| Function | Description | Example |
|----------|-------------|---------|
| `midSide(mode, midGain, sideGain, width)` | M/S processing | `midSide("process", 0, -3, 120)` |
| `dynamicEQ()` | Create dynamic EQ | `dynamicEQ()` |
| `dynamicEQBand(freq, gain, q, thresh, ratio)` | Add dynamic band | `dynamicEQBand(3000, 0, 2, -20, 4)` |
| `linearPhaseEQ(latency)` | Linear phase EQ | `linearPhaseEQ("medium")` |
| `eqBand(freq, gain, q, type)` | Add EQ band | `eqBand(100, -3, 0.7, "lowshelf")` |
| `parallel(dry, wet, phase)` | Parallel processing | `parallel(50, 50, "normal")` |

**M/S Modes:** `encode`, `decode`, `process`
**EQ Latency:** `low`, `medium`, `high`, `maximum`
**EQ Band Types:** `lowshelf`, `highshelf`, `peak`, `lowpass`, `highpass`, `notch`

### Recording

| Function | Description | Example |
|----------|-------------|---------|
| `takeLane()` | Create take lane | `takeLane()` |
| `take(name, rating)` | Add take | `take("Take 3", 4)` |
| `comp(takeId, dur, fadeIn, fadeOut)` | Comp region | `comp("take_1", 4n, 48, 48)` |
| `punchIn(preroll)` | Punch in point | `punchIn(1)` |
| `punchOut(postroll)` | Punch out point | `punchOut(1)` |
| `loopRecord(dur, mode, countIn)` | Loop recording | `loopRecord(4n, "takes", 1)` |
| `automationRecord(param, mode)` | Record automation | `automationRecord("volume", "touch")` |

**Loop Record Modes:** `replace`, `overdub`, `takes`
**Automation Modes:** `touch`, `latch`, `write`, `trim`

### Groove & Humanize

| Function | Description | Example |
|----------|-------------|---------|
| `groove(id, name, quantize)` | Create groove template | `groove("swing16", "16th Swing", 75)` |
| `applyGroove(grooveId)` | Apply groove | `applyGroove("swing16")` |
| `humanizeRegion(dur, timing, vel, durRange)` | Humanize region | `humanizeRegion(4n, 10, 10, 5)` |
| `randomize(param, min, max, dist, prob)` | Randomize parameter | `randomize("velocity", -10, 10, "gaussian", 100)` |

**Randomize Parameters:** `pitch`, `velocity`, `timing`, `duration`, `pan`
**Distributions:** `uniform`, `gaussian`, `weighted`

### Controller & Macro

| Function | Description | Example |
|----------|-------------|---------|
| `midiLearn(id, type, target, ch, num)` | MIDI learn | `midiLearn("fader1", "cc", "volume", 1, 7)` |
| `macro(id, name, value)` | Create macro | `macro("filter", "Filter Sweep", 64)` |
| `macroMap(target, min, max, curve)` | Map macro | `macroMap("cutoff", 20, 20000, "logarithmic")` |

**Control Types:** `cc`, `note`, `pitchbend`, `aftertouch`
**Curves:** `linear`, `logarithmic`, `exponential`, `step`

### Export & Batch Processing

| Function | Description | Example |
|----------|-------------|---------|
| `stemExport(name, tracks, format, bits, rate)` | Export stems | `stemExport("drums", ["kick", "snare"], "wav", 24, 48000)` |
| `batch(inputPattern, outputPattern)` | Batch process | `batch("*.wav", "processed/*.wav")` |
| `batchOp(type)` | Add batch operation | `batchOp("normalize")` |
| `exportPreset(id, name, format, rate, channels)` | Export preset | `exportPreset("master", "Master WAV", "wav", 48000, "stereo")` |

**Formats:** `wav`, `aiff`, `flac`, `mp3`, `ogg`, `aac`
**Batch Operations:** `normalize`, `convert`, `trim`, `fade`, `loudness`

### Atmos/Spatial Extensions

| Function | Description | Example |
|----------|-------------|---------|
| `atmosObject(id, name, x, y, z)` | Create Atmos object | `atmosObject("vocal", "Lead Vocal", 0, 0, 0.5)` |
| `atmosMove(x, y, z, size)` | Automate object | `atmosMove(0.5, 0.2, 0.8)` |
| `headphoneVirtual(profile, room, dist, angle)` | Headphone virtualization | `headphoneVirtual("generic", 50, 50, 0)` |
| `surroundAuto(pattern, speed, width)` | Surround automation | `surroundAuto("circle", 0.5, 100)` |

**HRTF Profiles:** `generic`, `small`, `medium`, `large`, `custom`
**Surround Patterns:** `circle`, `figure8`, `random`, `custom`

### Collaboration

| Function | Description | Example |
|----------|-------------|---------|
| `note(text, author)` | Add project note | `note("Check this section", "Producer")` |
| `collaborator(name, role, email, color)` | Add collaborator | `collaborator("John", "editor", "john@email.com", "#FF0000")` |

**Roles:** `owner`, `editor`, `viewer`

### Vocaloid Parameters

| Function | Description | Example |
|----------|-------------|---------|
| `vocaloidParam(param, val)` | Set parameter | `vocaloidParam("DYN", 100)` |
| `vibrato(depth, rate, delay)` | Vibrato | `vibrato(50, 60, 30)` |
| `growl(dur, intensity)` | Growl | `growl(480, 80)` |
| `xsynth(v1, v2, balance)` | Cross-synthesis | `xsynth("miku", "rin", 64)` |

### Pitch & Duration Literals

**Pitches:**
- Natural: `C4`, `D4`, `E4`, `F4`, `G4`, `A4`, `B4`
- Sharp: `C#4`, `D#4`, `F#4`, `G#4`, `A#4`
- Flat: `Db4`, `Eb4`, `Gb4`, `Ab4`, `Bb4`

**Durations:**
- `1n` = whole, `2n` = half, `4n` = quarter
- `8n` = eighth, `16n` = sixteenth, `32n` = thirty-second
- `4n.` = dotted quarter, `8n.` = dotted eighth
- `480t` = 480 ticks

**Time:**
- `1:1` = bar 1, beat 1
- `2:3` = bar 2, beat 3
- `1:1:240` = bar 1, beat 1, tick 240

### Drum Names

`kick`, `snare`, `hhc` (hi-hat closed), `hho` (hi-hat open), `tom1`, `crash`, `ride`

## Control Structures

```mfs
// Procedures
proc myPattern() {
  n(C4, 4n, "あ");
}

// Loops
for (i in 1..=4) {
  myPattern();
}

// Conditionals
if (x > 0) {
  n(C4, 4n);
} else {
  r(4n);
}

// Repeat with callback
repeat(4) {
  drum(kick, 4n);
}
```

## Modules

```mfs
// phrases/drums.mf
export proc BEAT_8() {
  drum(kick, 8n);
  drum(hhc, 8n);
}

// main.mf
import { BEAT_8 } from "./phrases/drums.mf";

export proc main() {
  track(midi, drums, { ch: 10 }) {
    for (bar in 1..=4) {
      BEAT_8();
    }
  }
}
```

## Configuration (mfconfig.toml)

```toml
[project]
name = "my-song"
version = "1.0.0"
entry = "src/main.mf"
dist = "dist"
out = "out"

[profiles.cli]
backend = "headless"
musicxml_out = "dist/vocal.musicxml"
band_mid_out = "dist/band.mid"
render_out = "out/mix.mp3"
vocal_cmd = ["neutrino", "{musicxml}", "{vocal_wav}"]
midi_cmd = ["fluidsynth", "-ni", "soundfont.sf2", "{mid}", "-F", "{band_wav}"]
mix_cmd = ["ffmpeg", "-i", "{vocal_wav}", "-i", "{band_wav}", "-y", "{mix_wav}"]

[profiles.miku]
backend = "daw"
import_strategy = "manual"
vsqx_out = "dist/vocal.vsqx"
tempo_mid_out = "dist/tempo.mid"
```

## External Tools

### FluidSynth (Live Preview & MIDI Rendering)

```bash
# Windows
winget install FluidSynth.FluidSynth

# macOS
brew install fluid-synth

# Linux
apt install fluidsynth
```

### NEUTRINO (Vocal Synthesis)

1. Download from official site
2. Set `NEUTRINO_DIR` environment variable
3. Configure `vocal_cmd` in mfconfig.toml

### FFmpeg (Audio Mixing)

```bash
# Windows
winget install FFmpeg

# macOS
brew install ffmpeg

# Linux
apt install ffmpeg
```

## Error Codes

| Code | Description |
|------|-------------|
| E050 | Global function called after track started |
| E110 | Pitch out of range (0-127) |
| E200 | Vocal note overlap |
| E210 | Invalid/empty lyric in vocal track |
| E220 | drum() used in vocal track |
| E221 | chord() used in vocal track |
| E300 | Top-level execution in imported module |
| E310 | Recursion detected |
| E400 | Import not found / undefined symbol / no main() |
| E401 | For range bounds must be compile-time constants |

## License

AGPL-3.0
