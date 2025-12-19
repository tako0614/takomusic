// Techniques builtin functions: bendCurve, slide, tap, harmonic, pedal, breath, autoBreath, featheredBeam

import type { Expression } from '../../types/ast.js';
import type {
  BendCurveEvent, BendCurveShape,
  SlideType, TapHand,
  HarmonicEvent, HarmonicType,
  PedalEvent, PedalType, PedalAction,
  FeatheredBeamDirection,
  BreathEvent,
} from '../../types/ir.js';
import { RuntimeValue, makeNull, makeInt, makeBool, toNumber } from '../runtime.js';
import { MFError, createError } from '../../errors.js';

export function builtinBendCurve(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const noteKeyArg = this.evaluate(args[0]);
  const bendAmountArg = this.evaluate(args[1]);
  const shapeArg = this.evaluate(args[2]);
  const durArg = args.length > 3 ? this.evaluate(args[3]) : null;

  const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);
  const bendAmount = toNumber(bendAmountArg);

  if (shapeArg.type !== 'string') {
    throw new MFError('TYPE', 'bendCurve() shape must be string', position, this.filePath);
  }

  const validShapes: BendCurveShape[] = ['immediate', 'gradual', 'prebend', 'release'];
  if (!validShapes.includes(shapeArg.value as BendCurveShape)) {
    throw new MFError('TYPE', `bendCurve() shape must be one of: ${validShapes.join(', ')}`, position, this.filePath);
  }

  if (!track.bendCurves) track.bendCurves = [];
  const event: BendCurveEvent = {
    type: 'bendCurve',
    tick: track.cursor,
    noteKey,
    bendAmount,
    shape: shapeArg.value as BendCurveShape,
  };
  if (durArg && durArg.type === 'dur') {
    event.dur = this.durToTicks(durArg, position);
  }
  track.bendCurves.push(event);

  return makeNull();
}

