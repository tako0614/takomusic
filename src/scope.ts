import type { RuntimeValue } from './runtime.js';

interface Binding {
  value: RuntimeValue;
  mutable: boolean;
}

export class Scope {
  private bindings = new Map<string, Binding>();
  private parent?: Scope;

  constructor(parent?: Scope) {
    this.parent = parent;
  }

  define(name: string, value: RuntimeValue, mutable: boolean): void {
    if (this.bindings.has(name)) {
      throw new Error(`Symbol already defined: ${name}`);
    }
    this.bindings.set(name, { value, mutable });
  }

  assign(name: string, value: RuntimeValue): void {
    const binding = this.lookupBinding(name);
    if (!binding) {
      throw new Error(`Undefined symbol: ${name}`);
    }
    if (!binding.mutable) {
      throw new Error(`Cannot assign to const '${name}'`);
    }
    binding.value = value;
  }

  get(name: string): RuntimeValue {
    const binding = this.lookupBinding(name);
    if (!binding) {
      throw new Error(`Undefined symbol: ${name}`);
    }
    return binding.value;
  }

  has(name: string): boolean {
    return !!this.lookupBinding(name);
  }

  private lookupBinding(name: string): Binding | null {
    if (this.bindings.has(name)) {
      return this.bindings.get(name) ?? null;
    }
    if (this.parent) {
      return this.parent.lookupBinding(name);
    }
    return null;
  }
}
