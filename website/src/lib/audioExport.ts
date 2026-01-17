import type { ScoreIR } from './compiler'

interface Rat {
  n: number
  d: number
}

const DEFAULT_SAMPLE_RATE = 44100
const DEFAULT_CHANNELS = 2

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
}

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)

const ratToSeconds = (rat: Rat, bpm: number, beatUnit: Rat = { n: 1, d: 4 }): number => {
  const beats = (rat.n / rat.d) / (beatUnit.n / beatUnit.d)
  return (beats * 60) / bpm
}

const ratToFloat = (rat: Rat): number => rat.n / rat.d

const toRat = (value: any, fallback: Rat): Rat => {
  if (value && typeof value === 'object' && typeof value.n === 'number' && typeof value.d === 'number') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { n: value, d: 1 }
  }
  return fallback
}

const addRat = (a: Rat, b: Rat): Rat => ({
  n: a.n * b.d + b.n * a.d,
  d: a.d * b.d,
})

const buildTempoMap = (ir: ScoreIR): Array<{ at: Rat; bpm: number; unit: Rat }> => {
  const base = ir.tempoMap?.length
    ? ir.tempoMap
    : [{ at: { n: 0, d: 1 }, bpm: 120, unit: { n: 1, d: 4 } }]
  return [...base].sort((a, b) => ratToFloat(a.at) - ratToFloat(b.at))
}

const posToSeconds = (pos: Rat, tempoMap: Array<{ at: Rat; bpm: number; unit: Rat }>): number => {
  let seconds = 0
  let lastPos: Rat = { n: 0, d: 1 }
  let current = tempoMap[0] ?? { at: { n: 0, d: 1 }, bpm: 120, unit: { n: 1, d: 4 } }

  for (const tempo of tempoMap) {
    if (ratToFloat(pos) <= ratToFloat(tempo.at)) {
      break
    }
    const segmentBeats = (ratToFloat(tempo.at) - ratToFloat(lastPos)) / (current.unit.n / current.unit.d)
    seconds += (segmentBeats * 60) / current.bpm
    lastPos = tempo.at
    current = tempo
  }

  const tailBeats = (ratToFloat(pos) - ratToFloat(lastPos)) / (current.unit.n / current.unit.d)
  seconds += (tailBeats * 60) / current.bpm
  return seconds
}

const durationToSeconds = (start: Rat, dur: Rat, tempoMap: Array<{ at: Rat; bpm: number; unit: Rat }>): number =>
  posToSeconds(addRat(start, dur), tempoMap) - posToSeconds(start, tempoMap)

const extractPitch = (event: any): number | undefined => {
  if (typeof event.pitch === 'number') return event.pitch
  if (event.pitch && typeof event.pitch.midi === 'number') return event.pitch.midi
  return undefined
}

const extractPitches = (event: any): number[] | undefined => {
  if (!event.pitches || !Array.isArray(event.pitches)) return undefined
  return event.pitches.map((p: any) => {
    if (typeof p === 'number') return p
    if (p && typeof p.midi === 'number') return p.midi
    return 60
  })
}

