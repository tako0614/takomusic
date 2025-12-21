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
    description: 'Basic template with vocal and piano tracks',
    main: `// TakoScore v2.0 entry point

score "My Song" {
  backend neutrino {
    singer "KIRITAN"
    lang ja
  }

  tempo 120
  time 4/4
  key C major

  part Vocal {
    phrase {
      notes:
        | C4 q  D4 q  E4 q  F4 q |;

      lyrics mora:
        は じ め ま;
    }

    rest q

    phrase {
      notes:
        | G4 q  A4 q  B4 q  C5 q |;

      lyrics mora:
        し て ね ー;
    }
  }

  part Piano {
    midi ch:1 program:0

    | [C4 E4 G4] w |
    | [F4 A4 C5] w |
  }

  part Drums {
    midi ch:10

    | kick q  hhc q  snare q  hhc q |
    | kick q  hhc q  snare q  hhc q |
  }
}
`,
  },

  piano: {
    name: 'Piano',
    description: 'Piano solo template',
    main: `// TakoScore v2.0 - Piano Solo

score "Piano Piece" {
  tempo 100
  time 4/4
  key C major

  part RightHand {
    midi ch:1 program:0

    | E5 q  D5 q  C5 q  D5 q |
    | E5 q  E5 q  E5 h       |
    | D5 q  D5 q  D5 h       |
    | E5 q  G5 q  G5 h       |
  }

  part LeftHand {
    midi ch:2 program:0

    | [C3 E3 G3] h  [C3 E3 G3] h |
    | [C3 E3 G3] h  [C3 E3 G3] h |
    | [G2 B2 D3] h  [G2 B2 D3] h |
    | [C3 E3 G3] h  [C3 E3 G3] h |
  }
}
`,
  },

  vocaloid: {
    name: 'Vocaloid',
    description: 'NEUTRINO vocal synthesis template',
    main: `// TakoScore v2.0 - Vocal Synthesis

score "ボーカル曲" {
  backend neutrino {
    singer "KIRITAN"
    lang ja
    phonemeBudgetPerOnset 8
    maxPhraseSeconds 10
  }

  tempo 120
  time 4/4
  key C major

  part Vocal {
    // Verse 1
    phrase {
      notes:
        | C4 q  D4 q  E4 q  F4 q |
        | G4 h         A4 h     |;

      lyrics mora:
        き ら き ら ひ か る;
    }

    rest h

    // Verse 2 with melisma
    phrase {
      notes:
        | G4 q  A4 q  B4 q  C5 q |
        | D5 h~        D5 h     |;

      lyrics mora:
        お そ ら の ほ _;
    }
  }

  part Piano {
    midi ch:1 program:0

    | [C3 E3 G3] w |
    | [F3 A3 C4] w |
    | [G3 B3 D4] w |
    | [C3 E3 G3] w |
  }
}
`,
  },

  minimal: {
    name: 'Minimal',
    description: 'Minimal starting template',
    main: `// TakoScore v2.0 - Minimal

score "Untitled" {
  tempo 120
  time 4/4

  part Vocal {
    phrase {
      notes:
        | C4 q |;

      lyrics mora:
        あ;
    }
  }
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
