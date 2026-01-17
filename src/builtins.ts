import type { Scope } from './scope.js';
import type { RuntimeValue, FunctionValue, ArrayValue, NativeContext } from './runtime.js';
import { makeNativeFunction, makeArray } from './runtime.js';

/**
 * Register built-in native functions into a scope.
 * These functions are implemented in native JavaScript for performance.
 */
export function registerBuiltins(scope: Scope): void {
  // sort(array, keyFn?) - O(n log n) native sort
  // keyFn is optional; if provided, sorts by keyFn(element)
  // Returns a new sorted array
  const sortFn = makeNativeFunction('sort', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 1) {
      throw new Error('sort() requires at least 1 argument (array)');
    }
    const arr = args[0];
    if (arr.type !== 'array') {
      throw new Error('sort() first argument must be an array');
    }
    const keyFn = args.length > 1 ? args[1] : null;

    // Clone the array elements
    const elements = [...(arr as ArrayValue).elements];

    // Sort using native JavaScript sort (O(n log n))
    if (keyFn && keyFn.type === 'function') {
      const fn = keyFn as FunctionValue;
      elements.sort((a, b) => {
        const keyA = ctx.callFunction(fn, [a], new Map());
        const keyB = ctx.callFunction(fn, [b], new Map());
        return compareValues(keyA, keyB);
      });
    } else {
      elements.sort(compareValues);
    }

    return makeArray(elements);
  });
  scope.define('sort', sortFn, false);

  // sortBy(array, key) - sorts by a specific property name
  const sortByFn = makeNativeFunction('sortBy', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 2) {
      throw new Error('sortBy() requires 2 arguments (array, propertyName)');
    }
    const arr = args[0];
    const keyName = args[1];
    if (arr.type !== 'array') {
      throw new Error('sortBy() first argument must be an array');
    }
    if (keyName.type !== 'string') {
      throw new Error('sortBy() second argument must be a string (property name)');
    }

    const elements = [...(arr as ArrayValue).elements];
    const key = keyName.value;

    elements.sort((a, b) => {
      const keyA = getProperty(a, key);
      const keyB = getProperty(b, key);
      return compareValues(keyA, keyB);
    });

    return makeArray(elements);
  });
  scope.define('sortBy', sortByFn, false);

  // reverse(array) - returns a new reversed array (O(n))
  const reverseFn = makeNativeFunction('reverse', (args: RuntimeValue[], named: Map<string, RuntimeValue>, ctx: NativeContext): RuntimeValue => {
    if (args.length < 1) {
      throw new Error('reverse() requires 1 argument (array)');
    }
    const arr = args[0];
    if (arr.type !== 'array') {
      throw new Error('reverse() argument must be an array');
    }
    return makeArray([...(arr as ArrayValue).elements].reverse());
  });
  scope.define('reverseArr', reverseFn, false);
}

/**
 * Compare two runtime values for sorting.
 */
function compareValues(a: RuntimeValue, b: RuntimeValue): number {
  // Handle nulls
  if (a.type === 'null' && b.type === 'null') return 0;
  if (a.type === 'null') return -1;
  if (b.type === 'null') return 1;

  // Compare numbers
  if (a.type === 'number' && b.type === 'number') {
    return a.value - b.value;
  }

  // Compare rationals
  if (a.type === 'rat' && b.type === 'rat') {
    const aVal = a.value.n / a.value.d;
    const bVal = b.value.n / b.value.d;
    return aVal - bVal;
  }

  // Compare number with rational
  if (a.type === 'number' && b.type === 'rat') {
    return a.value - (b.value.n / b.value.d);
  }
  if (a.type === 'rat' && b.type === 'number') {
    return (a.value.n / a.value.d) - b.value;
  }

  // Compare strings
  if (a.type === 'string' && b.type === 'string') {
    return a.value.localeCompare(b.value);
  }

  // Compare booleans
  if (a.type === 'bool' && b.type === 'bool') {
    return (a.value ? 1 : 0) - (b.value ? 1 : 0);
  }

  // Compare pitches by MIDI number
  if (a.type === 'pitch' && b.type === 'pitch') {
    const diff = a.value.midi - b.value.midi;
    if (diff !== 0) return diff;
    return (a.value.cents || 0) - (b.value.cents || 0);
  }

  // Fallback: compare by type name for consistent ordering
  return a.type.localeCompare(b.type);
}

/**
 * Get a property from a runtime value.
 */
function getProperty(value: RuntimeValue, key: string): RuntimeValue {
  if (value.type === 'object') {
    const prop = value.props.get(key);
    return prop ?? { type: 'null' };
  }
  if (value.type === 'null') return value;

  return { type: 'null' };
}
