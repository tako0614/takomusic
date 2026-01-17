import { describe, it, expect } from 'vitest';
import { Scope } from '../scope.js';
import type { RuntimeValue } from '../runtime.js';

// Helper to create simple runtime values for testing
const makeNumber = (n: number): RuntimeValue => ({ type: 'number', value: n });
const makeBool = (b: boolean): RuntimeValue => ({ type: 'bool', value: b });
const makeString = (s: string): RuntimeValue => ({ type: 'string', value: s });
const makeNull = (): RuntimeValue => ({ type: 'null' });

describe('Scope', () => {
  describe('define', () => {
    it('defines a new binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      expect(scope.has('x')).toBe(true);
      expect(scope.get('x')).toEqual(makeNumber(42));
    });

    it('defines mutable binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(10), true);
      expect(scope.has('x')).toBe(true);
      scope.assign('x', makeNumber(20));
      expect(scope.get('x')).toEqual(makeNumber(20));
    });

    it('defines immutable binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      expect(() => scope.assign('x', makeNumber(100))).toThrow();
    });

    it('throws when defining duplicate symbol', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(1), false);
      expect(() => scope.define('x', makeNumber(2), false)).toThrow('Symbol already defined: x');
    });

    it('defines multiple bindings', () => {
      const scope = new Scope();
      scope.define('a', makeNumber(1), false);
      scope.define('b', makeNumber(2), false);
      scope.define('c', makeNumber(3), false);

      expect(scope.get('a')).toEqual(makeNumber(1));
      expect(scope.get('b')).toEqual(makeNumber(2));
      expect(scope.get('c')).toEqual(makeNumber(3));
    });

    it('defines different value types', () => {
      const scope = new Scope();
      scope.define('num', makeNumber(42), false);
      scope.define('bool', makeBool(true), false);
      scope.define('str', makeString('hello'), false);
      scope.define('nil', makeNull(), false);

      expect(scope.get('num')).toEqual(makeNumber(42));
      expect(scope.get('bool')).toEqual(makeBool(true));
      expect(scope.get('str')).toEqual(makeString('hello'));
      expect(scope.get('nil')).toEqual(makeNull());
    });
  });

  describe('get', () => {
    it('retrieves defined binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      expect(scope.get('x')).toEqual(makeNumber(42));
    });

    it('throws error for undefined binding', () => {
      const scope = new Scope();
      expect(() => scope.get('undefined')).toThrow();
    });

    it('retrieves from parent scope', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(42), false);

      const child = new Scope(parent);
      expect(child.get('x')).toEqual(makeNumber(42));
    });

    it('retrieves from grandparent scope', () => {
      const grandparent = new Scope();
      grandparent.define('x', makeNumber(42), false);

      const parent = new Scope(grandparent);
      const child = new Scope(parent);

      expect(child.get('x')).toEqual(makeNumber(42));
    });
  });

  describe('assign', () => {
    it('assigns to mutable binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(10), true);
      scope.assign('x', makeNumber(20));
      expect(scope.get('x')).toEqual(makeNumber(20));
    });

    it('throws when assigning to immutable binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      expect(() => scope.assign('x', makeNumber(100))).toThrow();
    });

    it('throws when assigning to undefined binding', () => {
      const scope = new Scope();
      expect(() => scope.assign('undefined', makeNumber(1))).toThrow();
    });

    it('assigns to parent scope binding', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(10), true);

      const child = new Scope(parent);
      child.assign('x', makeNumber(20));

      expect(parent.get('x')).toEqual(makeNumber(20));
      expect(child.get('x')).toEqual(makeNumber(20));
    });

    it('multiple assignments to mutable binding', () => {
      const scope = new Scope();
      scope.define('counter', makeNumber(0), true);

      scope.assign('counter', makeNumber(1));
      expect(scope.get('counter')).toEqual(makeNumber(1));

      scope.assign('counter', makeNumber(2));
      expect(scope.get('counter')).toEqual(makeNumber(2));

      scope.assign('counter', makeNumber(3));
      expect(scope.get('counter')).toEqual(makeNumber(3));
    });
  });

  describe('has', () => {
    it('returns true for defined binding', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      expect(scope.has('x')).toBe(true);
    });

    it('returns false for undefined binding', () => {
      const scope = new Scope();
      expect(scope.has('undefined')).toBe(false);
    });

    it('returns true for parent scope binding', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(42), false);

      const child = new Scope(parent);
      expect(child.has('x')).toBe(true);
    });

    it('returns false when not in any scope', () => {
      const parent = new Scope();
      parent.define('a', makeNumber(1), false);

      const child = new Scope(parent);
      child.define('b', makeNumber(2), false);

      expect(child.has('c')).toBe(false);
    });
  });

  describe('scoping and shadowing', () => {
    it('child scope shadows parent binding', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(10), false);

      const child = new Scope(parent);
      child.define('x', makeNumber(20), false);

      expect(parent.get('x')).toEqual(makeNumber(10));
      expect(child.get('x')).toEqual(makeNumber(20));
    });

    it('assignment affects closest scope', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(10), true);

      const child = new Scope(parent);
      child.define('x', makeNumber(20), true);

      child.assign('x', makeNumber(30));

      expect(parent.get('x')).toEqual(makeNumber(10)); // Parent unchanged
      expect(child.get('x')).toEqual(makeNumber(30));  // Child changed
    });

    it('multiple nested scopes', () => {
      const global = new Scope();
      global.define('a', makeNumber(1), false);

      const mid = new Scope(global);
      mid.define('b', makeNumber(2), false);

      const local = new Scope(mid);
      local.define('c', makeNumber(3), false);

      expect(local.get('a')).toEqual(makeNumber(1));
      expect(local.get('b')).toEqual(makeNumber(2));
      expect(local.get('c')).toEqual(makeNumber(3));

      expect(mid.has('c')).toBe(false); // c not visible in mid
      expect(global.has('b')).toBe(false); // b not visible in global
    });

    it('shadowing with mutable variables', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(10), true);

      const child = new Scope(parent);
      child.define('x', makeNumber(20), true);

      parent.assign('x', makeNumber(15));
      child.assign('x', makeNumber(25));

      expect(parent.get('x')).toEqual(makeNumber(15));
      expect(child.get('x')).toEqual(makeNumber(25));
    });

    it('assignment to parent when not shadowed', () => {
      const parent = new Scope();
      parent.define('x', makeNumber(10), true);

      const child = new Scope(parent);
      child.assign('x', makeNumber(20)); // Assigns to parent's x

      expect(parent.get('x')).toEqual(makeNumber(20));
      expect(child.get('x')).toEqual(makeNumber(20));
    });
  });

  describe('getAllBindings', () => {
    it('returns all bindings in current scope', () => {
      const scope = new Scope();
      scope.define('a', makeNumber(1), false);
      scope.define('b', makeNumber(2), false);
      scope.define('c', makeNumber(3), false);

      const bindings = scope.getAllBindings();
      expect(bindings).toHaveLength(3);

      const names = bindings.map(([name]) => name);
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
    });

    it('does not include parent bindings', () => {
      const parent = new Scope();
      parent.define('parent_var', makeNumber(10), false);

      const child = new Scope(parent);
      child.define('child_var', makeNumber(20), false);

      const bindings = child.getAllBindings();
      expect(bindings).toHaveLength(1);
      expect(bindings[0][0]).toBe('child_var');
    });

    it('returns empty array for empty scope', () => {
      const scope = new Scope();
      expect(scope.getAllBindings()).toEqual([]);
    });

    it('returns binding values correctly', () => {
      const scope = new Scope();
      scope.define('x', makeNumber(42), false);
      scope.define('y', makeString('hello'), false);

      const bindings = scope.getAllBindings();
      const xBinding = bindings.find(([name]) => name === 'x');
      const yBinding = bindings.find(([name]) => name === 'y');

      expect(xBinding?.[1]).toEqual(makeNumber(42));
      expect(yBinding?.[1]).toEqual(makeString('hello'));
    });
  });

  describe('user-defined bindings', () => {
    it('marks user-defined binding', () => {
      const scope = new Scope();
      scope.defineUser('userVar', makeNumber(42), false);
      expect(scope.isUserDefined('userVar')).toBe(true);
    });

    it('allows redefinition of user-defined bindings', () => {
      const scope = new Scope();
      scope.defineUser('x', makeNumber(1), false);
      scope.defineUser('x', makeNumber(2), false); // Should not throw
      expect(scope.get('x')).toEqual(makeNumber(2));
    });

    it('returns false for non-user-defined bindings', () => {
      const scope = new Scope();
      scope.define('stdVar', makeNumber(42), false);
      expect(scope.isUserDefined('stdVar')).toBe(false);
    });

    it('returns false for undefined bindings', () => {
      const scope = new Scope();
      expect(scope.isUserDefined('undefined')).toBe(false);
    });

    it('defines mutable user binding', () => {
      const scope = new Scope();
      scope.defineUser('x', makeNumber(10), true);
      scope.assign('x', makeNumber(20));
      expect(scope.get('x')).toEqual(makeNumber(20));
    });

    it('defaults to immutable for user bindings', () => {
      const scope = new Scope();
      scope.defineUser('x', makeNumber(42)); // No mutable param
      expect(() => scope.assign('x', makeNumber(100))).toThrow();
    });
  });

  describe('error messages with suggestions', () => {
    it('throws error when getting undefined variable', () => {
      const scope = new Scope();
      scope.define('myVariable', makeNumber(42), false);

      // Should throw when trying to access undefined variable
      expect(() => scope.get('myVariabl')).toThrow(); // Typo: missing 'e'
    });

    it('throws error when assigning to undefined variable', () => {
      const scope = new Scope();
      scope.define('count', makeNumber(0), true);

      // Should throw when trying to assign to undefined variable
      expect(() => scope.assign('counte', makeNumber(1))).toThrow(); // Typo
    });

    it('throws error for immutable assignment', () => {
      const scope = new Scope();
      scope.define('PI', makeNumber(3.14159), false);

      expect(() => scope.assign('PI', makeNumber(3.14))).toThrow();
    });
  });

  describe('complex scope scenarios', () => {
    it('handles function-like scope nesting', () => {
      // Simulate global scope
      const global = new Scope();
      global.define('globalVar', makeNumber(100), false);

      // Simulate function scope
      const fn1 = new Scope(global);
      fn1.define('localVar', makeNumber(10), true);

      // Simulate nested function scope
      const fn2 = new Scope(fn1);
      fn2.define('nestedVar', makeNumber(1), true);

      // fn2 can see all three
      expect(fn2.get('globalVar')).toEqual(makeNumber(100));
      expect(fn2.get('localVar')).toEqual(makeNumber(10));
      expect(fn2.get('nestedVar')).toEqual(makeNumber(1));

      // fn1 can't see nestedVar
      expect(fn1.has('nestedVar')).toBe(false);

      // global can't see local vars
      expect(global.has('localVar')).toBe(false);
      expect(global.has('nestedVar')).toBe(false);
    });

    it('handles block scope with control flow', () => {
      const outer = new Scope();
      outer.define('x', makeNumber(10), true);

      // Simulate if-block
      const ifBlock = new Scope(outer);
      ifBlock.define('y', makeNumber(20), false);

      // Modify outer variable from if-block
      ifBlock.assign('x', makeNumber(15));

      expect(outer.get('x')).toEqual(makeNumber(15));
      expect(ifBlock.get('y')).toEqual(makeNumber(20));
      expect(outer.has('y')).toBe(false);
    });

    it('handles sibling scopes', () => {
      const parent = new Scope();
      parent.define('shared', makeNumber(100), false);

      const child1 = new Scope(parent);
      child1.define('child1Var', makeNumber(1), false);

      const child2 = new Scope(parent);
      child2.define('child2Var', makeNumber(2), false);

      // Both can see parent
      expect(child1.get('shared')).toEqual(makeNumber(100));
      expect(child2.get('shared')).toEqual(makeNumber(100));

      // But not each other's variables
      expect(child1.has('child2Var')).toBe(false);
      expect(child2.has('child1Var')).toBe(false);
    });
  });
});
