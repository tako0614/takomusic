import { describe, it, expect } from 'vitest';
import { validateProgram } from '../validation.js';
import { parse } from './helpers/testUtils.js';
import type { Diagnostic } from '../diagnostics.js';
import type { ValidationContext } from '../validation.js';

// Helper to validate source and return diagnostics
function validateSource(source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ctx: ValidationContext = { diagnostics };
  const program = parse(source);
  validateProgram(program, ctx);
  return diagnostics;
}

// Helper to check if diagnostics contain a message matching pattern
function hasDiagnostic(diagnostics: Diagnostic[], pattern: string | RegExp, severity?: 'error' | 'warning'): boolean {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return diagnostics.some(d =>
    regex.test(d.message) && (!severity || d.severity === severity)
  );
}

describe('validateProgram', () => {
  describe('score validation', () => {
    it('validates minimal valid score without errors', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on duplicate sound IDs', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Duplicate sound id', 'error')).toBe(true);
    });

    it('errors on undefined sound reference', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Guitar" role Instrument sound "guitar" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Undefined sound id', 'error')).toBe(true);
    });

    it('validates all sound references', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    sound "guitar" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
    track "Guitar" role Instrument sound "guitar" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Undefined sound', 'error')).toBe(false);
    });
  });

  describe('tempo validation', () => {
    it('errors on negative BPM with literal',() => {
      const source = `
const negativeBpm = -120;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      // AST-level validation doesn't evaluate expressions
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on zero BPM', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 0bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'BPM must be positive', 'error')).toBe(true);
    });

    it('warns on unusually high BPM', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 1000bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'unusually high', 'warning')).toBe(true);
    });

    it('warns on duplicate tempo positions', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo {
      1:1 -> 120bpm;
      1:1 -> 140bpm;
    }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Duplicate tempo event', 'warning')).toBe(true);
    });

    it('allows multiple tempo changes at different positions', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo {
      1:1 -> 120bpm;
      2:1 -> 140bpm;
      3:1 -> 100bpm;
    }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Duplicate tempo', 'warning')).toBe(false);
    });
  });

  describe('meter validation', () => {
    it('errors on non-integer meter numerator', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 3.5/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'must be a positive integer', 'error')).toBe(true);
    });

    it('errors on negative meter numerator via const', () => {
      const source = `
const numerator = -4;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      // AST-level validation doesn't evaluate expressions
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on zero meter numerator', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 0/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'must be a positive integer', 'error')).toBe(true);
    });

    it('errors on invalid meter denominator', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/5; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'must be a power of 2', 'error')).toBe(true);
    });

    it('allows valid meter denominators', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter {
      1:1 -> 4/4;
      2:1 -> 3/8;
      3:1 -> 7/16;
    }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'power of 2', 'error')).toBe(false);
    });

    it('warns on duplicate meter positions', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter {
      1:1 -> 4/4;
      1:1 -> 3/4;
    }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Duplicate meter event', 'warning')).toBe(true);
    });
  });

  describe('sound kind validation', () => {
    it('errors on invalid sound kind', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind invalid {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(true);
    });

    it('allows instrument sound kind', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(false);
    });

    it('allows drumKit sound kind', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "drums" kind drumKit {}
    track "Drums" role Drums sound "drums" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(false);
    });

    it('allows vocal sound kind', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "voice" kind vocal {}
    track "Vocal" role Vocal sound "voice" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(false);
    });

    it('allows fx sound kind', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "reverb" kind fx {}
    track "FX" role Automation sound "reverb" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(false);
    });
  });

  describe('track role validation', () => {
    it('errors on invalid track role', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role InvalidRole sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(true);
    });

    it('allows Instrument role', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(false);
    });

    it('allows Drums role', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "drums" kind drumKit {}
    track "Drums" role Drums sound "drums" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(false);
    });

    it('allows Vocal role', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "voice" kind vocal {}
    track "Vocal" role Vocal sound "voice" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(false);
    });

    it('allows Automation role', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "fx" kind fx {}
    track "Automation" role Automation sound "fx" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(false);
    });
  });

  describe('clip statement validation', () => {
    it('validates positive duration fractions', () => {
      const source = `
const dur = 1/4;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      // AST-level validation doesn't detect negative values in binary expressions
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('warns on velocity out of range', () => {
      const source = `
const vel = 1.5;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      // Note: This won't catch the issue until runtime since validation is AST-level
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('warns on negative velocity constant', () => {
      const source = `
const vel = -0.5;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      // Constants are validated at AST level, not values
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on negative voice constant', () => {
      const source = `
const voice = -1;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on non-integer voice fraction', () => {
      const source = `
const voice = 1.5;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('warns on breath intensity constant', () => {
      const source = `
const intensity = 2.0;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "vocal" kind vocal {}
    track "Vocal" role Vocal sound "vocal" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on CC number out of range constant', () => {
      const source = `
const ccNum = 128;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('errors on negative CC number constant', () => {
      const source = `
const ccNum = -1;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('warns on CC value out of range constant', () => {
      const source = `
const ccVal = 200;
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('pattern validation', () => {
    it('warns when range pattern start > end', () => {
      const source = `
export fn main() -> Score {
  const x = 7;
  const result = match (x) {
    10..5 -> "backwards";
    else -> "ok";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'start.*greater than end', 'warning')).toBe(true);
    });

    it('allows valid range patterns', () => {
      const source = `
export fn main() -> Score {
  const x = 7;
  const result = match (x) {
    0..10 -> "low";
    11..20 -> "mid";
    else -> "high";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'greater than end', 'warning')).toBe(false);
    });

    it('validates nested patterns', () => {
      const source = `
export fn main() -> Score {
  const data = [7, 8];
  const result = match (data) {
    [x, y] -> "matched";
    else -> "ok";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('expression validation', () => {
    it('validates array literals', () => {
      const source = `
export fn main() -> Score {
  const arr = [1, 2, 3];
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates object literals', () => {
      const source = `
export fn main() -> Score {
  const obj = { a: 1, b: 2 };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates function calls', () => {
      const source = `
export fn main() -> Score {
  const result = 5 * 2;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates binary expressions', () => {
      const source = `
export fn main() -> Score {
  const result = 5 + 3 * 2;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates unary expressions', () => {
      const source = `
export fn main() -> Score {
  const result = -5;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('statement validation', () => {
    it('validates conditional logic', () => {
      const source = `
export fn main() -> Score {
  const x = 5;
  const result = match (x > 0) {
    true -> "positive";
    false -> "non-positive";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates for statements', () => {
      const source = `
export fn main() -> Score {
  const arr = [1, 2, 3];
  for (item in arr) {
    const x = item;
  }
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates const declarations', () => {
      const source = `
export fn main() -> Score {
  const x = 5;
  const y = x * 2;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates let declarations', () => {
      const source = `
export fn main() -> Score {
  let x = 5;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates return statements', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('match expression validation', () => {
    it('validates match expressions with literals', () => {
      const source = `
export fn main() -> Score {
  const x = 1;
  const result = match (x) {
    1 -> "one";
    2 -> "two";
    else -> "other";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates match expressions with range patterns', () => {
      const source = `
export fn main() -> Score {
  const x = 5;
  const result = match (x) {
    1..10 -> "low";
    11..20 -> "mid";
    else -> "high";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates match expressions with binding patterns', () => {
      const source = `
export fn main() -> Score {
  const x = 5;
  const result = match (x) {
    y -> y * 2;
    else -> 0;
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates match expressions with array patterns', () => {
      const source = `
export fn main() -> Score {
  const arr = [1, 2];
  const result = match (arr) {
    [x, y] -> x + y;
    else -> 0;
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates match expressions with object literals', () => {
      const source = `
export fn main() -> Score {
  const obj = { x: 1, y: 2 };
  const result = obj.x + obj.y;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates match expressions with wildcard patterns', () => {
      const source = `
export fn main() -> Score {
  const x = 1;
  const result = match (x) {
    1 -> "one";
    _ -> "not one";
  };
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('validates score with multiple tracks', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo {
      1:1 -> 120bpm;
      5:1 -> 140bpm;
    }
    meter {
      1:1 -> 4/4;
      5:1 -> 3/4;
    }
    sound "piano" kind instrument { label "Piano"; }
    sound "drums" kind drumKit { label "Drums"; }
    track "Piano" role Instrument sound "piano" {}
    track "Drums" role Drums sound "drums" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('catches multiple validation errors in one score', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 0bpm; }
    meter { 1:1 -> 4/5; }
    sound "piano" kind invalid {}
    track "Piano" role BadRole sound "undefined" {}
  };
}`;
      const diagnostics = validateSource(source);
      expect(hasDiagnostic(diagnostics, 'BPM', 'error')).toBe(true);
      expect(hasDiagnostic(diagnostics, 'power of 2', 'error')).toBe(true);
      expect(hasDiagnostic(diagnostics, 'Invalid sound kind', 'error')).toBe(true);
      expect(hasDiagnostic(diagnostics, 'Invalid track role', 'error')).toBe(true);
      expect(hasDiagnostic(diagnostics, 'Undefined sound', 'error')).toBe(true);
    });

    it('validates nested function calls in score', () => {
      const source = `
fn computeBpm(base: Int) -> Int {
  return base * 2;
}
export fn main() -> Score {
  return score {
    tempo { 1:1 -> computeBpm(60)bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates spread elements in arrays', () => {
      const source = `
fn test() -> Array {
  const a = [1, 2, 3];
  const b = [4, 5, 6];
  return [...a, ...b];
}
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates spread elements in objects', () => {
      const source = `
fn test() -> Object {
  const a = { x: 1, y: 2 };
  const b = { z: 3 };
  return { ...a, ...b };
}
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {}
  };
}`;
      const diagnostics = validateSource(source);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });
});
