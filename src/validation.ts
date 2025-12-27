import type { Diagnostic } from './diagnostics.js';
import type { Position } from './token.js';
import type {
  Program,
  ScoreExpr,
  ScoreItem,
  TempoItem,
  MeterItem,
  TrackDecl,
  ClipExpr,
  ClipStmt,
  Expr,
} from './ast.js';

export interface ValidationContext {
  filePath?: string;
  diagnostics: Diagnostic[];
}

/**
 * Validates a parsed program for semantic errors before evaluation.
 * This catches issues that the parser accepts but are semantically invalid.
 */
export function validateProgram(program: Program, ctx: ValidationContext): void {
  for (const decl of program.body) {
    if (decl.kind === 'FnDecl') {
      validateBlock(decl.body.statements, ctx);
    } else if (decl.kind === 'ConstDecl') {
      validateExpr(decl.value, ctx);
    }
  }
}

function validateBlock(statements: any[], ctx: ValidationContext): void {
  for (const stmt of statements) {
    validateStatement(stmt, ctx);
  }
}

function validateStatement(stmt: any, ctx: ValidationContext): void {
  switch (stmt.kind) {
    case 'ConstDecl':
      validateExpr(stmt.value, ctx);
      break;
    case 'ReturnStmt':
      if (stmt.value) validateExpr(stmt.value, ctx);
      break;
    case 'IfStmt':
      validateExpr(stmt.test, ctx);
      validateBlock(stmt.consequent.statements, ctx);
      if (stmt.alternate) {
        if (stmt.alternate.kind === 'IfStmt') {
          validateStatement(stmt.alternate, ctx);
        } else {
          validateBlock(stmt.alternate.statements, ctx);
        }
      }
      break;
    case 'ForStmt':
      validateExpr(stmt.iterable, ctx);
      validateBlock(stmt.body.statements, ctx);
      break;
    case 'AssignmentStmt':
      validateExpr(stmt.target, ctx);
      validateExpr(stmt.value, ctx);
      break;
    case 'ExprStmt':
      validateExpr(stmt.expr, ctx);
      break;
  }
}

function validateExpr(expr: Expr, ctx: ValidationContext): void {
  switch (expr.kind) {
    case 'ScoreExpr':
      validateScoreExpr(expr, ctx);
      break;
    case 'ClipExpr':
      validateClipExpr(expr, ctx);
      break;
    case 'ArrayLiteral':
      for (const el of expr.elements) {
        validateExpr(el, ctx);
      }
      break;
    case 'ObjectLiteral':
      for (const prop of expr.properties) {
        validateExpr(prop.value, ctx);
      }
      break;
    case 'MemberExpr':
      validateExpr(expr.object, ctx);
      break;
    case 'IndexExpr':
      validateExpr(expr.object, ctx);
      validateExpr(expr.index, ctx);
      break;
    case 'CallExpr':
      validateExpr(expr.callee, ctx);
      for (const arg of expr.args) {
        validateExpr(arg.value, ctx);
      }
      break;
    case 'UnaryExpr':
      validateExpr(expr.operand, ctx);
      break;
    case 'BinaryExpr':
      validateExpr(expr.left, ctx);
      validateExpr(expr.right, ctx);
      break;
    case 'MatchExpr':
      validateExpr(expr.value, ctx);
      for (const arm of expr.arms) {
        if (arm.pattern) validateExpr(arm.pattern, ctx);
        validateExpr(arm.value, ctx);
      }
      break;
  }
}

function validateScoreExpr(expr: ScoreExpr, ctx: ValidationContext): void {
  const soundIds = new Set<string>();
  const meterPositions: Array<{ pos: string; position: Position }> = [];
  const tempoPositions: Array<{ pos: string; position: Position }> = [];
  const trackSoundRefs: Array<{ sound: string; position: Position }> = [];

  for (const item of expr.items) {
    switch (item.kind) {
      case 'MetaBlock':
        for (const field of item.fields) {
          validateExpr(field.value, ctx);
        }
        break;

      case 'TempoBlock':
        for (const tempo of item.items) {
          validateTempoItem(tempo, ctx, tempoPositions);
        }
        break;

      case 'MeterBlock':
        for (const meter of item.items) {
          validateMeterItem(meter, ctx, meterPositions);
        }
        break;

      case 'SoundDecl':
        if (soundIds.has(item.id)) {
          ctx.diagnostics.push({
            severity: 'error',
            message: `Duplicate sound id: "${item.id}"`,
            position: item.position,
            filePath: ctx.filePath,
          });
        }
        soundIds.add(item.id);
        validateSoundKind(item.soundKind, item.position, ctx);
        break;

      case 'TrackDecl':
        trackSoundRefs.push({ sound: item.sound, position: item.position });
        validateTrackRole(item.role, item.position, ctx);
        for (const stmt of item.body) {
          validateExpr(stmt.at, ctx);
          validateExpr(stmt.clip, ctx);
        }
        break;

      case 'ScoreMarker':
        validateExpr(item.pos, ctx);
        validateExpr(item.markerKind, ctx);
        validateExpr(item.label, ctx);
        break;
    }
  }

  // Validate sound references after all sounds are collected
  for (const ref of trackSoundRefs) {
    if (!soundIds.has(ref.sound)) {
      ctx.diagnostics.push({
        severity: 'error',
        message: `Undefined sound id: "${ref.sound}"`,
        position: ref.position,
        filePath: ctx.filePath,
      });
    }
  }

  // Check for duplicate meter positions
  checkDuplicatePositions(meterPositions, 'meter', ctx);

  // Check for duplicate tempo positions
  checkDuplicatePositions(tempoPositions, 'tempo', ctx);
}

