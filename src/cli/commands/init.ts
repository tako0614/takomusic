// mf init command

import * as fs from 'fs';
import * as path from 'path';
import { generateDefaultConfig } from '../../config/index.js';
import { ExitCodes } from '../../errors.js';

const MAIN_MF_TEMPLATE = `// MusicForge entry point

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
`;

export async function initCommand(args: string[]): Promise<number> {
  const targetDir = args[0] || '.';
  const absoluteDir = path.resolve(targetDir);

  // Check if already initialized
  const configPath = path.join(absoluteDir, 'mfconfig.toml');
  if (fs.existsSync(configPath)) {
    console.error('Project already initialized (mfconfig.toml exists)');
    return ExitCodes.STATIC_ERROR;
  }

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

  // Write src/main.mf
  const mainPath = path.join(absoluteDir, 'src', 'main.mf');
  if (!fs.existsSync(mainPath)) {
    fs.writeFileSync(mainPath, MAIN_MF_TEMPLATE);
    console.log('Created: src/main.mf');
  }

  // Write .gitignore
  const gitignorePath = path.join(absoluteDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(
      gitignorePath,
      `# MusicForge outputs
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

  console.log('\nMusicForge project initialized!');
  console.log('Run "mf build" to compile, "mf render -p cli" to render.');

  return ExitCodes.SUCCESS;
}
