import { describe, it, expect, beforeEach } from 'vitest';
import { registerBuiltins } from '../builtins.js';
import { Scope } from '../scope.js';
import type { RuntimeValue, FunctionValue, NativeContext } from '../runtime.js';
import {
  makeNumber,
  makeString,
  makeBool,
  makeArray,
  makeObject,
  makeNull,
  makeRatValue,
  makePitchValue,
} from '../runtime.js';

describe('builtins', () => {
  let scope: Scope;
  let mockContext: NativeContext;

  beforeEach(() => {
    scope = new Scope();

    // Create a mock context for function calls
    mockContext = {
      callFunction: (fn: FunctionValue, args: RuntimeValue[], named: Map<string, RuntimeValue>): RuntimeValue => {
        if (fn.native) {
          return fn.native(args, named, mockContext);
        }
        throw new Error('Non-native function in test context');
      },
    };

    registerBuiltins(scope);
  });

  describe('registerBuiltins', () => {
    it('registers sort function', () => {
      const sortFn = scope.get('sort');
      expect(sortFn.type).toBe('function');
      expect((sortFn as FunctionValue).name).toBe('sort');
    });

    it('registers sortBy function', () => {
      const sortByFn = scope.get('sortBy');
      expect(sortByFn.type).toBe('function');
      expect((sortByFn as FunctionValue).name).toBe('sortBy');
    });

    it('registers reverse function as reverseArr', () => {
      const reverseFn = scope.get('reverseArr');
      expect(reverseFn.type).toBe('function');
      expect((reverseFn as FunctionValue).name).toBe('reverse');
    });

    it('all builtin functions are native', () => {
      const sortFn = scope.get('sort') as FunctionValue;
      const sortByFn = scope.get('sortBy') as FunctionValue;
      const reverseFn = scope.get('reverseArr') as FunctionValue;

      expect(sortFn.native).toBeDefined();
      expect(sortByFn.native).toBeDefined();
      expect(reverseFn.native).toBeDefined();
    });
  });

  describe('sort function', () => {
    let sortFn: FunctionValue;

    beforeEach(() => {
      sortFn = scope.get('sort') as FunctionValue;
    });

    it('sorts numbers in ascending order', () => {
      const arr = makeArray([makeNumber(3), makeNumber(1), makeNumber(4), makeNumber(1), makeNumber(5)]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([1, 1, 3, 4, 5]);
    });

    it('sorts strings alphabetically', () => {
      const arr = makeArray([makeString('banana'), makeString('apple'), makeString('cherry')]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('sorts booleans', () => {
      const arr = makeArray([makeBool(true), makeBool(false), makeBool(true)]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([false, true, true]);
    });

    it('sorts rational numbers', () => {
      const arr = makeArray([
        makeRatValue({ n: 3, d: 4 }),
        makeRatValue({ n: 1, d: 2 }),
        makeRatValue({ n: 1, d: 4 }),
      ]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].value).toEqual({ n: 1, d: 4 });
      expect(elements[1].value).toEqual({ n: 1, d: 2 });
      expect(elements[2].value).toEqual({ n: 3, d: 4 });
    });

    it('sorts mixed numbers and rationals', () => {
      const arr = makeArray([
        makeNumber(2),
        makeRatValue({ n: 1, d: 2 }),
        makeNumber(1),
        makeRatValue({ n: 3, d: 2 }),
      ]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      const values = elements.map((e: any) => {
        if (e.type === 'number') return e.value;
        if (e.type === 'rat') return e.value.n / e.value.d;
        return 0;
      });
      expect(values).toEqual([0.5, 1, 1.5, 2]);
    });

    it('sorts pitches by MIDI number', () => {
      const arr = makeArray([
        makePitchValue({ midi: 64, cents: 0 }),
        makePitchValue({ midi: 60, cents: 0 }),
        makePitchValue({ midi: 67, cents: 0 }),
      ]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].value.midi).toBe(60);
      expect(elements[1].value.midi).toBe(64);
      expect(elements[2].value.midi).toBe(67);
    });

    it('sorts pitches with microtonal cents', () => {
      const arr = makeArray([
        makePitchValue({ midi: 60, cents: 50 }),
        makePitchValue({ midi: 60, cents: 0 }),
        makePitchValue({ midi: 60, cents: 25 }),
      ]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].value.cents).toBe(0);
      expect(elements[1].value.cents).toBe(25);
      expect(elements[2].value.cents).toBe(50);
    });

    it('handles null values', () => {
      const arr = makeArray([makeNumber(2), makeNull(), makeNumber(1)]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].type).toBe('null');
      expect(elements[1].value).toBe(1);
      expect(elements[2].value).toBe(2);
    });

    it('handles empty array', () => {
      const arr = makeArray([]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements).toEqual([]);
    });

    it('handles single element array', () => {
      const arr = makeArray([makeNumber(42)]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements.length).toBe(1);
      expect((result as any).elements[0].value).toBe(42);
    });

    it('returns new array without modifying original', () => {
      const original = [makeNumber(3), makeNumber(1), makeNumber(2)];
      const arr = makeArray([...original]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect((arr as any).elements[0].value).toBe(3);
      expect((result as any).elements[0].value).toBe(1);
    });

    it('sorts with custom key function', () => {
      // Create a key function that extracts absolute value
      const keyFn: FunctionValue = {
        type: 'function',
        name: 'abs',
        native: (args: RuntimeValue[]) => {
          const val = (args[0] as any).value;
          return makeNumber(Math.abs(val));
        },
      };

      const arr = makeArray([makeNumber(-3), makeNumber(1), makeNumber(-2)]);
      const result = sortFn.native!([arr, keyFn], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([1, -2, -3]);
    });

    it('throws error when no arguments provided', () => {
      expect(() => {
        sortFn.native!([], new Map(), mockContext);
      }).toThrow('sort() requires at least 1 argument');
    });

    it('throws error when first argument is not array', () => {
      expect(() => {
        sortFn.native!([makeNumber(42)], new Map(), mockContext);
      }).toThrow('sort() first argument must be an array');
    });

    it('handles mixed types by comparing type names', () => {
      const arr = makeArray([makeString('hello'), makeNumber(42), makeBool(true)]);
      const result = sortFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.length).toBe(3);
    });
  });

  describe('sortBy function', () => {
    let sortByFn: FunctionValue;

    beforeEach(() => {
      sortByFn = scope.get('sortBy') as FunctionValue;
    });

    it('sorts objects by property name', () => {
      const obj1 = makeObject(new Map([['age', makeNumber(30)]]));
      const obj2 = makeObject(new Map([['age', makeNumber(20)]]));
      const obj3 = makeObject(new Map([['age', makeNumber(25)]]));
      const arr = makeArray([obj1, obj2, obj3]);

      const result = sortByFn.native!([arr, makeString('age')], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect((elements[0] as any).props.get('age').value).toBe(20);
      expect((elements[1] as any).props.get('age').value).toBe(25);
      expect((elements[2] as any).props.get('age').value).toBe(30);
    });

    it('sorts objects by string property', () => {
      const obj1 = makeObject(new Map([['name', makeString('Charlie')]]));
      const obj2 = makeObject(new Map([['name', makeString('Alice')]]));
      const obj3 = makeObject(new Map([['name', makeString('Bob')]]));
      const arr = makeArray([obj1, obj2, obj3]);

      const result = sortByFn.native!([arr, makeString('name')], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect((elements[0] as any).props.get('name').value).toBe('Alice');
      expect((elements[1] as any).props.get('name').value).toBe('Bob');
      expect((elements[2] as any).props.get('name').value).toBe('Charlie');
    });

    it('handles missing properties as null', () => {
      const obj1 = makeObject(new Map([['score', makeNumber(100)]]));
      const obj2 = makeObject(new Map([])); // No score property
      const obj3 = makeObject(new Map([['score', makeNumber(50)]]));
      const arr = makeArray([obj1, obj2, obj3]);

      const result = sortByFn.native!([arr, makeString('score')], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].props.get('score')).toBeUndefined();
      expect((elements[1] as any).props.get('score').value).toBe(50);
      expect((elements[2] as any).props.get('score').value).toBe(100);
    });

    it('handles non-object elements gracefully', () => {
      const arr = makeArray([makeNumber(1), makeNumber(2)]);
      const result = sortByFn.native!([arr, makeString('prop')], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements.length).toBe(2);
    });

    it('returns new array without modifying original', () => {
      const obj1 = makeObject(new Map([['val', makeNumber(3)]]));
      const obj2 = makeObject(new Map([['val', makeNumber(1)]]));
      const original = [obj1, obj2];
      const arr = makeArray([...original]);

      const result = sortByFn.native!([arr, makeString('val')], new Map(), mockContext);

      expect((arr as any).elements[0].props.get('val').value).toBe(3);
      expect((result as any).elements[0].props.get('val').value).toBe(1);
    });

    it('throws error when fewer than 2 arguments', () => {
      expect(() => {
        sortByFn.native!([makeArray([])], new Map(), mockContext);
      }).toThrow('sortBy() requires 2 arguments');
    });

    it('throws error when first argument is not array', () => {
      expect(() => {
        sortByFn.native!([makeNumber(42), makeString('prop')], new Map(), mockContext);
      }).toThrow('sortBy() first argument must be an array');
    });

    it('throws error when second argument is not string', () => {
      expect(() => {
        sortByFn.native!([makeArray([]), makeNumber(42)], new Map(), mockContext);
      }).toThrow('sortBy() second argument must be a string');
    });

    it('handles empty array', () => {
      const arr = makeArray([]);
      const result = sortByFn.native!([arr, makeString('prop')], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements).toEqual([]);
    });
  });

  describe('reverse function', () => {
    let reverseFn: FunctionValue;

    beforeEach(() => {
      reverseFn = scope.get('reverseArr') as FunctionValue;
    });

    it('reverses array of numbers', () => {
      const arr = makeArray([makeNumber(1), makeNumber(2), makeNumber(3), makeNumber(4)]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([4, 3, 2, 1]);
    });

    it('reverses array of strings', () => {
      const arr = makeArray([makeString('a'), makeString('b'), makeString('c')]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual(['c', 'b', 'a']);
    });

    it('reverses array of mixed types', () => {
      const arr = makeArray([makeNumber(1), makeString('two'), makeBool(true)]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements[0].type).toBe('bool');
      expect(elements[1].type).toBe('string');
      expect(elements[2].type).toBe('number');
    });

    it('handles empty array', () => {
      const arr = makeArray([]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements).toEqual([]);
    });

    it('handles single element array', () => {
      const arr = makeArray([makeNumber(42)]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      expect((result as any).elements.length).toBe(1);
      expect((result as any).elements[0].value).toBe(42);
    });

    it('returns new array without modifying original', () => {
      const original = [makeNumber(1), makeNumber(2), makeNumber(3)];
      const arr = makeArray([...original]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect((arr as any).elements[0].value).toBe(1);
      expect((result as any).elements[0].value).toBe(3);
    });

    it('handles nested arrays', () => {
      const inner1 = makeArray([makeNumber(1)]);
      const inner2 = makeArray([makeNumber(2)]);
      const arr = makeArray([inner1, inner2]);
      const result = reverseFn.native!([arr], new Map(), mockContext);

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect((elements[0] as any).elements[0].value).toBe(2);
      expect((elements[1] as any).elements[0].value).toBe(1);
    });

    it('throws error when no arguments provided', () => {
      expect(() => {
        reverseFn.native!([], new Map(), mockContext);
      }).toThrow('reverse() requires 1 argument');
    });

    it('throws error when argument is not array', () => {
      expect(() => {
        reverseFn.native!([makeNumber(42)], new Map(), mockContext);
      }).toThrow('reverse() argument must be an array');
    });
  });

  describe('integration tests', () => {
    it('can chain sort and reverse', () => {
      const sortFn = scope.get('sort') as FunctionValue;
      const reverseFn = scope.get('reverseArr') as FunctionValue;

      const arr = makeArray([makeNumber(3), makeNumber(1), makeNumber(2)]);
      const sorted = sortFn.native!([arr], new Map(), mockContext);
      const reversed = reverseFn.native!([sorted], new Map(), mockContext);

      const elements = (reversed as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([3, 2, 1]);
    });

    it('can sort then reverse multiple times', () => {
      const sortFn = scope.get('sort') as FunctionValue;
      const reverseFn = scope.get('reverseArr') as FunctionValue;

      let arr = makeArray([makeNumber(5), makeNumber(2), makeNumber(8), makeNumber(1)]);
      arr = sortFn.native!([arr], new Map(), mockContext) as any;
      arr = reverseFn.native!([arr], new Map(), mockContext) as any;
      arr = reverseFn.native!([arr], new Map(), mockContext) as any;

      const elements = (arr as any).elements;
      expect(elements.map((e: any) => e.value)).toEqual([1, 2, 5, 8]);
    });

    it('sortBy works with objects containing multiple properties', () => {
      const sortByFn = scope.get('sortBy') as FunctionValue;

      const obj1 = makeObject(new Map([
        ['name', makeString('Alice')],
        ['age', makeNumber(30)],
      ]));
      const obj2 = makeObject(new Map([
        ['name', makeString('Bob')],
        ['age', makeNumber(25)],
      ]));
      const arr = makeArray([obj1, obj2]);

      const resultByAge = sortByFn.native!([arr, makeString('age')], new Map(), mockContext);
      const resultByName = sortByFn.native!([arr, makeString('name')], new Map(), mockContext);

      const byAgeElements = (resultByAge as any).elements;
      expect((byAgeElements[0] as any).props.get('age').value).toBe(25);

      const byNameElements = (resultByName as any).elements;
      expect((byNameElements[0] as any).props.get('name').value).toBe('Alice');
    });
  });

  describe('performance characteristics', () => {
    it('sorts large array efficiently', () => {
      const sortFn = scope.get('sort') as FunctionValue;
      const size = 1000;
      const elements = Array.from({ length: size }, (_, i) => makeNumber(size - i));
      const arr = makeArray(elements);

      const start = Date.now();
      const result = sortFn.native!([arr], new Map(), mockContext);
      const duration = Date.now() - start;

      expect(result.type).toBe('array');
      expect((result as any).elements.length).toBe(size);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('reverse is O(n)', () => {
      const reverseFn = scope.get('reverseArr') as FunctionValue;
      const size = 10000;
      const elements = Array.from({ length: size }, (_, i) => makeNumber(i));
      const arr = makeArray(elements);

      const start = Date.now();
      const result = reverseFn.native!([arr], new Map(), mockContext);
      const duration = Date.now() - start;

      expect(result.type).toBe('array');
      expect((result as any).elements.length).toBe(size);
      expect(duration).toBeLessThan(50); // Should be very fast for O(n)
    });
  });
});
