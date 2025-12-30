#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
let lamejs = null;
try {
  globalThis.MPEGMode = require("lamejs/src/js/MPEGMode.js");
  globalThis.Lame = require("lamejs/src/js/Lame.js");
  globalThis.BitStream = require("lamejs/src/js/BitStream.js");
  lamejs = require("lamejs");
} catch {
  lamejs = null;
}

const RENDERER_ID = "audio.simple";
const VERSION = "0.1.0";
const SUPPORTED_EVENTS = new Set(["note", "chord", "drumHit"]);
const TAU = Math.PI * 2;

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === "-h" || cmd === "--help") {
    printUsage();
    process.exit(cmd ? 0 : 1);
  }

  switch (cmd) {
    case "capabilities":
      printJson({
        protocolVersion: 1,
        id: RENDERER_ID,
        version: VERSION,
        supportedRoles: ["Instrument", "Drums", "Vocal"],
        supportedEvents: Array.from(SUPPORTED_EVENTS),
        lyricSupport: {
          text: false,
          syllables: true,
          phonemes: false,
          alphabets: []
        },
        paramSupport: {
          namespaces: [],
          patterns: []
        },
        degradeDefaults: "Drop"
      });
      break;
    case "validate":
      printJson(runValidate(process.argv.slice(3)));
      break;
    case "render":
      await runRender(process.argv.slice(3));
      break;
    default:
      printUsage();
      process.exit(1);
  }
}

function printUsage() {
  console.error("Usage: tako-render-audio-simple <capabilities|validate|render> --score <file> --profile <file>");
}

function printJson(value) {
  process.stdout.write(JSON.stringify(value));
}

function parseArgs(args) {
  let scorePath = null;
  let profilePath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--score") {
      scorePath = args[i + 1] ?? null;
      i++;
    } else if (args[i] === "--profile") {
      profilePath = args[i + 1] ?? null;
      i++;
    }
  }
  if (!scorePath || !profilePath) {
    throw new Error("--score and --profile are required");
  }
  return { scorePath, profilePath };
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function runValidate(args) {
  const { scorePath, profilePath } = parseArgs(args);
  const score = readJson(scorePath);
  const profile = readJson(profilePath);
  return validateInputs(score, profile);
}

async function runRender(args) {
  if (!lamejs) {
    console.error("lamejs not installed. Run npm install in tools/tako-render-audio.");
    process.exit(2);
  }

  const { scorePath, profilePath } = parseArgs(args);
  const score = readJson(scorePath);
  const profile = readJson(profilePath);
  const diagnostics = validateInputs(score, profile);
  if (diagnostics.some((d) => d.level === "error")) {
    console.error("Render aborted due to validation errors.");
    process.exit(2);
  }

  const output = resolveOutput(profile.output ?? {});

  // Synthesize instruments (excluding vocal if NEUTRINO is enabled)
  const useNeutrino = output.neutrinoRoot && hasVocalTrack(score);
  const renderResult = synthesize(score, profile, output, useNeutrino);

  // If NEUTRINO is configured and there's a vocal track, render and mix it
  if (useNeutrino) {
    const vocalWav = await renderNeutrinoVocal(score, profile, output);
    if (vocalWav) {
      mixNeutrinoVocal(renderResult, vocalWav, output.neutrinoGain, output.sampleRate);
    }
  }

  ensureDir(output.path);
  writeMp3(output.pathAbs, renderResult.left, renderResult.right, output.sampleRate, output.bitrate);

  const artifacts = [
    {
      kind: "file",
      path: output.path,
      mediaType: "audio/mpeg",
      description: "MP3 audio"
    }
  ];

  if (output.wavPath) {
    ensureDir(output.wavPath);
    writeWav(output.wavPathAbs, renderResult.left, renderResult.right, output.sampleRate);
    artifacts.push({
      kind: "file",
      path: output.wavPath,
      mediaType: "audio/wav",
      description: "WAV preview"
    });
  }

  printJson(artifacts);
}

function hasVocalTrack(score) {
  if (!Array.isArray(score.tracks)) return false;
  const sounds = new Map();
  if (Array.isArray(score.sounds)) {
    for (const sound of score.sounds) {
      sounds.set(sound.id, sound);
    }
  }
  return score.tracks.some(track => {
    if (track.role === "Vocal") return true;
    const sound = sounds.get(track.sound);
    return sound && sound.kind === "vocal";
  });
}

