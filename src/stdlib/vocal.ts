import { ratFromInt } from '../rat.js';
import {
  AutomationEventValue,
  ClipEventValue,
  ClipValueData,
  Lyric,
  LyricToken,
  ObjectValue,
  PosValue,
  RuntimeValue,
  makeClip,
  makeCurve,
  makeLyric,
  makeLyricToken,
  makeNativeFunction,
  makeObject,
  makePosValue,
  makeString,
} from '../runtime.js';
import { clipLength } from './utils.js';

export function createVocalModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('Strict', makeString('Strict'));
  props.set('BestEffort', makeString('BestEffort'));
  props.set('MelismaHeuristic', makeString('MelismaHeuristic'));

  props.set('text', makeNativeFunction('text', (args, named) => {
    const text = expectString(args[0]);
    const lang = args[1]
      ? expectString(args[1])
      : getNamedString(named, 'lang') ?? 'und';
    const tokens = tokenizeText(text).map((t) => ({ kind: 'syllable' as const, text: t } as LyricToken));
    return makeLyric({ kind: 'text', tokens, lang });
  }));

  props.set('syllables', makeNativeFunction('syllables', (args, named) => {
    const tokenList = parseTokenList(args[0]);
    const lang = args[1]
      ? expectString(args[1])
      : getNamedString(named, 'lang') ?? 'und';
    return makeLyric({ kind: 'syllables', tokens: tokenList, lang });
  }));

  props.set('phonemes', makeNativeFunction('phonemes', (args, named) => {
    const groups = parsePhonemeGroups(args[0]);
    const lang = args[1]
      ? expectString(args[1])
      : getNamedString(named, 'lang') ?? 'und';
    const alphabet = args[2]
      ? expectString(args[2])
      : getNamedString(named, 'alphabet');
    const tokens = groups.map((group) => ({ kind: 'syllable' as const, text: group.join(' ') }));
    return makeLyric({ kind: 'phonemes', tokens, lang, alphabet });
  }));

  props.set('ext', makeNativeFunction('ext', () => {
    return makeLyricToken({ kind: 'extend' });
  }));

  props.set('align', makeNativeFunction('align', (args) => {
    const clip = expectClip(args[0]);
    const lyric = expectLyric(args[1]);
    const tokens = lyric.tokens;
    let index = 0;
    const events = clip.events.map((ev) => {
      if (ev.type !== 'note') return ev;
      const token = tokens[index];
      if (token) {
        index++;
        return { ...ev, lyric: tokenToSpan(token) };
      }
      return ev;
    });
    return makeClip({ events, length: clip.length });
  }));

  props.set('vibrato', makeNativeFunction('vibrato', (args) => {
    return addAutomation(args, 'vocal.vibrato');
  }));

  props.set('portamento', makeNativeFunction('portamento', (args) => {
    return addAutomation(args, 'vocal.portamento');
  }));

  props.set('breathiness', makeNativeFunction('breathiness', (args) => {
    return addAutomation(args, 'vocal.breathiness');
  }));

  props.set('loudness', makeNativeFunction('loudness', (args) => {
    const clip = expectClip(args[0]);
    const curveValue = args[1];
    if (!curveValue || curveValue.type !== 'curve') {
      throw new Error('loudness expects curve');
    }
    const start = args[2] ? expectPos(args[2]) : makePosValue(ratFromInt(0));
    const end = args[3] ? expectPos(args[3]) : defaultEnd(clip);
    const event: AutomationEventValue = {
      type: 'automation',
      param: 'vocal.loudness',
      start,
      end,
      curve: curveValue.curve,
    };
    return makeClip({ events: [...clip.events, event], length: clip.length });
  }));

  return makeObject(props);
}

function addAutomation(args: RuntimeValue[], param: string): RuntimeValue {
  const clip = expectClip(args[0]);
  const amount = args[1] ? expectNumber(args[1]) : 1;
  const start = args[2] ? expectPos(args[2]) : makePosValue(ratFromInt(0));
  const end = args[3] ? expectPos(args[3]) : defaultEnd(clip);
  const curve = makeCurve({
    kind: 'piecewiseLinear',
    points: [
      { t: 0, v: amount },
      { t: 1, v: amount },
    ],
  }).curve;
  const event: AutomationEventValue = {
    type: 'automation',
    param,
    start,
    end,
    curve,
  };
  return makeClip({ events: [...clip.events, event], length: clip.length });
}

function tokenizeText(text: string): string[] {
  if (text.trim().includes(' ')) {
    return text.trim().split(/\s+/g);
  }
  return Array.from(text.trim());
}

function parseTokenList(value: RuntimeValue): LyricToken[] {
  if (value.type !== 'array') throw new Error('syllables expects array');
  const tokens: LyricToken[] = [];
  for (const item of value.elements) {
    if (item.type === 'string') {
      tokens.push({ kind: 'syllable', text: item.value });
    } else if (item.type === 'lyricToken') {
      tokens.push(item.token);
    }
  }
  return tokens;
}

function parsePhonemeGroups(value: RuntimeValue): string[][] {
  if (value.type !== 'array') throw new Error('phonemes expects array');
  const groups: string[][] = [];
  for (const item of value.elements) {
    if (item.type === 'array') {
      groups.push(item.elements.filter((el) => el.type === 'string').map((el) => (el as any).value));
    }
  }
  return groups;
}

function tokenToSpan(token: LyricToken) {
  if (token.kind === 'extend') return { kind: 'extend' as const };
  return { kind: 'syllable' as const, text: token.text };
}

function defaultEnd(clip: ClipValueData): PosValue {
  const length = clipLength(clip) ?? ratFromInt(0);
  return makePosValue(length);
}

function expectClip(value: RuntimeValue): ClipValueData {
  if (!value || value.type !== 'clip') throw new Error('Expected Clip');
  return value.clip;
}

function expectLyric(value: RuntimeValue): Lyric {
  if (!value || value.type !== 'lyric') throw new Error('Expected Lyric');
  return value.lyric;
}

function expectString(value: RuntimeValue): string {
  if (value.type === 'string') return value.value;
  throw new Error('Expected string');
}

function getNamedString(named: Map<string, RuntimeValue>, key: string): string | undefined {
  const value = named.get(key);
  if (!value) return undefined;
  return expectString(value);
}

function expectNumber(value: RuntimeValue): number {
  if (value.type === 'number') return value.value;
  if (value.type === 'rat') return value.value.n / value.value.d;
  throw new Error('Expected number');
}

function expectPos(value: RuntimeValue): PosValue {
  if (value.type !== 'pos') throw new Error('Expected Pos');
  return value;
}
