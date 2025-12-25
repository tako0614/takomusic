// Configuration file parser for mfconfig.toml

import * as fs from 'fs';
import * as path from 'path';
import TOML from 'toml';

export interface ProjectConfig {
  entry: string;
  dist: string;
  out: string;
  defaultProfile: string;
}

export interface MFConfig {
  project: ProjectConfig;
}

const DEFAULT_CONFIG: MFConfig = {
  project: {
    entry: 'src/main.mf',
    dist: 'dist',
    out: 'out',
    defaultProfile: 'profiles/default.mf.profile.json',
  },
};

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function loadConfig(configPath: string): MFConfig {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = TOML.parse(content);
    const config = mergeConfig(DEFAULT_CONFIG, parsed);

    // Validate required fields and types
    validateLoadedConfig(config, configPath);

    return config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Config file not found: ${configPath}`);
    }
    if (err instanceof Error && err.message.includes('Syntax error')) {
      throw new Error(`Invalid TOML syntax in ${configPath}: ${err.message}`);
    }
    throw err;
  }
}

function validateLoadedConfig(config: MFConfig, configPath: string): void {
  const errors: string[] = [];

  if (!config.project) {
    errors.push('Missing [project] section');
  } else {
    if (!isNonEmptyString(config.project.entry)) {
      errors.push('project.entry must be a non-empty string');
    }
    if (!isNonEmptyString(config.project.dist)) {
      errors.push('project.dist must be a non-empty string');
    }
    if (!isNonEmptyString(config.project.out)) {
      errors.push('project.out must be a non-empty string');
    }
    if (!isNonEmptyString(config.project.defaultProfile)) {
      errors.push('project.defaultProfile must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration in ${configPath}:\n  - ${errors.join('\n  - ')}`);
  }
}

export function validateConfig(configPath: string): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseDir = path.dirname(configPath);

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = TOML.parse(content);

    const validTopKeys = ['project'];
    for (const key of Object.keys(parsed)) {
      if (!validTopKeys.includes(key)) {
        warnings.push(`Unknown config key: "${key}". Valid keys are: ${validTopKeys.join(', ')}`);
      }
    }

    if (parsed.project) {
      const validProjectKeys = ['entry', 'dist', 'out', 'default_profile', 'name', 'version'];
      for (const key of Object.keys(parsed.project)) {
        if (!validProjectKeys.includes(key)) {
          warnings.push(`Unknown project key: "${key}". Valid keys are: ${validProjectKeys.join(', ')}`);
        }
      }

      if (parsed.project.entry) {
        const entryPath = path.join(baseDir, parsed.project.entry);
        if (!fs.existsSync(entryPath)) {
          errors.push(`Entry file not found: ${parsed.project.entry}`);
        }
      }
    } else {
      warnings.push('Missing [project] section, using defaults');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (err) {
    if (err instanceof Error) {
      errors.push(err.message);
    }
    return { valid: false, errors, warnings };
  }
}

export function findConfigPath(startDir: string): string | null {
  let currentDir = startDir;

  const MAX_DEPTH = 100;
  let depth = 0;

  while (depth < MAX_DEPTH) {
    depth++;
    const configPath = path.join(currentDir, 'mfconfig.toml');
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }

  return null;
}

function mergeConfig(defaults: MFConfig, parsed: any): MFConfig {
  return {
    project: {
      entry: parsed.project?.entry ?? defaults.project.entry,
      dist: parsed.project?.dist ?? defaults.project.dist,
      out: parsed.project?.out ?? defaults.project.out,
      defaultProfile: parsed.project?.default_profile ?? defaults.project.defaultProfile,
    },
  };
}

export function generateDefaultConfig(): string {
  return `[project]
entry = "src/main.mf"
dist  = "dist"
out   = "out"
default_profile = "profiles/default.mf.profile.json"
`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