async function renderNeutrinoVocal(score, profile, output) {
  const cwd = process.cwd();
  const baseName = path.parse(output.pathAbs).name;
  const workDir = path.resolve(cwd, "neutrino_work");
  const musicxmlPath = path.join(workDir, `${baseName}.musicxml`);
  const fullLabelPath = path.join(workDir, "label", "full", `${baseName}.lab`);
  const monoLabelPath = path.join(workDir, "label", "mono", `${baseName}.lab`);
  const f0Path = path.join(workDir, `${baseName}.f0`);
  const melspecPath = path.join(workDir, `${baseName}.melspec`);
  const vocalWavPath = path.join(workDir, `${baseName}_vocal.wav`);

  const musicXmlToLabelExe = path.resolve(output.neutrinoRoot, "bin", "musicXMLtoLabel.exe");
  const neutrinoExe = path.resolve(output.neutrinoRoot, "bin", "neutrino.exe");
  const modelDir = path.resolve(output.neutrinoRoot, "model", output.neutrinoModel) + path.sep;

  // Ensure directories exist
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.dirname(fullLabelPath), { recursive: true });
  fs.mkdirSync(path.dirname(monoLabelPath), { recursive: true });

  // Generate MusicXML from vocal track (lyrics must be hiragana/katakana)
  const musicxml = buildVocalMusicXml(score, output);
  fs.writeFileSync(musicxmlPath, musicxml, "utf-8");

  // Run musicXMLtoLabel
  const labelResult = spawnSync(musicXmlToLabelExe, [musicxmlPath, fullLabelPath, monoLabelPath], {
    cwd: output.neutrinoRoot,
    encoding: "utf-8"
  });
  if (labelResult.error || labelResult.status !== 0) {
    console.error("NEUTRINO musicXMLtoLabel failed:", labelResult.stderr || labelResult.error);
    return null;
  }

  // Run NEUTRINO
  const neutrinoResult = spawnSync(neutrinoExe, [
    fullLabelPath,
    monoLabelPath,
    f0Path,
    melspecPath,
    vocalWavPath,
    modelDir,
    "-n", String(output.neutrinoThreads),
    "-f", String(output.neutrinoTranspose),
    "-m", "-t"
  ], {
    cwd: output.neutrinoRoot,
    encoding: "utf-8"
  });
  if (neutrinoResult.error || neutrinoResult.status !== 0) {
    console.error("NEUTRINO synthesis failed:", neutrinoResult.stderr || neutrinoResult.error);
    return null;
  }

  // Read the generated WAV file
  if (!fs.existsSync(vocalWavPath)) {
    console.error("NEUTRINO vocal WAV not found:", vocalWavPath);
    return null;
  }

  return readWavFile(vocalWavPath);
}

function buildVocalMusicXml(score, output) {
  const sounds = new Map();
  if (Array.isArray(score.sounds)) {
    for (const sound of score.sounds) {
      sounds.set(sound.id, sound);
    }
  }

  const vocalTrack = score.tracks.find(track => {
    if (track.role === "Vocal") return true;
    const sound = sounds.get(track.sound);
    return sound && sound.kind === "vocal";
  });

  if (!vocalTrack) return "";

  const divisions = 480;
  const meter = getMeter(score);
  const tempo = getTempo(score);
  const ticksPerBeat = divisions * (4 / meter.beatType);
  const ticksPerMeasure = ticksPerBeat * meter.beats;
  const ticksPerWhole = divisions * 4;

  const notes = [];
  if (Array.isArray(vocalTrack.placements)) {
    for (const placement of vocalTrack.placements) {
      const placementAt = placement?.at;
      const events = placement?.clip?.events;
      if (!Array.isArray(events)) continue;
      for (const ev of events) {
        if (ev.type !== "note") continue;
        const startTick = ratToTicks(ev.start, ticksPerWhole) + ratToTicks(placementAt, ticksPerWhole);
        const durationTick = Math.max(1, ratToTicks(ev.dur, ticksPerWhole));

        // Handle extend lyrics by merging with previous note
        const lyricKind = ev.lyric?.kind;
        if (lyricKind === "extend" && notes.length > 0) {
          // Extend the previous note's duration
          const prevNote = notes[notes.length - 1];
          prevNote.durationTick = startTick + durationTick - prevNote.startTick;
          continue;
        }

        // Lyric should already be in hiragana/katakana from source
        // Each note should have 1-2 mora (no automatic splitting)
        // Use "あー" for notes without lyrics (humming/sustained sounds)
        const lyric = ev.lyric?.text || "あー";

        notes.push({
          startTick,
          durationTick,
          midi: ev.pitch?.midi ?? 60,
          lyric
        });
      }
    }
  }
  notes.sort((a, b) => a.startTick - b.startTick);

  return generateMusicXml({
    title: score.meta?.title ?? "Vocal",
    tempoBpm: tempo.quarterBpm,
    meter,
    divisions,
    ticksPerMeasure,
    noteEvents: notes
  });
}

