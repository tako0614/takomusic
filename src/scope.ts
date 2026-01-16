import type { Position } from './token.js';
import type { RuntimeValue } from './runtime.js';
import { createError } from './errors.js';
import { findSimilar, formatSuggestion, getAllKnownIdentifiers } from './suggestions.js';

interface Binding {
  value: RuntimeValue;
  mutable: boolean;
  userDefined?: boolean;
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

  assign(name: string, value: RuntimeValue, position?: Position, filePath?: string): void {
    const binding = this.lookupBinding(name);
    if (!binding) {
      throw createError('E201', `"${name}"`, position, filePath, this.getSuggestion(name));
    }
    if (!binding.mutable) {
      throw createError('E202', `"${name}"`, position, filePath);
    }
    binding.value = value;
  }

  get(name: string, position?: Position, filePath?: string): RuntimeValue {
    const binding = this.lookupBinding(name);
    if (!binding) {
      throw createError('E201', `"${name}"`, position, filePath, this.getSuggestion(name));
    }
    return binding.value;
  }

  private getSuggestion(name: string): string | undefined {
    // Collect all known names in scope
    const scopeNames = this.getAllNames();
    const allCandidates = [...scopeNames, ...getAllKnownIdentifiers()];
    const similar = findSimilar(name, allCandidates, { minSimilarity: 0.6, maxResults: 1 });
    const suggestionText = formatSuggestion(similar);
    return suggestionText ?? undefined;
  }

  private getAllNames(): string[] {
    const names: string[] = [];
    for (const name of this.bindings.keys()) {
      names.push(name);
    }
    if (this.parent) {
      names.push(...this.parent.getAllNames());
    }
    return names;
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

  // Get all bindings in this scope (not parent scopes)
  getAllBindings(): Array<[string, RuntimeValue]> {
    const result: Array<[string, RuntimeValue]> = [];
    for (const [name, binding] of this.bindings) {
      result.push([name, binding.value]);
    }
    return result;
  }

  // Check if a binding was user-defined (not from stdlib)
  isUserDefined(name: string): boolean {
    const binding = this.bindings.get(name);
    return binding?.userDefined ?? false;
  }

  // Define a user-defined binding
  defineUser(name: string, value: RuntimeValue, mutable: boolean = false): void {
    if (this.bindings.has(name)) {
      // Allow redefinition in REPL
      this.bindings.set(name, { value, mutable, userDefined: true });
    } else {
      this.bindings.set(name, { value, mutable, userDefined: true });
    }
  }
}
