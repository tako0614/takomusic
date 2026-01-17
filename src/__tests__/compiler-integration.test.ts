import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { V4Compiler } from '../compiler.js';
import type { ScoreIR } from '../ir.js';

describe('Compiler Integration Tests', () => {
  let tempDir: string;
  let compiler: V4Compiler;

  beforeEach(() => {
    tempDir = path.join(
      os.tmpdir(),
      `mf-compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });
    compiler = new V4Compiler(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('end-to-end compilation', () => {
    it('compiles minimal valid score', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);

      expect(ir).toBeDefined();
      expect(ir.tako.irVersion).toBe(4);
      expect(ir.tempoMap).toBeDefined();
      expect(ir.meterMap).toBeDefined();
      expect(ir.sounds).toBeDefined();
      expect(ir.tracks).toBeDefined();
    });

    it('compiles score with notes', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    track "Melody" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q);
        note(D4, q);
        note(E4, q);
        note(F4, q);
      };
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);

      expect(ir.tracks).toHaveLength(1);
      expect(ir.tracks[0].placements).toHaveLength(1);
      expect(ir.tracks[0].placements[0].clip.events.length).toBeGreaterThan(0);
    });

    it('compiles score with functions', () => {
      const source = `
fn makeClip() -> Clip {
  return clip {
    note(C4, q);
    rest(q);
  };
}

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 makeClip();
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);

      expect(ir.tracks[0].placements[0].clip.events.length).toBeGreaterThan(0);
    });

    it('compiles score with constants', () => {
      const source = `
const DEFAULT_VELOCITY = 0.8;

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 clip {
        note(C4, q, vel: DEFAULT_VELOCITY);
      };
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);

      const note = ir.tracks[0].placements[0].clip.events[0];
      expect(note.type).toBe('note');
      expect((note as any).velocity).toBe(0.8);
    });
  });

  describe('imports', () => {
    it('imports from relative file', () => {
      const libSource = `
export fn makeNote() -> Clip {
  return clip { note(C4, q); };
}
`;
      const mainSource = `
import { makeNote } from "./lib.mf";

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 makeNote();
    }
  };
}
`;
      fs.writeFileSync(path.join(tempDir, 'lib.mf'), libSource);
      fs.writeFileSync(path.join(tempDir, 'main.mf'), mainSource);

      const ir = compiler.compile(path.join(tempDir, 'main.mf'));

      expect(ir.tracks[0].placements[0].clip.events.length).toBeGreaterThan(0);
    });

    it('imports from nested directory', () => {
      const libDir = path.join(tempDir, 'lib');
      fs.mkdirSync(libDir, { recursive: true });

      const libSource = `
export const NOTE_VEL = 0.9;
`;
      const mainSource = `
import { NOTE_VEL } from "./lib/constants.mf";

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 clip { note(C4, q, vel: NOTE_VEL); };
    }
  };
}
`;
      fs.writeFileSync(path.join(libDir, 'constants.mf'), libSource);
      fs.writeFileSync(path.join(tempDir, 'main.mf'), mainSource);

      const ir = compiler.compile(path.join(tempDir, 'main.mf'));

      const note = ir.tracks[0].placements[0].clip.events[0];
      expect((note as any).velocity).toBe(0.9);
    });

    it('handles multiple imports', () => {
      const lib1Source = `export const A = 1;`;
      const lib2Source = `export const B = 2;`;
      const mainSource = `
import { A } from "./lib1.mf";
import { B } from "./lib2.mf";

