#!/usr/bin/env node
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const opts = parseArgs(args);
if (!opts.a || !opts.b) {
  printUsage();
  process.exit(1);
}

const wavA = readWav(opts.a);
const wavB = readWav(opts.b);

if (wavA.sampleRate !== wavB.sampleRate) {
  throw new Error(`Sample rate mismatch: ${wavA.sampleRate} vs ${wavB.sampleRate}`);
}

const maxLen = Math.max(wavA.left.length, wavB.left.length);
const left = new Float32Array(maxLen);
const right = new Float32Array(maxLen);

const gainA = opts.gainA;
const gainB = opts.gainB;

for (let i = 0; i < maxLen; i++) {
  const aL = i < wavA.left.length ? wavA.left[i] * gainA : 0;
  const aR = i < wavA.right.length ? wavA.right[i] * gainA : 0;
  const bL = i < wavB.left.length ? wavB.left[i] * gainB : 0;
  const bR = i < wavB.right.length ? wavB.right[i] * gainB : 0;

  left[i] = aL + bL;
  right[i] = aR + bR;
}

normalizeStereo(left, right, opts.normalize);

const outPath = opts.out ?? defaultOut(opts.a, opts.b);
writeWav(outPath, left, right, wavA.sampleRate);
console.log(`Wrote: ${outPath}`);

function printUsage() {
  console.log("Usage: node tools/mix-wav.js --a <wav> --b <wav> --out <wav> [--gain-a 1.0] [--gain-b 1.0] [--no-normalize]");
}

function parseArgs(list) {
  const out = {
    a: null,
    b: null,
    out: null,
    gainA: 1.0,
    gainB: 1.0,
    normalize: true
  };

  for (let i = 0; i < list.length; i++) {
    const arg = list[i];
    if (arg === "--a") {
      out.a = list[i + 1];
      i++;
    } else if (arg === "--b") {
      out.b = list[i + 1];
      i++;
    } else if (arg === "--out") {
      out.out = list[i + 1];
      i++;
    } else if (arg === "--gain-a") {
      out.gainA = Number(list[i + 1] ?? 1.0);
      i++;
    } else if (arg === "--gain-b") {
      out.gainB = Number(list[i + 1] ?? 1.0);
      i++;
    } else if (arg === "--no-normalize") {
      out.normalize = false;
    }
  }

  return out;
}

function defaultOut(aPath, bPath) {
  const dir = path.dirname(aPath || bPath || ".");
  return path.join(dir, "mix.wav");
}

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`Invalid WAV file: ${filePath}`);
  }

  let offset = 12;
  let fmt = null;
  let data = null;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + size;

    if (id === "fmt ") {
      const audioFormat = buf.readUInt16LE(chunkStart);
      const numChannels = buf.readUInt16LE(chunkStart + 2);
      const sampleRate = buf.readUInt32LE(chunkStart + 4);
      const bitsPerSample = buf.readUInt16LE(chunkStart + 14);
      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample };
    } else if (id === "data") {
      data = { start: chunkStart, size };
    }

    offset = chunkEnd + (size % 2);
  }

  if (!fmt || !data) {
    throw new Error(`Missing fmt/data chunk in WAV: ${filePath}`);
  }
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`Only PCM16 supported: ${filePath}`);
  }

  const frameCount = data.size / (fmt.numChannels * 2);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);
  let idx = data.start;
  for (let i = 0; i < frameCount; i++) {
    const l = buf.readInt16LE(idx);
    idx += 2;
    let r = l;
    if (fmt.numChannels === 2) {
      r = buf.readInt16LE(idx);
      idx += 2;
    }
    left[i] = l / 32768;
    right[i] = r / 32768;
  }

  return { sampleRate: fmt.sampleRate, left, right };
}

function normalizeStereo(left, right, enable) {
  if (!enable) return;
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

function floatToInt16(value) {
  const v = Math.min(1, Math.max(-1, value));
  return Math.round(v * 32767);
}
