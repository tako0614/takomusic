// Scope management for MFS interpreter

import type { RuntimeValue } from './runtime.js';
import type { ProcDeclaration } from '../types/ast.js';

export interface Variable {
  value: RuntimeValue;
  mutable: boolean;
}

export class Scope {
  private variables: Map<string, Variable> = new Map();
  private procs: Map<string, ProcDeclaration> = new Map();
  private parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  defineConst(name: string, value: RuntimeValue): void {
    if (this.variables.has(name)) {
      throw new Error(`Variable '${name}' is already defined`);
    }
    this.variables.set(name, { value, mutable: false });
  }

  defineLet(name: string, value: RuntimeValue): void {
    if (this.variables.has(name)) {
      throw new Error(`Variable '${name}' is already defined`);
    }
    this.variables.set(name, { value, mutable: true });
  }

  assign(name: string, value: RuntimeValue): void {
    const variable = this.resolveVariable(name);
    if (!variable) {
      throw new Error(`Undefined variable '${name}'`);
    }
    if (!variable.mutable) {
      throw new Error(`Cannot reassign constant '${name}'`);
    }
    variable.value = value;
  }

  lookup(name: string): RuntimeValue | undefined {
    const variable = this.resolveVariable(name);
    return variable?.value;
  }

  private resolveVariable(name: string): Variable | undefined {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parent) {
      return this.parent.resolveVariable(name);
    }
    return undefined;
  }

  defineProc(proc: ProcDeclaration): void {
    this.procs.set(proc.name, proc);
  }

  lookupProc(name: string): ProcDeclaration | undefined {
    if (this.procs.has(name)) {
      return this.procs.get(name);
    }
    if (this.parent) {
      return this.parent.lookupProc(name);
    }
    return undefined;
  }

  createChild(): Scope {
    return new Scope(this);
  }
}