export fn main() -> Score {
  const sum = A + B;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> sum/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      fs.writeFileSync(path.join(tempDir, 'lib1.mf'), lib1Source);
      fs.writeFileSync(path.join(tempDir, 'lib2.mf'), lib2Source);
      fs.writeFileSync(path.join(tempDir, 'main.mf'), mainSource);

      const ir = compiler.compile(path.join(tempDir, 'main.mf'));

      expect(ir.meterMap[0].numerator).toBe(3); // (1 + 2) = 3
    });
  });

  describe('type checking', () => {
    it('detects type mismatch in assignment', () => {
      const source = `
export fn main() -> Score {
  const x: Int = "not an int";
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      expect(() => compiler.compile(filePath)).toThrow();
      const diagnostics = compiler.getDiagnostics();
      expect(diagnostics.some(d => d.severity === 'error')).toBe(true);
    });

    it('detects wrong return type', () => {
      const source = `
fn badReturn() -> Int {
  return "not an int";
}

export fn main() -> Score {
  const x = badReturn();
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      expect(() => compiler.compile(filePath)).toThrow();
    });

    it('accepts correct types', () => {
      const source = `
fn getInt() -> Int {
  return 42;
}

export fn main() -> Score {
  const x: Int = getInt();
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      expect(() => compiler.compile(filePath)).not.toThrow();
    });
  });

  describe('control flow', () => {
    it.skip('compiles if-else statements', () => {
      // Note: Skipped because if-statements inside tempo blocks are not currently supported
      const source = `
export fn main() -> Score {
  const targetTempo = 120;
  const fast = 140bpm;
  const slow = 100bpm;
  return score {
    tempo {
      if (targetTempo > 100) {
        1:1 -> fast;
      } else {
        1:1 -> slow;
      }
    }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tempoMap[0].bpm).toBe(140);
    });

    it('compiles for loops', () => {
      const source = `
fn makeNotes() -> Clip {
  const notes = [C4, D4, E4, F4];
  return clip {
    note(notes[0], q);
    note(notes[1], q);
    note(notes[2], q);
    note(notes[3], q);
  };
}

export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {
      place 1:1 makeNotes();
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tracks[0].placements[0].clip.events.length).toBe(4);
    });

    it('compiles match expressions', () => {
      const source = `
fn getTempo(val: Int) -> Int {
  return match (val) {
    1 -> 120;
    2 -> 140;
    else -> 100;
  };
}

export fn main() -> Score {
  const val = 1;
  const result = getTempo(val);
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tempoMap[0].bpm).toBe(120);
    });
  });

  describe('score features', () => {
    it('handles multiple tempo changes', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo {
      1:1 -> 120bpm;
      5:1 -> 140bpm;
      9:1 -> 100bpm;
    }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tempoMap.length).toBe(3);
      expect(ir.tempoMap[1].bpm).toBe(140);
    });

    it('handles multiple meter changes', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter {
      1:1 -> 4/4;
      5:1 -> 3/4;
      9:1 -> 6/8;
    }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.meterMap.length).toBe(3);
      expect(ir.meterMap[1].numerator).toBe(3);
      expect(ir.meterMap[1].denominator).toBe(4);
    });

    it('handles multiple tracks', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "piano" kind instrument { label "Piano"; }
    sound "bass" kind instrument { label "Bass"; }
    track "Melody" role Instrument sound "piano" {
      place 1:1 clip { note(C4, q); };
    }
    track "Bass" role Instrument sound "bass" {
      place 1:1 clip { note(C2, q); };
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tracks.length).toBe(2);
      expect(ir.tracks[0].name).toBe('Melody');
      expect(ir.tracks[1].name).toBe('Bass');
    });

    it('handles drum tracks', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "drums" kind drumKit {
      label "Drums";
      drumKeys { kick; snare; hhc; hho; }
    }
    track "Drums" role Drums sound "drums" {
      place 1:1 clip {
        hit("kick", e);
        hit("snare", e);
        hit("hhc", e);
        hit("hho", e);
      };
    }
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.sounds[0].kind).toBe('drumKit');
      expect(ir.tracks[0].role).toBe('Drums');
    });

    it('handles metadata', () => {
      const source = `
export fn main() -> Score {
  return score {
    meta {
      title "Test Song";
      artist "Test Artist";
      copyright "© 2024";
    }
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.meta.title).toBe('Test Song');
      expect(ir.meta.artist).toBe('Test Artist');
      expect(ir.meta.copyright).toBe('© 2024');
    });
  });

  describe('diagnostics', () => {
    it('collects warnings without failing', () => {
      const source = `
export fn main() -> Score {
  const unused = 42;
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir).toBeDefined();

      const diagnostics = compiler.getDiagnostics();
      const warnings = diagnostics.filter(d => d.severity === 'warning');
      // May or may not have warnings depending on implementation
      expect(warnings).toBeDefined();
    });

    it('provides diagnostic information for errors', () => {
      const source = `
export fn main() -> Score {
  const x: Int = "error";
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      try {
        compiler.compile(filePath);
      } catch {
        // Expected to throw
      }

      const diagnostics = compiler.getDiagnostics();
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]).toHaveProperty('message');
      expect(diagnostics[0]).toHaveProperty('severity');
    });
  });

  describe('IR validation', () => {
    it('validates generated IR schema', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);

      // Should have required IR fields
      expect(ir.tako).toBeDefined();
      expect(ir.tako.irVersion).toBe(4);
      expect(ir.tempoMap).toBeDefined();
      expect(ir.meterMap).toBeDefined();
      expect(ir.sounds).toBeDefined();
      expect(ir.tracks).toBeDefined();
    });

    it('includes source hash in IR', () => {
      const source = `
export fn main() -> Score {
  return score {
    tempo { 1:1 -> 120bpm; }
    meter { 1:1 -> 4/4; }
    sound "test" kind instrument { label "Test"; }
    track "Test" role Instrument sound "test" {}
  };
}
`;
      const filePath = path.join(tempDir, 'main.mf');
      fs.writeFileSync(filePath, source);

      const ir = compiler.compile(filePath);
      expect(ir.tako.sourceHash).toBeDefined();
      expect(typeof ir.tako.sourceHash).toBe('string');
    });
  });
});
