// TakoMusic MIDI Renderer
// Converts TakoMusic Score IR to Standard MIDI Format

export { convertToMidi, type ConversionResult } from './converter.js';
export type {
  ScoreIR,
  Track,
  Clip,
  Event,
  NoteEvent,
  ChordEvent,
  DrumHitEvent,
  ControlEvent,
  AutomationEvent,
  GraceNoteEvent,
  GlissandoEvent,
  Rat,
  Pitch,
  RenderProfile,
  Binding,
  BindingConfig,
  Capabilities,
  Diagnostic,
  Artifact,
} from './types.js';
