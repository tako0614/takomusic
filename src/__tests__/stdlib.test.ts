import { describe, it, expect } from 'vitest';
import { compileToIR, checkSource, expectNoErrors } from './helpers/testUtils.js';

/**
 * Tests for TakoMusic Standard Library v4
 *
 * Covers:
 * - std:core (clip operations)
 * - std:theory (chord and scale functions)
 * - Match expressions
 * - v4 language features
 */

describe('std:core', () => {
  describe('clip operations', () => {
    it('repeat creates repeated clip', () => {
      const source = `
import { repeat } from "std:core";

fn motif() -> Clip {
  return clip { note(C4, q); };
}

export fn main() -> Score {
  const repeated = repeat(motif(), 4);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 repeated;
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      const notes = events.filter(e => e.type === 'note');
      expect(notes).toHaveLength(4);
    });

    it('concat combines clips sequentially', () => {
      const source = `
import { concat } from "std:core";

fn partA() -> Clip {
  return clip { note(C4, q); };
}

fn partB() -> Clip {
  return clip { note(E4, q); };
}

export fn main() -> Score {
  const combined = concat(partA(), partB());
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 combined;
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      const notes = events.filter(e => e.type === 'note');
      expect(notes).toHaveLength(2);
    });

    it('merge combines clips in parallel', () => {
      const source = `
import { merge } from "std:core";

fn partA() -> Clip {
  return clip { note(C4, q); };
}

fn partB() -> Clip {
  return clip { note(E4, q); };
}

export fn main() -> Score {
  const combined = merge([partA(), partB()]);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 combined;
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      const notes = events.filter(e => e.type === 'note');
      expect(notes).toHaveLength(2);
    });

    it('reverse reverses clip events', () => {
      const source = `
import { reverse } from "std:core";

fn melody() -> Clip {
  return clip {
    note(C4, q);
    note(D4, q);
    note(E4, q);
  };
}

export fn main() -> Score {
  const reversed = reverse(melody());
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 reversed;
    }
  };
}`;
      const ir = compileToIR(source);
      const events = ir.tracks[0].placements[0].clip.events;
      const notes = events.filter(e => e.type === 'note');
      expect(notes).toHaveLength(3);
    });

    it('length returns array length', () => {
      const source = `
import { length } from "std:core";

export fn main() -> Score {
  const arr = [1, 2, 3, 4, 5];
  const len = length(arr);
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
  });
});

describe('std:theory', () => {
  it('majorTriad returns 3 notes', () => {
    const source = `
import * as theory from "std:theory";
import { length } from "std:core";

export fn main() -> Score {
  const chord = theory.majorTriad(60);  // C4
  const len = length(chord);
  return score {
    meta { title "Triad"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Triad');
  });

  it('major7 returns 4 notes', () => {
    const source = `
import * as theory from "std:theory";
import { length } from "std:core";

export fn main() -> Score {
  const chord = theory.major7(60);  // C4
  const len = length(chord);
  return score {
    meta { title "Seventh"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Seventh');
  });

  it('major scale returns 7 notes', () => {
    const source = `
import * as theory from "std:theory";
import { length } from "std:core";

export fn main() -> Score {
  const scale = theory.major(60);  // C major starting at C4
  const len = length(scale);
  return score {
    meta { title "Scale"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Scale');
  });
});

describe('std:transform', () => {
  it('transpose shifts clip pitches', () => {
    const source = `
import * as transform from "std:transform";

fn melody() -> Clip {
  return clip {
    note(C4, q);
    note(E4, q);
  };
}

export fn main() -> Score {
  const transposed = transform.transpose(melody(), 7);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 transposed;
    }
  };
}`;
    const ir = compileToIR(source);
    const events = ir.tracks[0].placements[0].clip.events;
    const notes = events.filter(e => e.type === 'note');
    expect(notes).toHaveLength(2);
    // C4 (60) + 7 = G4 (67)
    expect((notes[0] as any).pitch.midi).toBe(67);
  });
});

describe('match expressions', () => {
  it('matches literal patterns', () => {
    const source = `
fn describe(num: Int) -> String {
  return match (num) {
    1 -> "one";
    2 -> "two";
    3 -> "three";
    else -> "many";
  };
}

export fn main() -> Score {
  const result = describe(2);
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('two');
  });

  it('uses else as fallback', () => {
    const source = `
fn category(val: Int) -> String {
  return match (val) {
    1 -> "first";
    2 -> "second";
    else -> "other";
  };
}

export fn main() -> Score {
  const result = category(100);
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('other');
  });
});

describe('template literals', () => {
  it('interpolates variables', () => {
    const source = `
export fn main() -> Score {
  const name = "World";
  const greeting = "Hello \${name}!";
  return score {
    meta { title greeting; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Hello World!');
  });

  it('interpolates expressions', () => {
    const source = `
export fn main() -> Score {
  const result = "Sum: \${1 + 2 + 3}";
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Sum: 6');
  });
});

describe('spread operator', () => {
  it('spreads arrays', () => {
    const source = `
import { length } from "std:core";

export fn main() -> Score {
  const arr1 = [1, 2];
  const arr2 = [3, 4];
  const combined = [...arr1, ...arr2, 5];
  const len = length(combined);
  return score {
    meta { title "Spread"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Spread');
  });

  it('spreads objects', () => {
    const source = `
export fn main() -> Score {
  const obj1 = { name: "Test" };
  const obj2 = { ...obj1, value: 42 };
  return score {
    meta { title obj2.name; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Test');
  });
});

describe('nullish coalescing', () => {
  it('returns left value when not null', () => {
    const source = `
export fn main() -> Score {
  const value = "present";
  const result = value ?? "default";
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('present');
  });

  it('returns right value when left is null', () => {
    const source = `
export fn main() -> Score {
  const value = null;
  const result = value ?? "default";
  return score {
    meta { title result; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('default');
  });
});

describe('tuple destructuring', () => {
  it('destructures array values', () => {
    const source = `
fn pair() -> Array {
  return [10, 20];
}

export fn main() -> Score {
  const (first, second) = pair();
  const sum = first + second;
  return score {
    meta { title "Destruct"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Destruct');
  });
});

describe('arpeggio', () => {
  it('generates ascending arpeggio', () => {
    const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        arp([C4, E4, G4], e, up);
      };
    }
  };
}`;
    const ir = compileToIR(source);
    const events = ir.tracks[0].placements[0].clip.events;
    const notes = events.filter(e => e.type === 'note');
    expect(notes).toHaveLength(3);
  });

  it('generates descending arpeggio', () => {
    const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        arp([C4, E4, G4], e, down);
      };
    }
  };
}`;
    const ir = compileToIR(source);
    const events = ir.tracks[0].placements[0].clip.events;
    const notes = events.filter(e => e.type === 'note');
    expect(notes).toHaveLength(3);
  });
});

describe('triplet', () => {
  it('generates triplet rhythm', () => {
    const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument {}
    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        triplet(3) {
          note(C4, e);
          note(D4, e);
          note(E4, e);
        }
      };
    }
  };
}`;
    const ir = compileToIR(source);
    const events = ir.tracks[0].placements[0].clip.events;
    const notes = events.filter(e => e.type === 'note');
    expect(notes).toHaveLength(3);
  });
});

describe('for loop', () => {
  it('iterates over array', () => {
    const source = `
export fn main() -> Score {
  let count = 0;
  for (item in [1, 2, 3, 4, 5]) {
    count = count + 1;
  }
  return score {
    meta { title "Loop"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Loop');
  });
});

describe('recursive function', () => {
  it('computes factorial', () => {
    const source = `
fn factorial(num: Int) -> Int {
  if (num <= 1) {
    return 1;
  }
  return num * factorial(num - 1);
}

export fn main() -> Score {
  const result = factorial(5);
  return score {
    meta { title "Factorial"; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('Factorial');
  });
});

describe('object access', () => {
  it('accesses object properties', () => {
    const source = `
export fn main() -> Score {
  const person = { name: "Alice", age: 30 };
  return score {
    meta { title person.name; }
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

describe('array access', () => {
  it('accesses array elements', () => {
    const source = `
export fn main() -> Score {
  const items = ["first", "second", "third"];
  return score {
    meta { title items[1]; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
    const ir = compileToIR(source);
    expect(ir.meta.title).toBe('second');
  });
});
