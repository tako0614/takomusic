// mf render command - render via profile and renderer plugin

import * as fs from 'fs';
import * as path from 'path';
import { V4Compiler } from '../../compiler.js';
import { ExitCodes } from '../../errors.js';
import { findConfigPath, loadConfig } from '../../config/index.js';
import { handleCliError } from '../errorHandler.js';
import {
  loadRenderProfile,
  resolveRenderer,
  runRendererRender,
  runRendererValidate,
  type RenderArtifact,
  type RendererDiagnostic,
} from '../../renderer-plugin.js';
import { validateRenderProfile, validateScoreIR } from '../../schema/validator.js';

export async function renderCommand(args: string[]): Promise<number> {
  let profileArg: string | undefined;
  let scoreArg: string | undefined;
  let pluginArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-p' || arg === '--profile') {
      if (i + 1 >= args.length) {
        console.error('--profile requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      profileArg = args[i + 1];
      i++;
    } else if (arg === '--score') {
      if (i + 1 >= args.length) {
        console.error('--score requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      scoreArg = args[i + 1];
      i++;
    } else if (arg === '--plugin') {
      if (i + 1 >= args.length) {
        console.error('--plugin requires a value');
        return ExitCodes.STATIC_ERROR;
      }
      pluginArg = args[i + 1];
      i++;
    } else if (arg === '-h' || arg === '--help') {
      console.log(`Usage: mf render [options]

Options:
  -p, --profile <file>  Render profile JSON (defaults to mfconfig.toml)
  --score <file>        Use existing score.json (skip compile)
  --plugin <command>    Renderer plugin executable override
  -h, --help            Show this help message
`);
      return ExitCodes.SUCCESS;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      return ExitCodes.STATIC_ERROR;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      return ExitCodes.STATIC_ERROR;
    }
  }

  const configPath = findConfigPath(process.cwd());
  const baseDir = configPath ? path.dirname(configPath) : process.cwd();
  const config = configPath ? loadConfig(configPath) : null;

  const profilePathArg = profileArg ?? config?.project.defaultProfile;
  if (!profilePathArg) {
    console.error('Render profile is required. Use --profile or set project.default_profile in mfconfig.toml.');
    return ExitCodes.STATIC_ERROR;
  }

  const profilePath = path.resolve(baseDir, profilePathArg);
  if (!fs.existsSync(profilePath)) {
    console.error(`Profile not found: ${profilePathArg}`);
    return ExitCodes.IO_ERROR;
  }

  let scorePath: string;

  if (scoreArg) {
    scorePath = path.resolve(baseDir, scoreArg);
    if (!fs.existsSync(scorePath)) {
      console.error(`Score file not found: ${scoreArg}`);
      return ExitCodes.IO_ERROR;
    }

    const scoreErrors = validateScoreFile(scorePath);
    if (scoreErrors.length > 0) {
      reportSchemaErrors('Score', scoreErrors);
      return ExitCodes.STATIC_ERROR;
    }
  } else {
    if (!configPath || !config) {
      console.error('No mfconfig.toml found. Run "mf init" first or pass --score.');
      return ExitCodes.IO_ERROR;
    }

    const entryPath = path.join(baseDir, config.project.entry);
    if (!fs.existsSync(entryPath)) {
      console.error(`Entry file not found: ${config.project.entry}`);
      return ExitCodes.IO_ERROR;
    }

    try {
      console.log('Compiling...');
      const compiler = new V4Compiler(baseDir);
      const ir = compiler.compile(entryPath);
      const warnings = compiler.getDiagnostics().filter((d) => d.severity === 'warning');
      for (const diag of warnings) {
        console.log(`[warning] ${diag.message}`);
      }

      const distDir = path.join(baseDir, config.project.dist);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      scorePath = path.join(distDir, `${path.basename(entryPath)}.score.json`);
      fs.writeFileSync(scorePath, JSON.stringify(ir, null, 2));
      console.log(`Generated: ${path.relative(baseDir, scorePath)}`);
    } catch (err) {
      return handleCliError(err);
    }
  }

  try {
    const profile = loadRenderProfile(profilePath);
    const profileErrors = validateRenderProfile(profile);
    if (profileErrors.length > 0) {
      reportSchemaErrors('Profile', profileErrors);
      return ExitCodes.STATIC_ERROR;
    }
    const renderer = await resolveRenderer(profile, { plugin: pluginArg, cwd: baseDir });

    const validateResult = await runRendererValidate(renderer.command, scorePath, profilePath, baseDir);
    const diagnostics = validateResult.value;
    let errorCount = 0;
    let warningCount = 0;

    for (const diag of diagnostics) {
      console.log(formatRendererDiagnostic(diag));
      if (diag.level === 'error') {
        errorCount++;
      } else if (diag.level === 'warning') {
        warningCount++;
      }
    }

    if (validateResult.exitCode !== 0 && diagnostics.length === 0) {
      console.error(`Renderer validate failed (exit ${validateResult.exitCode})`);
      if (validateResult.stderr.trim()) {
        console.error(validateResult.stderr.trim());
      }
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }

    if (errorCount > 0) {
      console.log('');
      console.log(`Validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}.`);
      return ExitCodes.STATIC_ERROR;
    }

    if (diagnostics.length === 0) {
      console.log('Renderer validation passed.');
    } else if (warningCount > 0) {
      console.log('');
      console.log(`Validation passed with ${warningCount} warning${warningCount > 1 ? 's' : ''}.`);
    }

    const renderResult = await runRendererRender(renderer.command, scorePath, profilePath, baseDir);
    const artifacts = renderResult.value;

    if (renderResult.exitCode !== 0 && artifacts.length === 0) {
      console.error(`Renderer render failed (exit ${renderResult.exitCode})`);
      if (renderResult.stderr.trim()) {
        console.error(renderResult.stderr.trim());
      }
      return ExitCodes.EXTERNAL_TOOL_ERROR;
    }

    if (artifacts.length === 0) {
      console.log('Renderer returned no artifacts.');
    } else {
      for (const artifact of artifacts) {
        console.log(formatArtifact(artifact));
      }
    }

    return ExitCodes.SUCCESS;
  } catch (err) {
    return handleCliError(err);
  }
}

function formatRendererDiagnostic(diag: RendererDiagnostic): string {
  const prefix = `[${diag.level}]`;
  const code = diag.code ? `${diag.code}: ` : '';
  const location = formatLocation(diag.location);
  return location ? `${prefix} ${code}${diag.message} (${location})` : `${prefix} ${code}${diag.message}`;
}

function formatLocation(location?: Record<string, unknown>): string | null {
  if (!location) return null;
  const parts: string[] = [];
  const trackName = location.trackName;
  const placementIndex = location.placementIndex;
  const eventIndex = location.eventIndex;
  const pos = location.pos;

  if (typeof trackName === 'string') parts.push(`track=${trackName}`);
  if (typeof placementIndex === 'number') parts.push(`placement=${placementIndex}`);
  if (typeof eventIndex === 'number') parts.push(`event=${eventIndex}`);
  if (pos !== undefined) parts.push(`pos=${formatLocationValue(pos)}`);

  return parts.length > 0 ? parts.join(', ') : null;
}

function formatLocationValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatArtifact(artifact: RenderArtifact): string {
  const details: string[] = [];
  if (artifact.mediaType) details.push(artifact.mediaType);
  if (artifact.description) details.push(artifact.description);
  const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
  const pathLabel = artifact.path ? artifact.path : '(no path)';
  return `Generated: ${pathLabel}${suffix}`;
}

function validateScoreFile(scorePath: string): string[] {
  const raw = fs.readFileSync(scorePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return [`at <root>: invalid JSON (${(err as Error).message})`];
  }
  return validateScoreIR(parsed);
}

function reportSchemaErrors(label: string, errors: string[]): void {
  console.error(`${label} schema validation failed:`);
  for (const message of errors) {
    console.error(`- ${message}`);
  }
}
