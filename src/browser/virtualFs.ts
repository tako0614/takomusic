/**
 * Virtual File System for browser-based TakoMusic compiler
 *
 * Provides an in-memory file system with bundled standard library modules.
 * Allows the compiler to resolve imports without Node.js fs dependencies.
 */

// Standard library modules bundled as strings
// These are embedded at build time to avoid Node.js fs dependencies

export const STDLIB_ALGORITHM = `// std:algorithm (v5)
// Algorithmic composition: voice leading, Markov chains, counterpoint, constraints

import core;

// ============================================
// Voice Leading Rules
// ============================================

// Check for parallel fifths between two voice pairs
export fn hasParallelFifths(voice1From, voice1To, voice2From, voice2To) {
  const interval1 = (voice1From - voice2From) % 12;
  const interval2 = (voice1To - voice2To) % 12;

  // Perfect fifth = 7 semitones
  const isFifthBefore = interval1 == 7 || interval1 == -5;
  const isFifthAfter = interval2 == 7 || interval2 == -5;

  // Check if both voices move in same direction
  const voice1Motion = voice1To - voice1From;
  const voice2Motion = voice2To - voice2From;
  const sameDirection = (voice1Motion > 0 && voice2Motion > 0) ||
                        (voice1Motion < 0 && voice2Motion < 0);

  return isFifthBefore && isFifthAfter && sameDirection && voice1Motion != 0;
}

// Check for parallel octaves
export fn hasParallelOctaves(voice1From, voice1To, voice2From, voice2To) {
  const interval1 = (voice1From - voice2From) % 12;
  const interval2 = (voice1To - voice2To) % 12;

  const isOctaveBefore = interval1 == 0;
  const isOctaveAfter = interval2 == 0;

  const voice1Motion = voice1To - voice1From;
  const voice2Motion = voice2To - voice2From;
  const sameDirection = (voice1Motion > 0 && voice2Motion > 0) ||
                        (voice1Motion < 0 && voice2Motion < 0);

  return isOctaveBefore && isOctaveAfter && sameDirection && voice1Motion != 0;
}

// Check for hidden fifths/octaves (direct motion to perfect interval)
export fn hasHiddenFifths(voice1From, voice1To, voice2From, voice2To) {
  const interval2 = (voice1To - voice2To) % 12;
  const isFifthAfter = interval2 == 7 || interval2 == -5;

  const voice1Motion = voice1To - voice1From;
  const voice2Motion = voice2To - voice2From;
  const sameDirection = (voice1Motion > 0 && voice2Motion > 0) ||
                        (voice1Motion < 0 && voice2Motion < 0);

  return isFifthAfter && sameDirection;
}

// Analyze voice leading issues in a chord progression
export fn analyzeVoiceLeading(chord1, chord2) {
  let issues = [];

  for (i in 0..(chord1.length - 1)) {
    for (j in (i + 1)..(chord1.length - 1)) {
      if (hasParallelFifths(chord1[i], chord2[i], chord1[j], chord2[j])) {
        issues[issues.length] = {
          type: "parallelFifths",
          voices: [i, j]
        };
      }
      if (hasParallelOctaves(chord1[i], chord2[i], chord1[j], chord2[j])) {
        issues[issues.length] = {
          type: "parallelOctaves",
          voices: [i, j]
        };
      }
    }
  }

  return issues;
}

// Get voice motion type
export fn voiceMotion(voice1From, voice1To, voice2From, voice2To) {
  const motion1 = voice1To - voice1From;
  const motion2 = voice2To - voice2From;

  if (motion1 == 0 && motion2 == 0) {
    return "none";
  }
  if (motion1 == 0 || motion2 == 0) {
    return "oblique";
  }
  if ((motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0)) {
    return "parallel";
  }
  return "contrary";
}

// Smooth voice leading - find closest voice assignment
export fn smoothVoiceLeading(fromChord, toChordPitchClasses) {
  // Simple greedy algorithm for minimal voice movement
  let result = [];
  let usedPitches = [];

  for (fromPitch in fromChord) {
    let bestPitch = null;
    let bestDist = 1000;

    for (pc in toChordPitchClasses) {
      // Find closest octave of this pitch class
      let targetPitch = (fromPitch / 12) * 12 + pc;
      if (targetPitch < fromPitch - 6) {
        targetPitch = targetPitch + 12;
      }
      if (targetPitch > fromPitch + 6) {
        targetPitch = targetPitch - 12;
      }

      // Check if already used
      let used = false;
      for (u in usedPitches) {
        if (u == targetPitch) {
          used = true;
        }
      }

      if (!used) {
        let dist = targetPitch - fromPitch;
        if (dist < 0) { dist = 0 - dist; }
        if (dist < bestDist) {
          bestDist = dist;
          bestPitch = targetPitch;
        }
      }
    }

    result[result.length] = bestPitch;
    usedPitches[usedPitches.length] = bestPitch;
  }

  return result;
}

// ============================================
// Markov Chains
// ============================================

// Create a Markov chain from a sequence
export fn buildMarkovChain(sequence, order) {
  let ord = order;
  if (ord == null) {
    ord = 1;
  }

  let transitions = {};

  for (i in 0..(sequence.length - ord - 1)) {
    // Build state key
    let state = "";
    for (j in 0..(ord - 1)) {
      if (j > 0) {
        state = state + ",";
      }
      state = state + sequence[i + j];
    }

    const nextVal = sequence[i + ord];

    if (transitions[state] == null) {
      transitions[state] = {};
    }
    if (transitions[state][nextVal] == null) {
      transitions[state][nextVal] = 0;
    }
    transitions[state][nextVal] = transitions[state][nextVal] + 1;
  }

  return {
    order: ord,
    transitions: transitions
  };
}

// Generate sequence from Markov chain
export fn generateFromMarkov(chain, startState, length, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let result = [];
  // Parse start state
  let currentState = startState;

  for (_ in 0..(length - 1)) {
    const trans = chain.transitions[currentState];
    if (trans == null) {
      break;
    }

    // Calculate total weight
    let total = 0;
    let options = [];
    for (key in trans) {
      total = total + trans[key];
      options[options.length] = { value: key, weight: trans[key] };
    }

    // Random selection
    rng = (rng * 1103515245 + 12345) % 2147483648;
    let r = (rng / 2147483648) * total;

    let selected = options[0].value;
    for (opt in options) {
      r = r - opt.weight;
      if (r <= 0) {
        selected = opt.value;
        break;
      }
    }

    result[result.length] = selected;

    // Update state
    if (chain.order == 1) {
      currentState = selected;
    } else {
      // Shift state
      let parts = [];
      let current = "";
      for (i in 0..(currentState.length - 1)) {
        const ch = currentState[i];
        if (ch == ",") {
          parts[parts.length] = current;
          current = "";
        } else {
          current = current + ch;
        }
      }
      parts[parts.length] = current;

      // Remove first, add new
      let newState = "";
      for (i in 1..(parts.length - 1)) {
        if (i > 1) {
          newState = newState + ",";
        }
        newState = newState + parts[i];
      }
      newState = newState + "," + selected;
      currentState = newState;
    }
  }

  return result;
}

// ============================================
// Counterpoint Rules
// ============================================

// Species counterpoint intervals (first species)
export const CP_CONSONANCES = [0, 3, 4, 7, 8, 9, 12];  // Unison, 3rd, 4th, 5th, 6th, octave

// Check if interval is consonant
export fn isConsonant(interval) {
  let intv = interval % 12;
  if (intv < 0) {
    intv = intv + 12;
  }
  for (c in CP_CONSONANCES) {
    if (intv == c || intv == 12 - c) {
      return true;
    }
  }
  return false;
}

// Check if interval is a perfect consonance
export fn isPerfectConsonance(interval) {
  let intv = interval % 12;
  if (intv < 0) {
    intv = intv + 12;
  }
  return intv == 0 || intv == 7 || intv == 12 || intv == 5;  // Unison, 5th, octave, 4th
}

// Generate first species counterpoint candidate
export fn generateCounterpoint(cantusFirmus, above) {
  let result = [];
  let direction = 1;
  if (!above) {
    direction = -1;
  }

  for (note in cantusFirmus) {
    // Find consonant pitch
    let candidates = [];
    for (offset in 0..24) {
      let pitch = note + (offset * direction);
      if (isConsonant(pitch - note)) {
        candidates[candidates.length] = pitch;
      }
    }

    // Simple selection (could be improved with voice leading)
    if (result.length == 0) {
      result[result.length] = candidates[2];  // Start with a nice interval
    } else {
      // Find smoothest motion
      const prev = result[result.length - 1];
      let best = candidates[0];
      let bestDist = 100;
      for (c in candidates) {
        let dist = c - prev;
        if (dist < 0) { dist = 0 - dist; }
        if (dist < bestDist && dist > 0) {
          bestDist = dist;
          best = c;
        }
      }
      result[result.length] = best;
    }
  }

  return result;
}

// ============================================
// Pitch Set Operations
// ============================================

// Get pitch class (0-11)
export fn pitchClass(pitch) {
  let pc = pitch % 12;
  if (pc < 0) {
    pc = pc + 12;
  }
  return pc;
}

// Transpose pitch set
export fn transposePitchSet(pitchSet, semitones) {
  let result = [];
  for (pc in pitchSet) {
    result[result.length] = (pc + semitones) % 12;
  }
  return result;
}

// Invert pitch set
export fn invertPitchSet(pitchSet, axis) {
  let ax = axis;
  if (ax == null) {
    ax = 0;
  }
  let result = [];
  for (pc in pitchSet) {
    result[result.length] = (ax * 2 - pc + 12) % 12;
  }
  return result;
}

// Get interval vector
export fn intervalVector(pitchSet) {
  let vector = [0, 0, 0, 0, 0, 0];

  for (i in 0..(pitchSet.length - 1)) {
    for (j in (i + 1)..(pitchSet.length - 1)) {
      let interval = (pitchSet[j] - pitchSet[i]) % 12;
      if (interval < 0) {
        interval = interval + 12;
      }
      if (interval > 6) {
        interval = 12 - interval;
      }
      if (interval > 0) {
        vector[interval - 1] = vector[interval - 1] + 1;
      }
    }
  }

  return vector;
}

// ============================================
// Probability-based Generation
// ============================================

// Weighted random selection
export fn weightedRandom(options, weights, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let total = 0;
  for (w in weights) {
    total = total + w;
  }

  rng = (rng * 1103515245 + 12345) % 2147483648;
  let r = (rng / 2147483648) * total;

  for (i in 0..(options.length - 1)) {
    r = r - weights[i];
    if (r <= 0) {
      return { value: options[i], newSeed: rng };
    }
  }

  return { value: options[options.length - 1], newSeed: rng };
}

// Generate melodic sequence with probability
export fn generateMelody(scale, startPitch, length, weights, seed) {
  let result = [];
  let currentPitch = startPitch;
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  // Default weights: favor stepwise motion
  let w = weights;
  if (w == null) {
    w = [0.1, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1];  // -3, -2, -1, 0, +1, +2, +3 scale steps
  }

  for (_ in 0..(length - 1)) {
    result[result.length] = currentPitch;

    // Choose next interval
    let intervals = [-3, -2, -1, 0, 1, 2, 3];
    let selection = weightedRandom(intervals, w, rng);
    let step = selection.value;
    rng = selection.newSeed;

    // Find pitch in scale
    let scaleIdx = 0;
    for (i in 0..(scale.length - 1)) {
      if (pitchClass(currentPitch) == scale[i]) {
        scaleIdx = i;
        break;
      }
    }

    let newIdx = scaleIdx + step;
    let octaveShift = 0;
    for (_ in 0..10) {
      if (newIdx >= scale.length) {
        newIdx = newIdx - scale.length;
        octaveShift = octaveShift + 12;
      } else if (newIdx < 0) {
        newIdx = newIdx + scale.length;
        octaveShift = octaveShift - 12;
      } else {
        break;
      }
    }

    const newPC = scale[newIdx];
    currentPitch = (currentPitch / 12) * 12 + newPC + octaveShift;
  }

  return result;
}

// ============================================
// Cellular Automata
// ============================================

// Rule 30 cellular automaton (chaotic)
export fn rule30(initial, steps) {
  let state = initial;
  let result = [state];

  for (_ in 0..(steps - 1)) {
    let newState = [];
    for (i in 0..(state.length - 1)) {
      let left = 0;
      let center = state[i];
      let right = 0;
      if (i > 0) { left = state[i - 1]; }
      if (i < state.length - 1) { right = state[i + 1]; }

      // Rule 30: 111->0, 110->0, 101->0, 100->1, 011->1, 010->1, 001->1, 000->0
      const pattern = left * 4 + center * 2 + right;
      let newVal = 0;
      if (pattern == 4 || pattern == 3 || pattern == 2 || pattern == 1) {
        newVal = 1;
      }
      newState[newState.length] = newVal;
    }
    state = newState;
    result[result.length] = state;
  }

  return result;
}

// Convert CA output to pitches
export fn caToMelody(caOutput, scale, basePitch) {
  let result = [];
  for (row in caOutput) {
    // Sum active cells to determine pitch
    let sum = 0;
    for (cell in row) {
      sum = sum + cell;
    }
    const scaleIdx = sum % scale.length;
    const octave = (sum / scale.length) % 3;
    result[result.length] = basePitch + scale[scaleIdx] + octave * 12;
  }
  return result;
}
`;

export const STDLIB_ARTICULATIONS = `// std:articulations (v4)
// Standard articulation techniques and helper functions

use std:core { cloneEvent };

// ============================================================
// Standard Articulation Constants
// ============================================================

// Basic articulations
export const staccato = "staccato";
export const staccatissimo = "staccatissimo";
export const legato = "legato";
export const tenuto = "tenuto";
export const accent = "accent";
export const marcato = "marcato";

// Dynamic-related
export const sfz = "sfz";
export const rfz = "rfz";
export const fp = "fp";
export const sfp = "sfp";

// String-specific
export const pizzicato = "pizzicato";
export const pizz = "pizz";
export const arco = "arco";
export const spiccato = "spiccato";
export const detache = "detache";
export const martele = "martele";
export const ricochet = "ricochet";
export const colLegno = "col_legno";
export const sulPonticello = "sul_pont";
export const sulTasto = "sul_tasto";
export const conSordino = "con_sord";
export const senzaSordino = "senza_sord";
export const tremolo = "tremolo";
export const harmonics = "harmonics";

// Wind-specific
export const flutter = "flutter";
export const doubleTongue = "double_tongue";
export const tripleTongue = "triple_tongue";

// Ornaments
export const trill = "trill";
export const mordent = "mordent";
export const upperMordent = "upper_mordent";
export const turn = "turn";
export const appoggiatura = "appoggiatura";
export const acciaccatura = "acciaccatura";

// Other
export const fermata = "fermata";
export const breath = "breath";
export const caesura = "caesura";
export const arpeggiate = "arpeggiate";
export const glissando = "glissando";
export const portamento = "portamento";
export const vibrato = "vibrato";

// ============================================================
// Helper Functions
// ============================================================

fn hasTechnique(techs, tech) {
  if (techs == null) { return false; }
  for (t in techs) {
    if (t == tech) { return true; }
  }
  return false;
}

fn addTechnique(techs, tech) {
  let result = [];
  if (techs != null) {
    for (t in techs) {
      result[result.length] = t;
    }
  }
  if (!hasTechnique(result, tech)) {
    result[result.length] = tech;
  }
  return result;
}

fn removeTechnique(techs, tech) {
  if (techs == null) { return []; }
  let result = [];
  for (t in techs) {
    if (t != tech) {
      result[result.length] = t;
    }
  }
  return result;
}

// ============================================================
// Articulation Application Functions
// ============================================================

// Apply an articulation to all notes in a clip
export fn applyArticulation(c, tech) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      out.techniques = addTechnique(out.techniques, tech);
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Remove an articulation from all notes
export fn removeArticulation(c, tech) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      out.techniques = removeTechnique(out.techniques, tech);
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Clear all articulations
export fn clearArticulations(c) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      out.techniques = [];
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// ============================================================
// Convenience Functions for Common Articulations
// ============================================================

export fn makeStaccato(c) {
  return applyArticulation(c, staccato);
}

export fn makeLegato(c) {
  return applyArticulation(c, legato);
}

export fn makeAccented(c) {
  return applyArticulation(c, accent);
}

export fn makeTenuto(c) {
  return applyArticulation(c, tenuto);
}

export fn makeMarcato(c) {
  return applyArticulation(c, marcato);
}

export fn makePizzicato(c) {
  let result = removeArticulation(c, arco);
  return applyArticulation(result, pizz);
}

export fn makeArco(c) {
  let result = removeArticulation(c, pizz);
  result = removeArticulation(result, pizzicato);
  return applyArticulation(result, arco);
}

export fn makeTremolo(c) {
  return applyArticulation(c, tremolo);
}

export fn makeHarmonics(c) {
  return applyArticulation(c, harmonics);
}

// ============================================================
// Duration Modification Based on Articulation
// ============================================================

// Shorten notes for staccato effect (default: 50% of original duration)
export fn shortenForStaccato(c, factor) {
  let f = factor;
  if (f == null) { f = 0.5; }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      if (hasTechnique(out.techniques, staccato) || hasTechnique(out.techniques, staccatissimo)) {
        out.dur = out.dur * f;
      }
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Lengthen notes for legato effect (extend to 100% of gap to next note)
export fn extendForLegato(c) {
  // Sort notes by start time
  let notes = [];
  let other = [];

  for (ev in c.events) {
    if (ev.type == "note") {
      notes[notes.length] = cloneEvent(ev);
    } else {
      other[other.length] = ev;
    }
  }

  // Sort by start time using native O(n log n) sort
  notes = sortBy(notes, "start");

  // Extend legato notes to reach the next note
  for (i in 0..(notes.length - 2)) {
    const current = notes[i];
    const next = notes[i + 1];
    if (hasTechnique(current.techniques, legato)) {
      const gap = next.start - (current.start + current.dur);
      if (gap > 0 / 1) {
        current.dur = current.dur + gap;
      }
    }
  }

  let events = [];
  for (ev in other) {
    events[events.length] = ev;
  }
  for (ev in notes) {
    events[events.length] = ev;
  }
  return { events: events, length: c.length };
}

// ============================================================
// Articulation Queries
// ============================================================

// Check if any note in clip has specific articulation
export fn hasAnyArticulation(c, tech) {
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      if (hasTechnique(ev.techniques, tech)) {
        return true;
      }
    }
  }
  return false;
}

// Get list of all articulations used in clip
export fn getArticulations(c) {
  let result = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord") {
      if (ev.techniques != null) {
        for (t in ev.techniques) {
          if (!hasTechnique(result, t)) {
            result[result.length] = t;
          }
        }
      }
    }
  }
  return result;
}
`;

export const STDLIB_AUTOGEN = `// std:autogen (v7.0)
// Automatic generation helpers (countermelody, bass, accompaniment).

use std:motif { motif, note };

fn normalizeChord(ch) {
  if (ch == null) {
    return [];
  }
  if (ch.pitches != null) {
    return ch.pitches;
  }
  if (ch.notes != null) {
    return ch.notes;
  }
  if (ch.length != null) {
    return ch;
  }
  if (ch.pitch != null) {
    return [ch.pitch];
  }
  return [ch];
}

fn rootFromChord(ch) {
  const chord = normalizeChord(ch);
  if (chord.length == 0) {
    return null;
  }
  return chord[0];
}

fn defaultDur(dur, fallback) {
  let out = dur;
  if (out == null) {
    out = fallback;
  }
  return out;
}

fn defaultVal(val, fallback) {
  let out = val;
  if (out == null) {
    out = fallback;
  }
  return out;
}

export fn isAvailable() {
  return true;
}

// Generate a simple countermelody by transposition.
// melody: motif
// interval: semitones (default: 7)
// preferContrary: when true, invert direction per melodic motion
export fn counterMelody(melody, interval, preferContrary, velocityScale) {
  if (melody == null || melody.notes == null) {
    return motif([]);
  }
  let intv = interval;
  if (intv == null) {
    intv = 7;
  }
  const scale = defaultVal(velocityScale, 0.7);

  let notes = [];
  let prevPitch = null;

  for (n in melody.notes) {
    let dir = 1;
    if (preferContrary && prevPitch != null) {
      const motion = n.pitch - prevPitch;
      if (motion > 0) {
        dir = -1;
      } else if (motion < 0) {
        dir = 1;
      }
    }

    let vel = n.velocity;
    if (vel == null) {
      vel = 0.8;
    }

    notes[notes.length] = note(n.pitch + (intv * dir), n.duration, vel * scale);
    prevPitch = n.pitch;
  }

  return motif(notes);
}

// Generate a bassline from chord roots or pitch list.
// duration: per-note duration (default: 1/4)
// octave: pitch shift (default: -12)
export fn bassline(chords, duration, octave, velocity) {
  if (chords == null) {
    return motif([]);
  }
  const dur = defaultDur(duration, 1 / 4);
  const oct = defaultVal(octave, -12);
  const vel = defaultVal(velocity, 0.7);

  let notes = [];
  for (ch in chords) {
    const root = rootFromChord(ch);
    if (root != null) {
      notes[notes.length] = note(root + oct, dur, vel);
    }
  }

  return motif(notes);
}

// Generate a broken-chord accompaniment.
// pattern: chord indices (default: [0, 1, 2, 1])
// duration: per-note duration (default: 1/8)
export fn accompaniment(chords, pattern, duration, octave, velocity) {
  if (chords == null) {
    return motif([]);
  }
  let patt = pattern;
  if (patt == null) {
    patt = [0, 1, 2, 1];
  }
  const dur = defaultDur(duration, 1 / 8);
  const oct = defaultVal(octave, 0);
  const vel = defaultVal(velocity, 0.6);

  let notes = [];
  for (ch in chords) {
    const chord = normalizeChord(ch);
    if (chord.length == 0) {
      continue;
    }
    for (step in patt) {
      let idx = step % chord.length;
      if (idx < 0) {
        idx = idx + chord.length;
      }
      const pitch = chord[idx] + oct;
      notes[notes.length] = note(pitch, dur, vel);
    }
  }

  return motif(notes);
}

// Convert motif to a clip
export fn motifToClip(m, start) {
  if (m == null || m.notes == null) {
    return { events: [], length: 0 / 1 };
  }
  let time = start;
  if (time == null) {
    time = 0 / 1;
  }
  let events = [];
  for (n in m.notes) {
    events[events.length] = {
      type: "note",
      pitch: n.pitch,
      start: time,
      dur: n.duration,
      velocity: n.velocity
    };
    time = time + n.duration;
  }
  return { events: events, length: time };
}

// Generic dispatcher
// spec.kind: "counterMelody" | "bassline" | "accompaniment"
export fn generate(spec) {
  if (spec == null || spec.kind == null) {
    return { kind: "Err", error: "autogen spec.kind is required" };
  }
  if (spec.kind == "counterMelody") {
    return {
      kind: "Ok",
      value: counterMelody(spec.melody, spec.interval, spec.preferContrary, spec.velocityScale)
    };
  }
  if (spec.kind == "bassline") {
    return {
      kind: "Ok",
      value: bassline(spec.chords, spec.duration, spec.octave, spec.velocity)
    };
  }
  if (spec.kind == "accompaniment") {
    return {
      kind: "Ok",
      value: accompaniment(spec.chords, spec.pattern, spec.duration, spec.octave, spec.velocity)
    };
  }
  return { kind: "Err", error: "unknown autogen kind: " + spec.kind };
}
`;

export const STDLIB_CANON = `// std:canon (v5.4)
// Canonic techniques and imitative counterpoint
// Supports various historical and contemporary canonic forms

// ============================================
// Basic Canon Generation
// ============================================

// Create simple canon at unison
export fn canon(subject, voiceCount, delayInterval) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const offset = v * delayInterval;

    for (note in subject) {
      events[events.length] = {
        pitch: note.pitch,
        start: note.start + offset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v
      };
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "unison",
    subject: subject,
    voiceCount: voiceCount,
    delay: delayInterval,
    voices: voices
  };
}

// Canon at the fifth (or any interval)
export fn canonAtInterval(subject, voiceCount, delayInterval, pitchInterval) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const timeOffset = v * delayInterval;
    const pitchOffset = v * pitchInterval;

    for (note in subject) {
      events[events.length] = {
        pitch: note.pitch + pitchOffset,
        start: note.start + timeOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v
      };
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "interval",
    subject: subject,
    voiceCount: voiceCount,
    delay: delayInterval,
    interval: pitchInterval,
    voices: voices
  };
}

// ============================================
// Canonic Transformations
// ============================================

// Canon in inversion
export fn canonInversion(subject, voiceCount, delayInterval, axis) {
  let ax = axis;
  if (ax == null && subject.length > 0) {
    ax = subject[0].pitch;
  }

  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const timeOffset = v * delayInterval;
    const isInverted = v % 2 == 1;

    for (note in subject) {
      let pitch = note.pitch;
      if (isInverted) {
        pitch = ax * 2 - pitch;
      }

      events[events.length] = {
        pitch: pitch,
        start: note.start + timeOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v
      };
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "inversion",
    subject: subject,
    voiceCount: voiceCount,
    delay: delayInterval,
    axis: ax,
    voices: voices
  };
}

// Canon in retrograde (crab canon)
export fn crabCanon(subject, delayInterval) {
  let voice1Events = [];
  let voice2Events = [];

  // Voice 1: original
  for (note in subject) {
    voice1Events[voice1Events.length] = {
      pitch: note.pitch,
      start: note.start,
      duration: note.duration,
      velocity: note.velocity,
      voice: 0
    };
  }

  // Calculate total duration
  let totalDur = 0 / 1;
  for (note in subject) {
    const end = note.start + note.duration;
    if (end > totalDur) {
      totalDur = end;
    }
  }

  // Voice 2: retrograde
  for (i in 0..(subject.length - 1)) {
    const note = subject[subject.length - 1 - i];
    const newStart = totalDur - note.start - note.duration + delayInterval;

    voice2Events[voice2Events.length] = {
      pitch: note.pitch,
      start: newStart,
      duration: note.duration,
      velocity: note.velocity,
      voice: 1
    };
  }

  return {
    type: "canon",
    canonType: "crab",
    subject: subject,
    voices: [{ events: voice1Events }, { events: voice2Events }]
  };
}

// Canon in retrograde inversion (table canon)
export fn tableCanon(subject, axis) {
  let ax = axis;
  if (ax == null && subject.length > 0) {
    ax = subject[0].pitch;
  }

  let voice1Events = [];
  let voice2Events = [];

  // Voice 1: original
  for (note in subject) {
    voice1Events[voice1Events.length] = {
      pitch: note.pitch,
      start: note.start,
      duration: note.duration,
      velocity: note.velocity,
      voice: 0
    };
  }

  // Calculate total duration
  let totalDur = 0 / 1;
  for (note in subject) {
    const end = note.start + note.duration;
    if (end > totalDur) {
      totalDur = end;
    }
  }

  // Voice 2: retrograde inversion
  for (i in 0..(subject.length - 1)) {
    const note = subject[subject.length - 1 - i];
    const newStart = totalDur - note.start - note.duration;
    const invertedPitch = ax * 2 - note.pitch;

    voice2Events[voice2Events.length] = {
      pitch: invertedPitch,
      start: newStart,
      duration: note.duration,
      velocity: note.velocity,
      voice: 1
    };
  }

  return {
    type: "canon",
    canonType: "table",
    subject: subject,
    axis: ax,
    voices: [{ events: voice1Events }, { events: voice2Events }]
  };
}

// ============================================
// Mensuration Canon
// ============================================

// Canon with different tempos (prolation)
export fn mensurationCanon(subject, tempoRatios) {
  let voices = [];

  for (i in 0..(tempoRatios.length - 1)) {
    const ratio = tempoRatios[i];
    let events = [];

    for (note in subject) {
      events[events.length] = {
        pitch: note.pitch,
        start: note.start * ratio,
        duration: note.duration * ratio,
        velocity: note.velocity,
        voice: i
      };
    }

    voices[i] = { events: events };
  }

  return {
    type: "canon",
    canonType: "mensuration",
    subject: subject,
    tempoRatios: tempoRatios,
    voices: voices
  };
}

// Augmentation canon
export fn augmentationCanon(subject, augmentationFactor, delayInterval) {
  let voice1Events = [];
  let voice2Events = [];

  // Voice 1: original
  for (note in subject) {
    voice1Events[voice1Events.length] = {
      pitch: note.pitch,
      start: note.start,
      duration: note.duration,
      velocity: note.velocity,
      voice: 0
    };
  }

  // Voice 2: augmented
  for (note in subject) {
    voice2Events[voice2Events.length] = {
      pitch: note.pitch,
      start: note.start * augmentationFactor + delayInterval,
      duration: note.duration * augmentationFactor,
      velocity: note.velocity,
      voice: 1
    };
  }

  return {
    type: "canon",
    canonType: "augmentation",
    subject: subject,
    augmentationFactor: augmentationFactor,
    voices: [{ events: voice1Events }, { events: voice2Events }]
  };
}

// Diminution canon
export fn diminutionCanon(subject, diminutionFactor, delayInterval) {
  return augmentationCanon(subject, 1 / diminutionFactor, delayInterval);
}

// ============================================
// Special Canon Types
// ============================================

// Spiral canon (continuous modulation)
export fn spiralCanon(subject, voiceCount, delayInterval, modulationInterval) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const timeOffset = v * delayInterval;
    const pitchOffset = v * modulationInterval;

    for (note in subject) {
      events[events.length] = {
        pitch: note.pitch + pitchOffset,
        start: note.start + timeOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v
      };
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "spiral",
    subject: subject,
    voiceCount: voiceCount,
    delay: delayInterval,
    modulationInterval: modulationInterval,
    voices: voices
  };
}

// Mirror canon (palindrome)
export fn mirrorCanon(subject) {
  let voice1Events = [];
  let voice2Events = [];

  // Voice 1: original
  for (note in subject) {
    voice1Events[voice1Events.length] = {
      pitch: note.pitch,
      start: note.start,
      duration: note.duration,
      velocity: note.velocity,
      voice: 0
    };
  }

  // Get total duration
  let totalDur = 0 / 1;
  for (note in subject) {
    const end = note.start + note.duration;
    if (end > totalDur) {
      totalDur = end;
    }
  }

  // Voice 2: starts at end going backwards, plays simultaneously
  for (i in 0..(subject.length - 1)) {
    const note = subject[subject.length - 1 - i];
    voice2Events[voice2Events.length] = {
      pitch: note.pitch,
      start: totalDur - note.start - note.duration,
      duration: note.duration,
      velocity: note.velocity,
      voice: 1
    };
  }

  return {
    type: "canon",
    canonType: "mirror",
    subject: subject,
    voices: [{ events: voice1Events }, { events: voice2Events }]
  };
}

// Perpetual canon (round)
export fn round(subject, voiceCount, delayInterval, repetitions) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const entryDelay = v * delayInterval;

    // Get subject duration
    let subjectDur = 0 / 1;
    for (note in subject) {
      const end = note.start + note.duration;
      if (end > subjectDur) {
        subjectDur = end;
      }
    }

    for (rep in 0..(repetitions - 1)) {
      const repOffset = rep * subjectDur;

      for (note in subject) {
        events[events.length] = {
          pitch: note.pitch,
          start: note.start + entryDelay + repOffset,
          duration: note.duration,
          velocity: note.velocity,
          voice: v
        };
      }
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "round",
    subject: subject,
    voiceCount: voiceCount,
    delay: delayInterval,
    repetitions: repetitions,
    voices: voices
  };
}

// ============================================
// Double and Triple Canons
// ============================================

// Double canon (two canonic pairs)
export fn doubleCanon(subject1, subject2, delay1, delay2, interval1, interval2) {
  let voices = [];

  // Canon 1
  for (v in 0..1) {
    let events = [];
    const timeOffset = v * delay1;
    const pitchOffset = v * interval1;

    for (note in subject1) {
      events[events.length] = {
        pitch: note.pitch + pitchOffset,
        start: note.start + timeOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v
      };
    }

    voices[v] = { events: events };
  }

  // Canon 2
  for (v in 0..1) {
    let events = [];
    const timeOffset = v * delay2;
    const pitchOffset = v * interval2;

    for (note in subject2) {
      events[events.length] = {
        pitch: note.pitch + pitchOffset,
        start: note.start + timeOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: v + 2
      };
    }

    voices[v + 2] = { events: events };
  }

  return {
    type: "canon",
    canonType: "double",
    subjects: [subject1, subject2],
    voices: voices
  };
}

// Triple canon (three canonic pairs)
export fn tripleCanon(subjects, delays, intervals) {
  let voices = [];
  let voiceIdx = 0;

  for (s in 0..(subjects.length - 1)) {
    const subject = subjects[s];
    const delay = delays[s];
    const interval = intervals[s];

    for (v in 0..1) {
      let events = [];
      const timeOffset = v * delay;
      const pitchOffset = v * interval;

      for (note in subject) {
        events[events.length] = {
          pitch: note.pitch + pitchOffset,
          start: note.start + timeOffset,
          duration: note.duration,
          velocity: note.velocity,
          voice: voiceIdx
        };
      }

      voices[voiceIdx] = { events: events };
      voiceIdx = voiceIdx + 1;
    }
  }

  return {
    type: "canon",
    canonType: "triple",
    subjects: subjects,
    voices: voices
  };
}

// ============================================
// Puzzle Canon
// ============================================

// Create puzzle canon (notation shows one voice, rules derive others)
export fn puzzleCanon(subject, rules) {
  let voices = [];

  // Voice 0: original
  let voice0Events = [];
  for (note in subject) {
    voice0Events[voice0Events.length] = {
      pitch: note.pitch,
      start: note.start,
      duration: note.duration,
      velocity: note.velocity,
      voice: 0
    };
  }
  voices[0] = { events: voice0Events };

  // Derive other voices from rules
  for (i in 0..(rules.length - 1)) {
    const rule = rules[i];
    let events = [];

    for (note in subject) {
      let newPitch = note.pitch;
      let newStart = note.start;
      let newDur = note.duration;

      // Apply transformations
      if (rule.transpose != null) {
        newPitch = newPitch + rule.transpose;
      }
      if (rule.invert != null) {
        newPitch = rule.invert * 2 - newPitch;
      }
      if (rule.delay != null) {
        newStart = newStart + rule.delay;
      }
      if (rule.augment != null) {
        newStart = newStart * rule.augment;
        newDur = newDur * rule.augment;
      }
      if (rule.retrograde == true) {
        // Handle in post-processing
      }

      events[events.length] = {
        pitch: newPitch,
        start: newStart,
        duration: newDur,
        velocity: note.velocity,
        voice: i + 1
      };
    }

    // Handle retrograde
    if (rule.retrograde == true) {
      let totalDur = 0 / 1;
      for (e in events) {
        const end = e.start + e.duration;
        if (end > totalDur) { totalDur = end; }
      }

      let retroEvents = [];
      for (j in 0..(events.length - 1)) {
        const e = events[events.length - 1 - j];
        retroEvents[j] = {
          pitch: e.pitch,
          start: totalDur - e.start - e.duration,
          duration: e.duration,
          velocity: e.velocity,
          voice: e.voice
        };
      }
      events = retroEvents;
    }

    voices[i + 1] = { events: events };
  }

  return {
    type: "canon",
    canonType: "puzzle",
    subject: subject,
    rules: rules,
    voices: voices
  };
}

// ============================================
// Modern Techniques
// ============================================

// Isorhythmic canon (talea and color)
export fn isorhythmicCanon(color, talea, voiceCount, delayInterval) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    const entryDelay = v * delayInterval;

    let time = entryDelay;
    let colorIdx = 0;
    let taleaIdx = 0;

    // Continue until both cycles complete together (or reasonable length)
    const iterations = color.length * talea.length;

    for (i in 0..(iterations - 1)) {
      events[events.length] = {
        pitch: color[colorIdx % color.length],
        start: time,
        duration: talea[taleaIdx % talea.length],
        velocity: 0.75,
        voice: v
      };

      time = time + talea[taleaIdx % talea.length];
      colorIdx = colorIdx + 1;
      taleaIdx = taleaIdx + 1;
    }

    voices[v] = { events: events };
  }

  return {
    type: "canon",
    canonType: "isorhythmic",
    color: color,
    talea: talea,
    voices: voices
  };
}

// Phasing canon (Reich-style)
export fn phasingCanon(subject, phaseIncrement, totalPhase) {
  let voice1Events = [];
  let voice2Events = [];

  // Voice 1: stable tempo
  let subjectDur = 0 / 1;
  for (note in subject) {
    const end = note.start + note.duration;
    if (end > subjectDur) {
      subjectDur = end;
    }
  }

  // Calculate repetitions needed
  const repetitions = totalPhase / phaseIncrement + 2;

  for (rep in 0..(repetitions - 1)) {
    for (note in subject) {
      voice1Events[voice1Events.length] = {
        pitch: note.pitch,
        start: note.start + rep * subjectDur,
        duration: note.duration,
        velocity: note.velocity,
        voice: 0
      };
    }
  }

  // Voice 2: gradually shifting
  let phaseOffset = 0 / 1;
  for (rep in 0..(repetitions - 1)) {
    for (note in subject) {
      voice2Events[voice2Events.length] = {
        pitch: note.pitch,
        start: note.start + rep * subjectDur + phaseOffset,
        duration: note.duration,
        velocity: note.velocity,
        voice: 1
      };
    }
    phaseOffset = phaseOffset + phaseIncrement;
  }

  return {
    type: "canon",
    canonType: "phasing",
    subject: subject,
    phaseIncrement: phaseIncrement,
    voices: [{ events: voice1Events }, { events: voice2Events }]
  };
}

// ============================================
// Utility Functions
// ============================================

// Merge all voices into single event list
export fn mergeVoices(canonResult) {
  let allEvents = [];

  for (voice in canonResult.voices) {
    for (event in voice.events) {
      allEvents[allEvents.length] = event;
    }
  }

  return allEvents;
}

// Get voice by index
export fn getVoice(canonResult, voiceIndex) {
  if (voiceIndex < 0 || voiceIndex >= canonResult.voices.length) {
    return null;
  }
  return canonResult.voices[voiceIndex];
}

// Calculate total duration
export fn totalDuration(canonResult) {
  let maxEnd = 0 / 1;

  for (voice in canonResult.voices) {
    for (event in voice.events) {
      const end = event.start + event.duration;
      if (end > maxEnd) {
        maxEnd = end;
      }
    }
  }

  return maxEnd;
}

// Check vertical intervals at a given time
export fn verticalIntervalsAt(canonResult, time) {
  let activePitches = [];

  for (voice in canonResult.voices) {
    for (event in voice.events) {
      if (event.start <= time && event.start + event.duration > time) {
        activePitches[activePitches.length] = event.pitch;
      }
    }
  }

  // Sort pitches
  activePitches = sort(activePitches);

  // Calculate intervals
  let intervals = [];
  for (i in 1..(activePitches.length - 1)) {
    intervals[intervals.length] = activePitches[i] - activePitches[i - 1];
  }

  return {
    pitches: activePitches,
    intervals: intervals
  };
}
`;

export const STDLIB_CLUSTER = `// std:cluster (v5.4)
// Tone clusters and sound mass composition
// Techniques from Cowell, Ligeti, Penderecki, and Xenakis

// ============================================
// Basic Cluster Generation
// ============================================

// Create chromatic cluster (all notes between low and high)
export fn chromatic(lowPitch, highPitch) {
  let pitches = [];
  for (p in lowPitch..highPitch) {
    pitches[pitches.length] = p;
  }
  return {
    type: "cluster",
    clusterType: "chromatic",
    pitches: pitches,
    low: lowPitch,
    high: highPitch,
    density: 1.0
  };
}

// Create diatonic cluster (white keys)
export fn diatonic(lowPitch, highPitch) {
  const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
  let pitches = [];

  for (p in lowPitch..highPitch) {
    const pc = p % 12;
    for (wk in whiteKeys) {
      if (pc == wk) {
        pitches[pitches.length] = p;
        break;
      }
    }
  }

  return {
    type: "cluster",
    clusterType: "diatonic",
    pitches: pitches,
    low: lowPitch,
    high: highPitch
  };
}

// Create pentatonic cluster (black keys)
export fn pentatonic(lowPitch, highPitch) {
  const blackKeys = [1, 3, 6, 8, 10];
  let pitches = [];

  for (p in lowPitch..highPitch) {
    const pc = p % 12;
    for (bk in blackKeys) {
      if (pc == bk) {
        pitches[pitches.length] = p;
        break;
      }
    }
  }

  return {
    type: "cluster",
    clusterType: "pentatonic",
    pitches: pitches,
    low: lowPitch,
    high: highPitch
  };
}

// Create whole-tone cluster
export fn wholeTone(lowPitch, highPitch, set) {
  // set 0: C, D, E, F#, G#, A#
  // set 1: C#, D#, F, G, A, B
  let startingPcs = [0, 1];
  let s = set;
  if (s == null) { s = 0; }

  let pitches = [];
  for (p in lowPitch..highPitch) {
    const pc = p % 12;
    const offset = pc - startingPcs[s];
    if (offset >= 0 && offset % 2 == 0) {
      pitches[pitches.length] = p;
    }
  }

  return {
    type: "cluster",
    clusterType: "wholeTone",
    pitches: pitches,
    low: lowPitch,
    high: highPitch,
    set: s
  };
}

// Create cluster from scale
export fn fromScale(scale, lowPitch, highPitch) {
  let pitches = [];

  for (p in lowPitch..highPitch) {
    const pc = p % 12;
    for (scalePc in scale) {
      if (pc == scalePc % 12) {
        pitches[pitches.length] = p;
        break;
      }
    }
  }

  return {
    type: "cluster",
    clusterType: "scale",
    pitches: pitches,
    low: lowPitch,
    high: highPitch
  };
}

// ============================================
// Cluster with Density Control
// ============================================

// Create sparse cluster (random selection)
export fn sparse(lowPitch, highPitch, density, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let pitches = [];
  for (p in lowPitch..highPitch) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    if ((rng / 2147483648) < density) {
      pitches[pitches.length] = p;
    }
  }

  return {
    type: "cluster",
    clusterType: "sparse",
    pitches: pitches,
    low: lowPitch,
    high: highPitch,
    density: density
  };
}

// Create cluster with interval filter
export fn withIntervals(lowPitch, highPitch, allowedIntervals) {
  let pitches = [lowPitch];
  let current = lowPitch;

  while (current < highPitch) {
    for (interval in allowedIntervals) {
      const next = current + interval;
      if (next <= highPitch) {
        pitches[pitches.length] = next;
      }
    }
    current = current + 1;  // Simple iteration
  }

  // Remove duplicates and sort
  let unique = [];
  for (p in pitches) {
    let found = false;
    for (u in unique) {
      if (u == p) {
        found = true;
        break;
      }
    }
    if (!found && p >= lowPitch && p <= highPitch) {
      unique[unique.length] = p;
    }
  }

  return {
    type: "cluster",
    clusterType: "intervalFiltered",
    pitches: unique,
    low: lowPitch,
    high: highPitch
  };
}

// ============================================
// Cluster Transformations
// ============================================

// Transpose cluster
export fn transpose(cluster, semitones) {
  let pitches = [];
  for (p in cluster.pitches) {
    pitches[pitches.length] = p + semitones;
  }

  return {
    type: "cluster",
    clusterType: cluster.clusterType,
    pitches: pitches,
    low: cluster.low + semitones,
    high: cluster.high + semitones
  };
}

// Expand cluster (increase range)
export fn expand(cluster, amount) {
  const center = (cluster.low + cluster.high) / 2;
  let pitches = [];

  for (p in cluster.pitches) {
    const dist = p - center;
    const newP = center + dist * amount;
    let rounded = newP;
    if (newP >= 0) {
      rounded = newP - (newP % 1);
    } else {
      rounded = newP - 1 - ((newP - 1) % 1);
    }
    pitches[pitches.length] = rounded;
  }

  let newLow = 127;
  let newHigh = 0;
  for (p in pitches) {
    if (p < newLow) { newLow = p; }
    if (p > newHigh) { newHigh = p; }
  }

  return {
    type: "cluster",
    clusterType: cluster.clusterType + "_expanded",
    pitches: pitches,
    low: newLow,
    high: newHigh
  };
}

// Contract cluster (decrease range)
export fn contract(cluster, amount) {
  return expand(cluster, 1 / amount);
}

// Shift cluster (move without changing size)
export fn shift(cluster, direction, amount) {
  let pitches = [];
  const offset = direction * amount;

  for (p in cluster.pitches) {
    pitches[pitches.length] = p + offset;
  }

  return {
    type: "cluster",
    clusterType: cluster.clusterType,
    pitches: pitches,
    low: cluster.low + offset,
    high: cluster.high + offset
  };
}

// Invert cluster around axis
export fn invert(cluster, axis) {
  let ax = axis;
  if (ax == null) {
    ax = (cluster.low + cluster.high) / 2;
  }

  let pitches = [];
  for (p in cluster.pitches) {
    const inverted = ax * 2 - p;
    let rounded = inverted;
    if (inverted >= 0) {
      rounded = inverted - (inverted % 1);
    } else {
      rounded = inverted - 1 - ((inverted - 1) % 1);
    }
    pitches[pitches.length] = rounded;
  }

  let newLow = 127;
  let newHigh = 0;
  for (p in pitches) {
    if (p < newLow) { newLow = p; }
    if (p > newHigh) { newHigh = p; }
  }

  return {
    type: "cluster",
    clusterType: cluster.clusterType + "_inverted",
    pitches: pitches,
    low: newLow,
    high: newHigh
  };
}

// ============================================
// Cluster Morphing
// ============================================

// Interpolate between two clusters
export fn morph(clusterA, clusterB, amount) {
  // Interpolate boundaries
  const newLow = clusterA.low + (clusterB.low - clusterA.low) * amount;
  const newHigh = clusterA.high + (clusterB.high - clusterA.high) * amount;

  let lowRounded = newLow - (newLow % 1);
  let highRounded = newHigh - (newHigh % 1);

  // Interpolate density
  const densityA = clusterA.pitches.length / (clusterA.high - clusterA.low + 1);
  const densityB = clusterB.pitches.length / (clusterB.high - clusterB.low + 1);
  const newDensity = densityA + (densityB - densityA) * amount;

  // Generate new pitches
  let pitches = [];
  for (p in lowRounded..highRounded) {
    // Probabilistic inclusion based on density
    if (newDensity >= 1.0) {
      pitches[pitches.length] = p;
    } else {
      // Simple deterministic pattern
      const range = highRounded - lowRounded + 1;
      const step = 1 / newDensity;
      const idx = p - lowRounded;
      if (idx % step < 1) {
        pitches[pitches.length] = p;
      }
    }
  }

  return {
    type: "cluster",
    clusterType: "morphed",
    pitches: pitches,
    low: lowRounded,
    high: highRounded,
    morphAmount: amount
  };
}

// Create morphing sequence
export fn morphSequence(clusterA, clusterB, steps) {
  let sequence = [];
  for (i in 0..steps) {
    const amount = i / steps;
    sequence[i] = morph(clusterA, clusterB, amount);
  }
  return sequence;
}

// ============================================
// Sound Mass Techniques
// ============================================

// Create glissando cluster (Penderecki-style)
export fn glissandoCluster(startCluster, endCluster, duration, voiceCount) {
  let voices = [];

  for (v in 0..(voiceCount - 1)) {
    const t = v / (voiceCount - 1);
    const startPitch = startCluster.low + t * (startCluster.high - startCluster.low);
    const endPitch = endCluster.low + t * (endCluster.high - endCluster.low);

    voices[v] = {
      type: "glissando",
      startPitch: startPitch - (startPitch % 1),
      endPitch: endPitch - (endPitch % 1),
      duration: duration
    };
  }

  return {
    type: "clusterGlissando",
    voices: voices,
    duration: duration
  };
}

// Create micropolyphonic texture (Ligeti-style)
export fn micropolyphony(cluster, voiceCount, rhythmDensity, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let voices = [];
  const pitchCount = cluster.pitches.length;

  for (v in 0..(voiceCount - 1)) {
    let events = [];
    let time = 0 / 1;

    // Assign pitch range to voice
    const pitchStart = (v * pitchCount) / voiceCount;
    const pitchEnd = ((v + 1) * pitchCount) / voiceCount;
    let startIdx = pitchStart - (pitchStart % 1);
    let endIdx = pitchEnd - (pitchEnd % 1);
    if (endIdx > pitchCount - 1) { endIdx = pitchCount - 1; }

    while (time < duration) {
      // Random pitch within voice range
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const range = endIdx - startIdx + 1;
      const pitchIdx = startIdx + ((rng / 2147483648) * range);
      let idx = pitchIdx - (pitchIdx % 1);
      if (idx > endIdx) { idx = endIdx; }
      if (idx < startIdx) { idx = startIdx; }

      // Random duration (very short)
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const noteDur = 1/16 + (rng / 2147483648) * 1/8;

      events[events.length] = {
        pitch: cluster.pitches[idx],
        start: time,
        duration: noteDur
      };

      // Random gap
      rng = (rng * 1103515245 + 12345) % 2147483648;
      time = time + noteDur + (rng / 2147483648) * (1 / rhythmDensity);
    }

    voices[v] = { events: events };
  }

  return {
    type: "micropolyphony",
    cluster: cluster,
    voices: voices,
    duration: duration
  };
}

// Create aleatoric texture (Lutoslawski-style)
export fn aleatoricTexture(cluster, cells, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let parts = [];
  for (cell in cells) {
    let events = [];
    let time = 0 / 1;

    while (time < duration) {
      // Play cell with random timing
      for (note in cell.notes) {
        rng = (rng * 1103515245 + 12345) % 2147483648;
        const jitter = (rng / 2147483648 - 0.5) * 0.1;

        events[events.length] = {
          pitch: note.pitch,
          start: time + jitter,
          duration: note.duration
        };
      }

      // Random rest between repetitions
      rng = (rng * 1103515245 + 12345) % 2147483648;
      time = time + cell.duration + (rng / 2147483648) * cell.duration;
    }

    parts[parts.length] = { events: events };
  }

  return {
    type: "aleatoric",
    parts: parts,
    duration: duration
  };
}

// ============================================
// Cluster Arithmetic
// ============================================

// Union of clusters
export fn union(clusterA, clusterB) {
  let pitches = [];

  for (p in clusterA.pitches) {
    pitches[pitches.length] = p;
  }

  for (p in clusterB.pitches) {
    let found = false;
    for (existing in pitches) {
      if (existing == p) {
        found = true;
        break;
      }
    }
    if (!found) {
      pitches[pitches.length] = p;
    }
  }

  // Sort
  pitches = sort(pitches);

  let low = 127;
  let high = 0;
  for (p in pitches) {
    if (p < low) { low = p; }
    if (p > high) { high = p; }
  }

  return {
    type: "cluster",
    clusterType: "union",
    pitches: pitches,
    low: low,
    high: high
  };
}

// Intersection of clusters
export fn intersection(clusterA, clusterB) {
  let pitches = [];

  for (pA in clusterA.pitches) {
    for (pB in clusterB.pitches) {
      if (pA == pB) {
        pitches[pitches.length] = pA;
        break;
      }
    }
  }

  let low = 127;
  let high = 0;
  for (p in pitches) {
    if (p < low) { low = p; }
    if (p > high) { high = p; }
  }

  return {
    type: "cluster",
    clusterType: "intersection",
    pitches: pitches,
    low: low,
    high: high
  };
}

// Difference of clusters (A - B)
export fn difference(clusterA, clusterB) {
  let pitches = [];

  for (pA in clusterA.pitches) {
    let found = false;
    for (pB in clusterB.pitches) {
      if (pA == pB) {
        found = true;
        break;
      }
    }
    if (!found) {
      pitches[pitches.length] = pA;
    }
  }

  let low = 127;
  let high = 0;
  for (p in pitches) {
    if (p < low) { low = p; }
    if (p > high) { high = p; }
  }

  return {
    type: "cluster",
    clusterType: "difference",
    pitches: pitches,
    low: low,
    high: high
  };
}

// ============================================
// Analysis
// ============================================

// Get cluster statistics
export fn analyze(cluster) {
  const range = cluster.high - cluster.low;
  const count = cluster.pitches.length;
  const density = count / (range + 1);

  // Calculate center of mass
  let sum = 0;
  for (p in cluster.pitches) {
    sum = sum + p;
  }
  const centroid = sum / count;

  // Calculate spread
  let variance = 0;
  for (p in cluster.pitches) {
    const diff = p - centroid;
    variance = variance + diff * diff;
  }
  const spread = (variance / count) ** 0.5;

  return {
    range: range,
    noteCount: count,
    density: density,
    centroid: centroid,
    spread: spread
  };
}

// Check if pitch is in cluster
export fn contains(cluster, pitch) {
  for (p in cluster.pitches) {
    if (p == pitch) {
      return true;
    }
  }
  return false;
}

// Get intervals within cluster
export fn getIntervals(cluster) {
  let intervals = [];

  for (i in 0..(cluster.pitches.length - 2)) {
    for (j in (i + 1)..(cluster.pitches.length - 1)) {
      const interval = cluster.pitches[j] - cluster.pitches[i];
      intervals[intervals.length] = interval;
    }
  }

  return intervals;
}

// ============================================
// Voicing and Distribution
// ============================================

// Distribute cluster across voices
export fn distribute(cluster, voiceCount) {
  let voices = [];
  const pitchesPerVoice = cluster.pitches.length / voiceCount;

  for (v in 0..(voiceCount - 1)) {
    let voicePitches = [];
    const startIdx = v * pitchesPerVoice;
    const endIdx = (v + 1) * pitchesPerVoice;

    for (i in 0..(cluster.pitches.length - 1)) {
      if (i >= startIdx && i < endIdx) {
        voicePitches[voicePitches.length] = cluster.pitches[i];
      }
    }

    voices[v] = voicePitches;
  }

  return voices;
}

// Create arpeggiated cluster
export fn arpeggiate(cluster, direction, duration) {
  let events = [];
  const noteCount = cluster.pitches.length;
  const noteDur = duration / noteCount;

  let pitches = cluster.pitches;
  if (direction == "down") {
    pitches = [];
    for (i in 0..(cluster.pitches.length - 1)) {
      pitches[i] = cluster.pitches[cluster.pitches.length - 1 - i];
    }
  }

  for (i in 0..(noteCount - 1)) {
    events[events.length] = {
      pitch: pitches[i],
      start: i * noteDur,
      duration: duration - i * noteDur  // Sustain to end
    };
  }

  return {
    type: "arpeggiatedCluster",
    events: events,
    direction: direction,
    duration: duration
  };
}

// Roll cluster (gradual onset)
export fn roll(cluster, rollDuration, sustainDuration) {
  let events = [];
  const noteCount = cluster.pitches.length;
  const onsetGap = rollDuration / noteCount;

  for (i in 0..(noteCount - 1)) {
    events[events.length] = {
      pitch: cluster.pitches[i],
      start: i * onsetGap,
      duration: sustainDuration
    };
  }

  return {
    type: "rolledCluster",
    events: events,
    rollDuration: rollDuration,
    sustainDuration: sustainDuration
  };
}
`;

export const STDLIB_CONSTRAINT = `// std:constraint (v7.0)
// Simple CSP solver and helpers.

export fn problem() {
  return { vars: [], constraints: [] };
}

export fn addVar(p, name, domain) {
  p.vars[p.vars.length] = { name: name, domain: domain };
  return p;
}

export fn constraint(scope, test) {
  return { scope: scope, test: test };
}

export fn addConstraint(p, c) {
  p.constraints[p.constraints.length] = c;
  return p;
}

export fn isAvailable() {
  return true;
}

fn isAssigned(assignment, name) {
  return assignment[name] != null;
}

fn constraintSatisfied(c, assignment, requireAll) {
  const scope = c.scope;
  if (scope != null) {
    for (name in scope) {
      if (!isAssigned(assignment, name)) {
        return !requireAll;
      }
    }
  } else if (!requireAll) {
    return true;
  }
  if (c.test == null) {
    return false;
  }
  return c.test(assignment);
}

fn constraintsOk(constraints, assignment) {
  for (c in constraints) {
    if (!constraintSatisfied(c, assignment, false)) {
      return false;
    }
  }
  return true;
}

fn copyMap(map) {
  let out = {};
  for (key in map) {
    if (map[key] != null) {
      out[key] = map[key];
    }
  }
  return out;
}

export fn isComplete(problem, assignment) {
  for (v in problem.vars) {
    if (!isAssigned(assignment, v.name)) {
      return false;
    }
  }
  return true;
}

export fn isSatisfied(problem, assignment) {
  for (c in problem.constraints) {
    if (!constraintSatisfied(c, assignment, true)) {
      return false;
    }
  }
  return true;
}

export fn solve(problem, options) {
  let maxSolutions = 1;
  let maxSteps = null;
  let varOrder = "input";
  if (options != null) {
    if (options.maxSolutions != null) {
      maxSolutions = options.maxSolutions;
    }
    if (options.maxSteps != null) {
      maxSteps = options.maxSteps;
    }
    if (options.varOrder != null) {
      varOrder = options.varOrder;
    }
  }

  let solutions = [];
  let assignment = {};
  let steps = 0;

  const vars = problem.vars;

  fn selectVarIndex(vars, assignment, order) {
    let bestIdx = -1;
    let bestSize = null;
    for (i in 0..(vars.length - 1)) {
      const v = vars[i];
      if (isAssigned(assignment, v.name)) {
        continue;
      }
      if (order == "mrv") {
        const size = v.domain.length;
        if (bestIdx == -1 || size < bestSize) {
          bestIdx = i;
          bestSize = size;
        }
      } else {
        return i;
      }
    }
    return bestIdx;
  }

  fn backtrack() {
    if (solutions.length >= maxSolutions) {
      return;
    }
    if (maxSteps != null && steps >= maxSteps) {
      return;
    }
    const varIdx = selectVarIndex(vars, assignment, varOrder);
    if (varIdx == -1) {
      solutions[solutions.length] = copyMap(assignment);
      return;
    }

    const v = vars[varIdx];
    for (value in v.domain) {
      assignment[v.name] = value;
      steps = steps + 1;

      if (constraintsOk(problem.constraints, assignment)) {
        backtrack();
        if (solutions.length >= maxSolutions) {
          return;
        }
      }
    }

    assignment[v.name] = null;
  }

  backtrack();

  if (solutions.length == 0) {
    return { kind: "Err", error: "no solution", steps: steps };
  }
  return { kind: "Ok", solutions: solutions, steps: steps };
}

// ============================================
// Common constraints
// ============================================

export fn allDifferent(names) {
  return constraint(names, fn(assignment) {
    let seen = [];
    for (name in names) {
      const value = assignment[name];
      for (s in seen) {
        if (s == value) {
          return false;
        }
      }
      seen[seen.length] = value;
    }
    return true;
  });
}

export fn equalsValue(name, value) {
  return constraint([name], fn(assignment) {
    return assignment[name] == value;
  });
}

export fn equalsVar(a, b) {
  return constraint([a, b], fn(assignment) {
    return assignment[a] == assignment[b];
  });
}

export fn sumEquals(names, target) {
  return constraint(names, fn(assignment) {
    let sum = 0;
    for (name in names) {
      sum = sum + assignment[name];
    }
    return sum == target;
  });
}
`;

export const STDLIB_CORE = `// std:core (v4)

// ============================================
// Position and Event Utilities (exported for other stdlib modules)
// ============================================

// Convert position value to rational
export fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn eventStartRat(ev) {
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  if (ev.type == "automation") {
    return posToRat(ev.start);
  }
  return posToRat(ev.start);
}

fn eventEndRat(ev) {
  if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
    const start = posToRat(ev.start);
    if (start == null) {
      return null;
    }
    return start + ev.dur;
  }
  if (ev.type == "control") {
    return posToRat(ev.start);
  }
  if (ev.type == "automation") {
    return posToRat(ev.end);
  }
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  return null;
}

fn clipLength(c) {
  if (c.length != null) {
    return c.length;
  }
  let max = null;
  for (ev in c.events) {
    const end = eventEndRat(ev);
    if (end == null) {
      return null;
    }
    if (max == null || end > max) {
      max = end;
    }
  }
  if (max == null) {
    return 0 / 1;
  }
  return max;
}

fn shiftPos(pos, offset) {
  if (pos == null) {
    return pos;
  }
  return pos + offset;
}

fn shiftEvent(ev, offset) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: shiftPos(ev.start, offset),
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: shiftPos(ev.start, offset),
      end: shiftPos(ev.end, offset),
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: shiftPos(ev.pos, offset),
      kind: ev.kind,
      label: ev.label
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      intensity: ev.intensity,
      ext: ev.ext
    };
  }
  return ev;
}

// Clone an event (create a copy without modifying position)
// Handles all event types with all their properties
export fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: ev.start,
      dur: ev.dur,
      intensity: ev.intensity,
      ext: ev.ext
    };
  }
  return ev;
}

// Calculate clip length from events
export fn clipLen(c) {
  if (c.length != null) {
    return c.length;
  }
  let max = null;
  for (ev in c.events) {
    const end = eventEndRat(ev);
    if (end == null) {
      return null;
    }
    if (max == null || end > max) {
      max = end;
    }
  }
  if (max == null) {
    return 0 / 1;
  }
  return max;
}

export fn concat(a, b) {
  const offset = clipLength(a);
  const zero = 0 / 1;
  let events = [];
  for (ev in a.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  for (ev in b.events) {
    events[events.length] = shiftEvent(ev, offset);
  }
  const length = clipLength({ events: events });
  return { events: events, length: length };
}

export fn overlay(a, b) {
  const zero = 0 / 1;
  let events = [];
  for (ev in a.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  for (ev in b.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  let length = null;
  if (a.length != null && b.length != null) {
    length = a.length;
    if (b.length > a.length) {
      length = b.length;
    }
  } else if (a.length != null) {
    length = a.length;
  } else if (b.length != null) {
    length = b.length;
  } else {
    length = clipLength({ events: events });
  }
  return { events: events, length: length };
}

export fn repeat(c, count) {
  if (count <= 0) {
    return { events: [], length: 0 / 1 };
  }
  const len = clipLength(c);
  let events = [];
  for (i in 0..(count - 1)) {
    const offset = len * i;
    for (ev in c.events) {
      events[events.length] = shiftEvent(ev, offset);
    }
  }
  return { events: events, length: len * count };
}

// Slice a clip to extract a time range
// By default, includes events that START within [start, end)
// Use mode: "overlap" to include events that overlap with the range
// Use trim: true to trim events that extend beyond the range
export fn slice(c, startPos, endPos, mode, trim) {
  const start = posToRat(startPos);
  const end = posToRat(endPos);
  let events = [];

  for (ev in c.events) {
    const evStart = eventStartRat(ev);
    if (evStart == null) {
      continue;
    }
    const evEnd = eventEndRat(ev);

    let include = false;

    if (mode == "overlap") {
      // Include events that overlap with [start, end)
      // Event overlaps if: evStart < end AND evEnd > start
      if (evEnd != null) {
        include = evStart < end && evEnd > start;
      } else {
        // Point event - check if it's in range
        include = evStart >= start && evStart < end;
      }
    } else {
      // Default: include events that START within [start, end)
      include = evStart >= start && evStart < end;
    }

    if (!include) {
      continue;
    }

    // Create a copy of the event, shifted to start from 0
    let outEvent = shiftEvent(ev, 0 / 1 - start);

    // Trim events if requested
    if (trim == true && evEnd != null) {
      const newStart = eventStartRat(outEvent);
      const newEnd = newStart + ev.dur;
      const sliceEnd = end - start;

      // Trim if event starts before 0 (only in overlap mode)
      if (newStart < 0 / 1) {
        const cutAmount = 0 / 1 - newStart;
        outEvent = shiftEvent(ev, 0 / 1 - (evStart + cutAmount));
        if (ev.dur != null) {
          outEvent.dur = ev.dur - cutAmount;
        }
      }

      // Trim if event extends beyond slice end
      if (newEnd > sliceEnd && ev.dur != null) {
        const newDur = sliceEnd - eventStartRat(outEvent);
        if (newDur > 0 / 1) {
          outEvent.dur = newDur;
        } else {
          continue;  // Skip events with no duration left
        }
      }
    }

    events[events.length] = outEvent;
  }
  return { events: events, length: end - start };
}

// Simplified slice - just start position, end exclusive (original behavior)
export fn sliceFrom(c, startPos, endPos) {
  return slice(c, startPos, endPos, null, null);
}

// Slice with overlap mode - includes events that overlap with range
export fn sliceOverlap(c, startPos, endPos) {
  return slice(c, startPos, endPos, "overlap", false);
}

// Slice with trimming - includes overlapping events and trims them to fit
export fn sliceTrim(c, startPos, endPos) {
  return slice(c, startPos, endPos, "overlap", true);
}

export fn mapEvents(c, f) {
  let events = [];
  for (ev in c.events) {
    const mapped = f(ev);
    if (mapped != null) {
      events[events.length] = mapped;
    }
  }
  const length = clipLength({ events: events });
  return { events: events, length: length };
}

fn copyTracks(tracks) {
  let out = [];
  for (trk in tracks) {
    out[out.length] = trk;
  }
  return out;
}

export fn withTrack(sc, trk) {
  const tracks = copyTracks(sc.tracks);
  tracks[tracks.length] = trk;
  return {
    meta: sc.meta,
    tempoMap: sc.tempoMap,
    meterMap: sc.meterMap,
    sounds: sc.sounds,
    tracks: tracks,
    markers: sc.markers
  };
}

export fn mapTracks(sc, f) {
  let tracks = [];
  for (trk in sc.tracks) {
    tracks[tracks.length] = f(trk);
  }
  return {
    meta: sc.meta,
    tempoMap: sc.tempoMap,
    meterMap: sc.meterMap,
    sounds: sc.sounds,
    tracks: tracks,
    markers: sc.markers
  };
}

// getTracks - extract all tracks from a score
export fn getTracks(sc) {
  if (sc == null) {
    return [];
  }
  if (sc.tracks != null) {
    return sc.tracks;
  }
  return [];
}

// shift - shift all event positions by offset
export fn shift(c, offset) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = shiftEvent(ev, offset);
  }
  let length = null;
  if (c.length != null) {
    length = c.length;
  }
  return { events: events, length: length };
}

// padTo - extend clip length to at least endPos
export fn padTo(c, endPos) {
  const currentLen = clipLength(c);
  const target = posToRat(endPos);
  let newLength = currentLen;
  if (target != null && (currentLen == null || target > currentLen)) {
    newLength = target;
  }
  return { events: c.events, length: newLength };
}

// updateEvent - create modified copy of event with updated fields
// Usage: updateEvent(event, { start: newStart, dur: newDur, velocity: 0.8, ... })
fn getOrDefault(newVal, oldVal) {
  if (newVal != null) {
    return newVal;
  }
  return oldVal;
}

export fn updateEvent(ev, upd) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      pitch: getOrDefault(upd.pitch, ev.pitch),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      voice: getOrDefault(upd.voice, ev.voice),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      lyric: getOrDefault(upd.lyric, ev.lyric),
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      pitches: getOrDefault(upd.pitches, ev.pitches),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      voice: getOrDefault(upd.voice, ev.voice),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      key: getOrDefault(upd.key, ev.key),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      ext: ev.ext
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      intensity: getOrDefault(upd.intensity, ev.intensity),
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: getOrDefault(upd.start, ev.start),
      kind: getOrDefault(upd.kind, ev.kind),
      data: getOrDefault(upd.data, ev.data),
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: getOrDefault(upd.param, ev.param),
      start: getOrDefault(upd.start, ev.start),
      end: getOrDefault(upd.end, ev.end),
      curve: getOrDefault(upd.curve, ev.curve),
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: getOrDefault(upd.start, ev.pos),
      kind: getOrDefault(upd.kind, ev.kind),
      label: getOrDefault(upd.label, ev.label)
    };
  }
  return ev;
}

// Utility functions

export fn max(a, b) {
  if (a > b) {
    return a;
  }
  return b;
}

export fn min(a, b) {
  if (a < b) {
    return a;
  }
  return b;
}

export fn abs(a) {
  if (a < 0) {
    return 0 - a;
  }
  return a;
}

fn floorNum(value) {
  return value - (value % 1);
}

export fn floor(a) {
  if (a.n != null && a.d != null) {
    const num = a.n / a.d;
    return floorNum(num);
  }
  return floorNum(a);
}

export fn ceil(a) {
  const f = floor(a);
  if (a.n != null && a.d != null) {
    const num = a.n / a.d;
    if (num > f) {
      return f + 1;
    }
    return f;
  }
  if (a > f) {
    return f + 1;
  }
  return f;
}

// length - returns the length of a clip
export fn length(c) {
  return clipLength(c);
}

// ============================================
// Generic Array Functions
// ============================================

// map - apply function to each element
export fn map(items, f) {
  let out = [];
  for (item in items) {
    out[out.length] = f(item);
  }
  return out;
}

// filter - keep elements matching predicate
export fn filter(items, pred) {
  let out = [];
  for (item in items) {
    if (pred(item)) {
      out[out.length] = item;
    }
  }
  return out;
}

// fold - reduce array to single value
export fn fold(items, init, f) {
  let acc = init;
  for (item in items) {
    acc = f(acc, item);
  }
  return acc;
}

// flatMap - map and flatten results
export fn flatMap(items, f) {
  let out = [];
  for (item in items) {
    const result = f(item);
    for (r in result) {
      out[out.length] = r;
    }
  }
  return out;
}

// zip - combine two arrays into array of pairs
export fn zip(a, b) {
  let out = [];
  let len = a.length;
  if (b.length < len) {
    len = b.length;
  }
  for (i in 0..(len - 1)) {
    out[out.length] = [a[i], b[i]];
  }
  return out;
}

// enumerate - add indices to elements
export fn enumerate(items) {
  let out = [];
  let i = 0;
  for (item in items) {
    out[out.length] = [i, item];
    i = i + 1;
  }
  return out;
}

// range - generate sequence of integers
export fn range(start, end, step) {
  let stepVal = step;
  if (stepVal == null) {
    stepVal = 1;
  }
  let out = [];
  if (stepVal > 0) {
    let idx = start;
    for (_ in 0..10000) {
      if (idx >= end) {
        return out;
      }
      out[out.length] = idx;
      idx = idx + stepVal;
    }
  } else if (stepVal < 0) {
    let idx = start;
    for (_ in 0..10000) {
      if (idx <= end) {
        return out;
      }
      out[out.length] = idx;
      idx = idx + stepVal;
    }
  }
  return out;
}

// find - find first element matching predicate
export fn find(items, pred) {
  for (item in items) {
    if (pred(item)) {
      return item;
    }
  }
  return null;
}

// findIndex - find index of first matching element
export fn findIndex(items, pred) {
  let i = 0;
  for (item in items) {
    if (pred(item)) {
      return i;
    }
    i = i + 1;
  }
  return -1;
}

// every - check if all elements match predicate
export fn every(items, pred) {
  for (item in items) {
    if (!pred(item)) {
      return false;
    }
  }
  return true;
}

// some - check if any element matches predicate
export fn some(items, pred) {
  for (item in items) {
    if (pred(item)) {
      return true;
    }
  }
  return false;
}

// includes - check if array contains value
export fn includes(items, value) {
  for (item in items) {
    if (item == value) {
      return true;
    }
  }
  return false;
}

// take - take first n elements
export fn take(items, n) {
  let out = [];
  let count = 0;
  for (item in items) {
    if (count >= n) {
      return out;
    }
    out[out.length] = item;
    count = count + 1;
  }
  return out;
}

// drop - drop first n elements
export fn drop(items, n) {
  let out = [];
  let count = 0;
  for (item in items) {
    if (count >= n) {
      out[out.length] = item;
    }
    count = count + 1;
  }
  return out;
}

// ============================================
// Extended Clip Operations
// ============================================

// merge - overlay multiple clips at once
export fn merge(clips) {
  if (clips.length == 0) {
    return { events: [], length: 0 / 1 };
  }
  let result = clips[0];
  for (i in 1..(clips.length - 1)) {
    result = overlay(result, clips[i]);
  }
  return result;
}

// reverse - reverse the temporal order of events
export fn reverse(c) {
  const len = clipLength(c);
  if (len == null) {
    return c;
  }
  let events = [];
  for (ev in c.events) {
    const start = eventStartRat(ev);
    const evEnd = eventEndRat(ev);
    if (start == null || evEnd == null) {
      events[events.length] = ev;
      continue;
    }
    const dur = evEnd - start;
    const newStart = len - evEnd;
    events[events.length] = shiftEvent(updateEvent(ev, { start: newStart }), 0 / 1);
  }
  return { events: events, length: len };
}

// invert - invert pitches around an axis
export fn invert(c, axis) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const newPitch = axis * 2 - ev.pitch;
      events[events.length] = updateEvent(ev, { pitch: newPitch });
    } else if (ev.type == "chord") {
      let newPitches = [];
      for (p in ev.pitches) {
        newPitches[newPitches.length] = axis * 2 - p;
      }
      events[events.length] = updateEvent(ev, { pitches: newPitches });
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// retrograde - alias for reverse (music theory term)
export fn retrograde(c) {
  return reverse(c);
}

// split - split clip at given positions into multiple clips
export fn split(c, positions) {
  if (positions.length == 0) {
    return [c];
  }
  // Sort positions
  let sorted = [];
  for (p in positions) {
    sorted[sorted.length] = posToRat(p);
  }
  // Sort using native O(n log n) sort
  sorted = sort(sorted);

  let result = [];
  let prevPos = 0 / 1;
  for (pos in sorted) {
    if (pos > prevPos) {
      result[result.length] = slice(c, prevPos, pos);
    }
    prevPos = pos;
  }
  // Add remaining
  const len = clipLength(c);
  if (len != null && prevPos < len) {
    result[result.length] = slice(c, prevPos, len);
  }
  return result;
}

// augment - double all durations (augmentation in music theory)
export fn augment(c, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
      const newStart = eventStartRat(ev) * f;
      const newDur = ev.dur * f;
      events[events.length] = updateEvent(ev, { start: newStart, dur: newDur });
    } else if (ev.type == "automation") {
      const newStart = eventStartRat(ev) * f;
      const newEnd = posToRat(ev.end) * f;
      events[events.length] = updateEvent(ev, { start: newStart, end: newEnd });
    } else if (ev.type == "marker") {
      const newPos = posToRat(ev.pos) * f;
      events[events.length] = { type: "marker", pos: newPos, kind: ev.kind, label: ev.label };
    } else if (ev.type == "control") {
      const newStart = eventStartRat(ev) * f;
      events[events.length] = updateEvent(ev, { start: newStart });
    } else {
      events[events.length] = ev;
    }
  }
  let newLen = null;
  if (c.length != null) {
    newLen = c.length * f;
  }
  return { events: events, length: newLen };
}

// diminish - halve all durations (diminution in music theory)
export fn diminish(c, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }
  return augment(c, 1 / f);
}
`;

export const STDLIB_COUNTERPOINT = `// std:counterpoint (v5.5)
// Species counterpoint and voice leading utilities
// Based on traditional rules from Fux's Gradus ad Parnassum

// ============================================
// Intervals
// ============================================

// Interval classifications
export const PERFECT_UNISON = 0;
export const MINOR_SECOND = 1;
export const MAJOR_SECOND = 2;
export const MINOR_THIRD = 3;
export const MAJOR_THIRD = 4;
export const PERFECT_FOURTH = 5;
export const TRITONE = 6;
export const PERFECT_FIFTH = 7;
export const MINOR_SIXTH = 8;
export const MAJOR_SIXTH = 9;
export const MINOR_SEVENTH = 10;
export const MAJOR_SEVENTH = 11;
export const PERFECT_OCTAVE = 12;

// Consonance types
export fn isPerfectConsonance(interval) {
  const i = interval % 12;
  return i == 0 || i == 7 || i == 12;
}

export fn isImperfectConsonance(interval) {
  const i = interval % 12;
  return i == 3 || i == 4 || i == 8 || i == 9;
}

export fn isConsonance(interval) {
  return isPerfectConsonance(interval) || isImperfectConsonance(interval);
}

export fn isDissonance(interval) {
  return !isConsonance(interval);
}

// Get interval between two pitches
export fn interval(pitch1, pitch2) {
  let diff = pitch2 - pitch1;
  if (diff < 0) {
    diff = -diff;
  }
  return diff;
}

// Get interval class (mod 12)
export fn intervalClass(pitch1, pitch2) {
  return interval(pitch1, pitch2) % 12;
}

// ============================================
// Motion Types
// ============================================

export const MOTION_PARALLEL = "parallel";
export const MOTION_SIMILAR = "similar";
export const MOTION_CONTRARY = "contrary";
export const MOTION_OBLIQUE = "oblique";

// Determine motion type between two voice pairs
export fn motionType(cf1, cf2, cp1, cp2) {
  const cfMotion = cf2 - cf1;
  const cpMotion = cp2 - cp1;

  if (cfMotion == 0 && cpMotion == 0) {
    return MOTION_OBLIQUE;
  } else if (cfMotion == 0 || cpMotion == 0) {
    return MOTION_OBLIQUE;
  } else if (cfMotion == cpMotion) {
    return MOTION_PARALLEL;
  } else if ((cfMotion > 0 && cpMotion > 0) || (cfMotion < 0 && cpMotion < 0)) {
    return MOTION_SIMILAR;
  } else {
    return MOTION_CONTRARY;
  }
}

// Check for parallel fifths
export fn hasParallelFifths(cf1, cf2, cp1, cp2) {
  const int1 = intervalClass(cf1, cp1);
  const int2 = intervalClass(cf2, cp2);
  const motion = motionType(cf1, cf2, cp1, cp2);

  return int1 == 7 && int2 == 7 && motion == MOTION_PARALLEL;
}

// Check for parallel octaves
export fn hasParallelOctaves(cf1, cf2, cp1, cp2) {
  const int1 = intervalClass(cf1, cp1);
  const int2 = intervalClass(cf2, cp2);
  const motion = motionType(cf1, cf2, cp1, cp2);

  return (int1 == 0 || int1 == 12) && (int2 == 0 || int2 == 12) && motion == MOTION_PARALLEL;
}

// Check for hidden (direct) fifths/octaves
export fn hasHiddenFifths(cf1, cf2, cp1, cp2) {
  const int2 = intervalClass(cf2, cp2);
  const motion = motionType(cf1, cf2, cp1, cp2);

  return int2 == 7 && motion == MOTION_SIMILAR;
}

export fn hasHiddenOctaves(cf1, cf2, cp1, cp2) {
  const int2 = intervalClass(cf2, cp2);
  const motion = motionType(cf1, cf2, cp1, cp2);

  return (int2 == 0 || int2 == 12) && motion == MOTION_SIMILAR;
}

// ============================================
// First Species (Note against Note)
// ============================================

// Validate first species counterpoint
export fn validateFirstSpecies(cantusFirmus, counterpoint) {
  let errors = [];

  if (cantusFirmus.length != counterpoint.length) {
    errors[errors.length] = {
      type: "length",
      message: "Cantus firmus and counterpoint must be same length"
    };
    return errors;
  }

  for (i in 0..(cantusFirmus.length - 1)) {
    const cf = cantusFirmus[i];
    const cp = counterpoint[i];
    const int = intervalClass(cf, cp);

    // Check consonance
    if (!isConsonance(int)) {
      errors[errors.length] = {
        type: "dissonance",
        position: i,
        interval: int,
        message: "Dissonance not allowed in first species"
      };
    }

    // Check parallels (except first note)
    if (i > 0) {
      const prevCf = cantusFirmus[i - 1];
      const prevCp = counterpoint[i - 1];

      if (hasParallelFifths(prevCf, cf, prevCp, cp)) {
        errors[errors.length] = {
          type: "parallel_fifths",
          position: i,
          message: "Parallel fifths not allowed"
        };
      }

      if (hasParallelOctaves(prevCf, cf, prevCp, cp)) {
        errors[errors.length] = {
          type: "parallel_octaves",
          position: i,
          message: "Parallel octaves not allowed"
        };
      }
    }
  }

  // Check beginning and ending
  const firstInt = intervalClass(cantusFirmus[0], counterpoint[0]);
  if (firstInt != 0 && firstInt != 7 && firstInt != 12) {
    errors[errors.length] = {
      type: "opening",
      message: "Must begin with perfect consonance (unison, fifth, or octave)"
    };
  }

  const lastIdx = cantusFirmus.length - 1;
  const lastInt = intervalClass(cantusFirmus[lastIdx], counterpoint[lastIdx]);
  if (lastInt != 0 && lastInt != 12) {
    errors[errors.length] = {
      type: "cadence",
      message: "Must end on unison or octave"
    };
  }

  return errors;
}

// Generate first species options for a note
export fn firstSpeciesOptions(cfNote, prevCf, prevCp, range) {
  let options = [];
  let low = range.low;
  if (low == null) {
    low = cfNote - 12;
  }
  let high = range.high;
  if (high == null) {
    high = cfNote + 19;
  }

  for (pitch in low..high) {
    const int = intervalClass(cfNote, pitch);

    // Must be consonant
    if (!isConsonance(int)) {
      continue;
    }

    // Check parallels if not first note
    if (prevCf != null && prevCp != null) {
      if (hasParallelFifths(prevCf, cfNote, prevCp, pitch)) {
        continue;
      }
      if (hasParallelOctaves(prevCf, cfNote, prevCp, pitch)) {
        continue;
      }
    }

    options[options.length] = pitch;
  }

  return options;
}

// ============================================
// Second Species (Two notes against one)
// ============================================

// Validate second species
export fn validateSecondSpecies(cantusFirmus, counterpoint) {
  let errors = [];

  // Counterpoint should be 2x length of CF
  if (counterpoint.length != cantusFirmus.length * 2) {
    errors[errors.length] = {
      type: "length",
      message: "Counterpoint must be twice the length of cantus firmus"
    };
    return errors;
  }

  for (i in 0..(cantusFirmus.length - 1)) {
    const cf = cantusFirmus[i];
    const cpDownbeat = counterpoint[i * 2];
    const cpUpbeat = counterpoint[i * 2 + 1];

    // Downbeat must be consonant
    const downbeatInt = intervalClass(cf, cpDownbeat);
    if (!isConsonance(downbeatInt)) {
      errors[errors.length] = {
        type: "dissonance",
        position: i * 2,
        message: "Downbeat must be consonant"
      };
    }

    // Upbeat can be dissonant if passing tone
    const upbeatInt = intervalClass(cf, cpUpbeat);
    if (isDissonance(upbeatInt)) {
      // Check if it's a passing tone
      if (i < cantusFirmus.length - 1) {
        const nextCp = counterpoint[(i + 1) * 2];
        const isStepwise = (cpUpbeat - cpDownbeat == 1 || cpUpbeat - cpDownbeat == -1 ||
                           cpUpbeat - cpDownbeat == 2 || cpUpbeat - cpDownbeat == -2);
        const continuesDirection = (cpUpbeat - cpDownbeat) * (nextCp - cpUpbeat) > 0;

        if (!(isStepwise && continuesDirection)) {
          errors[errors.length] = {
            type: "dissonance",
            position: i * 2 + 1,
            message: "Upbeat dissonance must be passing tone"
          };
        }
      }
    }
  }

  return errors;
}

// ============================================
// Third Species (Four notes against one)
// ============================================

// Check if note is a passing tone
export fn isPassingTone(prev, current, next) {
  const dir1 = current - prev;
  const dir2 = next - current;

  // Same direction, stepwise
  const isStepwise = (dir1 >= -2 && dir1 <= 2 && dir1 != 0);
  const sameDirection = dir1 * dir2 > 0;

  return isStepwise && sameDirection;
}

// Check if note is a neighbor tone
export fn isNeighborTone(prev, current, next) {
  return prev == next && (current == prev + 1 || current == prev - 1 ||
                          current == prev + 2 || current == prev - 2);
}

// Validate third species
export fn validateThirdSpecies(cantusFirmus, counterpoint) {
  let errors = [];

  if (counterpoint.length != cantusFirmus.length * 4) {
    errors[errors.length] = {
      type: "length",
      message: "Counterpoint must be 4x length of cantus firmus"
    };
    return errors;
  }

  for (i in 0..(cantusFirmus.length - 1)) {
    const cf = cantusFirmus[i];

    for (j in 0..3) {
      const idx = i * 4 + j;
      const cp = counterpoint[idx];
      const int = intervalClass(cf, cp);

      // First beat must be consonant
      if (j == 0 && !isConsonance(int)) {
        errors[errors.length] = {
          type: "dissonance",
          position: idx,
          message: "First beat must be consonant"
        };
      }

      // Other beats: dissonance allowed as passing/neighbor
      if (j > 0 && isDissonance(int)) {
        const prev = counterpoint[idx - 1];
        const hasNext = idx + 1 < counterpoint.length;

        if (hasNext) {
          const next = counterpoint[idx + 1];
          const isPassing = isPassingTone(prev, cp, next);
          const isNeighbor = isNeighborTone(prev, cp, next);

          if (!isPassing && !isNeighbor) {
            errors[errors.length] = {
              type: "dissonance",
              position: idx,
              message: "Dissonance must be passing or neighbor tone"
            };
          }
        }
      }
    }
  }

  return errors;
}

// ============================================
// Fourth Species (Syncopation/Suspensions)
// ============================================

// Suspension types
export const SUSPENSION_4_3 = "4-3";
export const SUSPENSION_7_6 = "7-6";
export const SUSPENSION_9_8 = "9-8";
export const SUSPENSION_2_3 = "2-3";  // Bass suspension

// Create suspension
export fn suspension(preparation, dissonance, resolution) {
  return {
    type: "suspension",
    preparation: preparation,
    dissonance: dissonance,
    resolution: resolution
  };
}

// Validate fourth species
export fn validateFourthSpecies(cantusFirmus, counterpoint) {
  let errors = [];

  // Counterpoint is syncopated (tied notes)
  if (counterpoint.length != cantusFirmus.length * 2) {
    errors[errors.length] = {
      type: "length",
      message: "Counterpoint must be 2x length for syncopation"
    };
    return errors;
  }

  for (i in 0..(cantusFirmus.length - 1)) {
    const cf = cantusFirmus[i];
    const cpWeak = counterpoint[i * 2];      // Weak beat (tied from previous)
    const cpStrong = counterpoint[i * 2 + 1]; // Strong beat (new note)

    // Weak beat can be dissonant (suspension)
    const weakInt = intervalClass(cf, cpWeak);
    if (isDissonance(weakInt)) {
      // Must resolve down by step
      const resolution = cpStrong - cpWeak;
      if (resolution != -1 && resolution != -2) {
        errors[errors.length] = {
          type: "resolution",
          position: i * 2,
          message: "Suspension must resolve down by step"
        };
      }
    }

    // Strong beat must be consonant
    const strongInt = intervalClass(cf, cpStrong);
    if (!isConsonance(strongInt)) {
      errors[errors.length] = {
        type: "dissonance",
        position: i * 2 + 1,
        message: "Strong beat must be consonant"
      };
    }
  }

  return errors;
}

// ============================================
// Fifth Species (Florid Counterpoint)
// ============================================

// Create florid counterpoint structure
export fn floridCounterpoint(measures) {
  return {
    type: "florid",
    measures: measures
  };
}

// Note value types for fifth species
export const WHOLE = 4;
export const HALF = 2;
export const QUARTER = 1;

// Create a measure of florid counterpoint
export fn floridMeasure(notes) {
  // notes: array of {pitch, duration} objects
  return {
    notes: notes,
    totalDuration: sumDurations(notes)
  };
}

fn sumDurations(notes) {
  let total = 0;
  for (n in notes) {
    total = total + n.duration;
  }
  return total;
}

// ============================================
// Voice Leading
// ============================================

// Calculate voice leading distance
export fn voiceLeadingDistance(chord1, chord2) {
  let totalDistance = 0;
  const len = chord1.length;

  for (i in 0..(len - 1)) {
    let diff = chord2[i] - chord1[i];
    if (diff < 0) {
      diff = -diff;
    }
    totalDistance = totalDistance + diff;
  }

  return totalDistance;
}

// Find smoothest voice leading between chords
export fn smoothestVoiceLeading(chord1, chord2Options) {
  let best = null;
  let bestDistance = 999;

  for (option in chord2Options) {
    const dist = voiceLeadingDistance(chord1, option);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = option;
    }
  }

  return best;
}

// Check voice crossing
export fn hasVoiceCrossing(voices) {
  for (i in 0..(voices.length - 2)) {
    if (voices[i] > voices[i + 1]) {
      return true;
    }
  }
  return false;
}

// Check voice overlap (voice moves past previous position of adjacent voice)
export fn hasVoiceOverlap(voices1, voices2) {
  for (i in 0..(voices1.length - 2)) {
    // Upper voice shouldn't go below previous lower voice position
    if (voices2[i + 1] < voices1[i]) {
      return true;
    }
    // Lower voice shouldn't go above previous upper voice position
    if (voices2[i] > voices1[i + 1]) {
      return true;
    }
  }
  return false;
}

// ============================================
// Cantus Firmus
// ============================================

// Create cantus firmus
export fn cantusFirmus(pitches, mode) {
  return {
    type: "cantusFirmus",
    pitches: pitches,
    mode: mode,
    length: pitches.length
  };
}

// Validate cantus firmus rules
export fn validateCantusFirmus(cf) {
  let errors = [];
  const pitches = cf.pitches;

  // Should be 8-16 notes
  if (pitches.length < 8 || pitches.length > 16) {
    errors[errors.length] = {
      type: "length",
      message: "Cantus firmus should be 8-16 notes"
    };
  }

  // Should begin and end on finalis
  const finalis = pitches[0];
  if (pitches[pitches.length - 1] != finalis) {
    errors[errors.length] = {
      type: "cadence",
      message: "Must end on the same note as beginning (finalis)"
    };
  }

  // Check for large leaps
  for (i in 1..(pitches.length - 1)) {
    const leap = pitches[i] - pitches[i - 1];
    let absLeap = leap;
    if (absLeap < 0) {
      absLeap = -absLeap;
    }

    if (absLeap > 8) {
      errors[errors.length] = {
        type: "leap",
        position: i,
        message: "Leap larger than minor sixth not recommended"
      };
    }

    // Large leaps should be followed by contrary motion
    if (absLeap >= 5 && i < pitches.length - 1) {
      const nextMotion = pitches[i + 1] - pitches[i];
      if (leap * nextMotion > 0) {
        errors[errors.length] = {
          type: "leap_recovery",
          position: i,
          message: "Large leap should be followed by contrary motion"
        };
      }
    }
  }

  // Find climax (highest note)
  let climax = pitches[0];
  let climaxCount = 0;
  for (p in pitches) {
    if (p > climax) {
      climax = p;
      climaxCount = 1;
    } else if (p == climax) {
      climaxCount = climaxCount + 1;
    }
  }

  if (climaxCount > 1) {
    errors[errors.length] = {
      type: "climax",
      message: "Climax note should appear only once"
    };
  }

  return errors;
}

// ============================================
// Modal Counterpoint
// ============================================

// Church modes for counterpoint
export fn modeDorian() {
  return {
    name: "dorian",
    finalis: 0,
    scale: [0, 2, 3, 5, 7, 9, 10],
    dominant: 7  // Fifth degree
  };
}

export fn modePhrygian() {
  return {
    name: "phrygian",
    finalis: 0,
    scale: [0, 1, 3, 5, 7, 8, 10],
    dominant: 7
  };
}

export fn modeLydian() {
  return {
    name: "lydian",
    finalis: 0,
    scale: [0, 2, 4, 6, 7, 9, 11],
    dominant: 7
  };
}

export fn modeMixolydian() {
  return {
    name: "mixolydian",
    finalis: 0,
    scale: [0, 2, 4, 5, 7, 9, 10],
    dominant: 7
  };
}

export fn modeAeolian() {
  return {
    name: "aeolian",
    finalis: 0,
    scale: [0, 2, 3, 5, 7, 8, 10],
    dominant: 7
  };
}

export fn modeIonian() {
  return {
    name: "ionian",
    finalis: 0,
    scale: [0, 2, 4, 5, 7, 9, 11],
    dominant: 7
  };
}

// Check if pitch is in mode
export fn isInMode(pitch, mode, tonic) {
  const pc = (pitch - tonic) % 12;
  let normalizedPc = pc;
  if (normalizedPc < 0) {
    normalizedPc = normalizedPc + 12;
  }

  for (degree in mode.scale) {
    if (degree == normalizedPc) {
      return true;
    }
  }
  return false;
}

// ============================================
// Cadences
// ============================================

export const CADENCE_AUTHENTIC = "authentic";
export const CADENCE_PLAGAL = "plagal";
export const CADENCE_HALF = "half";
export const CADENCE_DECEPTIVE = "deceptive";
export const CADENCE_PHRYGIAN = "phrygian";

// Create modal cadence
export fn modalCadence(type, voices) {
  return {
    type: type,
    voices: voices
  };
}

// Clausula vera (true cadence) - stepwise contrary motion to octave/unison
export fn clausulaVera(upperApproach, lowerApproach) {
  return {
    type: "clausulaVera",
    upper: upperApproach,  // e.g., [leading tone, finalis]
    lower: lowerApproach   // e.g., [supertonic, finalis]
  };
}

// ============================================
// Imitation
// ============================================

// Create imitative entry
export fn imitation(subject, intervalOfImitation, timeDelay) {
  return {
    type: "imitation",
    subject: subject,
    interval: intervalOfImitation,
    delay: timeDelay
  };
}

// Transpose subject for imitation
export fn transposeSubject(subject, interval) {
  let result = [];
  for (pitch in subject) {
    result[result.length] = pitch + interval;
  }
  return result;
}

// Create stretto (overlapping entries)
export fn stretto(subject, entries) {
  // entries: array of {voice, interval, delay}
  return {
    type: "stretto",
    subject: subject,
    entries: entries
  };
}

// ============================================
// Invertible Counterpoint
// ============================================

// Check if counterpoint is invertible at the octave
export fn isInvertibleAtOctave(line1, line2) {
  for (i in 0..(line1.length - 1)) {
    const int = intervalClass(line1[i], line2[i]);

    // Fifths become fourths (dissonant in upper voice)
    if (int == 7) {
      return false;
    }
  }
  return true;
}

// Check if counterpoint is invertible at the tenth
export fn isInvertibleAtTenth(line1, line2) {
  for (i in 0..(line1.length - 1)) {
    const int = intervalClass(line1[i], line2[i]);

    // Thirds and sixths work well
    // Avoid seconds and sevenths
    if (int == 1 || int == 2 || int == 10 || int == 11) {
      return false;
    }
  }
  return true;
}

// Invert counterpoint at interval
export fn invertCounterpoint(upperLine, lowerLine, inversionInterval) {
  // Swap voices and transpose
  let newUpper = [];
  let newLower = [];

  for (i in 0..(upperLine.length - 1)) {
    newUpper[i] = lowerLine[i] + inversionInterval;
    newLower[i] = upperLine[i];
  }

  return {
    upper: newUpper,
    lower: newLower
  };
}

// ============================================
// Double/Triple Counterpoint
// ============================================

// Create double counterpoint structure
export fn doubleCounterpoint(subject, countersubject) {
  return {
    type: "doubleCounterpoint",
    subject: subject,
    countersubject: countersubject
  };
}

// Create triple counterpoint
export fn tripleCounterpoint(line1, line2, line3) {
  return {
    type: "tripleCounterpoint",
    lines: [line1, line2, line3]
  };
}

// Get all permutations for triple counterpoint
export fn triplePermutations(tc) {
  const lines = tc.lines;
  return [
    [lines[0], lines[1], lines[2]],
    [lines[0], lines[2], lines[1]],
    [lines[1], lines[0], lines[2]],
    [lines[1], lines[2], lines[0]],
    [lines[2], lines[0], lines[1]],
    [lines[2], lines[1], lines[0]]
  ];
}

// ============================================
// Utility Functions
// ============================================

// Find the highest note
export fn findClimax(pitches) {
  let highest = pitches[0];
  let position = 0;

  for (i in 0..(pitches.length - 1)) {
    if (pitches[i] > highest) {
      highest = pitches[i];
      position = i;
    }
  }

  return {
    pitch: highest,
    position: position
  };
}

// Calculate melodic range
export fn melodicRange(pitches) {
  let lowest = pitches[0];
  let highest = pitches[0];

  for (p in pitches) {
    if (p < lowest) {
      lowest = p;
    }
    if (p > highest) {
      highest = p;
    }
  }

  return {
    lowest: lowest,
    highest: highest,
    range: highest - lowest
  };
}

// Count stepwise motion vs leaps
export fn analyzeMotion(pitches) {
  let steps = 0;
  let leaps = 0;

  for (i in 1..(pitches.length - 1)) {
    const motion = pitches[i] - pitches[i - 1];
    let absMotion = motion;
    if (absMotion < 0) {
      absMotion = -absMotion;
    }

    if (absMotion <= 2) {
      steps = steps + 1;
    } else {
      leaps = leaps + 1;
    }
  }

  return {
    steps: steps,
    leaps: leaps,
    ratio: steps / (steps + leaps)
  };
}
`;

export const STDLIB_CURVES = `// std:curves (v4)

fn makeCurve(points) {
  return { kind: "piecewiseLinear", points: points };
}

export fn linear(a, b, steps) {
  let count = steps;
  if (count < 2) {
    count = 2;
  }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const v = a + (b - a) * ratio;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

export fn easeInOut(a, b, steps) {
  let count = steps;
  if (count < 2) {
    count = 2;
  }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const eased = ratio * ratio * (3 - 2 * ratio);
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

export fn piecewise(points) {
  let out = [];
  for (p in points) {
    if (p.length != null) {
      const ratio = p[0];
      const v = p[1];
      out[out.length] = { t: ratio, v: v };
    } else if (p.t != null && p.v != null) {
      out[out.length] = { t: p.t, v: p.v };
    }
  }
  return makeCurve(out);
}

// Ease in (acceleration) - slow start, fast end
export fn easeIn(a, b, steps) {
  let count = steps;
  if (count < 2) { count = 2; }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const eased = ratio * ratio;
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Ease out (deceleration) - fast start, slow end
export fn easeOut(a, b, steps) {
  let count = steps;
  if (count < 2) { count = 2; }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const eased = 1 - (1 - ratio) * (1 - ratio);
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Exponential curve (useful for fade-outs, natural decays)
// factor controls steepness (default 3)
export fn exponential(a, b, steps, factor) {
  let count = steps;
  if (count < 2) { count = 2; }
  let f = factor;
  if (f == null) { f = 3; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Normalized exponential: (e^(ratio*f) - 1) / (e^f - 1)
    let eased = ratio;
    if (f != 0) {
      let expVal = 1;
      let expF = 1;
      // Approximate e^x using Taylor series
      let term = 1;
      for (k in 1..10) {
        term = term * (ratio * f) / k;
        expVal = expVal + term;
      }
      term = 1;
      for (k in 1..10) {
        term = term * f / k;
        expF = expF + term;
      }
      if (expF > 1.001) {
        eased = (expVal - 1) / (expF - 1);
      }
    }
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Logarithmic curve (inverse of exponential, useful for fade-ins)
export fn logarithmic(a, b, steps, factor) {
  let count = steps;
  if (count < 2) { count = 2; }
  let f = factor;
  if (f == null) { f = 3; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Approximate log curve: log(1 + ratio*f) / log(1+f)
    let eased = ratio;
    if (f > 0) {
      // Use approximation: 1 - (1-ratio)^(1/f) for log-like curve
      let invRatio = 1 - ratio;
      let powered = invRatio;
      // Approximate x^(1/f) = x for f=1, sqrt for f=2, etc.
      if (f >= 2) {
        // Use Newton's method approximation for roots
        powered = invRatio;
        for (iter in 0..4) {
          let product = powered;
          for (p in 1..(f - 1)) {
            product = product * powered;
          }
          powered = powered - (product - invRatio) / (f * product / powered);
        }
      }
      eased = 1 - powered;
    }
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Sinusoidal curve (good for LFO-like modulation)
// Uses one half of a sine wave
export fn sine(a, b, steps) {
  let count = steps;
  if (count < 2) { count = 2; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Approximate sin using Taylor series for sin(ratio * PI/2)
    const x = ratio * 1.5708;  // PI/2 ≈ 1.5708
    let sinVal = x;
    let term = x;
    for (k in 1..6) {
      term = 0 - term * x * x / ((2 * k) * (2 * k + 1));
      sinVal = sinVal + term;
    }
    const v = a + (b - a) * sinVal;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Full sine wave (for cyclic modulation)
// cycles: number of complete sine waves (default 1)
export fn sineWave(a, b, steps, cycles) {
  let count = steps;
  if (count < 2) { count = 2; }
  let c = cycles;
  if (c == null) { c = 1; }

  let points = [];
  const mid = (a + b) / 2;
  const amp = (b - a) / 2;

  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Approximate sin(2*PI*ratio*cycles)
    const x = ratio * c * 6.2832;  // 2*PI ≈ 6.2832
    let sinVal = x;
    let term = x;
    for (k in 1..10) {
      term = 0 - term * x * x / ((2 * k) * (2 * k + 1));
      sinVal = sinVal + term;
    }
    const v = mid + amp * sinVal;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Step function (instant change)
// changePoint: where the step occurs (0.0-1.0, default 0.5)
export fn step(a, b, changePoint) {
  let cp = changePoint;
  if (cp == null) { cp = 0.5; }
  if (cp <= 0) { cp = 0.001; }
  if (cp >= 1) { cp = 0.999; }

  return makeCurve([
    { t: 0, v: a },
    { t: cp - 0.001, v: a },
    { t: cp, v: b },
    { t: 1, v: b }
  ]);
}

// Hold curve (constant value, then optional jump at end)
export fn hold(value) {
  return makeCurve([
    { t: 0, v: value },
    { t: 1, v: value }
  ]);
}

// S-curve with configurable steepness
// steepness controls how sharp the transition is (default 5)
export fn sCurve(a, b, steps, steepness) {
  let count = steps;
  if (count < 2) { count = 2; }
  let k = steepness;
  if (k == null) { k = 5; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Sigmoid: 1 / (1 + e^(-k*(x-0.5)))
    const x = k * (ratio - 0.5);
    let expVal = 1;
    let term = 1;
    let negX = 0 - x;
    for (j in 1..10) {
      term = term * negX / j;
      expVal = expVal + term;
    }
    const sigmoid = 1 / (1 + expVal);

    // Normalize to 0-1 range
    let sig0 = 1;
    let term0 = 1;
    let neg05 = k * 0.5;
    for (j in 1..10) {
      term0 = term0 * neg05 / j;
      sig0 = sig0 + term0;
    }
    const base = 1 / (1 + sig0);
    const scale = 1 - 2 * base;

    const eased = (sigmoid - base) / scale;
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Quadratic bezier curve
// control: the control point value (default: midpoint)
export fn bezier(a, b, steps, control) {
  let count = steps;
  if (count < 2) { count = 2; }
  let c = control;
  if (c == null) { c = (a + b) / 2; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Quadratic bezier: (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
    const invT = 1 - ratio;
    const v = invT * invT * a + 2 * invT * ratio * c + ratio * ratio * b;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

// Bounce curve (good for playful effects)
export fn bounce(a, b, steps, bounces) {
  let count = steps;
  if (count < 2) { count = 2; }
  let numBounces = bounces;
  if (numBounces == null) { numBounces = 3; }

  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    // Damped bounce: target - amplitude * cos(freq * ratio) * decay
    const decay = 1 - ratio;
    const freq = numBounces * 6.2832;
    const x = freq * ratio;

    // Approximate cos using Taylor series
    let cosVal = 1;
    let term = 1;
    for (k in 1..8) {
      term = 0 - term * x * x / ((2 * k - 1) * (2 * k));
      cosVal = cosVal + term;
    }

    const envelope = decay * decay;
    const v = b - (b - a) * cosVal * envelope;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}
`;

export const STDLIB_DRUMS = `// std:drums (v4)

export const kick = "kick";
export const snare = "snare";
export const hhc = "hhc";
export const hho = "hho";
export const crash = "crash";
export const ride = "ride";
export const tom1 = "tom1";
export const tom2 = "tom2";
export const tom3 = "tom3";
export const clap = "clap";
export const perc1 = "perc1";
export const perc2 = "perc2";

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  return ev;
}

export fn fourOnFloor(bars, unit) {
  let count = bars;
  if (count < 1) {
    count = 1;
  }
  const beats = count * 4;
  let events = [];
  for (i in 0..(beats - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: unit * i,
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
  }
  return { events: events, length: unit * beats };
}

export fn basicRock(bars, unit) {
  let count = bars;
  if (count < 1) {
    count = 1;
  }
  let events = [];
  for (bar in 0..(count - 1)) {
    const base = unit * (bar * 4);
    const beats = [0, 1, 2, 3];
    for (b in beats) {
      events[events.length] = {
        type: "drumHit",
        start: base + unit * b,
        dur: unit,
        key: "hhc",
        velocity: 0.5
      };
    }
    events[events.length] = {
      type: "drumHit",
      start: base + (0 / 1),
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit,
      dur: unit,
      key: "snare",
      velocity: 0.8
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit * 2,
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit * 3,
      dur: unit,
      key: "snare",
      velocity: 0.8
    };
  }
  return { events: events, length: unit * (count * 4) };
}

export fn fill(drumKind, len) {
  let key = drumKind;
  if (key == null) {
    key = "snare";
  }
  const hits = 4;
  const unit = len / hits;
  let events = [];
  for (i in 0..(hits - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: unit * i,
      dur: unit,
      key: key,
      velocity: 0.7
    };
  }
  return { events: events, length: len };
}

export fn ghost(c, amount) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "drumHit" || ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      let vel = out.velocity;
      if (vel == null) {
        vel = 1;
      }
      out.velocity = vel * amount;
      events[events.length] = out;
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }
  return { events: events, length: c.length };
}
`;

export const STDLIB_DYNAMICS = `// std:dynamics (v4)
// Standard dynamic levels and crescendo/diminuendo generators

use std:core { cloneEvent, posToRat, clipLen };

// ============================================================
// Dynamic Level Constants (velocity 0.0 - 1.0)
// ============================================================

// Piano dynamics
export const pppp = 0.05;   // pianissississimo
export const ppp = 0.12;    // pianississimo
export const pp = 0.20;     // pianissimo
export const p = 0.30;      // piano
export const mp = 0.45;     // mezzo-piano

// Forte dynamics
export const mf = 0.60;     // mezzo-forte
export const f = 0.75;      // forte
export const ff = 0.88;     // fortissimo
export const fff = 0.95;    // fortississimo
export const ffff = 1.0;    // fortissississimo

// Special dynamics
export const sfz = 0.95;    // sforzando (sudden accent)
export const rfz = 0.85;    // rinforzando (reinforced)
export const fp = 0.75;     // forte-piano (loud then soft)
export const sfp = 0.90;    // sforzando-piano

// ============================================================
// Dynamic Name Mapping
// ============================================================

export fn dynamicName(level) {
  if (level <= 0.08) { return "pppp"; }
  if (level <= 0.16) { return "ppp"; }
  if (level <= 0.25) { return "pp"; }
  if (level <= 0.37) { return "p"; }
  if (level <= 0.52) { return "mp"; }
  if (level <= 0.67) { return "mf"; }
  if (level <= 0.80) { return "f"; }
  if (level <= 0.92) { return "ff"; }
  if (level <= 0.97) { return "fff"; }
  return "ffff";
}

export fn parseDynamic(name) {
  if (name == "pppp") { return pppp; }
  if (name == "ppp") { return ppp; }
  if (name == "pp") { return pp; }
  if (name == "p") { return p; }
  if (name == "mp") { return mp; }
  if (name == "mf") { return mf; }
  if (name == "f") { return f; }
  if (name == "ff") { return ff; }
  if (name == "fff") { return fff; }
  if (name == "ffff") { return ffff; }
  if (name == "sfz") { return sfz; }
  if (name == "rfz") { return rfz; }
  if (name == "fp") { return fp; }
  if (name == "sfp") { return sfp; }
  return mf;  // default
}

// ============================================================
// Helper Functions
// ============================================================

fn linearInterpolate(t, fromVal, toVal) {
  return fromVal + (toVal - fromVal) * t;
}

// ============================================================
// Crescendo / Diminuendo Generators
// ============================================================

// Apply crescendo (gradual increase in velocity) to a clip
// from: starting dynamic level (default: current velocity or p)
// to: ending dynamic level (default: f)
// start: start position (default: 0)
// end: end position (default: clip length)
export fn crescendo(c, from, to, start, end) {
  let fromVel = from;
  if (fromVel == null) { fromVel = p; }
  let toVel = to;
  if (toVel == null) { toVel = f; }
  let startPos = start;
  if (startPos == null) { startPos = 0 / 1; }
  let endPos = end;
  if (endPos == null) { endPos = clipLen(c); }

  const duration = endPos - startPos;
  if (duration <= 0 / 1) {
    return c;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      const evStart = posToRat(ev.start);
      if (evStart != null && evStart >= startPos && evStart <= endPos) {
        const t = (evStart - startPos) / duration;
        out.velocity = linearInterpolate(t, fromVel, toVel);
      }
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Apply diminuendo (gradual decrease in velocity) to a clip
export fn diminuendo(c, from, to, start, end) {
  let fromVel = from;
  if (fromVel == null) { fromVel = f; }
  let toVel = to;
  if (toVel == null) { toVel = p; }
  return crescendo(c, fromVel, toVel, start, end);
}

// Alias for diminuendo
export fn decrescendo(c, from, to, start, end) {
  return diminuendo(c, from, to, start, end);
}

// Apply constant dynamic level to entire clip
export fn setDynamic(c, level) {
  let vel = level;
  if (vel == null) { vel = mf; }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      out.velocity = vel;
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Apply forte-piano: first note loud, rest soft
export fn fortePiano(c, forteVel, pianoVel) {
  let fVel = forteVel;
  if (fVel == null) { fVel = f; }
  let pVel = pianoVel;
  if (pVel == null) { pVel = p; }

  let first = true;
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      if (first) {
        out.velocity = fVel;
        first = false;
      } else {
        out.velocity = pVel;
      }
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Apply sforzando accent to specific events
export fn sforzandoAt(c, positions, accentVel) {
  let aVel = accentVel;
  if (aVel == null) { aVel = sfz; }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      const evStart = posToRat(ev.start);
      let isAccent = false;
      if (evStart != null && positions != null) {
        for (pos in positions) {
          if (evStart == pos) {
            isAccent = true;
          }
        }
      }
      if (isAccent) {
        out.velocity = aVel;
      }
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Apply hairpin dynamics (crescendo then diminuendo)
export fn hairpin(c, startLevel, peakLevel, endLevel, peakPosition) {
  let sLevel = startLevel;
  if (sLevel == null) { sLevel = p; }
  let pLevel = peakLevel;
  if (pLevel == null) { pLevel = f; }
  let eLevel = endLevel;
  if (eLevel == null) { eLevel = p; }

  const len = clipLen(c);
  let peakPos = peakPosition;
  if (peakPos == null) { peakPos = len / 2; }

  // First half: crescendo
  let result = crescendo(c, sLevel, pLevel, 0 / 1, peakPos);
  // Second half: diminuendo
  result = diminuendo(result, pLevel, eLevel, peakPos, len);

  return result;
}

// Scale all velocities by a factor
export fn scaleVelocity(c, factor) {
  let f = factor;
  if (f == null) { f = 1; }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      let vel = out.velocity;
      if (vel == null) { vel = mf; }
      vel = vel * f;
      if (vel > 1) { vel = 1; }
      if (vel < 0) { vel = 0; }
      out.velocity = vel;
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// Add velocity offset (can be positive or negative)
export fn offsetVelocity(c, offset) {
  let off = offset;
  if (off == null) { off = 0; }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      let out = cloneEvent(ev);
      let vel = out.velocity;
      if (vel == null) { vel = mf; }
      vel = vel + off;
      if (vel > 1) { vel = 1; }
      if (vel < 0) { vel = 0; }
      out.velocity = vel;
      events[events.length] = out;
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}
`;

export const STDLIB_EFFECTS = `// std:effects (v5)
// Audio effects automation: reverb, delay, EQ, compression, etc.

import core;
import curves;

// ============================================
// Reverb
// ============================================

// Reverb send level automation
export fn reverbSend(start, end, fromLevel, toLevel) {
  return {
    type: "automation",
    param: "reverbSend",
    start: start,
    end: end,
    curve: curves.linear(fromLevel, toLevel)
  };
}

// Reverb room size
export fn reverbSize(start, end, fromSize, toSize) {
  return {
    type: "automation",
    param: "reverbSize",
    start: start,
    end: end,
    curve: curves.linear(fromSize, toSize)
  };
}

// Reverb decay time
export fn reverbDecay(start, end, fromDecay, toDecay) {
  return {
    type: "automation",
    param: "reverbDecay",
    start: start,
    end: end,
    curve: curves.linear(fromDecay, toDecay)
  };
}

// Reverb damping (high frequency absorption)
export fn reverbDamping(start, end, fromDamp, toDamp) {
  return {
    type: "automation",
    param: "reverbDamping",
    start: start,
    end: end,
    curve: curves.linear(fromDamp, toDamp)
  };
}

// Reverb pre-delay
export fn reverbPreDelay(start, end, fromDelay, toDelay) {
  return {
    type: "automation",
    param: "reverbPreDelay",
    start: start,
    end: end,
    curve: curves.linear(fromDelay, toDelay)
  };
}

// Reverb mix (dry/wet)
export fn reverbMix(start, end, fromMix, toMix) {
  return {
    type: "automation",
    param: "reverbMix",
    start: start,
    end: end,
    curve: curves.linear(fromMix, toMix)
  };
}

// Reverb preset events
export fn reverbPreset(pos, preset) {
  return {
    type: "control",
    start: pos,
    kind: "reverbPreset",
    data: { preset: preset }
  };
}

// Common reverb presets
export const REVERB_PRESETS = {
  room: { size: 0.3, decay: 1.0, damping: 0.5 },
  hall: { size: 0.7, decay: 2.5, damping: 0.3 },
  cathedral: { size: 0.95, decay: 4.0, damping: 0.2 },
  plate: { size: 0.5, decay: 1.5, damping: 0.7 },
  chamber: { size: 0.4, decay: 1.2, damping: 0.4 },
  spring: { size: 0.2, decay: 0.8, damping: 0.6 },
  ambient: { size: 0.8, decay: 3.0, damping: 0.1 }
};

// ============================================
// Delay
// ============================================

// Delay send level
export fn delaySend(start, end, fromLevel, toLevel) {
  return {
    type: "automation",
    param: "delaySend",
    start: start,
    end: end,
    curve: curves.linear(fromLevel, toLevel)
  };
}

// Delay time (in ms or beats)
export fn delayTime(start, end, fromTime, toTime) {
  return {
    type: "automation",
    param: "delayTime",
    start: start,
    end: end,
    curve: curves.linear(fromTime, toTime)
  };
}

// Delay feedback
export fn delayFeedback(start, end, fromFb, toFb) {
  return {
    type: "automation",
    param: "delayFeedback",
    start: start,
    end: end,
    curve: curves.linear(fromFb, toFb)
  };
}

// Delay mix
export fn delayMix(start, end, fromMix, toMix) {
  return {
    type: "automation",
    param: "delayMix",
    start: start,
    end: end,
    curve: curves.linear(fromMix, toMix)
  };
}

// Ping-pong delay pan
export fn delayPingPong(start, end, enabled) {
  return {
    type: "control",
    start: start,
    kind: "delayPingPong",
    data: { enabled: enabled }
  };
}

// Tempo-synced delay
export fn delaySyncTime(pos, division) {
  // division: "1/4", "1/8", "1/8T", "1/16", etc.
  return {
    type: "control",
    start: pos,
    kind: "delaySyncTime",
    data: { division: division }
  };
}

// ============================================
// EQ (Equalizer)
// ============================================

// Parametric EQ band
export fn eqBand(start, end, band, fromFreq, toFreq, fromGain, toGain, fromQ, toQ) {
  let events = [];

  events[events.length] = {
    type: "automation",
    param: "eq" + band + "Freq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };

  events[events.length] = {
    type: "automation",
    param: "eq" + band + "Gain",
    start: start,
    end: end,
    curve: curves.linear(fromGain, toGain)
  };

  if (fromQ != null) {
    events[events.length] = {
      type: "automation",
      param: "eq" + band + "Q",
      start: start,
      end: end,
      curve: curves.linear(fromQ, toQ)
    };
  }

  return { events: events, length: end };
}

// Low shelf EQ
export fn eqLowShelf(start, end, fromFreq, toFreq, fromGain, toGain) {
  let events = [];
  events[events.length] = {
    type: "automation",
    param: "eqLowShelfFreq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };
  events[events.length] = {
    type: "automation",
    param: "eqLowShelfGain",
    start: start,
    end: end,
    curve: curves.linear(fromGain, toGain)
  };
  return { events: events, length: end };
}

// High shelf EQ
export fn eqHighShelf(start, end, fromFreq, toFreq, fromGain, toGain) {
  let events = [];
  events[events.length] = {
    type: "automation",
    param: "eqHighShelfFreq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };
  events[events.length] = {
    type: "automation",
    param: "eqHighShelfGain",
    start: start,
    end: end,
    curve: curves.linear(fromGain, toGain)
  };
  return { events: events, length: end };
}

// Low-pass filter
export fn lowPass(start, end, fromFreq, toFreq, fromRes, toRes) {
  let events = [];
  events[events.length] = {
    type: "automation",
    param: "lowPassFreq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };
  if (fromRes != null) {
    events[events.length] = {
      type: "automation",
      param: "lowPassRes",
      start: start,
      end: end,
      curve: curves.linear(fromRes, toRes)
    };
  }
  return { events: events, length: end };
}

// High-pass filter
export fn highPass(start, end, fromFreq, toFreq, fromRes, toRes) {
  let events = [];
  events[events.length] = {
    type: "automation",
    param: "highPassFreq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };
  if (fromRes != null) {
    events[events.length] = {
      type: "automation",
      param: "highPassRes",
      start: start,
      end: end,
      curve: curves.linear(fromRes, toRes)
    };
  }
  return { events: events, length: end };
}

// Band-pass filter
export fn bandPass(start, end, fromFreq, toFreq, fromQ, toQ) {
  let events = [];
  events[events.length] = {
    type: "automation",
    param: "bandPassFreq",
    start: start,
    end: end,
    curve: curves.linear(fromFreq, toFreq)
  };
  events[events.length] = {
    type: "automation",
    param: "bandPassQ",
    start: start,
    end: end,
    curve: curves.linear(fromQ, toQ)
  };
  return { events: events, length: end };
}

// Filter sweep
export fn filterSweep(start, end, filterType, fromFreq, toFreq) {
  if (filterType == "lowPass") {
    return lowPass(start, end, fromFreq, toFreq, null, null);
  }
  if (filterType == "highPass") {
    return highPass(start, end, fromFreq, toFreq, null, null);
  }
  return lowPass(start, end, fromFreq, toFreq, null, null);
}

// ============================================
// Compression
// ============================================

// Compressor threshold
export fn compThreshold(start, end, fromTh, toTh) {
  return {
    type: "automation",
    param: "compThreshold",
    start: start,
    end: end,
    curve: curves.linear(fromTh, toTh)
  };
}

// Compressor ratio
export fn compRatio(start, end, fromRatio, toRatio) {
  return {
    type: "automation",
    param: "compRatio",
    start: start,
    end: end,
    curve: curves.linear(fromRatio, toRatio)
  };
}

// Compressor attack
export fn compAttack(start, end, fromAttack, toAttack) {
  return {
    type: "automation",
    param: "compAttack",
    start: start,
    end: end,
    curve: curves.linear(fromAttack, toAttack)
  };
}

// Compressor release
export fn compRelease(start, end, fromRelease, toRelease) {
  return {
    type: "automation",
    param: "compRelease",
    start: start,
    end: end,
    curve: curves.linear(fromRelease, toRelease)
  };
}

// Compressor makeup gain
export fn compMakeup(start, end, fromGain, toGain) {
  return {
    type: "automation",
    param: "compMakeup",
    start: start,
    end: end,
    curve: curves.linear(fromGain, toGain)
  };
}

// Full compressor settings
export fn compressor(start, end, threshold, ratio, attack, release, makeup) {
  let events = [];
  events[events.length] = compThreshold(start, end, threshold, threshold);
  events[events.length] = compRatio(start, end, ratio, ratio);
  events[events.length] = compAttack(start, end, attack, attack);
  events[events.length] = compRelease(start, end, release, release);
  if (makeup != null) {
    events[events.length] = compMakeup(start, end, makeup, makeup);
  }
  return { events: events, length: end };
}

// ============================================
// Distortion/Saturation
// ============================================

// Drive amount
export fn drive(start, end, fromDrive, toDrive) {
  return {
    type: "automation",
    param: "drive",
    start: start,
    end: end,
    curve: curves.linear(fromDrive, toDrive)
  };
}

// Saturation
export fn saturation(start, end, fromSat, toSat) {
  return {
    type: "automation",
    param: "saturation",
    start: start,
    end: end,
    curve: curves.linear(fromSat, toSat)
  };
}

// Distortion type
export fn distortionType(pos, dtype) {
  return {
    type: "control",
    start: pos,
    kind: "distortionType",
    data: { type: dtype }
  };
}

// ============================================
// Modulation Effects
// ============================================

// Chorus
export fn chorusDepth(start, end, fromDepth, toDepth) {
  return {
    type: "automation",
    param: "chorusDepth",
    start: start,
    end: end,
    curve: curves.linear(fromDepth, toDepth)
  };
}

export fn chorusRate(start, end, fromRate, toRate) {
  return {
    type: "automation",
    param: "chorusRate",
    start: start,
    end: end,
    curve: curves.linear(fromRate, toRate)
  };
}

export fn chorusMix(start, end, fromMix, toMix) {
  return {
    type: "automation",
    param: "chorusMix",
    start: start,
    end: end,
    curve: curves.linear(fromMix, toMix)
  };
}

// Flanger
export fn flangerDepth(start, end, fromDepth, toDepth) {
  return {
    type: "automation",
    param: "flangerDepth",
    start: start,
    end: end,
    curve: curves.linear(fromDepth, toDepth)
  };
}

export fn flangerRate(start, end, fromRate, toRate) {
  return {
    type: "automation",
    param: "flangerRate",
    start: start,
    end: end,
    curve: curves.linear(fromRate, toRate)
  };
}

export fn flangerFeedback(start, end, fromFb, toFb) {
  return {
    type: "automation",
    param: "flangerFeedback",
    start: start,
    end: end,
    curve: curves.linear(fromFb, toFb)
  };
}

// Phaser
export fn phaserDepth(start, end, fromDepth, toDepth) {
  return {
    type: "automation",
    param: "phaserDepth",
    start: start,
    end: end,
    curve: curves.linear(fromDepth, toDepth)
  };
}

export fn phaserRate(start, end, fromRate, toRate) {
  return {
    type: "automation",
    param: "phaserRate",
    start: start,
    end: end,
    curve: curves.linear(fromRate, toRate)
  };
}

export fn phaserStages(pos, stages) {
  return {
    type: "control",
    start: pos,
    kind: "phaserStages",
    data: { stages: stages }
  };
}

// ============================================
// Tremolo & Vibrato (amplitude/pitch LFO)
// ============================================

// Tremolo (amplitude modulation)
export fn tremoloDepth(start, end, fromDepth, toDepth) {
  return {
    type: "automation",
    param: "tremoloDepth",
    start: start,
    end: end,
    curve: curves.linear(fromDepth, toDepth)
  };
}

export fn tremoloRate(start, end, fromRate, toRate) {
  return {
    type: "automation",
    param: "tremoloRate",
    start: start,
    end: end,
    curve: curves.linear(fromRate, toRate)
  };
}

// ============================================
// Effect Bypass/Enable
// ============================================

// Enable/disable effect
export fn effectBypass(pos, effectName, bypassed) {
  return {
    type: "control",
    start: pos,
    kind: "effectBypass",
    data: { effect: effectName, bypassed: bypassed }
  };
}

// ============================================
// Send Effects
// ============================================

// Generic send level to effect bus
export fn sendLevel(start, end, busName, fromLevel, toLevel) {
  return {
    type: "automation",
    param: "send_" + busName,
    start: start,
    end: end,
    curve: curves.linear(fromLevel, toLevel)
  };
}

// ============================================
// Convolution/IR
// ============================================

// Load impulse response
export fn loadIR(pos, irName) {
  return {
    type: "control",
    start: pos,
    kind: "loadIR",
    data: { ir: irName }
  };
}

// Convolution mix
export fn convolutionMix(start, end, fromMix, toMix) {
  return {
    type: "automation",
    param: "convolutionMix",
    start: start,
    end: end,
    curve: curves.linear(fromMix, toMix)
  };
}
`;

export const STDLIB_EUCLIDEAN = `// std:euclidean (v5.3)
// Euclidean rhythms and related algorithmic rhythm generators
// Based on Godfried Toussaint's research on Euclidean rhythms

// ============================================
// Core Euclidean Algorithm
// ============================================

// Generate Euclidean rhythm using Bjorklund's algorithm
// k = number of onsets (hits)
// n = total steps
// Returns array of 0s and 1s
export fn euclidean(k, n) {
  if (k >= n) {
    let result = [];
    for (_ in 0..(n - 1)) {
      result[result.length] = 1;
    }
    return result;
  }

  if (k == 0) {
    let result = [];
    for (_ in 0..(n - 1)) {
      result[result.length] = 0;
    }
    return result;
  }

  // Bjorklund's algorithm
  let pattern = [];
  for (i in 0..(n - 1)) {
    if (i < k) {
      pattern[i] = [1];
    } else {
      pattern[i] = [0];
    }
  }

  let divisor = n - k;
  while (divisor > 1) {
    let newPattern = [];
    let pairs = k;
    if (divisor < k) {
      pairs = divisor;
    }

    for (i in 0..(pairs - 1)) {
      let combined = [];
      for (x in pattern[i]) {
        combined[combined.length] = x;
      }
      for (x in pattern[pattern.length - 1 - i]) {
        combined[combined.length] = x;
      }
      newPattern[i] = combined;
    }

    // Add remaining
    if (k > divisor) {
      for (i in pairs..(k - divisor - 1 + pairs)) {
        newPattern[newPattern.length] = pattern[i];
      }
    } else {
      let remaining = divisor - k;
      for (i in 0..(remaining - 1)) {
        newPattern[newPattern.length] = pattern[k + i];
      }
    }

    pattern = newPattern;

    let prevK = k;
    k = pattern.length;
    if (prevK > divisor) {
      divisor = prevK - divisor;
    } else {
      divisor = divisor - prevK;
    }
  }

  // Flatten
  let result = [];
  for (group in pattern) {
    for (x in group) {
      result[result.length] = x;
    }
  }

  return result;
}

// Rotate pattern by offset
export fn rotate(pattern, offset) {
  let n = pattern.length;
  if (n == 0) {
    return [];
  }

  let off = offset % n;
  if (off < 0) {
    off = off + n;
  }

  let result = [];
  for (i in 0..(n - 1)) {
    result[i] = pattern[(i + off) % n];
  }
  return result;
}

// Find all rotations of a pattern
export fn allRotations(pattern) {
  let rotations = [];
  for (i in 0..(pattern.length - 1)) {
    rotations[i] = rotate(pattern, i);
  }
  return rotations;
}

// ============================================
// Famous Euclidean Rhythms
// ============================================

// Cuban tresillo (3,8)
export fn tresillo() {
  return euclidean(3, 8);
}

// Cuban cinquillo (5,8)
export fn cinquillo() {
  return euclidean(5, 8);
}

// Bossa nova (5,16) - common starting rotation
export fn bossaNova() {
  return euclidean(5, 16);
}

// Soukous (5,12)
export fn soukous() {
  return euclidean(5, 12);
}

// Rumba clave son (5,16) with specific rotation
export fn rumbaClave() {
  return rotate(euclidean(5, 16), 0);
}

// Standard bell pattern (7,12)
export fn bellPattern() {
  return euclidean(7, 12);
}

// Aksak (Bulgarian) (4,9)
export fn aksak() {
  return euclidean(4, 9);
}

// West African (5,12)
export fn westAfrican() {
  return euclidean(5, 12);
}

// Flamenco (4,12)
export fn flamenco() {
  return euclidean(4, 12);
}

// ============================================
// Pattern Analysis
// ============================================

// Count onsets in pattern
export fn countOnsets(pattern) {
  let count = 0;
  for (x in pattern) {
    if (x == 1) {
      count = count + 1;
    }
  }
  return count;
}

// Get inter-onset intervals (IOIs)
export fn getIOIs(pattern) {
  let iois = [];
  let lastOnset = -1;

  for (i in 0..(pattern.length - 1)) {
    if (pattern[i] == 1) {
      if (lastOnset >= 0) {
        iois[iois.length] = i - lastOnset;
      }
      lastOnset = i;
    }
  }

  // Wrap around for cyclic pattern
  if (lastOnset >= 0) {
    let firstOnset = -1;
    for (i in 0..(pattern.length - 1)) {
      if (pattern[i] == 1) {
        firstOnset = i;
        break;
      }
    }
    if (firstOnset >= 0) {
      iois[iois.length] = pattern.length - lastOnset + firstOnset;
    }
  }

  return iois;
}

// Check if pattern is maximally even
export fn isMaximallyEven(pattern) {
  const k = countOnsets(pattern);
  const n = pattern.length;
  const expected = euclidean(k, n);

  // Check all rotations
  for (rotation in allRotations(expected)) {
    let match = true;
    for (i in 0..(n - 1)) {
      if (pattern[i] != rotation[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return true;
    }
  }
  return false;
}

// Calculate evenness score (variance of IOIs)
export fn evennessScore(pattern) {
  const iois = getIOIs(pattern);
  if (iois.length == 0) {
    return 0;
  }

  // Calculate mean
  let sum = 0;
  for (ioi in iois) {
    sum = sum + ioi;
  }
  const mean = sum / iois.length;

  // Calculate variance
  let variance = 0;
  for (ioi in iois) {
    const diff = ioi - mean;
    variance = variance + diff * diff;
  }
  variance = variance / iois.length;

  // Lower variance = more even
  return 1 / (1 + variance);
}

// ============================================
// Pattern Transformations
// ============================================

// Invert pattern (swap 0s and 1s)
export fn invert(pattern) {
  let result = [];
  for (x in pattern) {
    if (x == 1) {
      result[result.length] = 0;
    } else {
      result[result.length] = 1;
    }
  }
  return result;
}

// Reverse pattern
export fn reverse(pattern) {
  let result = [];
  for (i in 0..(pattern.length - 1)) {
    result[i] = pattern[pattern.length - 1 - i];
  }
  return result;
}

// Stretch pattern by factor
export fn stretch(pattern, factor) {
  let result = [];
  for (x in pattern) {
    for (_ in 0..(factor - 1)) {
      result[result.length] = x;
    }
  }
  return result;
}

// Compress pattern (take every nth)
export fn compress(pattern, factor) {
  let result = [];
  for (i in 0..(pattern.length - 1)) {
    if (i % factor == 0) {
      result[result.length] = pattern[i];
    }
  }
  return result;
}

// Concatenate patterns
export fn concat(p1, p2) {
  let result = [];
  for (x in p1) {
    result[result.length] = x;
  }
  for (x in p2) {
    result[result.length] = x;
  }
  return result;
}

// Interleave patterns
export fn interleave(p1, p2) {
  let result = [];
  let maxLen = p1.length;
  if (p2.length > maxLen) {
    maxLen = p2.length;
  }

  for (i in 0..(maxLen - 1)) {
    if (i < p1.length) {
      result[result.length] = p1[i];
    }
    if (i < p2.length) {
      result[result.length] = p2[i];
    }
  }
  return result;
}

// Boolean AND of patterns
export fn patternAnd(p1, p2) {
  let len = p1.length;
  if (p2.length < len) {
    len = p2.length;
  }

  let result = [];
  for (i in 0..(len - 1)) {
    if (p1[i] == 1 && p2[i] == 1) {
      result[i] = 1;
    } else {
      result[i] = 0;
    }
  }
  return result;
}

// Boolean OR of patterns
export fn patternOr(p1, p2) {
  let len = p1.length;
  if (p2.length < len) {
    len = p2.length;
  }

  let result = [];
  for (i in 0..(len - 1)) {
    if (p1[i] == 1 || p2[i] == 1) {
      result[i] = 1;
    } else {
      result[i] = 0;
    }
  }
  return result;
}

// Boolean XOR of patterns
export fn patternXor(p1, p2) {
  let len = p1.length;
  if (p2.length < len) {
    len = p2.length;
  }

  let result = [];
  for (i in 0..(len - 1)) {
    if ((p1[i] == 1 && p2[i] == 0) || (p1[i] == 0 && p2[i] == 1)) {
      result[i] = 1;
    } else {
      result[i] = 0;
    }
  }
  return result;
}

// ============================================
// Polyrhythm Generation
// ============================================

// Generate polyrhythm from two Euclidean patterns
export fn polyrhythm(k1, n1, k2, n2) {
  // Find LCM for combined length
  let a = n1;
  let b = n2;
  while (b != 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  const gcd = a;
  const lcm = (n1 * n2) / gcd;

  // Stretch both patterns to LCM length
  const p1 = stretch(euclidean(k1, n1), lcm / n1);
  const p2 = stretch(euclidean(k2, n2), lcm / n2);

  return {
    pattern1: p1,
    pattern2: p2,
    combined: patternOr(p1, p2),
    length: lcm
  };
}

// Generate complementary rhythms
export fn complementaryRhythms(k, n) {
  const p1 = euclidean(k, n);
  const p2 = invert(p1);
  return {
    rhythm: p1,
    complement: p2
  };
}

// ============================================
// Musical Conversion
// ============================================

// Convert pattern to durations
// baseDuration: duration of one step
export fn toDurations(pattern, baseDuration) {
  let durations = [];
  let currentDur = 0;

  for (i in 0..(pattern.length - 1)) {
    currentDur = currentDur + baseDuration;
    if (pattern[i] == 1) {
      if (durations.length > 0 || i == 0) {
        // Start new note
        if (i > 0 && durations.length > 0) {
          // Previous duration is finalized
        }
      }
      durations[durations.length] = baseDuration;
      currentDur = 0;
    } else if (durations.length > 0) {
      // Extend previous note
      durations[durations.length - 1] = durations[durations.length - 1] + baseDuration;
    }
  }

  return durations;
}

// Convert pattern to onset times
export fn toOnsetTimes(pattern, baseDuration) {
  let times = [];
  let time = 0 / 1;

  for (i in 0..(pattern.length - 1)) {
    if (pattern[i] == 1) {
      times[times.length] = time;
    }
    time = time + baseDuration;
  }

  return times;
}

// Convert pattern to rest pattern (for tied notes)
export fn toRestPattern(pattern) {
  let result = [];
  for (x in pattern) {
    if (x == 1) {
      result[result.length] = false;  // Not a rest
    } else {
      result[result.length] = true;   // Rest or tie
    }
  }
  return result;
}

// ============================================
// Pattern Variation
// ============================================

// Add random variations to pattern
export fn addSwing(pattern, swingAmount, seed) {
  // Returns timing offsets for each onset
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let offsets = [];
  for (i in 0..(pattern.length - 1)) {
    if (pattern[i] == 1) {
      // Even positions get positive swing, odd get negative
      if (i % 2 == 0) {
        offsets[offsets.length] = swingAmount;
      } else {
        offsets[offsets.length] = -swingAmount;
      }
    }
  }

  return offsets;
}

// Humanize pattern with random timing
export fn humanize(pattern, maxOffset, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let offsets = [];
  for (i in 0..(pattern.length - 1)) {
    if (pattern[i] == 1) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const normalized = (rng / 2147483648) * 2 - 1;  // -1 to 1
      offsets[offsets.length] = normalized * maxOffset;
    }
  }

  return offsets;
}

// Probabilistic pattern - each onset has probability p
export fn probabilisticPattern(pattern, probability, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let result = [];
  for (x in pattern) {
    if (x == 1) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      if ((rng / 2147483648) < probability) {
        result[result.length] = 1;
      } else {
        result[result.length] = 0;
      }
    } else {
      result[result.length] = 0;
    }
  }

  return result;
}

// ============================================
// Pattern Matching and Search
// ============================================

// Find best Euclidean approximation for arbitrary pattern
export fn findBestEuclidean(pattern) {
  const n = pattern.length;
  const k = countOnsets(pattern);

  let bestMatch = euclidean(k, n);
  let bestScore = 0;

  // Try all rotations
  for (rotation in allRotations(euclidean(k, n))) {
    let score = 0;
    for (i in 0..(n - 1)) {
      if (pattern[i] == rotation[i]) {
        score = score + 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rotation;
    }
  }

  return {
    euclidean: bestMatch,
    matchScore: bestScore / n,
    k: k,
    n: n
  };
}

// Check if two patterns are rotational equivalents
export fn areRotationallyEquivalent(p1, p2) {
  if (p1.length != p2.length) {
    return false;
  }

  for (rotation in allRotations(p1)) {
    let match = true;
    for (i in 0..(p2.length - 1)) {
      if (rotation[i] != p2[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return true;
    }
  }

  return false;
}

// ============================================
// Notation Helpers
// ============================================

// Convert to string representation
export fn toString(pattern) {
  let result = "";
  for (x in pattern) {
    if (x == 1) {
      result = result + "x";
    } else {
      result = result + ".";
    }
  }
  return result;
}

// Parse from string
export fn fromString(str) {
  let result = [];
  for (i in 0..(str.length - 1)) {
    const ch = str[i];
    if (ch == "x" || ch == "X" || ch == "1") {
      result[result.length] = 1;
    } else if (ch == "." || ch == "-" || ch == "0") {
      result[result.length] = 0;
    }
  }
  return result;
}

// Convert to binary number representation
export fn toBinary(pattern) {
  let result = 0;
  for (i in 0..(pattern.length - 1)) {
    if (pattern[i] == 1) {
      result = result + (2 ** (pattern.length - 1 - i));
    }
  }
  return result;
}
`;

export const STDLIB_EXPRESSION = `// std:expression (v5)
// Advanced expression: vibrato, bow techniques, breath control, extended techniques

import core;
import curves;

// ============================================
// Vibrato (detailed control)
// ============================================

// Create vibrato automation
export fn vibrato(start, end, depth, rate, shape) {
  let shapeVal = shape;
  if (shapeVal == null) {
    shapeVal = "sine";
  }

  let events = [];

  events[events.length] = {
    type: "automation",
    param: "vibratoDepth",
    start: start,
    end: end,
    curve: curves.linear(depth, depth)
  };

  events[events.length] = {
    type: "automation",
    param: "vibratoRate",
    start: start,
    end: end,
    curve: curves.linear(rate, rate)
  };

  events[events.length] = {
    type: "control",
    start: start,
    kind: "vibratoShape",
    data: { shape: shapeVal }
  };

  return { events: events, length: end };
}

// Vibrato with gradual onset (delayed start)
export fn vibratoDelayed(start, end, depth, rate, delay) {
  let events = [];
  const onsetEnd = start + delay;

  // No vibrato during onset period
  events[events.length] = {
    type: "automation",
    param: "vibratoDepth",
    start: start,
    end: onsetEnd,
    curve: curves.linear(0, 0)
  };

  // Ramp up vibrato
  events[events.length] = {
    type: "automation",
    param: "vibratoDepth",
    start: onsetEnd,
    end: end,
    curve: curves.easeIn(0, depth)
  };

  events[events.length] = {
    type: "automation",
    param: "vibratoRate",
    start: start,
    end: end,
    curve: curves.linear(rate, rate)
  };

  return { events: events, length: end };
}

// Vibrato with intensity curve
export fn vibratoContour(start, end, depthCurve, rate) {
  let events = [];

  events[events.length] = {
    type: "automation",
    param: "vibratoDepth",
    start: start,
    end: end,
    curve: depthCurve
  };

  events[events.length] = {
    type: "automation",
    param: "vibratoRate",
    start: start,
    end: end,
    curve: curves.linear(rate, rate)
  };

  return { events: events, length: end };
}

// Wide vibrato
export fn wideVibrato(start, end) {
  return vibrato(start, end, 0.8, 5.5, "sine");
}

// Narrow/fast vibrato
export fn narrowVibrato(start, end) {
  return vibrato(start, end, 0.3, 7.0, "sine");
}

// No vibrato (straight tone)
export fn nonVibrato(start, end) {
  return {
    type: "automation",
    param: "vibratoDepth",
    start: start,
    end: end,
    curve: curves.linear(0, 0)
  };
}

// ============================================
// Bow Techniques (Strings)
// ============================================

// Bow pressure
export fn bowPressure(start, end, fromPressure, toPressure) {
  return {
    type: "automation",
    param: "bowPressure",
    start: start,
    end: end,
    curve: curves.linear(fromPressure, toPressure)
  };
}

// Bow speed
export fn bowSpeed(start, end, fromSpeed, toSpeed) {
  return {
    type: "automation",
    param: "bowSpeed",
    start: start,
    end: end,
    curve: curves.linear(fromSpeed, toSpeed)
  };
}

// Bow position (sul tasto to sul pont)
// 0 = sul tasto (over fingerboard), 0.5 = normal, 1 = sul ponticello (near bridge)
export fn bowPosition(start, end, fromPos, toPos) {
  return {
    type: "automation",
    param: "bowPosition",
    start: start,
    end: end,
    curve: curves.linear(fromPos, toPos)
  };
}

// Sul tasto (over fingerboard - softer tone)
export fn sulTasto(start, end) {
  return bowPosition(start, end, 0.0, 0.0);
}

// Sul ponticello (near bridge - glassy, harmonic-rich)
export fn sulPonticello(start, end) {
  return bowPosition(start, end, 1.0, 1.0);
}

// Ordinary position
export fn ordinario(start, end) {
  return bowPosition(start, end, 0.5, 0.5);
}

// Bow direction
export fn bowDown(pos) {
  return {
    type: "control",
    start: pos,
    kind: "bowDirection",
    data: { direction: "down" }
  };
}

export fn bowUp(pos) {
  return {
    type: "control",
    start: pos,
    kind: "bowDirection",
    data: { direction: "up" }
  };
}

// Col legno (with wood of bow)
export fn colLegno(pos, colType) {
  let cType = colType;
  if (cType == null) {
    cType = "battuto";  // struck
  }
  return {
    type: "control",
    start: pos,
    kind: "colLegno",
    data: { type: cType }  // "battuto" or "tratto" (drawn)
  };
}

// Flautando (flute-like bowing)
export fn flautando(start, end) {
  let events = [];
  events[events.length] = bowPosition(start, end, 0.15, 0.15);
  events[events.length] = bowPressure(start, end, 0.3, 0.3);
  return { events: events, length: end };
}

// ============================================
// Portamento (with duration control)
// ============================================

// Create portamento between two pitches with timing control
export fn portamento(start, end, fromPitch, toPitch, slideTime) {
  let slideT = slideTime;
  if (slideT == null) {
    slideT = end - start;
  }

  return {
    type: "glissando",
    start: start,
    end: start + slideT,
    fromPitch: fromPitch,
    toPitch: toPitch,
    style: "continuous",
    ext: { portamento: true }
  };
}

// Portamento with timing specification
// timing: "early" (slide at start), "late" (slide at end), "throughout"
export fn portamentoTimed(start, end, fromPitch, toPitch, timing, slideDuration) {
  let slideStart = start;
  let slideEnd = end;

  if (timing == "early") {
    slideEnd = start + slideDuration;
  } else if (timing == "late") {
    slideStart = end - slideDuration;
  }

  return {
    type: "glissando",
    start: slideStart,
    end: slideEnd,
    fromPitch: fromPitch,
    toPitch: toPitch,
    style: "continuous",
    ext: { portamento: true, timing: timing }
  };
}

// ============================================
// Breath Control (Winds/Brass)
// ============================================

// Air pressure/support
export fn airPressure(start, end, fromPressure, toPressure) {
  return {
    type: "automation",
    param: "airPressure",
    start: start,
    end: end,
    curve: curves.linear(fromPressure, toPressure)
  };
}

// Air speed (for dynamics and tone color)
export fn airSpeed(start, end, fromSpeed, toSpeed) {
  return {
    type: "automation",
    param: "airSpeed",
    start: start,
    end: end,
    curve: curves.linear(fromSpeed, toSpeed)
  };
}

// Embouchure tightness
export fn embouchure(start, end, fromTight, toTight) {
  return {
    type: "automation",
    param: "embouchure",
    start: start,
    end: end,
    curve: curves.linear(fromTight, toTight)
  };
}

// Breath intensity for vocals
export fn breathiness(start, end, fromBreath, toBreath) {
  return {
    type: "automation",
    param: "breathiness",
    start: start,
    end: end,
    curve: curves.linear(fromBreath, toBreath)
  };
}

// ============================================
// Extended Techniques
// ============================================

// Multiphonics (multiple simultaneous pitches)
export fn multiphonic(start, dur, pitches, fingering) {
  let events = [];
  for (pitch in pitches) {
    events[events.length] = {
      type: "note",
      start: start,
      dur: dur,
      pitch: pitch,
      velocity: 0.7,
      techniques: ["multiphonic"],
      ext: { fingering: fingering }
    };
  }
  return { events: events, length: start + dur };
}

// Key clicks (woodwinds)
export fn keyClicks(start, dur, pattern) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: 0,  // Unpitched
    velocity: 0.5,
    techniques: ["keyClicks"],
    ext: { pattern: pattern }
  };
}

// Air sound (blowing without pitch)
export fn airSound(start, dur, intensity) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: 0,
    velocity: intensity,
    techniques: ["airSound"]
  };
}

// Tongue ram (brass)
export fn tongueRam(start, dur) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: 0,
    velocity: 0.9,
    techniques: ["tongueRam"]
  };
}

// Flutter tongue
export fn flutterTongue(start, end, rate) {
  let events = [];
  events[events.length] = {
    type: "control",
    start: start,
    kind: "flutterTongue",
    data: { enabled: true, rate: rate }
  };
  events[events.length] = {
    type: "control",
    start: end,
    kind: "flutterTongue",
    data: { enabled: false }
  };
  return { events: events, length: end };
}

// Growl (brass/sax)
export fn growl(start, end, intensity) {
  return {
    type: "automation",
    param: "growl",
    start: start,
    end: end,
    curve: curves.linear(intensity, intensity)
  };
}

// Subtone (sax)
export fn subtone(start, end) {
  return {
    type: "automation",
    param: "subtone",
    start: start,
    end: end,
    curve: curves.linear(1.0, 1.0)
  };
}

// ============================================
// String Extended Techniques
// ============================================

// Behind the bridge
export fn behindBridge(start, dur) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: 0,
    velocity: 0.6,
    techniques: ["behindBridge"]
  };
}

// Bartok pizzicato (snap)
export fn bartokPizz(start, dur, pitch) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: 0.95,
    techniques: ["bartokPizz"]
  };
}

// Left-hand pizzicato
export fn leftHandPizz(start, dur, pitch) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: 0.6,
    techniques: ["leftHandPizz"]
  };
}

// Bowed tremolo speed
export fn tremoloSpeed(start, end, fromSpeed, toSpeed) {
  return {
    type: "automation",
    param: "tremoloSpeed",
    start: start,
    end: end,
    curve: curves.linear(fromSpeed, toSpeed)
  };
}

// Jeté / ricochet
export fn jete(start, dur, numBounces) {
  return {
    type: "control",
    start: start,
    kind: "jete",
    data: { bounces: numBounces, duration: dur }
  };
}

// ============================================
// Piano Extended Techniques
// ============================================

// Prepared piano (object placement)
export fn preparedPiano(pos, preparation) {
  return {
    type: "control",
    start: pos,
    kind: "preparation",
    data: preparation
  };
}

// String muting (inside piano)
export fn stringMute(pos, strings, material) {
  return preparedPiano(pos, {
    type: "mute",
    strings: strings,
    material: material
  });
}

// Plucking strings inside piano
export fn pizzicatoInside(start, dur, pitch) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: 0.7,
    techniques: ["pizzicatoInside"]
  };
}

// Harmonics on piano strings
export fn pianoHarmonic(start, dur, pitch, node) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: 0.5,
    techniques: ["harmonic"],
    ext: { node: node }
  };
}

// ============================================
// Vocal Extended Techniques
// ============================================

// Sprechstimme (speech-song)
export fn sprechstimme(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.techniques == null) {
    newNote.techniques = [];
  }
  newNote.techniques[newNote.techniques.length] = "sprechstimme";
  return newNote;
}

// Falsetto
export fn falsetto(start, end) {
  return {
    type: "control",
    start: start,
    kind: "vocalRegister",
    data: { register: "falsetto" }
  };
}

// Chest voice
export fn chestVoice(start, end) {
  return {
    type: "control",
    start: start,
    kind: "vocalRegister",
    data: { register: "chest" }
  };
}

// Head voice
export fn headVoice(start, end) {
  return {
    type: "control",
    start: start,
    kind: "vocalRegister",
    data: { register: "head" }
  };
}

// Belting
export fn belt(start, end) {
  return {
    type: "control",
    start: start,
    kind: "vocalRegister",
    data: { register: "belt" }
  };
}

// Vocal fry
export fn vocalFry(start, end) {
  return {
    type: "automation",
    param: "vocalFry",
    start: start,
    end: end,
    curve: curves.linear(1.0, 1.0)
  };
}

// ============================================
// Microtiming/Expression Timing
// ============================================

// Micro-timing offset (slight push/pull)
export fn timing(note, offset) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.timingOffset = offset;
  return newNote;
}

// Rush (slightly early)
export fn rush(note, amount) {
  let amt = amount;
  if (amt == null) {
    amt = -0.02;  // -20ms
  }
  return timing(note, amt);
}

// Lay back (slightly late)
export fn layBack(note, amount) {
  let amt = amount;
  if (amt == null) {
    amt = 0.03;  // 30ms
  }
  return timing(note, amt);
}
`;

export const STDLIB_FORM = `// std:form (v5.4)
// Musical form structures and large-scale organization
// Classical and contemporary formal designs

// ============================================
// Section Representation
// ============================================

// Create a named section
export fn section(name, content, properties) {
  let props = properties;
  if (props == null) {
    props = {};
  }

  return {
    type: "section",
    name: name,
    content: content,
    duration: props.duration,
    key: props.key,
    tempo: props.tempo,
    dynamics: props.dynamics
  };
}

// Create section marker
export fn marker(name, position) {
  return {
    type: "marker",
    name: name,
    position: position
  };
}

// ============================================
// Binary Forms
// ============================================

// Simple binary (AB)
export fn binarySimple(sectionA, sectionB) {
  return {
    type: "form",
    formType: "binary",
    structure: ["A", "B"],
    sections: {
      A: sectionA,
      B: sectionB
    }
  };
}

// Rounded binary (ABA')
export fn binaryRounded(sectionA, sectionB, sectionAPrime) {
  let aPrime = sectionAPrime;
  if (aPrime == null) {
    aPrime = sectionA;  // Use original A if no variation provided
  }

  return {
    type: "form",
    formType: "roundedBinary",
    structure: ["A", "B", "A'"],
    sections: {
      A: sectionA,
      B: sectionB,
      "A'": aPrime
    }
  };
}

// ============================================
// Ternary Forms
// ============================================

// Simple ternary (ABA)
export fn ternary(sectionA, sectionB) {
  return {
    type: "form",
    formType: "ternary",
    structure: ["A", "B", "A"],
    sections: {
      A: sectionA,
      B: sectionB
    }
  };
}

// Compound ternary (minuet and trio)
export fn compoundTernary(minuet, trio) {
  return {
    type: "form",
    formType: "compoundTernary",
    structure: ["Minuet", "Trio", "Minuet da capo"],
    sections: {
      Minuet: minuet,
      Trio: trio
    }
  };
}

// ============================================
// Rondo Forms
// ============================================

// Five-part rondo (ABACA)
export fn rondo5(refrain, episodeB, episodeC) {
  return {
    type: "form",
    formType: "rondo5",
    structure: ["A", "B", "A", "C", "A"],
    sections: {
      A: refrain,
      B: episodeB,
      C: episodeC
    }
  };
}

// Seven-part rondo (ABACABA)
export fn rondo7(refrain, episodeB, episodeC) {
  return {
    type: "form",
    formType: "rondo7",
    structure: ["A", "B", "A", "C", "A", "B", "A"],
    sections: {
      A: refrain,
      B: episodeB,
      C: episodeC
    }
  };
}

// Sonata-rondo (ABACAB'A)
export fn sonataRondo(refrain, episodeB, development, episodeBPrime) {
  return {
    type: "form",
    formType: "sonataRondo",
    structure: ["A", "B", "A", "C", "A", "B'", "A"],
    sections: {
      A: refrain,
      B: episodeB,
      C: development,
      "B'": episodeBPrime
    }
  };
}

// ============================================
// Sonata Form
// ============================================

// Full sonata form
export fn sonataForm(exposition, development, recapitulation, coda) {
  let form = {
    type: "form",
    formType: "sonata",
    structure: ["Exposition", "Development", "Recapitulation"],
    sections: {
      Exposition: exposition,
      Development: development,
      Recapitulation: recapitulation
    }
  };

  if (coda != null) {
    form.structure[form.structure.length] = "Coda";
    form.sections.Coda = coda;
  }

  return form;
}

// Exposition helper
export fn exposition(firstTheme, transition, secondTheme, closingTheme) {
  return {
    type: "section",
    name: "Exposition",
    parts: {
      firstTheme: firstTheme,
      transition: transition,
      secondTheme: secondTheme,
      closingTheme: closingTheme
    }
  };
}

// Sonatina form (no development)
export fn sonatinaForm(exposition, recapitulation) {
  return {
    type: "form",
    formType: "sonatina",
    structure: ["Exposition", "Recapitulation"],
    sections: {
      Exposition: exposition,
      Recapitulation: recapitulation
    }
  };
}

// ============================================
// Variation Forms
// ============================================

// Theme and variations
export fn themeAndVariations(theme, variations) {
  let structure = ["Theme"];
  let sections = { Theme: theme };

  for (i in 0..(variations.length - 1)) {
    const name = "Var" + (i + 1);
    structure[structure.length] = name;
    sections[name] = variations[i];
  }

  return {
    type: "form",
    formType: "themeAndVariations",
    structure: structure,
    sections: sections
  };
}

// Chaconne/Passacaglia (variations over bass)
export fn chaconne(bassLine, variations) {
  return {
    type: "form",
    formType: "chaconne",
    bassLine: bassLine,
    variations: variations,
    variationCount: variations.length
  };
}

// Ground bass
export fn groundBass(ostinato, upperParts) {
  return {
    type: "form",
    formType: "groundBass",
    ostinato: ostinato,
    upperParts: upperParts
  };
}

// ============================================
// Strophic and Verse Forms
// ============================================

// Strophic form (same music, different text)
export fn strophic(verse, stropheCount) {
  let structure = [];
  for (i in 0..(stropheCount - 1)) {
    structure[i] = "Verse" + (i + 1);
  }

  return {
    type: "form",
    formType: "strophic",
    structure: structure,
    verse: verse
  };
}

// Verse-chorus form
export fn verseChorus(verse, chorus, arrangement) {
  // arrangement is array of "V" and "C"
  let structure = [];
  for (item in arrangement) {
    if (item == "V") {
      structure[structure.length] = "Verse";
    } else if (item == "C") {
      structure[structure.length] = "Chorus";
    } else if (item == "B") {
      structure[structure.length] = "Bridge";
    }
  }

  return {
    type: "form",
    formType: "verseChorus",
    structure: structure,
    sections: {
      Verse: verse,
      Chorus: chorus
    }
  };
}

// Pop song form (ABABCB)
export fn popSongForm(verse, chorus, bridge) {
  return {
    type: "form",
    formType: "popSong",
    structure: ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus", "Outro"],
    sections: {
      Verse: verse,
      Chorus: chorus,
      Bridge: bridge
    }
  };
}

// 12-bar blues
export fn twelveBarBlues(progression) {
  return {
    type: "form",
    formType: "twelveBarBlues",
    structure: [
      "I", "I", "I", "I",
      "IV", "IV", "I", "I",
      "V", "IV", "I", "V"
    ],
    progression: progression,
    measures: 12
  };
}

// ============================================
// Fugue
// ============================================

// Fugue exposition
export fn fugueExposition(subject, answer, countersubject, voices) {
  return {
    type: "section",
    name: "Exposition",
    subject: subject,
    answer: answer,
    countersubject: countersubject,
    voiceCount: voices
  };
}

// Full fugue structure
export fn fugue(exposition, episodes, stretto, coda) {
  let structure = ["Exposition"];
  let sections = { Exposition: exposition };

  for (i in 0..(episodes.length - 1)) {
    const epName = "Episode" + (i + 1);
    structure[structure.length] = epName;
    sections[epName] = episodes[i];

    // Middle entries after episodes
    const entryName = "MiddleEntry" + (i + 1);
    structure[structure.length] = entryName;
  }

  if (stretto != null) {
    structure[structure.length] = "Stretto";
    sections.Stretto = stretto;
  }

  if (coda != null) {
    structure[structure.length] = "Coda";
    sections.Coda = coda;
  }

  return {
    type: "form",
    formType: "fugue",
    structure: structure,
    sections: sections
  };
}

// ============================================
// Contemporary Forms
// ============================================

// Through-composed
export fn throughComposed(sections) {
  let structure = [];
  let sectionMap = {};

  for (i in 0..(sections.length - 1)) {
    const name = "Section" + (i + 1);
    structure[i] = name;
    sectionMap[name] = sections[i];
  }

  return {
    type: "form",
    formType: "throughComposed",
    structure: structure,
    sections: sectionMap
  };
}

// Arch form (ABCBA)
export fn archForm(sectionA, sectionB, sectionC) {
  return {
    type: "form",
    formType: "arch",
    structure: ["A", "B", "C", "B'", "A'"],
    sections: {
      A: sectionA,
      B: sectionB,
      C: sectionC
    }
  };
}

// Palindrome form
export fn palindrome(sections) {
  let structure = [];
  let sectionMap = {};

  // Forward
  for (i in 0..(sections.length - 1)) {
    const name = "S" + (i + 1);
    structure[structure.length] = name;
    sectionMap[name] = sections[i];
  }

  // Backward (excluding center)
  for (i in 0..(sections.length - 2)) {
    const idx = sections.length - 2 - i;
    const name = "S" + (idx + 1) + "'";
    structure[structure.length] = name;
  }

  return {
    type: "form",
    formType: "palindrome",
    structure: structure,
    sections: sectionMap
  };
}

// Mobile form (performer chooses order)
export fn mobileForm(modules) {
  return {
    type: "form",
    formType: "mobile",
    modules: modules,
    orderDetermined: false
  };
}

// Moment form (Stockhausen-style)
export fn momentForm(moments) {
  return {
    type: "form",
    formType: "moment",
    moments: moments,
    autonomous: true
  };
}

// ============================================
// Form Utilities
// ============================================

// Get total sections count
export fn sectionCount(form) {
  return form.structure.length;
}

// Get section by index
export fn getSectionByIndex(form, index) {
  if (index < 0 || index >= form.structure.length) {
    return null;
  }
  const name = form.structure[index];
  return form.sections[name];
}

// Get section by name
export fn getSectionByName(form, name) {
  return form.sections[name];
}

// Expand form to linear sequence
export fn expandForm(form) {
  let sequence = [];

  for (sectionName in form.structure) {
    // Handle repeated sections like "A" appearing multiple times
    let content = form.sections[sectionName];

    // Check for prime variants
    if (content == null) {
      const baseName = sectionName[0];
      content = form.sections[baseName];
    }

    if (content != null) {
      sequence[sequence.length] = {
        name: sectionName,
        content: content
      };
    }
  }

  return sequence;
}

// Calculate proportions
export fn calculateProportions(form, sectionDurations) {
  let total = 0;
  for (dur in sectionDurations) {
    total = total + dur;
  }

  let proportions = [];
  for (dur in sectionDurations) {
    proportions[proportions.length] = dur / total;
  }

  return proportions;
}

// Golden ratio proportions
export fn goldenRatioProportions(totalLength) {
  const phi = 1.618033988749895;
  const a = totalLength / phi;
  const b = totalLength - a;

  return {
    longer: a,
    shorter: b,
    ratio: phi
  };
}

// ============================================
// Form Generation
// ============================================

// Generate random form from sections
export fn randomForm(sections, length, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let structure = [];
  for (_ in 0..(length - 1)) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const idx = ((rng / 2147483648) * sections.length);
    let i = idx - (idx % 1);
    structure[structure.length] = sections[i].name;
  }

  let sectionMap = {};
  for (s in sections) {
    sectionMap[s.name] = s;
  }

  return {
    type: "form",
    formType: "generated",
    structure: structure,
    sections: sectionMap
  };
}

// Generate form with constraints
export fn constrainedForm(sections, rules, length, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let structure = [];
  let lastSection = null;

  for (_ in 0..(length - 1)) {
    // Filter valid next sections
    let valid = [];
    for (s in sections) {
      let isValid = true;

      // Check if allowed after last section
      if (lastSection != null && rules.transitions != null) {
        const trans = rules.transitions[lastSection];
        if (trans != null) {
          isValid = false;
          for (allowed in trans) {
            if (allowed == s.name) {
              isValid = true;
              break;
            }
          }
        }
      }

      // Check max consecutive
      if (rules.maxConsecutive != null && structure.length > 0) {
        let consecutive = 0;
        for (i in 0..(structure.length - 1)) {
          const idx = structure.length - 1 - i;
          if (structure[idx] == s.name) {
            consecutive = consecutive + 1;
          } else {
            break;
          }
        }
        if (consecutive >= rules.maxConsecutive) {
          isValid = false;
        }
      }

      if (isValid) {
        valid[valid.length] = s;
      }
    }

    if (valid.length == 0) {
      valid = sections;  // Fallback
    }

    rng = (rng * 1103515245 + 12345) % 2147483648;
    const idx = ((rng / 2147483648) * valid.length);
    let i = idx - (idx % 1);

    structure[structure.length] = valid[i].name;
    lastSection = valid[i].name;
  }

  let sectionMap = {};
  for (s in sections) {
    sectionMap[s.name] = s;
  }

  return {
    type: "form",
    formType: "constrained",
    structure: structure,
    sections: sectionMap
  };
}

// ============================================
// Transitions
// ============================================

// Create transition between sections
export fn transition(fromSection, toSection, type) {
  return {
    type: "transition",
    from: fromSection,
    to: toSection,
    transitionType: type  // "modulating", "bridge", "attacca", "pause"
  };
}

// Bridge section
export fn bridge(content) {
  return section("Bridge", content, { role: "transition" });
}

// Cadenza
export fn cadenza(content) {
  return section("Cadenza", content, { tempo: "free", role: "virtuosic" });
}

// Introduction
export fn intro(content) {
  return section("Introduction", content, { role: "opening" });
}

// Coda
export fn coda(content) {
  return section("Coda", content, { role: "closing" });
}
`;

export const STDLIB_GAMELAN = `// std:gamelan (v5.5)
// Indonesian gamelan music utilities
// Supports Javanese and Balinese gamelan traditions

// ============================================
// Tuning Systems (Laras)
// ============================================

// Slendro (5-tone scale) - approximate cents from Western
export fn slendro() {
  return {
    name: "slendro",
    tones: 5,
    // Approximate intervals (varies by gamelan)
    cents: [0, 240, 480, 720, 960],
    pitchNames: ["nem", "barang", "gulu", "dada", "lima"]
  };
}

// Pelog (7-tone scale)
export fn pelog() {
  return {
    name: "pelog",
    tones: 7,
    // Approximate intervals
    cents: [0, 120, 270, 540, 670, 780, 950],
    pitchNames: ["nem", "barang", "gulu", "dada", "lima", "nem", "barang"]
  };
}

// Pelog bem (subset for pathet bem)
export fn pelogBem() {
  return {
    name: "pelogBem",
    tones: 5,
    cents: [0, 120, 540, 670, 950],
    degrees: [1, 2, 4, 5, 7]
  };
}

// Pelog barang (subset for pathet barang)
export fn pelogBarang() {
  return {
    name: "pelogBarang",
    tones: 5,
    cents: [0, 270, 540, 780, 950],
    degrees: [1, 3, 4, 6, 7]
  };
}

// Convert gamelan pitch to frequency
export fn toFrequency(laras, degree, octave, baseFreq) {
  let base = baseFreq;
  if (base == null) {
    base = 280;  // Approximate gamelan reference
  }

  const idx = (degree - 1) % laras.cents.length;
  const cents = laras.cents[idx] + (octave * 1200);

  return base * (2 ** (cents / 1200));
}

// ============================================
// Pathet (Modal System)
// ============================================

// Slendro pathet
export fn pathetNem() {
  return {
    name: "pathetNem",
    laras: "slendro",
    gong: 2,  // Pitch 2 (nem) as gong tone
    dominant: 5,
    hierarchy: [2, 5, 1, 6, 3]  // Pitch importance
  };
}

export fn pathetSanga() {
  return {
    name: "pathetSanga",
    laras: "slendro",
    gong: 5,
    dominant: 1,
    hierarchy: [5, 1, 2, 6, 3]
  };
}

export fn pathetManyura() {
  return {
    name: "pathetManyura",
    laras: "slendro",
    gong: 6,
    dominant: 2,
    hierarchy: [6, 2, 3, 5, 1]
  };
}

// Pelog pathet
export fn pathetLima() {
  return {
    name: "pathetLima",
    laras: "pelog",
    gong: 5,
    dominant: 1,
    avoided: [4, 7]
  };
}

export fn pathetBarang() {
  return {
    name: "pathetBarang",
    laras: "pelog",
    gong: 7,
    dominant: 3,
    avoided: [1, 4]
  };
}

// ============================================
// Colotomic Structure (Bentuk)
// ============================================

// Create gong cycle (basic structure)
export fn gongCycle(length) {
  return {
    type: "colotomic",
    length: length,
    gong: length,  // Gong at end
    markers: []
  };
}

// Lancaran (16 beats)
export fn lancaran() {
  return {
    type: "colotomic",
    name: "lancaran",
    length: 16,
    structure: {
      gong: [16],
      kenong: [4, 8, 12, 16],
      kempul: [8, 12],
      ketuk: [2, 4, 6, 8, 10, 12, 14, 16],
      kempyang: [1, 3, 5, 7, 9, 11, 13, 15]
    }
  };
}

// Ketawang (16 beats, different pattern)
export fn ketawang() {
  return {
    type: "colotomic",
    name: "ketawang",
    length: 16,
    structure: {
      gong: [16],
      kenong: [8, 16],
      kempul: [4, 12],
      ketuk: [2, 6, 10, 14]
    }
  };
}

// Ladrang (32 beats)
export fn ladrang() {
  return {
    type: "colotomic",
    name: "ladrang",
    length: 32,
    structure: {
      gong: [32],
      kenong: [8, 16, 24, 32],
      kempul: [12, 20, 28],
      ketuk: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]
    }
  };
}

// Gendhing (64 or 128 beats)
export fn gendhing(kepatihan) {
  let len = 64;
  if (kepatihan == 4) {
    len = 128;
  }

  return {
    type: "colotomic",
    name: "gendhing",
    kepatihan: kepatihan,
    length: len,
    structure: {
      gong: [len],
      kenong: generateMarkers(len, 4),
      kempul: generateMarkers(len, 8),
      ketuk: generateMarkers(len, 2)
    }
  };
}

fn generateMarkers(total, division) {
  let markers = [];
  const interval = total / division;
  for (i in 1..division) {
    markers[markers.length] = i * interval;
  }
  return markers;
}

// Check if beat has instrument stroke
export fn hasStroke(structure, instrument, beat) {
  const markers = structure.structure[instrument];
  if (markers == null) {
    return false;
  }
  for (m in markers) {
    if (m == beat) {
      return true;
    }
  }
  return false;
}

// ============================================
// Balungan (Core Melody)
// ============================================

// Create balungan phrase
export fn balungan(pitches) {
  return {
    type: "balungan",
    pitches: pitches,
    length: pitches.length
  };
}

// Seleh (cadential) patterns
export fn seleh(targetPitch) {
  // Common approach patterns to target pitch
  if (targetPitch == 2) {
    return [3, 2];
  } else if (targetPitch == 5) {
    return [6, 5];
  } else if (targetPitch == 6) {
    return [5, 6];
  } else if (targetPitch == 1) {
    return [2, 1];
  }
  return [targetPitch];
}

// Transpose balungan
export fn transposeBalungan(bal, interval, laras) {
  let pitches = [];
  for (p in bal.pitches) {
    if (p == 0) {
      pitches[pitches.length] = 0;  // Rest
    } else {
      let newP = p + interval;
      // Wrap within laras
      while (newP > laras.tones) {
        newP = newP - laras.tones;
      }
      while (newP < 1) {
        newP = newP + laras.tones;
      }
      pitches[pitches.length] = newP;
    }
  }
  return balungan(pitches);
}

// ============================================
// Elaboration (Garap)
// ============================================

// Simple panerusan (elaboration) pattern
export fn elaborate(balunganPitch, style) {
  if (style == "mlaku") {
    // Walking pattern
    return [balunganPitch, balunganPitch + 1, balunganPitch, balunganPitch - 1];
  } else if (style == "nibani") {
    // Sparse pattern
    return [0, balunganPitch, 0, balunganPitch];
  } else if (style == "mipil") {
    // Plucking pattern
    return [balunganPitch, balunganPitch + 2, balunganPitch + 1, balunganPitch];
  }
  return [balunganPitch];
}

// Generate bonang pattern
export fn bonangPattern(balungan, style) {
  let result = [];

  for (pitch in balungan.pitches) {
    if (style == "pipilan") {
      // Alternating octaves
      result[result.length] = pitch;
      result[result.length] = pitch + 5;  // Higher octave
      result[result.length] = pitch;
      result[result.length] = pitch + 5;
    } else if (style == "gembyang") {
      // Octave pairs
      result[result.length] = [pitch, pitch + 5];
      result[result.length] = 0;
      result[result.length] = [pitch, pitch + 5];
      result[result.length] = 0;
    } else if (style == "mipil") {
      result[result.length] = pitch;
      result[result.length] = pitch + 1;
      result[result.length] = pitch + 2;
      result[result.length] = pitch + 1;
    }
  }

  return result;
}

// Generate gender pattern
export fn genderPattern(balungan, pathet) {
  let result = [];

  for (pitch in balungan.pitches) {
    // Gender plays interlocking patterns
    const lower = pitch - 2;
    const upper = pitch + 2;

    result[result.length] = {
      right: pitch,
      left: lower
    };
    result[result.length] = {
      right: upper,
      left: pitch
    };
  }

  return result;
}

// ============================================
// Irama (Tempo Levels)
// ============================================

// Irama levels
export const IRAMA_LANCAR = 1;     // Fast, 1:1
export const IRAMA_TANGGUNG = 2;   // 2:1
export const IRAMA_DADI = 4;       // 4:1
export const IRAMA_WILED = 8;      // 8:1
export const IRAMA_RANGKEP = 16;   // 16:1

// Expand balungan for irama
export fn expandForIrama(balungan, irama) {
  let result = [];

  for (pitch in balungan.pitches) {
    for (_ in 0..(irama - 1)) {
      result[result.length] = pitch;
    }
  }

  return balungan(result);
}

// Get elaboration density for irama
export fn elaborationDensity(irama) {
  return irama * 2;  // Notes per balungan beat
}

// ============================================
// Balinese Gamelan
// ============================================

// Balinese pelog (different from Javanese)
export fn pelogBali() {
  return {
    name: "pelogBali",
    tones: 5,
    cents: [0, 125, 550, 675, 825],
    pitchNames: ["ding", "dong", "deng", "dung", "dang"]
  };
}

// Balinese slendro
export fn slendroBali() {
  return {
    name: "slendroBali",
    tones: 5,
    cents: [0, 230, 470, 700, 950],
    pitchNames: ["ding", "dong", "deng", "dung", "dang"]
  };
}

// Kotekan (interlocking pattern)
export fn kotekan(melody, style) {
  let polos = [];   // On-beat part
  let sangsih = []; // Off-beat part

  if (style == "empat") {
    // 4-note kotekan
    for (i in 0..(melody.length - 1)) {
      const note = melody[i];
      polos[polos.length] = note;
      polos[polos.length] = 0;  // Rest
      sangsih[sangsih.length] = 0;
      sangsih[sangsih.length] = note + 1;
    }
  } else if (style == "telu") {
    // 3-note kotekan
    for (i in 0..(melody.length - 1)) {
      const note = melody[i];
      polos[polos.length] = note;
      polos[polos.length] = 0;
      polos[polos.length] = note;
      sangsih[sangsih.length] = 0;
      sangsih[sangsih.length] = note + 1;
      sangsih[sangsih.length] = 0;
    }
  } else if (style == "norot") {
    // Neighbor-tone kotekan
    for (i in 0..(melody.length - 1)) {
      const note = melody[i];
      polos[polos.length] = note;
      polos[polos.length] = note - 1;
      sangsih[sangsih.length] = note + 1;
      sangsih[sangsih.length] = note;
    }
  }

  return {
    polos: polos,
    sangsih: sangsih
  };
}

// Kebyar accent patterns
export fn kebyarAccent(length) {
  let pattern = [];
  for (i in 0..(length - 1)) {
    if (i == 0) {
      pattern[i] = 1.0;  // Strong
    } else if (i % 4 == 0) {
      pattern[i] = 0.8;
    } else if (i % 2 == 0) {
      pattern[i] = 0.6;
    } else {
      pattern[i] = 0.4;
    }
  }
  return pattern;
}

// ============================================
// Composition Helpers
// ============================================

// Create gending (composition)
export fn gending(name, laras, pathet, bentuk, balunganSections) {
  return {
    type: "gending",
    name: name,
    laras: laras,
    pathet: pathet,
    bentuk: bentuk,
    sections: balunganSections
  };
}

// Create buka (introduction)
export fn buka(instrument, melody) {
  return {
    type: "buka",
    instrument: instrument,
    melody: melody
  };
}

// Create suwukan (ending)
export fn suwukan(melody) {
  return {
    type: "suwukan",
    melody: melody
  };
}

// ============================================
// Utility
// ============================================

// Check if pitch is in pathet
export fn isInPathet(pitch, pathet) {
  if (pathet.avoided != null) {
    for (a in pathet.avoided) {
      if (a == pitch) {
        return false;
      }
    }
  }
  return true;
}

// Get pitch importance in pathet
export fn pitchImportance(pitch, pathet) {
  if (pathet.hierarchy != null) {
    for (i in 0..(pathet.hierarchy.length - 1)) {
      if (pathet.hierarchy[i] == pitch) {
        return pathet.hierarchy.length - i;
      }
    }
  }
  return 1;
}

// Convert to MIDI (approximation)
export fn toMidi(laras, degree, octave) {
  const baseMidi = 60;  // Middle C
  const idx = (degree - 1) % laras.cents.length;
  const cents = laras.cents[idx];
  const midiOffset = cents / 100 + octave * 12;
  return baseMidi + midiOffset;
}
`;

export const STDLIB_HARMONY = `// std:harmony (v6.0)
// Harmonic analysis and functional harmony utilities
// Key detection, chord function analysis, voice leading optimization

// ============================================
// Pitch Class Operations
// ============================================

// Pitch class constants (0-11)
export const PC_C = 0;
export const PC_CS = 1;
export const PC_D = 2;
export const PC_DS = 3;
export const PC_E = 4;
export const PC_F = 5;
export const PC_FS = 6;
export const PC_G = 7;
export const PC_GS = 8;
export const PC_A = 9;
export const PC_AS = 10;
export const PC_B = 11;

// Extract pitch class from MIDI note
export fn pitchClass(midiNote) {
  return midiNote % 12;
}

// Extract pitch classes from chord
export fn chordPitchClasses(chord) {
  let pcs = [];
  for (note in chord) {
    const pc = pitchClass(note);
    let found = false;
    for (existing in pcs) {
      if (existing == pc) {
        found = true;
      }
    }
    if (!found) {
      pcs[pcs.length] = pc;
    }
  }
  return pcs;
}

// ============================================
// Key Detection
// ============================================

// Major key profiles (Krumhansl-Kessler)
fn majorProfile() {
  return [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
}

// Minor key profiles (Krumhansl-Kessler)
fn minorProfile() {
  return [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
}

// Rotate array by n positions
fn rotateArray(arr, n) {
  let result = [];
  const len = arr.length;
  for (i in 0..(len - 1)) {
    const idx = (i + n) % len;
    result[i] = arr[idx];
  }
  return result;
}

// Calculate correlation between pitch distribution and profile
fn correlate(distribution, profile) {
  let sumXY = 0;
  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  const n = 12;

  for (i in 0..11) {
    sumXY = sumXY + distribution[i] * profile[i];
    sumX = sumX + distribution[i];
    sumY = sumY + profile[i];
    sumX2 = sumX2 + distribution[i] * distribution[i];
    sumY2 = sumY2 + profile[i] * profile[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = ((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)) ** 0.5;

  if (denominator == 0) {
    return 0;
  }
  return numerator / denominator;
}

// Build pitch class distribution from notes
fn buildDistribution(notes) {
  let dist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (note in notes) {
    const pc = pitchClass(note);
    dist[pc] = dist[pc] + 1;
  }
  return dist;
}

// Detect key from a collection of pitches
export fn detectKey(pitches) {
  const dist = buildDistribution(pitches);
  const major = majorProfile();
  const minor = minorProfile();

  let bestKey = null;
  let bestScore = -2;

  // Try all major keys
  for (root in 0..11) {
    const rotated = rotateArray(major, root);
    const score = correlate(dist, rotated);
    if (score > bestScore) {
      bestScore = score;
      bestKey = { root: root, mode: "major", confidence: score };
    }
  }

  // Try all minor keys
  for (root in 0..11) {
    const rotated = rotateArray(minor, root);
    const score = correlate(dist, rotated);
    if (score > bestScore) {
      bestScore = score;
      bestKey = { root: root, mode: "minor", confidence: score };
    }
  }

  return bestKey;
}

// Detect key from chord progression
export fn detectKeyFromChords(chords) {
  let allPitches = [];
  for (chord in chords) {
    for (note in chord) {
      allPitches[allPitches.length] = note;
    }
  }
  return detectKey(allPitches);
}

// Get key name from key object
export fn keyName(key) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return names[key.root] + " " + key.mode;
}

// ============================================
// Chord Identification
// ============================================

// Chord quality templates (intervals from root)
fn chordTemplates() {
  return {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dominant7: [0, 4, 7, 10],
    diminished7: [0, 3, 6, 9],
    halfDiminished7: [0, 3, 6, 10],
    augmented7: [0, 4, 8, 10],
    majorMajor7: [0, 4, 7, 11],
    minorMajor7: [0, 3, 7, 11],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    add9: [0, 4, 7, 14],
    sixth: [0, 4, 7, 9],
    minor6: [0, 3, 7, 9]
  };
}

// Normalize chord to pitch classes relative to bass
fn normalizeChord(chord) {
  if (chord.length == 0) {
    return [];
  }

  // Find lowest note as bass
  let bass = chord[0];
  for (note in chord) {
    if (note < bass) {
      bass = note;
    }
  }

  let normalized = [];
  for (note in chord) {
    const interval = (note - bass) % 12;
    let found = false;
    for (existing in normalized) {
      if (existing == interval) {
        found = true;
      }
    }
    if (!found) {
      normalized[normalized.length] = interval;
    }
  }

  // Sort ascending
  for (i in 0..(normalized.length - 2)) {
    for (j in 0..(normalized.length - i - 2)) {
      if (normalized[j] > normalized[j + 1]) {
        const temp = normalized[j];
        normalized[j] = normalized[j + 1];
        normalized[j + 1] = temp;
      }
    }
  }

  return normalized;
}

// Check if two arrays match
fn arraysMatch(a, b) {
  if (a.length != b.length) {
    return false;
  }
  for (i in 0..(a.length - 1)) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

// Identify chord quality
export fn identifyChord(chord) {
  if (chord.length == 0) {
    return null;
  }

  const templates = chordTemplates();
  const templateNames = ["major", "minor", "diminished", "augmented",
                         "major7", "minor7", "dominant7", "diminished7",
                         "halfDiminished7", "augmented7", "majorMajor7",
                         "minorMajor7", "sus2", "sus4", "add9", "sixth", "minor6"];

  // Find bass note
  let bass = chord[0];
  for (note in chord) {
    if (note < bass) {
      bass = note;
    }
  }

  const normalized = normalizeChord(chord);

  // Try each template
  for (name in templateNames) {
    const template = templates[name];
    if (arraysMatch(normalized, template)) {
      return {
        root: pitchClass(bass),
        quality: name,
        bass: pitchClass(bass),
        inversion: 0
      };
    }
  }

  // Try inversions
  for (inv in 1..3) {
    for (name in templateNames) {
      const template = templates[name];
      if (template.length <= inv) {
        continue;
      }

      // Rotate template for inversion
      let rotated = [];
      for (i in 0..(template.length - 1)) {
        const idx = (i + inv) % template.length;
        let val = template[idx] - template[inv];
        if (val < 0) {
          val = val + 12;
        }
        rotated[i] = val;
      }

      // Sort rotated
      for (i in 0..(rotated.length - 2)) {
        for (j in 0..(rotated.length - i - 2)) {
          if (rotated[j] > rotated[j + 1]) {
            const temp = rotated[j];
            rotated[j] = rotated[j + 1];
            rotated[j + 1] = temp;
          }
        }
      }

      if (arraysMatch(normalized, rotated)) {
        const actualRoot = (pitchClass(bass) - template[inv] + 12) % 12;
        return {
          root: actualRoot,
          quality: name,
          bass: pitchClass(bass),
          inversion: inv
        };
      }
    }
  }

  return { root: pitchClass(bass), quality: "unknown", bass: pitchClass(bass), inversion: 0 };
}

// Get chord symbol (e.g., "Cmaj7", "Am")
export fn chordSymbol(chordInfo) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const root = names[chordInfo.root];

  const qualityMap = {
    major: "",
    minor: "m",
    diminished: "dim",
    augmented: "aug",
    major7: "maj7",
    minor7: "m7",
    dominant7: "7",
    diminished7: "dim7",
    halfDiminished7: "m7b5",
    augmented7: "aug7",
    majorMajor7: "maj7",
    minorMajor7: "mMaj7",
    sus2: "sus2",
    sus4: "sus4",
    add9: "add9",
    sixth: "6",
    minor6: "m6",
    unknown: "?"
  };

  let symbol = root + qualityMap[chordInfo.quality];

  if (chordInfo.inversion > 0) {
    const bassName = names[chordInfo.bass];
    symbol = symbol + "/" + bassName;
  }

  return symbol;
}

// ============================================
// Functional Harmony
// ============================================

// Chord function types
export const FUNC_TONIC = "tonic";
export const FUNC_SUBDOMINANT = "subdominant";
export const FUNC_DOMINANT = "dominant";
export const FUNC_PREDOMINANT = "predominant";

// Get scale degree from root in key
fn scaleDegree(chordRoot, keyRoot) {
  return (chordRoot - keyRoot + 12) % 12;
}

// Determine chord function in major key
fn majorChordFunction(degree, quality) {
  // I, iii, vi = tonic
  if (degree == 0) { return FUNC_TONIC; }
  if (degree == 4) { return FUNC_TONIC; }  // iii (E in C)
  if (degree == 9) { return FUNC_TONIC; }  // vi (A in C)

  // ii, IV = subdominant/predominant
  if (degree == 2) { return FUNC_PREDOMINANT; }  // ii
  if (degree == 5) { return FUNC_SUBDOMINANT; }  // IV

  // V, vii° = dominant
  if (degree == 7) { return FUNC_DOMINANT; }  // V
  if (degree == 11) { return FUNC_DOMINANT; } // vii°

  return FUNC_TONIC;  // Default
}

// Determine chord function in minor key
fn minorChordFunction(degree, quality) {
  // i, III, VI = tonic
  if (degree == 0) { return FUNC_TONIC; }
  if (degree == 3) { return FUNC_TONIC; }  // III
  if (degree == 8) { return FUNC_TONIC; }  // VI

  // ii°, iv = predominant
  if (degree == 2) { return FUNC_PREDOMINANT; }
  if (degree == 5) { return FUNC_SUBDOMINANT; }

  // V, vii° = dominant
  if (degree == 7) { return FUNC_DOMINANT; }
  if (degree == 11) { return FUNC_DOMINANT; }

  return FUNC_TONIC;
}

// Get Roman numeral for chord
export fn romanNumeral(chordInfo, key) {
  const degree = scaleDegree(chordInfo.root, key.root);

  const majorNumerals = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
  const minorNumerals = ["i", "bii", "ii", "biii", "iii", "iv", "#iv", "v", "bvi", "vi", "bvii", "vii"];

  let numeral = majorNumerals[degree];

  // Lowercase for minor chords
  if (chordInfo.quality == "minor" || chordInfo.quality == "minor7" ||
      chordInfo.quality == "diminished" || chordInfo.quality == "diminished7" ||
      chordInfo.quality == "halfDiminished7") {
    numeral = minorNumerals[degree];
  }

  // Add quality suffix
  if (chordInfo.quality == "diminished") {
    numeral = numeral + "°";
  } else if (chordInfo.quality == "augmented") {
    numeral = numeral + "+";
  } else if (chordInfo.quality == "dominant7") {
    numeral = numeral + "7";
  } else if (chordInfo.quality == "major7" || chordInfo.quality == "majorMajor7") {
    numeral = numeral + "maj7";
  } else if (chordInfo.quality == "minor7") {
    numeral = numeral + "7";
  } else if (chordInfo.quality == "halfDiminished7") {
    numeral = numeral + "ø7";
  } else if (chordInfo.quality == "diminished7") {
    numeral = numeral + "°7";
  }

  return numeral;
}

// Analyze functional harmony of progression
export fn functionalAnalysis(chords, key) {
  let analysis = [];

  for (chord in chords) {
    const info = identifyChord(chord);
    if (info == null) {
      analysis[analysis.length] = { chord: chord, function: null, numeral: "?" };
      continue;
    }

    const degree = scaleDegree(info.root, key.root);
    let func = null;

    if (key.mode == "major") {
      func = majorChordFunction(degree, info.quality);
    } else {
      func = minorChordFunction(degree, info.quality);
    }

    analysis[analysis.length] = {
      chord: chord,
      chordInfo: info,
      symbol: chordSymbol(info),
      numeral: romanNumeral(info, key),
      function: func,
      degree: degree
    };
  }

  return analysis;
}

// ============================================
// Tension Analysis
// ============================================

// Calculate dissonance score for a chord (0 = consonant, 1 = very dissonant)
export fn calculateDissonance(chord) {
  if (chord.length < 2) {
    return 0;
  }

  let total = 0;
  let count = 0;

  // Dissonance values for intervals (in semitones mod 12)
  const dissonanceValues = [0, 1, 0.8, 0.2, 0.15, 0.1, 0.9, 0.05, 0.2, 0.15, 0.7, 0.85];

  for (i in 0..(chord.length - 2)) {
    for (j in (i + 1)..(chord.length - 1)) {
      const interval = (chord[j] - chord[i]) % 12;
      let absInterval = interval;
      if (absInterval < 0) {
        absInterval = absInterval + 12;
      }
      total = total + dissonanceValues[absInterval];
      count = count + 1;
    }
  }

  if (count == 0) {
    return 0;
  }
  return total / count;
}

// Analyze tension curve for progression
export fn analyzeTension(chords) {
  let tensions = [];
  for (chord in chords) {
    const info = identifyChord(chord);
    let tension = calculateDissonance(chord);

    // Dominant function adds tension
    if (info != null && (info.quality == "dominant7" || info.quality == "diminished7")) {
      tension = tension + 0.2;
    }

    tensions[tensions.length] = tension;
  }
  return tensions;
}

// ============================================
// Voice Leading
// ============================================

// Calculate voice leading distance between two chords
export fn voiceLeadingDistance(chord1, chord2) {
  let total = 0;
  const len = chord1.length;

  if (len != chord2.length) {
    return 999;  // Different voice count
  }

  for (i in 0..(len - 1)) {
    let diff = chord2[i] - chord1[i];
    if (diff < 0) {
      diff = -diff;
    }
    total = total + diff;
  }

  return total;
}

// Find optimal voice leading between chord pitch classes
export fn optimalVoiceLead(fromChord, toPitchClasses, voiceCount) {
  // Generate all possible voicings of target within an octave of from
  let best = null;
  let bestDist = 999;

  fn generateVoicings(pcs, baseOctave, count) {
    if (count == 1) {
      let result = [];
      for (pc in pcs) {
        result[result.length] = [baseOctave * 12 + pc];
        result[result.length] = [(baseOctave + 1) * 12 + pc];
      }
      return result;
    }

    let result = [];
    const subVoicings = generateVoicings(pcs, baseOctave, count - 1);

    for (pc in pcs) {
      for (sub in subVoicings) {
        const note1 = baseOctave * 12 + pc;
        const note2 = (baseOctave + 1) * 12 + pc;

        let v1 = [note1];
        let v2 = [note2];
        for (s in sub) {
          v1[v1.length] = s;
          v2[v2.length] = s;
        }
        result[result.length] = v1;
        result[result.length] = v2;
      }
    }

    return result;
  }

  // Get base octave from fromChord
  let avgOctave = 0;
  for (note in fromChord) {
    avgOctave = avgOctave + (note / 12);
  }
  avgOctave = avgOctave / fromChord.length;
  const baseOct = avgOctave - 0.5;

  // Simple approach: move each voice to nearest target pitch class
  let result = [];
  for (i in 0..(voiceCount - 1)) {
    const fromNote = fromChord[i];
    let bestNote = fromNote;
    let bestMove = 12;

    for (pc in toPitchClasses) {
      // Try octave above and below
      for (oct in -1..1) {
        const candidate = (fromNote / 12) * 12 + oct * 12 + pc;
        let move = candidate - fromNote;
        if (move < 0) { move = -move; }
        if (move < bestMove) {
          bestMove = move;
          bestNote = candidate;
        }
      }
    }
    result[i] = bestNote;
  }

  return result;
}

// Check for parallel fifths
export fn hasParallelFifths(chord1, chord2) {
  const len = chord1.length;
  if (len < 2) { return false; }

  for (i in 0..(len - 2)) {
    for (j in (i + 1)..(len - 1)) {
      const int1 = (chord1[j] - chord1[i]) % 12;
      const int2 = (chord2[j] - chord2[i]) % 12;

      // Both are perfect fifths and both voices move in same direction
      if (int1 == 7 && int2 == 7) {
        const motion1 = chord2[i] - chord1[i];
        const motion2 = chord2[j] - chord1[j];
        if (motion1 != 0 && motion2 != 0 && motion1 * motion2 > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check for parallel octaves
export fn hasParallelOctaves(chord1, chord2) {
  const len = chord1.length;
  if (len < 2) { return false; }

  for (i in 0..(len - 2)) {
    for (j in (i + 1)..(len - 1)) {
      const int1 = (chord1[j] - chord1[i]) % 12;
      const int2 = (chord2[j] - chord2[i]) % 12;

      if (int1 == 0 && int2 == 0) {
        const motion1 = chord2[i] - chord1[i];
        const motion2 = chord2[j] - chord1[j];
        if (motion1 != 0 && motion2 != 0 && motion1 * motion2 > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Voice leading quality score (0-1, higher is better)
export fn voiceLeadingQuality(progression) {
  if (progression.length < 2) {
    return 1.0;
  }

  let score = 1.0;

  for (i in 1..(progression.length - 1)) {
    const prev = progression[i - 1];
    const curr = progression[i];

    // Penalize parallel fifths
    if (hasParallelFifths(prev, curr)) {
      score = score - 0.2;
    }

    // Penalize parallel octaves
    if (hasParallelOctaves(prev, curr)) {
      score = score - 0.2;
    }

    // Penalize large leaps
    const dist = voiceLeadingDistance(prev, curr);
    if (dist > curr.length * 4) {
      score = score - 0.1;
    }
  }

  if (score < 0) { score = 0; }
  return score;
}

// ============================================
// Common Progressions
// ============================================

// Standard jazz ii-V-I
export fn iiVI(key) {
  const root = key.root;
  if (key.mode == "major") {
    return [
      [root + 2, root + 5, root + 9, root + 12],  // ii7
      [root + 7, root + 11, root + 14, root + 17], // V7
      [root, root + 4, root + 7, root + 11]        // Imaj7
    ];
  } else {
    return [
      [root + 2, root + 5, root + 8, root + 12],  // iiø7
      [root + 7, root + 11, root + 14, root + 17], // V7
      [root, root + 3, root + 7, root + 10]        // i7
    ];
  }
}

// Circle of fifths progression
export fn circleOfFifths(startRoot, steps, quality) {
  let progression = [];
  let current = startRoot;

  for (i in 0..(steps - 1)) {
    if (quality == "major") {
      progression[i] = [current, current + 4, current + 7];
    } else if (quality == "minor") {
      progression[i] = [current, current + 3, current + 7];
    } else if (quality == "dominant7") {
      progression[i] = [current, current + 4, current + 7, current + 10];
    }
    current = (current + 5) % 12;  // Move down a fifth (up a fourth)
  }

  return progression;
}

// Analyze cadence type
export fn analyzeCadence(lastTwoChords, key) {
  if (lastTwoChords.length < 2) {
    return "incomplete";
  }

  const first = identifyChord(lastTwoChords[0]);
  const second = identifyChord(lastTwoChords[1]);

  if (first == null || second == null) {
    return "unknown";
  }

  const firstDegree = scaleDegree(first.root, key.root);
  const secondDegree = scaleDegree(second.root, key.root);

  // Authentic cadence: V -> I
  if (firstDegree == 7 && secondDegree == 0) {
    if (first.quality == "dominant7" || first.quality == "major") {
      return "authentic";
    }
  }

  // Plagal cadence: IV -> I
  if (firstDegree == 5 && secondDegree == 0) {
    return "plagal";
  }

  // Half cadence: ? -> V
  if (secondDegree == 7) {
    return "half";
  }

  // Deceptive cadence: V -> vi
  if (firstDegree == 7 && secondDegree == 9) {
    return "deceptive";
  }

  return "other";
}
`;

export const STDLIB_INSTRUMENT = `// std:instrument (v5)
// Instrument groups, layers, routing, and orchestration

import core;

// ============================================
// Instrument Groups
// ============================================

// Define an instrument group
export fn instrumentGroup(name, instruments) {
  return {
    type: "group",
    name: name,
    instruments: instruments
  };
}

// Standard orchestral groups
export fn strings() {
  return instrumentGroup("Strings", [
    "violin1", "violin2", "viola", "cello", "contrabass"
  ]);
}

export fn woodwinds() {
  return instrumentGroup("Woodwinds", [
    "flute", "oboe", "clarinet", "bassoon"
  ]);
}

export fn brass() {
  return instrumentGroup("Brass", [
    "horn", "trumpet", "trombone", "tuba"
  ]);
}

export fn percussion() {
  return instrumentGroup("Percussion", [
    "timpani", "snare", "bass_drum", "cymbals", "triangle",
    "xylophone", "glockenspiel", "marimba", "vibraphone"
  ]);
}

// Band groups
export fn rhythmSection() {
  return instrumentGroup("Rhythm Section", [
    "drums", "bass", "guitar", "keys"
  ]);
}

// ============================================
// Instrument Layering
// ============================================

// Create a layered instrument (multiple sounds playing together)
export fn layer(name, sounds, weights) {
  let layerSounds = [];
  for (i in 0..(sounds.length - 1)) {
    let weight = 1.0;
    if (weights != null && i < weights.length) {
      weight = weights[i];
    }
    layerSounds[layerSounds.length] = {
      sound: sounds[i],
      weight: weight
    };
  }
  return {
    type: "layer",
    name: name,
    sounds: layerSounds
  };
}

// Layer with velocity splits
export fn velocityLayer(name, layers) {
  // layers = [{ sound: "piano_soft", minVel: 0, maxVel: 0.4 }, ...]
  return {
    type: "velocityLayer",
    name: name,
    layers: layers
  };
}

// Common velocity layer configurations
export fn velocitySplit2(softSound, loudSound) {
  return velocityLayer("velocity_split", [
    { sound: softSound, minVel: 0.0, maxVel: 0.5 },
    { sound: loudSound, minVel: 0.5, maxVel: 1.0 }
  ]);
}

export fn velocitySplit3(soft, medium, loud) {
  return velocityLayer("velocity_split", [
    { sound: soft, minVel: 0.0, maxVel: 0.33 },
    { sound: medium, minVel: 0.33, maxVel: 0.66 },
    { sound: loud, minVel: 0.66, maxVel: 1.0 }
  ]);
}

// ============================================
// Bus Routing
// ============================================

// Define an audio bus
export fn bus(name, inputs, effects) {
  return {
    type: "bus",
    name: name,
    inputs: inputs,
    effects: effects
  };
}

// Send track to bus
export fn sendToBus(trackName, busName, level) {
  let sendLevel = level;
  if (sendLevel == null) {
    sendLevel = 1.0;
  }
  return {
    type: "send",
    from: trackName,
    to: busName,
    level: sendLevel
  };
}

// Create submix bus
export fn submix(name, tracks) {
  return bus(name, tracks, []);
}

// Create effect return bus
export fn effectReturn(name, effectChain) {
  return {
    type: "effectReturn",
    name: name,
    effects: effectChain
  };
}

// ============================================
// Effect Chains
// ============================================

// Define an effect chain
export fn effectChain(effects) {
  return {
    type: "effectChain",
    effects: effects
  };
}

// Common effect presets
export fn reverbBus() {
  return effectChain([
    { type: "reverb", size: 0.7, decay: 2.0 }
  ]);
}

export fn delayBus() {
  return effectChain([
    { type: "delay", time: "1/4", feedback: 0.4 }
  ]);
}

export fn compressionBus() {
  return effectChain([
    { type: "compressor", threshold: -12, ratio: 4, attack: 10, release: 100 }
  ]);
}

// ============================================
// Track Templates
// ============================================

// Create track with standard settings
export fn trackTemplate(name, sound, role, settings) {
  let mix = { gain: 0, pan: 0 };
  if (settings != null) {
    if (settings.gain != null) {
      mix.gain = settings.gain;
    }
    if (settings.pan != null) {
      mix.pan = settings.pan;
    }
  }
  return {
    name: name,
    role: role,
    sound: sound,
    mix: mix,
    placements: []
  };
}

// Quick track creators
export fn instrumentTrack(name, sound, settings) {
  return trackTemplate(name, sound, "Instrument", settings);
}

export fn drumTrack(name, sound, settings) {
  return trackTemplate(name, sound, "Drums", settings);
}

export fn vocalTrack(name, sound, settings) {
  return trackTemplate(name, sound, "Vocal", settings);
}

export fn automationTrack(name, settings) {
  return trackTemplate(name, null, "Automation", settings);
}

// ============================================
// Divisi
// ============================================

// Split a part into divisi (multiple voices)
export fn divisi(clip, numVoices) {
  let voices = [];
  for (i in 0..(numVoices - 1)) {
    let voiceEvents = [];
    for (ev in clip.events) {
      if (ev.voice == i || ev.voice == null) {
        voiceEvents[voiceEvents.length] = ev;
      }
    }
    voices[voices.length] = { events: voiceEvents, length: clip.length };
  }
  return voices;
}

// Merge divisi parts
export fn mergeDivisi(voices) {
  let events = [];
  let maxLen = 0 / 1;

  let voiceNum = 0;
  for (voice in voices) {
    for (ev in voice.events) {
      let newEv = core.cloneEvent(ev);
      newEv.voice = voiceNum;
      events[events.length] = newEv;
    }
    const len = core.clipLen(voice);
    if (len > maxLen) {
      maxLen = len;
    }
    voiceNum = voiceNum + 1;
  }

  return { events: events, length: maxLen };
}

// ============================================
// Doubling
// ============================================

// Double a part with another instrument at same pitch
export fn double(clip, transposition) {
  let trans = transposition;
  if (trans == null) {
    trans = 0;
  }

  let events = [];
  for (ev in clip.events) {
    events[events.length] = core.cloneEvent(ev);
    if (ev.type == "note") {
      let doubled = core.cloneEvent(ev);
      doubled.pitch = ev.pitch + trans;
      doubled.voice = 1;
      events[events.length] = doubled;
    } else if (ev.type == "chord") {
      let doubled = core.cloneEvent(ev);
      let newPitches = [];
      for (p in ev.pitches) {
        newPitches[newPitches.length] = p + trans;
      }
      doubled.pitches = newPitches;
      doubled.voice = 1;
      events[events.length] = doubled;
    }
  }

  return { events: events, length: clip.length };
}

// Double at octave
export fn doubleOctave(clip, direction) {
  let trans = 12;
  if (direction == "down") {
    trans = -12;
  }
  return double(clip, trans);
}

// Double at multiple intervals
export fn doubleMultiple(clip, intervals) {
  let events = [];
  for (ev in clip.events) {
    events[events.length] = core.cloneEvent(ev);
  }

  let voiceNum = 1;
  for (interval in intervals) {
    for (ev in clip.events) {
      if (ev.type == "note") {
        let doubled = core.cloneEvent(ev);
        doubled.pitch = ev.pitch + interval;
        doubled.voice = voiceNum;
        events[events.length] = doubled;
      } else if (ev.type == "chord") {
        let doubled = core.cloneEvent(ev);
        let newPitches = [];
        for (p in ev.pitches) {
          newPitches[newPitches.length] = p + interval;
        }
        doubled.pitches = newPitches;
        doubled.voice = voiceNum;
        events[events.length] = doubled;
      }
    }
    voiceNum = voiceNum + 1;
  }

  return { events: events, length: clip.length };
}

// ============================================
// Orchestration Helpers
// ============================================

// Distribute chord across multiple voices/instruments
export fn voicedChord(pitches, startPos, dur, velocities) {
  let events = [];
  for (i in 0..(pitches.length - 1)) {
    let vel = 0.8;
    if (velocities != null && i < velocities.length) {
      vel = velocities[i];
    }
    events[events.length] = {
      type: "note",
      start: startPos,
      dur: dur,
      pitch: pitches[i],
      velocity: vel,
      voice: i
    };
  }
  return { events: events, length: startPos + dur };
}

// Create tutti (all instruments playing)
export fn tutti(clip, instruments) {
  let tracks = [];
  for (inst in instruments) {
    tracks[tracks.length] = {
      instrument: inst,
      clip: clip
    };
  }
  return tracks;
}

// Create solo passage (one instrument featured)
export fn solo(clip, soloInstrument, accompInstruments, accompClip) {
  let tracks = [];
  tracks[tracks.length] = {
    instrument: soloInstrument,
    clip: clip,
    role: "solo"
  };
  for (inst in accompInstruments) {
    tracks[tracks.length] = {
      instrument: inst,
      clip: accompClip,
      role: "accompaniment"
    };
  }
  return tracks;
}

// ============================================
// Range Checking
// ============================================

// Check if pitch is within instrument range
export fn inRange(pitch, low, high) {
  return pitch >= low && pitch <= high;
}

// Standard instrument ranges (MIDI note numbers)
export const RANGES = {
  violin: { low: 55, high: 103 },
  viola: { low: 48, high: 91 },
  cello: { low: 36, high: 84 },
  contrabass: { low: 28, high: 67 },
  flute: { low: 60, high: 96 },
  oboe: { low: 58, high: 91 },
  clarinet: { low: 50, high: 94 },
  bassoon: { low: 34, high: 75 },
  horn: { low: 34, high: 77 },
  trumpet: { low: 52, high: 82 },
  trombone: { low: 40, high: 72 },
  tuba: { low: 28, high: 58 },
  piano: { low: 21, high: 108 },
  guitar: { low: 40, high: 88 },
  bass: { low: 28, high: 60 },
  soprano: { low: 60, high: 84 },
  alto: { low: 53, high: 77 },
  tenor: { low: 48, high: 72 },
  baritone: { low: 45, high: 67 },
  bass_voice: { low: 40, high: 64 }
};

// Validate clip against instrument range
export fn validateRange(clip, instrument) {
  const range = RANGES[instrument];
  if (range == null) {
    return { valid: true, outOfRange: [] };
  }

  let outOfRange = [];
  for (ev in clip.events) {
    if (ev.type == "note") {
      if (!inRange(ev.pitch, range.low, range.high)) {
        outOfRange[outOfRange.length] = ev;
      }
    } else if (ev.type == "chord") {
      for (p in ev.pitches) {
        if (!inRange(p, range.low, range.high)) {
          outOfRange[outOfRange.length] = ev;
          break;
        }
      }
    }
  }

  return {
    valid: outOfRange.length == 0,
    outOfRange: outOfRange
  };
}
`;

export const STDLIB_LSYSTEM = `// std:lsystem (v5.2)
// L-systems (Lindenmayer systems) for algorithmic composition
// Generates self-similar, fractal-like structures for melody, rhythm, and form

// ============================================
// Core L-System Engine
// ============================================

// Create an L-system with axiom and rules
// rules: object mapping symbols to replacement strings
// Example: lsystem("A", { "A": "AB", "B": "A" })
export fn lsystem(axiom, rules) {
  return {
    axiom: axiom,
    rules: rules,
    current: axiom
  };
}

// Apply one generation of L-system rules
export fn iterate(sys) {
  let result = "";
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const replacement = sys.rules[ch];
    if (replacement != null) {
      result = result + replacement;
    } else {
      result = result + ch;
    }
  }
  return {
    axiom: sys.axiom,
    rules: sys.rules,
    current: result
  };
}

// Apply n generations
export fn generate(sys, generations) {
  let current = sys;
  for (_ in 0..(generations - 1)) {
    current = iterate(current);
  }
  return current;
}

// Get the current string of an L-system
export fn getString(sys) {
  return sys.current;
}

// Get length of current string
export fn getLength(sys) {
  return sys.current.length;
}

// ============================================
// Stochastic L-Systems
// ============================================

// Create a stochastic L-system with probabilistic rules
// rules: object mapping symbols to arrays of {replacement, weight}
// Example: stochasticLsystem("A", { "A": [{r: "AB", w: 2}, {r: "BA", w: 1}] })
export fn stochasticLsystem(axiom, rules) {
  return {
    axiom: axiom,
    rules: rules,
    current: axiom,
    stochastic: true
  };
}

// Iterate stochastic L-system with seed
export fn iterateStochastic(sys, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let result = "";
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const options = sys.rules[ch];

    if (options != null) {
      // Calculate total weight
      let total = 0;
      for (opt in options) {
        total = total + opt.w;
      }

      // Random selection
      rng = (rng * 1103515245 + 12345) % 2147483648;
      let r = (rng / 2147483648) * total;

      let selected = options[0].r;
      for (opt in options) {
        r = r - opt.w;
        if (r <= 0) {
          selected = opt.r;
          break;
        }
      }
      result = result + selected;
    } else {
      result = result + ch;
    }
  }

  return {
    axiom: sys.axiom,
    rules: sys.rules,
    current: result,
    stochastic: true,
    lastSeed: rng
  };
}

// Generate n iterations of stochastic L-system
export fn generateStochastic(sys, generations, seed) {
  let current = sys;
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  for (_ in 0..(generations - 1)) {
    current = iterateStochastic(current, rng);
    rng = current.lastSeed;
  }
  return current;
}

// ============================================
// Parametric L-Systems
// ============================================

// Context-sensitive L-system
// Uses special markers: < for left context, > for right context
// Example rule: "A<B>C": "D" means B becomes D when between A and C
export fn contextLsystem(axiom, rules, contextRules) {
  return {
    axiom: axiom,
    rules: rules,
    contextRules: contextRules,
    current: axiom,
    contextSensitive: true
  };
}

// Iterate context-sensitive L-system
export fn iterateContext(sys) {
  let result = "";
  const len = sys.current.length;

  for (i in 0..(len - 1)) {
    const ch = sys.current[i];
    let left = "";
    let right = "";
    if (i > 0) {
      left = sys.current[i - 1];
    }
    if (i < len - 1) {
      right = sys.current[i + 1];
    }

    // Check context rules first
    let found = false;
    if (sys.contextRules != null) {
      const contextKey = left + "<" + ch + ">" + right;
      const contextRule = sys.contextRules[contextKey];
      if (contextRule != null) {
        result = result + contextRule;
        found = true;
      }
    }

    // Fall back to regular rules
    if (!found) {
      const replacement = sys.rules[ch];
      if (replacement != null) {
        result = result + replacement;
      } else {
        result = result + ch;
      }
    }
  }

  return {
    axiom: sys.axiom,
    rules: sys.rules,
    contextRules: sys.contextRules,
    current: result,
    contextSensitive: true
  };
}

// ============================================
// Musical Interpretation
// ============================================

// Map L-system symbols to pitches
// mapping: object from symbol to pitch offset
// Returns array of pitches
export fn toPitches(sys, mapping, basePitch) {
  let base = basePitch;
  if (base == null) {
    base = 60;  // Middle C
  }

  let pitches = [];
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const offset = mapping[ch];
    if (offset != null) {
      pitches[pitches.length] = base + offset;
    }
  }
  return pitches;
}

// Map L-system symbols to scale degrees
// Returns pitches based on scale
export fn toScaleDegrees(sys, mapping, scale, basePitch) {
  let base = basePitch;
  if (base == null) {
    base = 60;
  }

  let pitches = [];
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const degree = mapping[ch];
    if (degree != null) {
      // Map degree to scale pitch
      let octaveShift = 0;
      let deg = degree;

      while (deg >= scale.length) {
        deg = deg - scale.length;
        octaveShift = octaveShift + 12;
      }
      while (deg < 0) {
        deg = deg + scale.length;
        octaveShift = octaveShift - 12;
      }

      pitches[pitches.length] = base + scale[deg] + octaveShift;
    }
  }
  return pitches;
}

// Map L-system to rhythm durations
// mapping: object from symbol to duration
export fn toRhythm(sys, mapping) {
  let durations = [];
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const dur = mapping[ch];
    if (dur != null) {
      durations[durations.length] = dur;
    }
  }
  return durations;
}

// Map L-system to velocities
export fn toVelocities(sys, mapping) {
  let velocities = [];
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    const vel = mapping[ch];
    if (vel != null) {
      velocities[velocities.length] = vel;
    }
  }
  return velocities;
}

// Turtle graphics interpretation for pitch
// F: forward (add current pitch), +: increase pitch, -: decrease pitch
// [: push state, ]: pop state
export fn turtleToPitches(sys, stepSize, basePitch) {
  let step = stepSize;
  if (step == null) {
    step = 2;  // Whole step default
  }
  let base = basePitch;
  if (base == null) {
    base = 60;
  }

  let pitches = [];
  let currentPitch = base;
  let stack = [];

  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];

    if (ch == "F" || ch == "f") {
      pitches[pitches.length] = currentPitch;
    } else if (ch == "+") {
      currentPitch = currentPitch + step;
    } else if (ch == "-") {
      currentPitch = currentPitch - step;
    } else if (ch == "[") {
      stack[stack.length] = currentPitch;
    } else if (ch == "]") {
      if (stack.length > 0) {
        currentPitch = stack[stack.length - 1];
        // Pop from stack
        let newStack = [];
        for (j in 0..(stack.length - 2)) {
          newStack[newStack.length] = stack[j];
        }
        stack = newStack;
      }
    }
  }

  return pitches;
}

// ============================================
// Famous L-Systems
// ============================================

// Fibonacci sequence L-system
export fn fibonacci() {
  return lsystem("A", {
    "A": "B",
    "B": "AB"
  });
}

// Cantor dust (fractal)
export fn cantor() {
  return lsystem("A", {
    "A": "ABA",
    "B": "BBB"
  });
}

// Koch curve
export fn koch() {
  return lsystem("F", {
    "F": "F+F-F-F+F"
  });
}

// Sierpinski triangle
export fn sierpinski() {
  return lsystem("A", {
    "A": "B-A-B",
    "B": "A+B+A"
  });
}

// Dragon curve
export fn dragon() {
  return lsystem("FX", {
    "X": "X+YF+",
    "Y": "-FX-Y"
  });
}

// Hilbert curve
export fn hilbert() {
  return lsystem("A", {
    "A": "-BF+AFA+FB-",
    "B": "+AF-BFB-FA+"
  });
}

// Thue-Morse sequence (fair sequence)
export fn thueMorse() {
  return lsystem("A", {
    "A": "AB",
    "B": "BA"
  });
}

// Algae growth (original L-system by Lindenmayer)
export fn algae() {
  return lsystem("A", {
    "A": "AB",
    "B": "A"
  });
}

// ============================================
// Musical L-Systems
// ============================================

// Melodic L-system for step-wise motion
export fn melodicStepwise() {
  return lsystem("C", {
    "C": "CDE",
    "D": "DEF",
    "E": "EFG",
    "F": "FGA",
    "G": "GAB",
    "A": "ABC",
    "B": "BCD"
  });
}

// Rhythmic L-system (long-short patterns)
export fn rhythmicLongShort() {
  return lsystem("L", {
    "L": "LSS",
    "S": "L"
  });
}

// Contour L-system (up/down motion)
export fn contourUpDown() {
  return lsystem("U", {
    "U": "UDU",
    "D": "DUD"
  });
}

// Fractal melody generator
export fn fractalMelody() {
  return lsystem("M", {
    "M": "MnMNM",
    "n": "NnN",
    "N": "nMn"
  });
}

// Binary rhythm (Euclidean-like)
export fn binaryRhythm() {
  return lsystem("1", {
    "1": "10",
    "0": "1"
  });
}

// ============================================
// Utility Functions
// ============================================

// Count occurrences of a symbol
export fn countSymbol(sys, symbol) {
  let count = 0;
  for (i in 0..(sys.current.length - 1)) {
    if (sys.current[i] == symbol) {
      count = count + 1;
    }
  }
  return count;
}

// Get symbol at index
export fn symbolAt(sys, index) {
  if (index < 0 || index >= sys.current.length) {
    return null;
  }
  return sys.current[index];
}

// Get substring
export fn substring(sys, start, len) {
  let result = "";
  let endIdx = start + len;
  if (endIdx > sys.current.length) {
    endIdx = sys.current.length;
  }
  for (i in start..(endIdx - 1)) {
    result = result + sys.current[i];
  }
  return result;
}

// Reverse the L-system string
export fn reverse(sys) {
  let result = "";
  for (i in 0..(sys.current.length - 1)) {
    result = sys.current[sys.current.length - 1 - i] + result;
  }
  return {
    axiom: sys.axiom,
    rules: sys.rules,
    current: result
  };
}

// Filter symbols (keep only specified)
export fn filterSymbols(sys, keepSymbols) {
  let result = "";
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    for (s in keepSymbols) {
      if (ch == s) {
        result = result + ch;
        break;
      }
    }
  }
  return result;
}

// Replace symbols
export fn replaceSymbol(sys, from, to) {
  let result = "";
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    if (ch == from) {
      result = result + to;
    } else {
      result = result + ch;
    }
  }
  return {
    axiom: sys.axiom,
    rules: sys.rules,
    current: result
  };
}

// Analyze symbol distribution
export fn symbolDistribution(sys) {
  let counts = {};
  for (i in 0..(sys.current.length - 1)) {
    const ch = sys.current[i];
    if (counts[ch] == null) {
      counts[ch] = 0;
    }
    counts[ch] = counts[ch] + 1;
  }
  return counts;
}

// Get growth ratio between generations
export fn growthRatio(sys) {
  const before = sys.current.length;
  const after = iterate(sys).current.length;
  if (before == 0) {
    return 0;
  }
  return after / before;
}
`;

export const STDLIB_LYRICS = `// std:lyrics (v5)
// Lyrics, phonetics, pronunciation, and vocal text handling

import core;

// ============================================
// Basic Lyric Events
// ============================================

// Create a syllable lyric span
export fn syllable(text, wordPos) {
  let pos = wordPos;
  if (pos == null) {
    pos = "single";
  }
  return {
    kind: "syllable",
    text: text,
    wordPos: pos
  };
}

// Create an extend lyric (melisma continuation)
export fn extend() {
  return {
    kind: "extend",
    text: null,
    wordPos: null
  };
}

// Word positions
export const WORD_BEGIN = "begin";
export const WORD_MIDDLE = "middle";
export const WORD_END = "end";
export const WORD_SINGLE = "single";

// ============================================
// Word Processing
// ============================================

// Split a word into syllables with proper word positions
export fn wordToSyllables(syllables) {
  let result = [];
  const len = syllables.length;

  for (i in 0..(len - 1)) {
    let pos = "middle";
    if (len == 1) {
      pos = "single";
    } else if (i == 0) {
      pos = "begin";
    } else if (i == len - 1) {
      pos = "end";
    }
    result[result.length] = syllable(syllables[i], pos);
  }

  return result;
}

// Create note with lyric
export fn noteWithLyric(start, dur, pitch, velocity, lyricText, wordPos) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: velocity,
    lyric: syllable(lyricText, wordPos)
  };
}

// ============================================
// Melisma (multiple notes per syllable)
// ============================================

// Create a melisma - one syllable over multiple notes
// firstNote gets the syllable, rest get extends
export fn melisma(notes, lyricText, wordPos) {
  let events = [];
  let isFirst = true;

  for (note in notes) {
    let ev = core.cloneEvent(note);
    if (isFirst) {
      ev.lyric = syllable(lyricText, wordPos);
      isFirst = false;
    } else {
      ev.lyric = extend();
    }
    events[events.length] = ev;
  }

  // Calculate length from notes
  let maxEnd = 0 / 1;
  for (note in notes) {
    const end = note.start + note.dur;
    if (end > maxEnd) {
      maxEnd = end;
    }
  }

  return { events: events, length: maxEnd };
}

// Mark notes as melismatic extension
export fn addMelisma(clip, startPos, endPos) {
  let events = [];
  for (ev in clip.events) {
    let newEv = core.cloneEvent(ev);
    if (ev.type == "note" && ev.start > startPos && ev.start < endPos) {
      newEv.lyric = extend();
    }
    events[events.length] = newEv;
  }
  return { events: events, length: clip.length };
}

// ============================================
// IPA (International Phonetic Alphabet)
// ============================================

// Create IPA phoneme annotation
export fn ipa(phonemes) {
  return {
    kind: "phonemes",
    alphabet: "IPA",
    text: phonemes
  };
}

// Common IPA symbols as constants
export const IPA = {
  // Vowels
  a: "a",       // open front unrounded
  e: "e",       // close-mid front unrounded
  i: "i",       // close front unrounded
  o: "o",       // close-mid back rounded
  u: "u",       // close back rounded
  schwa: "\u0259",  // schwa
  ae: "\u00E6",     // ash (cat)
  ɔ: "\u0254",      // open-o (thought)
  ɛ: "\u025B",      // epsilon (bed)
  ɪ: "\u026A",      // small-cap i (kit)
  ʊ: "\u028A",      // upsilon (foot)
  ʌ: "\u028C",      // turned v (strut)
  ɑ: "\u0251",      // script a (father)

  // Consonants
  p: "p", b: "b", t: "t", d: "d", k: "k", g: "g",
  f: "f", v: "v", s: "s", z: "z",
  θ: "\u03B8",      // theta (think)
  ð: "\u00F0",      // eth (this)
  ʃ: "\u0283",      // esh (ship)
  ʒ: "\u0292",      // ezh (measure)
  tʃ: "t\u0283",    // t-esh (church)
  dʒ: "d\u0292",    // d-ezh (judge)
  m: "m", n: "n",
  ŋ: "\u014B",      // eng (sing)
  l: "l", r: "r",
  j: "j",           // palatal approximant (yes)
  w: "w",
  h: "h",
  ʔ: "\u0294",      // glottal stop

  // Stress markers
  primary: "\u02C8",    // primary stress
  secondary: "\u02CC",  // secondary stress

  // Length
  long: "\u02D0"        // length mark
};

// Create note with IPA phonemes
export fn noteWithIPA(start, dur, pitch, velocity, phonemes, wordPos) {
  return {
    type: "note",
    start: start,
    dur: dur,
    pitch: pitch,
    velocity: velocity,
    lyric: {
      kind: "phonemes",
      alphabet: "IPA",
      text: phonemes,
      wordPos: wordPos
    }
  };
}

// ============================================
// X-SAMPA (ASCII-compatible phonetic alphabet)
// ============================================

export fn xsampa(phonemes) {
  return {
    kind: "phonemes",
    alphabet: "X-SAMPA",
    text: phonemes
  };
}

// ============================================
// ARPAbet (for English synthesis)
// ============================================

export fn arpabet(phonemes) {
  return {
    kind: "phonemes",
    alphabet: "ARPAbet",
    text: phonemes
  };
}

// Common ARPAbet phonemes
export const ARPA = {
  // Vowels
  AA: "AA",   // odd
  AE: "AE",   // at
  AH: "AH",   // hut
  AO: "AO",   // ought
  AW: "AW",   // cow
  AY: "AY",   // hide
  EH: "EH",   // Ed
  ER: "ER",   // hurt
  EY: "EY",   // ate
  IH: "IH",   // it
  IY: "IY",   // eat
  OW: "OW",   // oat
  OY: "OY",   // toy
  UH: "UH",   // hood
  UW: "UW",   // two

  // Consonants
  B: "B", CH: "CH", D: "D", DH: "DH",
  F: "F", G: "G", HH: "HH", JH: "JH",
  K: "K", L: "L", M: "M", N: "N",
  NG: "NG", P: "P", R: "R", S: "S",
  SH: "SH", T: "T", TH: "TH", V: "V",
  W: "W", Y: "Y", Z: "Z", ZH: "ZH"
};

// ============================================
// Pinyin (Chinese)
// ============================================

export fn pinyin(text, tone) {
  return {
    kind: "syllable",
    alphabet: "Pinyin",
    text: text,
    tone: tone
  };
}

// ============================================
// Romaji (Japanese)
// ============================================

export fn romaji(text) {
  return {
    kind: "syllable",
    alphabet: "Romaji",
    text: text
  };
}

// ============================================
// Hiragana/Katakana
// ============================================

export fn hiragana(text) {
  return {
    kind: "syllable",
    alphabet: "Hiragana",
    text: text
  };
}

export fn katakana(text) {
  return {
    kind: "syllable",
    alphabet: "Katakana",
    text: text
  };
}

// ============================================
// Hangul (Korean)
// ============================================

export fn hangul(text) {
  return {
    kind: "syllable",
    alphabet: "Hangul",
    text: text
  };
}

// ============================================
// Breath and Articulation Marks
// ============================================

// Breath mark in lyrics
export fn breathMark() {
  return {
    kind: "breath",
    text: null
  };
}

// Glottal stop
export fn glottalStop() {
  return {
    kind: "articulation",
    text: "\u0294"  // IPA glottal stop
  };
}

// ============================================
// Lyric Line Processing
// ============================================

// Assign lyrics to a series of notes
// lyrics = array of syllable strings
// notes = array of notes
export fn assignLyrics(notes, lyrics) {
  let events = [];
  let lyricIdx = 0;

  for (note in notes) {
    let newNote = core.cloneEvent(note);
    if (lyricIdx < lyrics.length) {
      const lyricItem = lyrics[lyricIdx];
      if (lyricItem == "_" || lyricItem == "-") {
        newNote.lyric = extend();
      } else {
        newNote.lyric = syllable(lyricItem, null);
      }
      lyricIdx = lyricIdx + 1;
    }
    events[events.length] = newNote;
  }

  // Calculate length
  let maxEnd = 0 / 1;
  for (note in notes) {
    const end = note.start + note.dur;
    if (end > maxEnd) {
      maxEnd = end;
    }
  }

  return { events: events, length: maxEnd };
}

// Parse lyrics line (space-separated syllables, - for hyphenation)
export fn parseLyricLine(line) {
  let syllables = [];
  let current = "";
  let inWord = false;

  for (i in 0..(line.length - 1)) {
    const ch = line[i];
    if (ch == " ") {
      if (current != "") {
        syllables[syllables.length] = current;
        current = "";
      }
      inWord = false;
    } else if (ch == "-") {
      if (current != "") {
        syllables[syllables.length] = current;
        current = "";
      }
      // Hyphen indicates word continuation
      inWord = true;
    } else if (ch == "_") {
      // Underscore is melisma extension
      syllables[syllables.length] = "_";
    } else {
      current = current + ch;
    }
  }

  if (current != "") {
    syllables[syllables.length] = current;
  }

  return syllables;
}

// ============================================
// Vocal Expression Marks
// ============================================

// Spoken word indication
export fn spoken(text) {
  return {
    kind: "spoken",
    text: text
  };
}

// Whispered
export fn whispered(text) {
  return {
    kind: "whispered",
    text: text
  };
}

// Humming (no text)
export fn humming() {
  return {
    kind: "humming",
    text: null
  };
}

// Vocalize (ah, oh, etc.)
export fn vocalize(sound) {
  return {
    kind: "vocalize",
    text: sound
  };
}

// ============================================
// Multi-language Support
// ============================================

// Set language context
export fn setLanguage(pos, langCode) {
  return {
    type: "control",
    start: pos,
    kind: "language",
    data: { lang: langCode }
  };
}

// Common language codes
export const LANG = {
  EN: "en",
  EN_US: "en-US",
  EN_GB: "en-GB",
  JA: "ja",
  ZH: "zh",
  ZH_CN: "zh-CN",
  ZH_TW: "zh-TW",
  KO: "ko",
  DE: "de",
  FR: "fr",
  IT: "it",
  ES: "es",
  PT: "pt",
  RU: "ru",
  LA: "la"  // Latin
};
`;

export const STDLIB_MARKOV = `// std:markov (v7.0)
// Markov chain utilities for sequence modeling.
// Currently wraps the Markov helpers in std:algorithm.

import algorithm;

// Create a Markov chain from a sequence
export fn buildMarkovChain(sequence, order) {
  return algorithm:buildMarkovChain(sequence, order);
}

// Create a state key from an array of values
export fn stateKey(values) {
  if (values == null || values.length == null) {
    return "";
  }
  let out = "";
  for (i in 0..(values.length - 1)) {
    if (i > 0) {
      out = out + ",";
    }
    out = out + values[i];
  }
  return out;
}

// Parse a state key into an array of values
export fn splitState(state) {
  if (state == null) {
    return [];
  }
  let parts = [];
  let current = "";
  for (i in 0..(state.length - 1)) {
    const ch = state[i];
    if (ch == ",") {
      parts[parts.length] = current;
      current = "";
    } else {
      current = current + ch;
    }
  }
  parts[parts.length] = current;
  return parts;
}

// Get a starting state from a sequence
export fn startState(sequence, order) {
  let ord = order;
  if (ord == null) {
    ord = 1;
  }
  if (sequence.length < ord) {
    return null;
  }

  let values = [];
  for (i in 0..(ord - 1)) {
    values[values.length] = sequence[i];
  }
  return stateKey(values);
}

// Generate a sequence from a Markov chain
export fn generateFromMarkov(chain, startState, length, seed) {
  return algorithm:generateFromMarkov(chain, startState, length, seed);
}

// Build a chain and generate from the initial state in the sequence
export fn generate(sequence, order, length, seed) {
  const chain = buildMarkovChain(sequence, order);
  const state = startState(sequence, order);
  if (state == null) {
    return [];
  }
  return generateFromMarkov(chain, state, length, seed);
}
`;

export const STDLIB_MELODY = `// std:melody (v6.0)
// Melodic analysis and manipulation utilities
// Contour analysis, motif detection, shape classification

// ============================================
// Contour Analysis
// ============================================

// Contour direction constants
export const CONTOUR_UP = "up";
export const CONTOUR_DOWN = "down";
export const CONTOUR_SAME = "same";

// Extract contour from pitch sequence
export fn extractContour(pitches) {
  if (pitches.length < 2) {
    return [];
  }

  let contour = [];
  for (i in 1..(pitches.length - 1)) {
    const diff = pitches[i] - pitches[i - 1];
    if (diff > 0) {
      contour[contour.length] = CONTOUR_UP;
    } else if (diff < 0) {
      contour[contour.length] = CONTOUR_DOWN;
    } else {
      contour[contour.length] = CONTOUR_SAME;
    }
  }
  return contour;
}

// Simplified contour (removes consecutive duplicates)
export fn simplifyContour(contour) {
  if (contour.length == 0) {
    return [];
  }

  let simplified = [contour[0]];
  for (i in 1..(contour.length - 1)) {
    if (contour[i] != simplified[simplified.length - 1]) {
      simplified[simplified.length] = contour[i];
    }
  }
  return simplified;
}

// Contour similarity (0-1, higher is more similar)
export fn contourSimilarity(contour1, contour2) {
  const len = contour1.length;
  if (len != contour2.length) {
    // Use shorter length
    let minLen = len;
    if (contour2.length < minLen) {
      minLen = contour2.length;
    }
    if (minLen == 0) {
      return 0;
    }

    let matches = 0;
    for (i in 0..(minLen - 1)) {
      if (contour1[i] == contour2[i]) {
        matches = matches + 1;
      }
    }
    return matches / minLen;
  }

  if (len == 0) {
    return 1;
  }

  let matches = 0;
  for (i in 0..(len - 1)) {
    if (contour1[i] == contour2[i]) {
      matches = matches + 1;
    }
  }
  return matches / len;
}

// ============================================
// Shape Classification
// ============================================

// Melodic shape types
export const SHAPE_ASCENDING = "ascending";
export const SHAPE_DESCENDING = "descending";
export const SHAPE_ARCH = "arch";
export const SHAPE_INVERTED_ARCH = "invertedArch";
export const SHAPE_WAVE = "wave";
export const SHAPE_PLATEAU = "plateau";
export const SHAPE_STATIC = "static";

// Classify melodic shape
export fn classifyShape(pitches) {
  if (pitches.length < 2) {
    return SHAPE_STATIC;
  }

  const contour = extractContour(pitches);
  const simplified = simplifyContour(contour);

  // Count ups and downs
  let ups = 0;
  let downs = 0;
  let sames = 0;

  for (c in contour) {
    if (c == CONTOUR_UP) { ups = ups + 1; }
    else if (c == CONTOUR_DOWN) { downs = downs + 1; }
    else { sames = sames + 1; }
  }

  const total = contour.length;

  // Mostly same = static
  if (sames > total * 0.7) {
    return SHAPE_STATIC;
  }

  // Mostly up = ascending
  if (ups > total * 0.7) {
    return SHAPE_ASCENDING;
  }

  // Mostly down = descending
  if (downs > total * 0.7) {
    return SHAPE_DESCENDING;
  }

  // Check for arch patterns
  if (simplified.length >= 2) {
    // Arch: up then down
    if (simplified[0] == CONTOUR_UP) {
      let foundDown = false;
      for (i in 1..(simplified.length - 1)) {
        if (simplified[i] == CONTOUR_DOWN) {
          foundDown = true;
        }
      }
      if (foundDown && ups > downs * 0.5) {
        return SHAPE_ARCH;
      }
    }

    // Inverted arch: down then up
    if (simplified[0] == CONTOUR_DOWN) {
      let foundUp = false;
      for (i in 1..(simplified.length - 1)) {
        if (simplified[i] == CONTOUR_UP) {
          foundUp = true;
        }
      }
      if (foundUp && downs > ups * 0.5) {
        return SHAPE_INVERTED_ARCH;
      }
    }
  }

  // Multiple direction changes = wave
  if (simplified.length >= 3) {
    return SHAPE_WAVE;
  }

  return SHAPE_PLATEAU;
}

// ============================================
// Interval Analysis
// ============================================

// Get intervals between consecutive pitches
export fn getIntervals(pitches) {
  let intervals = [];
  for (i in 1..(pitches.length - 1)) {
    intervals[intervals.length] = pitches[i] - pitches[i - 1];
  }
  return intervals;
}

// Interval profile statistics
export fn intervalProfile(pitches) {
  const intervals = getIntervals(pitches);

  if (intervals.length == 0) {
    return {
      steps: 0,
      skips: 0,
      leaps: 0,
      avgInterval: 0,
      maxInterval: 0,
      minInterval: 0
    };
  }

  let steps = 0;    // 1-2 semitones
  let skips = 0;    // 3-4 semitones
  let leaps = 0;    // 5+ semitones
  let total = 0;
  let maxInt = 0;
  let minInt = 999;

  for (int in intervals) {
    let absInt = int;
    if (absInt < 0) { absInt = -absInt; }

    total = total + absInt;

    if (absInt > maxInt) { maxInt = absInt; }
    if (absInt < minInt) { minInt = absInt; }

    if (absInt <= 2) {
      steps = steps + 1;
    } else if (absInt <= 4) {
      skips = skips + 1;
    } else {
      leaps = leaps + 1;
    }
  }

  return {
    steps: steps,
    skips: skips,
    leaps: leaps,
    avgInterval: total / intervals.length,
    maxInterval: maxInt,
    minInterval: minInt
  };
}

// Calculate stepwise motion ratio
export fn stepwiseRatio(pitches) {
  const profile = intervalProfile(pitches);
  const total = profile.steps + profile.skips + profile.leaps;
  if (total == 0) { return 1.0; }
  return profile.steps / total;
}

// ============================================
// Range Analysis
// ============================================

// Get melodic range
export fn getRange(pitches) {
  if (pitches.length == 0) {
    return { lowest: 0, highest: 0, span: 0 };
  }

  let lowest = pitches[0];
  let highest = pitches[0];

  for (p in pitches) {
    if (p < lowest) { lowest = p; }
    if (p > highest) { highest = p; }
  }

  return {
    lowest: lowest,
    highest: highest,
    span: highest - lowest
  };
}

// Find climax (highest point)
export fn findClimax(pitches) {
  if (pitches.length == 0) {
    return null;
  }

  let highest = pitches[0];
  let position = 0;

  for (i in 0..(pitches.length - 1)) {
    if (pitches[i] > highest) {
      highest = pitches[i];
      position = i;
    }
  }

  return {
    pitch: highest,
    position: position,
    relativePosition: position / (pitches.length - 1)
  };
}

// Find nadir (lowest point)
export fn findNadir(pitches) {
  if (pitches.length == 0) {
    return null;
  }

  let lowest = pitches[0];
  let position = 0;

  for (i in 0..(pitches.length - 1)) {
    if (pitches[i] < lowest) {
      lowest = pitches[i];
      position = i;
    }
  }

  return {
    pitch: lowest,
    position: position,
    relativePosition: position / (pitches.length - 1)
  };
}

// ============================================
// Motif Detection
// ============================================

// Find repeated patterns (motifs)
export fn findMotifs(pitches, minLength) {
  let len = minLength;
  if (len == null) { len = 3; }

  let motifs = [];
  const n = pitches.length;

  // Convert to intervals for comparison
  const intervals = getIntervals(pitches);

  // Find all possible motifs
  for (motifLen in len..(n / 2)) {
    for (start in 0..(n - motifLen - 1)) {
      // Extract motif intervals
      let motifIntervals = [];
      for (i in 0..(motifLen - 2)) {
        motifIntervals[i] = intervals[start + i];
      }

      // Find occurrences
      let occurrences = [start];

      for (searchStart in (start + motifLen)..(n - motifLen)) {
        let matches = true;
        for (i in 0..(motifLen - 2)) {
          if (intervals[searchStart + i] != motifIntervals[i]) {
            matches = false;
          }
        }
        if (matches) {
          occurrences[occurrences.length] = searchStart;
        }
      }

      // Only include if found more than once
      if (occurrences.length > 1) {
        // Extract actual pitches
        let motifPitches = [];
        for (i in 0..(motifLen - 1)) {
          motifPitches[i] = pitches[start + i];
        }

        // Check if this motif is already recorded
        let isDuplicate = false;
        for (existing in motifs) {
          if (existing.pitches.length == motifPitches.length) {
            let same = true;
            for (i in 0..(motifPitches.length - 1)) {
              if (existing.pitches[i] != motifPitches[i]) {
                same = false;
              }
            }
            if (same) { isDuplicate = true; }
          }
        }

        if (!isDuplicate) {
          motifs[motifs.length] = {
            pitches: motifPitches,
            intervals: motifIntervals,
            occurrences: occurrences.length,
            positions: occurrences
          };
        }
      }
    }
  }

  return motifs;
}

// Check if two melodies are transpositions
export fn isTransposition(melody1, melody2) {
  if (melody1.length != melody2.length) {
    return { isTransposition: false, interval: 0 };
  }

  if (melody1.length == 0) {
    return { isTransposition: true, interval: 0 };
  }

  const interval = melody2[0] - melody1[0];

  for (i in 1..(melody1.length - 1)) {
    if (melody2[i] - melody1[i] != interval) {
      return { isTransposition: false, interval: 0 };
    }
  }

  return { isTransposition: true, interval: interval };
}

// Check if melody2 is retrograde of melody1
export fn isRetrograde(melody1, melody2) {
  if (melody1.length != melody2.length) {
    return false;
  }

  const n = melody1.length;
  for (i in 0..(n - 1)) {
    if (melody1[i] != melody2[n - 1 - i]) {
      return false;
    }
  }

  return true;
}

// Check if melody2 is inversion of melody1 (around axis)
export fn isInversion(melody1, melody2, axis) {
  if (melody1.length != melody2.length) {
    return false;
  }

  let ax = axis;
  if (ax == null) {
    ax = melody1[0];
  }

  for (i in 0..(melody1.length - 1)) {
    const expected = 2 * ax - melody1[i];
    if (melody2[i] != expected) {
      return false;
    }
  }

  return true;
}

// ============================================
// Melodic Transformations
// ============================================

// Transpose melody
export fn transpose(pitches, interval) {
  let result = [];
  for (p in pitches) {
    result[result.length] = p + interval;
  }
  return result;
}

// Invert melody around axis
export fn invert(pitches, axis) {
  let ax = axis;
  if (ax == null && pitches.length > 0) {
    ax = pitches[0];
  }

  let result = [];
  for (p in pitches) {
    result[result.length] = 2 * ax - p;
  }
  return result;
}

// Retrograde (reverse)
export fn retrograde(pitches) {
  let result = [];
  for (i in 0..(pitches.length - 1)) {
    result[i] = pitches[pitches.length - 1 - i];
  }
  return result;
}

// Retrograde inversion
export fn retrogradeInversion(pitches, axis) {
  return retrograde(invert(pitches, axis));
}

// Augmentation (multiply intervals)
export fn augment(pitches, factor) {
  if (pitches.length == 0) { return []; }

  let result = [pitches[0]];
  for (i in 1..(pitches.length - 1)) {
    const interval = pitches[i] - pitches[i - 1];
    result[i] = result[i - 1] + interval * factor;
  }
  return result;
}

// Diminution (divide intervals)
export fn diminish(pitches, factor) {
  if (factor == 0) { return pitches; }
  return augment(pitches, 1 / factor);
}

// ============================================
// Melodic Interest / Complexity
// ============================================

// Calculate melodic interest score (0-1)
export fn melodicInterest(pitches) {
  if (pitches.length < 3) { return 0.5; }

  let score = 0.5;  // Base score

  const profile = intervalProfile(pitches);
  const contour = extractContour(pitches);
  const simplified = simplifyContour(contour);
  const range = getRange(pitches);
  const climax = findClimax(pitches);

  // Variety of intervals adds interest
  const varietyRatio = (profile.steps > 0 && profile.skips > 0 && profile.leaps > 0) ? 0.1 : 0;
  score = score + varietyRatio;

  // Stepwise motion is generally good
  const stepRatio = stepwiseRatio(pitches);
  if (stepRatio > 0.5 && stepRatio < 0.9) {
    score = score + 0.1;
  }

  // Good range adds interest (not too narrow, not too wide)
  if (range.span >= 5 && range.span <= 15) {
    score = score + 0.1;
  }

  // Climax in middle-ish adds interest
  if (climax != null && climax.relativePosition > 0.3 && climax.relativePosition < 0.8) {
    score = score + 0.1;
  }

  // Direction changes add interest
  if (simplified.length >= 3 && simplified.length <= pitches.length / 2) {
    score = score + 0.1;
  }

  // Cap at 1.0
  if (score > 1.0) { score = 1.0; }
  return score;
}

// Calculate melodic complexity
export fn melodicComplexity(pitches) {
  if (pitches.length < 2) { return 0; }

  const profile = intervalProfile(pitches);
  const contour = extractContour(pitches);
  const simplified = simplifyContour(contour);

  // Complexity factors
  let complexity = 0;

  // Larger intervals = more complex
  complexity = complexity + profile.avgInterval / 12;

  // More direction changes = more complex
  complexity = complexity + simplified.length / pitches.length;

  // More leaps = more complex
  const total = profile.steps + profile.skips + profile.leaps;
  if (total > 0) {
    complexity = complexity + profile.leaps / total * 0.5;
  }

  // Normalize to 0-1
  complexity = complexity / 2.5;
  if (complexity > 1.0) { complexity = 1.0; }

  return complexity;
}

// ============================================
// Scale Degree Analysis
// ============================================

// Extract scale degrees relative to key
export fn toScaleDegrees(pitches, keyRoot) {
  let degrees = [];
  for (p in pitches) {
    degrees[degrees.length] = (p - keyRoot) % 12;
  }
  return degrees;
}

// Check if melody is diatonic to major scale
export fn isDiatonic(pitches, keyRoot) {
  const majorScale = [0, 2, 4, 5, 7, 9, 11];

  for (p in pitches) {
    const pc = (p - keyRoot) % 12;
    let found = false;
    for (degree in majorScale) {
      if (pc == degree) { found = true; }
    }
    if (!found) { return false; }
  }

  return true;
}

// Find chromatic notes
export fn findChromaticNotes(pitches, keyRoot) {
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  let chromatic = [];

  for (i in 0..(pitches.length - 1)) {
    const pc = (pitches[i] - keyRoot) % 12;
    let found = false;
    for (degree in majorScale) {
      if (pc == degree) { found = true; }
    }
    if (!found) {
      chromatic[chromatic.length] = { pitch: pitches[i], position: i };
    }
  }

  return chromatic;
}

// ============================================
// Phrase Analysis
// ============================================

// Detect phrase boundaries (based on rests, long notes, or large leaps)
export fn detectPhrases(pitches, durations) {
  if (pitches.length == 0) { return []; }

  let phrases = [];
  let currentPhrase = { start: 0, end: 0 };

  // Calculate average duration
  let avgDur = 0;
  for (d in durations) {
    avgDur = avgDur + d;
  }
  avgDur = avgDur / durations.length;

  for (i in 1..(pitches.length - 1)) {
    let isBreak = false;

    // Long note suggests phrase end
    if (durations[i - 1] > avgDur * 1.5) {
      isBreak = true;
    }

    // Large leap suggests new phrase
    let leap = pitches[i] - pitches[i - 1];
    if (leap < 0) { leap = -leap; }
    if (leap > 7) {
      isBreak = true;
    }

    if (isBreak) {
      currentPhrase.end = i - 1;
      phrases[phrases.length] = currentPhrase;
      currentPhrase = { start: i, end: i };
    }
  }

  // Add final phrase
  currentPhrase.end = pitches.length - 1;
  phrases[phrases.length] = currentPhrase;

  return phrases;
}

// Check if phrases are balanced (similar lengths)
export fn phrasesBalanced(phrases) {
  if (phrases.length < 2) { return true; }

  let lengths = [];
  for (phrase in phrases) {
    lengths[lengths.length] = phrase.end - phrase.start + 1;
  }

  let avg = 0;
  for (len in lengths) {
    avg = avg + len;
  }
  avg = avg / lengths.length;

  // Check variance
  let variance = 0;
  for (len in lengths) {
    const diff = len - avg;
    variance = variance + diff * diff;
  }
  variance = variance / lengths.length;

  // Low variance = balanced
  return variance < avg * avg * 0.25;
}
`;

export const STDLIB_METADATA = `// std:metadata (v5)
// Metadata: copyright, credits, part extraction, publishing info

import core;

// ============================================
// Score Metadata
// ============================================

// Create complete metadata object
export fn scoreMeta(title, composer, options) {
  let meta = {
    title: title,
    artist: composer
  };

  if (options != null) {
    if (options.album != null) {
      meta.album = options.album;
    }
    if (options.copyright != null) {
      meta.copyright = options.copyright;
    }
    if (options.ext != null) {
      meta.ext = options.ext;
    } else {
      meta.ext = {};
    }

    // Extended metadata
    if (options.arranger != null) {
      meta.ext.arranger = options.arranger;
    }
    if (options.lyricist != null) {
      meta.ext.lyricist = options.lyricist;
    }
    if (options.publisher != null) {
      meta.ext.publisher = options.publisher;
    }
    if (options.genre != null) {
      meta.ext.genre = options.genre;
    }
    if (options.year != null) {
      meta.ext.year = options.year;
    }
    if (options.opus != null) {
      meta.ext.opus = options.opus;
    }
    if (options.movement != null) {
      meta.ext.movement = options.movement;
    }
    if (options.dedication != null) {
      meta.ext.dedication = options.dedication;
    }
  }

  return meta;
}

// ============================================
// Copyright and Licensing
// ============================================

// Standard copyright notice
export fn copyright(year, holder) {
  return "Copyright (c) " + year + " " + holder + ". All rights reserved.";
}

// Creative Commons licenses
export const LICENSE = {
  CC_BY: "CC BY 4.0",
  CC_BY_SA: "CC BY-SA 4.0",
  CC_BY_NC: "CC BY-NC 4.0",
  CC_BY_NC_SA: "CC BY-NC-SA 4.0",
  CC_BY_ND: "CC BY-ND 4.0",
  CC_BY_NC_ND: "CC BY-NC-ND 4.0",
  CC0: "CC0 1.0 (Public Domain)",
  ALL_RIGHTS: "All Rights Reserved",
  PUBLIC_DOMAIN: "Public Domain"
};

// Create license info
export fn licenseInfo(license, details) {
  return {
    license: license,
    details: details
  };
}

// ============================================
// Industry Standard Identifiers
// ============================================

// ISRC (International Standard Recording Code)
export fn isrc(code) {
  return {
    type: "isrc",
    code: code
  };
}

// ISWC (International Standard Musical Work Code)
export fn iswc(code) {
  return {
    type: "iswc",
    code: code
  };
}

// UPC (Universal Product Code)
export fn upc(code) {
  return {
    type: "upc",
    code: code
  };
}

// Catalog number
export fn catalogNumber(label, number) {
  return {
    label: label,
    number: number
  };
}

// ============================================
// Credits
// ============================================

// Credit entry
export fn credit(role, name, details) {
  return {
    role: role,
    name: name,
    details: details
  };
}

// Common credit roles
export fn composer(name) { return credit("Composer", name, null); }
export fn arranger(name) { return credit("Arranger", name, null); }
export fn lyricist(name) { return credit("Lyricist", name, null); }
export fn orchestrator(name) { return credit("Orchestrator", name, null); }
export fn performer(name, instrument) { return credit("Performer", name, instrument); }
export fn conductor(name) { return credit("Conductor", name, null); }
export fn producer(name) { return credit("Producer", name, null); }
export fn engineer(name) { return credit("Recording Engineer", name, null); }
export fn mixEngineer(name) { return credit("Mix Engineer", name, null); }
export fn masterEngineer(name) { return credit("Mastering Engineer", name, null); }

// Credits list
export fn creditsList(credits) {
  return {
    type: "credits",
    credits: credits
  };
}

// ============================================
// Part Extraction
// ============================================

// Extract a single part from a score
export fn extractPart(score, trackName) {
  let partTracks = [];

  for (track in score.tracks) {
    if (track.name == trackName) {
      partTracks[partTracks.length] = track;
    }
  }

  return {
    tako: score.tako,
    meta: {
      title: score.meta.title,
      artist: score.meta.artist,
      copyright: score.meta.copyright,
      ext: {
        part: trackName,
        fullScore: false
      }
    },
    tempoMap: score.tempoMap,
    meterMap: score.meterMap,
    sounds: score.sounds,
    tracks: partTracks,
    markers: score.markers
  };
}

// Extract multiple parts
export fn extractParts(score, trackNames) {
  let partTracks = [];

  for (track in score.tracks) {
    for (name in trackNames) {
      if (track.name == name) {
        partTracks[partTracks.length] = track;
      }
    }
  }

  let partNames = "";
  for (i in 0..(trackNames.length - 1)) {
    if (i > 0) {
      partNames = partNames + ", ";
    }
    partNames = partNames + trackNames[i];
  }

  return {
    tako: score.tako,
    meta: {
      title: score.meta.title,
      artist: score.meta.artist,
      copyright: score.meta.copyright,
      ext: {
        part: partNames,
        fullScore: false
      }
    },
    tempoMap: score.tempoMap,
    meterMap: score.meterMap,
    sounds: score.sounds,
    tracks: partTracks,
    markers: score.markers
  };
}

// Create part book (all parts as separate entries)
export fn createPartBook(score) {
  let parts = [];

  for (track in score.tracks) {
    parts[parts.length] = {
      name: track.name,
      part: extractPart(score, track.name)
    };
  }

  return parts;
}

// ============================================
// Version Control
// ============================================

// Version info
export fn version(major, minor, patch, notes) {
  return {
    major: major,
    minor: minor,
    patch: patch,
    string: "" + major + "." + minor + "." + patch,
    notes: notes
  };
}

// Revision history entry
export fn revision(date, author, changes) {
  return {
    date: date,
    author: author,
    changes: changes
  };
}

// Revision history
export fn revisionHistory(revisions) {
  return {
    type: "revisionHistory",
    revisions: revisions
  };
}

// ============================================
// Performance Information
// ============================================

// Premiere info
export fn premiereInfo(date, venue, performers) {
  return {
    type: "premiere",
    date: date,
    venue: venue,
    performers: performers
  };
}

// Commission info
export fn commissionInfo(commissioner, date, occasion) {
  return {
    type: "commission",
    commissioner: commissioner,
    date: date,
    occasion: occasion
  };
}

// ============================================
// Program Notes
// ============================================

// Program note
export fn programNote(text, author) {
  return {
    type: "programNote",
    text: text,
    author: author
  };
}

// Performance instructions
export fn performanceInstructions(text) {
  return {
    type: "performanceInstructions",
    text: text
  };
}

// ============================================
// Duration and Difficulty
// ============================================

// Estimated duration
export fn estimatedDuration(minutes, seconds) {
  return {
    type: "duration",
    minutes: minutes,
    seconds: seconds,
    total: minutes * 60 + seconds
  };
}

// Difficulty rating
export const DIFFICULTY = {
  BEGINNER: 1,
  EASY: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  PROFESSIONAL: 5,
  VIRTUOSO: 6
};

export fn difficultyRating(overall, parts) {
  return {
    type: "difficulty",
    overall: overall,
    parts: parts
  };
}

// ============================================
// Instrumentation
// ============================================

// Full instrumentation list
export fn instrumentation(instruments) {
  return {
    type: "instrumentation",
    instruments: instruments
  };
}

// Instrument requirement
export fn instrumentRequirement(name, quantity, notes) {
  return {
    name: name,
    quantity: quantity,
    notes: notes
  };
}

// Standard ensemble types
export fn soloInstrumentation(instrument) {
  return instrumentation([instrumentRequirement(instrument, 1, null)]);
}

export fn duoInstrumentation(inst1, inst2) {
  return instrumentation([
    instrumentRequirement(inst1, 1, null),
    instrumentRequirement(inst2, 1, null)
  ]);
}

export fn trioInstrumentation(inst1, inst2, inst3) {
  return instrumentation([
    instrumentRequirement(inst1, 1, null),
    instrumentRequirement(inst2, 1, null),
    instrumentRequirement(inst3, 1, null)
  ]);
}

export fn stringQuartet() {
  return instrumentation([
    instrumentRequirement("Violin I", 1, null),
    instrumentRequirement("Violin II", 1, null),
    instrumentRequirement("Viola", 1, null),
    instrumentRequirement("Cello", 1, null)
  ]);
}

export fn pianoTrio() {
  return instrumentation([
    instrumentRequirement("Piano", 1, null),
    instrumentRequirement("Violin", 1, null),
    instrumentRequirement("Cello", 1, null)
  ]);
}

// ============================================
// Export Settings
// ============================================

// PDF export settings
export fn pdfSettings(options) {
  return {
    type: "pdfSettings",
    pageSize: options.pageSize,  // "A4", "Letter", etc.
    orientation: options.orientation,  // "portrait", "landscape"
    margins: options.margins,
    staffSize: options.staffSize,
    fontSize: options.fontSize
  };
}

// Audio export settings
export fn audioSettings(options) {
  return {
    type: "audioSettings",
    format: options.format,  // "wav", "mp3", "flac"
    sampleRate: options.sampleRate,
    bitDepth: options.bitDepth,
    channels: options.channels
  };
}

// MIDI export settings
export fn midiSettings(options) {
  return {
    type: "midiSettings",
    format: options.format,  // 0, 1, or 2
    ppqn: options.ppqn,
    includeTempo: options.includeTempo,
    includeMarkers: options.includeMarkers
  };
}
`;

export const STDLIB_MICROTONAL = `// std:microtonal (v5.3)
// Microtonal and xenharmonic music utilities
// Supports EDO systems, just intonation, and various tuning systems

// ============================================
// Constants
// ============================================

// Reference frequency for A4
export const A4_FREQ = 440.0;
export const A4_MIDI = 69;

// Mathematical constants
const LN2 = 0.693147180559945;
const LOG2_E = 1.4426950408889634;

// ============================================
// Equal Division of Octave (EDO)
// ============================================

// Create an EDO tuning system
export fn edo(divisions) {
  return {
    type: "edo",
    divisions: divisions,
    stepCents: 1200 / divisions
  };
}

// Common EDO systems
export fn edo12() { return edo(12); }   // Standard Western
export fn edo19() { return edo(19); }   // Better thirds
export fn edo22() { return edo(22); }   // Better sevenths
export fn edo24() { return edo(24); }   // Quarter tones
export fn edo31() { return edo(31); }   // Excellent approximation
export fn edo41() { return edo(41); }   // Very accurate
export fn edo53() { return edo(53); }   // Near-just

// Get frequency for EDO step
export fn edoFrequency(tuning, step, refFreq) {
  let ref = refFreq;
  if (ref == null) {
    ref = A4_FREQ;
  }

  const cents = step * tuning.stepCents;
  // 2^(cents/1200)
  const ratio = 2 ** (cents / 1200);
  return ref * ratio;
}

// Get cents for EDO step
export fn edoCents(tuning, step) {
  return step * tuning.stepCents;
}

// Find closest EDO step to a ratio
export fn ratioToEdoStep(tuning, ratio) {
  // cents = 1200 * log2(ratio)
  const cents = 1200 * log2Approx(ratio);
  return cents / tuning.stepCents;
}

// Round to nearest EDO step
export fn quantizeToEdo(tuning, cents) {
  const step = cents / tuning.stepCents;
  // Round
  let rounded = step;
  if (step >= 0) {
    rounded = step + 0.5;
    rounded = rounded - (rounded % 1);
  } else {
    rounded = step - 0.5;
    rounded = rounded - (rounded % 1);
  }
  return rounded * tuning.stepCents;
}

// ============================================
// Just Intonation
// ============================================

// Create a just intonation ratio
export fn ratio(num, den) {
  return {
    type: "ratio",
    numerator: num,
    denominator: den
  };
}

// Convert ratio to cents
export fn ratioToCents(r) {
  const decimal = r.numerator / r.denominator;
  return 1200 * log2Approx(decimal);
}

// Convert ratio to frequency
export fn ratioToFrequency(r, baseFreq) {
  let base = baseFreq;
  if (base == null) {
    base = A4_FREQ;
  }
  return base * r.numerator / r.denominator;
}

// Common just intervals
export fn unison() { return ratio(1, 1); }
export fn minorSecond() { return ratio(16, 15); }
export fn majorSecond() { return ratio(9, 8); }
export fn minorThird() { return ratio(6, 5); }
export fn majorThird() { return ratio(5, 4); }
export fn perfectFourth() { return ratio(4, 3); }
export fn tritone() { return ratio(45, 32); }
export fn perfectFifth() { return ratio(3, 2); }
export fn minorSixth() { return ratio(8, 5); }
export fn majorSixth() { return ratio(5, 3); }
export fn minorSeventh() { return ratio(9, 5); }
export fn majorSeventh() { return ratio(15, 8); }
export fn octave() { return ratio(2, 1); }

// Septimal (7-limit) intervals
export fn septimalMinorThird() { return ratio(7, 6); }
export fn septimalTritone() { return ratio(7, 5); }
export fn harmonicSeventh() { return ratio(7, 4); }
export fn septimalMinorSecond() { return ratio(28, 27); }

// 11-limit intervals
export fn undecimalNeutralSecond() { return ratio(11, 10); }
export fn undecimalTritone() { return ratio(11, 8); }
export fn undecimalNeutralSeventh() { return ratio(11, 6); }

// ============================================
// Just Intonation Scales
// ============================================

// Ptolemaic (syntonic) major scale
export fn justMajor() {
  return [
    ratio(1, 1),
    ratio(9, 8),
    ratio(5, 4),
    ratio(4, 3),
    ratio(3, 2),
    ratio(5, 3),
    ratio(15, 8),
    ratio(2, 1)
  ];
}

// Just minor scale
export fn justMinor() {
  return [
    ratio(1, 1),
    ratio(9, 8),
    ratio(6, 5),
    ratio(4, 3),
    ratio(3, 2),
    ratio(8, 5),
    ratio(9, 5),
    ratio(2, 1)
  ];
}

// Harmonic series (first 16 partials)
export fn harmonicSeries(count) {
  let n = count;
  if (n == null) {
    n = 16;
  }

  let ratios = [];
  for (i in 1..n) {
    ratios[ratios.length] = ratio(i, 1);
  }
  return ratios;
}

// Subharmonic series
export fn subharmonicSeries(count) {
  let n = count;
  if (n == null) {
    n = 16;
  }

  let ratios = [];
  for (i in 1..n) {
    ratios[ratios.length] = ratio(n, i);
  }
  return ratios;
}

// ============================================
// Cent Operations
// ============================================

// Convert MIDI note to cents from A4
export fn midiToCents(midiNote) {
  return (midiNote - A4_MIDI) * 100;
}

// Convert cents from A4 to frequency
export fn centsToFrequency(cents, refFreq) {
  let ref = refFreq;
  if (ref == null) {
    ref = A4_FREQ;
  }
  return ref * (2 ** (cents / 1200));
}

// Convert frequency to cents from A4
export fn frequencyToCents(freq, refFreq) {
  let ref = refFreq;
  if (ref == null) {
    ref = A4_FREQ;
  }
  return 1200 * log2Approx(freq / ref);
}

// Add cents offset to MIDI note
export fn detune(midiNote, centsOffset) {
  return {
    type: "microtonalPitch",
    baseMidi: midiNote,
    centsOffset: centsOffset,
    totalCents: midiToCents(midiNote) + centsOffset
  };
}

// Create pitch from cents
export fn pitchFromCents(cents) {
  // Find closest MIDI note
  const midiApprox = A4_MIDI + cents / 100;
  let baseMidi = midiApprox;
  if (midiApprox >= 0) {
    baseMidi = midiApprox - (midiApprox % 1);
  } else {
    baseMidi = midiApprox - 1 - ((midiApprox - 1) % 1);
  }

  const centsOffset = cents - (baseMidi - A4_MIDI) * 100;

  return {
    type: "microtonalPitch",
    baseMidi: baseMidi,
    centsOffset: centsOffset,
    totalCents: cents
  };
}

// ============================================
// Historical Temperaments
// ============================================

// Pythagorean tuning (pure fifths)
export fn pythagorean() {
  return {
    type: "temperament",
    name: "pythagorean",
    intervals: [
      0,      // C
      90,     // C#
      204,    // D
      294,    // Eb
      408,    // E
      498,    // F
      588,    // F#
      702,    // G
      792,    // G#
      906,    // A
      996,    // Bb
      1110    // B
    ]
  };
}

// Quarter-comma meantone
export fn quarterCommaMeantone() {
  return {
    type: "temperament",
    name: "quarterCommaMeantone",
    intervals: [
      0,      // C
      76,     // C#
      193,    // D
      310,    // Eb
      386,    // E
      503,    // F
      579,    // F#
      697,    // G
      773,    // G#
      890,    // A
      1007,   // Bb
      1083    // B
    ]
  };
}

// Werckmeister III
export fn werckmeisterIII() {
  return {
    type: "temperament",
    name: "werckmeisterIII",
    intervals: [
      0,      // C
      90,     // C#
      192,    // D
      294,    // Eb
      390,    // E
      498,    // F
      588,    // F#
      696,    // G
      792,    // G#
      888,    // A
      996,    // Bb
      1092    // B
    ]
  };
}

// Kirnberger III
export fn kirnbergerIII() {
  return {
    type: "temperament",
    name: "kirnbergerIII",
    intervals: [
      0,      // C
      90,     // C#
      193,    // D
      294,    // Eb
      386,    // E
      498,    // F
      590,    // F#
      697,    // G
      792,    // G#
      890,    // A
      996,    // Bb
      1088    // B
    ]
  };
}

// Get frequency from temperament
export fn temperamentFrequency(temp, pitchClass, octave, refFreq) {
  let ref = refFreq;
  if (ref == null) {
    ref = 261.63;  // C4
  }

  const cents = temp.intervals[pitchClass % 12] + (octave * 1200);
  return ref * (2 ** (cents / 1200));
}

// ============================================
// Exotic Scales
// ============================================

// Bohlen-Pierce scale (13-EDO of 3:1)
export fn bohlenPierce() {
  return {
    type: "nonOctave",
    name: "bohlenPierce",
    divisions: 13,
    period: ratio(3, 1),  // Tritave instead of octave
    stepCents: 146.3      // 1901.96 / 13
  };
}

// Carlos Alpha (78 cents step)
export fn carlosAlpha() {
  return {
    type: "nonOctave",
    name: "carlosAlpha",
    stepCents: 78,
    divisions: 15.385  // ~15.385 steps per octave
  };
}

// Carlos Beta (63.8 cents step)
export fn carlosBeta() {
  return {
    type: "nonOctave",
    name: "carlosBeta",
    stepCents: 63.8,
    divisions: 18.8
  };
}

// Carlos Gamma (35.1 cents step)
export fn carlosGamma() {
  return {
    type: "nonOctave",
    name: "carlosGamma",
    stepCents: 35.1,
    divisions: 34.2
  };
}

// ============================================
// Interval Analysis
// ============================================

// Calculate interval between two pitches in cents
export fn intervalCents(pitch1, pitch2) {
  let cents1 = 0;
  let cents2 = 0;

  if (pitch1.totalCents != null) {
    cents1 = pitch1.totalCents;
  } else {
    cents1 = pitch1 * 100;  // Assume MIDI
  }

  if (pitch2.totalCents != null) {
    cents2 = pitch2.totalCents;
  } else {
    cents2 = pitch2 * 100;
  }

  return cents2 - cents1;
}

// Find the prime limit of a ratio
export fn primeLimit(r) {
  let num = r.numerator;
  let den = r.denominator;
  let maxPrime = 2;

  // Simple prime factorization
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

  for (p in primes) {
    while (num % p == 0) {
      num = num / p;
      if (p > maxPrime) {
        maxPrime = p;
      }
    }
    while (den % p == 0) {
      den = den / p;
      if (p > maxPrime) {
        maxPrime = p;
      }
    }
  }

  return maxPrime;
}

// Check if ratio is superparticular (n+1)/n
export fn isSuperparticular(r) {
  return r.numerator == r.denominator + 1;
}

// Simplify ratio to lowest terms
export fn simplifyRatio(r) {
  let a = r.numerator;
  let b = r.denominator;

  // Find GCD
  while (b != 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return ratio(r.numerator / a, r.denominator / a);
}

// Multiply ratios
export fn multiplyRatios(r1, r2) {
  return simplifyRatio(ratio(
    r1.numerator * r2.numerator,
    r1.denominator * r2.denominator
  ));
}

// Divide ratios
export fn divideRatios(r1, r2) {
  return simplifyRatio(ratio(
    r1.numerator * r2.denominator,
    r1.denominator * r2.numerator
  ));
}

// Invert ratio
export fn invertRatio(r) {
  return ratio(r.denominator, r.numerator);
}

// ============================================
// Tuning Tables
// ============================================

// Generate tuning table (MIDI note to frequency)
export fn generateTuningTable(tuning, baseNote, baseFreq) {
  let table = {};

  for (note in 0..127) {
    let freq = 0;

    if (tuning.type == "edo") {
      const steps = note - baseNote;
      freq = baseFreq * (2 ** (steps / tuning.divisions));
    } else if (tuning.type == "temperament") {
      const octave = (note / 12) - (baseNote / 12);
      const pitchClass = note % 12;
      const cents = tuning.intervals[pitchClass] + (octave * 1200);
      freq = baseFreq * (2 ** (cents / 1200));
    }

    table[note] = freq;
  }

  return table;
}

// Generate Scala format tuning file content
export fn toScalaFormat(scale, name) {
  let result = "! " + name + ".scl\n";
  result = result + "!\n";
  result = result + name + "\n";
  result = result + (scale.length - 1) + "\n";
  result = result + "!\n";

  for (i in 1..(scale.length - 1)) {
    const r = scale[i];
    if (r.type == "ratio") {
      result = result + r.numerator + "/" + r.denominator + "\n";
    } else {
      result = result + ratioToCents(r) + "\n";
    }
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

// Approximate log2 using series expansion
fn log2Approx(x) {
  if (x <= 0) {
    return 0;
  }

  // Normalize to [1, 2)
  let exp = 0;
  let val = x;

  while (val >= 2) {
    val = val / 2;
    exp = exp + 1;
  }
  while (val < 1) {
    val = val * 2;
    exp = exp - 1;
  }

  // Taylor series for ln(x) around 1
  const y = val - 1;
  let ln = y;
  let term = y;

  for (n in 2..15) {
    term = term * (-y);
    ln = ln + term / n;
  }

  // Convert to log2: log2(x) = ln(x) / ln(2)
  return exp + ln * LOG2_E;
}

// ============================================
// MTS (MIDI Tuning Standard) Support
// ============================================

// Convert pitch to MTS format (14-bit pitch bend)
export fn toMTS(pitch) {
  if (pitch.type != "microtonalPitch") {
    return { note: pitch, bend: 0 };
  }

  const baseMidi = pitch.baseMidi;
  const centsOffset = pitch.centsOffset;

  // Convert cents to pitch bend units
  // Standard pitch bend range is ±2 semitones = ±200 cents
  // 14-bit range is 0-16383, center is 8192
  const bendRange = 200;  // cents
  const bendUnits = (centsOffset / bendRange) * 8192;

  let bend = 8192 + bendUnits;
  if (bend < 0) { bend = 0; }
  if (bend > 16383) { bend = 16383; }

  // Round to integer
  bend = bend - (bend % 1);

  return {
    note: baseMidi,
    bend: bend
  };
}

// Create MTS bulk tuning dump
export fn createMTSDump(tuningTable, name) {
  // Returns data for MTS SysEx message
  return {
    type: "mtsDump",
    name: name,
    tuning: tuningTable
  };
}
`;

export const STDLIB_MODULATION = `// std:modulation (v5.2)
// Key modulation and harmonic transition utilities
// For smooth key changes, pivot chords, and tonal analysis

// ============================================
// Key Representation
// ============================================

// Create a key object
// root: pitch class (0-11, where 0=C)
// mode: "major" or "minor"
export fn key(root, mode) {
  let m = mode;
  if (m == null) {
    m = "major";
  }
  return {
    root: root % 12,
    mode: m
  };
}

// Common keys
export const C_MAJOR = { root: 0, mode: "major" };
export const G_MAJOR = { root: 7, mode: "major" };
export const D_MAJOR = { root: 2, mode: "major" };
export const A_MAJOR = { root: 9, mode: "major" };
export const E_MAJOR = { root: 4, mode: "major" };
export const B_MAJOR = { root: 11, mode: "major" };
export const F_MAJOR = { root: 5, mode: "major" };
export const Bb_MAJOR = { root: 10, mode: "major" };
export const Eb_MAJOR = { root: 3, mode: "major" };
export const Ab_MAJOR = { root: 8, mode: "major" };

export const A_MINOR = { root: 9, mode: "minor" };
export const E_MINOR = { root: 4, mode: "minor" };
export const B_MINOR = { root: 11, mode: "minor" };
export const D_MINOR = { root: 2, mode: "minor" };
export const G_MINOR = { root: 7, mode: "minor" };
export const C_MINOR = { root: 0, mode: "minor" };
export const F_MINOR = { root: 5, mode: "minor" };

// ============================================
// Key Relationships
// ============================================

// Get relative major/minor
export fn relative(k) {
  if (k.mode == "major") {
    // Relative minor is 3 semitones down
    return { root: (k.root + 9) % 12, mode: "minor" };
  } else {
    // Relative major is 3 semitones up
    return { root: (k.root + 3) % 12, mode: "major" };
  }
}

// Get parallel major/minor (same root, different mode)
export fn parallel(k) {
  if (k.mode == "major") {
    return { root: k.root, mode: "minor" };
  } else {
    return { root: k.root, mode: "major" };
  }
}

// Get dominant key (fifth above)
export fn dominant(k) {
  return { root: (k.root + 7) % 12, mode: k.mode };
}

// Get subdominant key (fourth above / fifth below)
export fn subdominant(k) {
  return { root: (k.root + 5) % 12, mode: k.mode };
}

// Get supertonic key (second above)
export fn supertonic(k) {
  return { root: (k.root + 2) % 12, mode: "minor" };
}

// Get mediant key (third above)
export fn mediant(k) {
  if (k.mode == "major") {
    return { root: (k.root + 4) % 12, mode: "minor" };
  } else {
    return { root: (k.root + 3) % 12, mode: "major" };
  }
}

// Get submediant key (sixth above)
export fn submediant(k) {
  if (k.mode == "major") {
    return { root: (k.root + 9) % 12, mode: "minor" };
  } else {
    return { root: (k.root + 8) % 12, mode: "major" };
  }
}

// ============================================
// Distance and Relationship Analysis
// ============================================

// Calculate distance on circle of fifths
export fn fifthsDistance(k1, k2) {
  // Count fifths from k1 to k2
  let dist = 0;
  let current = k1.root;

  // Try going up in fifths
  for (i in 0..12) {
    if (current == k2.root) {
      return i;
    }
    current = (current + 7) % 12;
  }

  // Try going down in fifths
  current = k1.root;
  for (i in 0..12) {
    if (current == k2.root) {
      return -i;
    }
    current = (current + 5) % 12;
  }

  return 0;
}

// Calculate chromatic distance
export fn chromaticDistance(k1, k2) {
  let dist = k2.root - k1.root;
  if (dist < 0) {
    dist = dist + 12;
  }
  if (dist > 6) {
    dist = dist - 12;
  }
  return dist;
}

// Check if keys are closely related
// (differ by at most one accidental)
export fn areCloselyRelated(k1, k2) {
  const dist = fifthsDistance(k1, k2);
  const absDist = dist;
  if (absDist < 0) {
    return (-absDist) <= 1;
  }
  return absDist <= 1;
}

// Get number of shared pitch classes between keys
export fn commonTones(k1, k2) {
  const scale1 = getScalePitchClasses(k1);
  const scale2 = getScalePitchClasses(k2);

  let count = 0;
  for (pc1 in scale1) {
    for (pc2 in scale2) {
      if (pc1 == pc2) {
        count = count + 1;
        break;
      }
    }
  }
  return count;
}

// Get scale pitch classes for a key
fn getScalePitchClasses(k) {
  let intervals = [0, 2, 4, 5, 7, 9, 11];  // Major
  if (k.mode == "minor") {
    intervals = [0, 2, 3, 5, 7, 8, 10];    // Natural minor
  }

  let pcs = [];
  for (i in intervals) {
    pcs[pcs.length] = (k.root + i) % 12;
  }
  return pcs;
}

// ============================================
// Pivot Chord Analysis
// ============================================

// Get diatonic chords for a key
// Returns array of {degree, root, quality}
export fn getDiatonicChords(k) {
  let intervals = [0, 2, 4, 5, 7, 9, 11];  // Major scale
  let qualities = ["major", "minor", "minor", "major", "major", "minor", "dim"];

  if (k.mode == "minor") {
    intervals = [0, 2, 3, 5, 7, 8, 10];    // Natural minor
    qualities = ["minor", "dim", "major", "minor", "minor", "major", "major"];
  }

  let chords = [];
  for (i in 0..6) {
    chords[i] = {
      degree: i + 1,
      root: (k.root + intervals[i]) % 12,
      quality: qualities[i]
    };
  }
  return chords;
}

// Find pivot chords between two keys
// Returns chords that exist in both keys
export fn findPivotChords(k1, k2) {
  const chords1 = getDiatonicChords(k1);
  const chords2 = getDiatonicChords(k2);

  let pivots = [];

  for (c1 in chords1) {
    for (c2 in chords2) {
      if (c1.root == c2.root && c1.quality == c2.quality) {
        pivots[pivots.length] = {
          root: c1.root,
          quality: c1.quality,
          degreeInKey1: c1.degree,
          degreeInKey2: c2.degree
        };
      }
    }
  }

  return pivots;
}

// Find the best pivot chord for modulation
export fn bestPivotChord(k1, k2) {
  const pivots = findPivotChords(k1, k2);

  if (pivots.length == 0) {
    return null;
  }

  // Prefer pivots that are strong in both keys
  // (I, IV, V are strong; ii, iii, vi are medium; vii is weak)
  let best = pivots[0];
  let bestScore = 0;

  for (pivot in pivots) {
    let score = 0;

    // Score for key 1
    if (pivot.degreeInKey1 == 1 || pivot.degreeInKey1 == 4 || pivot.degreeInKey1 == 5) {
      score = score + 3;
    } else if (pivot.degreeInKey1 == 2 || pivot.degreeInKey1 == 6) {
      score = score + 2;
    } else {
      score = score + 1;
    }

    // Score for key 2
    if (pivot.degreeInKey2 == 1 || pivot.degreeInKey2 == 4 || pivot.degreeInKey2 == 5) {
      score = score + 3;
    } else if (pivot.degreeInKey2 == 2 || pivot.degreeInKey2 == 6) {
      score = score + 2;
    } else {
      score = score + 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = pivot;
    }
  }

  return best;
}

// ============================================
// Modulation Techniques
// ============================================

// Direct modulation (immediate key change)
export fn directModulation(fromKey, toKey) {
  return {
    type: "direct",
    from: fromKey,
    to: toKey,
    pivot: null
  };
}

// Pivot chord modulation
export fn pivotModulation(fromKey, toKey) {
  const pivot = bestPivotChord(fromKey, toKey);
  return {
    type: "pivot",
    from: fromKey,
    to: toKey,
    pivot: pivot
  };
}

// Sequential modulation (through intermediate key)
export fn sequentialModulation(fromKey, toKey) {
  // Find an intermediate key that's close to both
  const candidates = [
    dominant(fromKey),
    subdominant(fromKey),
    relative(fromKey),
    parallel(fromKey)
  ];

  let bestIntermediate = null;
  let bestTotalDist = 100;

  for (candidate in candidates) {
    const dist1 = fifthsDistance(fromKey, candidate);
    const dist2 = fifthsDistance(candidate, toKey);
    let absDist1 = dist1;
    let absDist2 = dist2;
    if (absDist1 < 0) { absDist1 = -absDist1; }
    if (absDist2 < 0) { absDist2 = -absDist2; }
    const totalDist = absDist1 + absDist2;

    if (totalDist < bestTotalDist) {
      bestTotalDist = totalDist;
      bestIntermediate = candidate;
    }
  }

  return {
    type: "sequential",
    from: fromKey,
    intermediate: bestIntermediate,
    to: toKey
  };
}

// Chromatic modulation (using chromatic alterations)
export fn chromaticModulation(fromKey, toKey) {
  // Use secondary dominants
  const targetDominant = { root: (toKey.root + 7) % 12, mode: "major" };

  return {
    type: "chromatic",
    from: fromKey,
    to: toKey,
    secondaryDominant: targetDominant
  };
}

// Enharmonic modulation (reinterpreting a chord)
export fn enharmonicModulation(fromKey, toKey) {
  // Common enharmonic pivots:
  // - Diminished 7th chords (can resolve to 4 different keys)
  // - German augmented 6th = Dominant 7th
  // - Neapolitan 6th

  return {
    type: "enharmonic",
    from: fromKey,
    to: toKey,
    technique: "diminished7"  // or "augmented6" or "neapolitan"
  };
}

// ============================================
// Transposition
// ============================================

// Transpose a pitch from one key to another
// Maintains scale degree relationship
export fn transposePitch(pitch, fromKey, toKey) {
  const interval = toKey.root - fromKey.root;
  return pitch + interval;
}

// Transpose a chord from one key to another
export fn transposeChord(chord, fromKey, toKey) {
  const interval = toKey.root - fromKey.root;
  let result = [];
  for (p in chord) {
    result[result.length] = p + interval;
  }
  return result;
}

// Transpose a progression from one key to another
export fn transposeProgression(progression, fromKey, toKey) {
  let result = [];
  for (chord in progression) {
    result[result.length] = transposeChord(chord, fromKey, toKey);
  }
  return result;
}

// ============================================
// Modal Interchange
// ============================================

// Borrow a chord from parallel key
export fn borrowChord(k, degree) {
  const parallelKey = parallel(k);
  const chords = getDiatonicChords(parallelKey);

  for (chord in chords) {
    if (chord.degree == degree) {
      return chord;
    }
  }
  return null;
}

// Get borrowed chords commonly used
// Returns chords from parallel mode
export fn getBorrowedChords(k) {
  const parallelKey = parallel(k);
  const ownChords = getDiatonicChords(k);
  const parallelChords = getDiatonicChords(parallelKey);

  let borrowed = [];

  for (pChord in parallelChords) {
    let isOwn = false;
    for (oChord in ownChords) {
      if (pChord.root == oChord.root && pChord.quality == oChord.quality) {
        isOwn = true;
        break;
      }
    }
    if (!isOwn) {
      borrowed[borrowed.length] = pChord;
    }
  }

  return borrowed;
}

// ============================================
// Tonicization
// ============================================

// Get secondary dominant (V/X)
export fn secondaryDominant(k, targetDegree) {
  const chords = getDiatonicChords(k);

  for (chord in chords) {
    if (chord.degree == targetDegree) {
      // Return dominant of target chord
      return {
        root: (chord.root + 7) % 12,
        quality: "major7",  // Dominant 7th
        resolvesTo: chord
      };
    }
  }
  return null;
}

// Get secondary leading tone (vii°/X)
export fn secondaryLeadingTone(k, targetDegree) {
  const chords = getDiatonicChords(k);

  for (chord in chords) {
    if (chord.degree == targetDegree) {
      // Return leading tone chord of target
      return {
        root: (chord.root + 11) % 12,
        quality: "dim7",
        resolvesTo: chord
      };
    }
  }
  return null;
}

// ============================================
// Analysis
// ============================================

// Analyze which key a chord progression is in
// Uses simple heuristic based on chord frequency
export fn analyzeKey(chords) {
  // Try all 24 keys and score each
  let bestKey = { root: 0, mode: "major" };
  let bestScore = 0;

  for (root in 0..11) {
    for (mode in ["major", "minor"]) {
      const testKey = { root: root, mode: mode };
      const diatonic = getDiatonicChords(testKey);

      let score = 0;
      for (chord in chords) {
        for (dChord in diatonic) {
          if (chord.root == dChord.root && chord.quality == dChord.quality) {
            // Weight by chord importance
            if (dChord.degree == 1) {
              score = score + 4;  // Tonic
            } else if (dChord.degree == 5) {
              score = score + 3;  // Dominant
            } else if (dChord.degree == 4) {
              score = score + 2;  // Subdominant
            } else {
              score = score + 1;
            }
            break;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestKey = testKey;
      }
    }
  }

  return bestKey;
}

// Detect modulation points in a chord progression
export fn detectModulations(chords) {
  if (chords.length < 4) {
    return [];
  }

  let modulations = [];
  let windowSize = 4;

  // Analyze in windows
  for (i in 0..(chords.length - windowSize)) {
    let window1 = [];
    let window2 = [];

    for (j in 0..(windowSize - 1)) {
      window1[j] = chords[i + j];
      if (i + windowSize + j < chords.length) {
        window2[j] = chords[i + windowSize + j];
      }
    }

    if (window2.length == windowSize) {
      const key1 = analyzeKey(window1);
      const key2 = analyzeKey(window2);

      if (key1.root != key2.root || key1.mode != key2.mode) {
        modulations[modulations.length] = {
          position: i + windowSize,
          fromKey: key1,
          toKey: key2
        };
      }
    }
  }

  return modulations;
}

// ============================================
// Utility Functions
// ============================================

// Get key signature (number of sharps/flats)
// Positive = sharps, negative = flats
export fn keySignature(k) {
  // Circle of fifths position
  const majorSigs = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];  // C, G, D, A, E, B, F#, C#...
  const sharpCount = [0, 1, 2, 3, 4, 5, 6, 7, -4, -3, -2, -1];

  let root = k.root;
  if (k.mode == "minor") {
    // Relative major
    root = (root + 3) % 12;
  }

  for (i in 0..11) {
    if (majorSigs[i] == root) {
      return sharpCount[i];
    }
  }

  return 0;
}

// Get key name as string
export fn keyName(k) {
  const noteNames = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  let name = noteNames[k.root];
  if (k.mode == "minor") {
    name = name + "m";
  }
  return name;
}

// Check if two keys are the same
export fn sameKey(k1, k2) {
  return k1.root == k2.root && k1.mode == k2.mode;
}

// Get all closely related keys
export fn relatedKeys(k) {
  return [
    relative(k),
    parallel(k),
    dominant(k),
    subdominant(k),
    relative(dominant(k)),
    relative(subdominant(k))
  ];
}
`;

export const STDLIB_MOTIF = `// std:motif (v5.3)
// Motif development and thematic transformation utilities
// Classical techniques for developing musical ideas

// ============================================
// Motif Representation
// ============================================

// Create a motif (melodic fragment)
// notes: array of {pitch, duration, velocity?}
export fn motif(notes) {
  return {
    type: "motif",
    notes: notes,
    length: notes.length
  };
}

// Create a note for a motif
export fn note(pitch, duration, velocity) {
  let vel = velocity;
  if (vel == null) {
    vel = 0.8;
  }
  return {
    pitch: pitch,
    duration: duration,
    velocity: vel
  };
}

// Create motif from pitch array (equal durations)
export fn motifFromPitches(pitches, duration) {
  let notes = [];
  for (p in pitches) {
    notes[notes.length] = note(p, duration, 0.8);
  }
  return motif(notes);
}

// Get pitches from motif
export fn getPitches(m) {
  let pitches = [];
  for (n in m.notes) {
    pitches[pitches.length] = n.pitch;
  }
  return pitches;
}

// Get durations from motif
export fn getDurations(m) {
  let durations = [];
  for (n in m.notes) {
    durations[durations.length] = n.duration;
  }
  return durations;
}

// Get total duration of motif
export fn totalDuration(m) {
  let total = 0 / 1;
  for (n in m.notes) {
    total = total + n.duration;
  }
  return total;
}

// ============================================
// Pitch Transformations
// ============================================

// Transpose motif
export fn transpose(m, semitones) {
  let notes = [];
  for (n in m.notes) {
    notes[notes.length] = note(n.pitch + semitones, n.duration, n.velocity);
  }
  return motif(notes);
}

// Invert motif around axis
export fn invert(m, axis) {
  let ax = axis;
  if (ax == null && m.notes.length > 0) {
    ax = m.notes[0].pitch;  // First note as axis
  }

  let notes = [];
  for (n in m.notes) {
    const inverted = ax * 2 - n.pitch;
    notes[notes.length] = note(inverted, n.duration, n.velocity);
  }
  return motif(notes);
}

// Retrograde (reverse)
export fn retrograde(m) {
  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    notes[i] = m.notes[m.notes.length - 1 - i];
  }
  return motif(notes);
}

// Retrograde inversion
export fn retrogradeInversion(m, axis) {
  return retrograde(invert(m, axis));
}

// Octave displacement
export fn displaceOctave(m, noteIndex, octaves) {
  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    if (i == noteIndex) {
      notes[i] = note(
        m.notes[i].pitch + octaves * 12,
        m.notes[i].duration,
        m.notes[i].velocity
      );
    } else {
      notes[i] = m.notes[i];
    }
  }
  return motif(notes);
}

// Random octave displacement
export fn randomOctaveDisplace(m, probability, range, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let notes = [];
  for (n in m.notes) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const r = rng / 2147483648;

    if (r < probability) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const octave = ((rng / 2147483648) * (range * 2 + 1) - range);
      let oct = octave - (octave % 1);
      notes[notes.length] = note(n.pitch + oct * 12, n.duration, n.velocity);
    } else {
      notes[notes.length] = n;
    }
  }

  return motif(notes);
}

// ============================================
// Rhythm Transformations
// ============================================

// Augmentation (double durations)
export fn augment(m, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }

  let notes = [];
  for (n in m.notes) {
    notes[notes.length] = note(n.pitch, n.duration * f, n.velocity);
  }
  return motif(notes);
}

// Diminution (halve durations)
export fn diminish(m, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }

  let notes = [];
  for (n in m.notes) {
    notes[notes.length] = note(n.pitch, n.duration / f, n.velocity);
  }
  return motif(notes);
}

// Retrograde rhythm only (keep pitches)
export fn retrogradeRhythm(m) {
  let durations = getDurations(m);
  let reversedDurs = [];
  for (i in 0..(durations.length - 1)) {
    reversedDurs[i] = durations[durations.length - 1 - i];
  }

  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    notes[i] = note(m.notes[i].pitch, reversedDurs[i], m.notes[i].velocity);
  }
  return motif(notes);
}

// Add swing to rhythm
export fn addSwing(m, swingRatio) {
  let ratio = swingRatio;
  if (ratio == null) {
    ratio = 0.67;  // Triplet swing
  }

  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    const n = m.notes[i];
    if (i % 2 == 0) {
      notes[i] = note(n.pitch, n.duration * ratio * 2, n.velocity);
    } else {
      notes[i] = note(n.pitch, n.duration * (1 - ratio) * 2, n.velocity);
    }
  }
  return motif(notes);
}

// ============================================
// Melodic Development
// ============================================

// Sequence (repeat at different pitch level)
export fn sequence(m, intervals) {
  let result = [];
  for (interval in intervals) {
    const transposed = transpose(m, interval);
    for (n in transposed.notes) {
      result[result.length] = n;
    }
  }
  return motif(result);
}

// Fill in stepwise motion between leaps
export fn fillLeaps(m, maxLeap, fillDuration) {
  let notes = [];
  notes[0] = m.notes[0];

  for (i in 1..(m.notes.length - 1)) {
    const prev = m.notes[i - 1].pitch;
    const curr = m.notes[i].pitch;
    let interval = curr - prev;
    if (interval < 0) { interval = -interval; }

    if (interval > maxLeap) {
      // Add fill notes
      const direction = (curr - prev) > 0 ? 1 : -1;
      let fillPitch = prev;
      while (true) {
        fillPitch = fillPitch + direction * 2;  // Stepwise
        let diff = curr - fillPitch;
        if (direction < 0) { diff = -diff; }
        if (diff <= 0) { break; }
        notes[notes.length] = note(fillPitch, fillDuration, 0.6);
      }
    }

    notes[notes.length] = m.notes[i];
  }

  return motif(notes);
}

// Ornament with neighbor tones
export fn addNeighborTones(m, probability, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    const n = m.notes[i];

    rng = (rng * 1103515245 + 12345) % 2147483648;
    if ((rng / 2147483648) < probability && i < m.notes.length - 1) {
      // Add neighbor tone
      const halfDur = n.duration / 2;
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const direction = ((rng / 2147483648) < 0.5) ? 1 : -1;

      notes[notes.length] = note(n.pitch, halfDur, n.velocity);
      notes[notes.length] = note(n.pitch + direction, halfDur, n.velocity * 0.7);
    } else {
      notes[notes.length] = n;
    }
  }

  return motif(notes);
}

// Add passing tones
export fn addPassingTones(m, probability, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let notes = [];

  for (i in 0..(m.notes.length - 1)) {
    const n = m.notes[i];
    notes[notes.length] = n;

    if (i < m.notes.length - 1) {
      rng = (rng * 1103515245 + 12345) % 2147483648;

      if ((rng / 2147483648) < probability) {
        const next = m.notes[i + 1];
        const interval = next.pitch - n.pitch;

        if (interval > 2 || interval < -2) {
          // Add passing tone
          const passingPitch = n.pitch + (interval > 0 ? 2 : -2);
          notes[notes.length] = note(passingPitch, n.duration / 2, n.velocity * 0.7);
        }
      }
    }
  }

  return motif(notes);
}

// ============================================
// Fragmentation
// ============================================

// Extract fragment from motif
export fn fragment(m, startIndex, length) {
  let notes = [];
  let endIdx = startIndex + length;
  if (endIdx > m.notes.length) {
    endIdx = m.notes.length;
  }

  for (i in startIndex..(endIdx - 1)) {
    notes[notes.length] = m.notes[i];
  }
  return motif(notes);
}

// Get head (beginning) of motif
export fn head(m, length) {
  return fragment(m, 0, length);
}

// Get tail (ending) of motif
export fn tail(m, length) {
  const start = m.notes.length - length;
  if (start < 0) {
    return m;
  }
  return fragment(m, start, length);
}

// Split motif at index
export fn split(m, index) {
  return [
    fragment(m, 0, index),
    fragment(m, index, m.notes.length - index)
  ];
}

// ============================================
// Combination
// ============================================

// Concatenate motifs
export fn concat(m1, m2) {
  let notes = [];
  for (n in m1.notes) {
    notes[notes.length] = n;
  }
  for (n in m2.notes) {
    notes[notes.length] = n;
  }
  return motif(notes);
}

// Interleave motifs
export fn interleave(m1, m2) {
  let notes = [];
  let maxLen = m1.notes.length;
  if (m2.notes.length > maxLen) {
    maxLen = m2.notes.length;
  }

  for (i in 0..(maxLen - 1)) {
    if (i < m1.notes.length) {
      notes[notes.length] = m1.notes[i];
    }
    if (i < m2.notes.length) {
      notes[notes.length] = m2.notes[i];
    }
  }
  return motif(notes);
}

// Combine pitches from m1 with rhythms from m2
export fn combineElements(pitchMotif, rhythmMotif) {
  let notes = [];
  let len = pitchMotif.notes.length;
  if (rhythmMotif.notes.length < len) {
    len = rhythmMotif.notes.length;
  }

  for (i in 0..(len - 1)) {
    notes[i] = note(
      pitchMotif.notes[i].pitch,
      rhythmMotif.notes[i].duration,
      pitchMotif.notes[i].velocity
    );
  }
  return motif(notes);
}

// ============================================
// Variation Techniques
// ============================================

// Create variation by changing specific notes
export fn vary(m, indices, newPitches) {
  let notes = [];
  for (i in 0..(m.notes.length - 1)) {
    let found = false;
    for (j in 0..(indices.length - 1)) {
      if (indices[j] == i) {
        notes[i] = note(newPitches[j], m.notes[i].duration, m.notes[i].velocity);
        found = true;
        break;
      }
    }
    if (!found) {
      notes[i] = m.notes[i];
    }
  }
  return motif(notes);
}

// Permute notes (reorder)
export fn permute(m, permutation) {
  let notes = [];
  for (idx in permutation) {
    if (idx >= 0 && idx < m.notes.length) {
      notes[notes.length] = m.notes[idx];
    }
  }
  return motif(notes);
}

// Shuffle notes randomly
export fn shuffle(m, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  // Create permutation array
  let perm = [];
  for (i in 0..(m.notes.length - 1)) {
    perm[i] = i;
  }

  // Fisher-Yates shuffle
  for (i in 0..(m.notes.length - 2)) {
    const j = m.notes.length - 1 - i;
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const k = (rng / 2147483648) * (j + 1);
    let kInt = k - (k % 1);

    const temp = perm[j];
    perm[j] = perm[kInt];
    perm[kInt] = temp;
  }

  return permute(m, perm);
}

// ============================================
// Intervallic Analysis
// ============================================

// Get intervals between consecutive notes
export fn getIntervals(m) {
  let intervals = [];
  for (i in 1..(m.notes.length - 1)) {
    intervals[intervals.length] = m.notes[i].pitch - m.notes[i - 1].pitch;
  }
  return intervals;
}

// Get contour (direction of motion)
// Returns array of -1 (down), 0 (same), 1 (up)
export fn getContour(m) {
  let contour = [];
  for (i in 1..(m.notes.length - 1)) {
    const diff = m.notes[i].pitch - m.notes[i - 1].pitch;
    if (diff > 0) {
      contour[contour.length] = 1;
    } else if (diff < 0) {
      contour[contour.length] = -1;
    } else {
      contour[contour.length] = 0;
    }
  }
  return contour;
}

// Create motif from intervals (starting from given pitch)
export fn fromIntervals(startPitch, intervals, duration) {
  let notes = [];
  let pitch = startPitch;
  notes[0] = note(pitch, duration, 0.8);

  for (interval in intervals) {
    pitch = pitch + interval;
    notes[notes.length] = note(pitch, duration, 0.8);
  }
  return motif(notes);
}

// Create motif with same contour but different intervals
export fn applyContour(contour, startPitch, scale, duration) {
  let notes = [];
  let scaleIndex = 0;

  // Find starting position in scale
  for (i in 0..(scale.length - 1)) {
    if (scale[i] == startPitch % 12) {
      scaleIndex = i;
      break;
    }
  }

  let octave = (startPitch / 12) - (startPitch % 12 > 0 ? 0 : 1);
  notes[0] = note(startPitch, duration, 0.8);

  for (dir in contour) {
    scaleIndex = scaleIndex + dir;

    if (scaleIndex >= scale.length) {
      scaleIndex = scaleIndex - scale.length;
      octave = octave + 1;
    }
    if (scaleIndex < 0) {
      scaleIndex = scaleIndex + scale.length;
      octave = octave - 1;
    }

    const pitch = octave * 12 + scale[scaleIndex];
    notes[notes.length] = note(pitch, duration, 0.8);
  }

  return motif(notes);
}

// ============================================
// Motivic Similarity
// ============================================

// Calculate similarity between two motifs
export fn similarity(m1, m2) {
  // Simple interval-based similarity
  const intervals1 = getIntervals(m1);
  const intervals2 = getIntervals(m2);

  let len = intervals1.length;
  if (intervals2.length < len) {
    len = intervals2.length;
  }
  if (len == 0) {
    return 0;
  }

  let matches = 0;
  for (i in 0..(len - 1)) {
    if (intervals1[i] == intervals2[i]) {
      matches = matches + 1;
    }
  }

  return matches / len;
}

// Calculate contour similarity
export fn contourSimilarity(m1, m2) {
  const contour1 = getContour(m1);
  const contour2 = getContour(m2);

  let len = contour1.length;
  if (contour2.length < len) {
    len = contour2.length;
  }
  if (len == 0) {
    return 0;
  }

  let matches = 0;
  for (i in 0..(len - 1)) {
    if (contour1[i] == contour2[i]) {
      matches = matches + 1;
    }
  }

  return matches / len;
}

// ============================================
// Classical Forms
// ============================================

// Create antecedent-consequent pair
export fn antecedentConsequent(antecedent, consequentEnding) {
  // Consequent starts same, ends differently
  const len = antecedent.notes.length;
  const splitPoint = len - consequentEnding.notes.length;

  let consequent = head(antecedent, splitPoint);
  consequent = concat(consequent, consequentEnding);

  return {
    antecedent: antecedent,
    consequent: consequent
  };
}

// Create sentence structure (presentation + continuation)
export fn sentence(basicIdea, continuation) {
  // Presentation: basic idea + sequence
  const presentation = concat(basicIdea, transpose(basicIdea, 2));

  return {
    presentation: presentation,
    continuation: continuation,
    full: concat(presentation, continuation)
  };
}

// Create period structure
export fn period(phrase1, phrase2) {
  return {
    antecedent: phrase1,
    consequent: phrase2,
    full: concat(phrase1, phrase2)
  };
}

// ============================================
// Development Generators
// ============================================

// Generate variations of a motif
export fn generateVariations(m, count, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let variations = [m];
  const techniques = [
    "transpose", "invert", "retrograde", "augment", "diminish", "sequence"
  ];

  for (_ in 1..(count - 1)) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const techIdx = ((rng / 2147483648) * techniques.length);
    let idx = techIdx - (techIdx % 1);
    const technique = techniques[idx];

    const base = variations[variations.length - 1];
    let newVar = base;

    if (technique == "transpose") {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const interval = ((rng / 2147483648) * 12 - 6);
      let intv = interval - (interval % 1);
      newVar = transpose(base, intv);
    } else if (technique == "invert") {
      newVar = invert(base, null);
    } else if (technique == "retrograde") {
      newVar = retrograde(base);
    } else if (technique == "augment") {
      newVar = augment(base, 2);
    } else if (technique == "diminish") {
      newVar = diminish(base, 2);
    } else if (technique == "sequence") {
      newVar = sequence(base, [0, 2, 4]);
    }

    variations[variations.length] = newVar;
  }

  return variations;
}

// Create development section from motif
export fn develop(m, stages) {
  let development = [];
  let current = m;

  for (stage in stages) {
    if (stage.type == "transpose") {
      current = transpose(current, stage.interval);
    } else if (stage.type == "invert") {
      current = invert(current, stage.axis);
    } else if (stage.type == "retrograde") {
      current = retrograde(current);
    } else if (stage.type == "augment") {
      current = augment(current, stage.factor);
    } else if (stage.type == "diminish") {
      current = diminish(current, stage.factor);
    } else if (stage.type == "fragment") {
      current = fragment(current, stage.start, stage.length);
    } else if (stage.type == "sequence") {
      current = sequence(current, stage.intervals);
    }

    development[development.length] = current;
  }

  return development;
}
`;

export const STDLIB_NOTATION = `// std:notation (v5)
// Staff control, clefs, key signatures, and notation-specific features

import core;

// ============================================
// Clef Definitions
// ============================================

export const CLEF = {
  TREBLE: "treble",
  BASS: "bass",
  ALTO: "alto",
  TENOR: "tenor",
  SOPRANO: "soprano",
  MEZZO_SOPRANO: "mezzo-soprano",
  BARITONE: "baritone",
  PERCUSSION: "percussion",
  TAB: "tab",
  // Octave variants
  TREBLE_8VA: "treble-8va",
  TREBLE_8VB: "treble-8vb",
  BASS_8VA: "bass-8va",
  BASS_8VB: "bass-8vb"
};

// Create clef change event
export fn clefChange(pos, clef) {
  return {
    type: "control",
    start: pos,
    kind: "clef",
    data: { clef: clef }
  };
}

// Common clef changes
export fn toTreble(pos) {
  return clefChange(pos, CLEF.TREBLE);
}

export fn toBass(pos) {
  return clefChange(pos, CLEF.BASS);
}

export fn toAlto(pos) {
  return clefChange(pos, CLEF.ALTO);
}

export fn toTenor(pos) {
  return clefChange(pos, CLEF.TENOR);
}

// ============================================
// Key Signatures
// ============================================

// Key signature modes
export const MODE = {
  MAJOR: "major",
  MINOR: "minor",
  DORIAN: "dorian",
  PHRYGIAN: "phrygian",
  LYDIAN: "lydian",
  MIXOLYDIAN: "mixolydian",
  AEOLIAN: "aeolian",
  LOCRIAN: "locrian"
};

// Create key signature event
export fn keySignature(pos, root, mode) {
  let modeVal = mode;
  if (modeVal == null) {
    modeVal = MODE.MAJOR;
  }
  return {
    type: "control",
    start: pos,
    kind: "keySignature",
    data: {
      root: root,
      mode: modeVal
    }
  };
}

// Major keys
export fn cMajor(pos) { return keySignature(pos, "C", MODE.MAJOR); }
export fn gMajor(pos) { return keySignature(pos, "G", MODE.MAJOR); }
export fn dMajor(pos) { return keySignature(pos, "D", MODE.MAJOR); }
export fn aMajor(pos) { return keySignature(pos, "A", MODE.MAJOR); }
export fn eMajor(pos) { return keySignature(pos, "E", MODE.MAJOR); }
export fn bMajor(pos) { return keySignature(pos, "B", MODE.MAJOR); }
export fn fSharpMajor(pos) { return keySignature(pos, "F#", MODE.MAJOR); }
export fn cSharpMajor(pos) { return keySignature(pos, "C#", MODE.MAJOR); }
export fn fMajor(pos) { return keySignature(pos, "F", MODE.MAJOR); }
export fn bFlatMajor(pos) { return keySignature(pos, "Bb", MODE.MAJOR); }
export fn eFlatMajor(pos) { return keySignature(pos, "Eb", MODE.MAJOR); }
export fn aFlatMajor(pos) { return keySignature(pos, "Ab", MODE.MAJOR); }
export fn dFlatMajor(pos) { return keySignature(pos, "Db", MODE.MAJOR); }
export fn gFlatMajor(pos) { return keySignature(pos, "Gb", MODE.MAJOR); }
export fn cFlatMajor(pos) { return keySignature(pos, "Cb", MODE.MAJOR); }

// Minor keys
export fn aMinor(pos) { return keySignature(pos, "A", MODE.MINOR); }
export fn eMinor(pos) { return keySignature(pos, "E", MODE.MINOR); }
export fn bMinor(pos) { return keySignature(pos, "B", MODE.MINOR); }
export fn fSharpMinor(pos) { return keySignature(pos, "F#", MODE.MINOR); }
export fn cSharpMinor(pos) { return keySignature(pos, "C#", MODE.MINOR); }
export fn gSharpMinor(pos) { return keySignature(pos, "G#", MODE.MINOR); }
export fn dSharpMinor(pos) { return keySignature(pos, "D#", MODE.MINOR); }
export fn aSharpMinor(pos) { return keySignature(pos, "A#", MODE.MINOR); }
export fn dMinor(pos) { return keySignature(pos, "D", MODE.MINOR); }
export fn gMinor(pos) { return keySignature(pos, "G", MODE.MINOR); }
export fn cMinor(pos) { return keySignature(pos, "C", MODE.MINOR); }
export fn fMinor(pos) { return keySignature(pos, "F", MODE.MINOR); }
export fn bFlatMinor(pos) { return keySignature(pos, "Bb", MODE.MINOR); }
export fn eFlatMinor(pos) { return keySignature(pos, "Eb", MODE.MINOR); }
export fn aFlatMinor(pos) { return keySignature(pos, "Ab", MODE.MINOR); }

// ============================================
// Microtonal Accidentals
// ============================================

// Microtonal accidental types
export const MICRO_ACC = {
  QUARTER_FLAT: "quarter-flat",
  QUARTER_SHARP: "quarter-sharp",
  THREE_QUARTER_FLAT: "three-quarter-flat",
  THREE_QUARTER_SHARP: "three-quarter-sharp",
  SIXTH_FLAT: "sixth-flat",
  SIXTH_SHARP: "sixth-sharp",
  THIRD_FLAT: "third-flat",
  THIRD_SHARP: "third-sharp",
  // Arrow accidentals
  ARROW_UP: "arrow-up",
  ARROW_DOWN: "arrow-down",
  // Stein-Zimmermann
  NATURAL_UP: "natural-up",
  NATURAL_DOWN: "natural-down",
  SHARP_UP: "sharp-up",
  SHARP_DOWN: "sharp-down",
  FLAT_UP: "flat-up",
  FLAT_DOWN: "flat-down"
};

// Add microtonal accidental to note
export fn withMicroAccidental(note, accidental) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.microAccidental = accidental;
  return newNote;
}

// Quarter tone helpers
export fn quarterFlat(note) {
  return withMicroAccidental(note, MICRO_ACC.QUARTER_FLAT);
}

export fn quarterSharp(note) {
  return withMicroAccidental(note, MICRO_ACC.QUARTER_SHARP);
}

export fn threeQuarterFlat(note) {
  return withMicroAccidental(note, MICRO_ACC.THREE_QUARTER_FLAT);
}

export fn threeQuarterSharp(note) {
  return withMicroAccidental(note, MICRO_ACC.THREE_QUARTER_SHARP);
}

// ============================================
// Staff Systems
// ============================================

// Create a staff definition
export fn staff(name, clef, transposition) {
  let trans = transposition;
  if (trans == null) {
    trans = 0;
  }
  return {
    name: name,
    clef: clef,
    transposition: trans
  };
}

// Grand staff (piano)
export fn grandStaff(name) {
  return {
    type: "grandStaff",
    name: name,
    staves: [
      staff("treble", CLEF.TREBLE, 0),
      staff("bass", CLEF.BASS, 0)
    ]
  };
}

// Staff group
export fn staffGroup(name, staves, bracket) {
  let bracketType = bracket;
  if (bracketType == null) {
    bracketType = "bracket";
  }
  return {
    type: "staffGroup",
    name: name,
    staves: staves,
    bracket: bracketType
  };
}

// Common bracket types
export const BRACKET = {
  BRACKET: "bracket",
  BRACE: "brace",
  SQUARE: "square",
  LINE: "line",
  NONE: "none"
};

// ============================================
// Cross-Staff Notation
// ============================================

// Move note to different staff (piano cross-staff)
export fn crossStaff(note, targetStaff) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.staff = targetStaff;
  return newNote;
}

// ============================================
// Beaming
// ============================================

// Start a beam group
export fn beamStart(pos) {
  return {
    type: "control",
    start: pos,
    kind: "beamStart",
    data: {}
  };
}

// End a beam group
export fn beamEnd(pos) {
  return {
    type: "control",
    start: pos,
    kind: "beamEnd",
    data: {}
  };
}

// Force no beam
export fn noBeam(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.beam = "none";
  return newNote;
}

// ============================================
// Stem Direction
// ============================================

// Force stem up
export fn stemUp(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.stem = "up";
  return newNote;
}

// Force stem down
export fn stemDown(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.stem = "down";
  return newNote;
}

// Auto stem (default)
export fn stemAuto(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.stem = "auto";
  return newNote;
}

// ============================================
// Ottava (8va/8vb/15ma)
// ============================================

// Start ottava
export fn ottavaStart(pos, octaves) {
  let oct = octaves;
  if (oct == null) {
    oct = 1;
  }
  return {
    type: "control",
    start: pos,
    kind: "ottavaStart",
    data: { octaves: oct }
  };
}

// End ottava
export fn ottavaEnd(pos) {
  return {
    type: "control",
    start: pos,
    kind: "ottavaEnd",
    data: {}
  };
}

// 8va (octave higher)
export fn ottavaAlta(pos) {
  return ottavaStart(pos, 1);
}

// 8vb (octave lower)
export fn ottavaBassa(pos) {
  return ottavaStart(pos, -1);
}

// 15ma (two octaves higher)
export fn quindicesimaAlta(pos) {
  return ottavaStart(pos, 2);
}

// 15mb (two octaves lower)
export fn quindicesimaBassa(pos) {
  return ottavaStart(pos, -2);
}

// ============================================
// Cue Notes
// ============================================

// Mark note as cue note (small, for reference)
export fn cueNote(note) {
  let newNote = core.cloneEvent(note);
  if (newNote.ext == null) {
    newNote.ext = {};
  }
  newNote.ext.cue = true;
  return newNote;
}

// Mark notes as ossia (alternative passage)
export fn ossia(clip) {
  let events = [];
  for (ev in clip.events) {
    let newEv = core.cloneEvent(ev);
    if (newEv.ext == null) {
      newEv.ext = {};
    }
    newEv.ext.ossia = true;
    events[events.length] = newEv;
  }
  return { events: events, length: clip.length };
}

// ============================================
// Text Annotations
// ============================================

// Text expression marking
export fn textExpression(pos, text) {
  return {
    type: "marker",
    pos: pos,
    kind: "textExpression",
    label: text
  };
}

// Tempo text
export fn tempoText(pos, text) {
  return {
    type: "marker",
    pos: pos,
    kind: "tempoText",
    label: text
  };
}

// Common tempo markings
export fn adagio(pos) { return tempoText(pos, "Adagio"); }
export fn andante(pos) { return tempoText(pos, "Andante"); }
export fn moderato(pos) { return tempoText(pos, "Moderato"); }
export fn allegro(pos) { return tempoText(pos, "Allegro"); }
export fn vivace(pos) { return tempoText(pos, "Vivace"); }
export fn presto(pos) { return tempoText(pos, "Presto"); }
export fn largo(pos) { return tempoText(pos, "Largo"); }
export fn lento(pos) { return tempoText(pos, "Lento"); }
export fn grave(pos) { return tempoText(pos, "Grave"); }

// Tempo modifiers
export fn aTempo(pos) { return tempoText(pos, "a tempo"); }
export fn ritardando(pos) { return tempoText(pos, "rit."); }
export fn accelerando(pos) { return tempoText(pos, "accel."); }
export fn rallentando(pos) { return tempoText(pos, "rall."); }
export fn rubato(pos) { return tempoText(pos, "rubato"); }

// ============================================
// System/Page Breaks
// ============================================

// Force system break
export fn systemBreak(pos) {
  return {
    type: "control",
    start: pos,
    kind: "systemBreak",
    data: {}
  };
}

// Force page break
export fn pageBreak(pos) {
  return {
    type: "control",
    start: pos,
    kind: "pageBreak",
    data: {}
  };
}

// ============================================
// Transposition (for parts)
// ============================================

// Set written vs sounding pitch transposition
export fn transposition(pos, semitones) {
  return {
    type: "control",
    start: pos,
    kind: "transposition",
    data: { semitones: semitones }
  };
}

// Common transposing instruments
export fn clarinetBb(pos) { return transposition(pos, 2); }
export fn clarinetA(pos) { return transposition(pos, 3); }
export fn trumpetBb(pos) { return transposition(pos, 2); }
export fn hornF(pos) { return transposition(pos, 7); }
export fn saxAlto(pos) { return transposition(pos, 9); }
export fn saxTenor(pos) { return transposition(pos, 14); }
`;

export const STDLIB_ORCHESTRATION = `// std:orchestration (v5.5)
// Orchestration utilities for instrument ranges, combinations, and scoring
// Supports standard orchestral, band, and chamber configurations

// ============================================
// Instrument Ranges (MIDI note numbers)
// ============================================

// Woodwinds
export fn piccolo() {
  return {
    name: "piccolo",
    family: "woodwind",
    range: { low: 74, high: 102 },  // D5 - F7
    transposition: 12,  // Sounds octave higher
    clef: "treble"
  };
}

export fn flute() {
  return {
    name: "flute",
    family: "woodwind",
    range: { low: 60, high: 96 },  // C4 - C7
    transposition: 0,
    clef: "treble"
  };
}

export fn altoFlute() {
  return {
    name: "altoFlute",
    family: "woodwind",
    range: { low: 55, high: 91 },  // G3 - G6
    transposition: -5,  // Sounds P4 lower
    clef: "treble"
  };
}

export fn oboe() {
  return {
    name: "oboe",
    family: "woodwind",
    range: { low: 58, high: 91 },  // Bb3 - G6
    transposition: 0,
    clef: "treble"
  };
}

export fn englishHorn() {
  return {
    name: "englishHorn",
    family: "woodwind",
    range: { low: 52, high: 81 },  // E3 - A5 (written)
    transposition: -7,  // Sounds P5 lower
    clef: "treble"
  };
}

export fn clarinet() {
  return {
    name: "clarinet",
    family: "woodwind",
    range: { low: 50, high: 94 },  // D3 - Bb6 (written)
    transposition: -2,  // Bb clarinet, sounds M2 lower
    clef: "treble"
  };
}

export fn clarinetA() {
  return {
    name: "clarinetA",
    family: "woodwind",
    range: { low: 50, high: 94 },
    transposition: -3,  // A clarinet, sounds m3 lower
    clef: "treble"
  };
}

export fn bassClarinet() {
  return {
    name: "bassClarinet",
    family: "woodwind",
    range: { low: 38, high: 77 },  // Bb1 - F5 (written)
    transposition: -14,  // Sounds M9 lower
    clef: "treble"
  };
}

export fn bassoon() {
  return {
    name: "bassoon",
    family: "woodwind",
    range: { low: 34, high: 75 },  // Bb1 - Eb5
    transposition: 0,
    clef: "bass"
  };
}

export fn contrabassoon() {
  return {
    name: "contrabassoon",
    family: "woodwind",
    range: { low: 22, high: 58 },  // Bb0 - Bb3
    transposition: -12,  // Sounds octave lower
    clef: "bass"
  };
}

// Brass
export fn horn() {
  return {
    name: "horn",
    family: "brass",
    range: { low: 34, high: 77 },  // Bb1 - F5 (written)
    transposition: -7,  // Horn in F, sounds P5 lower
    clef: "treble"
  };
}

export fn trumpet() {
  return {
    name: "trumpet",
    family: "brass",
    range: { low: 55, high: 82 },  // G3 - Bb5 (written)
    transposition: -2,  // Bb trumpet
    clef: "treble"
  };
}

export fn trumpetC() {
  return {
    name: "trumpetC",
    family: "brass",
    range: { low: 55, high: 82 },
    transposition: 0,  // C trumpet
    clef: "treble"
  };
}

export fn trombone() {
  return {
    name: "trombone",
    family: "brass",
    range: { low: 40, high: 72 },  // E2 - C5
    transposition: 0,
    clef: "bass"
  };
}

export fn bassTrombone() {
  return {
    name: "bassTrombone",
    family: "brass",
    range: { low: 34, high: 67 },  // Bb1 - G4
    transposition: 0,
    clef: "bass"
  };
}

export fn tuba() {
  return {
    name: "tuba",
    family: "brass",
    range: { low: 28, high: 58 },  // E1 - Bb3
    transposition: 0,
    clef: "bass"
  };
}

// Strings
export fn violin() {
  return {
    name: "violin",
    family: "strings",
    range: { low: 55, high: 103 },  // G3 - G7
    transposition: 0,
    clef: "treble",
    openStrings: [55, 62, 69, 76]  // G3, D4, A4, E5
  };
}

export fn viola() {
  return {
    name: "viola",
    family: "strings",
    range: { low: 48, high: 93 },  // C3 - A6
    transposition: 0,
    clef: "alto",
    openStrings: [48, 55, 62, 69]  // C3, G3, D4, A4
  };
}

export fn cello() {
  return {
    name: "cello",
    family: "strings",
    range: { low: 36, high: 84 },  // C2 - C6
    transposition: 0,
    clef: "bass",
    openStrings: [36, 43, 50, 57]  // C2, G2, D3, A3
  };
}

export fn contrabass() {
  return {
    name: "contrabass",
    family: "strings",
    range: { low: 28, high: 67 },  // E1 - G4
    transposition: -12,  // Sounds octave lower
    clef: "bass",
    openStrings: [28, 33, 38, 43]  // E1, A1, D2, G2
  };
}

export fn harp() {
  return {
    name: "harp",
    family: "strings",
    range: { low: 24, high: 103 },  // C1 - G7
    transposition: 0,
    clef: "grand"
  };
}

// Percussion (pitched)
export fn timpani() {
  return {
    name: "timpani",
    family: "percussion",
    range: { low: 40, high: 55 },  // E2 - G3 (standard set)
    transposition: 0,
    clef: "bass"
  };
}

export fn xylophone() {
  return {
    name: "xylophone",
    family: "percussion",
    range: { low: 65, high: 108 },  // F4 - C8
    transposition: 12,  // Sounds octave higher
    clef: "treble"
  };
}

export fn marimba() {
  return {
    name: "marimba",
    family: "percussion",
    range: { low: 45, high: 96 },  // A2 - C7
    transposition: 0,
    clef: "grand"
  };
}

export fn vibraphone() {
  return {
    name: "vibraphone",
    family: "percussion",
    range: { low: 53, high: 89 },  // F3 - F6
    transposition: 0,
    clef: "treble"
  };
}

export fn glockenspiel() {
  return {
    name: "glockenspiel",
    family: "percussion",
    range: { low: 79, high: 108 },  // G5 - C8
    transposition: 24,  // Sounds 2 octaves higher
    clef: "treble"
  };
}

export fn celesta() {
  return {
    name: "celesta",
    family: "percussion",
    range: { low: 60, high: 108 },  // C4 - C8
    transposition: 12,  // Sounds octave higher
    clef: "grand"
  };
}

export fn tubularBells() {
  return {
    name: "tubularBells",
    family: "percussion",
    range: { low: 60, high: 77 },  // C4 - F5
    transposition: 0,
    clef: "treble"
  };
}

// Keyboard
export fn piano() {
  return {
    name: "piano",
    family: "keyboard",
    range: { low: 21, high: 108 },  // A0 - C8
    transposition: 0,
    clef: "grand"
  };
}

export fn organ() {
  return {
    name: "organ",
    family: "keyboard",
    range: { low: 36, high: 96 },  // C2 - C7 (manuals)
    pedalRange: { low: 24, high: 55 },  // C1 - G3
    transposition: 0,
    clef: "grand"
  };
}

// ============================================
// Range Checking
// ============================================

// Check if pitch is in playable range
export fn isInRange(instrument, pitch) {
  return pitch >= instrument.range.low && pitch <= instrument.range.high;
}

// Get concert pitch from written pitch
export fn toConcertPitch(instrument, writtenPitch) {
  return writtenPitch + instrument.transposition;
}

// Get written pitch from concert pitch
export fn toWrittenPitch(instrument, concertPitch) {
  return concertPitch - instrument.transposition;
}

// Check if chord is playable
export fn isChordPlayable(instrument, chord) {
  for (pitch in chord) {
    if (!isInRange(instrument, pitch)) {
      return false;
    }
  }
  return true;
}

// ============================================
// Orchestral Sections
// ============================================

export fn woodwindSection() {
  return {
    name: "woodwinds",
    instruments: [
      { instrument: piccolo(), count: 1 },
      { instrument: flute(), count: 2 },
      { instrument: oboe(), count: 2 },
      { instrument: englishHorn(), count: 1 },
      { instrument: clarinet(), count: 2 },
      { instrument: bassClarinet(), count: 1 },
      { instrument: bassoon(), count: 2 },
      { instrument: contrabassoon(), count: 1 }
    ]
  };
}

export fn brassSection() {
  return {
    name: "brass",
    instruments: [
      { instrument: horn(), count: 4 },
      { instrument: trumpet(), count: 3 },
      { instrument: trombone(), count: 2 },
      { instrument: bassTrombone(), count: 1 },
      { instrument: tuba(), count: 1 }
    ]
  };
}

export fn stringSection() {
  return {
    name: "strings",
    instruments: [
      { instrument: violin(), count: 16, divisi: "I/II" },
      { instrument: viola(), count: 12 },
      { instrument: cello(), count: 10 },
      { instrument: contrabass(), count: 8 },
      { instrument: harp(), count: 2 }
    ]
  };
}

export fn percussionSection() {
  return {
    name: "percussion",
    instruments: [
      { instrument: timpani(), count: 4 },
      { instrument: xylophone(), count: 1 },
      { instrument: marimba(), count: 1 },
      { instrument: vibraphone(), count: 1 },
      { instrument: glockenspiel(), count: 1 },
      { instrument: tubularBells(), count: 1 }
    ]
  };
}

// ============================================
// Ensemble Configurations
// ============================================

// Standard symphony orchestra
export fn symphonyOrchestra() {
  return {
    name: "symphonyOrchestra",
    sections: [
      woodwindSection(),
      brassSection(),
      stringSection(),
      percussionSection()
    ]
  };
}

// Chamber orchestra
export fn chamberOrchestra() {
  return {
    name: "chamberOrchestra",
    instruments: [
      { instrument: flute(), count: 1 },
      { instrument: oboe(), count: 1 },
      { instrument: clarinet(), count: 1 },
      { instrument: bassoon(), count: 1 },
      { instrument: horn(), count: 2 },
      { instrument: violin(), count: 8, divisi: "I/II" },
      { instrument: viola(), count: 4 },
      { instrument: cello(), count: 4 },
      { instrument: contrabass(), count: 2 }
    ]
  };
}

// String quartet
export fn stringQuartet() {
  return {
    name: "stringQuartet",
    instruments: [
      { instrument: violin(), part: "Violin I" },
      { instrument: violin(), part: "Violin II" },
      { instrument: viola(), part: "Viola" },
      { instrument: cello(), part: "Cello" }
    ]
  };
}

// Wind quintet
export fn windQuintet() {
  return {
    name: "windQuintet",
    instruments: [
      { instrument: flute(), part: "Flute" },
      { instrument: oboe(), part: "Oboe" },
      { instrument: clarinet(), part: "Clarinet" },
      { instrument: horn(), part: "Horn" },
      { instrument: bassoon(), part: "Bassoon" }
    ]
  };
}

// Brass quintet
export fn brassQuintet() {
  return {
    name: "brassQuintet",
    instruments: [
      { instrument: trumpet(), part: "Trumpet I" },
      { instrument: trumpet(), part: "Trumpet II" },
      { instrument: horn(), part: "Horn" },
      { instrument: trombone(), part: "Trombone" },
      { instrument: tuba(), part: "Tuba" }
    ]
  };
}

// Piano trio
export fn pianoTrio() {
  return {
    name: "pianoTrio",
    instruments: [
      { instrument: piano(), part: "Piano" },
      { instrument: violin(), part: "Violin" },
      { instrument: cello(), part: "Cello" }
    ]
  };
}

// ============================================
// Doubling and Combination
// ============================================

// Double a line with another instrument
export fn doubling(primaryInstrument, doublingInstrument, intervalOffset) {
  let offset = intervalOffset;
  if (offset == null) {
    offset = 0;
  }

  return {
    type: "doubling",
    primary: primaryInstrument,
    doubling: doublingInstrument,
    interval: offset  // 0 = unison, 12 = octave, etc.
  };
}

// Common orchestral doublings
export fn fluteOboUnison() {
  return doubling(flute(), oboe(), 0);
}

export fn fluteViolinOctave() {
  return doubling(flute(), violin(), 0);
}

export fn celloContrabassOctave() {
  return doubling(cello(), contrabass(), 12);  // Contrabass octave below
}

export fn trumpetHornUnison() {
  return doubling(trumpet(), horn(), 0);
}

// Create tutti doubling
export fn tuttiUnison(instruments, pitches) {
  let parts = [];
  for (inst in instruments) {
    parts[parts.length] = {
      instrument: inst,
      pitches: pitches
    };
  }
  return {
    type: "tutti",
    parts: parts
  };
}

// ============================================
// Scoring Techniques
// ============================================

// Distribute chord across instruments
export fn distributeChord(chord, instruments) {
  let assignment = [];
  const numPitches = chord.length;
  const numInstruments = instruments.length;

  for (i in 0..(numPitches - 1)) {
    const instIndex = i % numInstruments;
    const inst = instruments[instIndex];
    const pitch = chord[i];

    // Check if in range
    if (isInRange(inst, pitch)) {
      assignment[assignment.length] = {
        instrument: inst,
        pitch: pitch
      };
    }
  }

  return assignment;
}

// Close voicing (notes within octave)
export fn closeVoicing(chord, topPitch) {
  let voiced = [];
  let current = topPitch;

  // Sort chord descending
  let sorted = sortDescending(chord);

  for (pc in sorted) {
    // Find nearest pitch class below current
    while (current % 12 != pc % 12) {
      current = current - 1;
    }
    voiced[voiced.length] = current;
    current = current - 1;
  }

  return voiced;
}

fn sortDescending(arr) {
  // Simple bubble sort descending
  let result = [];
  for (a in arr) {
    result[result.length] = a;
  }

  for (i in 0..(result.length - 2)) {
    for (j in 0..(result.length - i - 2)) {
      if (result[j] < result[j + 1]) {
        const temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }

  return result;
}

// Open voicing (spread across multiple octaves)
export fn openVoicing(chord, bassPitch, soprano) {
  let voiced = [];

  // Bass note
  voiced[0] = bassPitch;

  // Distribute remaining notes
  let current = bassPitch + 12;
  for (i in 1..(chord.length - 1)) {
    const pc = chord[i] % 12;
    while (current % 12 != pc) {
      current = current + 1;
    }
    voiced[voiced.length] = current;
    current = current + 3;  // Spread out
  }

  return voiced;
}

// ============================================
// Dynamic Balance
// ============================================

// Relative power of instrument families (rough guide)
export fn dynamicWeight(instrument) {
  if (instrument.family == "brass") {
    return 1.5;  // Loudest
  } else if (instrument.family == "percussion") {
    return 1.3;
  } else if (instrument.family == "woodwind") {
    return 1.0;
  } else if (instrument.family == "strings") {
    return 0.8;  // Need more for balance
  }
  return 1.0;
}

// Calculate balance for tutti chord
export fn balanceCheck(assignments) {
  let totalWeight = 0;
  let familyWeights = {};

  for (a in assignments) {
    const weight = dynamicWeight(a.instrument);
    totalWeight = totalWeight + weight;

    const family = a.instrument.family;
    if (familyWeights[family] == null) {
      familyWeights[family] = 0;
    }
    familyWeights[family] = familyWeights[family] + weight;
  }

  return {
    total: totalWeight,
    byFamily: familyWeights
  };
}

// ============================================
// Articulation and Effects
// ============================================

// String techniques
export const ARCO = "arco";
export const PIZZICATO = "pizz";
export const COL_LEGNO = "colLegno";
export const SUL_TASTO = "sulTasto";
export const SUL_PONTICELLO = "sulPont";
export const TREMOLO = "tremolo";
export const HARMONICS = "harmonics";
export const MUTE = "mute";
export const DIVISI = "divisi";

// Brass techniques
export const OPEN = "open";
export const STOPPED = "stopped";
export const MUTED = "muted";
export const CUIVRE = "cuivre";
export const FLUTTER = "flutter";

// Woodwind techniques
export const LEGATO = "legato";
export const STACCATO = "staccato";
export const FLUTTER_TONGUE = "flutterTongue";
export const DOUBLE_TONGUE = "doubleTongue";
export const SLAP_TONGUE = "slapTongue";
export const MULTIPHONIC = "multiphonic";

// Apply technique to part
export fn withTechnique(part, technique) {
  return {
    part: part,
    technique: technique
  };
}

// ============================================
// Register and Tessitura
// ============================================

// Get register description
export fn getRegister(instrument, pitch) {
  const range = instrument.range;
  const span = range.high - range.low;
  const position = pitch - range.low;
  const percent = position / span;

  if (percent < 0.2) {
    return "low";
  } else if (percent < 0.4) {
    return "lowMid";
  } else if (percent < 0.6) {
    return "mid";
  } else if (percent < 0.8) {
    return "highMid";
  } else {
    return "high";
  }
}

// Get comfortable playing range (tessitura)
export fn tessitura(instrument) {
  const range = instrument.range;
  const span = range.high - range.low;

  return {
    low: range.low + (span * 0.2),
    high: range.high - (span * 0.15)
  };
}

// Check if passage is in comfortable range
export fn isInTessitura(instrument, pitches) {
  const tess = tessitura(instrument);

  for (p in pitches) {
    if (p < tess.low || p > tess.high) {
      return false;
    }
  }
  return true;
}

// ============================================
// Score Order
// ============================================

// Standard orchestral score order
export fn scoreOrder() {
  return [
    // Woodwinds
    "piccolo", "flute", "altoFlute",
    "oboe", "englishHorn",
    "clarinet", "clarinetA", "bassClarinet",
    "bassoon", "contrabassoon",
    // Brass
    "horn",
    "trumpet", "trumpetC",
    "trombone", "bassTrombone",
    "tuba",
    // Percussion
    "timpani",
    "percussion",  // Grouped
    // Keyboards
    "celesta", "piano", "organ",
    // Harp
    "harp",
    // Voices (if any)
    // Strings
    "violin",
    "viola",
    "cello",
    "contrabass"
  ];
}

// Sort instruments by score order
export fn sortByScoreOrder(instruments) {
  const order = scoreOrder();
  let result = [];

  for (name in order) {
    for (inst in instruments) {
      if (inst.name == name) {
        result[result.length] = inst;
      }
    }
  }

  return result;
}

// ============================================
// Cue Notes
// ============================================

// Create cue for a part
export fn cue(targetInstrument, sourceInstrument, pitches) {
  return {
    type: "cue",
    target: targetInstrument,
    source: sourceInstrument,
    pitches: pitches,
    size: "small"  // Cue notes are small
  };
}

// ============================================
// Utility
// ============================================

// Get all instruments in an ensemble
export fn getAllInstruments(ensemble) {
  let result = [];

  if (ensemble.sections != null) {
    for (section in ensemble.sections) {
      for (entry in section.instruments) {
        result[result.length] = entry.instrument;
      }
    }
  } else if (ensemble.instruments != null) {
    for (entry in ensemble.instruments) {
      result[result.length] = entry.instrument;
    }
  }

  return result;
}

// Find instruments that can play a pitch
export fn findInstrumentsForPitch(ensemble, pitch) {
  let suitable = [];
  const instruments = getAllInstruments(ensemble);

  for (inst in instruments) {
    if (isInRange(inst, pitch)) {
      suitable[suitable.length] = inst;
    }
  }

  return suitable;
}

// Calculate total range of ensemble
export fn ensembleRange(ensemble) {
  const instruments = getAllInstruments(ensemble);
  let lowest = 127;
  let highest = 0;

  for (inst in instruments) {
    const concertLow = toConcertPitch(inst, inst.range.low);
    const concertHigh = toConcertPitch(inst, inst.range.high);

    if (concertLow < lowest) {
      lowest = concertLow;
    }
    if (concertHigh > highest) {
      highest = concertHigh;
    }
  }

  return {
    lowest: lowest,
    highest: highest,
    span: highest - lowest
  };
}
`;

export const STDLIB_ORNAMENT = `// std:ornament (v4)
// Functions for expanding ornaments (trill, mordent, turn, tremolo)
// Ornaments can be specified via techniques array and parameters in ext:
//   note(C4, q, tech: [trill], trillInterval: 2, trillSpeed: 16);

use std:core { cloneEvent, posToRat };

// Helper: check if array contains value
fn arrayContains(arr, value) {
  if (arr == null) {
    return false;
  }
  for (item in arr) {
    if (item == value) {
      return true;
    }
  }
  return false;
}

// Helper: get value from ext or default
fn getExtOr(ev, key, defaultVal) {
  if (ev.ext == null) {
    return defaultVal;
  }
  const val = ev.ext[key];
  if (val == null) {
    return defaultVal;
  }
  return val;
}

// Auto-expand ornaments based on techniques array and ext metadata
// This function examines each note's tech array and expands accordingly:
//   trill -> reads trillInterval (default 2), trillSpeed (default 16)
//   mordent -> reads mordentInterval (default 1)
//   upper_mordent -> reads mordentInterval (default 2)
//   turn -> reads turnUpperInterval (default 2), turnLowerInterval (default 1)
//   tremolo -> reads tremoloSpeed (default 32)
export fn autoExpand(c) {
  let events = [];

  for (ev in c.events) {
    if (ev.type == "note") {
      const techs = ev.techniques;

      if (arrayContains(techs, "trill")) {
        // Expand trill
        const interval = getExtOr(ev, "trillInterval", 2);
        const speed = getExtOr(ev, "trillSpeed", 16);
        const expanded = expandSingleTrill(ev, interval, speed);
        for (e in expanded) {
          events[events.length] = e;
        }
      } else if (arrayContains(techs, "mordent")) {
        // Expand mordent
        const interval = getExtOr(ev, "mordentInterval", 1);
        const expanded = expandSingleMordent(ev, interval, false);
        for (e in expanded) {
          events[events.length] = e;
        }
      } else if (arrayContains(techs, "upper_mordent")) {
        // Expand upper mordent
        const interval = getExtOr(ev, "mordentInterval", 2);
        const expanded = expandSingleMordent(ev, interval, true);
        for (e in expanded) {
          events[events.length] = e;
        }
      } else if (arrayContains(techs, "turn")) {
        // Expand turn
        const upper = getExtOr(ev, "turnUpperInterval", 2);
        const lower = getExtOr(ev, "turnLowerInterval", 1);
        const expanded = expandSingleTurn(ev, upper, lower);
        for (e in expanded) {
          events[events.length] = e;
        }
      } else if (arrayContains(techs, "tremolo")) {
        // Expand tremolo
        const speed = getExtOr(ev, "tremoloSpeed", 32);
        const expanded = expandSingleTremolo(ev, speed);
        for (e in expanded) {
          events[events.length] = e;
        }
      } else {
        events[events.length] = cloneEvent(ev);
      }
    } else if (ev.type == "chord" && arrayContains(ev.techniques, "tremolo")) {
      // Chord tremolo
      const speed = getExtOr(ev, "tremoloSpeed", 16);
      const expanded = expandSingleChordTremolo(ev, speed);
      for (e in expanded) {
        events[events.length] = e;
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Single-note expansion helpers (used by autoExpand)
fn expandSingleTrill(ev, interval, speed) {
  let result = [];
  const start = posToRat(ev.start);
  if (start == null) {
    result[0] = cloneEvent(ev);
    return result;
  }

  const noteDur = 1 / speed;
  const totalDur = ev.dur;
  const mainPitch = ev.pitch;
  const upperPitch = { midi: mainPitch.midi + interval, cents: mainPitch.cents };

  let currentStart = start;
  let isUpper = false;
  let remaining = totalDur;

  while (remaining > 0 / 1) {
    const thisDur = match (remaining < noteDur) {
      true -> remaining
      else -> noteDur
    };
    const pitch = match (isUpper) {
      true -> upperPitch
      else -> mainPitch
    };
    result[result.length] = {
      type: "note",
      start: currentStart,
      dur: thisDur,
      pitch: pitch,
      velocity: ev.velocity,
      voice: ev.voice
    };
    currentStart = currentStart + thisDur;
    remaining = remaining - thisDur;
    isUpper = !isUpper;
  }
  return result;
}

fn expandSingleMordent(ev, interval, isUpper) {
  let result = [];
  const start = posToRat(ev.start);
  if (start == null) {
    result[0] = cloneEvent(ev);
    return result;
  }

  const mainPitch = ev.pitch;
  const auxPitch = match (isUpper) {
    true -> { midi: mainPitch.midi + interval, cents: mainPitch.cents }
    else -> { midi: mainPitch.midi - interval, cents: mainPitch.cents }
  };
  const totalDur = ev.dur;
  const ornamentDur = totalDur / 8;
  const mainDur = totalDur - (ornamentDur * 2);

  result[0] = { type: "note", start: start, dur: ornamentDur, pitch: mainPitch, velocity: ev.velocity, voice: ev.voice };
  result[1] = { type: "note", start: start + ornamentDur, dur: ornamentDur, pitch: auxPitch, velocity: ev.velocity, voice: ev.voice };
  result[2] = { type: "note", start: start + (ornamentDur * 2), dur: mainDur, pitch: mainPitch, velocity: ev.velocity, voice: ev.voice };
  return result;
}

fn expandSingleTurn(ev, upper, lower) {
  let result = [];
  const start = posToRat(ev.start);
  if (start == null) {
    result[0] = cloneEvent(ev);
    return result;
  }

  const mainPitch = ev.pitch;
  const upperPitch = { midi: mainPitch.midi + upper, cents: mainPitch.cents };
  const lowerPitch = { midi: mainPitch.midi - lower, cents: mainPitch.cents };
  const totalDur = ev.dur;
  const ornamentDur = totalDur / 8;
  const mainDur = totalDur - (ornamentDur * 4);

  result[0] = { type: "note", start: start, dur: ornamentDur, pitch: upperPitch, velocity: ev.velocity, voice: ev.voice };
  result[1] = { type: "note", start: start + ornamentDur, dur: ornamentDur, pitch: mainPitch, velocity: ev.velocity, voice: ev.voice };
  result[2] = { type: "note", start: start + (ornamentDur * 2), dur: ornamentDur, pitch: lowerPitch, velocity: ev.velocity, voice: ev.voice };
  result[3] = { type: "note", start: start + (ornamentDur * 3), dur: ornamentDur + mainDur, pitch: mainPitch, velocity: ev.velocity, voice: ev.voice };
  return result;
}

fn expandSingleTremolo(ev, speed) {
  let result = [];
  const start = posToRat(ev.start);
  if (start == null) {
    result[0] = cloneEvent(ev);
    return result;
  }

  const noteDur = 1 / speed;
  const totalDur = ev.dur;
  let currentStart = start;
  let remaining = totalDur;

  while (remaining > 0 / 1) {
    const thisDur = match (remaining < noteDur) {
      true -> remaining
      else -> noteDur
    };
    result[result.length] = {
      type: "note",
      start: currentStart,
      dur: thisDur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice
    };
    currentStart = currentStart + thisDur;
    remaining = remaining - thisDur;
  }
  return result;
}

fn expandSingleChordTremolo(ev, speed) {
  let result = [];
  const start = posToRat(ev.start);
  const pitches = ev.pitches;

  if (start == null || pitches == null || pitches.length < 2) {
    result[0] = ev;
    return result;
  }

  const mid = pitches.length / 2;
  let firstHalf = [];
  let secondHalf = [];
  for (i in 0..(pitches.length - 1)) {
    if (i < mid) {
      firstHalf[firstHalf.length] = pitches[i];
    } else {
      secondHalf[secondHalf.length] = pitches[i];
    }
  }

  const noteDur = 1 / speed;
  const totalDur = ev.dur;
  let currentStart = start;
  let remaining = totalDur;
  let isSecond = false;

  while (remaining > 0 / 1) {
    const thisDur = match (remaining < noteDur) {
      true -> remaining
      else -> noteDur
    };
    const chordPitches = match (isSecond) {
      true -> secondHalf
      else -> firstHalf
    };
    result[result.length] = {
      type: "chord",
      start: currentStart,
      dur: thisDur,
      pitches: chordPitches,
      velocity: ev.velocity,
      voice: ev.voice
    };
    currentStart = currentStart + thisDur;
    remaining = remaining - thisDur;
    isSecond = !isSecond;
  }
  return result;
}

// Expand a trill: alternates between main pitch and upper pitch
// c: input clip
// interval: semitones above main pitch (default: 2 = whole step)
// speed: subdivisions per beat, e.g., 16 = sixteenth notes (default: 16)
export fn expandTrill(c, interval, speed) {
  let trillInterval = interval;
  if (trillInterval == null) {
    trillInterval = 2;
  }
  let trillSpeed = speed;
  if (trillSpeed == null) {
    trillSpeed = 16;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start == null) {
        events[events.length] = cloneEvent(ev);
      } else {
        // Expand trill into alternating notes
        const noteDur = 1 / trillSpeed;
        const totalDur = ev.dur;
        const mainPitch = ev.pitch;
        const upperPitch = { midi: mainPitch.midi + trillInterval, cents: mainPitch.cents };

        let currentStart = start;
        let isUpper = false;
        let remaining = totalDur;

        while (remaining > 0 / 1) {
          const thisDur = match (remaining < noteDur) {
            true -> remaining
            else -> noteDur
          };

          const pitch = match (isUpper) {
            true -> upperPitch
            else -> mainPitch
          };

          events[events.length] = {
            type: "note",
            start: currentStart,
            dur: thisDur,
            pitch: pitch,
            velocity: ev.velocity,
            voice: ev.voice
          };

          currentStart = currentStart + thisDur;
          remaining = remaining - thisDur;
          isUpper = !isUpper;
        }
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Expand a mordent: main -> lower -> main (short ornament)
// c: input clip
// interval: semitones below main pitch (default: 1 = half step)
export fn expandMordent(c, interval) {
  let mordentInterval = interval;
  if (mordentInterval == null) {
    mordentInterval = 1;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start == null) {
        events[events.length] = cloneEvent(ev);
      } else {
        const mainPitch = ev.pitch;
        const lowerPitch = { midi: mainPitch.midi - mordentInterval, cents: mainPitch.cents };
        const totalDur = ev.dur;

        // Mordent takes 1/8 of the note duration for the ornament
        const ornamentDur = totalDur / 8;
        const mainDur = totalDur - (ornamentDur * 2);

        // First note: main pitch (quick)
        events[events.length] = {
          type: "note",
          start: start,
          dur: ornamentDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        // Second note: lower pitch (quick)
        events[events.length] = {
          type: "note",
          start: start + ornamentDur,
          dur: ornamentDur,
          pitch: lowerPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        // Third note: main pitch (rest of duration)
        events[events.length] = {
          type: "note",
          start: start + (ornamentDur * 2),
          dur: mainDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Expand an upper mordent (inverted): main -> upper -> main
// c: input clip
// interval: semitones above main pitch (default: 2 = whole step)
export fn expandUpperMordent(c, interval) {
  let mordentInterval = interval;
  if (mordentInterval == null) {
    mordentInterval = 2;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start == null) {
        events[events.length] = cloneEvent(ev);
      } else {
        const mainPitch = ev.pitch;
        const upperPitch = { midi: mainPitch.midi + mordentInterval, cents: mainPitch.cents };
        const totalDur = ev.dur;

        const ornamentDur = totalDur / 8;
        const mainDur = totalDur - (ornamentDur * 2);

        events[events.length] = {
          type: "note",
          start: start,
          dur: ornamentDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        events[events.length] = {
          type: "note",
          start: start + ornamentDur,
          dur: ornamentDur,
          pitch: upperPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        events[events.length] = {
          type: "note",
          start: start + (ornamentDur * 2),
          dur: mainDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Expand a turn: upper -> main -> lower -> main
// c: input clip
// upperInterval: semitones above (default: 2)
// lowerInterval: semitones below (default: 1)
export fn expandTurn(c, upperInterval, lowerInterval) {
  let upper = upperInterval;
  if (upper == null) {
    upper = 2;
  }
  let lower = lowerInterval;
  if (lower == null) {
    lower = 1;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start == null) {
        events[events.length] = cloneEvent(ev);
      } else {
        const mainPitch = ev.pitch;
        const upperPitch = { midi: mainPitch.midi + upper, cents: mainPitch.cents };
        const lowerPitch = { midi: mainPitch.midi - lower, cents: mainPitch.cents };
        const totalDur = ev.dur;

        // Turn takes 1/4 of duration for ornament (4 quick notes)
        const ornamentDur = totalDur / 8;
        const mainDur = totalDur - (ornamentDur * 4);

        // Upper
        events[events.length] = {
          type: "note",
          start: start,
          dur: ornamentDur,
          pitch: upperPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        // Main
        events[events.length] = {
          type: "note",
          start: start + ornamentDur,
          dur: ornamentDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        // Lower
        events[events.length] = {
          type: "note",
          start: start + (ornamentDur * 2),
          dur: ornamentDur,
          pitch: lowerPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };

        // Main (rest of duration)
        events[events.length] = {
          type: "note",
          start: start + (ornamentDur * 3),
          dur: ornamentDur + mainDur,
          pitch: mainPitch,
          velocity: ev.velocity,
          voice: ev.voice
        };
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Expand tremolo: rapid repetition of a single note
// c: input clip
// speed: subdivisions per beat (default: 32)
export fn expandTremolo(c, speed) {
  let tremoloSpeed = speed;
  if (tremoloSpeed == null) {
    tremoloSpeed = 32;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start == null) {
        events[events.length] = cloneEvent(ev);
      } else {
        const noteDur = 1 / tremoloSpeed;
        const totalDur = ev.dur;

        let currentStart = start;
        let remaining = totalDur;

        while (remaining > 0 / 1) {
          const thisDur = match (remaining < noteDur) {
            true -> remaining
            else -> noteDur
          };

          events[events.length] = {
            type: "note",
            start: currentStart,
            dur: thisDur,
            pitch: ev.pitch,
            velocity: ev.velocity,
            voice: ev.voice
          };

          currentStart = currentStart + thisDur;
          remaining = remaining - thisDur;
        }
      }
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

// Expand chord tremolo: alternates between two chords
// c: input clip with chord events
// speed: subdivisions per beat (default: 16)
export fn expandChordTremolo(c, speed) {
  let tremoloSpeed = speed;
  if (tremoloSpeed == null) {
    tremoloSpeed = 16;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "chord") {
      const start = posToRat(ev.start);
      const pitches = ev.pitches;

      if (start == null || pitches == null || pitches.length < 2) {
        events[events.length] = ev;
      } else {
        // Split chord into two halves for alternation
        const mid = pitches.length / 2;
        let firstHalf = [];
        let secondHalf = [];

        for (i in 0..(pitches.length - 1)) {
          if (i < mid) {
            firstHalf[firstHalf.length] = pitches[i];
          } else {
            secondHalf[secondHalf.length] = pitches[i];
          }
        }

        const noteDur = 1 / tremoloSpeed;
        const totalDur = ev.dur;

        let currentStart = start;
        let remaining = totalDur;
        let isSecond = false;

        while (remaining > 0 / 1) {
          const thisDur = match (remaining < noteDur) {
            true -> remaining
            else -> noteDur
          };

          const chordPitches = match (isSecond) {
            true -> secondHalf
            else -> firstHalf
          };

          events[events.length] = {
            type: "chord",
            start: currentStart,
            dur: thisDur,
            pitches: chordPitches,
            velocity: ev.velocity,
            voice: ev.voice
          };

          currentStart = currentStart + thisDur;
          remaining = remaining - thisDur;
          isSecond = !isSecond;
        }
      }
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: c.length };
}
`;

export const STDLIB_PEDAL = `// std:pedal (v4)
// Functions for piano pedal markings (sustain, sostenuto, una corda)

// Create a sustain pedal down event at current cursor position
export fn sustainDown() {
  return {
    type: "pedal",
    start: @,
    pedal: "sustain",
    action: "down"
  };
}

// Create a sustain pedal up event at current cursor position
export fn sustainUp() {
  return {
    type: "pedal",
    start: @,
    pedal: "sustain",
    action: "up"
  };
}

// Create a sustain pedal change (retake) event at current cursor position
export fn sustainChange() {
  return {
    type: "pedal",
    start: @,
    pedal: "sustain",
    action: "change"
  };
}

// Create a sostenuto pedal down event at current cursor position
export fn sostenutoDown() {
  return {
    type: "pedal",
    start: @,
    pedal: "sostenuto",
    action: "down"
  };
}

// Create a sostenuto pedal up event at current cursor position
export fn sostenutoUp() {
  return {
    type: "pedal",
    start: @,
    pedal: "sostenuto",
    action: "up"
  };
}

// Create an una corda (soft) pedal down event at current cursor position
export fn unaCordaDown() {
  return {
    type: "pedal",
    start: @,
    pedal: "una_corda",
    action: "down"
  };
}

// Create an una corda (soft) pedal up event at current cursor position
export fn unaCordaUp() {
  return {
    type: "pedal",
    start: @,
    pedal: "una_corda",
    action: "up"
  };
}

// Create a pedal event with explicit parameters
// pedal: "sustain" | "sostenuto" | "una_corda"
// action: "down" | "up" | "change"
export fn pedal(pedalType, action) {
  return {
    type: "pedal",
    start: @,
    pedal: pedalType,
    action: action
  };
}

// Create pedal span (down at start, up at end) for a given duration
// Returns a clip with both pedal events
export fn sustainSpan(dur) {
  const startPos = @;
  return {
    events: [
      { type: "pedal", start: startPos, pedal: "sustain", action: "down" },
      { type: "pedal", start: startPos + dur, pedal: "sustain", action: "up" }
    ],
    length: dur
  };
}

// Wrap a clip with sustain pedal (pedal down at start, up at end)
export fn withSustain(c) {
  let events = [];

  // Add pedal down at start
  events[0] = { type: "pedal", start: 0 / 1, pedal: "sustain", action: "down" };

  // Copy all clip events
  for (ev in c.events) {
    events[events.length] = ev;
  }

  // Add pedal up at end
  events[events.length] = { type: "pedal", start: c.length, pedal: "sustain", action: "up" };

  return { events: events, length: c.length };
}

// Add sustain pedal changes at regular intervals (for legato pedaling)
// c: input clip
// interval: duration between pedal changes (e.g., 1/4 for quarter note)
export fn legatoPedal(c, interval) {
  let events = [];

  // Add initial pedal down
  events[0] = { type: "pedal", start: 0 / 1, pedal: "sustain", action: "down" };

  // Copy all clip events
  for (ev in c.events) {
    events[events.length] = ev;
  }

  // Add pedal changes at intervals
  let pos = interval;
  while (pos < c.length) {
    events[events.length] = { type: "pedal", start: pos, pedal: "sustain", action: "change" };
    pos = pos + interval;
  }

  // Add final pedal up
  events[events.length] = { type: "pedal", start: c.length, pedal: "sustain", action: "up" };

  return { events: events, length: c.length };
}
`;

export const STDLIB_PROB = `// std:prob (v5.2)
// Probability distributions for stochastic music composition
// Provides various distributions and sampling methods

import random;

// ============================================
// Core Random Number Generation
// ============================================

// Create a seeded random state
export fn seed(s) {
  return random:rng(s);
}

// Get next random float [0, 1)
export fn nextRandom(state) {
  return random:nextFloat(state);
}

// ============================================
// Uniform Distribution
// ============================================

// Uniform float in range [min, max)
export fn uniform(state, min, max) {
  const [newState, val] = random:nextFloat(state);
  return [newState, min + val * (max - min)];
}

// Uniform integer in range [min, max]
export fn uniformInt(state, min, max) {
  return random:nextInt(state, min, max + 1);
}

// ============================================
// Gaussian (Normal) Distribution
// ============================================

// Box-Muller transform for normal distribution
// Returns value with mean 0, stddev 1
export fn gaussian(state) {
  const [s1, u1] = random:nextFloat(state);
  const [s2, u2] = random:nextFloat(s1);

  // Avoid log(0)
  let u1Safe = u1;
  if (u1Safe < 0.0001) {
    u1Safe = 0.0001;
  }

  // Box-Muller transform (approximation using Taylor series)
  // sqrt(-2 * ln(u1)) * cos(2 * pi * u2)
  const pi = 3.14159265359;

  // Approximation of ln using series: ln(x) ≈ 2 * sum((x-1)/(x+1))^(2n+1) / (2n+1)
  const x = u1Safe;
  const t = (x - 1) / (x + 1);
  const t2 = t * t;
  const ln_approx = 2 * t * (1 + t2/3 + t2*t2/5 + t2*t2*t2/7);

  // sqrt approximation using Newton-Raphson
  let sqrtVal = 1.0;
  const target = -2 * ln_approx;
  if (target > 0) {
    for (_ in 0..9) {
      sqrtVal = (sqrtVal + target / sqrtVal) / 2;
    }
  }

  // cos approximation
  const angle = 2 * pi * u2;
  const a2 = angle * angle;
  const cos_approx = 1 - a2/2 + a2*a2/24 - a2*a2*a2/720;

  return [s2, sqrtVal * cos_approx];
}

// Normal distribution with given mean and standard deviation
export fn normal(state, mean, stddev) {
  const [newState, z] = gaussian(state);
  return [newState, mean + z * stddev];
}

// ============================================
// Exponential Distribution
// ============================================

// Exponential distribution (for inter-arrival times)
export fn exponential(state, lambda) {
  const [newState, u] = random:nextFloat(state);

  // Avoid log(0)
  let uSafe = u;
  if (uSafe < 0.0001) {
    uSafe = 0.0001;
  }

  // ln approximation
  const t = (uSafe - 1) / (uSafe + 1);
  const t2 = t * t;
  const ln_approx = 2 * t * (1 + t2/3 + t2*t2/5);

  return [newState, -ln_approx / lambda];
}

// ============================================
// Weighted/Discrete Distributions
// ============================================

// Sample from discrete distribution with weights
// options: array of values
// weights: array of weights (must be same length)
export fn weighted(state, options, weights) {
  // Calculate total weight
  let total = 0;
  for (w in weights) {
    total = total + w;
  }

  const [newState, r] = random:nextFloat(state);
  let threshold = r * total;

  for (i in 0..(options.length - 1)) {
    threshold = threshold - weights[i];
    if (threshold <= 0) {
      return [newState, options[i]];
    }
  }

  return [newState, options[options.length - 1]];
}

// Sample from probability mass function (PMF)
// pmf: object mapping values to probabilities
export fn samplePMF(state, pmf) {
  let options = [];
  let weights = [];

  for (key in pmf) {
    options[options.length] = key;
    weights[weights.length] = pmf[key];
  }

  return weighted(state, options, weights);
}

// ============================================
// Poisson Distribution
// ============================================

// Poisson distribution (for counting events)
// Uses Knuth's algorithm
export fn poisson(state, lambda) {
  let L = 1.0;

  // e^(-lambda) approximation
  let exp_neg_lambda = 1.0;
  let term = 1.0;
  for (i in 1..20) {
    term = term * (-lambda) / i;
    exp_neg_lambda = exp_neg_lambda + term;
  }
  if (exp_neg_lambda < 0.0001) {
    exp_neg_lambda = 0.0001;
  }
  L = exp_neg_lambda;

  let k = 0;
  let p = 1.0;
  let s = state;

  while (p > L) {
    k = k + 1;
    const [newS, u] = random:nextFloat(s);
    s = newS;
    p = p * u;
  }

  return [s, k - 1];
}

// ============================================
// Triangular Distribution
// ============================================

// Triangular distribution (min, mode, max)
// Good for "approximately" values
export fn triangular(state, min, mode, max) {
  const [newState, u] = random:nextFloat(state);

  const fc = (mode - min) / (max - min);

  let val = 0;
  if (u < fc) {
    // sqrt approximation
    let target = u * (max - min) * (mode - min);
    let sqrtVal = target / 2;
    for (_ in 0..9) {
      sqrtVal = (sqrtVal + target / sqrtVal) / 2;
    }
    val = min + sqrtVal;
  } else {
    let target = (1 - u) * (max - min) * (max - mode);
    let sqrtVal = target / 2;
    for (_ in 0..9) {
      sqrtVal = (sqrtVal + target / sqrtVal) / 2;
    }
    val = max - sqrtVal;
  }

  return [newState, val];
}

// ============================================
// Beta Distribution (approximation)
// ============================================

// Beta distribution for bounded randomness
// alpha, beta > 0, output in [0, 1]
export fn beta(state, alpha, betaParam) {
  // Simple approximation using mean + variance adjustment
  const mean = alpha / (alpha + betaParam);
  const variance = (alpha * betaParam) / ((alpha + betaParam) ** 2 * (alpha + betaParam + 1));

  // Use triangular approximation
  let stddev = 0.5;
  if (variance > 0) {
    // sqrt approximation
    let sqrtVal = variance;
    for (_ in 0..9) {
      sqrtVal = (sqrtVal + variance / sqrtVal) / 2;
    }
    stddev = sqrtVal;
  }

  const min = mean - stddev * 1.732;  // sqrt(3) for triangular
  const max = mean + stddev * 1.732;

  let [newState, val] = triangular(state, min, mean, max);

  // Clamp to [0, 1]
  if (val < 0) { val = 0; }
  if (val > 1) { val = 1; }

  return [newState, val];
}

// ============================================
// Musical Applications
// ============================================

// Generate random pitches from scale with weights
// Weights favor certain scale degrees (e.g., tonic, fifth)
export fn randomScalePitch(state, scale, basePitch, weights) {
  let w = weights;
  if (w == null) {
    // Default: favor root and fifth
    w = [];
    for (i in 0..(scale.length - 1)) {
      if (i == 0) {
        w[i] = 3;  // Root
      } else if (i == 4) {
        w[i] = 2;  // Fifth (in diatonic)
      } else {
        w[i] = 1;
      }
    }
  }

  let indices = [];
  for (i in 0..(scale.length - 1)) {
    indices[i] = i;
  }

  const [newState, idx] = weighted(state, indices, w);
  return [newState, basePitch + scale[idx]];
}

// Generate random velocity with humanization
export fn randomVelocity(state, baseVelocity, humanize) {
  let h = humanize;
  if (h == null) {
    h = 0.1;
  }

  const [newState, offset] = normal(state, 0, h);
  let vel = baseVelocity + offset;

  if (vel < 0) { vel = 0; }
  if (vel > 1) { vel = 1; }

  return [newState, vel];
}

// Generate random duration variation
export fn randomDuration(state, baseDuration, variation) {
  let v = variation;
  if (v == null) {
    v = 0.1;
  }

  const [newState, factor] = normal(state, 1.0, v);
  let dur = baseDuration * factor;

  if (dur < baseDuration * 0.5) {
    dur = baseDuration * 0.5;
  }
  if (dur > baseDuration * 1.5) {
    dur = baseDuration * 1.5;
  }

  return [newState, dur];
}

// Generate random timing offset (for "humanize" effect)
export fn randomTiming(state, maxOffset) {
  let m = maxOffset;
  if (m == null) {
    m = 0.02;  // 20ms default
  }

  return uniform(state, -m, m);
}

// Markov chain step
export fn markovStep(state, currentState, transitions) {
  const trans = transitions[currentState];
  if (trans == null) {
    return [state, currentState];  // Stay in current state
  }

  let options = [];
  let weights = [];
  for (next in trans) {
    options[options.length] = next;
    weights[weights.length] = trans[next];
  }

  return weighted(state, options, weights);
}

// ============================================
// Sequence Generation
// ============================================

// Generate n uniform random floats
export fn uniformSequence(state, n, min, max) {
  let result = [];
  let s = state;

  for (_ in 0..(n - 1)) {
    const [newS, val] = uniform(s, min, max);
    s = newS;
    result[result.length] = val;
  }

  return [s, result];
}

// Generate n normal random values
export fn normalSequence(state, n, mean, stddev) {
  let result = [];
  let s = state;

  for (_ in 0..(n - 1)) {
    const [newS, val] = normal(s, mean, stddev);
    s = newS;
    result[result.length] = val;
  }

  return [s, result];
}

// Generate n weighted samples
export fn weightedSequence(state, n, options, weights) {
  let result = [];
  let s = state;

  for (_ in 0..(n - 1)) {
    const [newS, val] = weighted(s, options, weights);
    s = newS;
    result[result.length] = val;
  }

  return [s, result];
}

// Shuffle array (Fisher-Yates)
export fn shuffle(state, arr) {
  let result = [];
  for (x in arr) {
    result[result.length] = x;
  }

  let s = state;
  for (i in 0..(result.length - 2)) {
    const j = result.length - 1 - i;
    const [newS, k] = uniformInt(s, 0, j);
    s = newS;

    // Swap
    const temp = result[j];
    result[j] = result[k];
    result[k] = temp;
  }

  return [s, result];
}

// Pick n random elements from array (without replacement)
export fn sample(state, arr, n) {
  const [newState, shuffled] = shuffle(state, arr);

  let result = [];
  let count = n;
  if (count > shuffled.length) {
    count = shuffled.length;
  }

  for (i in 0..(count - 1)) {
    result[result.length] = shuffled[i];
  }

  return [newState, result];
}

// Pick 1 random element from array
export fn choice(state, arr) {
  if (arr.length == 0) {
    return [state, null];
  }
  const [newState, idx] = uniformInt(state, 0, arr.length - 1);
  return [newState, arr[idx]];
}

// ============================================
// Probability Utilities
// ============================================

// Bernoulli trial (flip coin with given probability)
export fn bernoulli(state, p) {
  const [newState, u] = random:nextFloat(state);
  return [newState, u < p];
}

// Geometric distribution (number of trials until first success)
export fn geometric(state, p) {
  let s = state;
  let count = 1;

  while (count < 1000) {
    const [newS, success] = bernoulli(s, p);
    s = newS;
    if (success) {
      return [s, count];
    }
    count = count + 1;
  }

  return [s, count];
}

// Binomial distribution (number of successes in n trials)
export fn binomial(state, n, p) {
  let s = state;
  let successes = 0;

  for (_ in 0..(n - 1)) {
    const [newS, success] = bernoulli(s, p);
    s = newS;
    if (success) {
      successes = successes + 1;
    }
  }

  return [s, successes];
}

// Categorical distribution (generalized Bernoulli)
export fn categorical(state, probabilities) {
  let options = [];
  for (i in 0..(probabilities.length - 1)) {
    options[i] = i;
  }
  return weighted(state, options, probabilities);
}

// ============================================
// Brownian Motion / Random Walk
// ============================================

// 1D random walk
export fn randomWalk(state, steps, stepSize) {
  let s = state;
  let position = 0;
  let result = [position];

  for (_ in 0..(steps - 1)) {
    const [newS, direction] = bernoulli(s, 0.5);
    s = newS;

    if (direction) {
      position = position + stepSize;
    } else {
      position = position - stepSize;
    }
    result[result.length] = position;
  }

  return [s, result];
}

// Brownian motion (continuous random walk)
export fn brownianMotion(state, steps, volatility) {
  let s = state;
  let position = 0;
  let result = [position];

  for (_ in 0..(steps - 1)) {
    const [newS, delta] = normal(s, 0, volatility);
    s = newS;
    position = position + delta;
    result[result.length] = position;
  }

  return [s, result];
}

// Bounded random walk (stays within min/max)
export fn boundedWalk(state, steps, stepSize, min, max) {
  let s = state;
  let position = (min + max) / 2;
  let result = [position];

  for (_ in 0..(steps - 1)) {
    const [newS, delta] = normal(s, 0, stepSize);
    s = newS;
    position = position + delta;

    // Reflect at boundaries
    if (position < min) {
      position = min + (min - position);
    }
    if (position > max) {
      position = max - (position - max);
    }

    result[result.length] = position;
  }

  return [s, result];
}
`;

export const STDLIB_RAGA = `// std:raga (v5.5)
// Indian classical music (Hindustani and Carnatic)
// Ragas, talas, gamakas, and melodic phrases

// ============================================
// Swara (Notes)
// ============================================

// Basic swaras (sargam)
export const SA = 0;   // Shadja (tonic)
export const RI = 1;   // Rishabha (komal)
export const RI_SHARP = 2;  // Rishabha (shuddha)
export const GA = 3;   // Gandhar (komal)
export const GA_SHARP = 4;  // Gandhar (shuddha)
export const MA = 5;   // Madhyam (shuddha)
export const MA_SHARP = 6;  // Madhyam (tivra)
export const PA = 7;   // Pancham
export const DHA = 8;  // Dhaivat (komal)
export const DHA_SHARP = 9;  // Dhaivat (shuddha)
export const NI = 10;  // Nishad (komal)
export const NI_SHARP = 11; // Nishad (shuddha)

// Saptak (octaves)
export const MANDRA = -1;  // Lower octave
export const MADHYA = 0;   // Middle octave
export const TAAR = 1;     // Upper octave

// Create swara with octave
export fn swara(note, octave) {
  let oct = octave;
  if (oct == null) {
    oct = MADHYA;
  }
  return {
    note: note,
    octave: oct,
    pitch: note + (oct * 12)
  };
}

// ============================================
// Raga Definition
// ============================================

// Create a raga
export fn raga(name, aroha, avaroha, vadi, samvadi, pakad, thaat) {
  return {
    type: "raga",
    name: name,
    aroha: aroha,      // Ascending scale
    avaroha: avaroha,  // Descending scale
    vadi: vadi,        // Most important note
    samvadi: samvadi,  // Second most important
    pakad: pakad,      // Characteristic phrase
    thaat: thaat,      // Parent scale
    time: null,        // Prahar (time of day)
    rasa: null         // Mood/emotion
  };
}

// ============================================
// Thaat (Parent Scales - Hindustani)
// ============================================

export fn thaatBilawal() {
  return {
    name: "bilawal",
    swaras: [SA, RI_SHARP, GA_SHARP, MA, PA, DHA_SHARP, NI_SHARP],
    western: "major"
  };
}

export fn thaatKhamaj() {
  return {
    name: "khamaj",
    swaras: [SA, RI_SHARP, GA_SHARP, MA, PA, DHA_SHARP, NI],
    western: "mixolydian"
  };
}

export fn thaatKafi() {
  return {
    name: "kafi",
    swaras: [SA, RI_SHARP, GA, MA, PA, DHA_SHARP, NI],
    western: "dorian"
  };
}

export fn thaatAsavari() {
  return {
    name: "asavari",
    swaras: [SA, RI_SHARP, GA, MA, PA, DHA, NI],
    western: "natural minor"
  };
}

export fn thaatBhairavi() {
  return {
    name: "bhairavi",
    swaras: [SA, RI, GA, MA, PA, DHA, NI],
    western: "phrygian"
  };
}

export fn thaatBhairav() {
  return {
    name: "bhairav",
    swaras: [SA, RI, GA_SHARP, MA, PA, DHA, NI_SHARP]
  };
}

export fn thaatKalyan() {
  return {
    name: "kalyan",
    swaras: [SA, RI_SHARP, GA_SHARP, MA_SHARP, PA, DHA_SHARP, NI_SHARP],
    western: "lydian"
  };
}

export fn thaatMarwa() {
  return {
    name: "marwa",
    swaras: [SA, RI, GA_SHARP, MA_SHARP, PA, DHA_SHARP, NI_SHARP]
  };
}

export fn thaatPurvi() {
  return {
    name: "purvi",
    swaras: [SA, RI, GA_SHARP, MA_SHARP, PA, DHA, NI_SHARP]
  };
}

export fn thaatTodi() {
  return {
    name: "todi",
    swaras: [SA, RI, GA, MA_SHARP, PA, DHA, NI_SHARP]
  };
}

// ============================================
// Common Ragas
// ============================================

export fn ragaYaman() {
  return raga(
    "yaman",
    [SA, RI_SHARP, GA_SHARP, MA_SHARP, PA, DHA_SHARP, NI_SHARP],
    [NI_SHARP, DHA_SHARP, PA, MA_SHARP, GA_SHARP, RI_SHARP, SA],
    GA_SHARP,  // Vadi
    NI_SHARP,  // Samvadi
    [NI_SHARP, RI_SHARP, GA_SHARP, RI_SHARP, SA],  // Pakad
    "kalyan"
  );
}

export fn ragaBhairav() {
  return raga(
    "bhairav",
    [SA, RI, GA_SHARP, MA, PA, DHA, NI_SHARP],
    [NI_SHARP, DHA, PA, MA, GA_SHARP, RI, SA],
    DHA,
    RI,
    [GA_SHARP, MA, DHA, PA, GA_SHARP, MA, RI, SA],
    "bhairav"
  );
}

export fn ragaBhairavi() {
  return raga(
    "bhairavi",
    [SA, RI, GA, MA, PA, DHA, NI],
    [NI, DHA, PA, MA, GA, RI, SA],
    MA,
    SA,
    [DHA, NI, SA, RI, GA, MA, GA, RI, SA],
    "bhairavi"
  );
}

export fn ragaKafi() {
  return raga(
    "kafi",
    [SA, RI_SHARP, GA, MA, PA, DHA_SHARP, NI],
    [NI, DHA_SHARP, PA, MA, GA, RI_SHARP, SA],
    PA,
    SA,
    [MA, PA, GA, MA, RI_SHARP, SA],
    "kafi"
  );
}

export fn ragaDarbari() {
  return raga(
    "darbariKanada",
    [SA, RI_SHARP, GA, MA, PA, DHA, NI],
    [NI, DHA, PA, MA, GA, RI_SHARP, SA],
    RI_SHARP,
    PA,
    [SA, RI_SHARP, GA, SA, DHA, NI, SA],
    "asavari"
  );
}

export fn ragaMarwa() {
  return raga(
    "marwa",
    [SA, RI, GA_SHARP, MA_SHARP, DHA_SHARP, NI_SHARP],  // No Pa
    [NI_SHARP, DHA_SHARP, MA_SHARP, GA_SHARP, RI, SA],
    DHA_SHARP,
    RI,
    [DHA_SHARP, NI_SHARP, SA, RI, GA_SHARP, RI],
    "marwa"
  );
}

export fn ragaMalkauns() {
  return raga(
    "malkauns",
    [SA, GA, MA, DHA, NI],  // Pentatonic (no Ri, Pa)
    [NI, DHA, MA, GA, SA],
    MA,
    SA,
    [MA, GA, MA, DHA, NI, DHA, MA, GA, SA],
    "bhairavi"
  );
}

export fn ragaBageshri() {
  return raga(
    "bageshri",
    [SA, GA, MA, DHA, NI],
    [NI, DHA, MA, GA, RI_SHARP, SA],
    MA,
    SA,
    [DHA, NI, SA, GA, MA, GA, RI_SHARP, SA],
    "kafi"
  );
}

// ============================================
// Tala (Rhythm Cycles)
// ============================================

// Create tala
export fn tala(name, beats, vibhags, sam, khali) {
  return {
    type: "tala",
    name: name,
    beats: beats,       // Total beats (matras)
    vibhags: vibhags,   // Divisions
    sam: sam,           // Beat 1 (stressed)
    khali: khali        // Empty beats
  };
}

// Common talas
export fn teental() {
  return tala("teental", 16, [4, 4, 4, 4], 1, [9]);
}

export fn jhaptal() {
  return tala("jhaptal", 10, [2, 3, 2, 3], 1, [6]);
}

export fn rupak() {
  return tala("rupak", 7, [3, 2, 2], 1, [1]);  // Khali on sam
}

export fn ektal() {
  return tala("ektal", 12, [2, 2, 2, 2, 2, 2], 1, [5, 9]);
}

export fn dadra() {
  return tala("dadra", 6, [3, 3], 1, [4]);
}

export fn keherwa() {
  return tala("keherwa", 8, [4, 4], 1, [5]);
}

export fn adichautal() {
  return tala("adichautal", 14, [2, 4, 4, 4], 1, [7, 11]);
}

// Carnatic talas
export fn adiTala() {
  return tala("adi", 8, [4, 2, 2], 1, []);
}

export fn rupakaTala() {
  return tala("rupaka", 6, [2, 4], 1, []);
}

export fn mishraChapuTala() {
  return tala("mishraChappu", 7, [3, 4], 1, []);
}

// ============================================
// Gamaka (Ornaments)
// ============================================

// Create gamaka (ornament)
export fn gamaka(type, notes, duration) {
  return {
    type: "gamaka",
    gamakaType: type,
    notes: notes,
    duration: duration
  };
}

// Meend (glide between notes)
export fn meend(fromNote, toNote, duration) {
  return gamaka("meend", [fromNote, toNote], duration);
}

// Kan (grace note)
export fn kan(mainNote, graceNote) {
  return gamaka("kan", [graceNote, mainNote], null);
}

// Murki (quick ornament)
export fn murki(notes) {
  return gamaka("murki", notes, null);
}

// Andolan (slow oscillation)
export fn andolan(note, range, duration) {
  return gamaka("andolan", [note - range, note, note + range], duration);
}

// Kampita (vibrato)
export fn kampita(note, intensity) {
  return gamaka("kampita", [note], { intensity: intensity });
}

// Krintan (pull-off)
export fn krintan(higherNote, lowerNote) {
  return gamaka("krintan", [higherNote, lowerNote], null);
}

// Zamzama (phrase repetition with variation)
export fn zamzama(phrase) {
  return gamaka("zamzama", phrase, null);
}

// ============================================
// Alap Structure
// ============================================

// Create alap section
export fn alap(raga, phrases) {
  return {
    type: "alap",
    raga: raga,
    phrases: phrases,
    tempo: "free"
  };
}

// Sthayi (first part of composition)
export fn sthayi(melody) {
  return {
    type: "sthayi",
    register: "madhya-mandra",
    melody: melody
  };
}

// Antara (second part)
export fn antara(melody) {
  return {
    type: "antara",
    register: "madhya-taar",
    melody: melody
  };
}

// Sanchari (third part)
export fn sanchari(melody) {
  return {
    type: "sanchari",
    register: "all",
    melody: melody
  };
}

// Abhog (concluding part)
export fn abhog(melody) {
  return {
    type: "abhog",
    register: "madhya",
    melody: melody
  };
}

// ============================================
// Phrase Generation
// ============================================

// Generate phrase in raga
export fn generatePhrase(raga, startNote, direction, length) {
  let phrase = [];
  let currentNote = startNote;

  const scale = direction == "up" ? raga.aroha : raga.avaroha;

  // Find starting position in scale
  let scaleIdx = 0;
  for (i in 0..(scale.length - 1)) {
    if (scale[i] == startNote) {
      scaleIdx = i;
      break;
    }
  }

  for (_ in 0..(length - 1)) {
    phrase[phrase.length] = scale[scaleIdx];

    if (direction == "up") {
      scaleIdx = scaleIdx + 1;
      if (scaleIdx >= scale.length) {
        scaleIdx = 0;
      }
    } else {
      scaleIdx = scaleIdx - 1;
      if (scaleIdx < 0) {
        scaleIdx = scale.length - 1;
      }
    }
  }

  return phrase;
}

// Add pakad to phrase
export fn addPakad(raga, phrase) {
  let result = [];
  for (note in phrase) {
    result[result.length] = note;
  }
  for (note in raga.pakad) {
    result[result.length] = note;
  }
  return result;
}

// ============================================
// Laya (Tempo)
// ============================================

export const VILAMBIT = "vilambit";  // Slow
export const MADHYA_LAYA = "madhya"; // Medium
export const DRUT = "drut";          // Fast
export const ATI_DRUT = "atiDrut";   // Very fast

// Get tempo multiplier
export fn layaMultiplier(laya) {
  if (laya == VILAMBIT) { return 0.5; }
  if (laya == MADHYA_LAYA) { return 1.0; }
  if (laya == DRUT) { return 2.0; }
  if (laya == ATI_DRUT) { return 4.0; }
  return 1.0;
}

// ============================================
// Composition Structure
// ============================================

// Create bandish (composition)
export fn bandish(name, raga, tala, sthayi, antara) {
  return {
    type: "bandish",
    name: name,
    raga: raga,
    tala: tala,
    sthayi: sthayi,
    antara: antara
  };
}

// Create taan (fast melodic passage)
export fn taan(notes, pattern) {
  return {
    type: "taan",
    notes: notes,
    pattern: pattern,  // "sapat" (straight), "vakra" (zigzag), etc.
    laya: DRUT
  };
}

// ============================================
// Carnatic Specifics
// ============================================

// Melakarta (72 parent scales)
export fn melakarta(number) {
  // Calculate swaras based on melakarta number
  const chakra = ((number - 1) / 6);
  const position = (number - 1) % 6;

  // First 36 have shuddha madhyam, next 36 have prati madhyam
  const ma = (number <= 36) ? MA : MA_SHARP;

  // Determine ri and ga based on chakra
  let ri = RI;
  let ga = GA;
  if (chakra < 6) {
    ri = [RI, RI, RI_SHARP, RI_SHARP, GA, GA][chakra % 6];
    ga = [GA, GA_SHARP, GA_SHARP, GA_SHARP, GA_SHARP, MA][chakra % 6];
  }

  // Determine dha and ni based on position
  const dhaOptions = [DHA, DHA, DHA, DHA_SHARP, DHA_SHARP, NI];
  const niOptions = [NI, NI_SHARP, NI_SHARP, NI_SHARP, NI_SHARP, NI_SHARP];
  const dha = dhaOptions[position];
  const ni = niOptions[position];

  return {
    number: number,
    swaras: [SA, ri, ga, ma, PA, dha, ni]
  };
}

// Kritis structure
export fn kriti(name, ragam, talam, pallavi, anupallavi, charanam) {
  return {
    type: "kriti",
    name: name,
    ragam: ragam,
    talam: talam,
    pallavi: pallavi,
    anupallavi: anupallavi,
    charanam: charanam
  };
}

// ============================================
// Utility Functions
// ============================================

// Check if note is in raga
export fn isInRaga(note, raga, direction) {
  const scale = direction == "up" ? raga.aroha : raga.avaroha;
  for (s in scale) {
    if (s == note) {
      return true;
    }
  }
  return false;
}

// Get note importance in raga
export fn noteImportance(note, raga) {
  if (note == raga.vadi) { return 3; }
  if (note == raga.samvadi) { return 2; }
  if (note == SA || note == PA) { return 1.5; }
  return 1;
}

// Convert to MIDI pitch
export fn toMidi(swara, basePitch) {
  let base = basePitch;
  if (base == null) {
    base = 60;  // Middle C as Sa
  }

  if (swara.note != null) {
    return base + swara.note + (swara.octave * 12);
  }
  return base + swara;
}

// Convert MIDI to swara
export fn fromMidi(midiNote, basePitch) {
  let base = basePitch;
  if (base == null) {
    base = 60;
  }

  const diff = midiNote - base;
  const octave = (diff / 12) - (diff % 12 < 0 ? 1 : 0);
  const note = ((diff % 12) + 12) % 12;

  return swara(note, octave);
}

// Get time of day for raga
export fn ragaTime(raga) {
  // Common raga-time associations
  const morningRagas = ["bhairav", "todi", "ahirBhairav"];
  const afternoonRagas = ["sarang", "bhimpalasi"];
  const eveningRagas = ["yaman", "purvi", "marwa"];
  const nightRagas = ["darbariKanada", "malkauns", "bageshri"];

  for (r in morningRagas) {
    if (raga.name == r) { return "morning"; }
  }
  for (r in eveningRagas) {
    if (raga.name == r) { return "evening"; }
  }
  for (r in nightRagas) {
    if (raga.name == r) { return "night"; }
  }
  return "anytime";
}
`;

export const STDLIB_RANDOM = `// std:random (v4)

const RNG_A = 1664525;
const RNG_C = 1013904223;
const RNG_M = 4294967296;

fn nextState(state) {
  return (state * RNG_A + RNG_C) % RNG_M;
}

export fn rng(seed) {
  let state = seed % RNG_M;
  if (state < 0) {
    state = state + RNG_M;
  }
  return { state: state };
}

export fn nextFloat(r) {
  const next = nextState(r.state);
  const value = next / RNG_M;
  return [{ state: next }, value];
}

export fn nextInt(r, lo, hi) {
  const span = hi - lo;
  if (span <= 0) {
    return [{ state: r.state }, lo];
  }
  const next = nextState(r.state);
  const value = lo + (next % span);
  return [{ state: next }, value];
}
`;

export const STDLIB_RESULT = `// std:result (v4)
// Result型のためのヘルパー関数

// Ok - 成功値をラップ
export fn Ok(value) {
  return { kind: "Ok", value: value };
}

// Err - エラー値をラップ
export fn Err(error) {
  return { kind: "Err", error: error };
}

// isOk - Result が Ok かどうか判定
export fn isOk(result) {
  return result.kind == "Ok";
}

// isErr - Result が Err かどうか判定
export fn isErr(result) {
  return result.kind == "Err";
}

// unwrap - Ok から値を取り出す (Err の場合は null)
export fn unwrap(result) {
  if (result.kind == "Ok") {
    return result.value;
  }
  return null;
}

// unwrapErr - Err からエラーを取り出す (Ok の場合は null)
export fn unwrapErr(result) {
  if (result.kind == "Err") {
    return result.error;
  }
  return null;
}

// unwrapOr - Ok なら値を、Err ならデフォルト値を返す
export fn unwrapOr(result, defaultValue) {
  if (result.kind == "Ok") {
    return result.value;
  }
  return defaultValue;
}

// map - Ok の値に関数を適用
export fn map(result, f) {
  if (result.kind == "Ok") {
    return Ok(f(result.value));
  }
  return result;
}

// mapErr - Err の値に関数を適用
export fn mapErr(result, f) {
  if (result.kind == "Err") {
    return Err(f(result.error));
  }
  return result;
}

// andThen - Ok の場合に別の Result を返す関数を適用 (flatMap/bind)
export fn andThen(result, f) {
  if (result.kind == "Ok") {
    return f(result.value);
  }
  return result;
}

// orElse - Err の場合に別の Result を返す関数を適用
export fn orElse(result, f) {
  if (result.kind == "Err") {
    return f(result.error);
  }
  return result;
}
`;

export const STDLIB_RHYTHM = `// std:rhythm (v4)
// Rhythmic pattern generation utilities

// euclidean - generate Euclidean rhythm pattern
// Returns array of booleans where true = hit
// Example: euclidean(3, 8) = [true, false, false, true, false, false, true, false]
export fn euclidean(hits, steps, rotation) {
  if (hits <= 0 || steps <= 0) {
    return [];
  }
  if (hits >= steps) {
    let out = [];
    for (i in 0..(steps - 1)) {
      out[out.length] = true;
    }
    return out;
  }

  // Bjorklund's algorithm
  let pattern = [];
  for (i in 0..(steps - 1)) {
    if (i < hits) {
      pattern[pattern.length] = [true];
    } else {
      pattern[pattern.length] = [false];
    }
  }

  let divisor = steps - hits;
  for (_ in 0..100) {
    if (divisor <= 1) {
      // Flatten
      let out = [];
      for (seq in pattern) {
        for (v in seq) {
          out[out.length] = v;
        }
      }
      // Apply rotation
      if (rotation != null && rotation != 0) {
        let rotated = [];
        const len = out.length;
        let r = rotation % len;
        if (r < 0) {
          r = r + len;
        }
        for (i in 0..(len - 1)) {
          const idx = (i + r) % len;
          rotated[rotated.length] = out[idx];
        }
        return rotated;
      }
      return out;
    }

    let newPattern = [];
    const minLen = pattern.length - divisor;
    if (minLen <= 0) {
      // Flatten
      let out = [];
      for (seq in pattern) {
        for (v in seq) {
          out[out.length] = v;
        }
      }
      return out;
    }

    for (i in 0..(minLen - 1)) {
      let combined = [];
      for (v in pattern[i]) {
        combined[combined.length] = v;
      }
      const tailIdx = pattern.length - 1 - i;
      if (tailIdx >= minLen) {
        for (v in pattern[tailIdx]) {
          combined[combined.length] = v;
        }
      }
      newPattern[newPattern.length] = combined;
    }
    // Append remaining
    for (i in minLen..(pattern.length - divisor - 1)) {
      newPattern[newPattern.length] = pattern[i];
    }
    pattern = newPattern;
    divisor = pattern.length - minLen;
    if (divisor < 0) {
      divisor = 0;
    }
  }

  // Fallback: flatten
  let out = [];
  for (seq in pattern) {
    for (v in seq) {
      out[out.length] = v;
    }
  }
  return out;
}

// euclideanClip - generate Euclidean rhythm as a Clip
export fn euclideanClip(hits, steps, stepDur, key, vel, rotation) {
  const pattern = euclidean(hits, steps, rotation);
  let velocity = vel;
  if (velocity == null) {
    velocity = 0.8;
  }
  let events = [];
  let pos = 0 / 1;
  for (hit in pattern) {
    if (hit) {
      events[events.length] = {
        type: "drumHit",
        start: pos,
        dur: stepDur,
        key: key,
        velocity: velocity
      };
    }
    pos = pos + stepDur;
  }
  return { events: events, length: pos };
}

// polyrhythm - create polyrhythmic pattern
// a beats against b beats over given duration
export fn polyrhythm(a, b, totalDur) {
  const durA = totalDur / a;
  const durB = totalDur / b;

  let events = [];

  // First voice
  for (i in 0..(a - 1)) {
    events[events.length] = {
      type: "note",
      start: durA * i,
      dur: durA,
      pitch: 60,  // C4
      velocity: 0.8,
      voice: 0
    };
  }

  // Second voice
  for (i in 0..(b - 1)) {
    events[events.length] = {
      type: "note",
      start: durB * i,
      dur: durB,
      pitch: 64,  // E4
      velocity: 0.7,
      voice: 1
    };
  }

  return { events: events, length: totalDur };
}

// crossRhythm - create cross-rhythm pattern from duration array
export fn crossRhythm(durations, against) {
  let events = [];
  let pos = 0 / 1;
  let voice = 0;
  for (dur in durations) {
    events[events.length] = {
      type: "note",
      start: pos,
      dur: dur,
      pitch: 60,
      velocity: 0.8,
      voice: voice
    };
    pos = pos + dur;
    voice = (voice + 1) % 2;
  }
  return { events: events, length: pos };
}

// groove - create a groove map (velocity/timing offsets)
export fn groove(name, intensity) {
  let intens = intensity;
  if (intens == null) {
    intens = 0.5;
  }

  if (name == "swing") {
    return {
      name: "swing",
      intensity: intens,
      offsets: [0, intens * 0.33, 0, intens * 0.33]
    };
  }
  if (name == "shuffle") {
    return {
      name: "shuffle",
      intensity: intens,
      offsets: [0, intens * 0.5, 0, intens * 0.5]
    };
  }
  if (name == "lazy") {
    return {
      name: "lazy",
      intensity: intens,
      offsets: [0, intens * 0.1, intens * 0.05, intens * 0.15]
    };
  }
  if (name == "push") {
    return {
      name: "push",
      intensity: intens,
      offsets: [0, 0 - intens * 0.1, 0, 0 - intens * 0.1]
    };
  }
  // Default: straight
  return {
    name: "straight",
    intensity: 0,
    offsets: [0, 0, 0, 0]
  };
}

// applyGroove - apply groove map to a clip
export fn applyGroove(c, gr, grid) {
  let gridDur = grid;
  if (gridDur == null) {
    gridDur = 1 / 8;  // eighth note default
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      const start = ev.start;
      if (start != null && start.n != null && start.d != null) {
        // Calculate position in grid
        const gridNum = start.n * gridDur.d;
        const gridDen = start.d * gridDur.n;
        const gridPos = gridNum / gridDen;
        const gridIdx = gridPos - (gridPos - (gridPos % 1));
        const offsetIdx = gridIdx % gr.offsets.length;
        const offset = gr.offsets[offsetIdx] * gridDur;

        let newEvent = {
          type: ev.type,
          start: start + offset,
          dur: ev.dur,
          velocity: ev.velocity
        };
        if (ev.type == "note") {
          newEvent.pitch = ev.pitch;
          newEvent.voice = ev.voice;
          newEvent.techniques = ev.techniques;
          newEvent.lyric = ev.lyric;
        } else if (ev.type == "chord") {
          newEvent.pitches = ev.pitches;
          newEvent.voice = ev.voice;
          newEvent.techniques = ev.techniques;
        } else if (ev.type == "drumHit") {
          newEvent.key = ev.key;
          newEvent.techniques = ev.techniques;
        }
        events[events.length] = newEvent;
      } else {
        events[events.length] = ev;
      }
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// clave - generate common clave patterns
export fn clave(style, dur) {
  let stepDur = dur;
  if (stepDur == null) {
    stepDur = 1 / 8;
  }

  let pattern = [];
  if (style == "son" || style == "3-2") {
    pattern = [true, false, false, true, false, false, true, false,
               false, false, true, false, true, false, false, false];
  } else if (style == "rumba" || style == "rumba-3-2") {
    pattern = [true, false, false, true, false, false, false, true,
               false, false, true, false, true, false, false, false];
  } else if (style == "2-3") {
    pattern = [false, false, true, false, true, false, false, false,
               true, false, false, true, false, false, true, false];
  } else if (style == "bossa") {
    pattern = [true, false, false, true, false, false, true, false,
               false, true, false, false, true, false, false, false];
  } else {
    // Default to son clave
    pattern = [true, false, false, true, false, false, true, false,
               false, false, true, false, true, false, false, false];
  }

  let events = [];
  let pos = 0 / 1;
  for (hit in pattern) {
    if (hit) {
      events[events.length] = {
        type: "drumHit",
        start: pos,
        dur: stepDur,
        key: "clave",
        velocity: 0.9
      };
    }
    pos = pos + stepDur;
  }
  return { events: events, length: pos };
}

// accent - create accent pattern
export fn accent(pattern, strongVel, weakVel) {
  let strong = strongVel;
  let weak = weakVel;
  if (strong == null) {
    strong = 1.0;
  }
  if (weak == null) {
    weak = 0.6;
  }

  let velocities = [];
  for (isStrong in pattern) {
    if (isStrong) {
      velocities[velocities.length] = strong;
    } else {
      velocities[velocities.length] = weak;
    }
  }
  return velocities;
}

// ============================================================================
// Extended Polyrhythm Functions
// ============================================================================

// polyrhythmPitched - create polyrhythm with customizable pitches
// a: number of beats in first voice
// pitchesA: array of pitches for first voice (cycled if shorter than a)
// b: number of beats in second voice
// pitchesB: array of pitches for second voice (cycled if shorter than b)
// totalDur: total duration for the polyrhythm
export fn polyrhythmPitched(a, pitchesA, b, pitchesB, totalDur) {
  const durA = totalDur / a;
  const durB = totalDur / b;

  let events = [];

  // First voice
  for (i in 0..(a - 1)) {
    const pitchIdx = i % pitchesA.length;
    events[events.length] = {
      type: "note",
      start: durA * i,
      dur: durA,
      pitch: pitchesA[pitchIdx],
      velocity: 0.8,
      voice: 0
    };
  }

  // Second voice
  for (i in 0..(b - 1)) {
    const pitchIdx = i % pitchesB.length;
    events[events.length] = {
      type: "note",
      start: durB * i,
      dur: durB,
      pitch: pitchesB[pitchIdx],
      velocity: 0.7,
      voice: 1
    };
  }

  return { events: events, length: totalDur };
}

// polyrhythmDrums - create drum polyrhythm
// a: number of hits for first drum
// keyA: drum key for first voice (e.g., kick)
// b: number of hits for second drum
// keyB: drum key for second voice (e.g., snare)
// totalDur: total duration
export fn polyrhythmDrums(a, keyA, b, keyB, totalDur) {
  const durA = totalDur / a;
  const durB = totalDur / b;

  let events = [];

  // First voice
  for (i in 0..(a - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: durA * i,
      dur: durA,
      key: keyA,
      velocity: 0.85
    };
  }

  // Second voice
  for (i in 0..(b - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: durB * i,
      dur: durB,
      key: keyB,
      velocity: 0.75
    };
  }

  return { events: events, length: totalDur };
}

// ============================================================================
// Metric Modulation
// ============================================================================

// metricModulation - transform clip durations for metric modulation
// This function scales all durations in a clip based on a pivot note value
// c: input clip
// fromUnit: the original unit duration (e.g., q for quarter note)
// toUnit: the new unit duration (e.g., e. for dotted eighth)
// returns: clip with all durations scaled by (fromUnit / toUnit)
export fn metricModulation(c, fromUnit, toUnit) {
  // Calculate the ratio: how much to scale durations
  // If fromUnit = q (1/4) and toUnit = e. (3/16)
  // ratio = (1/4) / (3/16) = 4/3
  // All durations multiplied by this ratio
  const ratio = fromUnit / toUnit;

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      events[events.length] = {
        type: "note",
        start: ev.start * ratio,
        dur: ev.dur * ratio,
        pitch: ev.pitch,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        lyric: ev.lyric,
        ext: ev.ext
      };
    } else if (ev.type == "chord") {
      events[events.length] = {
        type: "chord",
        start: ev.start * ratio,
        dur: ev.dur * ratio,
        pitches: ev.pitches,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else if (ev.type == "drumHit") {
      events[events.length] = {
        type: "drumHit",
        start: ev.start * ratio,
        dur: ev.dur * ratio,
        key: ev.key,
        velocity: ev.velocity,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else if (ev.type == "rest") {
      events[events.length] = {
        type: "rest",
        start: ev.start * ratio,
        dur: ev.dur * ratio
      };
    } else {
      // For other event types, try to scale if they have start/dur
      let newEv = ev;
      if (ev.start != null) {
        newEv.start = ev.start * ratio;
      }
      if (ev.dur != null) {
        newEv.dur = ev.dur * ratio;
      }
      events[events.length] = newEv;
    }
  }

  let newLength = c.length;
  if (newLength != null) {
    newLength = newLength * ratio;
  }

  return { events: events, length: newLength };
}

// ============================================================================
// Isorhythm
// ============================================================================

// isorhythm - create isorhythmic pattern from talea (rhythm) and color (pitch)
// talea: array of durations (the rhythmic pattern)
// color: array of pitches (the melodic pattern)
// The talea and color cycle independently, creating phase relationships
// numNotes: total number of notes to generate (default: LCM of lengths)
export fn isorhythm(talea, color, numNotes) {
  let total = numNotes;
  if (total == null) {
    // Default to enough notes for both patterns to realign
    // Using a simple approximation: talea.length * color.length
    total = talea.length * color.length;
  }

  let events = [];
  let pos = 0 / 1;

  for (i in 0..(total - 1)) {
    const taleaIdx = i % talea.length;
    const colorIdx = i % color.length;

    const dur = talea[taleaIdx];
    const pitch = color[colorIdx];

    events[events.length] = {
      type: "note",
      start: pos,
      dur: dur,
      pitch: pitch,
      velocity: 0.75
    };

    pos = pos + dur;
  }

  return { events: events, length: pos };
}

// isorhythmWithVelocity - isorhythm with additional velocity cycle
// talea: array of durations
// color: array of pitches
// velocities: array of velocities
// numNotes: total number of notes
export fn isorhythmWithVelocity(talea, color, velocities, numNotes) {
  let total = numNotes;
  if (total == null) {
    total = talea.length * color.length;
  }

  let events = [];
  let pos = 0 / 1;

  for (i in 0..(total - 1)) {
    const taleaIdx = i % talea.length;
    const colorIdx = i % color.length;
    const velIdx = i % velocities.length;

    events[events.length] = {
      type: "note",
      start: pos,
      dur: talea[taleaIdx],
      pitch: color[colorIdx],
      velocity: velocities[velIdx]
    };

    pos = pos + talea[taleaIdx];
  }

  return { events: events, length: pos };
}

// ============================================================================
// Additive Rhythm
// ============================================================================

// additiveRhythm - create rhythm from additive groupings
// groups: array of beat counts (e.g., [3, 2, 2] for Bulgarian rhythm)
// baseUnit: duration of one unit
// pitch: pitch to use (or array of pitches)
export fn additiveRhythm(groups, baseUnit, pitch) {
  let events = [];
  let pos = 0 / 1;

  for (group in groups) {
    const dur = baseUnit * group;

    if (pitch.length != null) {
      // Array of pitches - use one per group (cycled)
      const pIdx = events.length % pitch.length;
      events[events.length] = {
        type: "note",
        start: pos,
        dur: dur,
        pitch: pitch[pIdx],
        velocity: 0.8
      };
    } else {
      events[events.length] = {
        type: "note",
        start: pos,
        dur: dur,
        pitch: pitch,
        velocity: 0.8
      };
    }

    pos = pos + dur;
  }

  return { events: events, length: pos };
}

// additiveRhythmDrums - additive rhythm for drums
// groups: array of beat counts
// baseUnit: duration of one unit
// key: drum key
export fn additiveRhythmDrums(groups, baseUnit, key) {
  let events = [];
  let pos = 0 / 1;

  for (group in groups) {
    const dur = baseUnit * group;

    events[events.length] = {
      type: "drumHit",
      start: pos,
      dur: baseUnit,  // Drum hit uses base unit, not full group
      key: key,
      velocity: 0.85
    };

    pos = pos + dur;
  }

  return { events: events, length: pos };
}

// ============================================================================
// Common Additive Rhythm Presets
// ============================================================================

// Bulgarian rhythms
export fn aksak7(baseUnit, pitch) {
  return additiveRhythm([2, 2, 3], baseUnit, pitch);  // 7/8
}

export fn aksak9(baseUnit, pitch) {
  return additiveRhythm([2, 2, 2, 3], baseUnit, pitch);  // 9/8
}

export fn aksak11(baseUnit, pitch) {
  return additiveRhythm([2, 2, 3, 2, 2], baseUnit, pitch);  // 11/8
}

// African bell patterns
export fn bellPattern12(baseUnit, key) {
  // Standard 12/8 bell pattern
  return euclideanClip(7, 12, baseUnit, key, 0.9, 0);
}

// ============================================================================
// Phasing / Phase Shift
// ============================================================================

// phaseShift - create two clips with gradual phase offset
// c: original clip
// shiftPerRepeat: amount to shift the second voice each repeat
// numRepeats: number of repetitions
export fn phaseShift(c, shiftPerRepeat, numRepeats) {
  let events = [];
  let totalLength = 0 / 1;

  for (rep in 0..(numRepeats - 1)) {
    const baseOffset = c.length * rep;
    const phaseOffset = shiftPerRepeat * rep;

    // First voice (original timing)
    for (ev in c.events) {
      if (ev.type == "note") {
        events[events.length] = {
          type: "note",
          start: ev.start + baseOffset,
          dur: ev.dur,
          pitch: ev.pitch,
          velocity: ev.velocity,
          voice: 0
        };
      } else if (ev.type == "drumHit") {
        events[events.length] = {
          type: "drumHit",
          start: ev.start + baseOffset,
          dur: ev.dur,
          key: ev.key,
          velocity: ev.velocity
        };
      }
    }

    // Second voice (with phase offset)
    for (ev in c.events) {
      if (ev.type == "note") {
        events[events.length] = {
          type: "note",
          start: ev.start + baseOffset + phaseOffset,
          dur: ev.dur,
          pitch: ev.pitch,
          velocity: ev.velocity * 0.85,  // Slightly softer
          voice: 1
        };
      } else if (ev.type == "drumHit") {
        events[events.length] = {
          type: "drumHit",
          start: ev.start + baseOffset + phaseOffset,
          dur: ev.dur,
          key: ev.key,
          velocity: ev.velocity * 0.85
        };
      }
    }

    totalLength = baseOffset + c.length;
  }

  return { events: events, length: totalLength };
}

// ============================================================================
// Rhythmic Transformation
// ============================================================================

// retrograde - reverse the order of events in a clip
export fn retrograde(c) {
  if (c.events.length == 0) {
    return c;
  }

  let events = [];
  const clipLength = c.length;

  for (i in 0..(c.events.length - 1)) {
    const ev = c.events[c.events.length - 1 - i];

    if (ev.type == "note") {
      // Calculate new start: clipLength - (original_start + dur)
      const newStart = clipLength - ev.start - ev.dur;
      events[events.length] = {
        type: "note",
        start: newStart,
        dur: ev.dur,
        pitch: ev.pitch,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        lyric: ev.lyric,
        ext: ev.ext
      };
    } else if (ev.type == "chord") {
      const newStart = clipLength - ev.start - ev.dur;
      events[events.length] = {
        type: "chord",
        start: newStart,
        dur: ev.dur,
        pitches: ev.pitches,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else if (ev.type == "drumHit") {
      const newStart = clipLength - ev.start - ev.dur;
      events[events.length] = {
        type: "drumHit",
        start: newStart,
        dur: ev.dur,
        key: ev.key,
        velocity: ev.velocity,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: clipLength };
}

// augmentation - double all durations
export fn augmentation(c) {
  return metricModulation(c, 1 / 1, 1 / 2);
}

// diminution - halve all durations
export fn diminution(c) {
  return metricModulation(c, 1 / 1, 2 / 1);
}

// scaleRhythm - scale all durations by a factor
// c: input clip
// factor: multiplication factor (2 = twice as long, 0.5 = half as long)
export fn scaleRhythm(c, factor) {
  return metricModulation(c, 1 / 1, 1 / factor);
}

// ============================================================================
// Swing and Feel Utilities
// ============================================================================

// swingClip - apply swing feel to a clip
// c: input clip
// swingAmount: 0.0 = straight, 0.5 = triplet swing, 1.0 = extreme swing
// gridSize: the grid to apply swing to (default: eighth note)
export fn swingClip(c, swingAmount, gridSize) {
  let grid = gridSize;
  if (grid == null) {
    grid = 1 / 8;
  }

  let amount = swingAmount;
  if (amount == null) {
    amount = 0.33;  // Default triplet-ish swing
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      const start = ev.start;
      if (start != null && start.n != null) {
        // Calculate position in grid units
        const gridPos = start / grid;
        const beatPos = gridPos - (gridPos - (gridPos % 1));  // Floor

        // Check if this is an "off-beat" position (odd grid positions)
        const isOffBeat = (beatPos % 2) == 1;

        let newStart = start;
        if (isOffBeat) {
          // Delay the off-beat by the swing amount
          newStart = start + (grid * amount);
        }

        if (ev.type == "note") {
          events[events.length] = {
            type: "note",
            start: newStart,
            dur: ev.dur,
            pitch: ev.pitch,
            velocity: ev.velocity,
            voice: ev.voice,
            techniques: ev.techniques,
            lyric: ev.lyric,
            ext: ev.ext
          };
        } else if (ev.type == "chord") {
          events[events.length] = {
            type: "chord",
            start: newStart,
            dur: ev.dur,
            pitches: ev.pitches,
            velocity: ev.velocity,
            voice: ev.voice,
            techniques: ev.techniques,
            ext: ev.ext
          };
        } else if (ev.type == "drumHit") {
          events[events.length] = {
            type: "drumHit",
            start: newStart,
            dur: ev.dur,
            key: ev.key,
            velocity: ev.velocity,
            techniques: ev.techniques,
            ext: ev.ext
          };
        }
      } else {
        events[events.length] = ev;
      }
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: c.length };
}

// humanize - add slight random timing and velocity variations
// c: input clip
// timingVariation: max timing offset in beats (e.g., 1/64)
// velocityVariation: max velocity offset (e.g., 0.1)
// seed: random seed for reproducibility
export fn humanize(c, timingVariation, velocityVariation, seed) {
  let tVar = timingVariation;
  if (tVar == null) {
    tVar = 1 / 64;
  }

  let vVar = velocityVariation;
  if (vVar == null) {
    vVar = 0.1;
  }

  // Simple LCG random
  let state = seed;
  if (state == null) {
    state = 12345;
  }

  fn nextRandom() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  }

  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit") {
      // Generate random offsets
      const tOffset = (nextRandom() - 0.5) * 2 * tVar;
      const vOffset = (nextRandom() - 0.5) * 2 * vVar;

      let newVel = (ev.velocity ?? 0.75) + vOffset;
      if (newVel < 0.1) {
        newVel = 0.1;
      }
      if (newVel > 1.0) {
        newVel = 1.0;
      }

      let newStart = ev.start + tOffset;
      if (newStart < 0 / 1) {
        newStart = 0 / 1;
      }

      if (ev.type == "note") {
        events[events.length] = {
          type: "note",
          start: newStart,
          dur: ev.dur,
          pitch: ev.pitch,
          velocity: newVel,
          voice: ev.voice,
          techniques: ev.techniques,
          lyric: ev.lyric,
          ext: ev.ext
        };
      } else if (ev.type == "chord") {
        events[events.length] = {
          type: "chord",
          start: newStart,
          dur: ev.dur,
          pitches: ev.pitches,
          velocity: newVel,
          voice: ev.voice,
          techniques: ev.techniques,
          ext: ev.ext
        };
      } else if (ev.type == "drumHit") {
        events[events.length] = {
          type: "drumHit",
          start: newStart,
          dur: ev.dur,
          key: ev.key,
          velocity: newVel,
          techniques: ev.techniques,
          ext: ev.ext
        };
      }
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: c.length };
}
`;

export const STDLIB_ROUTING = `// std:routing (v5.2)
// Audio/MIDI routing and signal flow utilities
// For defining instrument assignments, bus routing, and signal chains

// ============================================
// Channel and Bus Definitions
// ============================================

// Create a channel with properties
export fn channel(name, properties) {
  let props = properties;
  if (props == null) {
    props = {};
  }
  return {
    type: "channel",
    name: name,
    volume: props.volume,
    pan: props.pan,
    mute: props.mute,
    solo: props.solo,
    sends: props.sends,
    inserts: props.inserts,
    output: props.output
  };
}

// Create an audio bus
export fn bus(name, properties) {
  let props = properties;
  if (props == null) {
    props = {};
  }
  return {
    type: "bus",
    name: name,
    volume: props.volume,
    pan: props.pan,
    mute: props.mute,
    inserts: props.inserts,
    output: props.output
  };
}

// Create master bus
export fn master(properties) {
  return bus("master", properties);
}

// ============================================
// Standard Bus Configurations
// ============================================

// Create a reverb send bus
export fn reverbBus(name, reverbType, wetLevel) {
  let wet = wetLevel;
  if (wet == null) {
    wet = 0.3;
  }
  return {
    type: "bus",
    name: name,
    effect: "reverb",
    effectType: reverbType,
    wet: wet,
    output: "master"
  };
}

// Create a delay send bus
export fn delayBus(name, delayTime, feedback, wetLevel) {
  let wet = wetLevel;
  if (wet == null) {
    wet = 0.25;
  }
  return {
    type: "bus",
    name: name,
    effect: "delay",
    delayTime: delayTime,
    feedback: feedback,
    wet: wet,
    output: "master"
  };
}

// Create a submix bus for grouping
export fn submixBus(name, channels) {
  return {
    type: "bus",
    name: name,
    inputs: channels,
    output: "master"
  };
}

// ============================================
// Send Routing
// ============================================

// Create a send to a bus
export fn send(busName, level, preFader) {
  let pre = preFader;
  if (pre == null) {
    pre = false;
  }
  return {
    type: "send",
    bus: busName,
    level: level,
    preFader: pre
  };
}

// Create multiple sends
export fn sends(sendList) {
  return {
    type: "sends",
    list: sendList
  };
}

// ============================================
// Insert Effects
// ============================================

// Create an insert effect slot
export fn insert(effectName, parameters) {
  let params = parameters;
  if (params == null) {
    params = {};
  }
  return {
    type: "insert",
    effect: effectName,
    parameters: params,
    bypass: false
  };
}

// Create insert chain
export fn insertChain(inserts) {
  return {
    type: "insertChain",
    inserts: inserts
  };
}

// Common insert effects

export fn compressor(threshold, ratio, attack, release) {
  return insert("compressor", {
    threshold: threshold,
    ratio: ratio,
    attack: attack,
    release: release
  });
}

export fn eq(bands) {
  return insert("eq", { bands: bands });
}

export fn eqBand(freq, gain, q) {
  return {
    frequency: freq,
    gain: gain,
    q: q
  };
}

export fn limiter(threshold, release) {
  return insert("limiter", {
    threshold: threshold,
    release: release
  });
}

export fn gate(threshold, attack, hold, release) {
  return insert("gate", {
    threshold: threshold,
    attack: attack,
    hold: hold,
    release: release
  });
}

export fn saturator(drive, mix) {
  return insert("saturator", {
    drive: drive,
    mix: mix
  });
}

// ============================================
// MIDI Routing
// ============================================

// Create MIDI channel assignment
export fn midiChannel(number) {
  if (number < 1) { return 1; }
  if (number > 16) { return 16; }
  return number;
}

// Create MIDI port assignment
export fn midiPort(name, channel) {
  return {
    type: "midiPort",
    name: name,
    channel: channel
  };
}

// Create MIDI routing rule
export fn midiRoute(fromChannel, toChannel, transform) {
  return {
    type: "midiRoute",
    from: fromChannel,
    to: toChannel,
    transform: transform
  };
}

// MIDI transformations

export fn transpose(semitones) {
  return {
    type: "transpose",
    semitones: semitones
  };
}

export fn velocityScale(factor) {
  return {
    type: "velocityScale",
    factor: factor
  };
}

export fn velocityOffset(offset) {
  return {
    type: "velocityOffset",
    offset: offset
  };
}

export fn channelFilter(allowedChannels) {
  return {
    type: "channelFilter",
    channels: allowedChannels
  };
}

export fn noteFilter(lowNote, highNote) {
  return {
    type: "noteFilter",
    low: lowNote,
    high: highNote
  };
}

// ============================================
// Instrument Routing
// ============================================

// Assign voice to instrument/channel
export fn assignVoice(voiceName, channel, properties) {
  let props = properties;
  if (props == null) {
    props = {};
  }
  return {
    type: "voiceAssignment",
    voice: voiceName,
    channel: channel,
    instrument: props.instrument,
    midiChannel: props.midiChannel,
    volume: props.volume,
    pan: props.pan
  };
}

// Create voice group (multiple voices to same output)
export fn voiceGroup(voices, output) {
  return {
    type: "voiceGroup",
    voices: voices,
    output: output
  };
}

// Layer multiple instruments on same voice
export fn layer(instruments) {
  return {
    type: "layer",
    instruments: instruments
  };
}

// Split keyboard across instruments
export fn split(splitPoint, lowInstrument, highInstrument) {
  return {
    type: "split",
    splitPoint: splitPoint,
    low: lowInstrument,
    high: highInstrument
  };
}

// ============================================
// Routing Configurations
// ============================================

// Create a complete routing configuration
export fn routingConfig(channels, buses, assignments) {
  return {
    type: "routingConfig",
    channels: channels,
    buses: buses,
    assignments: assignments
  };
}

// Standard orchestral routing template
export fn orchestralRouting() {
  return routingConfig(
    [
      channel("strings", { pan: 0, sends: [send("hallReverb", 0.4)] }),
      channel("woodwinds", { pan: -0.2, sends: [send("hallReverb", 0.35)] }),
      channel("brass", { pan: 0.2, sends: [send("hallReverb", 0.3)] }),
      channel("percussion", { pan: 0, sends: [send("hallReverb", 0.25)] })
    ],
    [
      reverbBus("hallReverb", "hall", 0.4),
      master({ inserts: [limiter(-0.3, 100)] })
    ],
    [
      assignVoice("violin1", "strings", { pan: -0.6 }),
      assignVoice("violin2", "strings", { pan: -0.3 }),
      assignVoice("viola", "strings", { pan: 0.2 }),
      assignVoice("cello", "strings", { pan: 0.5 }),
      assignVoice("bass", "strings", { pan: 0.4 }),
      assignVoice("flute", "woodwinds", { pan: -0.4 }),
      assignVoice("oboe", "woodwinds", { pan: -0.2 }),
      assignVoice("clarinet", "woodwinds", { pan: 0.1 }),
      assignVoice("bassoon", "woodwinds", { pan: 0.3 }),
      assignVoice("horn", "brass", { pan: -0.3 }),
      assignVoice("trumpet", "brass", { pan: 0.1 }),
      assignVoice("trombone", "brass", { pan: 0.3 }),
      assignVoice("tuba", "brass", { pan: 0.4 }),
      assignVoice("timpani", "percussion", { pan: 0 }),
      assignVoice("cymbals", "percussion", { pan: 0.2 })
    ]
  );
}

// Standard band routing template
export fn bandRouting() {
  return routingConfig(
    [
      channel("drums", { pan: 0, inserts: [compressor(-18, 4, 10, 100)] }),
      channel("bass", { pan: 0, inserts: [compressor(-12, 3, 20, 150)] }),
      channel("guitars", { pan: 0, sends: [send("roomReverb", 0.15)] }),
      channel("keys", { pan: 0, sends: [send("roomReverb", 0.2)] }),
      channel("vocals", { pan: 0, sends: [send("plateReverb", 0.25), send("delay", 0.15)] })
    ],
    [
      reverbBus("roomReverb", "room", 0.25),
      reverbBus("plateReverb", "plate", 0.3),
      delayBus("delay", 0.25, 0.3, 0.2),
      master({ inserts: [limiter(-0.5, 80)] })
    ],
    [
      assignVoice("kick", "drums", { pan: 0 }),
      assignVoice("snare", "drums", { pan: 0 }),
      assignVoice("hihat", "drums", { pan: 0.3 }),
      assignVoice("toms", "drums", { pan: 0 }),
      assignVoice("bass", "bass", { pan: 0 }),
      assignVoice("guitar1", "guitars", { pan: -0.4 }),
      assignVoice("guitar2", "guitars", { pan: 0.4 }),
      assignVoice("piano", "keys", { pan: -0.2 }),
      assignVoice("synth", "keys", { pan: 0.2 }),
      assignVoice("lead", "vocals", { pan: 0 }),
      assignVoice("backing", "vocals", { pan: 0 })
    ]
  );
}

// Electronic music routing template
export fn electronicRouting() {
  return routingConfig(
    [
      channel("drums", { pan: 0, inserts: [compressor(-15, 4, 5, 50)] }),
      channel("bass", { pan: 0, inserts: [saturator(0.3, 0.5)] }),
      channel("synths", { pan: 0, sends: [send("reverb", 0.2), send("delay", 0.25)] }),
      channel("fx", { pan: 0, sends: [send("reverb", 0.4)] })
    ],
    [
      reverbBus("reverb", "hall", 0.35),
      delayBus("delay", 0.375, 0.4, 0.3),  // Dotted eighth
      master({ inserts: [compressor(-6, 2, 30, 200), limiter(-0.3, 50)] })
    ],
    []
  );
}

// ============================================
// Sidechain Routing
// ============================================

// Create sidechain input
export fn sidechain(sourceChannel, parameters) {
  let params = parameters;
  if (params == null) {
    params = {};
  }
  return {
    type: "sidechain",
    source: sourceChannel,
    threshold: params.threshold,
    ratio: params.ratio,
    attack: params.attack,
    release: params.release
  };
}

// Sidechain compressor preset for pumping effect
export fn pumpingCompressor(sourceChannel) {
  return {
    type: "insert",
    effect: "compressor",
    parameters: {
      threshold: -30,
      ratio: 8,
      attack: 1,
      release: 150
    },
    sidechain: sourceChannel
  };
}

// ============================================
// Automation Lanes
// ============================================

// Create automation lane
export fn automationLane(channelName, parameter) {
  return {
    type: "automationLane",
    channel: channelName,
    parameter: parameter,
    points: []
  };
}

// Add automation point
export fn automationPoint(lane, time, value) {
  let newLane = {
    type: lane.type,
    channel: lane.channel,
    parameter: lane.parameter,
    points: []
  };

  for (p in lane.points) {
    newLane.points[newLane.points.length] = p;
  }

  newLane.points[newLane.points.length] = {
    time: time,
    value: value
  };

  return newLane;
}

// Common automation parameters
export const VOLUME = "volume";
export const PAN = "pan";
export const MUTE = "mute";
export const SEND_LEVEL = "sendLevel";
export const INSERT_BYPASS = "insertBypass";

// ============================================
// Monitoring
// ============================================

// Create monitor mix
export fn monitorMix(name, channelLevels) {
  return {
    type: "monitorMix",
    name: name,
    levels: channelLevels
  };
}

// Create headphone cue mix
export fn cueMix(name, channelLevels, clickLevel) {
  return {
    type: "cueMix",
    name: name,
    levels: channelLevels,
    click: clickLevel
  };
}

// ============================================
// I/O Configuration
// ============================================

// Define audio input
export fn audioInput(name, channels) {
  return {
    type: "audioInput",
    name: name,
    channels: channels
  };
}

// Define audio output
export fn audioOutput(name, channels) {
  return {
    type: "audioOutput",
    name: name,
    channels: channels
  };
}

// Stereo I/O presets
export fn stereoInput(name) {
  return audioInput(name, 2);
}

export fn stereoOutput(name) {
  return audioOutput(name, 2);
}

// Surround configurations
export fn surroundOutput51() {
  return audioOutput("surround51", 6);  // L, R, C, LFE, Ls, Rs
}

export fn surroundOutput71() {
  return audioOutput("surround71", 8);  // L, R, C, LFE, Ls, Rs, Lb, Rb
}

// ============================================
// Utility Functions
// ============================================

// Get channel by name from config
export fn getChannel(config, name) {
  for (ch in config.channels) {
    if (ch.name == name) {
      return ch;
    }
  }
  return null;
}

// Get bus by name from config
export fn getBus(config, name) {
  for (b in config.buses) {
    if (b.name == name) {
      return b;
    }
  }
  return null;
}

// Get voice assignment
export fn getVoiceAssignment(config, voiceName) {
  for (a in config.assignments) {
    if (a.voice == voiceName) {
      return a;
    }
  }
  return null;
}

// Update channel property
export fn setChannelVolume(config, channelName, volume) {
  let newConfig = {
    type: config.type,
    channels: [],
    buses: config.buses,
    assignments: config.assignments
  };

  for (ch in config.channels) {
    if (ch.name == channelName) {
      newConfig.channels[newConfig.channels.length] = {
        type: ch.type,
        name: ch.name,
        volume: volume,
        pan: ch.pan,
        mute: ch.mute,
        solo: ch.solo,
        sends: ch.sends,
        inserts: ch.inserts,
        output: ch.output
      };
    } else {
      newConfig.channels[newConfig.channels.length] = ch;
    }
  }

  return newConfig;
}

export fn setChannelPan(config, channelName, pan) {
  let newConfig = {
    type: config.type,
    channels: [],
    buses: config.buses,
    assignments: config.assignments
  };

  for (ch in config.channels) {
    if (ch.name == channelName) {
      newConfig.channels[newConfig.channels.length] = {
        type: ch.type,
        name: ch.name,
        volume: ch.volume,
        pan: pan,
        mute: ch.mute,
        solo: ch.solo,
        sends: ch.sends,
        inserts: ch.inserts,
        output: ch.output
      };
    } else {
      newConfig.channels[newConfig.channels.length] = ch;
    }
  }

  return newConfig;
}

// Mute/unmute channel
export fn muteChannel(config, channelName, muted) {
  let newConfig = {
    type: config.type,
    channels: [],
    buses: config.buses,
    assignments: config.assignments
  };

  for (ch in config.channels) {
    if (ch.name == channelName) {
      newConfig.channels[newConfig.channels.length] = {
        type: ch.type,
        name: ch.name,
        volume: ch.volume,
        pan: ch.pan,
        mute: muted,
        solo: ch.solo,
        sends: ch.sends,
        inserts: ch.inserts,
        output: ch.output
      };
    } else {
      newConfig.channels[newConfig.channels.length] = ch;
    }
  }

  return newConfig;
}

// Solo channel
export fn soloChannel(config, channelName, soloed) {
  let newConfig = {
    type: config.type,
    channels: [],
    buses: config.buses,
    assignments: config.assignments
  };

  for (ch in config.channels) {
    if (ch.name == channelName) {
      newConfig.channels[newConfig.channels.length] = {
        type: ch.type,
        name: ch.name,
        volume: ch.volume,
        pan: ch.pan,
        mute: ch.mute,
        solo: soloed,
        sends: ch.sends,
        inserts: ch.inserts,
        output: ch.output
      };
    } else {
      newConfig.channels[newConfig.channels.length] = ch;
    }
  }

  return newConfig;
}
`;

export const STDLIB_SERIAL = `// std:serial (v5.1)
// Serialism: twelve-tone technique, tone rows, matrix operations, set theory

import core;

// ============================================
// Tone Row Creation
// ============================================

// Create a twelve-tone row from pitch classes (0-11)
// Validates that all 12 pitch classes are present exactly once
export fn toneRow(pitchClasses) {
  // Validate that we have exactly 12 pitch classes
  if (pitchClasses.length != 12) {
    return null;  // Invalid row
  }

  // Check for unique pitch classes
  let used = [];
  for (i in 0..11) {
    used[i] = false;
  }

  for (pc in pitchClasses) {
    let normalizedPc = pc % 12;
    if (normalizedPc < 0) {
      normalizedPc = normalizedPc + 12;
    }
    if (used[normalizedPc]) {
      return null;  // Duplicate pitch class
    }
    used[normalizedPc] = true;
  }

  return {
    type: "toneRow",
    pitchClasses: pitchClasses
  };
}

// Create a random twelve-tone row (seeded for reproducibility)
export fn randomToneRow(seed) {
  let pcs = [];
  for (i in 0..11) {
    pcs[i] = i;
  }

  // Fisher-Yates shuffle with LCG
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  for (i in 0..10) {
    let idx = 11 - i;
    rng = (rng * 1103515245 + 12345) % 2147483648;
    let swapIdx = (rng / 2147483648) * (idx + 1);
    let j = core.floor(swapIdx);

    // Swap
    let temp = pcs[idx];
    pcs[idx] = pcs[j];
    pcs[j] = temp;
  }

  return toneRow(pcs);
}

// ============================================
// Row Transformations (Prime, Retrograde, Inversion, RI)
// ============================================

// Get prime form (original row)
export fn prime(row, transposition) {
  let trans = transposition;
  if (trans == null) {
    trans = 0;
  }

  let result = [];
  for (pc in row.pitchClasses) {
    result[result.length] = (pc + trans) % 12;
  }

  return {
    type: "rowForm",
    form: "P",
    transposition: trans,
    pitchClasses: result
  };
}

// Get retrograde (reversed row)
export fn retrograde(row, transposition) {
  let trans = transposition;
  if (trans == null) {
    trans = 0;
  }

  let result = [];
  for (i in 0..(row.pitchClasses.length - 1)) {
    let idx = row.pitchClasses.length - 1 - i;
    result[result.length] = (row.pitchClasses[idx] + trans) % 12;
  }

  return {
    type: "rowForm",
    form: "R",
    transposition: trans,
    pitchClasses: result
  };
}

// Get inversion (intervallic mirror)
export fn inversion(row, transposition) {
  let trans = transposition;
  if (trans == null) {
    trans = 0;
  }

  let result = [];
  let first = row.pitchClasses[0];

  for (pc in row.pitchClasses) {
    let interval = pc - first;
    let inverted = (first - interval + trans + 24) % 12;
    result[result.length] = inverted;
  }

  return {
    type: "rowForm",
    form: "I",
    transposition: trans,
    pitchClasses: result
  };
}

// Get retrograde inversion
export fn retrogradeInversion(row, transposition) {
  let inv = inversion(row, transposition);
  let result = [];

  for (i in 0..(inv.pitchClasses.length - 1)) {
    let idx = inv.pitchClasses.length - 1 - i;
    result[result.length] = inv.pitchClasses[idx];
  }

  return {
    type: "rowForm",
    form: "RI",
    transposition: transposition,
    pitchClasses: result
  };
}

// Short aliases
export fn P(row, n) { return prime(row, n); }
export fn R(row, n) { return retrograde(row, n); }
export fn I(row, n) { return inversion(row, n); }
export fn RI(row, n) { return retrogradeInversion(row, n); }

// ============================================
// Twelve-Tone Matrix
// ============================================

// Generate the complete 12x12 matrix
export fn matrix(row) {
  let result = [];

  // First column is the inversion of the row
  let inversionPcs = [];
  let first = row.pitchClasses[0];
  for (pc in row.pitchClasses) {
    inversionPcs[inversionPcs.length] = (first - (pc - first) + 12) % 12;
  }

  // Generate each row: transpose prime by inversion amount
  for (i in 0..11) {
    let trans = inversionPcs[i];
    let matrixRow = [];
    for (pc in row.pitchClasses) {
      matrixRow[matrixRow.length] = (pc + trans - first + 12) % 12;
    }
    result[result.length] = matrixRow;
  }

  return {
    type: "matrix",
    rows: result,
    originalRow: row
  };
}

// Get a specific row form from the matrix
export fn getRowForm(mat, form, index) {
  let idx = index % 12;
  if (idx < 0) {
    idx = idx + 12;
  }

  if (form == "P") {
    return {
      type: "rowForm",
      form: "P",
      transposition: idx,
      pitchClasses: mat.rows[idx]
    };
  }

  if (form == "R") {
    let reversed = [];
    for (i in 0..11) {
      reversed[reversed.length] = mat.rows[idx][11 - i];
    }
    return {
      type: "rowForm",
      form: "R",
      transposition: idx,
      pitchClasses: reversed
    };
  }

  if (form == "I") {
    let col = [];
    for (i in 0..11) {
      col[col.length] = mat.rows[i][idx];
    }
    return {
      type: "rowForm",
      form: "I",
      transposition: idx,
      pitchClasses: col
    };
  }

  if (form == "RI") {
    let col = [];
    for (i in 0..11) {
      col[col.length] = mat.rows[11 - i][idx];
    }
    return {
      type: "rowForm",
      form: "RI",
      transposition: idx,
      pitchClasses: col
    };
  }

  return null;
}

// ============================================
// Row Segmentation
// ============================================

// Split row into segments (e.g., hexachords, tetrachords, trichords)
export fn segment(row, size) {
  let segments = [];
  let current = [];

  for (pc in row.pitchClasses) {
    current[current.length] = pc;
    if (current.length == size) {
      segments[segments.length] = current;
      current = [];
    }
  }

  if (current.length > 0) {
    segments[segments.length] = current;
  }

  return segments;
}

// Get hexachords (6-note segments)
export fn hexachords(row) {
  return segment(row, 6);
}

// Get tetrachords (4-note segments)
export fn tetrachords(row) {
  return segment(row, 4);
}

// Get trichords (3-note segments)
export fn trichords(row) {
  return segment(row, 3);
}

// ============================================
// Combinatoriality
// ============================================

// Check if two hexachords are complementary (form the aggregate)
export fn areComplementary(hex1, hex2) {
  if (hex1.length != 6 || hex2.length != 6) {
    return false;
  }

  let allPcs = [];
  for (pc in hex1) {
    allPcs[allPcs.length] = pc;
  }
  for (pc in hex2) {
    allPcs[allPcs.length] = pc;
  }

  // Check all 12 pitch classes present
  let used = [];
  for (i in 0..11) {
    used[i] = false;
  }

  for (pc in allPcs) {
    let normalizedPc = pc % 12;
    if (normalizedPc < 0) {
      normalizedPc = normalizedPc + 12;
    }
    used[normalizedPc] = true;
  }

  for (i in 0..11) {
    if (!used[i]) {
      return false;
    }
  }

  return true;
}

// Check I-combinatoriality: row's first hexachord + inversion's first hexachord = aggregate
export fn isICombinatorialAt(row, transposition) {
  let prime = P(row, 0);
  let inv = I(row, transposition);

  let hex1 = [];
  let hex2 = [];

  for (i in 0..5) {
    hex1[hex1.length] = prime.pitchClasses[i];
    hex2[hex2.length] = inv.pitchClasses[i];
  }

  return areComplementary(hex1, hex2);
}

// Find all I-combinatorial transpositions
export fn findICombinatorialTranspositions(row) {
  let result = [];
  for (t in 0..11) {
    if (isICombinatorialAt(row, t)) {
      result[result.length] = t;
    }
  }
  return result;
}

// Check P-combinatoriality
export fn isPCombinatorialAt(row, transposition) {
  let prime1 = P(row, 0);
  let prime2 = P(row, transposition);

  let hex1 = [];
  let hex2 = [];

  for (i in 0..5) {
    hex1[hex1.length] = prime1.pitchClasses[i];
    hex2[hex2.length] = prime2.pitchClasses[i];
  }

  return areComplementary(hex1, hex2);
}

// ============================================
// Pitch Class Set Theory
// ============================================

// Get normal form of a pitch class set
export fn normalForm(pcs) {
  if (pcs.length == 0) {
    return [];
  }

  // Normalize to 0-11
  let normalized = [];
  for (pc in pcs) {
    let n = pc % 12;
    if (n < 0) {
      n = n + 12;
    }
    // Add if not already present
    let found = false;
    for (existing in normalized) {
      if (existing == n) {
        found = true;
      }
    }
    if (!found) {
      normalized[normalized.length] = n;
    }
  }

  // Sort ascending
  for (i in 0..(normalized.length - 2)) {
    for (j in (i + 1)..(normalized.length - 1)) {
      if (normalized[i] > normalized[j]) {
        let temp = normalized[i];
        normalized[i] = normalized[j];
        normalized[j] = temp;
      }
    }
  }

  // Find rotation with smallest outer interval
  let n = normalized.length;
  if (n <= 1) {
    return normalized;
  }

  let bestRotation = normalized;
  let bestSpan = 12;

  for (rot in 0..(n - 1)) {
    let rotated = [];
    for (i in 0..(n - 1)) {
      rotated[rotated.length] = normalized[(i + rot) % n];
    }

    // Transpose to start at 0
    let first = rotated[0];
    let transposed = [];
    for (pc in rotated) {
      transposed[transposed.length] = (pc - first + 12) % 12;
    }

    // Calculate span (last - first, considering wrap)
    let last = transposed[n - 1];
    if (last < bestSpan) {
      bestSpan = last;
      bestRotation = transposed;
    } else if (last == bestSpan) {
      // Compare left-packed
      let isBetter = false;
      for (i in 1..(n - 2)) {
        if (transposed[i] < bestRotation[i]) {
          isBetter = true;
          break;
        } else if (transposed[i] > bestRotation[i]) {
          break;
        }
      }
      if (isBetter) {
        bestRotation = transposed;
      }
    }
  }

  return bestRotation;
}

// Get prime form (most compact normal form)
export fn primeForm(pcs) {
  let nf = normalForm(pcs);

  // Also check inversion
  let inverted = [];
  for (pc in pcs) {
    inverted[inverted.length] = (12 - pc) % 12;
  }
  let invertedNf = normalForm(inverted);

  // Compare and return smaller
  let n = nf.length;
  for (i in 0..(n - 1)) {
    if (nf[i] < invertedNf[i]) {
      return nf;
    } else if (nf[i] > invertedNf[i]) {
      return invertedNf;
    }
  }

  return nf;
}

// Get interval class vector
export fn intervalVector(pcs) {
  let vector = [0, 0, 0, 0, 0, 0];
  let n = pcs.length;

  for (i in 0..(n - 2)) {
    for (j in (i + 1)..(n - 1)) {
      let interval = (pcs[j] - pcs[i]) % 12;
      if (interval < 0) {
        interval = interval + 12;
      }
      if (interval > 6) {
        interval = 12 - interval;
      }
      if (interval > 0 && interval <= 6) {
        vector[interval - 1] = vector[interval - 1] + 1;
      }
    }
  }

  return vector;
}

// ============================================
// Row to Notes
// ============================================

// Convert pitch classes to MIDI pitches in a specific octave range
export fn rowToMidi(row, baseOctave, octaveRange) {
  let base = baseOctave;
  if (base == null) {
    base = 4;
  }
  let range = octaveRange;
  if (range == null) {
    range = 1;
  }

  let result = [];
  let baseMidi = base * 12;

  for (pc in row.pitchClasses) {
    let midi = baseMidi + pc;
    result[result.length] = midi;
  }

  return result;
}

// Convert row to notes with specified duration
export fn rowToNotes(row, dur, velocity, baseOctave) {
  let midiPitches = rowToMidi(row, baseOctave, 1);
  let v = velocity;
  if (v == null) {
    v = 0.8;
  }

  let notes = [];
  for (midi in midiPitches) {
    notes[notes.length] = {
      type: "note",
      pitch: midi,
      dur: dur,
      velocity: v
    };
  }

  return notes;
}

// ============================================
// Famous Rows
// ============================================

// Berg - Lyric Suite
export const BERG_LYRIC = toneRow([5, 4, 0, 9, 7, 2, 8, 1, 3, 6, 10, 11]);

// Schoenberg - Op. 23 No. 5 Waltz
export const SCHOENBERG_WALTZ = toneRow([0, 11, 7, 8, 3, 1, 2, 10, 6, 5, 4, 9]);

// Webern - Concerto Op. 24 (derived row)
export const WEBERN_CONCERTO = toneRow([11, 10, 2, 3, 7, 6, 8, 4, 5, 0, 1, 9]);

// Webern - Symphony Op. 21 (palindromic)
export const WEBERN_SYMPHONY = toneRow([9, 6, 8, 11, 10, 5, 4, 1, 2, 0, 3, 7]);

// Stravinsky - Movements
export const STRAVINSKY_MOVEMENTS = toneRow([8, 11, 5, 9, 3, 10, 1, 4, 6, 2, 0, 7]);

// Boulez - Structures Ia
export const BOULEZ_STRUCTURES = toneRow([3, 2, 9, 8, 7, 6, 4, 1, 0, 10, 5, 11]);

// Dallapiccola - Quaderno musicale di Annalibera
export const DALLAPICCOLA_QUADERNO = toneRow([10, 11, 3, 6, 8, 2, 7, 1, 5, 9, 0, 4]);

// ============================================
// Row Analysis
// ============================================

// Get all ordered intervals in the row
export fn intervals(row) {
  let result = [];
  for (i in 0..(row.pitchClasses.length - 2)) {
    let interval = row.pitchClasses[i + 1] - row.pitchClasses[i];
    if (interval < 0) {
      interval = interval + 12;
    }
    result[result.length] = interval;
  }
  return result;
}

// Check if row is all-interval (each interval 1-11 appears exactly once)
export fn isAllInterval(row) {
  let intv = intervals(row);
  if (intv.length != 11) {
    return false;
  }

  let counts = [];
  for (i in 0..11) {
    counts[i] = 0;
  }

  for (interval in intv) {
    let normalized = interval % 12;
    if (normalized < 0) {
      normalized = normalized + 12;
    }
    if (normalized == 0) {
      return false;  // No unisons in all-interval
    }
    counts[normalized] = counts[normalized] + 1;
  }

  for (i in 1..11) {
    if (counts[i] != 1) {
      return false;
    }
  }

  return true;
}

// Check if row is symmetric (palindrome)
export fn isSymmetric(row) {
  let n = row.pitchClasses.length;
  for (i in 0..(n / 2 - 1)) {
    if (row.pitchClasses[i] != row.pitchClasses[n - 1 - i]) {
      return false;
    }
  }
  return true;
}

// ============================================
// Total Serialism Helpers
// ============================================

// Create a series of durations (for total serialism)
export fn durationSeries(baseDur, ratios) {
  let result = [];
  for (r in ratios) {
    result[result.length] = baseDur * r;
  }
  return result;
}

// Create a series of dynamics (0-1 range)
export fn dynamicSeries(values) {
  let result = [];
  for (v in values) {
    let normalized = v;
    if (normalized < 0) {
      normalized = 0;
    }
    if (normalized > 1) {
      normalized = 1;
    }
    result[result.length] = normalized;
  }
  return result;
}

// Create attack point series (for rhythmic serialism)
export fn attackSeries(row, unit) {
  let u = unit;
  if (u == null) {
    u = 1 / 4;  // Quarter note default
  }

  let result = [];
  let pos = 0;

  for (pc in row.pitchClasses) {
    result[result.length] = pos;
    pos = pos + pc * u;
  }

  return result;
}

`;

export const STDLIB_SPATIAL = `// std:spatial (v5)
// Spatial audio, panning, and surround sound support

import core;
import curves;

// ============================================
// Pan Constants
// ============================================

export const PAN_LEFT = -1.0;
export const PAN_CENTER = 0.0;
export const PAN_RIGHT = 1.0;

// ============================================
// Basic Pan Automation
// ============================================

// Create pan automation event
export fn panAuto(start, end, fromPan, toPan) {
  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: curves.linear(fromPan, toPan)
  };
}

// Static pan position
export fn pan(start, end, value) {
  return panAuto(start, end, value, value);
}

// Pan left to right
export fn panLeftToRight(start, end) {
  return panAuto(start, end, PAN_LEFT, PAN_RIGHT);
}

// Pan right to left
export fn panRightToLeft(start, end) {
  return panAuto(start, end, PAN_RIGHT, PAN_LEFT);
}

// Pan center to left
export fn panToLeft(start, end) {
  return panAuto(start, end, PAN_CENTER, PAN_LEFT);
}

// Pan center to right
export fn panToRight(start, end) {
  return panAuto(start, end, PAN_CENTER, PAN_RIGHT);
}

// ============================================
// Pan Curves
// ============================================

// Pan with easing
export fn panEaseIn(start, end, fromPan, toPan) {
  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: curves.easeIn(fromPan, toPan)
  };
}

export fn panEaseOut(start, end, fromPan, toPan) {
  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: curves.easeOut(fromPan, toPan)
  };
}

export fn panEaseInOut(start, end, fromPan, toPan) {
  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: curves.easeInOut(fromPan, toPan)
  };
}

// Oscillating pan (LFO-like)
export fn panOscillate(start, end, center, width, cycles) {
  let points = [];
  const numPoints = cycles * 4 + 1;

  for (i in 0..(numPoints - 1)) {
    const t = i / (numPoints - 1);
    const phase = t * cycles * 2 * 3.14159;
    // Approximate sine
    let sine = 0;
    let x = phase;
    // Normalize to -pi to pi
    for (_ in 0..10) {
      if (x > 3.14159) {
        x = x - 6.28318;
      } else if (x < -3.14159) {
        x = x + 6.28318;
      } else {
        break;
      }
    }
    // Taylor series approximation for sin
    sine = x - (x * x * x) / 6 + (x * x * x * x * x) / 120;
    const v = center + width * sine;
    points[points.length] = { t: t, v: v };
  }

  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: { kind: "piecewiseLinear", points: points }
  };
}

// Random pan movement (wandering)
export fn panWander(start, end, center, maxDeviation, seed) {
  let points = [];
  const numPoints = 16;
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  for (i in 0..(numPoints - 1)) {
    const t = i / (numPoints - 1);
    // Simple LCG random
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const rand = (rng / 2147483648) * 2 - 1;  // -1 to 1
    let v = center + rand * maxDeviation;
    if (v < -1) { v = -1; }
    if (v > 1) { v = 1; }
    points[points.length] = { t: t, v: v };
  }

  return {
    type: "automation",
    param: "pan",
    start: start,
    end: end,
    curve: { kind: "piecewiseLinear", points: points }
  };
}

// ============================================
// Stereo Width
// ============================================

// Stereo width automation (0 = mono, 1 = full stereo, >1 = widened)
export fn widthAuto(start, end, fromWidth, toWidth) {
  return {
    type: "automation",
    param: "stereoWidth",
    start: start,
    end: end,
    curve: curves.linear(fromWidth, toWidth)
  };
}

// Narrow to mono
export fn toMono(start, end) {
  return widthAuto(start, end, 1.0, 0.0);
}

// Widen stereo
export fn widenStereo(start, end, targetWidth) {
  let width = targetWidth;
  if (width == null) {
    width = 1.5;
  }
  return widthAuto(start, end, 1.0, width);
}

// ============================================
// Distance/Depth
// ============================================

// Distance from listener (affects reverb, volume)
// 0 = very close, 1 = far away
export fn distanceAuto(start, end, fromDist, toDist) {
  return {
    type: "automation",
    param: "distance",
    start: start,
    end: end,
    curve: curves.linear(fromDist, toDist)
  };
}

// Move closer
export fn moveCloser(start, end) {
  return distanceAuto(start, end, 0.7, 0.2);
}

// Move away
export fn moveAway(start, end) {
  return distanceAuto(start, end, 0.3, 0.8);
}

// ============================================
// Surround Sound (5.1, 7.1, Atmos)
// ============================================

// Surround channel positions
export const SURROUND = {
  L: { x: -1.0, y: 1.0 },
  R: { x: 1.0, y: 1.0 },
  C: { x: 0.0, y: 1.0 },
  LFE: { x: 0.0, y: 0.0 },
  LS: { x: -1.0, y: -1.0 },
  RS: { x: 1.0, y: -1.0 },
  // 7.1 additional
  LB: { x: -0.7, y: -0.7 },
  RB: { x: 0.7, y: -0.7 }
};

// 2D position in surround field
// x: -1 (left) to 1 (right)
// y: -1 (rear) to 1 (front)
export fn surroundPos(start, end, fromX, fromY, toX, toY) {
  let events = [];

  events[events.length] = {
    type: "automation",
    param: "surroundX",
    start: start,
    end: end,
    curve: curves.linear(fromX, toX)
  };

  events[events.length] = {
    type: "automation",
    param: "surroundY",
    start: start,
    end: end,
    curve: curves.linear(fromY, toY)
  };

  return { events: events, length: end };
}

// Circular pan in surround field
export fn surroundCircle(start, end, radius, startAngle, revolutions) {
  let xPoints = [];
  let yPoints = [];
  const numPoints = 32;
  let startAng = startAngle;
  if (startAng == null) {
    startAng = 0;
  }
  let revs = revolutions;
  if (revs == null) {
    revs = 1;
  }

  for (i in 0..(numPoints - 1)) {
    const t = i / (numPoints - 1);
    const angle = startAng + t * revs * 6.28318;
    // Approximate cos/sin
    let cosVal = 1 - (angle * angle) / 2 + (angle * angle * angle * angle) / 24;
    let sinVal = angle - (angle * angle * angle) / 6 + (angle * angle * angle * angle * angle) / 120;
    xPoints[xPoints.length] = { t: t, v: radius * cosVal };
    yPoints[yPoints.length] = { t: t, v: radius * sinVal };
  }

  let events = [];
  events[events.length] = {
    type: "automation",
    param: "surroundX",
    start: start,
    end: end,
    curve: { kind: "piecewiseLinear", points: xPoints }
  };
  events[events.length] = {
    type: "automation",
    param: "surroundY",
    start: start,
    end: end,
    curve: { kind: "piecewiseLinear", points: yPoints }
  };

  return { events: events, length: end };
}

// ============================================
// Height (Atmos/Auro-3D)
// ============================================

// Height automation for 3D audio
// 0 = floor level, 1 = ceiling
export fn heightAuto(start, end, fromHeight, toHeight) {
  return {
    type: "automation",
    param: "height",
    start: start,
    end: end,
    curve: curves.linear(fromHeight, toHeight)
  };
}

// Rise up
export fn riseUp(start, end) {
  return heightAuto(start, end, 0.0, 1.0);
}

// Drop down
export fn dropDown(start, end) {
  return heightAuto(start, end, 1.0, 0.0);
}

// ============================================
// Ambisonics
// ============================================

// Ambisonic azimuth (horizontal angle) -180 to 180 degrees
export fn ambiAzimuth(start, end, fromAz, toAz) {
  return {
    type: "automation",
    param: "ambiAzimuth",
    start: start,
    end: end,
    curve: curves.linear(fromAz, toAz)
  };
}

// Ambisonic elevation -90 to 90 degrees
export fn ambiElevation(start, end, fromEl, toEl) {
  return {
    type: "automation",
    param: "ambiElevation",
    start: start,
    end: end,
    curve: curves.linear(fromEl, toEl)
  };
}

// Ambisonic distance
export fn ambiDistance(start, end, fromDist, toDist) {
  return {
    type: "automation",
    param: "ambiDistance",
    start: start,
    end: end,
    curve: curves.linear(fromDist, toDist)
  };
}

// Full 3D ambisonic position
export fn ambiPos(start, end, fromAz, fromEl, fromDist, toAz, toEl, toDist) {
  let events = [];
  events[events.length] = ambiAzimuth(start, end, fromAz, toAz);
  events[events.length] = ambiElevation(start, end, fromEl, toEl);
  events[events.length] = ambiDistance(start, end, fromDist, toDist);
  return { events: events, length: end };
}

// ============================================
// Spatial Presets
// ============================================

// Concert hall positioning (orchestra)
export fn orchestraPosition(instrument) {
  if (instrument == "violin1") {
    return { pan: -0.7, distance: 0.5 };
  }
  if (instrument == "violin2") {
    return { pan: -0.4, distance: 0.5 };
  }
  if (instrument == "viola") {
    return { pan: 0.3, distance: 0.5 };
  }
  if (instrument == "cello") {
    return { pan: 0.6, distance: 0.5 };
  }
  if (instrument == "bass") {
    return { pan: 0.8, distance: 0.6 };
  }
  if (instrument == "flute") {
    return { pan: -0.5, distance: 0.7 };
  }
  if (instrument == "oboe") {
    return { pan: -0.2, distance: 0.7 };
  }
  if (instrument == "clarinet") {
    return { pan: 0.2, distance: 0.7 };
  }
  if (instrument == "bassoon") {
    return { pan: 0.5, distance: 0.7 };
  }
  if (instrument == "horn") {
    return { pan: -0.6, distance: 0.8 };
  }
  if (instrument == "trumpet") {
    return { pan: -0.3, distance: 0.8 };
  }
  if (instrument == "trombone") {
    return { pan: 0.3, distance: 0.8 };
  }
  if (instrument == "tuba") {
    return { pan: 0.6, distance: 0.8 };
  }
  if (instrument == "timpani") {
    return { pan: 0.0, distance: 0.9 };
  }
  if (instrument == "percussion") {
    return { pan: 0.4, distance: 0.9 };
  }
  // Default center
  return { pan: 0.0, distance: 0.5 };
}

// Band/ensemble positioning
export fn bandPosition(instrument) {
  if (instrument == "drums") {
    return { pan: 0.0, distance: 0.6 };
  }
  if (instrument == "bass") {
    return { pan: 0.2, distance: 0.4 };
  }
  if (instrument == "guitar_rhythm") {
    return { pan: -0.5, distance: 0.3 };
  }
  if (instrument == "guitar_lead") {
    return { pan: 0.5, distance: 0.3 };
  }
  if (instrument == "keys") {
    return { pan: -0.3, distance: 0.4 };
  }
  if (instrument == "vocal") {
    return { pan: 0.0, distance: 0.2 };
  }
  if (instrument == "backing_vocals") {
    return { pan: 0.0, distance: 0.5, width: 0.8 };
  }
  return { pan: 0.0, distance: 0.5 };
}

// ============================================
// Doppler Effect
// ============================================

// Simulate Doppler effect (pitch shift based on movement)
// Returns automation for pitch bend
export fn dopplerEffect(start, end, direction, intensity) {
  let intens = intensity;
  if (intens == null) {
    intens = 0.5;
  }

  let points = [];
  const numPoints = 16;

  for (i in 0..(numPoints - 1)) {
    const t = i / (numPoints - 1);
    let v = 0;
    if (direction == "approach") {
      // Higher pitch approaching, lower leaving
      v = intens * (1 - t * 2);
    } else if (direction == "recede") {
      v = intens * (t * 2 - 1);
    } else {
      // Pass by - high to low
      v = intens * (1 - t * 2);
    }
    points[points.length] = { t: t, v: v };
  }

  return {
    type: "automation",
    param: "pitchBend",
    start: start,
    end: end,
    curve: { kind: "piecewiseLinear", points: points }
  };
}
`;

export const STDLIB_SPECTRAL = `// std:spectral (v5.3)
// Spectral music composition utilities
// Based on techniques from Grisey, Murail, and the French spectral school

// ============================================
// Constants
// ============================================

export const A4_FREQ = 440.0;
const LOG2_E = 1.4426950408889634;

// ============================================
// Harmonic Series
// ============================================

// Generate harmonic series from fundamental
export fn harmonics(fundamental, count) {
  let partials = [];
  for (n in 1..count) {
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: 1.0 / n  // Natural rolloff
    };
  }
  return partials;
}

// Generate odd harmonics only
export fn oddHarmonics(fundamental, count) {
  let partials = [];
  for (i in 0..(count - 1)) {
    const n = i * 2 + 1;
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// Generate even harmonics only
export fn evenHarmonics(fundamental, count) {
  let partials = [];
  for (i in 1..count) {
    const n = i * 2;
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// Generate subharmonics
export fn subharmonics(fundamental, count) {
  let partials = [];
  for (n in 1..count) {
    partials[partials.length] = {
      partial: -n,
      frequency: fundamental / n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// ============================================
// Frequency to Pitch Conversion
// ============================================

// Convert frequency to MIDI note (floating point)
export fn frequencyToMidi(freq) {
  return 69 + 12 * log2Approx(freq / A4_FREQ);
}

// Convert frequency to nearest MIDI note (integer)
export fn frequencyToNearestMidi(freq) {
  const midi = frequencyToMidi(freq);
  if (midi >= 0) {
    return midi + 0.5 - ((midi + 0.5) % 1);
  }
  return midi - 0.5 - ((midi - 0.5) % 1);
}

// Convert MIDI note to frequency
export fn midiToFrequency(midi) {
  return A4_FREQ * (2 ** ((midi - 69) / 12));
}

// Get cents deviation from nearest MIDI note
export fn frequencyCentsDeviation(freq) {
  const exactMidi = frequencyToMidi(freq);
  const nearestMidi = frequencyToNearestMidi(freq);
  return (exactMidi - nearestMidi) * 100;
}

// ============================================
// Spectral Analysis
// ============================================

// Convert spectrum to playable pitches
// Quantizes to nearest quarter-tone or specified resolution
export fn spectrumToPitches(partials, resolution) {
  let res = resolution;
  if (res == null) {
    res = 50;  // Quarter-tone (50 cents)
  }

  let pitches = [];
  for (partial in partials) {
    const exactMidi = frequencyToMidi(partial.frequency);
    const cents = exactMidi * 100;

    // Quantize to resolution
    let quantized = cents / res;
    if (quantized >= 0) {
      quantized = quantized + 0.5 - ((quantized + 0.5) % 1);
    } else {
      quantized = quantized - 0.5 - ((quantized - 0.5) % 1);
    }
    quantized = quantized * res;

    pitches[pitches.length] = {
      midi: quantized / 100,
      cents: quantized,
      amplitude: partial.amplitude,
      partial: partial.partial
    };
  }

  return pitches;
}

// Remove duplicate pitches (within tolerance)
export fn removeDuplicates(pitches, tolerance) {
  let tol = tolerance;
  if (tol == null) {
    tol = 25;  // Quarter of a semitone
  }

  let unique = [];
  for (pitch in pitches) {
    let isDup = false;
    for (existing in unique) {
      let diff = pitch.cents - existing.cents;
      if (diff < 0) { diff = -diff; }
      if (diff < tol) {
        isDup = true;
        // Keep the louder one
        if (pitch.amplitude > existing.amplitude) {
          existing.amplitude = pitch.amplitude;
        }
        break;
      }
    }
    if (!isDup) {
      unique[unique.length] = pitch;
    }
  }

  return unique;
}

// ============================================
// Spectral Transformations
// ============================================

// Frequency shift (add constant to all frequencies)
export fn frequencyShift(partials, shiftHz) {
  let result = [];
  for (partial in partials) {
    if (partial.frequency + shiftHz > 0) {
      result[result.length] = {
        partial: partial.partial,
        frequency: partial.frequency + shiftHz,
        amplitude: partial.amplitude
      };
    }
  }
  return result;
}

// Ring modulation (multiply frequencies)
export fn ringModulate(partials, modulatorFreq) {
  let result = [];
  for (partial in partials) {
    // Sum frequency
    result[result.length] = {
      partial: partial.partial,
      frequency: partial.frequency + modulatorFreq,
      amplitude: partial.amplitude * 0.5
    };
    // Difference frequency
    const diff = partial.frequency - modulatorFreq;
    if (diff > 0) {
      result[result.length] = {
        partial: -partial.partial,
        frequency: diff,
        amplitude: partial.amplitude * 0.5
      };
    }
  }
  return result;
}

// Stretch/compress spectrum
export fn stretchSpectrum(partials, factor) {
  const fundamental = partials[0].frequency;

  let result = [];
  for (partial in partials) {
    const interval = partial.frequency / fundamental;
    const newInterval = interval ** factor;
    result[result.length] = {
      partial: partial.partial,
      frequency: fundamental * newInterval,
      amplitude: partial.amplitude
    };
  }
  return result;
}

// Inharmonicity simulation (piano-like stretching)
export fn addInharmonicity(partials, coefficient) {
  const fundamental = partials[0].frequency;

  let result = [];
  for (partial in partials) {
    const n = partial.partial;
    // f_n = f_1 * n * sqrt(1 + B * n^2)
    const stretch = (1 + coefficient * n * n) ** 0.5;
    result[result.length] = {
      partial: n,
      frequency: fundamental * n * stretch,
      amplitude: partial.amplitude
    };
  }
  return result;
}

// Filter spectrum by frequency range
export fn filterByFrequency(partials, minFreq, maxFreq) {
  let result = [];
  for (partial in partials) {
    if (partial.frequency >= minFreq && partial.frequency <= maxFreq) {
      result[result.length] = partial;
    }
  }
  return result;
}

// Filter by amplitude threshold
export fn filterByAmplitude(partials, threshold) {
  let result = [];
  for (partial in partials) {
    if (partial.amplitude >= threshold) {
      result[result.length] = partial;
    }
  }
  return result;
}

// ============================================
// Spectral Interpolation (Morphing)
// ============================================

// Interpolate between two spectra
export fn interpolateSpectra(spectrumA, spectrumB, amount) {
  // Simple linear interpolation based on partial number
  let result = [];

  // Get all unique partial numbers
  let partialNums = [];
  for (p in spectrumA) {
    partialNums[partialNums.length] = p.partial;
  }
  for (p in spectrumB) {
    let found = false;
    for (num in partialNums) {
      if (num == p.partial) {
        found = true;
        break;
      }
    }
    if (!found) {
      partialNums[partialNums.length] = p.partial;
    }
  }

  for (num in partialNums) {
    let freqA = 0;
    let ampA = 0;
    let freqB = 0;
    let ampB = 0;

    for (p in spectrumA) {
      if (p.partial == num) {
        freqA = p.frequency;
        ampA = p.amplitude;
        break;
      }
    }

    for (p in spectrumB) {
      if (p.partial == num) {
        freqB = p.frequency;
        ampB = p.amplitude;
        break;
      }
    }

    const freq = freqA * (1 - amount) + freqB * amount;
    const amp = ampA * (1 - amount) + ampB * amount;

    if (freq > 0 && amp > 0.001) {
      result[result.length] = {
        partial: num,
        frequency: freq,
        amplitude: amp
      };
    }
  }

  return result;
}

// Create morphing sequence between spectra
export fn morphSequence(spectrumA, spectrumB, steps) {
  let sequence = [];
  for (i in 0..steps) {
    const amount = i / steps;
    sequence[i] = interpolateSpectra(spectrumA, spectrumB, amount);
  }
  return sequence;
}

// ============================================
// Instrument Spectra (Approximations)
// ============================================

// Clarinet-like spectrum (odd harmonics)
export fn clarinetSpectrum(fundamental) {
  let partials = [];
  const amplitudes = [1.0, 0.75, 0.5, 0.14, 0.5, 0.12, 0.17];

  for (i in 0..(amplitudes.length - 1)) {
    const n = i * 2 + 1;
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: amplitudes[i]
    };
  }
  return partials;
}

// Trumpet-like spectrum
export fn trumpetSpectrum(fundamental) {
  let partials = [];
  const amplitudes = [1.0, 0.8, 0.65, 0.9, 0.7, 0.6, 0.4, 0.3, 0.2];

  for (i in 0..(amplitudes.length - 1)) {
    const n = i + 1;
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: amplitudes[i]
    };
  }
  return partials;
}

// String-like spectrum (with slight inharmonicity)
export fn stringSpectrum(fundamental, inharmonicity) {
  let inh = inharmonicity;
  if (inh == null) {
    inh = 0.0001;
  }

  let partials = harmonics(fundamental, 16);
  return addInharmonicity(partials, inh);
}

// Bell-like spectrum (non-harmonic)
export fn bellSpectrum(fundamental) {
  // Approximate bell partials (Rossing's data)
  const ratios = [1.0, 2.0, 2.4, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
  const amps = [1.0, 0.6, 0.4, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05];

  let partials = [];
  for (i in 0..(ratios.length - 1)) {
    partials[partials.length] = {
      partial: i + 1,
      frequency: fundamental * ratios[i],
      amplitude: amps[i]
    };
  }
  return partials;
}

// ============================================
// Difference Tones and Combination Tones
// ============================================

// Calculate difference tone
export fn differenceTone(freq1, freq2) {
  let diff = freq1 - freq2;
  if (diff < 0) { diff = -diff; }
  return diff;
}

// Calculate sum tone
export fn sumTone(freq1, freq2) {
  return freq1 + freq2;
}

// Generate combination tones up to order n
export fn combinationTones(freq1, freq2, order) {
  let tones = [];

  for (m in 1..order) {
    for (n in 1..order) {
      // f = m*f1 ± n*f2
      const sum = m * freq1 + n * freq2;
      const diff = m * freq1 - n * freq2;

      tones[tones.length] = {
        type: "sum",
        m: m,
        n: n,
        frequency: sum
      };

      if (diff > 0) {
        tones[tones.length] = {
          type: "diff",
          m: m,
          n: n,
          frequency: diff
        };
      }
    }
  }

  return tones;
}

// ============================================
// Formant Synthesis
// ============================================

// Create formant (resonance peak)
export fn formant(centerFreq, bandwidth, amplitude) {
  return {
    type: "formant",
    frequency: centerFreq,
    bandwidth: bandwidth,
    amplitude: amplitude
  };
}

// Vowel formants (approximate)
export fn vowelFormants(vowel) {
  if (vowel == "a") {
    return [
      formant(800, 80, 1.0),
      formant(1200, 90, 0.5),
      formant(2500, 120, 0.25)
    ];
  } else if (vowel == "e") {
    return [
      formant(400, 70, 1.0),
      formant(2000, 100, 0.4),
      formant(2600, 120, 0.2)
    ];
  } else if (vowel == "i") {
    return [
      formant(300, 60, 1.0),
      formant(2300, 90, 0.5),
      formant(3000, 120, 0.25)
    ];
  } else if (vowel == "o") {
    return [
      formant(500, 70, 1.0),
      formant(800, 80, 0.4),
      formant(2500, 120, 0.15)
    ];
  } else if (vowel == "u") {
    return [
      formant(350, 60, 1.0),
      formant(700, 70, 0.3),
      formant(2500, 100, 0.1)
    ];
  }
  return [];
}

// Apply formants to spectrum
export fn applyFormants(partials, formants) {
  let result = [];

  for (partial in partials) {
    let totalAmp = 0;

    for (formantSpec in formants) {
      // Gaussian resonance curve
      const diff = partial.frequency - formantSpec.frequency;
      const sigma = formantSpec.bandwidth / 2.355;  // FWHM to sigma
      const gaussian = formantSpec.amplitude *
        (2.71828 ** (-(diff * diff) / (2 * sigma * sigma)));
      totalAmp = totalAmp + gaussian;
    }

    result[result.length] = {
      partial: partial.partial,
      frequency: partial.frequency,
      amplitude: partial.amplitude * totalAmp
    };
  }

  return result;
}

// ============================================
// Spectral Chords
// ============================================

// Create chord from harmonic series segment
export fn harmonicChord(fundamental, startPartial, endPartial) {
  let partials = [];
  for (n in startPartial..endPartial) {
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// Create chord from specific partials
export fn partialChord(fundamental, partialNumbers) {
  let partials = [];
  for (n in partialNumbers) {
    partials[partials.length] = {
      partial: n,
      frequency: fundamental * n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// Create subharmonic chord (undertone series)
export fn subharmonicChord(fundamental, startPartial, endPartial) {
  let partials = [];
  for (n in startPartial..endPartial) {
    partials[partials.length] = {
      partial: -n,
      frequency: fundamental / n,
      amplitude: 1.0 / n
    };
  }
  return partials;
}

// ============================================
// Analysis Utilities
// ============================================

// Calculate spectral centroid
export fn spectralCentroid(partials) {
  let weightedSum = 0;
  let totalAmp = 0;

  for (partial in partials) {
    weightedSum = weightedSum + partial.frequency * partial.amplitude;
    totalAmp = totalAmp + partial.amplitude;
  }

  if (totalAmp == 0) {
    return 0;
  }
  return weightedSum / totalAmp;
}

// Calculate spectral spread
export fn spectralSpread(partials) {
  const centroid = spectralCentroid(partials);
  let weightedVariance = 0;
  let totalAmp = 0;

  for (partial in partials) {
    const diff = partial.frequency - centroid;
    weightedVariance = weightedVariance + (diff * diff) * partial.amplitude;
    totalAmp = totalAmp + partial.amplitude;
  }

  if (totalAmp == 0) {
    return 0;
  }
  return (weightedVariance / totalAmp) ** 0.5;
}

// Calculate roughness (simplified Plomp-Levelt)
export fn calculateRoughness(partials) {
  let roughness = 0;

  for (i in 0..(partials.length - 2)) {
    for (j in (i + 1)..(partials.length - 1)) {
      const f1 = partials[i].frequency;
      const f2 = partials[j].frequency;
      const a1 = partials[i].amplitude;
      const a2 = partials[j].amplitude;

      const diff = f2 - f1;
      if (diff < 0) { continue; }

      // Critical bandwidth approximation
      const cb = 25 + 75 * (1 + 1.4 * ((f1 + f2) / 2 / 1000) ** 2) ** 0.69;

      // Roughness contribution
      const x = diff / cb;
      const contrib = a1 * a2 * (2.71828 ** (-3.5 * x)) * x ** 2;
      roughness = roughness + contrib;
    }
  }

  return roughness;
}

// ============================================
// Helper Functions
// ============================================

fn log2Approx(x) {
  if (x <= 0) {
    return 0;
  }

  let exp = 0;
  let val = x;

  while (val >= 2) {
    val = val / 2;
    exp = exp + 1;
  }
  while (val < 1) {
    val = val * 2;
    exp = exp - 1;
  }

  const y = val - 1;
  let ln = y;
  let term = y;

  for (n in 2..15) {
    term = term * (-y);
    ln = ln + term / n;
  }

  return exp + ln * LOG2_E;
}
`;

export const STDLIB_STRUCTURE = `// std:structure (v5)
// Musical form, sections, and repeat structures

import core;

// ============================================
// Section Markers
// ============================================

// Create a section marker event
export fn sectionMarker(pos, name) {
  return {
    type: "marker",
    pos: pos,
    kind: "section",
    label: name
  };
}

// Mark common section types
export fn verse(pos, num) {
  let label = "Verse";
  if (num != null) {
    label = "Verse " + num;
  }
  return sectionMarker(pos, label);
}

export fn chorus(pos, num) {
  let label = "Chorus";
  if (num != null) {
    label = "Chorus " + num;
  }
  return sectionMarker(pos, label);
}

export fn bridge(pos) {
  return sectionMarker(pos, "Bridge");
}

export fn intro(pos) {
  return sectionMarker(pos, "Intro");
}

export fn outro(pos) {
  return sectionMarker(pos, "Outro");
}

export fn preChorus(pos) {
  return sectionMarker(pos, "Pre-Chorus");
}

export fn interlude(pos) {
  return sectionMarker(pos, "Interlude");
}

export fn solo(pos, instrument) {
  let label = "Solo";
  if (instrument != null) {
    label = instrument + " Solo";
  }
  return sectionMarker(pos, label);
}

export fn coda(pos) {
  return sectionMarker(pos, "Coda");
}

// ============================================
// Navigation Markers (D.C., D.S., etc.)
// ============================================

// Segno marker (sign)
export fn segno(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "segno",
    label: "Segno"
  };
}

// Fine marker (end)
export fn fine(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "fine",
    label: "Fine"
  };
}

// Coda marker (jump target)
export fn codaMarker(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "coda",
    label: "Coda"
  };
}

// Da Capo (from the beginning)
export fn daCapo(pos, withRepeat) {
  return {
    type: "marker",
    pos: pos,
    kind: "dc",
    label: if (withRepeat == true) { "D.C." } else { "D.C. senza rep." }
  };
}

// Da Capo al Fine
export fn daCapoAlFine(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "dc_fine",
    label: "D.C. al Fine"
  };
}

// Da Capo al Coda
export fn daCapoAlCoda(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "dc_coda",
    label: "D.C. al Coda"
  };
}

// Dal Segno (from the sign)
export fn dalSegno(pos, withRepeat) {
  return {
    type: "marker",
    pos: pos,
    kind: "ds",
    label: if (withRepeat == true) { "D.S." } else { "D.S. senza rep." }
  };
}

// Dal Segno al Fine
export fn dalSegnoAlFine(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "ds_fine",
    label: "D.S. al Fine"
  };
}

// Dal Segno al Coda
export fn dalSegnoAlCoda(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "ds_coda",
    label: "D.S. al Coda"
  };
}

// To Coda (jump to coda)
export fn toCoda(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "to_coda",
    label: "To Coda"
  };
}

// ============================================
// Repeat Structures
// ============================================

// Simple repeat - repeat a clip n times
// Same as core.repeat but with repeat markers
export fn repeatSection(c, count) {
  if (count <= 0) {
    return { events: [], length: 0 / 1 };
  }

  let events = [];
  const len = core.clipLen(c);

  // Add repeat start marker
  events[events.length] = {
    type: "marker",
    pos: 0 / 1,
    kind: "repeat_start",
    label: ":|"
  };

  // Copy events
  for (i in 0..(count - 1)) {
    const offset = len * i;
    for (ev in c.events) {
      events[events.length] = core.shiftEvent(ev, offset);
    }
  }

  // Add repeat end marker
  events[events.length] = {
    type: "marker",
    pos: len * count,
    kind: "repeat_end",
    label: ":|"
  };

  return { events: events, length: len * count };
}

// First and second ending (volta brackets)
// clip1 = first time content, clip2 = second time content
export fn volta(mainClip, endings) {
  let events = [];
  let pos = 0 / 1;
  const mainLen = core.clipLen(mainClip);

  // Add main content
  for (ev in mainClip.events) {
    events[events.length] = core.cloneEvent(ev);
  }

  // Add repeat start
  events[events.length] = {
    type: "marker",
    pos: 0 / 1,
    kind: "repeat_start",
    label: "|:"
  };

  pos = mainLen;

  // Process each ending
  let endingNum = 1;
  for (ending in endings) {
    const endingLen = core.clipLen(ending);

    // Mark volta bracket start
    events[events.length] = {
      type: "marker",
      pos: pos,
      kind: "volta_start",
      label: "" + endingNum + "."
    };

    // Add ending content
    for (ev in ending.events) {
      events[events.length] = core.shiftEvent(ev, pos);
    }

    // Mark volta bracket end
    events[events.length] = {
      type: "marker",
      pos: pos + endingLen,
      kind: "volta_end",
      label: "" + endingNum + "."
    };

    pos = pos + endingLen;
    endingNum = endingNum + 1;
  }

  return { events: events, length: pos };
}

// Create first/second ending with explicit clip definitions
export fn firstSecondEnding(main, first, second) {
  return volta(main, [first, second]);
}

// ============================================
// Form Expansion
// ============================================

// Expand a form structure into a flat clip
// form = array of section references or clips
// sections = object mapping section names to clips
export fn expandForm(form, sections) {
  let result = { events: [], length: 0 / 1 };

  for (item in form) {
    let sectionClip = null;

    if (item.events != null) {
      // It's already a clip
      sectionClip = item;
    } else if (typeof(item) == "string") {
      // It's a section name
      sectionClip = sections[item];
    } else if (item.section != null) {
      // It's a section reference with optional properties
      sectionClip = sections[item.section];
      if (item.repeat != null && item.repeat > 1) {
        sectionClip = core.repeat(sectionClip, item.repeat);
      }
    }

    if (sectionClip != null) {
      result = core.concat(result, sectionClip);
    }
  }

  return result;
}

// Common song forms
export fn aaba(a, b) {
  return expandForm(["A", "A", "B", "A"], { A: a, B: b });
}

export fn abab(a, b) {
  return expandForm(["A", "B", "A", "B"], { A: a, B: b });
}

export fn abac(a, b, c) {
  return expandForm(["A", "B", "A", "C"], { A: a, B: b, C: c });
}

export fn rondo(a, b, c) {
  // ABACABA form
  return expandForm(["A", "B", "A", "C", "A", "B", "A"], { A: a, B: b, C: c });
}

export fn ternary(a, b) {
  // ABA form
  return expandForm(["A", "B", "A"], { A: a, B: b });
}

export fn binary(a, b) {
  // AB form
  return expandForm(["A", "B"], { A: a, B: b });
}

export fn throughComposed(sections) {
  // Each section played once in order
  let result = { events: [], length: 0 / 1 };
  for (section in sections) {
    result = core.concat(result, section);
  }
  return result;
}

// Pop/Rock song structure
export fn popForm(intro, verse, chorus, bridge, outro) {
  let form = [];
  if (intro != null) {
    form[form.length] = "intro";
  }
  form[form.length] = "verse";
  form[form.length] = "chorus";
  form[form.length] = "verse";
  form[form.length] = "chorus";
  if (bridge != null) {
    form[form.length] = "bridge";
  }
  form[form.length] = "chorus";
  form[form.length] = "chorus";
  if (outro != null) {
    form[form.length] = "outro";
  }

  let sections = {
    verse: verse,
    chorus: chorus
  };
  if (intro != null) {
    sections.intro = intro;
  }
  if (bridge != null) {
    sections.bridge = bridge;
  }
  if (outro != null) {
    sections.outro = outro;
  }

  return expandForm(form, sections);
}

// Blues 12-bar structure
export fn blues12Bar(i, iv, v) {
  // I - I - I - I - IV - IV - I - I - V - IV - I - V
  return expandForm([
    "I", "I", "I", "I",
    "IV", "IV", "I", "I",
    "V", "IV", "I", "V"
  ], { I: i, IV: iv, V: v });
}

// ============================================
// Section Utilities
// ============================================

// Add section marker to beginning of clip
export fn markSection(c, name) {
  let events = [sectionMarker(0 / 1, name)];
  for (ev in c.events) {
    events[events.length] = ev;
  }
  return { events: events, length: c.length };
}

// Find markers in a clip by kind
export fn findMarkers(c, kind) {
  let result = [];
  for (ev in c.events) {
    if (ev.type == "marker" && ev.kind == kind) {
      result[result.length] = ev;
    }
  }
  return result;
}

// Get all section markers
export fn getSections(c) {
  return findMarkers(c, "section");
}

// ============================================
// Rehearsal Marks
// ============================================

// Rehearsal letter (A, B, C, etc.)
export fn rehearsalLetter(pos, letter) {
  return {
    type: "marker",
    pos: pos,
    kind: "rehearsal",
    label: letter
  };
}

// Rehearsal number
export fn rehearsalNumber(pos, num) {
  return {
    type: "marker",
    pos: pos,
    kind: "rehearsal",
    label: "" + num
  };
}

// Auto-generate rehearsal marks at regular intervals
export fn autoRehearsal(c, interval, startLetter) {
  const len = core.clipLen(c);
  let events = [];

  // Copy original events
  for (ev in c.events) {
    events[events.length] = ev;
  }

  // Add rehearsal marks
  let pos = 0 / 1;
  let letterCode = 65; // 'A'
  if (startLetter != null) {
    letterCode = startLetter;
  }

  for (_ in 0..100) {
    if (pos >= len) {
      return { events: events, length: len };
    }
    const letter = chr(letterCode);
    events[events.length] = rehearsalLetter(pos, letter);
    pos = pos + interval;
    letterCode = letterCode + 1;
    if (letterCode > 90) { // 'Z'
      letterCode = 65;
    }
  }

  return { events: events, length: len };
}

// ============================================
// Fermata and Pauses
// ============================================

// Fermata (hold/pause on a note)
export fn fermata(pos, duration) {
  return {
    type: "marker",
    pos: pos,
    kind: "fermata",
    label: if (duration != null) { "fermata:" + duration } else { "fermata" }
  };
}

// General pause (G.P.)
export fn generalPause(pos, duration) {
  return {
    type: "marker",
    pos: pos,
    kind: "gp",
    label: "G.P."
  };
}

// Caesura (breath mark / railroad tracks)
export fn caesura(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "caesura",
    label: "//"
  };
}

// Breath mark
export fn breathMark(pos) {
  return {
    type: "marker",
    pos: pos,
    kind: "breath",
    label: "'"
  };
}
`;

export const STDLIB_SYNC = `// std:sync (v5)
// Synchronization: timecode, SMPTE, MTC, OSC, video sync

import core;

// ============================================
// SMPTE Timecode
// ============================================

// SMPTE frame rates
export const SMPTE = {
  FPS_24: 24,
  FPS_25: 25,
  FPS_29_97: 29.97,
  FPS_29_97_DF: "29.97df",  // Drop-frame
  FPS_30: 30,
  FPS_30_DF: "30df"         // Drop-frame
};

// Convert SMPTE timecode to beats
// timecode format: "HH:MM:SS:FF" or { h, m, s, f }
export fn smpteToBeats(timecode, fps, bpm) {
  let h = 0;
  let m = 0;
  let s = 0;
  let f = 0;

  if (timecode.h != null) {
    h = timecode.h;
    m = timecode.m;
    s = timecode.s;
    f = timecode.f;
  } else {
    // Parse string "HH:MM:SS:FF"
    // Simple parsing (assuming format is correct)
    h = 0; m = 0; s = 0; f = 0;
  }

  const totalSeconds = h * 3600 + m * 60 + s + f / fps;
  const beatsPerSecond = bpm / 60;
  return totalSeconds * beatsPerSecond;
}

// Convert beats to SMPTE timecode
export fn beatsToSmpte(beats, fps, bpm) {
  const beatsPerSecond = bpm / 60;
  const totalSeconds = beats / beatsPerSecond;

  const h = core.floor(totalSeconds / 3600);
  const remaining1 = totalSeconds - h * 3600;
  const m = core.floor(remaining1 / 60);
  const remaining2 = remaining1 - m * 60;
  const s = core.floor(remaining2);
  const f = core.floor((remaining2 - s) * fps);

  return { h: h, m: m, s: s, f: f };
}

// Format SMPTE to string
export fn formatSmpte(tc) {
  let hStr = "" + tc.h;
  let mStr = "" + tc.m;
  let sStr = "" + tc.s;
  let fStr = "" + tc.f;

  if (tc.h < 10) { hStr = "0" + hStr; }
  if (tc.m < 10) { mStr = "0" + mStr; }
  if (tc.s < 10) { sStr = "0" + sStr; }
  if (tc.f < 10) { fStr = "0" + fStr; }

  return hStr + ":" + mStr + ":" + sStr + ":" + fStr;
}

// SMPTE sync marker
export fn smpteMarker(pos, timecode, fps) {
  return {
    type: "marker",
    pos: pos,
    kind: "smpte",
    label: formatSmpte(timecode),
    ext: {
      fps: fps,
      timecode: timecode
    }
  };
}

// ============================================
// MTC (MIDI Time Code)
// ============================================

// MTC quarter-frame message types
export const MTC_TYPE = {
  FRAME_LSN: 0,
  FRAME_MSN: 1,
  SEC_LSN: 2,
  SEC_MSN: 3,
  MIN_LSN: 4,
  MIN_MSN: 5,
  HOUR_LSN: 6,
  HOUR_MSN_TYPE: 7
};

// Create MTC sync point
export fn mtcSync(pos, timecode, fps) {
  return {
    type: "control",
    start: pos,
    kind: "mtcSync",
    data: {
      timecode: timecode,
      fps: fps
    }
  };
}

// ============================================
// Video Sync
// ============================================

// Create video sync point (hit point)
export fn videoSync(pos, description) {
  return {
    type: "marker",
    pos: pos,
    kind: "videoSync",
    label: description
  };
}

// Hit point with frame number
export fn hitPoint(pos, frameNumber, fps, description) {
  return {
    type: "marker",
    pos: pos,
    kind: "hitPoint",
    label: description,
    ext: {
      frame: frameNumber,
      fps: fps
    }
  };
}

// Cue list for video
export fn cueList(cues) {
  // cues = [{ pos, label, type }]
  let events = [];
  for (cue in cues) {
    events[events.length] = {
      type: "marker",
      pos: cue.pos,
      kind: "videoCue",
      label: cue.label,
      ext: { cueType: cue.type }
    };
  }
  return { events: events };
}

// Calculate tempo for hit point
// Given a start position, a target position (hit), and desired bar count
export fn tempoForHit(startPos, hitPos, numBars, beatsPerBar) {
  const totalBeats = numBars * beatsPerBar;
  const duration = hitPos - startPos;  // In some time unit (e.g., seconds)
  return (totalBeats / duration) * 60;  // BPM
}

// ============================================
// OSC (Open Sound Control)
// ============================================

// OSC message event
export fn oscMessage(pos, address, args) {
  return {
    type: "control",
    start: pos,
    kind: "osc",
    data: {
      address: address,
      args: args
    }
  };
}

// Common OSC addresses
export fn oscPlay(pos) {
  return oscMessage(pos, "/transport/play", []);
}

export fn oscStop(pos) {
  return oscMessage(pos, "/transport/stop", []);
}

export fn oscTempo(pos, bpm) {
  return oscMessage(pos, "/tempo", [bpm]);
}

export fn oscVolume(pos, channel, level) {
  return oscMessage(pos, "/mixer/channel/" + channel + "/volume", [level]);
}

export fn oscMute(pos, channel, muted) {
  return oscMessage(pos, "/mixer/channel/" + channel + "/mute", [muted]);
}

// Custom OSC bundle
export fn oscBundle(pos, messages) {
  return {
    type: "control",
    start: pos,
    kind: "oscBundle",
    data: {
      messages: messages
    }
  };
}

// ============================================
// External Sync Markers
// ============================================

// Bar/beat sync marker (for DAW integration)
export fn barBeatMarker(pos, bar, beat) {
  return {
    type: "marker",
    pos: pos,
    kind: "barBeat",
    label: "" + bar + "." + beat
  };
}

// Click track marker
export fn clickMarker(pos, isDownbeat) {
  return {
    type: "marker",
    pos: pos,
    kind: "click",
    label: if (isDownbeat) { "1" } else { "+" }
  };
}

// Generate click track markers
export fn generateClickTrack(startPos, numBars, beatsPerBar) {
  let events = [];
  let pos = startPos;
  const beatDur = 1 / 1;  // Assuming quarter note beats

  for (bar in 1..numBars) {
    for (beat in 1..beatsPerBar) {
      events[events.length] = clickMarker(pos, beat == 1);
      events[events.length] = barBeatMarker(pos, bar, beat);
      pos = pos + beatDur;
    }
  }

  return { events: events, length: pos - startPos };
}

// ============================================
// Tempo Map Sync
// ============================================

// Create tempo change for video sync
export fn tempoSync(pos, bpm, reason) {
  return {
    type: "marker",
    pos: pos,
    kind: "tempoSync",
    label: "" + bpm + " BPM",
    ext: { bpm: bpm, reason: reason }
  };
}

// Calculate tempos to hit multiple cue points
export fn calculateTemposForCues(cues, beatsPerBar) {
  let tempos = [];

  for (i in 0..(cues.length - 2)) {
    const currentCue = cues[i];
    const nextCue = cues[i + 1];

    const duration = nextCue.time - currentCue.time;  // In seconds
    const bars = nextCue.bar - currentCue.bar;
    const beats = bars * beatsPerBar;

    const bpm = (beats / duration) * 60;

    tempos[tempos.length] = {
      pos: currentCue.pos,
      bpm: bpm,
      cue: currentCue.label
    };
  }

  return tempos;
}

// ============================================
// Ableton Link
// ============================================

// Link session control
export fn linkEnable(pos) {
  return {
    type: "control",
    start: pos,
    kind: "linkEnable",
    data: { enabled: true }
  };
}

export fn linkDisable(pos) {
  return {
    type: "control",
    start: pos,
    kind: "linkEnable",
    data: { enabled: false }
  };
}

// Link tempo change
export fn linkTempo(pos, bpm) {
  return {
    type: "control",
    start: pos,
    kind: "linkTempo",
    data: { bpm: bpm }
  };
}

// ============================================
// ReWire
// ============================================

// ReWire transport control
export fn rewirePlay(pos) {
  return {
    type: "control",
    start: pos,
    kind: "rewireTransport",
    data: { command: "play" }
  };
}

export fn rewireStop(pos) {
  return {
    type: "control",
    start: pos,
    kind: "rewireTransport",
    data: { command: "stop" }
  };
}

export fn rewireLocate(pos, targetPos) {
  return {
    type: "control",
    start: pos,
    kind: "rewireTransport",
    data: { command: "locate", position: targetPos }
  };
}
`;

export const STDLIB_TEXTURE = `// std:texture (v5.4)
// Textural composition utilities
// For creating musical textures, density control, and layering

// ============================================
// Texture Types
// ============================================

// Monophonic texture (single line)
export fn monophonic(pitches, durations, velocity) {
  let vel = velocity;
  if (vel == null) {
    vel = 0.8;
  }

  let events = [];
  let time = 0 / 1;

  for (i in 0..(pitches.length - 1)) {
    events[events.length] = {
      type: "note",
      pitch: pitches[i],
      start: time,
      duration: durations[i % durations.length],
      velocity: vel
    };
    time = time + durations[i % durations.length];
  }

  return {
    type: "texture",
    textureType: "monophonic",
    events: events
  };
}

// Homophonic texture (melody with chordal accompaniment)
export fn homophonic(melody, chords, melodyDurations, chordDuration) {
  let events = [];
  let time = 0 / 1;

  for (i in 0..(melody.length - 1)) {
    // Melody note
    events[events.length] = {
      type: "note",
      pitch: melody[i],
      start: time,
      duration: melodyDurations[i % melodyDurations.length],
      velocity: 0.85,
      voice: "melody"
    };

    // Accompanying chord
    const chord = chords[i % chords.length];
    for (p in chord) {
      events[events.length] = {
        type: "note",
        pitch: p,
        start: time,
        duration: chordDuration,
        velocity: 0.6,
        voice: "accompaniment"
      };
    }

    time = time + melodyDurations[i % melodyDurations.length];
  }

  return {
    type: "texture",
    textureType: "homophonic",
    events: events
  };
}

// Polyphonic texture (multiple independent voices)
export fn polyphonic(voices) {
  let events = [];

  for (i in 0..(voices.length - 1)) {
    const voice = voices[i];
    for (event in voice.events) {
      let newEvent = {
        type: event.type,
        pitch: event.pitch,
        start: event.start,
        duration: event.duration,
        velocity: event.velocity,
        voice: "voice" + i
      };
      events[events.length] = newEvent;
    }
  }

  return {
    type: "texture",
    textureType: "polyphonic",
    voiceCount: voices.length,
    events: events
  };
}

// Heterophonic texture (simultaneous variations)
export fn heterophonic(baseLine, variations) {
  let events = [];

  // Base line
  for (event in baseLine.events) {
    events[events.length] = event;
  }

  // Variations (slightly offset)
  for (i in 0..(variations.length - 1)) {
    const variation = variations[i];
    for (event in variation.events) {
      events[events.length] = {
        type: event.type,
        pitch: event.pitch,
        start: event.start,
        duration: event.duration,
        velocity: event.velocity * 0.8,
        voice: "variation" + i
      };
    }
  }

  return {
    type: "texture",
    textureType: "heterophonic",
    events: events
  };
}

// ============================================
// Density Control
// ============================================

// Calculate note density (notes per beat)
export fn calculateDensity(texture, totalDuration) {
  return texture.events.length / totalDuration;
}

// Create texture with target density
export fn withDensity(pitches, targetDensity, totalDuration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  const noteCount = targetDensity * totalDuration;
  let events = [];

  for (i in 0..(noteCount - 1)) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const pitchIdx = ((rng / 2147483648) * pitches.length);
    let idx = pitchIdx - (pitchIdx % 1);

    rng = (rng * 1103515245 + 12345) % 2147483648;
    const startTime = (rng / 2147483648) * totalDuration;

    events[events.length] = {
      type: "note",
      pitch: pitches[idx],
      start: startTime,
      duration: 1/4,
      velocity: 0.7
    };
  }

  return {
    type: "texture",
    textureType: "stochastic",
    density: targetDensity,
    events: events
  };
}

// Gradually change density over time
export fn densityGradient(pitches, startDensity, endDensity, totalDuration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];
  const segments = 16;
  const segmentDur = totalDuration / segments;

  for (seg in 0..(segments - 1)) {
    const t = seg / segments;
    const density = startDensity + (endDensity - startDensity) * t;
    const noteCount = density * segmentDur;

    for (_ in 0..(noteCount - 1)) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const pitchIdx = ((rng / 2147483648) * pitches.length);
      let idx = pitchIdx - (pitchIdx % 1);

      rng = (rng * 1103515245 + 12345) % 2147483648;
      const offset = (rng / 2147483648) * segmentDur;
      const startTime = seg * segmentDur + offset;

      events[events.length] = {
        type: "note",
        pitch: pitches[idx],
        start: startTime,
        duration: 1/4,
        velocity: 0.7
      };
    }
  }

  return {
    type: "texture",
    textureType: "gradient",
    events: events
  };
}

// ============================================
// Layering
// ============================================

// Layer multiple textures
export fn layer(textures) {
  let events = [];
  for (texture in textures) {
    for (event in texture.events) {
      events[events.length] = event;
    }
  }

  return {
    type: "texture",
    textureType: "layered",
    layerCount: textures.length,
    events: events
  };
}

// Layer with offset
export fn layerWithOffset(texture, offsets) {
  let events = [];

  for (i in 0..(offsets.length - 1)) {
    const offset = offsets[i];
    for (event in texture.events) {
      events[events.length] = {
        type: event.type,
        pitch: event.pitch,
        start: event.start + offset,
        duration: event.duration,
        velocity: event.velocity,
        voice: "layer" + i
      };
    }
  }

  return {
    type: "texture",
    textureType: "layeredOffset",
    events: events
  };
}

// Stagger entries (gradual buildup)
export fn staggeredEntry(voices, entryInterval) {
  let events = [];

  for (i in 0..(voices.length - 1)) {
    const offset = i * entryInterval;
    for (event in voices[i].events) {
      events[events.length] = {
        type: event.type,
        pitch: event.pitch,
        start: event.start + offset,
        duration: event.duration,
        velocity: event.velocity,
        voice: "voice" + i
      };
    }
  }

  return {
    type: "texture",
    textureType: "staggered",
    events: events
  };
}

// ============================================
// Pointillistic Texture
// ============================================

// Create pointillistic texture (isolated notes)
export fn pointillistic(pitches, density, register, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];
  const noteCount = density * duration;

  for (_ in 0..(noteCount - 1)) {
    // Random pitch from set
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const pitchIdx = ((rng / 2147483648) * pitches.length);
    let idx = pitchIdx - (pitchIdx % 1);
    let pitch = pitches[idx];

    // Random octave within register
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const octaveRange = register.high - register.low;
    const octave = register.low + ((rng / 2147483648) * octaveRange);
    let oct = octave - (octave % 1);
    pitch = pitch + oct * 12;

    // Random start time
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const startTime = (rng / 2147483648) * duration;

    // Random short duration
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const noteDur = 1/16 + (rng / 2147483648) * 1/8;

    // Random velocity with wide dynamics
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const vel = 0.3 + (rng / 2147483648) * 0.6;

    events[events.length] = {
      type: "note",
      pitch: pitch,
      start: startTime,
      duration: noteDur,
      velocity: vel
    };
  }

  return {
    type: "texture",
    textureType: "pointillistic",
    events: events
  };
}

// ============================================
// Cloud Texture
// ============================================

// Create sound cloud (cluster of notes)
export fn cloud(centerPitch, spread, noteCount, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];

  for (_ in 0..(noteCount - 1)) {
    // Gaussian-ish distribution around center
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const r1 = rng / 2147483648;
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const r2 = rng / 2147483648;

    // Box-Muller approximation
    let offset = 0;
    if (r1 > 0.001) {
      const factor = (-2 * r1) ** 0.5;  // Simplified
      offset = factor * spread * (r2 - 0.5) * 2;
    }

    let pitch = centerPitch + offset;
    pitch = pitch - (pitch % 1);  // Round to integer

    // Random timing within duration
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const startTime = (rng / 2147483648) * duration;

    // Varying note lengths
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const noteDur = 1/8 + (rng / 2147483648) * 1/2;

    events[events.length] = {
      type: "note",
      pitch: pitch,
      start: startTime,
      duration: noteDur,
      velocity: 0.5 + (rng / 2147483648) * 0.3
    };
  }

  return {
    type: "texture",
    textureType: "cloud",
    center: centerPitch,
    spread: spread,
    events: events
  };
}

// Evolving cloud (center and spread change over time)
export fn evolvingCloud(startCenter, endCenter, startSpread, endSpread, noteCount, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];

  for (_ in 0..(noteCount - 1)) {
    // Random timing
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const startTime = (rng / 2147483648) * duration;
    const t = startTime / duration;

    // Interpolate center and spread
    const center = startCenter + (endCenter - startCenter) * t;
    const spread = startSpread + (endSpread - startSpread) * t;

    // Random offset from center
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const offset = (rng / 2147483648 - 0.5) * 2 * spread;

    let pitch = center + offset;
    pitch = pitch - (pitch % 1);

    rng = (rng * 1103515245 + 12345) % 2147483648;
    const noteDur = 1/8 + (rng / 2147483648) * 1/2;

    events[events.length] = {
      type: "note",
      pitch: pitch,
      start: startTime,
      duration: noteDur,
      velocity: 0.6
    };
  }

  return {
    type: "texture",
    textureType: "evolvingCloud",
    events: events
  };
}

// ============================================
// Granular Texture
// ============================================

// Create granular texture from source material
export fn granular(sourcePitches, grainSize, grainDensity, duration, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];
  const grainCount = grainDensity * duration;

  for (_ in 0..(grainCount - 1)) {
    // Random position in source
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const sourceIdx = ((rng / 2147483648) * sourcePitches.length);
    let idx = sourceIdx - (sourceIdx % 1);

    // Random start time
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const startTime = (rng / 2147483648) * duration;

    // Slight pitch variation
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const pitchVar = (rng / 2147483648 - 0.5) * 2;  // ±1 semitone

    let pitch = sourcePitches[idx] + pitchVar;
    pitch = pitch - (pitch % 1);

    // Grain envelope (implied by short duration)
    events[events.length] = {
      type: "note",
      pitch: pitch,
      start: startTime,
      duration: grainSize,
      velocity: 0.4 + (rng / 2147483648) * 0.3
    };
  }

  return {
    type: "texture",
    textureType: "granular",
    grainSize: grainSize,
    events: events
  };
}

// Time-stretch using granular
export fn timeStretch(sourcePitches, sourceDurations, stretchFactor, grainSize, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];
  let sourceTime = 0 / 1;
  let outputTime = 0 / 1;

  for (i in 0..(sourcePitches.length - 1)) {
    const pitch = sourcePitches[i];
    const dur = sourceDurations[i % sourceDurations.length];
    const stretchedDur = dur * stretchFactor;

    // Fill stretched duration with grains
    let grainTime = 0 / 1;
    while (grainTime < stretchedDur) {
      rng = (rng * 1103515245 + 12345) % 2147483648;
      const jitter = (rng / 2147483648 - 0.5) * grainSize;

      events[events.length] = {
        type: "note",
        pitch: pitch,
        start: outputTime + grainTime + jitter,
        duration: grainSize,
        velocity: 0.6
      };

      grainTime = grainTime + grainSize * 0.5;  // 50% overlap
    }

    outputTime = outputTime + stretchedDur;
  }

  return {
    type: "texture",
    textureType: "timeStretched",
    stretchFactor: stretchFactor,
    events: events
  };
}

// ============================================
// Rhythmic Texture
// ============================================

// Create rhythmic texture with pattern
export fn rhythmicTexture(pattern, pitches, baseDuration) {
  let events = [];
  let time = 0 / 1;
  let pitchIdx = 0;

  for (hit in pattern) {
    if (hit == 1) {
      events[events.length] = {
        type: "note",
        pitch: pitches[pitchIdx % pitches.length],
        start: time,
        duration: baseDuration,
        velocity: 0.8
      };
      pitchIdx = pitchIdx + 1;
    }
    time = time + baseDuration;
  }

  return {
    type: "texture",
    textureType: "rhythmic",
    events: events
  };
}

// Polyrhythmic texture
export fn polyrhythmicTexture(patterns, pitchSets, baseDuration) {
  let events = [];

  for (i in 0..(patterns.length - 1)) {
    const pattern = patterns[i];
    const pitches = pitchSets[i];
    let time = 0 / 1;
    let pitchIdx = 0;

    for (hit in pattern) {
      if (hit == 1) {
        events[events.length] = {
          type: "note",
          pitch: pitches[pitchIdx % pitches.length],
          start: time,
          duration: baseDuration,
          velocity: 0.7,
          voice: "rhythm" + i
        };
        pitchIdx = pitchIdx + 1;
      }
      time = time + baseDuration;
    }
  }

  return {
    type: "texture",
    textureType: "polyrhythmic",
    events: events
  };
}

// ============================================
// Texture Transformations
// ============================================

// Thin out texture (remove notes randomly)
export fn thin(texture, keepProbability, seed) {
  let rng = seed;
  if (rng == null) {
    rng = 12345;
  }

  let events = [];
  for (event in texture.events) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    if ((rng / 2147483648) < keepProbability) {
      events[events.length] = event;
    }
  }

  return {
    type: "texture",
    textureType: texture.textureType + "_thinned",
    events: events
  };
}

// Thicken texture (double notes with variation)
export fn thicken(texture, doublingInterval, velocityReduction) {
  let events = [];

  for (event in texture.events) {
    events[events.length] = event;

    // Add doubled note
    events[events.length] = {
      type: event.type,
      pitch: event.pitch + doublingInterval,
      start: event.start,
      duration: event.duration,
      velocity: event.velocity * velocityReduction
    };
  }

  return {
    type: "texture",
    textureType: texture.textureType + "_thickened",
    events: events
  };
}

// Transpose texture
export fn transposeTexture(texture, semitones) {
  let events = [];
  for (event in texture.events) {
    events[events.length] = {
      type: event.type,
      pitch: event.pitch + semitones,
      start: event.start,
      duration: event.duration,
      velocity: event.velocity,
      voice: event.voice
    };
  }

  return {
    type: "texture",
    textureType: texture.textureType,
    events: events
  };
}

// Time-scale texture
export fn scaleTime(texture, factor) {
  let events = [];
  for (event in texture.events) {
    events[events.length] = {
      type: event.type,
      pitch: event.pitch,
      start: event.start * factor,
      duration: event.duration * factor,
      velocity: event.velocity,
      voice: event.voice
    };
  }

  return {
    type: "texture",
    textureType: texture.textureType,
    events: events
  };
}

// ============================================
// Texture Analysis
// ============================================

// Get pitch range
export fn getPitchRange(texture) {
  let min = 127;
  let max = 0;

  for (event in texture.events) {
    if (event.pitch < min) { min = event.pitch; }
    if (event.pitch > max) { max = event.pitch; }
  }

  return { low: min, high: max, range: max - min };
}

// Get temporal span
export fn getTemporalSpan(texture) {
  let minStart = 1000000;
  let maxEnd = 0;

  for (event in texture.events) {
    if (event.start < minStart) { minStart = event.start; }
    const end = event.start + event.duration;
    if (end > maxEnd) { maxEnd = end; }
  }

  return { start: minStart, end: maxEnd, duration: maxEnd - minStart };
}

// Count voices/layers
export fn countVoices(texture) {
  let voices = {};
  for (event in texture.events) {
    const v = event.voice;
    if (v != null) {
      voices[v] = true;
    }
  }

  let count = 0;
  for (v in voices) {
    count = count + 1;
  }
  return count;
}
`;

export const STDLIB_THEORY = `// std:theory (v4)
// Music theory utilities: chords, scales, intervals, and progressions

// ============================================================================
// Internal Helpers
// ============================================================================

fn applyIntervals(root, intervals) {
  let out = [];
  for (step in intervals) {
    out[out.length] = root + step;
  }
  return out;
}

// ============================================================================
// Basic Triads
// ============================================================================

export fn majorTriad(root) {
  return [root, root + 4, root + 7];
}

export fn minorTriad(root) {
  return [root, root + 3, root + 7];
}

export fn diminished(root) {
  return [root, root + 3, root + 6];
}

export fn augmented(root) {
  return [root, root + 4, root + 8];
}

export fn sus2(root) {
  return [root, root + 2, root + 7];
}

export fn sus4(root) {
  return [root, root + 5, root + 7];
}

// ============================================================================
// Seventh Chords
// ============================================================================

export fn major7(root) {
  return [root, root + 4, root + 7, root + 11];
}

export fn minor7(root) {
  return [root, root + 3, root + 7, root + 10];
}

export fn dominant7(root) {
  return [root, root + 4, root + 7, root + 10];
}

export fn diminished7(root) {
  return [root, root + 3, root + 6, root + 9];
}

export fn halfDiminished7(root) {
  return [root, root + 3, root + 6, root + 10];
}

export fn minorMajor7(root) {
  return [root, root + 3, root + 7, root + 11];
}

export fn augmented7(root) {
  return [root, root + 4, root + 8, root + 10];
}

export fn augmentedMajor7(root) {
  return [root, root + 4, root + 8, root + 11];
}

// ============================================================================
// Extended Chords
// ============================================================================

export fn add9(root) {
  return [root, root + 4, root + 7, root + 14];
}

export fn add11(root) {
  return [root, root + 4, root + 7, root + 17];
}

export fn major9(root) {
  return [root, root + 4, root + 7, root + 11, root + 14];
}

export fn minor9(root) {
  return [root, root + 3, root + 7, root + 10, root + 14];
}

export fn dominant9(root) {
  return [root, root + 4, root + 7, root + 10, root + 14];
}

export fn major11(root) {
  return [root, root + 4, root + 7, root + 11, root + 14, root + 17];
}

export fn minor11(root) {
  return [root, root + 3, root + 7, root + 10, root + 14, root + 17];
}

export fn dominant11(root) {
  return [root, root + 4, root + 7, root + 10, root + 14, root + 17];
}

export fn major13(root) {
  return [root, root + 4, root + 7, root + 11, root + 14, root + 17, root + 21];
}

export fn minor13(root) {
  return [root, root + 3, root + 7, root + 10, root + 14, root + 17, root + 21];
}

export fn dominant13(root) {
  return [root, root + 4, root + 7, root + 10, root + 14, root + 17, root + 21];
}

// ============================================================================
// Power Chords
// ============================================================================

export fn power(root) {
  return [root, root + 7];
}

export fn power5(root) {
  return [root, root + 7, root + 12];
}

// ============================================================================
// Chord Inversions
// ============================================================================

// First inversion: move root up an octave
export fn invert1(chord) {
  if (chord.length < 2) {
    return chord;
  }
  let out = [];
  for (i in 1..(chord.length - 1)) {
    out[out.length] = chord[i];
  }
  out[out.length] = chord[0] + 12;
  return out;
}

// Second inversion: apply inversion twice
export fn invert2(chord) {
  return invert1(invert1(chord));
}

// Third inversion: apply inversion three times
export fn invert3(chord) {
  return invert1(invert2(chord));
}

// ============================================================================
// Scales - Major Modes
// ============================================================================

export fn scaleMajor(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 11, 12]);
}

// Alias for scaleMajor
export fn ionian(root) {
  return scaleMajor(root);
}

export fn dorian(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 9, 10, 12]);
}

export fn phrygian(root) {
  return applyIntervals(root, [0, 1, 3, 5, 7, 8, 10, 12]);
}

export fn lydian(root) {
  return applyIntervals(root, [0, 2, 4, 6, 7, 9, 11, 12]);
}

export fn mixolydian(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 10, 12]);
}

export fn aeolian(root) {
  return scaleMinor(root);
}

export fn locrian(root) {
  return applyIntervals(root, [0, 1, 3, 5, 6, 8, 10, 12]);
}

// ============================================================================
// Scales - Minor Variants
// ============================================================================

export fn scaleMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 8, 10, 12]);
}

export fn harmonicMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 8, 11, 12]);
}

export fn melodicMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 9, 11, 12]);
}

// ============================================================================
// Scales - Pentatonic
// ============================================================================

export fn majorPentatonic(root) {
  return applyIntervals(root, [0, 2, 4, 7, 9, 12]);
}

export fn minorPentatonic(root) {
  return applyIntervals(root, [0, 3, 5, 7, 10, 12]);
}

// ============================================================================
// Scales - Blues and Jazz
// ============================================================================

export fn blues(root) {
  return applyIntervals(root, [0, 3, 5, 6, 7, 10, 12]);
}

export fn bebop(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 10, 11, 12]);
}

export fn wholeTone(root) {
  return applyIntervals(root, [0, 2, 4, 6, 8, 10, 12]);
}

export fn diminishedHalfWhole(root) {
  return applyIntervals(root, [0, 1, 3, 4, 6, 7, 9, 10, 12]);
}

export fn diminishedWholeHalf(root) {
  return applyIntervals(root, [0, 2, 3, 5, 6, 8, 9, 11, 12]);
}

// ============================================================================
// Scales - World Music
// ============================================================================

export fn japanese(root) {
  return applyIntervals(root, [0, 1, 5, 7, 8, 12]);
}

export fn hirajoshi(root) {
  return applyIntervals(root, [0, 2, 3, 7, 8, 12]);
}

export fn hungarian(root) {
  return applyIntervals(root, [0, 2, 3, 6, 7, 8, 11, 12]);
}

export fn gypsy(root) {
  return applyIntervals(root, [0, 1, 4, 5, 7, 8, 10, 12]);
}

export fn arabian(root) {
  return applyIntervals(root, [0, 2, 4, 5, 6, 8, 10, 12]);
}

// ============================================================================
// Chromatic Scale
// ============================================================================

export fn chromatic(root) {
  return applyIntervals(root, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
}

// ============================================================================
// Intervals
// ============================================================================

export fn unison(pitch) {
  return pitch;
}

export fn minorSecond(pitch) {
  return pitch + 1;
}

export fn majorSecond(pitch) {
  return pitch + 2;
}

export fn minorThird(pitch) {
  return pitch + 3;
}

export fn majorThird(pitch) {
  return pitch + 4;
}

export fn perfectFourth(pitch) {
  return pitch + 5;
}

export fn tritone(pitch) {
  return pitch + 6;
}

export fn perfectFifth(pitch) {
  return pitch + 7;
}

export fn minorSixth(pitch) {
  return pitch + 8;
}

export fn majorSixth(pitch) {
  return pitch + 9;
}

export fn minorSeventh(pitch) {
  return pitch + 10;
}

export fn majorSeventh(pitch) {
  return pitch + 11;
}

export fn octave(pitch) {
  return pitch + 12;
}

// ============================================================================
// Transpose Functions
// ============================================================================

export fn transposeUp(pitch, semitones) {
  return pitch + semitones;
}

export fn transposeDown(pitch, semitones) {
  return pitch - semitones;
}

export fn transposeOctave(pitch, octaves) {
  return pitch + (octaves * 12);
}

// ============================================================================
// Pitch Utilities
// ============================================================================

// Get the pitch class (0-11) from a MIDI pitch
export fn pitchClass(pitch) {
  return pitch % 12;
}

// Get the octave number from a MIDI pitch
export fn octaveOf(pitch) {
  const result = (pitch / 12) - 1;
  return result - (result % 1);
}

// Create a pitch from pitch class and octave
export fn makePitch(class, oct) {
  return (oct + 1) * 12 + class;
}

// ============================================================================
// Chord Analysis
// ============================================================================

// Get root note of a chord (lowest note)
export fn chordRoot(chord) {
  if (chord.length == 0) {
    return null;
  }
  return chord[0];
}

// Get chord intervals from root
export fn chordIntervals(chord) {
  if (chord.length == 0) {
    return [];
  }
  const root = chord[0];
  let out = [];
  for (p in chord) {
    out[out.length] = p - root;
  }
  return out;
}

// ============================================================================
// Arpeggio Patterns
// ============================================================================

// Ascending arpeggio (bottom to top)
export fn arpeggioUp(chord) {
  return chord;
}

// Descending arpeggio (top to bottom)
export fn arpeggioDown(chord) {
  let out = [];
  let i = chord.length - 1;
  for (_ in chord) {
    out[out.length] = chord[i];
    i = i - 1;
  }
  return out;
}

// Ascending then descending (alberti bass style)
export fn arpeggioUpDown(chord) {
  let up = chord;
  let down = arpeggioDown(chord);
  let out = [];
  for (p in up) {
    out[out.length] = p;
  }
  // Skip first note of down to avoid repeat
  let i = 1;
  for (_ in 1..(down.length - 1)) {
    out[out.length] = down[i];
    i = i + 1;
  }
  return out;
}

// Descending then ascending
export fn arpeggioDownUp(chord) {
  let down = arpeggioDown(chord);
  let up = chord;
  let out = [];
  for (p in down) {
    out[out.length] = p;
  }
  let i = 1;
  for (_ in 1..(up.length - 1)) {
    out[out.length] = up[i];
    i = i + 1;
  }
  return out;
}

// Alberti bass pattern: low-high-mid-high
export fn arpeggioAlberti(chord) {
  if (chord.length < 3) {
    return chord;
  }
  return [chord[0], chord[2], chord[1], chord[2]];
}

// Broken chord: low-mid-high-mid
export fn arpeggioBroken(chord) {
  if (chord.length < 3) {
    return chord;
  }
  return [chord[0], chord[1], chord[2], chord[1]];
}

// Add octave above to arpeggio
export fn arpeggioWithOctave(chord) {
  let out = [];
  for (p in chord) {
    out[out.length] = p;
  }
  out[out.length] = chord[0] + 12;
  return out;
}

// Double arpeggio (two octaves)
export fn arpeggioDouble(chord) {
  let out = [];
  for (p in chord) {
    out[out.length] = p;
  }
  for (p in chord) {
    out[out.length] = p + 12;
  }
  return out;
}

// ============================================================================
// Chord Progressions
// ============================================================================

// Get diatonic chord for scale degree (1-7)
// mode: "major" or "minor"
fn diatonicChord(root, degree, mode) {
  // Major scale intervals: W W H W W W H
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
  // Minor scale intervals: W H W W H W W
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10];

  let intervals = majorIntervals;
  if (mode == "minor") {
    intervals = minorIntervals;
  }

  const idx = degree - 1;
  const chordRoot = root + intervals[idx];

  // Determine chord quality based on degree
  if (mode == "major") {
    // I, IV, V = major; ii, iii, vi = minor; vii = dim
    if (degree == 1 || degree == 4 || degree == 5) {
      return majorTriad(chordRoot);
    } else if (degree == 2 || degree == 3 || degree == 6) {
      return minorTriad(chordRoot);
    } else {
      return diminished(chordRoot);
    }
  } else {
    // Minor: i, iv, v = minor; III, VI, VII = major; ii = dim
    if (degree == 1 || degree == 4 || degree == 5) {
      return minorTriad(chordRoot);
    } else if (degree == 3 || degree == 6 || degree == 7) {
      return majorTriad(chordRoot);
    } else {
      return diminished(chordRoot);
    }
  }
}

// ii-V-I progression in major key
export fn progressionTwoFiveOne(root) {
  return [
    minorTriad(root + 2),
    majorTriad(root + 7),
    majorTriad(root)
  ];
}

// ii-V-I with 7th chords (jazz)
export fn progressionTwoFiveOneJazz(root) {
  return [
    minor7(root + 2),
    dominant7(root + 7),
    major7(root)
  ];
}

// I-IV-V-I (basic rock/pop)
export fn progressionOneFourFive(root) {
  return [
    majorTriad(root),
    majorTriad(root + 5),
    majorTriad(root + 7),
    majorTriad(root)
  ];
}

// I-V-vi-IV (pop progression)
export fn progressionPopCanon(root) {
  return [
    majorTriad(root),
    majorTriad(root + 7),
    minorTriad(root + 9),
    majorTriad(root + 5)
  ];
}

// vi-IV-I-V (pop progression variant)
export fn progressionSixFourOneFive(root) {
  return [
    minorTriad(root + 9),
    majorTriad(root + 5),
    majorTriad(root),
    majorTriad(root + 7)
  ];
}

// I-vi-IV-V (50s progression)
export fn progressionFifties(root) {
  return [
    majorTriad(root),
    minorTriad(root + 9),
    majorTriad(root + 5),
    majorTriad(root + 7)
  ];
}

// i-VII-VI-VII (minor key rock)
export fn progressionMinorRock(root) {
  return [
    minorTriad(root),
    majorTriad(root + 10),
    majorTriad(root + 8),
    majorTriad(root + 10)
  ];
}

// Circle of fifths progression (shortened)
export fn progressionCircleOfFifths(root) {
  return [
    majorTriad(root),
    majorTriad(root + 7),
    majorTriad(root + 2),
    majorTriad(root + 9),
    majorTriad(root + 4),
    majorTriad(root + 11),
    majorTriad(root + 6)
  ];
}

// Blues progression (12-bar outline, just unique chords)
export fn progressionBlues(root) {
  return [
    dominant7(root),      // I7
    dominant7(root + 5),  // IV7
    dominant7(root + 7)   // V7
  ];
}

// Jazz turnaround: I-vi-ii-V
export fn progressionTurnaround(root) {
  return [
    major7(root),
    minor7(root + 9),
    minor7(root + 2),
    dominant7(root + 7)
  ];
}

// Andalusian cadence: i-VII-VI-V
export fn progressionAndalusian(root) {
  return [
    minorTriad(root),
    majorTriad(root + 10),
    majorTriad(root + 8),
    majorTriad(root + 7)
  ];
}

// Royal Road progression (Japanese pop): IV-V-iii-vi
export fn progressionRoyalRoad(root) {
  return [
    majorTriad(root + 5),
    majorTriad(root + 7),
    minorTriad(root + 4),
    minorTriad(root + 9)
  ];
}

// ============================================================================
// Expression / Dynamics Utilities
// ============================================================================

// Velocity constants
export const ppp = 0.15;
export const pp = 0.25;
export const p = 0.4;
export const mp = 0.55;
export const mf = 0.65;
export const f = 0.75;
export const ff = 0.85;
export const fff = 0.95;

// Linear velocity ramp from start to end over count steps
export fn velocityRamp(startVel, endVel, count) {
  if (count <= 1) {
    return [startVel];
  }
  let out = [];
  const step = (endVel - startVel) / (count - 1);
  let current = startVel;
  let i = 0;
  for (_ in 0..(count - 1)) {
    out[out.length] = current;
    current = current + step;
    i = i + 1;
  }
  return out;
}

// Crescendo: gradually increase velocity
export fn crescendo(startVel, endVel, count) {
  return velocityRamp(startVel, endVel, count);
}

// Decrescendo: gradually decrease velocity
export fn decrescendo(startVel, endVel, count) {
  return velocityRamp(startVel, endVel, count);
}

// Accent pattern: emphasize every Nth note
export fn accentPattern(baseVel, accentVel, count, accentEvery) {
  let out = [];
  let i = 0;
  for (_ in 0..(count - 1)) {
    if (i % accentEvery == 0) {
      out[out.length] = accentVel;
    } else {
      out[out.length] = baseVel;
    }
    i = i + 1;
  }
  return out;
}

// Swing pattern velocities (strong-weak)
export fn swingVelocities(strongVel, weakVel, count) {
  let out = [];
  let i = 0;
  for (_ in 0..(count - 1)) {
    if (i % 2 == 0) {
      out[out.length] = strongVel;
    } else {
      out[out.length] = weakVel;
    }
    i = i + 1;
  }
  return out;
}

// Random velocity variation around a base value
// Simplified version that generates deterministic variation
export fn humanizeVelocity(baseVel, variation, count, seed) {
  let out = [];
  for (i in 0..(count - 1)) {
    // Simple deterministic variation based on index and seed
    const factor = ((seed + i * 7919) % 1000) / 1000.0;
    const delta = (factor - 0.5) * 2 * variation;
    let vel = baseVel + delta;
    if (vel < 0.0) {
      vel = 0.0;
    }
    if (vel > 1.0) {
      vel = 1.0;
    }
    out[i] = vel;
  }
  return out;
}

// ============================================================================
// Rhythm Utilities
// ============================================================================

// Generate a sequence of durations from a rhythm pattern string
// Pattern uses: w=whole, h=half, q=quarter, e=eighth, s=sixteenth
// Example: "q q e e q" for a simple pattern
export fn rhythmPattern(pattern) {
  let durations = [];
  let i = 0;
  const len = pattern.length;
  for (_ in 0..(len - 1)) {
    const c = pattern[i];
    if (c == "w") {
      durations[durations.length] = w;
    } else if (c == "h") {
      durations[durations.length] = h;
    } else if (c == "q") {
      durations[durations.length] = q;
    } else if (c == "e") {
      durations[durations.length] = e;
    } else if (c == "s") {
      durations[durations.length] = s;
    }
    i = i + 1;
  }
  return durations;
}

// Common rhythm patterns
export fn rhythmStraightFour() {
  return [q, q, q, q];
}

export fn rhythmStraightEight() {
  return [e, e, e, e, e, e, e, e];
}

export fn rhythmSyncopated() {
  return [e, q, e, q, e, e];
}

export fn rhythmDotted() {
  return [q., e, q., e];
}

export fn rhythmTriplet() {
  // Triplet eighth notes (3 in time of 2)
  return [e, e, e];
}

// ============================================================================
// Aliases for Common Functions
// ============================================================================

// Triad aliases (shorter names)
export fn maj(root) { return majorTriad(root); }
export fn min(root) { return minorTriad(root); }
export fn dim(root) { return diminished(root); }
export fn aug(root) { return augmented(root); }

// 7th chord aliases
export fn maj7(root) { return major7(root); }
export fn min7(root) { return minor7(root); }
export fn dom7(root) { return dominant7(root); }
export fn dim7(root) { return diminished7(root); }

// Extended chord aliases
export fn maj9(root) { return major9(root); }
export fn min9(root) { return minor9(root); }
export fn dom9(root) { return dominant9(root); }

// Scale aliases
export fn major(root) { return scaleMajor(root); }
export fn minor(root) { return scaleMinor(root); }

// Backward compatibility alias
export fn progressionSixFourOneFlve(root) { return progressionSixFourOneFive(root); }

// ============================================================================
// Advanced Chord Analysis
// ============================================================================

// Analyze pitches and return chord symbol info
// Returns: { root, quality, intervals }
export fn analyze(pitches) {
  if (pitches.length == 0) {
    return null;
  }
  const root = pitches[0];
  let intervals = [];
  for (p in pitches) {
    intervals[intervals.length] = (p - root) % 12;
  }

  // Sort and dedupe intervals
  let unique = [];
  for (iv in intervals) {
    let found = false;
    for (u in unique) {
      if (u == iv) {
        found = true;
      }
    }
    if (!found) {
      unique[unique.length] = iv;
    }
  }
  // Sort using native O(n log n) sort
  unique = sort(unique);

  // Determine quality based on intervals
  let quality = "unknown";
  const hasMinor3 = containsInterval(unique, 3);
  const hasMajor3 = containsInterval(unique, 4);
  const hasDim5 = containsInterval(unique, 6);
  const hasPerfect5 = containsInterval(unique, 7);
  const hasAug5 = containsInterval(unique, 8);
  const hasMinor7 = containsInterval(unique, 10);
  const hasMajor7 = containsInterval(unique, 11);

  if (hasMajor3 && hasPerfect5 && hasMajor7) {
    quality = "maj7";
  } else if (hasMinor3 && hasPerfect5 && hasMinor7) {
    quality = "min7";
  } else if (hasMajor3 && hasPerfect5 && hasMinor7) {
    quality = "dom7";
  } else if (hasMinor3 && hasDim5 && hasMinor7) {
    quality = "m7b5";
  } else if (hasMinor3 && hasDim5) {
    quality = "dim";
  } else if (hasMajor3 && hasAug5) {
    quality = "aug";
  } else if (hasMajor3 && hasPerfect5) {
    quality = "maj";
  } else if (hasMinor3 && hasPerfect5) {
    quality = "min";
  } else if (containsInterval(unique, 2) && hasPerfect5) {
    quality = "sus2";
  } else if (containsInterval(unique, 5) && hasPerfect5) {
    quality = "sus4";
  }

  return { root: root, quality: quality, intervals: unique };
}

fn containsInterval(intervals, target) {
  for (iv in intervals) {
    if (iv == target) {
      return true;
    }
  }
  return false;
}

// Find common tones between two chords
export fn commonTones(a, b) {
  let common = [];
  for (pa in a) {
    const pcA = pa % 12;
    for (pb in b) {
      const pcB = pb % 12;
      if (pcA == pcB) {
        common[common.length] = pa;
      }
    }
  }
  return common;
}

// Voice leading: revoice 'target' chord to minimize movement from 'source' chord
export fn voiceLead(source, target) {
  if (source.length == 0 || target.length == 0) {
    return target;
  }

  let result = [];
  // For each target pitch, find the best octave to minimize distance
  for (tgtPitch in target) {
    const targetPC = tgtPitch % 12;
    let bestPitch = tgtPitch;
    let bestDistance = 1000;

    // Try different octaves
    for (octave in 0..8) {
      const candidate = targetPC + (octave * 12);
      // Find minimum distance to any note in 'source'
      for (srcPitch in source) {
        let dist = candidate - srcPitch;
        if (dist < 0) {
          dist = 0 - dist;
        }
        if (dist < bestDistance) {
          bestDistance = dist;
          bestPitch = candidate;
        }
      }
    }
    result[result.length] = bestPitch;
  }
  return result;
}

// Get chord for scale degree
export fn degreeToChord(scale, degree, chordType) {
  if (scale.length == 0 || degree < 1) {
    return [];
  }
  const idx = (degree - 1) % scale.length;
  const root = scale[idx];

  if (chordType == "maj" || chordType == "major") {
    return majorTriad(root);
  } else if (chordType == "min" || chordType == "minor") {
    return minorTriad(root);
  } else if (chordType == "dim" || chordType == "diminished") {
    return diminished(root);
  } else if (chordType == "aug" || chordType == "augmented") {
    return augmented(root);
  } else if (chordType == "maj7") {
    return major7(root);
  } else if (chordType == "min7") {
    return minor7(root);
  } else if (chordType == "dom7") {
    return dominant7(root);
  }
  // Default to major triad
  return majorTriad(root);
}

// Add chord extensions/alterations
export fn add2(root) {
  return [root, root + 2, root + 4, root + 7];
}

export fn add4(root) {
  return [root, root + 4, root + 5, root + 7];
}

export fn six(root) {
  return [root, root + 4, root + 7, root + 9];
}

export fn sixNine(root) {
  return [root, root + 4, root + 7, root + 9, root + 14];
}

export fn minorSix(root) {
  return [root, root + 3, root + 7, root + 9];
}

// Chord alterations
export fn sharpFive(chord) {
  let result = [];
  for (p in chord) {
    const interval = (p - chord[0]) % 12;
    if (interval == 7) {
      result[result.length] = p + 1;  // Raise perfect 5th
    } else {
      result[result.length] = p;
    }
  }
  return result;
}

export fn flatFive(chord) {
  let result = [];
  for (p in chord) {
    const interval = (p - chord[0]) % 12;
    if (interval == 7) {
      result[result.length] = p - 1;  // Lower perfect 5th
    } else {
      result[result.length] = p;
    }
  }
  return result;
}

export fn sharpNine(chord) {
  // Add #9 to a chord
  let result = [];
  for (p in chord) {
    result[result.length] = p;
  }
  result[result.length] = chord[0] + 15;  // #9 = minor 10th
  return result;
}

export fn flatNine(chord) {
  // Add b9 to a chord
  let result = [];
  for (p in chord) {
    result[result.length] = p;
  }
  result[result.length] = chord[0] + 13;  // b9 = minor 9th
  return result;
}

// Transpose progression to new key
export fn modulate(progression, fromRoot, toRoot) {
  const interval = toRoot - fromRoot;
  let result = [];
  for (chord in progression) {
    let transposed = [];
    for (p in chord) {
      transposed[transposed.length] = p + interval;
    }
    result[result.length] = transposed;
  }
  return result;
}
`;

export const STDLIB_TIME = `// std:time (v4)

export fn barBeat(bar, beat) {
  return { kind: "posref", bar: bar, beat: beat };
}

fn parseMeterMap(value) {
  if (value == null) {
    return [];
  }
  if (value.meterMap != null) {
    return value.meterMap;
  }
  return value;
}

fn resolveMeterMap(events) {
  let resolved = [];
  for (ev in events) {
    const at = resolvePosAgainst(ev.at, resolved);
    resolved[resolved.length] = {
      at: at,
      numerator: ev.numerator,
      denominator: ev.denominator
    };
  }
  return resolved;
}

fn resolvePosAgainst(pos, meterMap) {
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind == "posexpr") {
    return resolvePosAgainst(pos.base, meterMap) + pos.offset;
  }
  if (pos.kind == "posref") {
    return resolvePosRef(pos, meterMap);
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return 0 / 1;
}

fn resolvePosRef(ref, meterMap) {
  if (meterMap.length == 0) {
    if (ref.bar == 1 && ref.beat == 1) {
      return 0 / 1;
    }
    return 0 / 1;
  }
  let current = meterMap[0];
  let currentPos = 0 / 1;
  let idx = 0;
  const bars = ref.bar - 1;
  for (step in 0..(bars - 1)) {
    const barLen = current.numerator / current.denominator;
    currentPos = currentPos + barLen;
    for (scan in 0..(meterMap.length - 1)) {
      if (idx + 1 < meterMap.length && meterMap[idx + 1].at == currentPos) {
        idx = idx + 1;
        current = meterMap[idx];
      }
    }
  }
  const beatLen = 1 / current.denominator;
  const offset = beatLen * (ref.beat - 1);
  return currentPos + offset;
}

export fn resolvePos(pos, meterMap) {
  const events = parseMeterMap(meterMap);
  const resolved = resolveMeterMap(events);
  return resolvePosAgainst(pos, resolved);
}

export fn dur(n, d) {
  return n / d;
}

export fn dot(d) {
  return d + (d / 2);
}

export const w = 1 / 1;
export const h = 1 / 2;
export const q = 1 / 4;
export const e = 1 / 8;
export const s = 1 / 16;
export const t = 1 / 32;
export const x = 1 / 64;

export const whole = w;
export const half = h;
export const quarter = q;
export const eighth = e;
export const sixteenth = s;
export const thirtySecond = t;
export const sixtyFourth = x;

// getMeterMap - extract meter events from a score
export fn getMeterMap(score) {
  if (score == null) {
    return [];
  }
  if (score.meterMap != null) {
    return score.meterMap;
  }
  return [];
}
`;

export const STDLIB_TRANSFORM = `// std:transform (v4)

fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn ratToNumber(r) {
  return r.n / r.d;
}

fn floor(value) {
  return value - (value % 1);
}

fn round(value) {
  return floor(value + 0.5);
}

fn ratFromNumber(value) {
  const scaled = round(value * 1000);
  return scaled / 1000;
}

fn scalePos(pos, factor) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  return r * factor;
}

fn quantizePos(pos, grid, strength) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  const ratio = ratToNumber(r) / ratToNumber(grid);
  const snapped = round(ratio) * ratToNumber(grid);
  if (strength >= 1) {
    return ratFromNumber(snapped);
  }
  const blended = ratToNumber(r) + (snapped - ratToNumber(r)) * strength;
  return ratFromNumber(blended);
}

fn swingPos(pos, grid, amount) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  const ratio = ratToNumber(r) / ratToNumber(grid);
  const idx = floor(ratio);
  const isOff = (idx % 2) == 1;
  if (!isOff) {
    return pos;
  }
  const offset = ratToNumber(grid) * amount * 0.5;
  return ratFromNumber(ratToNumber(r) + offset);
}

fn offsetPos(pos, offset) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  return ratFromNumber(ratToNumber(r) + offset);
}

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  return ev;
}

fn transposeEvent(ev, semitones) {
  let out = cloneEvent(ev);
  if (out.type == "note") {
    out.pitch = out.pitch + semitones;
  }
  if (out.type == "chord") {
    let pitches = [];
    for (p in out.pitches) {
      pitches[pitches.length] = p + semitones;
    }
    out.pitches = pitches;
  }
  return out;
}

fn stretchEvent(ev, factor) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = scalePos(out.pos, factor);
    return out;
  }
  if (out.type == "automation") {
    out.start = scalePos(out.start, factor);
    out.end = scalePos(out.end, factor);
    return out;
  }
  if (out.type == "note" || out.type == "chord" || out.type == "drumHit") {
    out.start = scalePos(out.start, factor);
    out.dur = out.dur * factor;
    return out;
  }
  if (out.type == "control") {
    out.start = scalePos(out.start, factor);
    return out;
  }
  return out;
}

fn quantizeEvent(ev, grid, strength) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = quantizePos(out.pos, grid, strength);
    return out;
  }
  if (out.type == "automation") {
    out.start = quantizePos(out.start, grid, strength);
    out.end = quantizePos(out.end, grid, strength);
    return out;
  }
  if (out.start != null) {
    out.start = quantizePos(out.start, grid, strength);
  }
  return out;
}

fn swingEvent(ev, grid, amount) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = swingPos(out.pos, grid, amount);
    return out;
  }
  if (out.type == "automation") {
    out.start = swingPos(out.start, grid, amount);
    out.end = swingPos(out.end, grid, amount);
    return out;
  }
  if (out.start != null) {
    out.start = swingPos(out.start, grid, amount);
  }
  return out;
}

fn hashFloat(rng, seed) {
  let base = 123456789;
  if (rng != null && rng.state != null) {
    base = rng.state;
  }
  const hashed = (base + seed * 2654435761) % 4294967296;
  return (hashed % 10000) / 10000;
}

fn humanizeEvent(ev, rng, timing, velocity, idx) {
  let out = cloneEvent(ev);
  const jitter = timing * (hashFloat(rng, idx) - 0.5) * 2;
  if (out.type == "marker") {
    out.pos = offsetPos(out.pos, jitter);
    return out;
  }
  if (out.type == "automation") {
    out.start = offsetPos(out.start, jitter);
    out.end = offsetPos(out.end, jitter);
    return out;
  }
  if (out.start != null) {
    out.start = offsetPos(out.start, jitter);
    if (out.velocity != null) {
      const vel = out.velocity;
      out.velocity = vel * (1 + velocity * (hashFloat(rng, idx + 1) - 0.5));
    }
  }
  return out;
}

export fn transpose(c, semitones) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = transposeEvent(ev, semitones);
  }
  return { events: events, length: c.length };
}

export fn stretch(c, factor) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = stretchEvent(ev, factor);
  }
  let length = null;
  if (c.length != null) {
    length = c.length * factor;
  }
  return { events: events, length: length };
}

export fn quantize(c, grid, strength) {
  let amount = strength;
  if (amount == null) {
    amount = 1;
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = quantizeEvent(ev, grid, amount);
  }
  return { events: events, length: c.length };
}

export fn swing(c, grid, amount) {
  let swingAmount = amount;
  if (swingAmount == null) {
    swingAmount = 0.5;
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = swingEvent(ev, grid, swingAmount);
  }
  return { events: events, length: c.length };
}

export fn humanize(c, rng, timing, velocity) {
  let timingAmount = timing;
  let v = velocity;
  if (timingAmount == null) {
    timingAmount = 0;
  }
  if (v == null) {
    v = 0;
  }
  let events = [];
  let idx = 0;
  for (ev in c.events) {
    events[events.length] = humanizeEvent(ev, rng, timingAmount, v, idx);
    idx = idx + 1;
  }
  // Update rng state based on number of events processed
  let newState = 123456789;
  if (rng != null && rng.state != null) {
    newState = rng.state;
  }
  const finalState = (newState + idx * 2654435761) % 4294967296;
  const newRng = { state: finalState };
  const result = { events: events, length: c.length };
  return [newRng, result];
}
`;

export const STDLIB_TUNING = `// std:tuning (v4)
// Functions for working with alternative tuning systems and microtonal music

// ============================================================================
// Just Intonation Constants
// ============================================================================

// Just intonation ratios (frequency ratios relative to root)
// These are the pure harmonic intervals based on the overtone series
export const JUST_RATIOS = {
  unison: 1 / 1,
  minorSecond: 16 / 15,
  majorSecond: 9 / 8,
  minorThird: 6 / 5,
  majorThird: 5 / 4,
  perfectFourth: 4 / 3,
  tritone: 45 / 32,
  perfectFifth: 3 / 2,
  minorSixth: 8 / 5,
  majorSixth: 5 / 3,
  minorSeventh: 9 / 5,
  majorSeventh: 15 / 8,
  octave: 2 / 1
};

// Convert frequency ratio to cents deviation from equal temperament
// ratio: frequency ratio (e.g., 3/2 for perfect fifth)
// returns: cents deviation from equal temperament
fn ratioToCents(ratio) {
  // cents = 1200 * log2(ratio) - ET_cents
  // For this, we need to compare against ET
  // log2(ratio) = ln(ratio) / ln(2)
  // We'll use approximation: ln(x) ≈ (x-1) - (x-1)^2/2 + (x-1)^3/3 for x near 1
  // Or use the pre-computed values below
  return null; // Placeholder - see JUST_CENTS for pre-computed values
}

// Pre-computed cents deviations from 12-TET for just intervals
// Positive = sharper than ET, Negative = flatter than ET
export const JUST_CENTS = {
  unison: 0,
  minorSecond: 12,      // 16/15 vs 2^(1/12) = +11.73 cents
  majorSecond: 4,       // 9/8 vs 2^(2/12) = +3.91 cents
  minorThird: 16,       // 6/5 vs 2^(3/12) = +15.64 cents
  majorThird: -14,      // 5/4 vs 2^(4/12) = -13.69 cents
  perfectFourth: -2,    // 4/3 vs 2^(5/12) = -1.96 cents
  tritone: -10,         // 45/32 vs 2^(6/12) = -9.78 cents
  perfectFifth: 2,      // 3/2 vs 2^(7/12) = +1.96 cents
  minorSixth: 14,       // 8/5 vs 2^(8/12) = +13.69 cents
  majorSixth: -16,      // 5/3 vs 2^(9/12) = -15.64 cents
  minorSeventh: 18,     // 9/5 vs 2^(10/12) = +17.60 cents
  majorSeventh: -12,    // 15/8 vs 2^(11/12) = -11.73 cents
  octave: 0
};

// Semitone offsets for interval names (for pitch calculation)
const INTERVAL_SEMITONES = {
  unison: 0,
  minorSecond: 1,
  majorSecond: 2,
  minorThird: 3,
  majorThird: 4,
  perfectFourth: 5,
  tritone: 6,
  perfectFifth: 7,
  minorSixth: 8,
  majorSixth: 9,
  minorSeventh: 10,
  majorSeventh: 11,
  octave: 12
};

// ============================================================================
// Just Intonation Functions
// ============================================================================

// Get cents adjustment for a just interval
// interval: string name of interval (e.g., "majorThird", "perfectFifth")
// returns: cents adjustment from equal temperament
export fn justCents(interval) {
  const cents = JUST_CENTS[interval];
  if (cents == null) {
    return 0;
  }
  return cents;
}

// Create a pitch with just intonation cents adjustment
// root: base pitch (e.g., C4)
// interval: string name of interval
// returns: pitch with cents adjustment for just intonation
export fn justPitch(root, interval) {
  const semitones = INTERVAL_SEMITONES[interval];
  const cents = JUST_CENTS[interval];

  if (semitones == null || cents == null) {
    return root;
  }

  // Create new pitch with adjusted MIDI and cents
  return {
    midi: root.midi + semitones,
    cents: (root.cents ?? 0) + cents
  };
}

// Create a just-intoned chord from a root and list of intervals
// root: base pitch
// intervals: array of interval names (e.g., ["majorThird", "perfectFifth"])
// returns: array of pitches with just intonation
export fn justChord(root, intervals) {
  let result = [root];

  for (interval in intervals) {
    result[result.length] = justPitch(root, interval);
  }

  return result;
}

// Common just-intoned chord helpers
export fn justMajorTriad(root) {
  return justChord(root, ["majorThird", "perfectFifth"]);
}

export fn justMinorTriad(root) {
  return justChord(root, ["minorThird", "perfectFifth"]);
}

export fn justMajorSeventh(root) {
  return justChord(root, ["majorThird", "perfectFifth", "majorSeventh"]);
}

export fn justMinorSeventh(root) {
  return justChord(root, ["minorThird", "perfectFifth", "minorSeventh"]);
}

export fn justDominantSeventh(root) {
  return justChord(root, ["majorThird", "perfectFifth", "minorSeventh"]);
}

// ============================================================================
// Equal Division of the Octave (EDO) Systems
// ============================================================================

// Calculate cents per step for an EDO system
// divisions: number of equal divisions of the octave
// returns: cents per step
export fn edoCentsPerStep(divisions) {
  return 1200 / divisions;
}

// Calculate cents for a specific step in an EDO system
// divisions: number of equal divisions of the octave
// step: step number (0 = unison, divisions = octave)
// returns: cents from the root
export fn edoStepCents(divisions, step) {
  return (1200 * step) / divisions;
}

// Calculate deviation from 12-TET for an EDO step
// divisions: number of divisions
// step: step number in the EDO system
// nearestSemitone: the nearest 12-TET semitone
// returns: cents deviation from 12-TET
export fn edoDeviation(divisions, step, nearestSemitone) {
  const edoCents = edoStepCents(divisions, step);
  const etCents = nearestSemitone * 100;
  return edoCents - etCents;
}

// Create a pitch in an EDO system
// root: base pitch
// divisions: number of equal divisions
// step: step number from root
// returns: pitch with appropriate cents adjustment
export fn edoPitch(root, divisions, step) {
  const totalCents = edoStepCents(divisions, step);
  const semitones = totalCents / 100;
  const wholeSemitones = match (semitones >= 0) {
    true -> semitones - (semitones % 1)
    else -> semitones - (semitones % 1) - 1
  };
  const centsFraction = (semitones - wholeSemitones) * 100;

  return {
    midi: root.midi + wholeSemitones,
    cents: (root.cents ?? 0) + centsFraction
  };
}

// Common EDO systems
export const EDO_19 = 19;  // 19-tone equal temperament (meantone-like)
export const EDO_24 = 24;  // Quarter-tone scale
export const EDO_31 = 31;  // 31-tone equal temperament
export const EDO_53 = 53;  // 53-tone equal temperament (approximates just intonation well)

// ============================================================================
// Quarter Tones
// ============================================================================

// Quarter tone constants (24-EDO)
export const QUARTER_SHARP = 50;   // +50 cents
export const QUARTER_FLAT = -50;   // -50 cents
export const THREE_QUARTER_SHARP = 150;
export const THREE_QUARTER_FLAT = -150;

// Create a quarter-tone adjusted pitch
// pitch: base pitch
// adjustment: one of QUARTER_SHARP, QUARTER_FLAT, etc.
// returns: pitch with cents adjustment
export fn quarterTone(pitch, adjustment) {
  return {
    midi: pitch.midi,
    cents: (pitch.cents ?? 0) + adjustment
  };
}

// Convenience functions for quarter tones
export fn quarterSharp(pitch) {
  return quarterTone(pitch, QUARTER_SHARP);
}

export fn quarterFlat(pitch) {
  return quarterTone(pitch, QUARTER_FLAT);
}

export fn threeQuarterSharp(pitch) {
  return quarterTone(pitch, THREE_QUARTER_SHARP);
}

export fn threeQuarterFlat(pitch) {
  return quarterTone(pitch, THREE_QUARTER_FLAT);
}

// ============================================================================
// Pythagorean Tuning
// ============================================================================

// Pythagorean tuning uses only perfect fifths (3:2) to derive all intervals
// This creates pure fifths but rather harsh thirds
export const PYTHAGOREAN_CENTS = {
  unison: 0,
  minorSecond: -10,     // 256/243
  majorSecond: 4,       // 9/8 (same as just)
  minorThird: -6,       // 32/27
  majorThird: 8,        // 81/64 (Pythagorean ditone, quite sharp)
  perfectFourth: -2,    // 4/3 (same as just)
  tritone: 12,          // 729/512
  perfectFifth: 2,      // 3/2 (same as just)
  minorSixth: -8,       // 128/81
  majorSixth: 6,        // 27/16
  minorSeventh: -4,     // 16/9
  majorSeventh: 10,     // 243/128
  octave: 0
};

export fn pythagoreanCents(interval) {
  const cents = PYTHAGOREAN_CENTS[interval];
  if (cents == null) {
    return 0;
  }
  return cents;
}

export fn pythagoreanPitch(root, interval) {
  const semitones = INTERVAL_SEMITONES[interval];
  const cents = PYTHAGOREAN_CENTS[interval];

  if (semitones == null || cents == null) {
    return root;
  }

  return {
    midi: root.midi + semitones,
    cents: (root.cents ?? 0) + cents
  };
}

// ============================================================================
// Meantone Temperament
// ============================================================================

// Quarter-comma meantone (most common historical meantone)
// Tempers the fifth slightly flat to achieve pure major thirds
export const MEANTONE_CENTS = {
  unison: 0,
  minorSecond: 17,      // diatonic semitone
  majorSecond: -7,      // whole tone
  minorThird: 10,       // minor third
  majorThird: -14,      // pure major third (5/4)
  perfectFourth: 3,     // fourth
  tritone: -10,         // tritone
  perfectFifth: -3,     // tempered fifth
  minorSixth: 14,       // minor sixth
  majorSixth: -10,      // major sixth
  minorSeventh: 7,      // minor seventh
  majorSeventh: -17,    // major seventh
  octave: 0
};

export fn meantoneCents(interval) {
  const cents = MEANTONE_CENTS[interval];
  if (cents == null) {
    return 0;
  }
  return cents;
}

export fn meantonePitch(root, interval) {
  const semitones = INTERVAL_SEMITONES[interval];
  const cents = MEANTONE_CENTS[interval];

  if (semitones == null || cents == null) {
    return root;
  }

  return {
    midi: root.midi + semitones,
    cents: (root.cents ?? 0) + cents
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

// Adjust all notes in a clip by a fixed cents amount
// c: input clip
// centsAdjust: cents to add to all pitches
// returns: clip with adjusted pitches
export fn adjustCents(c, centsAdjust) {
  let events = [];

  for (ev in c.events) {
    if (ev.type == "note") {
      events[events.length] = {
        type: "note",
        start: ev.start,
        dur: ev.dur,
        pitch: {
          midi: ev.pitch.midi,
          cents: (ev.pitch.cents ?? 0) + centsAdjust
        },
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        lyric: ev.lyric,
        ext: ev.ext
      };
    } else if (ev.type == "chord") {
      let adjustedPitches = [];
      for (p in ev.pitches) {
        adjustedPitches[adjustedPitches.length] = {
          midi: p.midi,
          cents: (p.cents ?? 0) + centsAdjust
        };
      }
      events[events.length] = {
        type: "chord",
        start: ev.start,
        dur: ev.dur,
        pitches: adjustedPitches,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: c.length };
}

// Apply a tuning function to all intervals in a clip relative to a reference pitch
// c: input clip
// reference: the reference pitch (tonic)
// tuningFn: function that takes (root, interval) and returns cents adjustment
// returns: clip with retuned pitches
export fn applyTuning(c, reference, tuningFn) {
  let events = [];
  const refMidi = reference.midi;

  for (ev in c.events) {
    if (ev.type == "note") {
      const interval = ev.pitch.midi - refMidi;
      const semitones = ((interval % 12) + 12) % 12;  // Normalize to 0-11
      const centsAdjust = tuningFn(semitones);

      events[events.length] = {
        type: "note",
        start: ev.start,
        dur: ev.dur,
        pitch: {
          midi: ev.pitch.midi,
          cents: (ev.pitch.cents ?? 0) + centsAdjust
        },
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        lyric: ev.lyric,
        ext: ev.ext
      };
    } else if (ev.type == "chord") {
      let adjustedPitches = [];
      for (p in ev.pitches) {
        const interval = p.midi - refMidi;
        const semitones = ((interval % 12) + 12) % 12;
        const centsAdjust = tuningFn(semitones);
        adjustedPitches[adjustedPitches.length] = {
          midi: p.midi,
          cents: (p.cents ?? 0) + centsAdjust
        };
      }
      events[events.length] = {
        type: "chord",
        start: ev.start,
        dur: ev.dur,
        pitches: adjustedPitches,
        velocity: ev.velocity,
        voice: ev.voice,
        techniques: ev.techniques,
        ext: ev.ext
      };
    } else {
      events[events.length] = ev;
    }
  }

  return { events: events, length: c.length };
}

// Semitone-indexed just intonation cents for use with applyTuning
const JUST_CENTS_BY_SEMITONE = [
  0,    // 0: unison
  12,   // 1: minor second
  4,    // 2: major second
  16,   // 3: minor third
  -14,  // 4: major third
  -2,   // 5: perfect fourth
  -10,  // 6: tritone
  2,    // 7: perfect fifth
  14,   // 8: minor sixth
  -16,  // 9: major sixth
  18,   // 10: minor seventh
  -12   // 11: major seventh
];

// Convenience function to apply just intonation to a clip
// c: input clip
// tonic: the tonic pitch (all intervals calculated relative to this)
// returns: clip with just-intoned pitches
export fn applyJustIntonation(c, tonic) {
  return applyTuning(c, tonic, fn(semitones) {
    return JUST_CENTS_BY_SEMITONE[semitones];
  });
}

// Semitone-indexed Pythagorean cents
const PYTHAGOREAN_CENTS_BY_SEMITONE = [
  0,    // 0: unison
  -10,  // 1: minor second
  4,    // 2: major second
  -6,   // 3: minor third
  8,    // 4: major third
  -2,   // 5: perfect fourth
  12,   // 6: tritone
  2,    // 7: perfect fifth
  -8,   // 8: minor sixth
  6,    // 9: major sixth
  -4,   // 10: minor seventh
  10    // 11: major seventh
];

export fn applyPythagorean(c, tonic) {
  return applyTuning(c, tonic, fn(semitones) {
    return PYTHAGOREAN_CENTS_BY_SEMITONE[semitones];
  });
}

// Semitone-indexed meantone cents
const MEANTONE_CENTS_BY_SEMITONE = [
  0,    // 0: unison
  17,   // 1: minor second
  -7,   // 2: major second
  10,   // 3: minor third
  -14,  // 4: major third
  3,    // 5: perfect fourth
  -10,  // 6: tritone
  -3,   // 7: perfect fifth
  14,   // 8: minor sixth
  -10,  // 9: major sixth
  7,    // 10: minor seventh
  -17   // 11: major seventh
];

export fn applyMeantone(c, tonic) {
  return applyTuning(c, tonic, fn(semitones) {
    return MEANTONE_CENTS_BY_SEMITONE[semitones];
  });
}
`;

export const STDLIB_TUPLET = `// std:tuplet (v5)
// Generic tuplet support for any n:m ratio

import core;

// ============================================
// Core Tuplet Functions
// ============================================

// Create a tuplet - n notes in the time of m notes
// n = number of notes to play
// m = number of notes worth of time (default: next power of 2 less than n, or n-1)
// baseDur = base note duration
// Returns the duration of each note in the tuplet
export fn tupletDur(n, m, baseDur) {
  let mVal = m;
  if (mVal == null) {
    // Default: use the most common convention
    if (n == 3) {
      mVal = 2;  // Triplet
    } else if (n == 5) {
      mVal = 4;  // Quintuplet
    } else if (n == 6) {
      mVal = 4;  // Sextuplet
    } else if (n == 7) {
      mVal = 4;  // Septuplet (can also be 8)
    } else if (n == 9) {
      mVal = 8;  // Nonuplet
    } else {
      // Find largest power of 2 less than n
      mVal = 1;
      for (_ in 0..10) {
        if (mVal * 2 >= n) {
          return (baseDur * mVal) / n;
        }
        mVal = mVal * 2;
      }
    }
  }
  return (baseDur * mVal) / n;
}

// Get total duration of a tuplet group
export fn tupletTotalDur(n, m, baseDur) {
  let mVal = m;
  if (mVal == null) {
    if (n == 3) { mVal = 2; }
    else if (n == 5) { mVal = 4; }
    else if (n == 6) { mVal = 4; }
    else if (n == 7) { mVal = 4; }
    else if (n == 9) { mVal = 8; }
    else {
      mVal = 1;
      for (_ in 0..10) {
        if (mVal * 2 >= n) {
          return baseDur * mVal;
        }
        mVal = mVal * 2;
      }
    }
  }
  return baseDur * mVal;
}

// ============================================
// Common Tuplet Types
// ============================================

// Triplet (3:2)
export fn triplet(baseDur) {
  return tupletDur(3, 2, baseDur);
}

// Duplet (2:3) - two notes in the time of three
export fn duplet(baseDur) {
  return tupletDur(2, 3, baseDur);
}

// Quintuplet (5:4)
export fn quintuplet(baseDur) {
  return tupletDur(5, 4, baseDur);
}

// Sextuplet (6:4)
export fn sextuplet(baseDur) {
  return tupletDur(6, 4, baseDur);
}

// Septuplet (7:4 or 7:8)
export fn septuplet(baseDur, inTimeOf) {
  return tupletDur(7, inTimeOf, baseDur);
}

// Nonuplet (9:8)
export fn nonuplet(baseDur) {
  return tupletDur(9, 8, baseDur);
}

// ============================================
// Tuplet Clip Generators
// ============================================

// Create a clip with n equal notes fitting in m beats
// pitches = array of pitches (will cycle if fewer than n)
// n = number of notes
// m = time span in beats (null for default)
// baseDur = base beat duration
export fn tupletClip(pitches, n, m, baseDur, velocity) {
  const noteDur = tupletDur(n, m, baseDur);
  let vel = velocity;
  if (vel == null) {
    vel = 0.8;
  }

  let events = [];
  let pos = 0 / 1;

  for (i in 0..(n - 1)) {
    const pitchIdx = i % pitches.length;
    const pitch = pitches[pitchIdx];

    if (pitch != null) {
      events[events.length] = {
        type: "note",
        start: pos,
        dur: noteDur,
        pitch: pitch,
        velocity: vel
      };
    }
    pos = pos + noteDur;
  }

  return { events: events, length: pos };
}

// Create triplet clip
export fn tripletClip(pitches, baseDur, velocity) {
  return tupletClip(pitches, 3, 2, baseDur, velocity);
}

// Create quintuplet clip
export fn quintupletClip(pitches, baseDur, velocity) {
  return tupletClip(pitches, 5, 4, baseDur, velocity);
}

// Create sextuplet clip
export fn sextupletClip(pitches, baseDur, velocity) {
  return tupletClip(pitches, 6, 4, baseDur, velocity);
}

// Create septuplet clip
export fn septupletClip(pitches, baseDur, velocity, inTimeOf) {
  return tupletClip(pitches, 7, inTimeOf, baseDur, velocity);
}

// ============================================
// Nested Tuplets
// ============================================

// Create nested tuplet - a tuplet within a tuplet
// outerN:outerM containing innerN:innerM notes
export fn nestedTupletDur(outerN, outerM, innerN, innerM, baseDur) {
  const outerDur = tupletDur(outerN, outerM, baseDur);
  return tupletDur(innerN, innerM, outerDur);
}

// ============================================
// Irrational Tuplets
// ============================================

// Create an irrational rhythm - n notes over arbitrary duration
// Useful for complex contemporary music
export fn irrationalTuplet(n, totalDur) {
  return totalDur / n;
}

// ============================================
// Tuplet with Rests
// ============================================

// Create tuplet clip with rest pattern
// pattern = array of true/false (true = note, false = rest)
// pitch = pitch for all notes
export fn tupletWithRests(pattern, pitch, m, baseDur, velocity) {
  const n = pattern.length;
  const noteDur = tupletDur(n, m, baseDur);
  let vel = velocity;
  if (vel == null) {
    vel = 0.8;
  }

  let events = [];
  let pos = 0 / 1;

  for (hasNote in pattern) {
    if (hasNote) {
      events[events.length] = {
        type: "note",
        start: pos,
        dur: noteDur,
        pitch: pitch,
        velocity: vel
      };
    }
    pos = pos + noteDur;
  }

  return { events: events, length: pos };
}

// ============================================
// Tuplet Rhythmic Transformations
// ============================================

// Convert a clip to tuplet time
// Scales all durations and positions to fit in tuplet ratio
export fn toTuplet(c, n, m, baseDur) {
  const targetLen = tupletTotalDur(n, m, baseDur);
  const currentLen = core.clipLen(c);

  if (currentLen == null || currentLen == 0 / 1) {
    return c;
  }

  const scale = targetLen / currentLen;
  return core.augment(c, scale);
}

// ============================================
// Drum Tuplets
// ============================================

// Create drum tuplet clip
export fn drumTupletClip(keys, n, m, baseDur, velocity) {
  const noteDur = tupletDur(n, m, baseDur);
  let vel = velocity;
  if (vel == null) {
    vel = 0.8;
  }

  let events = [];
  let pos = 0 / 1;

  for (i in 0..(n - 1)) {
    const keyIdx = i % keys.length;
    const key = keys[keyIdx];

    if (key != null) {
      events[events.length] = {
        type: "drumHit",
        start: pos,
        dur: noteDur,
        key: key,
        velocity: vel
      };
    }
    pos = pos + noteDur;
  }

  return { events: events, length: pos };
}

// ============================================
// Tuplet Utilities
// ============================================

// Get tuplet ratio as string (for display)
export fn tupletRatio(n, m) {
  return "" + n + ":" + m;
}

// Check if a duration represents a tuplet
export fn isTupletDur(dur, baseDur) {
  const ratio = dur / baseDur;
  // Check common tuplet ratios
  const tripletRatio = 2 / 3;
  const quintRatio = 4 / 5;
  const septRatio = 4 / 7;

  if (ratio == tripletRatio) { return true; }
  if (ratio == quintRatio) { return true; }
  if (ratio == septRatio) { return true; }
  return false;
}

// ============================================
// Metric Modulation via Tuplets
// ============================================

// Create metric modulation using tuplet relationship
// oldTempo in BPM, tuplet ratio n:m
// Returns new effective tempo
export fn tupletMetricMod(oldTempo, n, m) {
  return oldTempo * n / m;
}

// Generate clip demonstrating metric modulation
// Shows transition from regular to tuplet feel
export fn metricModClip(pitch, baseDur, n, m, numBeats) {
  let events = [];
  let pos = 0 / 1;

  // First half: regular rhythm
  const halfBeats = numBeats / 2;
  for (i in 0..(halfBeats - 1)) {
    events[events.length] = {
      type: "note",
      start: pos,
      dur: baseDur,
      pitch: pitch,
      velocity: 0.8
    };
    pos = pos + baseDur;
  }

  // Second half: tuplet rhythm at same tempo
  const tupDur = tupletDur(n, m, baseDur);
  const tupletNotes = halfBeats * n / m;
  for (i in 0..(tupletNotes - 1)) {
    events[events.length] = {
      type: "note",
      start: pos,
      dur: tupDur,
      pitch: pitch,
      velocity: 0.8
    };
    pos = pos + tupDur;
  }

  return { events: events, length: pos };
}
`;

export const STDLIB_VOCAL = `// std:vocal (v4)

export const Strict = "Strict";
export const BestEffort = "BestEffort";
export const MelismaHeuristic = "MelismaHeuristic";

fn syllable(text) {
  return { kind: "syllable", text: text };
}

export fn S(text) {
  return syllable(text);
}

export fn ext() {
  return { kind: "extend" };
}

export const Ext = ext();

fn containsSpace(text) {
  for (i in 0..(text.length - 1)) {
    if (text[i] == " ") {
      return true;
    }
  }
  return false;
}

export fn text(text, lang) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let src = text;
  if (src == null) {
    src = "";
  }
  let tokens = [];
  if (containsSpace(src)) {
    let current = "";
    for (i in 0..(src.length - 1)) {
      const ch = src[i];
      if (ch == " ") {
        if (current != "") {
          tokens[tokens.length] = syllable(current);
          current = "";
        }
      } else {
        current = current + ch;
      }
    }
    if (current != "") {
      tokens[tokens.length] = syllable(current);
    }
  } else {
    for (i in 0..(src.length - 1)) {
      tokens[tokens.length] = syllable(src[i]);
    }
  }
  return { kind: "text", tokens: tokens, lang: useLang };
}

export fn syllables(tokens, lang, words) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let out = [];
  let items = tokens;
  if (items == null) {
    items = [];
  }
  for (item in items) {
    if (item.kind == "extend") {
      out[out.length] = item;
    } else if (item.kind == "syllable") {
      out[out.length] = item;
    } else {
      out[out.length] = syllable(item);
    }
  }
  let result = { kind: "syllables", tokens: out, lang: useLang };
  if (words != null) {
    result.words = words;
  }
  return result;
}

fn joinGroup(group) {
  let out = "";
  if (group == null) {
    return out;
  }
  for (i in 0..(group.length - 1)) {
    if (i > 0) {
      out = out + " ";
    }
    out = out + group[i];
  }
  return out;
}

export fn phonemes(groups, lang, alphabet, words) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let out = [];
  let list = groups;
  if (list == null) {
    list = [];
  }
  for (g in list) {
    out[out.length] = syllable(joinGroup(g));
  }
  let result = { kind: "phonemes", tokens: out, lang: useLang };
  if (alphabet != null) {
    result.alphabet = alphabet;
  }
  if (words != null) {
    result.words = words;
  }
  return result;
}

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: ev.start,
      dur: ev.dur,
      intensity: ev.intensity,
      ext: ev.ext
    };
  }
  return ev;
}

// Count note events in a clip
fn countNotes(c) {
  let count = 0;
  for (ev in c.events) {
    if (ev.type == "note") {
      count = count + 1;
    }
  }
  return count;
}

// Count syllables (non-extend tokens) in a lyric object
fn countSyllables(lyric) {
  let tokens = lyric.tokens;
  if (tokens == null) {
    return 0;
  }
  let count = 0;
  for (token in tokens) {
    if (token.kind != "extend") {
      count = count + 1;
    }
  }
  return count;
}

export fn align(c, lyric, policy) {
  let tokens = lyric.tokens;
  if (tokens == null) {
    tokens = [];
  }

  let usePolicy = policy;
  if (usePolicy == null) {
    usePolicy = Strict;
  }

  // Count notes and syllables for validation
  const noteCount = countNotes(c);
  const syllableCount = countSyllables(lyric);

  // In Strict mode, validate counts match
  if (usePolicy == Strict && noteCount != tokens.length) {
    // For now, proceed with best effort behavior
    // Actual error will be raised by runtime if needed
  }

  let idx = 0;
  let events = [];
  let lastSyllable = null;  // Track last syllable for melisma/extend

  for (ev in c.events) {
    if (ev.type == "note") {
      let out = cloneEvent(ev);
      const token = tokens[idx];
      if (token != null) {
        if (token.kind == "extend") {
          // Extend/melisma: use the last syllable but mark as extension
          if (lastSyllable != null) {
            out.lyric = { kind: "extend", fromSyllable: lastSyllable.text };
          }
        } else {
          // Regular syllable
          out.lyric = token;
          lastSyllable = token;
        }
        idx = idx + 1;
      } else if (usePolicy == MelismaHeuristic && lastSyllable != null) {
        // In MelismaHeuristic mode, auto-extend when we run out of tokens
        out.lyric = { kind: "extend", fromSyllable: lastSyllable.text };
      }
      events[events.length] = out;
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }

  return { events: events, length: c.length };
}

fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn eventEndRat(ev) {
  if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
    const start = posToRat(ev.start);
    if (start == null) {
      return null;
    }
    return start + ev.dur;
  }
  if (ev.type == "control") {
    return posToRat(ev.start);
  }
  if (ev.type == "automation") {
    return posToRat(ev.end);
  }
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  return null;
}

fn clipLength(c) {
  if (c.length != null) {
    return c.length;
  }
  let max = null;
  for (ev in c.events) {
    const end = eventEndRat(ev);
    if (end == null) {
      return null;
    }
    if (max == null || end > max) {
      max = end;
    }
  }
  if (max == null) {
    return 0 / 1;
  }
  return max;
}

fn defaultEnd(c) {
  const len = clipLength(c);
  if (len == null) {
    return 0 / 1;
  }
  return len;
}

fn flatCurve(amount) {
  return {
    kind: "piecewiseLinear",
    points: [
      { t: 0, v: amount },
      { t: 1, v: amount }
    ]
  };
}

fn addAutomation(c, param, amount, start, end) {
  let depth = amount;
  if (depth == null) {
    depth = 1;
  }
  let startPos = start;
  if (startPos == null) {
    startPos = 0 / 1;
  }
  let endPos = end;
  if (endPos == null) {
    endPos = defaultEnd(c);
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = cloneEvent(ev);
  }
  events[events.length] = {
    type: "automation",
    param: param,
    start: startPos,
    end: endPos,
    curve: flatCurve(depth)
  };
  return { events: events, length: c.length };
}

// Vibrato shapes
export const vibratoSine = "sine";           // Standard sinusoidal vibrato
export const vibratoTriangle = "triangle";   // Triangle wave vibrato (gentler)
export const vibratoSquare = "square";       // Square wave vibrato (tremoloish)
export const vibratoRandom = "random";       // Randomized vibrato (natural feel)

// Apply vibrato with extended options
// c: clip to apply vibrato to
// depth: vibrato depth (0.0-1.0, default 0.5)
// rate: vibrato rate in Hz (default 5.0)
// delay: onset delay in beats before vibrato starts (default 0)
// shape: vibrato shape - one of vibratoSine, vibratoTriangle, vibratoSquare, vibratoRandom
// start: start position (default: beginning of clip)
// end: end position (default: end of clip)
export fn vibrato(c, depth, rate, delay, shape, start, end) {
  let actualStart = start;
  if (actualStart == null) {
    actualStart = 0 / 1;
  }

  // Apply delay to the start position
  if (delay != null && delay > 0 / 1) {
    actualStart = actualStart + delay;
  }

  let out = addAutomation(c, "vocal:vibratoDepth", depth, actualStart, end);
  if (rate != null) {
    out = addAutomation(out, "vocal:vibratoRate", rate, actualStart, end);
  }
  if (shape != null) {
    out = addAutomation(out, "vocal:vibratoShape", shape, actualStart, end);
  }
  return out;
}

// Convenience function for vibrato with gradual onset (common technique)
// The vibrato builds up from 0 to target depth over the onset duration
export fn vibratoGradual(c, targetDepth, rate, onsetBeats, shape, start, end) {
  let actualStart = start;
  if (actualStart == null) {
    actualStart = 0 / 1;
  }
  let actualEnd = end;
  if (actualEnd == null) {
    actualEnd = defaultEnd(c);
  }
  let onset = onsetBeats;
  if (onset == null) {
    onset = 1 / 4; // Default: quarter note onset
  }

  // Build up curve for depth
  let events = [];
  for (ev in c.events) {
    events[events.length] = cloneEvent(ev);
  }

  // Add automation for gradual depth increase
  const onsetEnd = actualStart + onset;
  events[events.length] = {
    type: "automation",
    param: "vocal:vibratoDepth",
    start: actualStart,
    end: onsetEnd,
    curve: {
      kind: "piecewiseLinear",
      points: [
        { t: 0, v: 0 },
        { t: 1, v: targetDepth }
      ]
    }
  };

  // Maintain depth after onset
  if (onsetEnd < actualEnd) {
    events[events.length] = {
      type: "automation",
      param: "vocal:vibratoDepth",
      start: onsetEnd,
      end: actualEnd,
      curve: flatCurve(targetDepth)
    };
  }

  let out = { events: events, length: c.length };

  // Add rate if specified
  if (rate != null) {
    out = addAutomation(out, "vocal:vibratoRate", rate, actualStart, actualEnd);
  }

  // Add shape if specified
  if (shape != null) {
    out = addAutomation(out, "vocal:vibratoShape", shape, actualStart, actualEnd);
  }

  return out;
}

export fn portamento(c, amount, start, end) {
  return addAutomation(c, "vocal:portamento", amount, start, end);
}

export fn breathiness(c, amount, start, end) {
  return addAutomation(c, "vocal:breathiness", amount, start, end);
}

export fn loudness(c, curve, start, end) {
  let startPos = start;
  if (startPos == null) {
    startPos = 0 / 1;
  }
  let endPos = end;
  if (endPos == null) {
    endPos = defaultEnd(c);
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = cloneEvent(ev);
  }
  events[events.length] = {
    type: "automation",
    param: "vocal:loudness",
    start: startPos,
    end: endPos,
    curve: curve
  };
  return { events: events, length: c.length };
}

// autoBreath: automatically insert breath events before phrases
// Options:
//   minGap: Dur - minimum gap between notes to insert breath (default: s = 1/16)
//   breathDur: Dur - duration of inserted breath (default: s = 1/16)
//   intensity: Float - breath intensity 0..1 (default: 0.6)
//   shortenPrev: Bool - shorten previous note to make room for breath (default: true)
export fn autoBreath(c, opts) {
  // Parse options with defaults
  let minGap = 1 / 16;
  let breathDur = 1 / 16;
  let intensity = 0.6;
  let shortenPrev = true;

  if (opts != null) {
    if (opts.minGap != null) {
      minGap = opts.minGap;
    }
    if (opts.breathDur != null) {
      breathDur = opts.breathDur;
    }
    if (opts.intensity != null) {
      intensity = opts.intensity;
    }
    if (opts.shortenPrev != null) {
      shortenPrev = opts.shortenPrev;
    }
  }

  // Collect note events with their indices, sorted by start time
  let notes = [];
  let otherEvents = [];

  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start != null) {
        notes[notes.length] = {
          event: cloneEvent(ev),
          start: start,
          end: start + ev.dur
        };
      } else {
        otherEvents[otherEvents.length] = cloneEvent(ev);
      }
    } else {
      otherEvents[otherEvents.length] = cloneEvent(ev);
    }
  }

  // Sort notes by start time using native O(n log n) sort
  notes = sortBy(notes, "start");

  // Build result with breaths inserted
  let result = [];
  let breaths = [];

  // Check if we should add breath at the very beginning
  if (notes.length > 0) {
    const firstStart = notes[0].start;
    if (firstStart >= breathDur) {
      // There's room for a breath before the first note
      breaths[breaths.length] = {
        type: "breath",
        start: firstStart - breathDur,
        dur: breathDur,
        intensity: intensity
      };
    }
  }

  // Scan through notes and insert breaths where gaps are large enough
  for (i in 0..(notes.length - 2)) {
    const current = notes[i];
    const next = notes[i + 1];
    const gap = next.start - current.end;

    if (gap >= minGap) {
      // Gap is large enough, insert breath before next note
      let breathStart = next.start - breathDur;

      // If shortenPrev and breath would start before current note ends,
      // shorten the current note
      if (shortenPrev && breathStart < current.end) {
        const newEnd = breathStart;
        const newDur = newEnd - current.start;
        if (newDur > 0 / 1) {
          current.event.dur = newDur;
          current.end = newEnd;
          breathStart = newEnd;
        }
      }

      // Only add breath if it fits
      if (breathStart >= current.end && breathStart + breathDur <= next.start) {
        breaths[breaths.length] = {
          type: "breath",
          start: breathStart,
          dur: breathDur,
          intensity: intensity
        };
      }
    }
  }

  // Collect all events: other events, modified notes, and breaths
  for (ev in otherEvents) {
    result[result.length] = ev;
  }
  for (n in notes) {
    result[result.length] = n.event;
  }
  for (b in breaths) {
    result[result.length] = b;
  }

  return { events: result, length: c.length };
}
`;

export const STDLIB_MODULES: Record<string, string> = {
  algorithm: STDLIB_ALGORITHM,
  articulations: STDLIB_ARTICULATIONS,
  autogen: STDLIB_AUTOGEN,
  canon: STDLIB_CANON,
  cluster: STDLIB_CLUSTER,
  constraint: STDLIB_CONSTRAINT,
  core: STDLIB_CORE,
  counterpoint: STDLIB_COUNTERPOINT,
  curves: STDLIB_CURVES,
  drums: STDLIB_DRUMS,
  dynamics: STDLIB_DYNAMICS,
  effects: STDLIB_EFFECTS,
  euclidean: STDLIB_EUCLIDEAN,
  expression: STDLIB_EXPRESSION,
  form: STDLIB_FORM,
  gamelan: STDLIB_GAMELAN,
  harmony: STDLIB_HARMONY,
  instrument: STDLIB_INSTRUMENT,
  lsystem: STDLIB_LSYSTEM,
  lyrics: STDLIB_LYRICS,
  markov: STDLIB_MARKOV,
  melody: STDLIB_MELODY,
  metadata: STDLIB_METADATA,
  microtonal: STDLIB_MICROTONAL,
  modulation: STDLIB_MODULATION,
  motif: STDLIB_MOTIF,
  notation: STDLIB_NOTATION,
  orchestration: STDLIB_ORCHESTRATION,
  ornament: STDLIB_ORNAMENT,
  pedal: STDLIB_PEDAL,
  prob: STDLIB_PROB,
  raga: STDLIB_RAGA,
  random: STDLIB_RANDOM,
  result: STDLIB_RESULT,
  rhythm: STDLIB_RHYTHM,
  routing: STDLIB_ROUTING,
  serial: STDLIB_SERIAL,
  spatial: STDLIB_SPATIAL,
  spectral: STDLIB_SPECTRAL,
  structure: STDLIB_STRUCTURE,
  sync: STDLIB_SYNC,
  texture: STDLIB_TEXTURE,
  theory: STDLIB_THEORY,
  time: STDLIB_TIME,
  transform: STDLIB_TRANSFORM,
  tuning: STDLIB_TUNING,
  tuplet: STDLIB_TUPLET,
  vocal: STDLIB_VOCAL,
};

/**
 * Virtual file system for browser-based compilation
 */
export class VirtualFileSystem {
  private files = new Map<string, string>();

  constructor() {
    // Initialize with stdlib
    for (const [name, source] of Object.entries(STDLIB_MODULES)) {
      this.files.set(`/stdlib/${name}.mf`, source);
    }
  }

  /**
   * Read a file from the virtual file system
   */
  readFile(path: string): string | null {
    return this.files.get(path) ?? null;
  }

  /**
   * Write a file to the virtual file system
   */
  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  /**
   * Check if a file exists
   */
  exists(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * Resolve stdlib import path
   */
  resolveStdlib(importPath: string): string | null {
    if (!importPath.startsWith('std:')) {
      return null;
    }
    const moduleName = importPath.slice(4);
    const stdlibPath = `/stdlib/${moduleName}.mf`;
    return this.exists(stdlibPath) ? stdlibPath : null;
  }

  /**
   * Get stdlib module source directly
   */
  getStdlibSource(moduleName: string): string | null {
    return STDLIB_MODULES[moduleName] ?? null;
  }

  /**
   * Clear all user files (keeps stdlib)
   */
  clearUserFiles(): void {
    for (const path of this.files.keys()) {
      if (!path.startsWith('/stdlib/')) {
        this.files.delete(path);
      }
    }
  }
}

/**
 * Default virtual file system instance
 */
export const virtualFs = new VirtualFileSystem();