const normalizeFilename = (name: string): string => {
  const safe = name.replace(/[\\/:*?"<>|]+/g, '_').trim()
  if (!safe) return 'takomusic.wav'
  return safe.toLowerCase().endsWith('.wav') ? safe : `${safe}.wav`
}

const drumTailSeconds = (drumKey?: string): number => {
  switch (drumKey) {
    case 'kick':
      return 0.3
    case 'snare':
      return 0.2
    case 'hhc':
      return 0.13
    case 'hho':
      return 0.3
    case 'crash':
    case 'ride':
      return 0.7
    default:
      return 0.25
  }
}

const estimateDuration = (ir: ScoreIR): number => {
  const tempoMap = buildTempoMap(ir)
  let maxEnd = 0

  for (const track of ir.tracks ?? []) {
    for (const placement of track.placements ?? []) {
      const placementAt = toRat(placement.at, { n: 0, d: 1 })
      for (const rawEvent of placement.clip.events ?? []) {
        const event = rawEvent as any
        const eventType = event.type || event.kind
        const eventAt = toRat(event.start ?? event.at, { n: 0, d: 1 })
        const eventDur = toRat(event.dur, { n: 1, d: 4 })
        const eventPos = addRat(placementAt, eventAt)
        const eventTime = posToSeconds(eventPos, tempoMap)
        const duration = durationToSeconds(eventPos, eventDur, tempoMap)

        if (eventType === 'note' || eventType === 'chord') {
          maxEnd = Math.max(maxEnd, eventTime + duration + 0.05)
        } else if (eventType === 'drumHit' || eventType === 'hit') {
          const drumKey = event.key || event.drumKey
          maxEnd = Math.max(maxEnd, eventTime + drumTailSeconds(drumKey))
        }
      }
    }
  }

  return Math.max(maxEnd + 0.2, 0.5)
}

const scheduleNote = (
  context: BaseAudioContext,
  masterGain: GainNode,
  time: number,
  duration: number,
  pitch: number,
  velocity: number,
  soundKind: string
) => {
  const freq = midiToFreq(pitch)
  const osc = context.createOscillator()
  const gainNode = context.createGain()

  osc.type = soundKind === 'vocal' ? 'sawtooth' : 'triangle'
  osc.frequency.value = freq
  osc.connect(gainNode)
  gainNode.connect(masterGain)

  const attack = 0.02
  const decay = 0.1
  const sustain = 0.6
  const release = 0.1
  const maxGain = velocity * 0.3
  const sustainGain = maxGain * sustain

  gainNode.gain.setValueAtTime(0, time)
  gainNode.gain.linearRampToValueAtTime(maxGain, time + attack)
  gainNode.gain.linearRampToValueAtTime(sustainGain, time + attack + decay)
  gainNode.gain.setValueAtTime(sustainGain, time + duration - release)
  gainNode.gain.linearRampToValueAtTime(0, time + duration)

  osc.start(time)
  osc.stop(time + duration + 0.01)
}

const scheduleKick = (context: BaseAudioContext, masterGain: GainNode, time: number, velocity: number) => {
  const osc = context.createOscillator()
  const gainNode = context.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1)

  osc.connect(gainNode)
  gainNode.connect(masterGain)

  gainNode.gain.setValueAtTime(velocity * 0.8, time)
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

  osc.start(time)
  osc.stop(time + 0.3)
}

const scheduleSnare = (context: BaseAudioContext, masterGain: GainNode, time: number, velocity: number) => {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * 0.2))
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = context.createBufferSource()
  noise.buffer = buffer

  const noiseFilter = context.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1000

  const noiseGain = context.createGain()
  noiseGain.gain.setValueAtTime(velocity * 0.4, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)

  const osc = context.createOscillator()
  const oscGain = context.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 180

  oscGain.gain.setValueAtTime(velocity * 0.3, time)
  oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08)

  osc.connect(oscGain)
  oscGain.connect(masterGain)

  noise.start(time)
  noise.stop(time + 0.2)
  osc.start(time)
  osc.stop(time + 0.1)
}

const scheduleHihat = (
  context: BaseAudioContext,
  masterGain: GainNode,
  time: number,
  velocity: number,
  open: boolean
) => {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * (open ? 0.3 : 0.1)))
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = context.createBufferSource()
  noise.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000

  const gainNode = context.createGain()
  const duration = open ? 0.25 : 0.08
  gainNode.gain.setValueAtTime(velocity * 0.25, time)
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration)

  noise.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(masterGain)

  noise.start(time)
  noise.stop(time + duration + 0.05)
}

const scheduleCymbal = (context: BaseAudioContext, masterGain: GainNode, time: number, velocity: number) => {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * 0.8))
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = context.createBufferSource()
  noise.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 5000
  filter.Q.value = 1

  const gainNode = context.createGain()
  gainNode.gain.setValueAtTime(velocity * 0.3, time)
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.6)

  noise.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(masterGain)

  noise.start(time)
  noise.stop(time + 0.7)
}

const scheduleTom = (
  context: BaseAudioContext,
  masterGain: GainNode,
  time: number,
  velocity: number,
  midiNote: number
) => {
  const freq = midiToFreq(midiNote)
  const osc = context.createOscillator()
  const gainNode = context.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.5, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05)

  osc.connect(gainNode)
  gainNode.connect(masterGain)

  gainNode.gain.setValueAtTime(velocity * 0.5, time)
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.25)

  osc.start(time)
  osc.stop(time + 0.25)
}