function validateTempoItem(
  item: TempoItem,
  ctx: ValidationContext,
  positions: Array<{ pos: string; position: Position }>
): void {
  validateExpr(item.at, ctx);
  validateExpr(item.bpm, ctx);
  if (item.unit) validateExpr(item.unit, ctx);

  // Check for literal BPM validation
  if (item.bpm.kind === 'NumberLiteral') {
    if (item.bpm.value <= 0) {
      ctx.diagnostics.push({
        severity: 'error',
        message: `BPM must be positive, got ${item.bpm.value}`,
        position: item.bpm.position,
        filePath: ctx.filePath,
      });
    }
    if (item.bpm.value > 999) {
      ctx.diagnostics.push({
        severity: 'warning',
        message: `BPM ${item.bpm.value} is unusually high`,
        position: item.bpm.position,
        filePath: ctx.filePath,
      });
    }
  }

  // Track position for duplicate detection
  const posKey = exprToPositionKey(item.at);
  if (posKey) {
    positions.push({ pos: posKey, position: item.position });
  }
}

function validateMeterItem(
  item: MeterItem,
  ctx: ValidationContext,
  positions: Array<{ pos: string; position: Position }>
): void {
  validateExpr(item.at, ctx);
  validateExpr(item.numerator, ctx);
  validateExpr(item.denominator, ctx);

  // Check for literal numerator validation
  if (item.numerator.kind === 'NumberLiteral') {
    if (item.numerator.value <= 0 || !Number.isInteger(item.numerator.value)) {
      ctx.diagnostics.push({
        severity: 'error',
        message: `Meter numerator must be a positive integer, got ${item.numerator.value}`,
        position: item.numerator.position,
        filePath: ctx.filePath,
      });
    }
  }

  // Check for literal denominator validation
  if (item.denominator.kind === 'NumberLiteral') {
    const validDenominators = [1, 2, 4, 8, 16, 32, 64];
    if (!validDenominators.includes(item.denominator.value)) {
      ctx.diagnostics.push({
        severity: 'error',
        message: `Meter denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64), got ${item.denominator.value}`,
        position: item.denominator.position,
        filePath: ctx.filePath,
      });
    }
  }

  // Track position for duplicate detection
  const posKey = exprToPositionKey(item.at);
  if (posKey) {
    positions.push({ pos: posKey, position: item.position });
  }
}

function validateClipExpr(expr: ClipExpr, ctx: ValidationContext): void {
  for (const stmt of expr.body) {
    validateClipStmt(stmt, ctx);
  }
}

function validateClipStmt(stmt: ClipStmt, ctx: ValidationContext): void {
  switch (stmt.kind) {
    case 'AtStmt':
      validateExpr(stmt.pos, ctx);
      break;

    case 'RestStmt':
      validateExpr(stmt.dur, ctx);
      validatePositiveDuration(stmt.dur, ctx);
      break;

    case 'BreathStmt':
      validateExpr(stmt.dur, ctx);
      validatePositiveDuration(stmt.dur, ctx);
      if (stmt.intensity) {
        validateExpr(stmt.intensity, ctx);
        if (stmt.intensity.kind === 'NumberLiteral') {
          if (stmt.intensity.value < 0 || stmt.intensity.value > 1) {
            ctx.diagnostics.push({
              severity: 'warning',
              message: `Breath intensity should be between 0 and 1, got ${stmt.intensity.value}`,
              position: stmt.intensity.position,
              filePath: ctx.filePath,
            });
          }
        }
      }
      break;

    case 'NoteStmt':
      validateExpr(stmt.pitch, ctx);
      validateExpr(stmt.dur, ctx);
      validatePositiveDuration(stmt.dur, ctx);
      for (const opt of stmt.opts) {
        validateExpr(opt.value, ctx);
        validateNoteOption(opt.name, opt.value, opt.position, ctx);
      }
      break;

    case 'ChordStmt':
      validateExpr(stmt.pitches, ctx);
      validateExpr(stmt.dur, ctx);
      validatePositiveDuration(stmt.dur, ctx);
      for (const opt of stmt.opts) {
        validateExpr(opt.value, ctx);
        validateNoteOption(opt.name, opt.value, opt.position, ctx);
      }
      break;

    case 'HitStmt':
      validateExpr(stmt.key, ctx);
      validateExpr(stmt.dur, ctx);
      validatePositiveDuration(stmt.dur, ctx);
      for (const opt of stmt.opts) {
        validateExpr(opt.value, ctx);
        validateNoteOption(opt.name, opt.value, opt.position, ctx);
      }
      break;

    case 'CCStmt':
      validateExpr(stmt.num, ctx);
      validateExpr(stmt.value, ctx);
      if (stmt.num.kind === 'NumberLiteral') {
        if (stmt.num.value < 0 || stmt.num.value > 127 || !Number.isInteger(stmt.num.value)) {
          ctx.diagnostics.push({
            severity: 'error',
            message: `CC number must be an integer between 0 and 127, got ${stmt.num.value}`,
            position: stmt.num.position,
            filePath: ctx.filePath,
          });
        }
      }
      if (stmt.value.kind === 'NumberLiteral') {
        if (stmt.value.value < 0 || stmt.value.value > 127) {
          ctx.diagnostics.push({
            severity: 'warning',
            message: `CC value should be between 0 and 127, got ${stmt.value.value}`,
            position: stmt.value.position,
            filePath: ctx.filePath,
          });
        }
      }
      break;

    case 'AutomationStmt':
      validateExpr(stmt.param, ctx);
      validateExpr(stmt.start, ctx);
      validateExpr(stmt.end, ctx);
      validateExpr(stmt.curve, ctx);
      break;

    case 'MarkerStmt':
      validateExpr(stmt.markerKind, ctx);
      validateExpr(stmt.label, ctx);
      break;
  }
}

