import {
  CurveValue,
  ObjectValue,
  RuntimeValue,
  makeArray,
  makeCurve,
  makeNativeFunction,
  makeNumber,
  makeObject,
} from '../runtime.js';

export function createCurvesModule(): ObjectValue {
  const props = new Map<string, RuntimeValue>();

  props.set('linear', makeNativeFunction('linear', (args) => {
    const a = expectNumber(args[0]);
    const b = expectNumber(args[1]);
    const steps = Math.max(2, Math.floor(expectNumber(args[2])));
    return makeCurve(linearCurve(a, b, steps));
  }));

  props.set('easeInOut', makeNativeFunction('easeInOut', (args) => {
    const a = expectNumber(args[0]);
    const b = expectNumber(args[1]);
    const steps = Math.max(2, Math.floor(expectNumber(args[2])));
    return makeCurve(easeInOutCurve(a, b, steps));
  }));

  props.set('piecewise', makeNativeFunction('piecewise', (args) => {
    const points = parsePoints(args[0]);
    return makeCurve({ kind: 'piecewiseLinear' as const, points });
  }));

  return makeObject(props);
}

function linearCurve(a: number, b: number, steps: number) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    points.push({ t, v: a + (b - a) * t });
  }
  return { kind: 'piecewiseLinear' as const, points };
}

function easeInOutCurve(a: number, b: number, steps: number) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const eased = t * t * (3 - 2 * t);
    points.push({ t, v: a + (b - a) * eased });
  }
  return { kind: 'piecewiseLinear' as const, points };
}

function parsePoints(value: RuntimeValue) {
  if (value.type !== 'array') {
    throw new Error('piecewise expects array of points');
  }
  const points: Array<{ t: number; v: number }> = [];
  for (const item of value.elements) {
    if (item.type === 'array' && item.elements.length >= 2) {
      const t = expectNumber(item.elements[0]);
      const v = expectNumber(item.elements[1]);
      points.push({ t, v });
    } else if (item.type === 'object') {
      const t = item.props.get('t');
      const v = item.props.get('v');
      if (t && v) {
        points.push({ t: expectNumber(t), v: expectNumber(v) });
      }
    }
  }
  return points;
}

function expectNumber(value: RuntimeValue): number {
  if (value.type === 'number') return value.value;
  if (value.type === 'rat') return value.value.n / value.value.d;
  throw new Error('Expected number');
}