export function builtinSlide(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const startNoteArg = this.evaluate(args[0]);
  const endNoteArg = this.evaluate(args[1]);
  const slideTypeArg = this.evaluate(args[2]);
  const durArg = this.evaluate(args[3]);

  const startNote = startNoteArg.type === 'pitch' ? startNoteArg.midi : toNumber(startNoteArg);
  const endNote = endNoteArg.type === 'pitch' ? endNoteArg.midi : toNumber(endNoteArg);

  if (slideTypeArg.type !== 'string') {
    throw new MFError('TYPE', 'slide() type must be string', position, this.filePath);
  }

  const validTypes: SlideType[] = ['legato', 'shift', 'gliss', 'scoop', 'fall'];
  if (!validTypes.includes(slideTypeArg.value as SlideType)) {
    throw new MFError('TYPE', `slide() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
  }

  if (durArg.type !== 'dur') {
    throw new MFError('TYPE', 'slide() duration must be Dur', position, this.filePath);
  }
  const dur = this.durToTicks(durArg, position);

  if (!track.slides) track.slides = [];
  track.slides.push({
    type: 'slide',
    tick: track.cursor,
    startNote,
    endNote,
    slideType: slideTypeArg.value as SlideType,
    dur,
  });

  return makeNull();
}

export function builtinTap(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const noteKeyArg = this.evaluate(args[0]);
  const handArg = this.evaluate(args[1]);
  const durArg = this.evaluate(args[2]);

  const noteKey = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : toNumber(noteKeyArg);

  if (handArg.type !== 'string') {
    throw new MFError('TYPE', 'tap() hand must be string', position, this.filePath);
  }

  const validHands: TapHand[] = ['left', 'right', 'both'];
  if (!validHands.includes(handArg.value as TapHand)) {
    throw new MFError('TYPE', `tap() hand must be one of: ${validHands.join(', ')}`, position, this.filePath);
  }

  if (durArg.type !== 'dur') {
    throw new MFError('TYPE', 'tap() duration must be Dur', position, this.filePath);
  }
  const dur = this.durToTicks(durArg, position);

  if (!track.taps) track.taps = [];
  track.taps.push({
    type: 'tap',
    tick: track.cursor,
    noteKey,
    hand: handArg.value as TapHand,
    dur,
  });

  return makeNull();
}

export function builtinHarmonic(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const noteKeyArg = this.evaluate(args[0]);
  const typeArg = this.evaluate(args[1]);
  const touchedArg = args.length >= 3 ? this.evaluate(args[2]) : null;

  if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
    throw new MFError('TYPE', 'harmonic() noteKey must be Pitch or int', position, this.filePath);
  }
  if (typeArg.type !== 'string') {
    throw new MFError('TYPE', 'harmonic() type must be string', position, this.filePath);
  }

  const validTypes: HarmonicType[] = ['natural', 'artificial', 'pinch', 'tap'];
  if (!validTypes.includes(typeArg.value as HarmonicType)) {
    throw new MFError('TYPE', `harmonic() type must be one of: ${validTypes.join(', ')}`, position, this.filePath);
  }

  const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

  if (!track.harmonics) track.harmonics = [];
  const event: HarmonicEvent = {
    type: 'harmonic',
    tick: track.cursor,
    noteKey: keyValue,
    harmonicType: typeArg.value as HarmonicType,
  };
  if (touchedArg && (touchedArg.type === 'pitch' || touchedArg.type === 'int')) {
    event.touchedNote = touchedArg.type === 'pitch' ? touchedArg.midi : touchedArg.value;
  }
  track.harmonics.push(event);

  return makeNull();
}

export function builtinPedal(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const pedalTypeArg = this.evaluate(args[0]);
  const actionArg = this.evaluate(args[1]);
  const levelArg = args.length >= 3 ? this.evaluate(args[2]) : null;

  if (pedalTypeArg.type !== 'string') {
    throw new MFError('TYPE', 'pedal() pedalType must be string', position, this.filePath);
  }
  if (actionArg.type !== 'string') {
    throw new MFError('TYPE', 'pedal() action must be string', position, this.filePath);
  }

  const validPedalTypes: PedalType[] = ['sustain', 'sostenuto', 'unaCorda'];
  const validActions: PedalAction[] = ['start', 'end', 'change', 'half'];

  if (!validPedalTypes.includes(pedalTypeArg.value as PedalType)) {
    throw new MFError('TYPE', `pedal() pedalType must be one of: ${validPedalTypes.join(', ')}`, position, this.filePath);
  }
  if (!validActions.includes(actionArg.value as PedalAction)) {
    throw new MFError('TYPE', `pedal() action must be one of: ${validActions.join(', ')}`, position, this.filePath);
  }

  if (!track.pedals) track.pedals = [];
  const event: PedalEvent = {
    type: 'pedal',
    tick: track.cursor,
    pedalType: pedalTypeArg.value as PedalType,
    action: actionArg.value as PedalAction,
  };
  if (levelArg && levelArg.type === 'int') {
    if (levelArg.value < 0 || levelArg.value > 127) {
      throw createError('E121', `pedal level ${levelArg.value} out of range 0..127`, position, this.filePath);
    }
    event.level = levelArg.value;
  }
  track.pedals.push(event);

  return makeNull();
}

export function builtinFeatheredBeam(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const directionArg = this.evaluate(args[0]);
  const durArg = this.evaluate(args[1]);

  if (directionArg.type !== 'string') {
    throw new MFError('TYPE', 'featheredBeam() direction must be string', position, this.filePath);
  }
  if (durArg.type !== 'dur') {
    throw new MFError('TYPE', 'featheredBeam() duration must be Dur', position, this.filePath);
  }

  const validDirections: FeatheredBeamDirection[] = ['accel', 'rit'];
  if (!validDirections.includes(directionArg.value as FeatheredBeamDirection)) {
    throw new MFError('TYPE', `featheredBeam() direction must be one of: ${validDirections.join(', ')}`, position, this.filePath);
  }

  const dur = this.durToTicks(durArg, position);

  if (!track.featheredBeams) track.featheredBeams = [];
  track.featheredBeams.push({
    type: 'featheredBeam',
    tick: track.cursor,
    direction: directionArg.value as FeatheredBeamDirection,
    dur,
  });

  return makeNull();
}

export function builtinBreath(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'breath() only valid in vocal tracks', position, this.filePath);
  }

  const dur = this.evaluate(args[0]);
  const intensity = args.length > 1 ? this.evaluate(args[1]) : makeInt(80);

  if (dur.type !== 'dur') {
    throw new MFError('TYPE', 'breath() duration must be Dur', position, this.filePath);
  }

  const durTicks = this.durToTicks(dur, position);
  const tick = track.cursor;

  const event: BreathEvent = {
    type: 'breath',
    tick,
    dur: durTicks,
    intensity: intensity.type === 'int' ? intensity.value : 80,
  };
  track.events.push(event);

  track.cursor += durTicks;
  return makeNull();
}

export function builtinAutoBreath(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (track.kind !== 'vocal') {
    throw new MFError('TYPE', 'autoBreath() only valid in vocal tracks', position, this.filePath);
  }

  const enabled = args.length > 0 ? this.evaluate(args[0]) : makeBool(true);
  const minRestDur = args.length > 1 ? this.evaluate(args[1]) : null;
  const breathDur = args.length > 2 ? this.evaluate(args[2]) : null;
  const intensity = args.length > 3 ? this.evaluate(args[3]) : makeInt(80);

  // Store auto-breath settings in track meta (use 1/0 for boolean)
  track.meta.autoBreathEnabled = enabled.type === 'bool' ? (enabled.value ? 1 : 0) : 1;
  if (minRestDur && minRestDur.type === 'dur') {
    track.meta.autoBreathMinRest = this.durToTicks(minRestDur, position);
  }
  if (breathDur && breathDur.type === 'dur') {
    track.meta.autoBreathDuration = this.durToTicks(breathDur, position);
  }
  track.meta.autoBreathIntensity = intensity.type === 'int' ? intensity.value : 80;

  return makeNull();
}
