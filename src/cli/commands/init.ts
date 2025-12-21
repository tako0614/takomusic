// mf init command

import * as fs from 'fs';
import * as path from 'path';
import { generateDefaultConfig } from '../../config/index.js';
import { ExitCodes } from '../../errors.js';

// Template definitions
interface Template {
  name: string;
  description: string;
  main: string;
  phrases?: Record<string, string>;
}

const TEMPLATES: Record<string, Template> = {
  default: {
    name: 'Default',
    description: 'Basic template with vocal and drum tracks',
    main: `// TakoMusic entry point

export proc main() {
  // Project settings
  title("My Song");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  // Add your tracks here
  track(vocal, vocal1, { engine: "piapro", voice: "miku" }) {
    at(1:1);
    note(C4, 1/4, "は");
    note(D4, 1/4, "じ");
    note(E4, 1/4, "め");
    note(F4, 1/4, "ま");
  }

  track(midi, drums, { ch: 10, vel: 100 }) {
    at(1:1);
    drum(kick, 1/4, 110);
    drum(hhc, 1/4);
    drum(snare, 1/4, 110);
    drum(hhc, 1/4);
  }
}
`,
  },

  piano: {
    name: 'Piano',
    description: 'Piano solo template with grand staff notation',
    main: `// Piano Solo Template

export proc main() {
  title("Piano Piece");
  ppq(480);
  timeSig(4, 4);
  tempo(100);

  // Right hand (treble)
  track(midi, piano_rh, { ch: 1, program: 0 }) {
    at(1:1);
    grandStaff("treble", "bass", 60);

    // Melody
    mf();
    n(e5, 4n); n(d5, 4n); n(c5, 4n); n(d5, 4n);
    n(e5, 4n); n(e5, 4n); n(e5, 2n);
    n(d5, 4n); n(d5, 4n); n(d5, 2n);
    n(e5, 4n); n(g5, 4n); n(g5, 2n);
  }

  // Left hand (bass)
  track(midi, piano_lh, { ch: 2, program: 0 }) {
    at(1:1);

    // Accompaniment
    p();
    chord([c3, e3, g3], 2n);
    chord([c3, e3, g3], 2n);
    chord([g2, b2, d3], 2n);
    chord([g2, b2, d3], 2n);
    chord([c3, e3, g3], 1n);
  }
}
`,
  },

  orchestral: {
    name: 'Orchestral',
    description: 'Full orchestra template with strings, brass, and woodwinds',
    main: `// Orchestral Template

export proc main() {
  title("Orchestral Piece");
  ppq(480);
  timeSig(4, 4);
  tempo(90);

  // Violins
  track(midi, violins, { ch: 1, program: 48 }) {
    at(1:1);
    mf();
    legato();
    n(g4, 2n); n(a4, 2n);
    n(b4, 2n); n(c5, 2n);
  }

  // Violas
  track(midi, violas, { ch: 2, program: 49 }) {
    at(1:1);
    mp();
    legato();
    n(d4, 2n); n(e4, 2n);
    n(f#4, 2n); n(g4, 2n);
  }

  // Cellos
  track(midi, cellos, { ch: 3, program: 50 }) {
    at(1:1);
    mp();
    n(g3, 1n);
    n(d3, 1n);
  }

  // French Horns
  track(midi, horns, { ch: 4, program: 60 }) {
    at(1:1);
    f();
    n(g3, 1n);
    n(g3, 1n);
  }

  // Timpani
  track(midi, timpani, { ch: 10, program: 47 }) {
    at(1:1);
    ff();
    n(g2, 4n); r(4n); r(2n);
    n(g2, 4n); r(4n); r(2n);
  }
}
`,
  },

  edm: {
    name: 'EDM',
    description: 'Electronic dance music template with synths and drums',
    main: `// EDM Template

export proc main() {
  title("EDM Track");
  ppq(480);
  timeSig(4, 4);
  tempo(128);

  // Lead synth
  track(midi, lead, { ch: 1, program: 81 }) {
    at(1:1);

    // Add some pitch bend for interest
    pitchBend(0);

    // Main riff
    n(c5, 8n); n(e5, 8n); n(g5, 8n); n(c6, 8n);
    n(b5, 8n); n(g5, 8n); n(e5, 8n); n(c5, 8n);
    r(1n);
    n(c5, 8n); n(e5, 8n); n(g5, 8n); n(c6, 8n);
    n(b5, 8n); n(g5, 8n); n(e5, 8n); n(c5, 8n);
  }

  // Bass
  track(midi, bass, { ch: 2, program: 38 }) {
    at(1:1);

    // Sub bass pattern
    n(c2, 8n); r(8n); n(c2, 8n); r(8n);
    n(c2, 8n); r(8n); n(c2, 8n); r(8n);
    n(g1, 8n); r(8n); n(g1, 8n); r(8n);
    n(g1, 8n); r(8n); n(g1, 8n); r(8n);
  }

  // Drums
  track(midi, drums, { ch: 10, vel: 110 }) {
    at(1:1);

    // Four on the floor
    repeat(4) {
      drum(kick, 4n);
      drum(hhc, 8n); drum(hhc, 8n);
      drum(kick, 4n); drum(snare, 4n);
      drum(hhc, 8n); drum(hhc, 8n);
    }
  }

  // Pad
  track(midi, pad, { ch: 3, program: 89 }) {
    at(1:1);
    mp();
    chord([c4, e4, g4, b4], 1n);
    chord([c4, e4, g4, b4], 1n);
  }
}
`,
  },

  chiptune: {
    name: 'Chiptune',
    description: '8-bit style music template',
    main: `// Chiptune Template

export proc main() {
  title("8-bit Adventure");
  ppq(480);
  timeSig(4, 4);
  tempo(140);

  // Pulse 1 (melody)
  track(midi, pulse1, { ch: 1, program: 80 }) {
    at(1:1);

    // Catchy melody
    n(c5, 8n); n(c5, 8n); r(8n); n(c5, 8n);
    r(8n); n(g4, 8n); n(c5, 4n);
    n(g5, 4n); r(4n); n(g4, 4n); r(4n);
    r(1n);
  }

  // Pulse 2 (harmony)
  track(midi, pulse2, { ch: 2, program: 80 }) {
    at(1:1);

    n(e4, 8n); n(e4, 8n); r(8n); n(e4, 8n);
    r(8n); n(e4, 8n); n(e4, 4n);
    n(e5, 4n); r(4n); n(e4, 4n); r(4n);
    r(1n);
  }

  // Triangle (bass)
  track(midi, triangle, { ch: 3, program: 80 }) {
    at(1:1);

    n(c3, 4n); n(c3, 4n); n(g2, 4n); n(g2, 4n);
    n(c3, 4n); n(c3, 4n); n(g2, 4n); n(g2, 4n);
  }

  // Noise (drums)
  track(midi, noise, { ch: 10, vel: 100 }) {
    at(1:1);

    repeat(2) {
      drum(kick, 4n);
      drum(hhc, 4n);
      drum(snare, 4n);
      drum(hhc, 4n);
    }
  }
}
`,
  },

  jazz: {
    name: 'Jazz',
    description: 'Jazz combo template with swing feel',
    main: `// Jazz Combo Template

export proc main() {
  title("Jazz Tune");
  ppq(480);
  timeSig(4, 4);
  tempo(140);
  // Swing feel would be: swing(0.6)

  // Piano comping
  track(midi, piano, { ch: 1, program: 0 }) {
    at(1:1);
    mp();

    // Chord voicings
    chord([d3, f#3, a3, c4], 2n.);
    chord([d3, f#3, a3, c4], 4n);
    chord([g3, b3, d4, f4], 2n.);
    chord([g3, b3, d4, f4], 4n);
  }

  // Walking bass
  track(midi, bass, { ch: 2, program: 32 }) {
    at(1:1);
    mf();

    // Walking line
    n(d2, 4n); n(e2, 4n); n(f#2, 4n); n(a2, 4n);
    n(g2, 4n); n(a2, 4n); n(b2, 4n); n(d3, 4n);
  }

  // Drums - ride pattern
  track(midi, drums, { ch: 10, vel: 80 }) {
    at(1:1);

    repeat(2) {
      drum(ride, 4n/3); drum(ride, 4n/3); drum(ride, 4n/3);
      drum(ride, 4n/3); drum(ride, 4n/3); drum(ride, 4n/3);
      drum(ride, 4n/3); drum(ride, 4n/3); drum(ride, 4n/3);
      drum(ride, 4n/3); drum(ride, 4n/3); drum(ride, 4n/3);
    }
  }

  // Tenor sax melody
  track(midi, sax, { ch: 3, program: 66 }) {
    at(1:1);
    mf();

    r(2n);
    n(a4, 4n); n(f#4, 4n);
    n(d4, 4n); n(e4, 4n); n(f#4, 4n); n(a4, 4n);
  }
}
`,
  },

  vocaloid: {
    name: 'Vocaloid',
    description: 'Vocaloid song template with vocal and backing tracks',
    main: `// Vocaloid Song Template

export proc main() {
  title("Vocaloid Song");
  ppq(480);
  timeSig(4, 4);
  tempo(135);

  // Main vocal
  track(vocal, miku, { engine: "piapro", voice: "miku_nt" }) {
    at(1:1);

    // Intro phrase
    r(1n);

    // Verse
    n(g4, 8n, "あ"); n(a4, 8n, "な"); n(b4, 4n, "た");
    n(d5, 8n, "の"); n(c5, 8n, "こ"); n(b4, 4n, "と");
    n(a4, 4n, "が"); n(g4, 4n, "す"); n(a4, 2n, "き");
  }

  // Harmony vocal
  track(vocal, rin, { engine: "piapro", voice: "rin" }) {
    at(3:1);

    n(e4, 8n, "あ"); n(f#4, 8n, "な"); n(g4, 4n, "た");
    n(b4, 8n, "の"); n(a4, 8n, "こ"); n(g4, 4n, "と");
    n(f#4, 4n, "が"); n(e4, 4n, "す"); n(f#4, 2n, "き");
  }

  // Piano
  track(midi, piano, { ch: 1, program: 0 }) {
    at(1:1);
    mp();

    // Intro
    chord([g3, b3, d4], 1n);

    // Verse chords
    chord([g3, b3, d4], 2n);
    chord([d3, f#3, a3], 2n);
    chord([e3, g3, b3], 2n);
    chord([c3, e3, g3], 2n);
  }

  // Bass
  track(midi, bass, { ch: 2, program: 33 }) {
    at(1:1);

    n(g2, 1n);
    n(g2, 2n); n(d2, 2n);
    n(e2, 2n); n(c2, 2n);
  }

  // Drums
  track(midi, drums, { ch: 10, vel: 100 }) {
    at(1:1);

    // Intro - simple
    drum(hhc, 4n); drum(hhc, 4n); drum(hhc, 4n); drum(hhc, 4n);

    // Verse - full beat
    repeat(2) {
      drum(kick, 4n);
      drum(hhc, 8n); drum(hhc, 8n);
      drum(snare, 4n);
      drum(hhc, 8n); drum(hhc, 8n);
    }
  }
}
`,
  },

  minimal: {
    name: 'Minimal',
    description: 'Empty project with just basic settings',
    main: `// TakoMusic Project

export proc main() {
  title("Untitled");
  ppq(480);
  timeSig(4, 4);
  tempo(120);

  // Add your tracks here
}
`,
  },
};

