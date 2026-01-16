#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { convertToMidi } from './converter.js';
import type {
  ScoreIR,
  RenderProfile,
  Capabilities,
  Diagnostic,
  Artifact,
} from './types.js';

const VERSION = '1.0.0';
const PLUGIN_ID = 'tako-render-midi';

function getCapabilities(): Capabilities {
  return {
    protocolVersion: 1,
    id: PLUGIN_ID,
    name: 'TakoMusic MIDI Renderer',
    version: VERSION,
    supportedRoles: ['Instrument', 'Drums', 'Vocal', 'Automation'],
    supportedEvents: [
      'note',
      'chord',
      'drumHit',
      'control',
      'automation',
      'graceNote',
      'glissando',
    ],
    paramSupport: ['volume', 'pan', 'expression', 'modulation', 'sustain', 'brightness'],
    techniqueSupport: [
      'legato',
      'staccato',
      'accent',
      'tenuto',
      'marcato',
    ],
    degradeDefaults: {
      unknownParam: 'Drop',
      unknownTechnique: 'Drop',
      unboundTrack: 'Approx',
    },
  };
}

function validate(scorePath: string, profilePath: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Load score
  let score: ScoreIR;
  try {
    const scoreJson = fs.readFileSync(scorePath, 'utf-8');
    score = JSON.parse(scoreJson);
  } catch (err) {
    return [
      {
        level: 'error',
        code: 'INVALID_SCORE',
        message: `Failed to load score: ${err}`,
      },
    ];
  }

  // Load profile
  let profile: RenderProfile;
  try {
    const profileJson = fs.readFileSync(profilePath, 'utf-8');
    profile = JSON.parse(profileJson);
  } catch (err) {
    return [
      {
        level: 'error',
        code: 'INVALID_PROFILE',
        message: `Failed to load profile: ${err}`,
      },
    ];
  }

  // Validate IR version
  if (score.tako?.irVersion !== 4) {
    diagnostics.push({
      level: 'error',
      code: 'UNSUPPORTED_IR_VERSION',
      message: `Unsupported IR version: ${score.tako?.irVersion}. Expected 4.`,
    });
  }

  // Validate profile
  if (profile.renderer !== PLUGIN_ID) {
    diagnostics.push({
      level: 'error',
      code: 'RENDERER_MISMATCH',
      message: `Profile renderer '${profile.renderer}' does not match '${PLUGIN_ID}'`,
    });
  }

  // Check for unbound tracks
  for (const track of score.tracks) {
    let bound = false;
    for (const binding of profile.bindings) {
      const sel = binding.selector;
      if (sel.trackName !== undefined && sel.trackName !== track.name) continue;
      if (sel.sound !== undefined && sel.sound !== track.sound) continue;
      if (sel.role !== undefined && sel.role !== track.role) continue;
      bound = true;
      break;
    }

    if (!bound) {
      const degradePolicy = profile.degradePolicy ?? 'Error';
      diagnostics.push({
        level: degradePolicy === 'Error' ? 'error' : 'warning',
        code: 'UNBOUND_TRACK',
        message: `No binding found for track '${track.name}'`,
        location: { trackName: track.name },
      });
    }
  }

  // Check for unsupported event types
  const supportedEvents = new Set([
    'note',
    'chord',
    'drumHit',
    'control',
    'automation',
    'marker',
    'graceNote',
    'glissando',
    'breath',
  ]);

  for (const track of score.tracks) {
    for (let pIdx = 0; pIdx < track.placements.length; pIdx++) {
      const placement = track.placements[pIdx];
      for (let eIdx = 0; eIdx < placement.clip.events.length; eIdx++) {
        const event = placement.clip.events[eIdx];
        if (!supportedEvents.has(event.type)) {
          diagnostics.push({
            level: 'warning',
            code: 'UNSUPPORTED_EVENT',
            message: `Event type '${event.type}' is not fully supported`,
            location: {
              trackName: track.name,
              placementIndex: pIdx,
              eventIndex: eIdx,
            },
          });
        }
      }
    }
  }

  // Validate pitch ranges
  for (const track of score.tracks) {
    if (track.role === 'Instrument' || track.role === 'Vocal') {
      for (let pIdx = 0; pIdx < track.placements.length; pIdx++) {
        const placement = track.placements[pIdx];
        for (let eIdx = 0; eIdx < placement.clip.events.length; eIdx++) {
          const event = placement.clip.events[eIdx];
          if (event.type === 'note') {
            const pitch = event.pitch.midi;
            if (pitch < 0 || pitch > 127) {
              diagnostics.push({
                level: 'error',
                code: 'PITCH_OUT_OF_RANGE',
                message: `MIDI pitch ${pitch} is out of range (0-127)`,
                location: {
                  trackName: track.name,
                  placementIndex: pIdx,
                  eventIndex: eIdx,
                },
              });
            }
          }
          if (event.type === 'chord') {
            for (const p of event.pitches) {
              if (p.midi < 0 || p.midi > 127) {
                diagnostics.push({
                  level: 'error',
                  code: 'PITCH_OUT_OF_RANGE',
                  message: `MIDI pitch ${p.midi} is out of range (0-127)`,
                  location: {
                    trackName: track.name,
                    placementIndex: pIdx,
                    eventIndex: eIdx,
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  return diagnostics;
}

function render(
  scorePath: string,
  profilePath: string
): { artifacts: Artifact[]; diagnostics: Diagnostic[] } {
  // Load score
  let score: ScoreIR;
  try {
    const scoreJson = fs.readFileSync(scorePath, 'utf-8');
    score = JSON.parse(scoreJson);
  } catch (err) {
    return {
      artifacts: [],
      diagnostics: [
        {
          level: 'error',
          code: 'INVALID_SCORE',
          message: `Failed to load score: ${err}`,
        },
      ],
    };
  }

  // Load profile
  let profile: RenderProfile;
  try {
    const profileJson = fs.readFileSync(profilePath, 'utf-8');
    profile = JSON.parse(profileJson);
  } catch (err) {
    return {
      artifacts: [],
      diagnostics: [
        {
          level: 'error',
          code: 'INVALID_PROFILE',
          message: `Failed to load profile: ${err}`,
        },
      ],
    };
  }

  // Convert to MIDI
  const result = convertToMidi(score, profile);

  // Determine output path
  let outputPath: string;
  if (profile.output?.path) {
    outputPath = path.resolve(profile.output.path);
  } else {
    // Default: same directory as score, with .mid extension
    const scoreDir = path.dirname(scorePath);
    const scoreName = path.basename(scorePath, '.json');
    outputPath = path.join(scoreDir, `${scoreName}.mid`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write MIDI file
  try {
    fs.writeFileSync(outputPath, Buffer.from(result.midi));
  } catch (err) {
    return {
      artifacts: [],
      diagnostics: [
        ...result.diagnostics,
        {
          level: 'error',
          code: 'WRITE_ERROR',
          message: `Failed to write MIDI file: ${err}`,
        },
      ],
    };
  }

  const artifacts: Artifact[] = [
    {
      kind: 'file',
      path: outputPath,
      mediaType: 'audio/midi',
      description: 'Standard MIDI file',
    },
  ];

  return {
    artifacts,
    diagnostics: result.diagnostics,
  };
}

function printUsage(): void {
  console.log(`tako-render-midi v${VERSION}

Usage:
  tako-render-midi capabilities
  tako-render-midi validate --score <score.json> --profile <profile.json>
  tako-render-midi render --score <score.json> --profile <profile.json>

Commands:
  capabilities  Print plugin capabilities as JSON
  validate      Validate score and profile, return diagnostics
  render        Render score to MIDI file

Options:
  --score <path>     Path to Score IR JSON file
  --profile <path>   Path to Render Profile JSON file
  --help, -h         Show this help message
  --version, -v      Show version number
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'capabilities': {
      console.log(JSON.stringify(getCapabilities(), null, 2));
      break;
    }

    case 'validate': {
      const scoreIdx = args.indexOf('--score');
      const profileIdx = args.indexOf('--profile');

      if (scoreIdx === -1 || scoreIdx + 1 >= args.length) {
        console.error('Error: --score <path> is required');
        process.exit(1);
      }
      if (profileIdx === -1 || profileIdx + 1 >= args.length) {
        console.error('Error: --profile <path> is required');
        process.exit(1);
      }

      const scorePath = args[scoreIdx + 1];
      const profilePath = args[profileIdx + 1];

      const diagnostics = validate(scorePath, profilePath);
      console.log(JSON.stringify(diagnostics, null, 2));

      // Exit with error if any error-level diagnostics
      const hasErrors = diagnostics.some((d) => d.level === 'error');
      process.exit(hasErrors ? 1 : 0);
    }

    case 'render': {
      const scoreIdx = args.indexOf('--score');
      const profileIdx = args.indexOf('--profile');

      if (scoreIdx === -1 || scoreIdx + 1 >= args.length) {
        console.error('Error: --score <path> is required');
        process.exit(1);
      }
      if (profileIdx === -1 || profileIdx + 1 >= args.length) {
        console.error('Error: --profile <path> is required');
        process.exit(1);
      }

      const scorePath = args[scoreIdx + 1];
      const profilePath = args[profileIdx + 1];

      const result = render(scorePath, profilePath);

      // Output diagnostics to stderr
      if (result.diagnostics.length > 0) {
        console.error(JSON.stringify(result.diagnostics, null, 2));
      }

      // Output artifacts to stdout
      console.log(JSON.stringify(result.artifacts, null, 2));

      // Exit with error if any error-level diagnostics
      const hasErrors = result.diagnostics.some((d) => d.level === 'error');
      process.exit(hasErrors ? 1 : 0);
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