const scheduleDrumHit = (
  context: BaseAudioContext,
  masterGain: GainNode,
  time: number,
  drumKey: string,
  velocity: number
) => {
  const midiNote = GM_DRUM_MAP[drumKey] || 36
  if (drumKey === 'kick') {
    scheduleKick(context, masterGain, time, velocity)
  } else if (drumKey === 'snare') {
    scheduleSnare(context, masterGain, time, velocity)
  } else if (drumKey === 'hhc' || drumKey === 'hho') {
    scheduleHihat(context, masterGain, time, velocity, drumKey === 'hho')
  } else if (drumKey === 'crash' || drumKey === 'ride') {
    scheduleCymbal(context, masterGain, time, velocity)
  } else {
    scheduleTom(context, masterGain, time, velocity, midiNote)
  }
}

const scheduleScore = (context: BaseAudioContext, masterGain: GainNode, ir: ScoreIR) => {
  const tempoMap = buildTempoMap(ir)

  const soundMap = new Map<string, any>()
  for (const sound of ir.sounds ?? []) {
    soundMap.set(sound.id, sound)
  }

  for (const track of ir.tracks ?? []) {
    const sound = soundMap.get(track.sound)
    if (!sound) continue

    for (const placement of track.placements ?? []) {
      const placementAt = toRat(placement.at, { n: 0, d: 1 })

      for (const rawEvent of placement.clip.events ?? []) {
        const event = rawEvent as any
        const eventType = event.type || event.kind
        const eventAt = toRat(event.start ?? event.at, { n: 0, d: 1 })
        const eventDur = toRat(event.dur, { n: 1, d: 4 })
        const eventPos = addRat(placementAt, eventAt)
        const eventTime = posToSeconds(eventPos, tempoMap)
        const duration = durationToSeconds(eventPos, eventDur, tempoMap)
        const velocity = event.velocity ?? event.vel ?? 0.8

        if (eventType === 'rest') continue

        if (eventType === 'note') {
          const pitch = extractPitch(event)
          if (pitch !== undefined) {
            scheduleNote(context, masterGain, eventTime, duration, pitch, velocity, sound.kind)
          }
        } else if (eventType === 'chord') {
          const pitches = extractPitches(event)
          if (pitches) {
            for (const pitch of pitches) {
              scheduleNote(context, masterGain, eventTime, duration, pitch, velocity * 0.8, sound.kind)
            }
          }
        } else if (eventType === 'drumHit' || eventType === 'hit') {
          const drumKey = event.key || event.drumKey
          if (drumKey) {
            scheduleDrumHit(context, masterGain, eventTime, drumKey, velocity)
          }
        }
      }
    }
  }
}

const encodeWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const samples = buffer.length
  const bitsPerSample = 16
  const blockAlign = (numChannels * bitsPerSample) / 8
  const byteRate = sampleRate * blockAlign
  const dataSize = samples * blockAlign
  const totalSize = 44 + dataSize
  const arrayBuffer = new ArrayBuffer(totalSize)
  const view = new DataView(arrayBuffer)
  let offset = 0

  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset, value.charCodeAt(i))
      offset += 1
    }
  }

  writeString('RIFF')
  view.setUint32(offset, totalSize - 8, true)
  offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true)
  offset += 4
  view.setUint16(offset, 1, true)
  offset += 2
  view.setUint16(offset, numChannels, true)
  offset += 2
  view.setUint32(offset, sampleRate, true)
  offset += 4
  view.setUint32(offset, byteRate, true)
  offset += 4
  view.setUint16(offset, blockAlign, true)
  offset += 2
  view.setUint16(offset, bitsPerSample, true)
  offset += 2
  writeString('data')
  view.setUint32(offset, dataSize, true)
  offset += 4

  const channels: Float32Array[] = []
  for (let channel = 0; channel < numChannels; channel++) {
    channels.push(buffer.getChannelData(channel))
  }

  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return arrayBuffer
}

const renderScore = async (
  ir: ScoreIR,
  options: { sampleRate?: number; channels?: number } = {}
): Promise<AudioBuffer> => {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE
  const channels = options.channels ?? DEFAULT_CHANNELS
  const duration = estimateDuration(ir)
  const frames = Math.max(1, Math.ceil(duration * sampleRate))
  const context = new OfflineAudioContext(channels, frames, sampleRate)
  const masterGain = context.createGain()
  masterGain.gain.value = 0.5
  masterGain.connect(context.destination)
  scheduleScore(context, masterGain, ir)
  return context.startRendering()
}

export const downloadWav = async (score: ScoreIR, filename?: string): Promise<void> => {
  const buffer = await renderScore(score)
  const wavData = encodeWav(buffer)
  const blob = new Blob([wavData], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizeFilename(filename ?? score.meta?.title ?? 'takomusic')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
