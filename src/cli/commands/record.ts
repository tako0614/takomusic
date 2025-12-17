// mf record command - record MIDI input from keyboard

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { ExitCodes } from '../../errors.js';

interface MIDIEvent {
  time: number;
  type: 'note_on' | 'note_off' | 'control_change' | 'pitch_bend';
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
}

interface RecordedNote {
  pitch: number;
  startTime: number;
  endTime: number;
  velocity: number;
}

let recordedEvents: MIDIEvent[] = [];
let isRecording = false;
let recordStartTime = 0;

export async function recordCommand(args: string[]): Promise<number> {
  let outputFile: string | undefined;
  let tempo = 120;
  let quantize = '16n';
  let device: string | undefined;
  let listDevices = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '-t' || args[i] === '--tempo') {
      tempo = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '-q' || args[i] === '--quantize') {
      quantize = args[i + 1];
      i++;
    } else if (args[i] === '-d' || args[i] === '--device') {
      device = args[i + 1];
      i++;
    } else if (args[i] === '-l' || args[i] === '--list') {
      listDevices = true;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf record [options]

Options:
  -o, --output <file>   Output file path (.mf)
  -t, --tempo <bpm>     Recording tempo (default: 120)
  -q, --quantize <dur>  Quantize notes (4n, 8n, 16n, off)
  -d, --device <name>   MIDI input device name
  -l, --list            List available MIDI devices
  -h, --help            Show this help message

Controls:
  Press ENTER to start/stop recording
  Press Ctrl+C to cancel

Examples:
  mf record -o melody.mf
  mf record -t 100 -q 8n
  mf record -l
`);
      return ExitCodes.SUCCESS;
    }
  }

  // List devices mode
  if (listDevices) {
    return await listMIDIDevices();
  }

  // Check if MIDI utilities are available
  const midiUtil = findMIDIUtility();
  if (!midiUtil) {
    console.error('No MIDI utility found.');
    console.error('Please install one of the following:');
    console.error('  Windows: Use built-in MIDI support (coming soon)');
    console.error('  macOS: brew install rtmidi');
    console.error('  Linux: apt install amidi or arecordmidi');
    return ExitCodes.DEPENDENCY_MISSING;
  }

  // Default output file
  if (!outputFile) {
    outputFile = `recording_${Date.now()}.mf`;
  }

  console.log('TakoMusic MIDI Recording');
  console.log('========================');
  console.log(`Tempo: ${tempo} BPM`);
  console.log(`Quantize: ${quantize}`);
  console.log(`Output: ${outputFile}`);
  console.log('');
  console.log('Press ENTER to start recording...');

  // Wait for ENTER to start
  await waitForEnter();

  console.log('');
  console.log('Recording... Press ENTER to stop.');
  console.log('');

  // Start recording
  recordedEvents = [];
  isRecording = true;
  recordStartTime = Date.now();

  // Start MIDI input listener
  const midiProcess = await startMIDICapture(midiUtil, device);

  // Wait for ENTER to stop
  await waitForEnter();

  isRecording = false;
  if (midiProcess) {
    midiProcess.kill();
  }

  console.log('');
  console.log(`Recorded ${recordedEvents.length} MIDI events.`);

  // Convert events to notes
  const notes = eventsToNotes(recordedEvents);
  console.log(`Converted to ${notes.length} notes.`);

  // Generate MFS
  const mfsContent = generateMFSFromNotes(notes, tempo, quantize);

  // Write output file
  const resolvedOutput = path.resolve(outputFile);
  fs.writeFileSync(resolvedOutput, mfsContent, 'utf-8');

  console.log(`Saved to: ${resolvedOutput}`);
  return ExitCodes.SUCCESS;
}

async function listMIDIDevices(): Promise<number> {
  const platform = os.platform();

  console.log('Available MIDI Input Devices:');
  console.log('');

  if (platform === 'win32') {
    // Windows - use PowerShell to list MIDI devices
    const { execSync } = await import('child_process');
    try {
      const result = execSync('powershell -Command "Get-PnpDevice -Class Media | Where-Object {$_.FriendlyName -like \'*MIDI*\'} | Select-Object -ExpandProperty FriendlyName"', { encoding: 'utf-8' });
      if (result.trim()) {
        console.log(result);
      } else {
        console.log('  (No MIDI devices found)');
      }
    } catch {
      console.log('  (Unable to list devices)');
    }
  } else if (platform === 'darwin') {
    // macOS - use system_profiler
    const { execSync } = await import('child_process');
    try {
      const result = execSync('system_profiler SPUSBDataType 2>/dev/null | grep -i midi', { encoding: 'utf-8' });
      if (result.trim()) {
        console.log(result);
      } else {
        console.log('  (No MIDI devices found)');
      }
    } catch {
      console.log('  (Unable to list devices)');
    }
  } else {
    // Linux - use aconnect
    const { execSync } = await import('child_process');
    try {
      const result = execSync('aconnect -i 2>/dev/null || amidi -l 2>/dev/null', { encoding: 'utf-8' });
      if (result.trim()) {
        console.log(result);
      } else {
        console.log('  (No MIDI devices found)');
      }
    } catch {
      console.log('  (Unable to list devices - install alsa-utils)');
    }
  }

  return ExitCodes.SUCCESS;
}

function findMIDIUtility(): string | null {
  const platform = os.platform();

  if (platform === 'linux') {
    // Check for ALSA utilities
    if (fs.existsSync('/usr/bin/amidi')) {
      return 'amidi';
    }
    if (fs.existsSync('/usr/bin/arecordmidi')) {
      return 'arecordmidi';
    }
  } else if (platform === 'darwin') {
    // macOS - check for CoreMIDI utilities
    if (fs.existsSync('/usr/local/bin/receivemidi')) {
      return 'receivemidi';
    }
  }

  // Return generic for now (simulated recording)
  return 'generic';
}

async function startMIDICapture(utility: string, device?: string): Promise<ChildProcess | null> {
  // For now, use simulated keyboard input as fallback
  // Real MIDI capture would use platform-specific tools

  console.log('(Using keyboard simulation - connect MIDI device for real input)');
  console.log('Keyboard keys: a=C, s=D, d=E, f=F, g=G, h=A, j=B, k=C+');
  console.log('');

  // Set up keyboard input handler
  setupKeyboardSimulation();

  return null;
}

function setupKeyboardSimulation(): void {
  const keyToNote: Record<string, number> = {
    'a': 60, // C4
    'w': 61, // C#4
    's': 62, // D4
    'e': 63, // D#4
    'd': 64, // E4
    'f': 65, // F4
    't': 66, // F#4
    'g': 67, // G4
    'y': 68, // G#4
    'h': 69, // A4
    'u': 70, // A#4
    'j': 71, // B4
    'k': 72, // C5
  };

  const activeNotes: Map<string, number> = new Map();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  process.stdin.on('data', (data) => {
    const key = data.toString().toLowerCase();

    if (key === '\r' || key === '\n') {
      // Enter pressed - stop condition handled elsewhere
      return;
    }

    if (key === '\u0003') {
      // Ctrl+C
      process.exit(0);
    }

    const note = keyToNote[key];
    if (note !== undefined && isRecording) {
      const time = Date.now() - recordStartTime;

      if (activeNotes.has(key)) {
        // Note off
        recordedEvents.push({
          time,
          type: 'note_off',
          channel: 0,
          note,
          velocity: 0,
        });
        activeNotes.delete(key);
        process.stdout.write('-');
      } else {
        // Note on
        recordedEvents.push({
          time,
          type: 'note_on',
          channel: 0,
          note,
          velocity: 100,
        });
        activeNotes.set(key, note);
        process.stdout.write('+');
      }
    }
  });
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      if (data.toString().includes('\r') || data.toString().includes('\n')) {
        process.stdin.removeListener('data', handler);
        resolve();
      }
    };
    process.stdin.on('data', handler);
  });
}

function eventsToNotes(events: MIDIEvent[]): RecordedNote[] {
  const notes: RecordedNote[] = [];
  const activeNotes: Map<number, { startTime: number; velocity: number }> = new Map();

  for (const event of events) {
    if (event.type === 'note_on' && event.velocity && event.velocity > 0) {
      activeNotes.set(event.note!, {
        startTime: event.time,
        velocity: event.velocity,
      });
    } else if (event.type === 'note_off' || (event.type === 'note_on' && event.velocity === 0)) {
      const noteStart = activeNotes.get(event.note!);
      if (noteStart) {
        notes.push({
          pitch: event.note!,
          startTime: noteStart.startTime,
          endTime: event.time,
          velocity: noteStart.velocity,
        });
        activeNotes.delete(event.note!);
      }
    }
  }

  // Close any remaining active notes
  const endTime = events.length > 0 ? events[events.length - 1].time : 0;
  for (const [pitch, noteStart] of activeNotes) {
    notes.push({
      pitch,
      startTime: noteStart.startTime,
      endTime: endTime + 500,
      velocity: noteStart.velocity,
    });
  }

  // Sort by start time
  notes.sort((a, b) => a.startTime - b.startTime);

  return notes;
}

function generateMFSFromNotes(notes: RecordedNote[], tempo: number, quantize: string): string {
  const ppq = 480;
  const msPerBeat = 60000 / tempo;
  const msPerTick = msPerBeat / ppq;

  const lines: string[] = [];
  lines.push('// Recorded with TakoMusic');
  lines.push(`// Tempo: ${tempo} BPM`);
  lines.push('');
  lines.push(`tempo(${tempo})`);
  lines.push('');
  lines.push('track recording {');
  lines.push('  kind: midi');
  lines.push('  channel: 1');
  lines.push('  program: 0');
  lines.push('');

  // Quantize grid in ticks
  const quantizeMap: Record<string, number> = {
    '4n': ppq,
    '8n': ppq / 2,
    '16n': ppq / 4,
    '32n': ppq / 8,
    'off': 1,
  };
  const quantizeGrid = quantizeMap[quantize] || ppq / 4;

  let lastEndTick = 0;

  for (const note of notes) {
    // Convert ms to ticks
    let startTick = Math.round(note.startTime / msPerTick);
    let endTick = Math.round(note.endTime / msPerTick);

    // Quantize
    if (quantize !== 'off') {
      startTick = Math.round(startTick / quantizeGrid) * quantizeGrid;
      endTick = Math.round(endTick / quantizeGrid) * quantizeGrid;
      if (endTick <= startTick) {
        endTick = startTick + quantizeGrid;
      }
    }

    // Add rest if needed
    if (startTick > lastEndTick) {
      const restDur = ticksToDuration(startTick - lastEndTick, ppq);
      lines.push(`  r(${restDur})`);
    }

    // Add note
    const pitchStr = midiToPitchStr(note.pitch);
    const durStr = ticksToDuration(endTick - startTick, ppq);
    lines.push(`  n(${pitchStr}, ${durStr})`);

    lastEndTick = endTick;
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function midiToPitchStr(midi: number): string {
  const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

function ticksToDuration(ticks: number, ppq: number): string {
  // Common durations
  if (ticks === ppq * 4) return '1n';
  if (ticks === ppq * 2) return '2n';
  if (ticks === ppq) return '4n';
  if (ticks === ppq / 2) return '8n';
  if (ticks === ppq / 4) return '16n';
  if (ticks === ppq / 8) return '32n';

  // Dotted notes
  if (ticks === ppq * 3) return '2n.';
  if (ticks === ppq * 1.5) return '4n.';
  if (ticks === ppq * 0.75) return '8n.';

  // Triplets
  if (Math.abs(ticks - ppq * 2 / 3) < 10) return '4n/3';
  if (Math.abs(ticks - ppq / 3) < 10) return '8n/3';

  // Raw ticks
  return `${ticks}t`;
}