function generateMusicXml({ title, tempoBpm, meter, divisions, ticksPerMeasure, noteEvents }) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  lines.push('<score-partwise version="3.1">');
  lines.push('  <work><work-title>' + escapeXml(title) + '</work-title></work>');
  lines.push('  <part-list>');
  lines.push('    <score-part id="P1"><part-name>Vocal</part-name></score-part>');
  lines.push('  </part-list>');
  lines.push('  <part id="P1">');

  let currentTick = 0;
  let measureNumber = 1;
  let measurePos = 0;
  let openMeasure = false;

  function startMeasure() {
    lines.push(`    <measure number="${measureNumber}">`);
    if (measureNumber === 1) {
      lines.push('      <attributes>');
      lines.push(`        <divisions>${divisions}</divisions>`);
      lines.push('        <key><fifths>0</fifths></key>');
      lines.push(`        <time><beats>${meter.beats}</beats><beat-type>${meter.beatType}</beat-type></time>`);
      lines.push('        <clef><sign>G</sign><line>2</line></clef>');
      lines.push('      </attributes>');
      lines.push('      <direction placement="above">');
      lines.push('        <direction-type>');
      lines.push(`          <metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(tempoBpm)}</per-minute></metronome>`);
      lines.push('        </direction-type>');
      lines.push(`        <sound tempo="${tempoBpm}"/>`);
      lines.push('      </direction>');
    }
    openMeasure = true;
  }

  function endMeasure() {
    lines.push('    </measure>');
    measureNumber += 1;
    measurePos = 0;
    openMeasure = false;
  }

  function ensureMeasure() {
    if (!openMeasure) startMeasure();
  }

  function emitRest(durationTick) {
    let remaining = durationTick;
    while (remaining > 0) {
      ensureMeasure();
      const space = ticksPerMeasure - measurePos;
      const slice = Math.min(remaining, space);
      const info = durationInfo(slice, divisions);
      lines.push('      <note>');
      lines.push('        <rest/>');
      lines.push(`        <duration>${slice}</duration>`);
      if (info.type) lines.push(`        <type>${info.type}</type>`);
      if (info.dots > 0) lines.push('        <dot/>');
      lines.push('      </note>');
      measurePos += slice;
      currentTick += slice;
      remaining -= slice;
      if (measurePos >= ticksPerMeasure) {
        endMeasure();
      }
    }
  }

  function emitNote(note) {
    let remaining = note.durationTick;
    let first = true;
    while (remaining > 0) {
      ensureMeasure();
      const space = ticksPerMeasure - measurePos;
      const slice = Math.min(remaining, space);
      const info = durationInfo(slice, divisions);
      const tieStart = remaining > slice;
      const tieStop = !first;
      lines.push('      <note>');
      lines.push('        <pitch>');
      lines.push(`          <step>${note.pitch.step}</step>`);
      if (note.pitch.alter !== 0) {
        lines.push(`          <alter>${note.pitch.alter}</alter>`);
      }
      lines.push(`          <octave>${note.pitch.octave}</octave>`);
      lines.push('        </pitch>');
      lines.push(`        <duration>${slice}</duration>`);
      if (info.type) lines.push(`        <type>${info.type}</type>`);
      if (info.dots > 0) lines.push('        <dot/>');
      if (tieStart) lines.push('        <tie type="start"/>');
      if (tieStop) lines.push('        <tie type="stop"/>');
      if (first && note.lyric) {
        lines.push('        <lyric>');
        lines.push(`          <text>${escapeXml(note.lyric)}</text>`);
        lines.push('        </lyric>');
      }
      if (tieStart || tieStop) {
        lines.push('        <notations>');
        if (tieStart) lines.push('          <tied type="start"/>');
        if (tieStop) lines.push('          <tied type="stop"/>');
        lines.push('        </notations>');
      }
      lines.push('      </note>');
      measurePos += slice;
      currentTick += slice;
      remaining -= slice;
      first = false;
      if (measurePos >= ticksPerMeasure) {
        endMeasure();
      }
    }
  }

  for (const note of noteEvents) {
    const noteStart = note.startTick;
    if (noteStart > currentTick) {
      emitRest(noteStart - currentTick);
    }
    const pitch = midiToPitch(note.midi);
    emitNote({
      durationTick: note.durationTick,
      pitch,
      lyric: note.lyric
    });
  }

  if (openMeasure) {
    endMeasure();
  }

  lines.push('  </part>');
  lines.push('</score-partwise>');
  return lines.join('\n');
}

function getMeter(score) {
  const meter = Array.isArray(score.meterMap) && score.meterMap.length > 0 ? score.meterMap[0] : null;
  return {
    beats: meter?.numerator ?? 4,
    beatType: meter?.denominator ?? 4
  };
}

function getTempo(score) {
  const tempo = Array.isArray(score.tempoMap) && score.tempoMap.length > 0 ? score.tempoMap[0] : null;
  const bpm = tempo?.bpm ?? 120;
  const unit = tempo?.unit ?? { n: 1, d: 4 };
  const unitValue = ratToNumber(unit);
  const quarterBpm = bpm * unitValue * 4;
  return { bpm, quarterBpm };
}

