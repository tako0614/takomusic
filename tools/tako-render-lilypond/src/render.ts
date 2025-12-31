/**
 * TakoMusic Lilypond Renderer
 * Converts Score IR to Lilypond notation for sheet music generation
 */

export interface RenderProfile {
  renderer: string;
  output: {
    path: string;
    format?: 'lilypond' | 'pdf';
    paperSize?: string;
  };
  bindings?: Array<{
    selector: { role?: string; sound?: string };
    config: {
      clef?: string;
      staff?: string;
    };
  }>;
}

export interface ScoreIR {
  tako: { irVersion: number };
  meta?: { title?: string; artist?: string; copyright?: string };
  tempoMap: Array<{ at: Rat; bpm: number; unit?: Rat }>;
  meterMap: Array<{ at: Rat; numerator: number; denominator: number }>;
  sounds: Sound[];
  tracks: Track[];
}

interface Rat {
  n: number;
  d: number;
}

interface Sound {
  id: string;
  kind: 'instrument' | 'drumKit' | 'vocal' | 'fx';
}

interface Track {
  name: string;
  role: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
  sound: string;
  placements: Placement[];
}

interface Placement {
  at: Rat;
  clip: Clip;
}

interface Clip {
  events: Event[];
}

interface Event {
  type: 'note' | 'drumHit' | 'chord' | 'rest' | 'breath';
  start: Rat;
  dur: Rat;
  pitch?: number;
  pitches?: number[];
  key?: string;
  velocity?: number;
  lyric?: { text?: string };
}

// Convert MIDI pitch to Lilypond notation
function midiToLilypond(midi: number): string {
  const noteNames = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'b'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];

  // Lilypond octave notation: c' = C4, c'' = C5, c = C3, c, = C2
  let octaveMarker = '';
  if (octave >= 4) {
    octaveMarker = "'".repeat(octave - 3);
  } else if (octave < 3) {
    octaveMarker = ','.repeat(3 - octave);
  }

  return noteName + octaveMarker;
}

// Convert duration ratio to Lilypond duration
function ratToLilypondDuration(rat: Rat): string {
  const ratio = rat.n / rat.d;

  // Common durations
  if (ratio === 4) return '1';      // whole
  if (ratio === 3) return '2.';     // dotted half
  if (ratio === 2) return '2';      // half
  if (ratio === 1.5) return '4.';   // dotted quarter
  if (ratio === 1) return '4';      // quarter
  if (ratio === 0.75) return '8.';  // dotted eighth
  if (ratio === 0.5) return '8';    // eighth
  if (ratio === 0.375) return '16.'; // dotted sixteenth
  if (ratio === 0.25) return '16';  // sixteenth
  if (ratio === 0.125) return '32'; // thirty-second

  // Fallback: find closest standard duration
  if (ratio >= 3) return '1';
  if (ratio >= 1.5) return '2';
  if (ratio >= 0.75) return '4';
  if (ratio >= 0.375) return '8';
  if (ratio >= 0.1875) return '16';
  return '32';
}

// Convert drum key to Lilypond drum notation
function drumKeyToLilypond(key: string): string {
  const drumMap: Record<string, string> = {
    kick: 'bd',
    snare: 'sn',
    hhc: 'hh',
    hho: 'hho',
    crash: 'cymc',
    ride: 'cymr',
    tom1: 'tomh',
    tom2: 'tommh',
    tom3: 'toml',
    clap: 'hc',
    rimshot: 'ss',
  };
  return drumMap[key] || 'sn';
}

// Select clef based on pitch range
function selectClef(events: Event[]): string {
  const pitches = events
    .filter((e) => e.pitch !== undefined)
    .map((e) => e.pitch!);

  if (pitches.length === 0) return 'treble';

  const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;

  if (avgPitch < 48) return 'bass';
  if (avgPitch < 60) return 'alto';
  return 'treble';
}

