#!/usr/bin/env node
/**
 * TakoMusic Lilypond Renderer CLI
 *
 * Usage: tako-render-lilypond <score.mf.score.json> <profile.json> <output.ly>
 */

import * as fs from 'fs';
import * as path from 'path';
import { render, type ScoreIR, type RenderProfile } from './render.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: tako-render-lilypond <score.json> <profile.json> [output.ly]');
    console.log('');
    console.log('Renders TakoMusic Score IR to Lilypond notation.');
    console.log('');
    console.log('Arguments:');
    console.log('  score.json    Path to the Score IR JSON file');
    console.log('  profile.json  Path to the render profile');
    console.log('  output.ly     Output path (optional, uses profile path)');
    process.exit(1);
  }

  const [scorePath, profilePath, outputArg] = args;

  // Read score
  if (!fs.existsSync(scorePath)) {
    console.error(`Error: Score file not found: ${scorePath}`);
    process.exit(1);
  }

  const scoreContent = fs.readFileSync(scorePath, 'utf-8');
  let ir: ScoreIR;
  try {
    ir = JSON.parse(scoreContent);
  } catch (err) {
    console.error(`Error: Invalid JSON in score file: ${scorePath}`);
    process.exit(1);
  }

  // Read profile
  if (!fs.existsSync(profilePath)) {
    console.error(`Error: Profile file not found: ${profilePath}`);
    process.exit(1);
  }

  const profileContent = fs.readFileSync(profilePath, 'utf-8');
  let profile: RenderProfile;
  try {
    profile = JSON.parse(profileContent);
  } catch (err) {
    console.error(`Error: Invalid JSON in profile file: ${profilePath}`);
    process.exit(1);
  }

  // Determine output path
  const outputPath = outputArg || profile.output.path || 'output.ly';

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Render to Lilypond
  console.log(`Rendering to Lilypond: ${outputPath}`);
  const lilypondSource = render(ir, profile);

  // Write output
  fs.writeFileSync(outputPath, lilypondSource, 'utf-8');
  console.log(`Successfully wrote ${outputPath}`);

  // If PDF output is requested, show instructions
  if (profile.output.format === 'pdf') {
    console.log('');
    console.log('To generate PDF, run:');
    console.log(`  lilypond ${outputPath}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
