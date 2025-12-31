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
}

const TEMPLATES: Record<string, Template> = {
  default: {
    name: 'Default',
    description: 'Starter project with vocal and piano tracks',
    main: `// TakoMusic v4 - Starter

import { repeat } from "std:core";
import * as vocal from "std:vocal";

fn pianoPart() -> Clip {
  return clip {
    chord([C4, E4, G4], q);
    chord([D4, F4, A4], q);
    chord([E4, G4, B4], q);
    chord([F4, A4, C5], q);
  };
}

fn vocalPart() -> Clip {
  const melody = clip {
    note(C4, q);
    note(D4, q);
    note(E4, q);
    note(F4, q);
  };
  const lyric = vocal.text("hello world", "en-US");
  return vocal.align(melody, lyric);
}

export fn main() -> Score {
  const piano = repeat(pianoPart(), 2);
  const vocalClip = vocalPart();

  return score {
    meta {
      title "My Song";
      artist "Anonymous";
    }
    tempo {
      1:1 -> 120bpm;
    }
    meter {
      1:1 -> 4/4;
    }

    sound "piano" kind instrument {
      label "Piano";
      range A0..C8;
    }

    sound "lead_vocal" kind vocal {
      vocal {
        lang "en-US";
        range A3..E5;
      }
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 piano;
    }

    track "Vocal" role Vocal sound "lead_vocal" {
      place 1:1 vocalClip;
    }
  };
}
`,
  },

  piano: {
    name: 'Piano',
    description: 'Piano solo template',
    main: `// TakoMusic v4 - Piano Solo

export fn main() -> Score {
  return score {
    meta {
      title "Piano Sketch";
    }
    tempo {
      1:1 -> 96bpm;
    }
    meter {
      1:1 -> 4/4;
    }

    sound "piano" kind instrument {
      label "Piano";
      range A0..C8;
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        chord([C4, E4, G4], h);
        chord([F4, A4, C5], h);
        chord([G4, B4, D5], h);
        chord([C4, E4, G4], h);
      };
    }
  };
}
`,
  },

  vocaloid: {
    name: 'Vocaloid',
    description: 'Vocal synthesis template',
    main: `// TakoMusic v4 - Vocal Demo

import * as vocal from "std:vocal";

fn vocalLine() -> Clip {
  const melody = clip {
    note(C4, q);
    note(D4, q);
    note(E4, q);
    note(F4, q);
    note(G4, h);
  };
  const lyric = vocal.text("la la la la la", "en-US");
  return vocal.align(melody, lyric);
}

export fn main() -> Score {
  const line = vocalLine();

  return score {
    meta {
      title "Vocal Demo";
    }
    tempo {
      1:1 -> 120bpm;
    }
    meter {
      1:1 -> 4/4;
    }

    sound "lead_vocal" kind vocal {
      vocal {
        lang "en-US";
        range A3..E5;
      }
    }

    track "Vocal" role Vocal sound "lead_vocal" {
      place 1:1 line;
    }
  };
}
`,
  },

  minimal: {
    name: 'Minimal',
    description: 'Minimal starting template',
    main: `// TakoMusic v4 - Minimal

export fn main() -> Score {
  return score {
    tempo {
      1:1 -> 120bpm;
    }
    meter {
      1:1 -> 4/4;
    }

    sound "piano" kind instrument {
      label "Piano";
    }

    track "Piano" role Instrument sound "piano" {
      place 1:1 clip {
        note(C4, q);
      };
    }
  };
}
`,
  },
};

const DEFAULT_PROFILE = `{
  "tako": {
    "profileVersion": 1
  },
  "profileName": "default",
  "renderer": "midi.smf",
  "output": {
    "path": "out/song.mid"
  },
  "bindings": [
    {
      "selector": { "sound": "piano" },
      "config": { "ch": 1, "program": 0 }
    },
    {
      "selector": { "sound": "lead_vocal" },
      "config": { "ch": 2, "program": 81 }
    }
  ]
}
`;

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
  const dirs = ['src', 'dist', 'out', 'profiles'];
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

  // Write default render profile
  const profilePath = path.join(absoluteDir, 'profiles', 'default.mf.profile.json');
  if (!fs.existsSync(profilePath)) {
    fs.writeFileSync(profilePath, DEFAULT_PROFILE);
    console.log('Created: profiles/default.mf.profile.json');
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
  console.log('  mf render       Render with the default profile');

  return ExitCodes.SUCCESS;
}
