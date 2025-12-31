import { describe, it, expect } from 'vitest';
import { checkSource, expectDiagnostic, expectNoErrors, minimalScore, minimalClipFn } from './helpers/testUtils.js';

describe('TypeChecker', () => {
  describe('Pos/Dur type distinction', () => {
    it('rejects Pos where Dur expected', () => {
      const source = minimalClipFn('rest(1:1);');
      expectDiagnostic(source, /expected duration|expected dur/i);
    });

    it('rejects Dur where Pos expected in tempo', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { q -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectDiagnostic(source, /position|posref/i);
    });

    it('accepts Dur in note', () => {
      const source = minimalClipFn('note(C4, q);');
      expectNoErrors(source);
    });

    it('accepts PosRef in place statement', () => {
      const source = minimalScore('place 1:1 clip { note(C4, q); };');
      expectNoErrors(source);
    });
  });

  describe('basic type checking', () => {
    it('accepts valid types', () => {
      const source = `
fn foo() -> Int {
  return 42;
}
export fn main() -> Score {
  const x = foo();
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts string operations', () => {
      const source = `
fn greet(name: String) -> String {
  return "Hello " + name;
}
export fn main() -> Score {
  const msg = greet("World");
  return score {
    meta { title msg; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });
  });

  describe('function parameters', () => {
    it('accepts valid function call', () => {
      const source = `
fn add(a: Int, b: Int) -> Int {
  return a + b;
}

export fn main() -> Score {
  const result = add(1, 2);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });
  });

  describe('score structure', () => {
    it('accepts valid minimal score', () => {
      const source = minimalScore();
      expectNoErrors(source);
    });

    it('accepts score with multiple sounds', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }

    sound "piano" kind instrument { label "Piano"; }
    sound "bass" kind instrument { label "Bass"; }

    track "Piano" role Instrument sound "piano" {}
    track "Bass" role Instrument sound "bass" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts drumKit sound', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }

    sound "kit" kind drumKit {
      drumKeys { kick; snare; hhc; }
    }

    track "Drums" role Drums sound "kit" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts vocal sound', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }

    sound "vocal" kind vocal {
      vocal { lang "en-US"; range C3..C5; }
    }

    track "Lead" role Vocal sound "vocal" {}
  };
}`;
      expectNoErrors(source);
    });
  });

  describe('clip structure', () => {
    it('accepts clip with notes', () => {
      const source = minimalClipFn('note(C4, q); note(D4, q); note(E4, h);');
      expectNoErrors(source);
    });

    it('accepts clip with rests', () => {
      const source = minimalClipFn('note(C4, q); rest(q); note(E4, h);');
      expectNoErrors(source);
    });

    it('accepts clip with chord', () => {
      const source = minimalClipFn('chord([C4, E4, G4], w);');
      expectNoErrors(source);
    });

    it('accepts clip with options', () => {
      const source = minimalClipFn('note(C4, q, vel: 0.8);');
      expectNoErrors(source);
    });
  });

  describe('control flow', () => {
    it('accepts if-else with matching types', () => {
      const source = `
fn test(x: Int) -> Int {
  if (x > 0) {
    return 1;
  } else {
    return 0;
  }
}

export fn main() -> Score {
  const r = test(5);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts for loop', () => {
      const source = `
fn sum(arr: Array) -> Int {
  let total = 0;
  for (x in arr) {
    total = total + x;
  }
  return total;
}

export fn main() -> Score {
  const s = sum([1, 2, 3]);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts match expression', () => {
      const source = `
export fn main() -> Score {
  const label = match (2) {
    1 -> "One";
    2 -> "Two";
    else -> "Other";
  };
  return score {
    meta { title label; }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });
  });

  describe('stdlib imports', () => {
    it('accepts stdlib core import', () => {
      const source = `
import { repeat } from "std:core";

fn part() -> Clip {
  return clip { note(C4, q); };
}

export fn main() -> Score {
  const p = repeat(part(), 2);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {
      place 1:1 p;
    }
  };
}`;
      expectNoErrors(source);
    });

    it('accepts stdlib all import', () => {
      const source = `
import * as core from "std:core";

fn part() -> Clip {
  return clip { note(C4, q); };
}

export fn main() -> Score {
  const p = core.repeat(part(), 2);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {
      place 1:1 p;
    }
  };
}`;
      expectNoErrors(source);
    });
  });

  describe('operators', () => {
    it('accepts arithmetic on numbers', () => {
      const source = `
fn math() -> Int {
  return (1 + 2) * 3 - 4 / 2;
}

export fn main() -> Score {
  const x = math();
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts comparison operators', () => {
      const source = `
fn compare(a: Int, b: Int) -> Bool {
  return a > b && a != 0;
}

export fn main() -> Score {
  const x = compare(5, 3);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {}
  };
}`;
      expectNoErrors(source);
    });

    it('accepts duration arithmetic', () => {
      const source = `
export fn main() -> Score {
  const d = q + q;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument {}
    track "Test" role Instrument sound "test" {
      place 1:1 clip { note(C4, d); };
    }
  };
}`;
      expectNoErrors(source);
    });
  });
});