function ratToTicks(rat, ticksPerWhole) {
  if (!rat || typeof rat.n !== "number" || typeof rat.d !== "number") return 0;
  return Math.round((rat.n * ticksPerWhole) / rat.d);
}

function durationInfo(durationTicks, divisions) {
  const quarters = durationTicks / divisions;
  const map = [
    { value: 4, type: "whole", dots: 0 },
    { value: 3, type: "half", dots: 1 },
    { value: 2, type: "half", dots: 0 },
    { value: 1.5, type: "quarter", dots: 1 },
    { value: 1, type: "quarter", dots: 0 },
    { value: 0.75, type: "eighth", dots: 1 },
    { value: 0.5, type: "eighth", dots: 0 },
    { value: 0.25, type: "16th", dots: 0 },
    { value: 0.125, type: "32nd", dots: 0 },
    { value: 0.0625, type: "64th", dots: 0 }
  ];
  for (const item of map) {
    if (Math.abs(quarters - item.value) < 1e-6) {
      return item;
    }
  }
  return { type: "quarter", dots: 0 };
}

function midiToPitch(midi) {
  const steps = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const index = ((midi % 12) + 12) % 12;
  const step = steps[index];
  const alter = alters[index];
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave };
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readWavFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Parse WAV header
  const riff = buffer.toString("ascii", 0, 4);
  if (riff !== "RIFF") return null;

  const format = buffer.toString("ascii", 8, 12);
  if (format !== "WAVE") return null;

  let offset = 12;
  let sampleRate = 44100;
  let numChannels = 2;
  let bitsPerSample = 16;
  let dataStart = 0;
  let dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      numChannels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      dataStart = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  if (dataStart === 0 || dataSize === 0) return null;

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor(dataSize / (numChannels * bytesPerSample));
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const sampleOffset = dataStart + i * numChannels * bytesPerSample;
    if (bytesPerSample === 2) {
      left[i] = buffer.readInt16LE(sampleOffset) / 32768;
      if (numChannels >= 2) {
        right[i] = buffer.readInt16LE(sampleOffset + 2) / 32768;
      } else {
        right[i] = left[i];
      }
    }
  }

  return { left, right, sampleRate, numSamples };
}

function mixNeutrinoVocal(renderResult, vocalWav, gain, targetSampleRate) {
  // Resample if needed
  let vocalLeft = vocalWav.left;
  let vocalRight = vocalWav.right;

  if (vocalWav.sampleRate !== targetSampleRate) {
    const ratio = vocalWav.sampleRate / targetSampleRate;
    const newLength = Math.floor(vocalWav.numSamples / ratio);
    const newLeft = new Float32Array(newLength);
    const newRight = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      newLeft[i] = vocalWav.left[srcIdx] ?? 0;
      newRight[i] = vocalWav.right[srcIdx] ?? 0;
    }
    vocalLeft = newLeft;
    vocalRight = newRight;
  }

  // Mix vocal into render result
  const minLen = Math.min(renderResult.left.length, vocalLeft.length);
  for (let i = 0; i < minLen; i++) {
    renderResult.left[i] += vocalLeft[i] * gain;
    renderResult.right[i] += vocalRight[i] * gain;
  }
}

