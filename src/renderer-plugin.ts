import * as fs from 'fs';
import { spawn } from 'child_process';

export type DegradePolicy = 'Error' | 'Drop' | 'Approx';

export interface RenderProfile {
  tako: { profileVersion: 1; [key: string]: unknown };
  profileName: string;
  renderer: string;
  output: Record<string, unknown>;
  bindings: Binding[];
  degradePolicy?: DegradePolicy;
}

export interface Binding {
  selector: Selector;
  config: Record<string, unknown>;
}

export interface Selector {
  trackName?: string;
  role?: 'Instrument' | 'Drums' | 'Vocal' | 'Automation';
  sound?: string;
}

export interface RendererCapabilities {
  protocolVersion: number;
  id: string;
  version?: string;
  supportedRoles?: string[];
  supportedEvents?: string[];
  lyricSupport?: {
    text: boolean;
    syllables: boolean;
    phonemes: boolean;
    alphabets?: string[];
  };
  paramSupport?: {
    namespaces?: string[];
    patterns?: string[];
  };
  degradeDefaults?: DegradePolicy;
  [key: string]: unknown;
}

export interface RendererDiagnostic {
  level: 'error' | 'warning' | 'info';
  code?: string;
  message: string;
  location?: Record<string, unknown>;
}

export interface RenderArtifact {
  kind: 'file' | 'dir' | 'bundle' | 'stream';
  path?: string;
  mediaType?: string;
  description?: string;
}

export interface ResolvedRenderer {
  command: string;
  capabilities: RendererCapabilities;
}

export interface RendererRunResult<T> {
  value: T;
  exitCode: number;
  stderr: string;
  stdout: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function loadRenderProfile(profilePath: string): RenderProfile {
  const raw = fs.readFileSync(profilePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${profilePath}: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Render Profile ${profilePath} must be a JSON object`);
  }

  const profile = parsed as RenderProfile;

  assert(profile.tako && typeof profile.tako === 'object', 'Render Profile "tako" section is required');
  assert(profile.tako.profileVersion === 1, 'Render Profile "tako.profileVersion" must be 1');
  assert(isNonEmptyString(profile.profileName), 'Render Profile "profileName" must be a non-empty string');
  assert(isNonEmptyString(profile.renderer), 'Render Profile "renderer" must be a non-empty string');
  assert(isPlainObject(profile.output), 'Render Profile "output" must be an object');
  assert(Array.isArray(profile.bindings) && profile.bindings.length > 0, 'Render Profile "bindings" must be a non-empty array');

  profile.bindings.forEach((binding, index) => {
    assert(binding && typeof binding === 'object', `Render Profile binding #${index} must be an object`);
    assert(isPlainObject(binding.selector), `Render Profile binding #${index} missing "selector"`);
    assert(
      Object.keys(binding.selector).length > 0,
      `Render Profile binding #${index} selector must include at least one field`
    );
    assert(isPlainObject(binding.config), `Render Profile binding #${index} missing "config"`);
  });

  return profile;
}

export async function resolveRenderer(
  profile: RenderProfile,
  options: { plugin?: string; cwd?: string }
): Promise<ResolvedRenderer> {
  const rendererId = profile.renderer;
  const candidates = options.plugin ? [options.plugin] : buildRendererCandidates(rendererId);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const result = await runRendererCommand<RendererCapabilities>(
        candidate,
        ['capabilities'],
        'capabilities',
        options.cwd
      );

      if (result.exitCode !== 0) {
        errors.push(`${candidate}: capabilities exited with code ${result.exitCode}`);
        continue;
      }

      if (result.value.protocolVersion !== 1) {
        errors.push(`${candidate}: protocolVersion ${result.value.protocolVersion} is not supported`);
        continue;
      }

      if (result.value.id !== rendererId) {
        errors.push(`${candidate}: id "${result.value.id}" does not match "${rendererId}"`);
        continue;
      }

      return { command: candidate, capabilities: result.value };
    } catch (err) {
      errors.push(`${candidate}: ${(err as Error).message}`);
    }
  }

  if (options.plugin) {
    throw new Error(errors[0] ?? `Renderer plugin failed: ${options.plugin}`);
  }

  throw new Error(
    `Renderer plugin not found for "${rendererId}". Tried: ${candidates.join(', ')}`
  );
}

export async function runRendererValidate(
  command: string,
  scorePath: string,
  profilePath: string,
  cwd?: string
): Promise<RendererRunResult<RendererDiagnostic[]>> {
  return runRendererCommand<RendererDiagnostic[]>(
    command,
    ['validate', '--score', scorePath, '--profile', profilePath],
    'validate',
    cwd
  );
}

export async function runRendererRender(
  command: string,
  scorePath: string,
  profilePath: string,
  cwd?: string
): Promise<RendererRunResult<RenderArtifact[]>> {
  return runRendererCommand<RenderArtifact[]>(
    command,
    ['render', '--score', scorePath, '--profile', profilePath],
    'render',
    cwd
  );
}

function buildRendererCandidates(rendererId: string): string[] {
  const normalized = normalizeRendererId(rendererId);
  const candidates: string[] = [];

  if (normalized) {
    candidates.push(`tako-render-${normalized}`);
  }

  const prefix = rendererId.split('.')[0];
  if (prefix && prefix !== rendererId) {
    candidates.push(`tako-render-${prefix}`);
  }

  candidates.push(rendererId);
  return Array.from(new Set(candidates));
}

function normalizeRendererId(rendererId: string): string {
  return rendererId
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseJsonOutput<T>(stdout: string, context: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(`${context} returned empty output`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed;
    throw new Error(`${context} returned invalid JSON: ${(err as Error).message}. Output: ${preview}`);
  }
}

async function runRendererCommand<T>(
  command: string,
  args: string[],
  context: string,
  cwd?: string
): Promise<RendererRunResult<T>> {
  const result = await runCommand(command, args, cwd);
  if (result.exitCode !== 0 && result.stdout.trim() === '') {
    const detail = result.stderr.trim() ? `: ${result.stderr.trim()}` : '';
    throw new Error(`${context} failed (exit ${result.exitCode})${detail}`);
  }
  const value = parseJsonOutput<T>(result.stdout, context);
  return { value, exitCode: result.exitCode, stderr: result.stderr, stdout: result.stdout };
}

function runCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