export async function initCommand(args: string[]): Promise<number> {
  let targetDir = '.';
  let templateName = 'default';
  let listTemplates = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-t' || args[i] === '--template') {
      if (i + 1 >= args.length) {
        console.error('--template requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      templateName = args[i + 1];
      i++;
    } else if (args[i] === '-l' || args[i] === '--list') {
      listTemplates = true;
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`Usage: mf init [dir] [options]

Options:
  -t, --template <name>  Use a project template
  -l, --list             List available templates
  -h, --help             Show this help message

Available templates:
${Object.entries(TEMPLATES)
  .map(([key, t]) => `  ${key.padEnd(12)} ${t.description}`)
  .join('\n')}

Examples:
  mf init
  mf init my-project
  mf init -t piano
  mf init my-song -t vocaloid
`);
      return ExitCodes.SUCCESS;
    } else if (!args[i].startsWith('-')) {
      targetDir = args[i];
    }
  }

  // List templates mode
  if (listTemplates) {
    console.log('Available Templates:');
    console.log('');
    for (const [key, template] of Object.entries(TEMPLATES)) {
      console.log(`  ${key.padEnd(12)} ${template.name}`);
      console.log(`              ${template.description}`);
      console.log('');
    }
    return ExitCodes.SUCCESS;
  }

  // Validate template
  const template = TEMPLATES[templateName];
  if (!template) {
    console.error(`Unknown template: ${templateName}`);
    console.log('Run "mf init --list" to see available templates.');
    return ExitCodes.STATIC_ERROR;
  }

  const absoluteDir = path.resolve(targetDir);

  // Check if already initialized
  const configPath = path.join(absoluteDir, 'mfconfig.toml');
  if (fs.existsSync(configPath)) {
    console.error('Project already initialized (mfconfig.toml exists)');
    return ExitCodes.STATIC_ERROR;
  }

  console.log(`Initializing TakoMusic project with "${template.name}" template...`);
  console.log('');

  // Create directories
  const dirs = ['src', 'src/phrases', 'dist', 'out'];
  for (const dir of dirs) {
    const dirPath = path.join(absoluteDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created: ${dir}/`);
    }
  }

  // Write mfconfig.toml
  fs.writeFileSync(configPath, generateDefaultConfig());
  console.log('Created: mfconfig.toml');

  // Write src/main.mf from template
  const mainPath = path.join(absoluteDir, 'src', 'main.mf');
  if (!fs.existsSync(mainPath)) {
    fs.writeFileSync(mainPath, template.main);
    console.log('Created: src/main.mf');
  }

  // Write template phrases if any
  if (template.phrases) {
    for (const [name, content] of Object.entries(template.phrases)) {
      const phrasePath = path.join(absoluteDir, 'src', 'phrases', `${name}.mf`);
      fs.writeFileSync(phrasePath, content);
      console.log(`Created: src/phrases/${name}.mf`);
    }
  }

  // Write .gitignore
  const gitignorePath = path.join(absoluteDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(
      gitignorePath,
      `# TakoMusic outputs
dist/
out/

# Editor
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
`
    );
    console.log('Created: .gitignore');
  }

  console.log('');
  console.log(`TakoMusic project initialized with "${template.name}" template!`);
  console.log('');
  console.log('Next steps:');
  console.log('  mf check        Check for errors');
  console.log('  mf build        Build the project');
  console.log('  mf play         Preview with FluidSynth');
  console.log('  mf render -p cli  Render to audio');

  return ExitCodes.SUCCESS;
}