function resolveOutput(output) {
  if (!output || typeof output.path !== "string") {
    throw new Error("output.path must be set in profile");
  }
  const cwd = process.cwd();
  const pathAbs = path.resolve(cwd, output.path);
  const wavPath = typeof output.wavPath === "string" ? output.wavPath : null;
  const wavPathAbs = wavPath ? path.resolve(cwd, wavPath) : null;
  const sampleRate = Number.isFinite(output.sampleRate) ? Number(output.sampleRate) : 44100;
  const bitrate = Number.isFinite(output.bitrate) ? Number(output.bitrate) : 192;

  // NEUTRINO integration
  const neutrinoRoot = typeof output.neutrinoRoot === "string" ? output.neutrinoRoot : null;
  const neutrinoModel = typeof output.neutrinoModel === "string" ? output.neutrinoModel : "MERROW";
  const neutrinoThreads = Number.isFinite(output.neutrinoThreads) ? Number(output.neutrinoThreads) : 4;
  const neutrinoTranspose = Number.isFinite(output.neutrinoTranspose) ? Number(output.neutrinoTranspose) : 0;
  const neutrinoGain = Number.isFinite(output.neutrinoGain) ? Number(output.neutrinoGain) : 1.0;

  return {
    path: output.path,
    pathAbs,
    wavPath,
    wavPathAbs,
    sampleRate,
    bitrate,
    neutrinoRoot,
    neutrinoModel,
    neutrinoThreads,
    neutrinoTranspose,
    neutrinoGain
  };
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function validateInputs(score, profile) {
  const diagnostics = [];

  if (!profile || typeof profile !== "object") {
    diagnostics.push(diag("error", "Profile is not an object"));
    return diagnostics;
  }

  if (!profile.tako || profile.tako.profileVersion !== 1) {
    diagnostics.push(diag("error", "Profile must have tako.profileVersion = 1"));
  }

  if (profile.renderer !== RENDERER_ID) {
    diagnostics.push(diag("error", `Renderer id must be \"${RENDERER_ID}\"`));
  }

  if (!profile.output || typeof profile.output.path !== "string") {
    diagnostics.push(diag("error", "Profile output.path is required"));
  }

  if (!Array.isArray(profile.bindings) || profile.bindings.length === 0) {
    diagnostics.push(diag("error", "Profile bindings must be a non-empty array"));
  }

  if (!score || typeof score !== "object" || !Array.isArray(score.tracks)) {
    diagnostics.push(diag("error", "Score tracks missing"));
    return diagnostics;
  }

  if (Array.isArray(score.tempoMap) && score.tempoMap.length > 1) {
    diagnostics.push(diag("warning", "Multiple tempo events are not fully supported; using the first."));
  }

  for (const track of score.tracks) {
    const binding = resolveBinding(track, profile.bindings ?? []);
    if (!binding) {
      diagnostics.push(
        diag("error", `No binding for track ${track.name ?? "(unnamed)"}`,
          { trackName: track.name ?? null })
      );
    }

    if (!Array.isArray(track.placements)) continue;
    for (let p = 0; p < track.placements.length; p++) {
      const placement = track.placements[p];
      const events = placement?.clip?.events;
      if (!Array.isArray(events)) continue;
      for (let e = 0; e < events.length; e++) {
        const ev = events[e];
        if (!SUPPORTED_EVENTS.has(ev.type)) {
          diagnostics.push(
            diag(
              "warning",
              `Unsupported event type: ${ev.type}`,
              { trackName: track.name ?? null, placementIndex: p, eventIndex: e }
            )
          );
        }
      }
    }
  }

  return diagnostics;
}

function diag(level, message, location) {
  const out = { level, message };
  if (location) out.location = location;
  return out;
}

function resolveBinding(track, bindings) {
  for (const binding of bindings) {
    const selector = binding?.selector ?? {};
    if (selector.trackName && selector.trackName !== track.name) continue;
    if (selector.sound && selector.sound !== track.sound) continue;
    if (selector.role && selector.role !== track.role) continue;
    return binding;
  }
  return null;
}

function synthesize(score, profile, output, skipVocal = false) {
  const tempo = Array.isArray(score.tempoMap) && score.tempoMap.length > 0
    ? score.tempoMap[0]
    : { bpm: 120, unit: { n: 1, d: 4 } };

  const unit = ratToNumber(tempo.unit ?? { n: 1, d: 4 });
  const secondsPerWhole = (60 / tempo.bpm) / unit;

  const sounds = new Map();
  if (Array.isArray(score.sounds)) {
    for (const sound of score.sounds) {
      sounds.set(sound.id, sound);
    }
  }

  const voices = [];
  let maxEnd = 0;

  for (const track of score.tracks) {
    const sound = sounds.get(track.sound) ?? {};

    // Skip vocal track if using NEUTRINO
    if (skipVocal) {
      const isVocal = track.role === "Vocal" || sound.kind === "vocal";
      if (isVocal) continue;
    }

    const binding = resolveBinding(track, profile.bindings ?? []);
    const presetName = resolvePresetName(track, sound, binding?.config ?? {});
    const preset = applyOverrides(PRESETS[presetName] ?? PRESETS.instrument, binding?.config ?? {});

    const trackGain = applyTrackGain(preset.gain, track.mix, binding?.config ?? {});
    const trackPan = applyTrackPan(preset.pan, track.mix, binding?.config ?? {});

    const transposition = Number.isFinite(sound.transposition) ? sound.transposition : 0;

    if (!Array.isArray(track.placements)) continue;
        let lastVowel = "a";
    for (const placement of track.placements) {
      const placeAt = ratToNumber(placement.at) * secondsPerWhole;
      const events = placement?.clip?.events;
      if (!Array.isArray(events)) continue;

      for (const ev of events) {
        if (ev.type === "note") {
          const start = placeAt + ratToNumber(ev.start) * secondsPerWhole;
          const dur = ratToNumber(ev.dur) * secondsPerWhole;
          if (dur <= 0) continue;

          const vowel = presetName === "vocal" ? lyricToVowel(ev.lyric, lastVowel) : null;
          if (presetName === "vocal" && vowel) lastVowel = vowel;

          const voice = makeVoiceFromNote(ev.pitch, transposition, preset, {
            start,
            dur,
            gain: trackGain,
            pan: trackPan,
            velocity: ev.velocity,
            vowel
          });
          voices.push(voice);
          maxEnd = Math.max(maxEnd, start + voice.duration);
        } else if (ev.type === "chord") {
          const start = placeAt + ratToNumber(ev.start) * secondsPerWhole;
          const dur = ratToNumber(ev.dur) * secondsPerWhole;
          if (!Array.isArray(ev.pitches) || dur <= 0) continue;
          const perNoteGain = trackGain / Math.max(1, ev.pitches.length);
          for (const pitch of ev.pitches) {
            const voice = makeVoiceFromNote(pitch, transposition, preset, {
              start,
              dur,
              gain: perNoteGain,
              pan: trackPan,
              velocity: ev.velocity,
              vowel: null
            });
            voices.push(voice);
            maxEnd = Math.max(maxEnd, start + voice.duration);
          }
        } else if (ev.type === "drumHit") {
          const start = placeAt + ratToNumber(ev.start) * secondsPerWhole;
          const dur = ratToNumber(ev.dur) * secondsPerWhole;
          const drum = DRUM_PRESETS[ev.key] ?? DRUM_PRESETS.default;
          const voice = {
            kind: "drum",
            start,
            duration: Math.min(dur, drum.decay * 4),
            freq: drum.freq,
            decay: drum.decay,
            tone: drum.tone,
            noise: drum.noise,
            gain: clamp01(trackGain) * clamp01(ev.velocity ?? 1),
            pan: trackPan,
            clap: drum.clap
          };
          voices.push(voice);
          maxEnd = Math.max(maxEnd, start + voice.duration);
        }
      }
    }
  }

  const totalSamples = Math.max(1, Math.ceil(maxEnd * output.sampleRate) + 1);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rng = new Lcg(1234567);

  for (const voice of voices) {
    if (voice.kind === "drum") {
      renderDrumVoice(voice, left, right, output.sampleRate, rng);
    } else {
      renderSynthVoice(voice, left, right, output.sampleRate, rng);
    }
  }

  normalizeStereo(left, right);
  return { left, right };
}

function resolvePresetName(track, sound, config) {
  if (typeof config.preset === "string") return config.preset;
  if (track.role === "Drums" || sound.kind === "drumKit") return "drums";
  if (track.role === "Vocal" || sound.kind === "vocal") return "vocal";
  if (track.sound && track.sound.toLowerCase().includes("bass")) return "bass";
  if (track.sound && track.sound.toLowerCase().includes("guitar")) return "guitar";
  if (track.sound && track.sound.toLowerCase().includes("pad")) return "pad";
  if (track.sound && track.sound.toLowerCase().includes("key")) return "keys";
  return "instrument";
}

function applyOverrides(base, config) {
  const out = { ...base };
  if (Number.isFinite(config.gain)) out.gain = Number(config.gain);
  if (Number.isFinite(config.pan)) out.pan = Number(config.pan);
  if (Number.isFinite(config.attack)) out.attack = Number(config.attack);
  if (Number.isFinite(config.release)) out.release = Number(config.release);
  if (Number.isFinite(config.bright)) out.bright = Number(config.bright);
  if (Number.isFinite(config.vibratoDepth)) out.vibratoDepth = Number(config.vibratoDepth);
  if (Number.isFinite(config.vibratoRate)) out.vibratoRate = Number(config.vibratoRate);
  if (Number.isFinite(config.detuneCents)) out.detuneCents = Number(config.detuneCents);
  if (Number.isFinite(config.noise)) out.noise = Number(config.noise);
  if (typeof config.wave === "string") out.wave = config.wave;
  return out;
}

function applyTrackGain(baseGain, mix, config) {
  let gain = Number.isFinite(baseGain) ? baseGain : 0.5;
  if (Number.isFinite(config.gain)) gain = Number(config.gain);
  if (mix && Number.isFinite(mix.gain)) gain *= Number(mix.gain);
  return clamp01(gain);
}

function applyTrackPan(basePan, mix, config) {
  let pan = Number.isFinite(basePan) ? basePan : 0;
  if (Number.isFinite(config.pan)) pan = Number(config.pan);
  if (mix && Number.isFinite(mix.pan)) pan = clamp(pan + Number(mix.pan), -1, 1);
  return clamp(pan, -1, 1);
}

function makeVoiceFromNote(pitch, transposition, preset, options) {
  const midi = Number(pitch?.midi ?? 60) + (Number.isFinite(transposition) ? transposition : 0);
  const cents = Number(pitch?.cents ?? 0) + (Number.isFinite(preset.detuneCents) ? preset.detuneCents : 0);
  const freq = midiToFreq(midi, cents);
  const velocity = clamp01(options.velocity ?? 1);

  return {
    kind: "synth",
    start: options.start,
    duration: Math.max(0.01, options.dur),
    freq,
    gain: clamp01(options.gain ?? 0.5) * velocity,
    pan: clamp(options.pan ?? 0, -1, 1),
    wave: preset.wave,
    bright: preset.bright,
    attack: preset.attack,
    release: preset.release,
    vibratoDepth: preset.vibratoDepth,
    vibratoRate: preset.vibratoRate,
    noise: preset.noise,
    detuneCents: preset.detuneCents,
    vowel: options.vowel
  };
}

function renderSynthVoice(voice, left, right, sampleRate, rng) {
  const startSample = Math.max(0, Math.floor(voice.start * sampleRate));
  const endSample = Math.min(left.length, Math.floor((voice.start + voice.duration) * sampleRate));
  if (endSample <= startSample) return;

  const gains = panGains(voice.pan);
  const attack = Math.max(0.002, voice.attack ?? 0.01);
  const release = Math.max(0.01, voice.release ?? 0.08);
  const baseFreq = voice.freq;
  const bright = Number.isFinite(voice.bright) ? voice.bright : 0.5;
  const vowelBright = voice.vowel ? vowelBrightness(voice.vowel) : bright;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / sampleRate;
    const env = envelope(t, voice.duration, attack, release);
    const vibrato = voice.vibratoDepth
      ? Math.sin(TAU * (voice.vibratoRate ?? 5) * t) * voice.vibratoDepth
      : 0;
    const freq = baseFreq * (1 + vibrato);
    const phase = TAU * freq * t;
    let sample = waveSample(phase, voice.wave, vowelBright);

    if (voice.noise && voice.noise > 0) {
      sample += (rng.next() * 2 - 1) * voice.noise;
    }

    const amp = sample * env * voice.gain;
    left[i] += amp * gains.left;
    right[i] += amp * gains.right;
  }
}