// Render a single track to Lilypond
function renderTrack(track: Track, profile: RenderProfile): string {
  const lines: string[] = [];

  // Find binding config for this track
  const binding = profile.bindings?.find(
    (b) => b.selector.role === track.role || b.selector.sound === track.sound
  );

  // Collect all events
  const allEvents: Array<Event & { absoluteStart: number }> = [];
  for (const placement of track.placements) {
    const placementOffset = placement.at.n / placement.at.d;
    for (const event of placement.clip.events) {
      const eventStart = event.start.n / event.start.d;
      allEvents.push({
        ...event,
        absoluteStart: placementOffset + eventStart,
      });
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => a.absoluteStart - b.absoluteStart);

  if (track.role === 'Drums') {
    // Drum staff
    lines.push(`\\new DrumStaff \\with { instrumentName = "${track.name}" } {`);
    lines.push('  \\drummode {');

    for (const event of allEvents) {
      if (event.type === 'drumHit' && event.key) {
        const dur = ratToLilypondDuration(event.dur);
        const drumNote = drumKeyToLilypond(event.key);
        lines.push(`    ${drumNote}${dur}`);
      }
    }

    lines.push('  }');
    lines.push('}');
  } else {
    // Regular staff
    const clef = binding?.config?.clef || selectClef(allEvents);
    lines.push(`\\new Staff \\with { instrumentName = "${track.name}" } {`);
    lines.push(`  \\clef ${clef}`);

    // Check for lyrics
    const hasLyrics = allEvents.some((e) => e.lyric?.text);

    if (hasLyrics) {
      lines.push('  <<');
      lines.push('    \\new Voice = "melody" {');
    }

    for (const event of allEvents) {
      const dur = ratToLilypondDuration(event.dur);

      if (event.type === 'note' && event.pitch !== undefined) {
        const pitch = midiToLilypond(event.pitch);
        lines.push(`    ${pitch}${dur}`);
      } else if (event.type === 'chord' && event.pitches) {
        const pitches = event.pitches.map(midiToLilypond).join(' ');
        lines.push(`    <${pitches}>${dur}`);
      } else if (event.type === 'rest') {
        lines.push(`    r${dur}`);
      }
    }

    if (hasLyrics) {
      lines.push('    }');
      lines.push('    \\new Lyrics \\lyricsto "melody" {');

      for (const event of allEvents) {
        if (event.lyric?.text) {
          lines.push(`      ${event.lyric.text}`);
        } else if (event.type === 'note') {
          lines.push('      _');
        }
      }

      lines.push('    }');
      lines.push('  >>');
    }

    lines.push('}');
  }

  return lines.join('\n');
}

export function render(ir: ScoreIR, profile: RenderProfile): string {
  const lines: string[] = [];

  // Header
  lines.push('\\version "2.24.0"');
  lines.push('');

  // Paper size
  const paperSize = profile.output.paperSize || 'a4';
  lines.push(`#(set-default-paper-size "${paperSize}")`);
  lines.push('');

  // Header block
  lines.push('\\header {');
  if (ir.meta?.title) {
    lines.push(`  title = "${ir.meta.title}"`);
  }
  if (ir.meta?.artist) {
    lines.push(`  composer = "${ir.meta.artist}"`);
  }
  if (ir.meta?.copyright) {
    lines.push(`  copyright = "${ir.meta.copyright}"`);
  }
  lines.push(`  tagline = "Generated by TakoMusic"`);
  lines.push('}');
  lines.push('');

  // Get tempo and meter
  const tempo = ir.tempoMap[0]?.bpm || 120;
  const meter = ir.meterMap[0] || { numerator: 4, denominator: 4 };

  // Score block
  lines.push('\\score {');
  lines.push('  <<');

  // Global settings
  lines.push('    \\new StaffGroup <<');

  // Tempo and time signature
  lines.push('      \\tempo 4 = ' + tempo);
  lines.push(`      \\time ${meter.numerator}/${meter.denominator}`);
  lines.push('');

  // Render each track (skip Automation tracks)
  for (const track of ir.tracks) {
    if (track.role === 'Automation') continue;
    if (track.placements.length === 0) continue;

    lines.push('      ' + renderTrack(track, profile).split('\n').join('\n      '));
    lines.push('');
  }

  lines.push('    >>');
  lines.push('  >>');
  lines.push('  \\layout { }');
  lines.push('  \\midi { }');
  lines.push('}');

  return lines.join('\n');
}
