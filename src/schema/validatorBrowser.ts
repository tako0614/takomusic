import AjvModule, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import scoreSchema from '../../docs/schemas/IR_V4.schema.json' with { type: 'json' };

type AjvInstance = import('ajv/dist/2020.js').default;
const AjvCtor = AjvModule as unknown as { new (options?: Record<string, unknown>): AjvInstance };

let ajv: AjvInstance | null = null;
let scoreValidator: ValidateFunction | null = null;

export function validateScoreIRBrowser(score: unknown): string[] {
  const validate = getScoreValidator();
  const valid = validate(score);
  if (valid) return [];
  return formatErrors(validate.errors);
}

function getScoreValidator(): ValidateFunction {
  if (scoreValidator) return scoreValidator;
  const compiler = getAjv();
  const schemaId = typeof scoreSchema.$id === 'string' ? scoreSchema.$id : undefined;
  if (schemaId) {
    const existing = compiler.getSchema(schemaId);
    if (existing) {
      scoreValidator = existing;
      return existing;
    }
  }
  scoreValidator = compiler.compile(scoreSchema as Record<string, unknown>);
  return scoreValidator;
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
