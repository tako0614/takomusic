// Layout builtin functions: pageBreak, systemBreak, staffSpacing, text, rehearsalMark, direction, clef, key, fingering

import type { Expression } from '../../types/ast.js';
import type {
  ClefChangeEvent, ClefType,
  KeySignatureEvent, KeyMode,
  FingeringEvent,
} from '../../types/ir.js';
import { RuntimeValue, makeNull, makeString } from '../runtime.js';
import { MFError, createError } from '../../errors.js';
import { toNumber } from '../runtime.js';

export function builtinPageBreak(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (!track.layoutEvents) {
    track.layoutEvents = [];
  }

  track.layoutEvents.push({
    type: 'pageBreak',
    tick: track.cursor,
  });

  return makeNull();
}

export function builtinSystemBreak(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  if (!track.layoutEvents) {
    track.layoutEvents = [];
  }

  track.layoutEvents.push({
    type: 'systemBreak',
    tick: track.cursor,
  });

  return makeNull();
}

export function builtinStaffSpacing(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const above = args.length > 0 ? toNumber(this.evaluate(args[0])) : undefined;
  const below = args.length > 1 ? toNumber(this.evaluate(args[1])) : undefined;

  if (!track.layoutEvents) {
    track.layoutEvents = [];
  }

  track.layoutEvents.push({
    type: 'staffSpacing',
    tick: track.cursor,
    above,
    below,
  });

  return makeNull();
}

export function builtinText(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const text = this.evaluate(args[0]);
  const placement = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'above' };
  const style = args.length > 2 ? this.evaluate(args[2]) : { type: 'string', value: 'normal' };

  if (text.type !== 'string') {
    throw new MFError('TYPE', 'text() must be string', position, this.filePath);
  }

  if (!track.textAnnotations) {
    track.textAnnotations = [];
  }

  track.textAnnotations.push({
    type: 'textAnnotation',
    tick: track.cursor,
    text: text.value,
    placement: (placement as any).value || 'above',
    style: (style as any).value || 'normal',
  });

  return makeNull();
}

export function builtinRehearsalMark(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const label = this.evaluate(args[0]);
  const enclosure = args.length > 1 ? this.evaluate(args[1]) : { type: 'string', value: 'rectangle' };

  if (label.type !== 'string') {
    throw new MFError('TYPE', 'rehearsalMark() label must be string', position, this.filePath);
  }

  if (!track.rehearsalMarks) {
    track.rehearsalMarks = [];
  }

  track.rehearsalMarks.push({
    type: 'rehearsalMark',
    tick: track.cursor,
    label: label.value,
    enclosure: (enclosure as any).value || 'rectangle',
  });

  return makeNull();
}

export function builtinDirection(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const text = this.evaluate(args[0]);

  if (text.type !== 'string') {
    throw new MFError('TYPE', 'direction() text must be string', position, this.filePath);
  }

  if (!track.directionTexts) {
    track.directionTexts = [];
  }

  track.directionTexts.push({
    type: 'directionText',
    tick: track.cursor,
    text: text.value,
  });

  return makeNull();
}

export function builtinClef(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const clefArg = this.evaluate(args[0]);
  if (clefArg.type !== 'string') {
    throw new MFError('TYPE', 'clef() argument must be string', position, this.filePath);
  }

  const validClefs: ClefType[] = ['treble', 'bass', 'alto', 'tenor', 'percussion', 'tab', 'treble8va', 'treble8vb', 'bass8va', 'bass8vb'];
  if (!validClefs.includes(clefArg.value as ClefType)) {
    throw createError('E130', `Invalid clef type '${clefArg.value}'. Valid: ${validClefs.join(', ')}`, position, this.filePath);
  }

  if (!track.clefChanges) track.clefChanges = [];
  const event: ClefChangeEvent = {
    type: 'clefChange',
    tick: track.cursor,
    clef: clefArg.value as ClefType,
  };
  track.clefChanges.push(event);

  return makeNull();
}

export function builtinKey(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const fifthsArg = this.evaluate(args[0]);
  const modeArg = args.length >= 2 ? this.evaluate(args[1]) : makeString('major');

  if (fifthsArg.type !== 'int') {
    throw new MFError('TYPE', 'key() fifths must be int (-7 to 7)', position, this.filePath);
  }
  if (fifthsArg.value < -7 || fifthsArg.value > 7) {
    throw createError('E131', `Key fifths ${fifthsArg.value} out of range -7..7`, position, this.filePath);
  }
  if (modeArg.type !== 'string' || !['major', 'minor'].includes(modeArg.value)) {
    throw new MFError('TYPE', 'key() mode must be "major" or "minor"', position, this.filePath);
  }

  if (!track.keySignatures) track.keySignatures = [];
  const event: KeySignatureEvent = {
    type: 'keySignature',
    tick: track.cursor,
    fifths: fifthsArg.value,
    mode: modeArg.value as KeyMode,
  };
  track.keySignatures.push(event);

  return makeNull();
}

export function builtinFingering(this: any, args: Expression[], position: any): RuntimeValue {
  this.checkTrackPhase(position);
  const track = this.currentTrack!;

  const noteKeyArg = this.evaluate(args[0]);
  const fingerArg = this.evaluate(args[1]);
  const handArg = args.length >= 3 ? this.evaluate(args[2]) : null;

  if (noteKeyArg.type !== 'pitch' && noteKeyArg.type !== 'int') {
    throw new MFError('TYPE', 'fingering() noteKey must be Pitch or int', position, this.filePath);
  }
  if (fingerArg.type !== 'int' && fingerArg.type !== 'string') {
    throw new MFError('TYPE', 'fingering() finger must be int (1-5) or string', position, this.filePath);
  }

  const keyValue = noteKeyArg.type === 'pitch' ? noteKeyArg.midi : noteKeyArg.value;

  if (!track.fingerings) track.fingerings = [];
  const event: FingeringEvent = {
    type: 'fingering',
    tick: track.cursor,
    noteKey: keyValue,
    finger: fingerArg.type === 'int' ? fingerArg.value : fingerArg.value,
  };
  if (handArg && handArg.type === 'string' && ['left', 'right'].includes(handArg.value)) {
    event.hand = handArg.value as 'left' | 'right';
  }
  track.fingerings.push(event);

  return makeNull();
}
