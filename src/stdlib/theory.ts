import { transposePitch } from '../pitch.js';
import {
  ObjectValue,
  RuntimeValue,
  makeArray,
  makeNativeFunction,
  makeObject,
} from '../runtime.js';

export function createTheoryModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('majorTriad', makeNativeFunction('majorTriad', (args) => {
    const root = expectPitch(args[0]);
    return makeArray([
      { type: 'pitch', value: root },
      { type: 'pitch', value: transposePitch(root, 4) },
      { type: 'pitch', value: transposePitch(root, 7) },
    ]);
  }));

  props.set('minorTriad', makeNativeFunction('minorTriad', (args) => {
    const root = expectPitch(args[0]);
    return makeArray([
      { type: 'pitch', value: root },
      { type: 'pitch', value: transposePitch(root, 3) },
      { type: 'pitch', value: transposePitch(root, 7) },
    ]);
  }));

  props.set('scaleMajor', makeNativeFunction('scaleMajor', (args) => {
    const root = expectPitch(args[0]);
    return makeArray(majorScale(root).map((p) => ({ type: 'pitch', value: p })));
  }));

  props.set('scaleMinor', makeNativeFunction('scaleMinor', (args) => {
    const root = expectPitch(args[0]);
    return makeArray(minorScale(root).map((p) => ({ type: 'pitch', value: p })));
  }));

  return makeObject(props);
}

function majorScale(root: { midi: number; cents: number }) {
  const intervals = [0, 2, 4, 5, 7, 9, 11, 12];
  return intervals.map((i) => transposePitch(root, i));
}

function minorScale(root: { midi: number; cents: number }) {
  const intervals = [0, 2, 3, 5, 7, 8, 10, 12];
  return intervals.map((i) => transposePitch(root, i));
}

function expectPitch(value: RuntimeValue) {
  if (value.type !== 'pitch') throw new Error('Expected pitch');
  return value.value;
}
