import type { ScoreIR } from './compiler'

interface Rat {
  n: number
  d: number
}

const DEFAULT_PPQ = 480

const GM_DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hhc: 42,
  hho: 46,
  crash: 49,
  ride: 51,
  tom1: 50,
  tom2: 48,
  tom3: 45,
  clap: 39,
  rimshot: 37,
  cowbell: 56,
  perc1: 75,
  perc2: 76,
}

type MidiFile = {
  ppq: number
  tracks: MidiTrack[]
}

type MidiTrack = {
  name?: string
  events: MidiEvent[]
}

type MidiEvent =
  | NoteOnEvent
  | NoteOffEvent
  | TempoEvent
  | TimeSignatureEvent
  | TrackNameEvent
  | EndOfTrackEvent

type NoteOnEvent = {
  type: 'noteOn'
  delta: number
  channel: number
  note: number
  velocity: number
}

type NoteOffEvent = {
  type: 'noteOff'
  delta: number
  channel: number
  note: number
  velocity: number
}

type TempoEvent = {
  type: 'tempo'
  delta: number
  microsecondsPerBeat: number
}

type TimeSignatureEvent = {
  type: 'timeSignature'
  delta: number
  numerator: number
  denominator: number
  clocksPerClick: number
  thirtySecondNotesPerQuarter: number
}

type TrackNameEvent = {
  type: 'trackName'
  delta: number
  name: string
}

type EndOfTrackEvent = {
  type: 'endOfTrack'
  delta: number
}

type AbsoluteEvent = {
  tick: number
  event: MidiEvent
}

const ratToTicks = (rat: Rat, ppq: number): number => Math.round((rat.n / rat.d) * ppq * 4)

const bpmToMicroseconds = (bpm: number): number => Math.round(60_000_000 / bpm)

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)))

const toMidiVelocity = (value: number | undefined, fallback: number): number => {
  const vel = value ?? fallback
  return clamp(vel * 127, 1, 127)
}

const normalizeFilename = (name: string): string => {
  const safe = name.replace(/[\\/:*?"<>|]+/g, '_').trim()
  if (!safe) return 'takomusic.mid'
  return safe.toLowerCase().endsWith('.mid') ? safe : `${safe}.mid`
}

const encodeVariableLength = (value: number): Uint8Array => {
  let buffer = value & 0x7f
  let v = value >> 7
  while (v > 0) {
    buffer <<= 8
    buffer |= 0x80 | (v & 0x7f)
    v >>= 7
  }

  const bytes: number[] = []
  while (true) {
    bytes.push(buffer & 0xff)
    if (buffer & 0x80) {
      buffer >>= 8
    } else {
      break
    }
  }
  return new Uint8Array(bytes)
}

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

const encodeEvent = (event: MidiEvent): Uint8Array => {
  const deltaBytes = encodeVariableLength(event.delta)

  switch (event.type) {
    case 'noteOn': {
      const status = 0x90 | (event.channel & 0x0f)
      return concatBytes([deltaBytes, new Uint8Array([status, clamp(event.note, 0, 127), clamp(event.velocity, 0, 127)])])
    }
    case 'noteOff': {
      const status = 0x80 | (event.channel & 0x0f)
      return concatBytes([deltaBytes, new Uint8Array([status, clamp(event.note, 0, 127), clamp(event.velocity, 0, 127)])])
    }
    case 'tempo': {
      const tempo = clamp(event.microsecondsPerBeat, 1, 0xffffff)
      return concatBytes([
        deltaBytes,
        new Uint8Array([0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff]),
      ])
    }
    case 'timeSignature': {
      let denomPow = 0
      let denom = event.denominator
      while (denom > 1) {
        denomPow += 1
        denom /= 2
      }
      return concatBytes([
        deltaBytes,
        new Uint8Array([
          0xff,
          0x58,
          0x04,
          clamp(event.numerator, 1, 255),
          clamp(denomPow, 0, 255),
          clamp(event.clocksPerClick, 1, 255),
          clamp(event.thirtySecondNotesPerQuarter, 1, 255),
        ]),
      ])
    }
    case 'trackName': {
      const nameBytes = new TextEncoder().encode(event.name)
      return concatBytes([
        deltaBytes,
        new Uint8Array([0xff, 0x03]),
        encodeVariableLength(nameBytes.length),
        nameBytes,
      ])
    }
    case 'endOfTrack': {
      return concatBytes([deltaBytes, new Uint8Array([0xff, 0x2f, 0x00])])
    }
  }
}

const writeHeaderChunk = (numTracks: number, ppq: number): Uint8Array => {
  const data = new Uint8Array(14)
  const view = new DataView(data.buffer)
  data[0] = 0x4d
  data[1] = 0x54
  data[2] = 0x68
  data[3] = 0x64
  view.setUint32(4, 6, false)
  view.setUint16(8, 1, false)
  view.setUint16(10, numTracks, false)
  view.setUint16(12, ppq & 0x7fff, false)
  return data
}

const writeTrackChunk = (track: MidiTrack): Uint8Array => {
  const eventBytes = track.events.map((event) => encodeEvent(event))
  const length = eventBytes.reduce((sum, bytes) => sum + bytes.length, 0)
  const chunk = new Uint8Array(8 + length)
  const view = new DataView(chunk.buffer)
  chunk[0] = 0x4d
  chunk[1] = 0x54
  chunk[2] = 0x72
  chunk[3] = 0x6b
  view.setUint32(4, length, false)
  let offset = 8
  for (const bytes of eventBytes) {
    chunk.set(bytes, offset)
    offset += bytes.length
  }
  return chunk
}

const writeMidiFile = (midi: MidiFile): Uint8Array => {
  const chunks: Uint8Array[] = [writeHeaderChunk(midi.tracks.length, midi.ppq)]
  for (const track of midi.tracks) {
    chunks.push(writeTrackChunk(track))
  }
  return concatBytes(chunks)
}

const buildTrack = (name: string, absoluteEvents: AbsoluteEvent[]): MidiTrack => {
  const events = [...absoluteEvents]
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick
    const priority = (evt: MidiEvent) => {
      if (evt.type === 'noteOff') return 0
      if (evt.type === 'noteOn') return 1
      return 2
    }
    return priority(a.event) - priority(b.event)
  })

  const trackEvents: MidiEvent[] = []
  let lastTick = 0

  trackEvents.push({ type: 'trackName', delta: 0, name })

  for (const item of events) {
    const delta = Math.max(0, item.tick - lastTick)
    lastTick = item.tick
    trackEvents.push({ ...item.event, delta })
  }

  trackEvents.push({ type: 'endOfTrack', delta: 0 })

  return { name, events: trackEvents }
}

