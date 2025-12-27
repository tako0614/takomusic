#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const RENDERER_ID = "neutrino.v3";
const VERSION = "0.1.0";
const DEFAULT_DIVISIONS = 480;

main();

function main() {
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
        supportedRoles: ["Vocal"],
        supportedEvents: ["note"],
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
      runRender(process.argv.slice(3));
      break;
    default:
      printUsage();
      process.exit(1);
  }
}

function printUsage() {
  console.error("Usage: tako-render-neutrino <capabilities|validate|render> --score <file> --profile <file>");
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

function runRender(args) {
  const { scorePath, profilePath } = parseArgs(args);
  const score = readJson(scorePath);
  const profile = readJson(profilePath);
  const diagnostics = validateInputs(score, profile);
  if (diagnostics.some((d) => d.level === "error")) {
    console.error("Render aborted due to validation errors.");
    process.exit(2);
  }

  const output = resolveOutput(profile.output ?? {}, profile.profileName ?? "neutrino");
  const renderData = buildRenderData(score, output);

  ensureDir(output.workDir);
  ensureDir(path.dirname(output.musicxmlPath));
  ensureDir(path.dirname(output.fullLabelPath));
  ensureDir(path.dirname(output.monoLabelPath));
  ensureDir(path.dirname(output.wavPath));
  ensureDir(path.dirname(output.f0Path));
  ensureDir(path.dirname(output.melspecPath));

  fs.writeFileSync(output.musicxmlPath, renderData.musicxml, "utf-8");

  runCommand(output.musicXmlToLabelExe, [
    output.musicxmlPath,
    output.fullLabelPath,
    output.monoLabelPath
  ], output.neutrinoRoot);

  runCommand(output.neutrinoExe, [
    output.fullLabelPath,
    output.monoLabelPath,
    output.f0Path,
    output.melspecPath,
    output.wavPath,
    output.modelDir,
    "-n",
    String(output.threads),
    "-f",
    String(output.transpose),
    "-m",
    "-t"
  ], output.neutrinoRoot);

  printJson([
    {
      kind: "file",
      path: output.wavPathRelative,
      mediaType: "audio/wav",
      description: "NEUTRINO vocal"
    },
    {
      kind: "file",
      path: output.musicxmlPathRelative,
      mediaType: "application/xml",
      description: "MusicXML (vocal)"
    }
  ]);
}

function resolveOutput(output, profileName) {
  if (!output || typeof output.path !== "string") {
    throw new Error("output.path must be set in profile");
  }
  if (typeof output.neutrinoRoot !== "string") {
    throw new Error("output.neutrinoRoot must be set in profile");
  }
  const neutrinoRoot = output.neutrinoRoot;
  const model = typeof output.model === "string" ? output.model : "MERROW";
  const threads = Number.isFinite(output.threads) ? Number(output.threads) : 4;
  const transpose = Number.isFinite(output.transpose) ? Number(output.transpose) : 0;
  const cwd = process.cwd();

  const wavPath = path.resolve(cwd, output.path);
  const baseName = output.basename || path.parse(wavPath).name || profileName;
  const workDir = path.resolve(cwd, output.workDir ?? path.join(path.dirname(wavPath), "neutrino"));
  const musicxmlPath = path.resolve(cwd, output.musicxmlPath ?? path.join(workDir, `${baseName}.musicxml`));
  const fullLabelPath = path.resolve(cwd, path.join(workDir, "label", "full", `${baseName}.lab`));
  const monoLabelPath = path.resolve(cwd, path.join(workDir, "label", "mono", `${baseName}.lab`));
  const f0Path = path.resolve(cwd, path.join(workDir, `${baseName}.f0`));
  const melspecPath = path.resolve(cwd, path.join(workDir, `${baseName}.melspec`));

  const musicXmlToLabelExe = path.resolve(neutrinoRoot, "bin", "musicXMLtoLabel.exe");
  const neutrinoExe = path.resolve(neutrinoRoot, "bin", "neutrino.exe");
  const modelDir = path.resolve(neutrinoRoot, "model", model) + path.sep;

  return {
    neutrinoRoot,
    model,
    threads,
    transpose,
    wavPath,
    wavPathRelative: path.relative(cwd, wavPath),
    workDir,
    musicxmlPath,
    musicxmlPathRelative: path.relative(cwd, musicxmlPath),
    fullLabelPath,
    monoLabelPath,
    f0Path,
    melspecPath,
    musicXmlToLabelExe,
    neutrinoExe,
    modelDir
  };
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

  const output = profile.output ?? {};
  if (typeof output.path !== "string") {
    diagnostics.push(diag("error", "Profile output.path is required"));
  }
  if (typeof output.neutrinoRoot !== "string") {
    diagnostics.push(diag("error", "Profile output.neutrinoRoot is required"));
  }

  if (!Array.isArray(profile.bindings) || profile.bindings.length === 0) {
    diagnostics.push(diag("error", "Profile bindings must be a non-empty array"));
  }

  if (!score || typeof score !== "object" || !Array.isArray(score.tracks)) {
    diagnostics.push(diag("error", "Score tracks missing"));
    return diagnostics;
  }

  const meter = Array.isArray(score.meterMap) ? score.meterMap[0] : null;
  if (!meter) {
    diagnostics.push(diag("warning", "meterMap is empty; defaulting to 4/4"));
  }

  const tempo = Array.isArray(score.tempoMap) ? score.tempoMap[0] : null;
  if (!tempo) {
    diagnostics.push(diag("warning", "tempoMap is empty; defaulting to 120 bpm"));
  }

  const vocalTracks = findVocalTracks(score);
  if (vocalTracks.length === 0) {
    diagnostics.push(diag("error", "No vocal track found"));
  } else if (vocalTracks.length > 1) {
    diagnostics.push(diag("warning", "Multiple vocal tracks found; using the first"));
  }

  if (vocalTracks.length > 0) {
    const notes = collectNotes(vocalTracks[0]);
    if (notes.length === 0) {
      diagnostics.push(diag("error", "Vocal track has no note events"));
    }
    for (const note of notes) {
      if (!note.lyric) {
        diagnostics.push(diag("warning", "Vocal note missing lyric", { trackName: vocalTracks[0].name ?? null }));
        continue;
      }
      if (!containsKana(note.lyric)) {
        diagnostics.push(diag("error", "NEUTRINO requires hiragana/katakana lyrics", { trackName: vocalTracks[0].name ?? null }));
        break;
      }
    }
  }

  if (typeof output.neutrinoRoot === "string") {
    const musicXmlToLabelExe = path.resolve(output.neutrinoRoot, "bin", "musicXMLtoLabel.exe");
    const neutrinoExe = path.resolve(output.neutrinoRoot, "bin", "neutrino.exe");
    if (!fs.existsSync(musicXmlToLabelExe)) {
      diagnostics.push(diag("error", `musicXMLtoLabel.exe not found at ${musicXmlToLabelExe}`));
    }
    if (!fs.existsSync(neutrinoExe)) {
      diagnostics.push(diag("error", `neutrino.exe not found at ${neutrinoExe}`));
    }
    const modelName = typeof output.model === "string" ? output.model : "MERROW";
    const modelDir = path.resolve(output.neutrinoRoot, "model", modelName);
    if (!fs.existsSync(modelDir)) {
      diagnostics.push(diag("error", `Model directory not found: ${modelDir}`));
    }
  }

  return diagnostics;
}

function diag(level, message, location) {
  const out = { level, message };
  if (location) out.location = location;
  return out;
}

function findVocalTracks(score) {
  if (!Array.isArray(score.tracks)) return [];
  const sounds = new Map();
  if (Array.isArray(score.sounds)) {
    for (const sound of score.sounds) {
      sounds.set(sound.id, sound);
    }
  }
  return score.tracks.filter((track) => {
    if (track.role === "Vocal") return true;
    const sound = sounds.get(track.sound);
    return sound && sound.kind === "vocal";
  });
}

function collectNotes(track) {
  const notes = [];
  if (!track || !Array.isArray(track.placements)) return notes;
  for (const placement of track.placements) {
    const placementAt = placement?.at;
    const events = placement?.clip?.events;
    if (!Array.isArray(events)) continue;
    for (const ev of events) {
      if (ev.type !== "note") continue;
      notes.push({
        placementAt,
        start: ev.start,
        dur: ev.dur,
        pitch: ev.pitch,
        lyric: ev.lyric?.text ?? null
      });
    }
  }
  return notes;
}

function buildRenderData(score, output) {
  const vocalTracks = findVocalTracks(score);
  const track = vocalTracks[0];
  const notes = collectNotes(track);

  const divisions = Number.isFinite(output.divisions) ? Number(output.divisions) : DEFAULT_DIVISIONS;
  const meter = getMeter(score);
  const tempo = getTempo(score);

  const ticksPerBeat = divisions * (4 / meter.beatType);
  const ticksPerMeasure = ticksPerBeat * meter.beats;
  const ticksPerWhole = divisions * 4;

  const noteEvents = notes.map((note) => {
    const startTick = ratToTicks(note.start, ticksPerWhole) + ratToTicks(note.placementAt, ticksPerWhole);
    const durationTick = Math.max(1, ratToTicks(note.dur, ticksPerWhole));
    return {
      startTick,
      durationTick,
      midi: note.pitch?.midi ?? 60,
      lyric: note.lyric ?? "",
    };
  }).sort((a, b) => a.startTick - b.startTick);

  const musicxml = buildMusicXml({
    title: score.meta?.title ?? "NEUTRINO Vocal",
    tempoBpm: tempo.quarterBpm,
    meter,
    divisions,
    ticksPerMeasure,
    noteEvents
  });

  return { musicxml };
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

function buildMusicXml({ title, tempoBpm, meter, divisions, ticksPerMeasure, noteEvents }) {
  const lines = [];
  lines.push("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
  lines.push("<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 3.1 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">");
  lines.push("<score-partwise version=\"3.1\">");
  lines.push("  <work><work-title>" + escapeXml(title) + "</work-title></work>");
  lines.push("  <part-list>");
  lines.push("    <score-part id=\"P1\"><part-name>Vocal</part-name></score-part>");
  lines.push("  </part-list>");
  lines.push("  <part id=\"P1\">");

  let currentTick = 0;
  let measureNumber = 1;
  let measurePos = 0;
  let openMeasure = false;

  function startMeasure() {
    lines.push(`    <measure number=\"${measureNumber}\">`);
    if (measureNumber === 1) {
      lines.push("      <attributes>");
      lines.push(`        <divisions>${divisions}</divisions>`);
      lines.push("        <key><fifths>0</fifths></key>");
      lines.push(`        <time><beats>${meter.beats}</beats><beat-type>${meter.beatType}</beat-type></time>`);
      lines.push("        <clef><sign>G</sign><line>2</line></clef>");
      lines.push("      </attributes>");
      lines.push("      <direction placement=\"above\">");
      lines.push("        <direction-type>");
      lines.push(`          <metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(tempoBpm)}</per-minute></metronome>`);
      lines.push("        </direction-type>");
      lines.push(`        <sound tempo=\"${tempoBpm}\"/>`);
      lines.push("      </direction>");
    }
    openMeasure = true;
  }

  function endMeasure() {
    lines.push("    </measure>");
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
      lines.push("      <note>");
      lines.push("        <rest/>");
      lines.push(`        <duration>${slice}</duration>`);
      if (info.type) lines.push(`        <type>${info.type}</type>`);
      if (info.dots > 0) lines.push("        <dot/>");
      lines.push("      </note>");
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
      lines.push("      <note>");
      lines.push("        <pitch>");
      lines.push(`          <step>${note.pitch.step}</step>`);
      if (note.pitch.alter !== 0) {
        lines.push(`          <alter>${note.pitch.alter}</alter>`);
      }
      lines.push(`          <octave>${note.pitch.octave}</octave>`);
      lines.push("        </pitch>");
      lines.push(`        <duration>${slice}</duration>`);
      if (info.type) lines.push(`        <type>${info.type}</type>`);
      if (info.dots > 0) lines.push("        <dot/>");
      if (tieStart) lines.push("        <tie type=\"start\"/>");
      if (tieStop) lines.push("        <tie type=\"stop\"/>");
      if (first && note.lyric) {
        lines.push("        <lyric>");
        lines.push(`          <text>${escapeXml(note.lyric)}</text>`);
        lines.push("        </lyric>");
      }
      if (tieStart || tieStop) {
        lines.push("        <notations>");
        if (tieStart) lines.push("          <tied type=\"start\"/>");
        if (tieStop) lines.push("          <tied type=\"stop\"/>");
        lines.push("        </notations>");
      }
      lines.push("      </note>");
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

  lines.push("  </part>");
  lines.push("</score-partwise>");
  return lines.join("\n");
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

function ratToNumber(rat) {
  if (!rat || typeof rat.n !== "number" || typeof rat.d !== "number") return 0;
  return rat.n / rat.d;
}

function ratToTicks(rat, ticksPerWhole) {
  if (!rat || typeof rat.n !== "number" || typeof rat.d !== "number") return 0;
  return Math.round((rat.n * ticksPerWhole) / rat.d);
}

function containsKana(text) {
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf-8" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }
}
