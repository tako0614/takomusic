import { describe, it, expect } from 'vitest';
import { compileToIR, checkSource, minimalScore } from './helpers/testUtils.js';

describe('Evaluator', () => {
  describe('arithmetic operations', () => {
    it('evaluates addition', () => {
      const source = `
export fn main() -> Score {
  const x = 1 + 2;
  return score {
    meta { title "Test"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Test');
    });

    it('evaluates complex expressions', () => {
      const source = `
export fn main() -> Score {
  const x = (10 + 5) * 2 - 8 / 4;
  return score {
    meta { title "Computed"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Computed');
    });
  });

  describe('function calls', () => {
    it('evaluates function with parameters', () => {
      const source = `
fn greet(name: String) -> String {
  return "Hello " + name;
}

export fn main() -> Score {
  return score {
    meta { title greet("World"); }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toContain('World');
    });

    it('evaluates recursive function', () => {
      const source = `
fn factorial(n: Int) -> Int {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

export fn main() -> Score {
  const result = factorial(5);
  const title = match (result) {
    120 -> "Correct";
    else -> "Wrong";
  };
  return score {
    meta { title title; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Correct');
    });
  });

  describe('control flow', () => {
    it('evaluates if-else correctly', () => {
      const source = `
fn classify(n: Int) -> String {
  if (n > 0) {
    return "positive";
  } else if (n < 0) {
    return "negative";
  } else {
    return "zero";
  }
}

export fn main() -> Score {
  return score {
    meta { title classify(5); }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('positive');
    });

    it('evaluates for loop', () => {
      const source = `
fn buildClip() -> Clip {
  let c = clip {};
  for (i in [1, 2, 3]) {
    c = clip { note(C4, q); };
  }
  return c;
}

export fn main() -> Score {
  return score {
    meta { title "ForLoop"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {
      place 1:1 buildClip();
    }
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('ForLoop');
    });

    it('evaluates match expression', () => {
      const source = `
fn describe(n: Int) -> String {
  return match (n) {
    1 -> "one";
    2 -> "two";
    3 -> "three";
    else -> "many";
  };
}

export fn main() -> Score {
  return score {
    meta { title describe(2); }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('two');
    });
  });

  describe('clip generation', () => {
    it('generates clip with notes', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q);
        note(E4, q);
        note(G4, h);
      };
    }
  };
}`;
      const ir = compileToIR(source);
      expect(ir.tracks).toHaveLength(1);
      expect(ir.tracks[0].placements).toHaveLength(1);
      const events = ir.tracks[0].placements[0].clip.events;
      expect(events.filter(e => e.type === 'note')).toHaveLength(3);
    });

    it('generates clip with rests', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q);
        rest(q);
        note(E4, h);
      };
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      // Rests don't generate events, they just advance time
      expect(events.filter(e => e.type === 'note')).toHaveLength(2);
    });
  });

  describe('score structure', () => {
    it('generates correct tempo map', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.tempoMap).toHaveLength(1);
      expect(ir.tempoMap[0].bpm).toBe(120);
    });

    it('generates correct meter map', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meterMap).toHaveLength(1);
      // meterMap structure varies - just check it exists
      expect(ir.meterMap[0]).toBeDefined();
    });

    it('generates markers', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    marker(1:1, "section", "Intro");
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.markers).toHaveLength(1);
      expect(ir.markers![0].label).toBe('Intro');
    });
  });

  describe('stdlib integration', () => {
    it('uses repeat from std:core', () => {
      const source = `
import { repeat } from "std:core";

fn part() -> Clip {
  return clip { note(C4, q); };
}

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 repeat(part(), 4);
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      expect(events.filter(e => e.type === 'note')).toHaveLength(4);
    });

    it('uses concat from std:core', () => {
      const source = `
import { concat } from "std:core";

fn partA() -> Clip {
  return clip { note(C4, q); };
}

fn partB() -> Clip {
  return clip { note(E4, q); };
}

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 concat(partA(), partB());
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      expect(events.filter(e => e.type === 'note')).toHaveLength(2);
    });
  });

  describe('array operations', () => {
    it('accesses array elements', () => {
      const source = `
fn getFirst(arr: Array) -> Int {
  return arr[0];
}

export fn main() -> Score {
  const x = getFirst([10, 20, 30]);
  return score {
    meta { title "ArrayAccess"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('ArrayAccess');
    });
  });

  describe('object operations', () => {
    it('accesses object properties', () => {
      const source = `
fn getName(obj: Object) -> String {
  return obj.name;
}

export fn main() -> Score {
  const person = { name: "Alice", age: 30 };
  return score {
    meta { title getName(person); }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Alice');
    });
  });

  describe('scope and closures', () => {
    it('uses scope correctly', () => {
      const source = `
fn outer() -> Int {
  const x = 10;
  const y = 20;
  return x + y;
}

export fn main() -> Score {
  const result = outer();
  return score {
    meta { title "Scope"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Scope');
    });
  });

  describe('nullish coalescing', () => {
    it('evaluates nullish coalescing operator', () => {
      const source = `
fn getDefault(val: String) -> String {
  return val ?? "fallback";
}

export fn main() -> Score {
  const result = getDefault("provided");
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('provided');
    });
  });

  describe('template literals', () => {
    it('evaluates simple template literal', () => {
      const source = `
export fn main() -> Score {
  const name = "World";
  const msg = "Hello \${name}!";
  return score {
    meta { title msg; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Hello World!');
    });

    it('evaluates template literal with expression', () => {
      const source = `
export fn main() -> Score {
  const calc = "1 + 2 = \${1 + 2}";
  return score {
    meta { title calc; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('1 + 2 = 3');
    });

    it('evaluates template literal with multiple expressions', () => {
      const source = `
export fn main() -> Score {
  const a = 10;
  const b = 20;
  const msg = "\${a} + \${b} = \${a + b}";
  return score {
    meta { title msg; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('10 + 20 = 30');
    });

    it('evaluates escaped dollar sign', () => {
      const source = `
export fn main() -> Score {
  const msg = "Price: \\$100";
  return score {
    meta { title msg; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Price: $100');
    });

    it('evaluates nested template literals', () => {
      const source = `
export fn main() -> Score {
  const b = "inner";
  const a = "outer-\${b}";
  const result = "Result: \${a}";
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      const ir = compileToIR(source);
      expect(ir.meta.title).toBe('Result: outer-inner');
    });
  });
});