function renderDrumVoice(voice, left, right, sampleRate, rng) {
  const startSample = Math.max(0, Math.floor(voice.start * sampleRate));
  const endSample = Math.min(left.length, Math.floor((voice.start + voice.duration) * sampleRate));
  if (endSample <= startSample) return;

  const gains = panGains(voice.pan ?? 0);
  const decay = Math.max(0.02, voice.decay ?? 0.2);

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / sampleRate;
    const env = Math.exp(-t / decay);
    let sample = 0;

    if (voice.tone && voice.tone > 0) {
      sample += Math.sin(TAU * voice.freq * t) * voice.tone;
    }
    if (voice.noise && voice.noise > 0) {
      sample += (rng.next() * 2 - 1) * voice.noise;
    }

    if (voice.clap) {
      const burst1 = Math.exp(-Math.pow((t - 0.025) / 0.01, 2));
      const burst2 = Math.exp(-Math.pow((t - 0.05) / 0.015, 2));
      sample *= 1 + 0.6 * burst1 + 0.4 * burst2;
    }

    const amp = sample * env * voice.gain;
    left[i] += amp * gains.left;
    right[i] += amp * gains.right;
  }
}

function waveSample(phase, wave, bright) {
  switch (wave) {
    case "sine":
      return Math.sin(phase);
    case "triangle":
      return triangle(phase);
    case "square":
      return Math.sign(Math.sin(phase)) || 1;
    case "saw":
      return saw(phase);
    case "mix":
    default: {
      const s = Math.sin(phase);
      const sw = saw(phase);
      return s * (1 - bright) + sw * bright;
    }
  }
}