function validatePositiveDuration(expr: Expr, ctx: ValidationContext): void {
  if (expr.kind === 'DurLiteral') {
    // Duration literals are always positive by definition
    return;
  }
  if (expr.kind === 'NumberLiteral' && expr.value <= 0) {
    ctx.diagnostics.push({
      severity: 'error',
      message: `Duration must be positive, got ${expr.value}`,
      position: expr.position,
      filePath: ctx.filePath,
    });
  }
  if (expr.kind === 'BinaryExpr' && expr.operator === '/') {
    // Fraction like 1/4
    if (expr.left.kind === 'NumberLiteral' && expr.right.kind === 'NumberLiteral') {
      if (expr.left.value <= 0 || expr.right.value <= 0) {
        ctx.diagnostics.push({
          severity: 'error',
          message: `Duration fraction must have positive numerator and denominator`,
          position: expr.position,
          filePath: ctx.filePath,
        });
      }
    }
  }
}

function validateNoteOption(
  name: string,
  value: Expr,
  position: Position,
  ctx: ValidationContext
): void {
  if (name === 'vel' && value.kind === 'NumberLiteral') {
    if (value.value < 0 || value.value > 1) {
      ctx.diagnostics.push({
        severity: 'warning',
        message: `Velocity should be between 0 and 1, got ${value.value}`,
        position: value.position,
        filePath: ctx.filePath,
      });
    }
  }
  if (name === 'voice' && value.kind === 'NumberLiteral') {
    if (value.value < 0 || !Number.isInteger(value.value)) {
      ctx.diagnostics.push({
        severity: 'error',
        message: `Voice must be a non-negative integer, got ${value.value}`,
        position: value.position,
        filePath: ctx.filePath,
      });
    }
  }
}

function validateSoundKind(kind: string, position: Position, ctx: ValidationContext): void {
  const validKinds = ['instrument', 'drumKit', 'vocal', 'fx'];
  if (!validKinds.includes(kind)) {
    ctx.diagnostics.push({
      severity: 'error',
      message: `Invalid sound kind: "${kind}". Valid kinds are: ${validKinds.join(', ')}`,
      position,
      filePath: ctx.filePath,
    });
  }
}

function validateTrackRole(role: string, position: Position, ctx: ValidationContext): void {
  const validRoles = ['Instrument', 'Drums', 'Vocal', 'Automation'];
  if (!validRoles.includes(role)) {
    ctx.diagnostics.push({
      severity: 'error',
      message: `Invalid track role: "${role}". Valid roles are: ${validRoles.join(', ')}`,
      position,
      filePath: ctx.filePath,
    });
  }
}

function exprToPositionKey(expr: Expr): string | null {
  if (expr.kind === 'PosRefLiteral') {
    return `${expr.bar}:${expr.beat}`;
  }
  if (expr.kind === 'NumberLiteral') {
    return `n:${expr.value}`;
  }
  return null;
}

function checkDuplicatePositions(
  positions: Array<{ pos: string; position: Position }>,
  type: 'meter' | 'tempo',
  ctx: ValidationContext
): void {
  const seen = new Map<string, Position>();
  for (const { pos, position } of positions) {
    if (seen.has(pos)) {
      ctx.diagnostics.push({
        severity: 'warning',
        message: `Duplicate ${type} event at position ${pos}. Later event will override.`,
        position,
        filePath: ctx.filePath,
      });
    }
    seen.set(pos, position);
  }
}
