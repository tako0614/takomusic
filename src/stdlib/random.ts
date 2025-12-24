import {
  ObjectValue,
  RuntimeValue,
  makeArray,
  makeNativeFunction,
  makeNumber,
  makeObject,
  makeRng,
} from '../runtime.js';

const RNG_A = 1664525;
const RNG_C = 1013904223;

export function createRandomModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('rng', makeNativeFunction('rng', (args) => {
    const seed = expectInt(args[0]);
    return makeRng(seed >>> 0);
  }));

  props.set('nextFloat', makeNativeFunction('nextFloat', (args) => {
    const rng = expectRng(args[0]);
    const next = nextState(rng.state);
    const value = next / 0xffffffff;
    return makeArray([makeRng(next), makeNumber(value)]);
  }));

  props.set('nextInt', makeNativeFunction('nextInt', (args) => {
    const rng = expectRng(args[0]);
    const lo = expectInt(args[1]);
    const hi = expectInt(args[2]);
    const span = Math.max(1, hi - lo);
    const next = nextState(rng.state);
    const value = lo + (next % span);
    return makeArray([makeRng(next), makeNumber(value)]);
  }));

  return makeObject(props);
}

function nextState(state: number): number {
  return (state * RNG_A + RNG_C) >>> 0;
}

function expectRng(value: RuntimeValue) {
  if (value.type !== 'rng') throw new Error('Expected Rng');
  return value;
}

function expectInt(value: RuntimeValue): number {
  if (value.type === 'number') return Math.floor(value.value);
  if (value.type === 'rat') return Math.floor(value.value.n / value.value.d);
  throw new Error('Expected int');
}