const addNote = (
  target: AbsoluteEvent[],
  tick: number,
  duration: number,
  channel: number,
  note: number,
  velocity: number
) => {
  if (duration <= 0) return
  target.push({ tick, event: { type: 'noteOn', delta: 0, channel, note, velocity } })
  target.push({
    tick: tick + duration,
    event: { type: 'noteOff', delta: 0, channel, note, velocity: Math.max(0, velocity - 16) },
  })
}

export const scoreToMidiBytes = (score: ScoreIR, options: { ppq?: number } = {}): Uint8Array => {
  const ppq = options.ppq ?? DEFAULT_PPQ
  const tracks: MidiTrack[] = []

  const conductorEvents: AbsoluteEvent[] = []
  const tempoMap = score.tempoMap?.length ? score.tempoMap : [{ at: { n: 0, d: 1 }, bpm: 120, unit: { n: 1, d: 4 } }]
  for (const tempo of tempoMap) {
    conductorEvents.push({
      tick: ratToTicks(tempo.at, ppq),
      event: { type: 'tempo', delta: 0, microsecondsPerBeat: bpmToMicroseconds(tempo.bpm) },
    })
  }

  const meterMap = score.meterMap?.length ? score.meterMap : [{ at: { n: 0, d: 1 }, numerator: 4, denominator: 4 }]
  for (const meter of meterMap) {
    conductorEvents.push({
      tick: ratToTicks(meter.at, ppq),
      event: {
        type: 'timeSignature',
        delta: 0,
        numerator: meter.numerator,
        denominator: meter.denominator,
        clocksPerClick: 24,
        thirtySecondNotesPerQuarter: 8,
      },
    })
  }

  tracks.push(buildTrack('Conductor', conductorEvents))

  let nextChannel = 0
  const allocChannel = (role: ScoreIR['tracks'][number]['role']): number => {
    if (role === 'Drums') return 9
    while (nextChannel === 9) {
      nextChannel += 1
    }
    const channel = nextChannel % 16
    nextChannel += 1
    if (nextChannel >= 16) nextChannel = 0
    return channel === 9 ? (nextChannel + 1) % 16 : channel
  }

  for (const track of score.tracks ?? []) {
    const channel = allocChannel(track.role)
    const events: AbsoluteEvent[] = []

    for (const placement of track.placements ?? []) {
      const baseTick = ratToTicks(placement.at, ppq)
      for (const event of placement.clip.events ?? []) {
        if (event.type === 'note') {
          const tick = baseTick + ratToTicks(event.start, ppq)
          const dur = ratToTicks(event.dur, ppq)
          const pitch = event.pitch?.midi ?? 60
          addNote(events, tick, dur, channel, pitch, toMidiVelocity(event.velocity, 0.8))
        } else if (event.type === 'chord') {
          const tick = baseTick + ratToTicks(event.start, ppq)
          const dur = ratToTicks(event.dur, ppq)
          for (const pitch of event.pitches ?? []) {
            addNote(events, tick, dur, channel, pitch.midi ?? 60, toMidiVelocity(event.velocity, 0.7))
          }
        } else if (event.type === 'drumHit') {
          const tick = baseTick + ratToTicks(event.start, ppq)
          const dur = ratToTicks(event.dur, ppq)
          const note = GM_DRUM_MAP[event.key] ?? 36
          addNote(events, tick, dur, 9, note, toMidiVelocity(event.velocity, 0.8))
        }
      }
    }

    tracks.push(buildTrack(track.name, events))
  }

  return writeMidiFile({ ppq, tracks })
}

export const downloadMidi = (score: ScoreIR, filename?: string) => {
  const bytes = scoreToMidiBytes(score)
  const blob = new Blob([bytes], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizeFilename(filename ?? score.meta?.title ?? 'takomusic')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