function triangle(phase) {
  return 2 * Math.abs(2 * (phase / TAU - Math.floor(phase / TAU + 0.5))) - 1;
}

function saw(phase) {
  return 2 * (phase / TAU - Math.floor(phase / TAU + 0.5));
}

function envelope(t, duration, attack, release) {
  const atk = Math.min(attack, duration * 0.5);
  const rel = Math.min(release, duration * 0.5);
  if (t < 0) return 0;
  if (t < atk) return t / atk;
  if (t > duration - rel) return Math.max(0, (duration - t) / rel);
  return 1;
}

function panGains(pan) {
  const angle = (clamp(pan, -1, 1) + 1) * (Math.PI / 4);
  return {
    left: Math.cos(angle),
    right: Math.sin(angle)
  };
}

function normalizeStereo(left, right) {
  let max = 0;
  for (let i = 0; i < left.length; i++) {
    max = Math.max(max, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (max <= 1) return;
  const scale = 0.98 / max;
  for (let i = 0; i < left.length; i++) {
    left[i] *= scale;
    right[i] *= scale;
  }
}

function writeWav(filePath, left, right, sampleRate) {
  const numSamples = left.length;
  const blockAlign = 4;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  buffer.write("RIFF", offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write("WAVE", offset); offset += 4;
  buffer.write("fmt ", offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(2, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(16, offset); offset += 2;
  buffer.write("data", offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(floatToInt16(left[i]), offset); offset += 2;
    buffer.writeInt16LE(floatToInt16(right[i]), offset); offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

function writeMp3(filePath, left, right, sampleRate, bitrate) {
  const numSamples = left.length;
  const leftInt16 = new Int16Array(numSamples);
  const rightInt16 = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    leftInt16[i] = floatToInt16(left[i]);
    rightInt16[i] = floatToInt16(right[i]);
  }

  const encoder = new lamejs.Mp3Encoder(2, sampleRate, bitrate);
  const blockSize = 1152;
  const chunks = [];

  for (let i = 0; i < numSamples; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, i + blockSize);
    const rightChunk = rightInt16.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      chunks.push(Buffer.from(mp3buf));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    chunks.push(Buffer.from(endBuf));
  }

  fs.writeFileSync(filePath, Buffer.concat(chunks));
}

function midiToFreq(midi, cents) {
  const base = 440 * Math.pow(2, (midi - 69) / 12);
  return base * Math.pow(2, cents / 1200);
}

function ratToNumber(rat) {
  if (!rat || typeof rat.n !== "number" || typeof rat.d !== "number") return 0;
  return rat.n / rat.d;
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function floatToInt16(value) {
  const v = clamp(value, -1, 1);
  return Math.round(v * 32767);
}

function lyricToVowel(lyric, fallback) {
  if (!lyric || lyric.kind !== "syllable" || typeof lyric.text !== "string") {
    return fallback;
  }
  const text = lyric.text.toLowerCase();
  const match = text.match(/[aeiou]/g);
  if (!match || match.length === 0) return fallback;
  return match[match.length - 1];
}

function vowelBrightness(vowel) {
  switch (vowel) {
    case "a":
      return 0.85;
    case "e":
      return 0.65;
    case "i":
      return 0.45;
    case "o":
      return 0.75;
    case "u":
      return 0.55;
    default:
      return 0.6;
  }
}

class Lcg {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

const PRESETS = {
  instrument: {
    wave: "triangle",
    bright: 0.4,
    attack: 0.02,
    release: 0.2,
    gain: 0.4,
    pan: 0,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 0,
    noise: 0
  },
  pad: {
    wave: "mix",
    bright: 0.35,
    attack: 0.3,
    release: 0.6,
    gain: 0.35,
    pan: -0.2,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 6,
    noise: 0
  },
  keys: {
    wave: "triangle",
    bright: 0.4,
    attack: 0.02,
    release: 0.18,
    gain: 0.45,
    pan: 0.1,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 0,
    noise: 0
  },
  guitar: {
    wave: "saw",
    bright: 0.55,
    attack: 0.005,
    release: 0.12,
    gain: 0.35,
    pan: 0.25,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 2,
    noise: 0.02
  },
  bass: {
    wave: "sine",
    bright: 0.2,
    attack: 0.01,
    release: 0.2,
    gain: 0.55,
    pan: 0,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 0,
    noise: 0
  },
  vocal: {
    wave: "mix",
    bright: 0.6,
    attack: 0.03,
    release: 0.18,
    gain: 0.6,
    pan: 0,
    vibratoDepth: 0.01,
    vibratoRate: 5.2,
    detuneCents: 0,
    noise: 0.01
  },
  drums: {
    wave: "noise",
    bright: 0.5,
    attack: 0.01,
    release: 0.1,
    gain: 0.9,
    pan: 0,
    vibratoDepth: 0,
    vibratoRate: 0,
    detuneCents: 0,
    noise: 0
  }
};

const DRUM_PRESETS = {
  kick: { freq: 60, decay: 0.35, tone: 1.0, noise: 0.05, clap: false },
  snare: { freq: 180, decay: 0.18, tone: 0.4, noise: 0.8, clap: false },
  hhc: { freq: 400, decay: 0.06, tone: 0.1, noise: 1.0, clap: false },
  hho: { freq: 400, decay: 0.25, tone: 0.1, noise: 1.0, clap: false },
  crash: { freq: 500, decay: 0.9, tone: 0.1, noise: 1.0, clap: false },
  ride: { freq: 450, decay: 0.7, tone: 0.1, noise: 1.0, clap: false },
  tom1: { freq: 220, decay: 0.28, tone: 0.8, noise: 0.1, clap: false },
  tom2: { freq: 180, decay: 0.3, tone: 0.8, noise: 0.1, clap: false },
  tom3: { freq: 140, decay: 0.32, tone: 0.8, noise: 0.1, clap: false },
  clap: { freq: 220, decay: 0.2, tone: 0.2, noise: 0.9, clap: true },
  perc1: { freq: 300, decay: 0.25, tone: 0.4, noise: 0.6, clap: false },
  default: { freq: 250, decay: 0.2, tone: 0.3, noise: 0.6, clap: false }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
