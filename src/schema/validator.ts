import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AjvModule, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..', '..');
const schemaDir = path.join(packageRoot, 'docs', 'schemas');

type AjvInstance = import('ajv/dist/2020.js').default;
const AjvCtor = AjvModule as unknown as { new (options?: Record<string, unknown>): AjvInstance };

let ajv: AjvInstance | null = null;
const validators = new Map<string, ValidateFunction>();

export function validateScoreIR(score: unknown): string[] {
  return validateWith('IR_V4.schema.json', score);
}

export function validateRenderProfile(profile: unknown): string[] {
  return validateWith('PROFILE_V3.schema.json', profile);
}

function validateWith(schemaName: string, value: unknown): string[] {
  const validate = getValidator(schemaName);
  const valid = validate(value);
  if (valid) return [];
  return formatErrors(validate.errors);
}

function getValidator(schemaName: string): ValidateFunction {
  const cached = validators.get(schemaName);
  if (cached) return cached;
  const schema = loadSchema(schemaName);
  const compiler = getAjv();
  const schemaId = typeof schema.$id === 'string' ? schema.$id : undefined;
  if (schemaId) {
    const existing = compiler.getSchema(schemaId);
    if (existing) {
      validators.set(schemaName, existing);
      return existing;
    }
  }
  const validate = compiler.compile(schema);
  validators.set(schemaName, validate);
  return validate;
}

function loadSchema(schemaName: string): Record<string, unknown> {
  const schemaPath = path.join(schemaDir, schemaName);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`);
  }
  const raw = fs.readFileSync(schemaPath, 'utf-8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Invalid JSON schema ${schemaName}: ${(err as Error).message}`);
  }
}

function getAjv(): AjvInstance {
  if (!ajv) {
    ajv = new AjvCtor({ allErrors: true, strict: false });
  }
  return ajv;
}

function formatErrors(errors?: ErrorObject[] | null): string[] {
  if (!errors || errors.length === 0) return [];
  return errors.map((err) => {
    const pathLabel = err.instancePath ? `at ${err.instancePath}` : 'at <root>';
    const message = err.message ?? 'schema validation error';
    return `${pathLabel}: ${message}`;
  });
}
