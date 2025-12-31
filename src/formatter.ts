/**
 * TakoMusic Code Formatter
 *
 * Formats .mf source code with consistent style:
 * - 2-space indentation
 * - Consistent spacing around operators
 * - Proper line breaks
 * - Aligned comments
 */

import { V4Lexer } from './lexer.js';
import { V4Parser } from './parser.js';
import type {
  Program,
  TopDecl,
  ImportDecl,
  FnDecl,
  ConstDecl,
  Statement,
  Block,
  Expr,
  ScoreExpr,
  ScoreItem,
  ClipExpr,
  ClipStmt,
  MatchExpr,
  MatchArm,
  MatchPattern,
  CallArg,
  NamedArg,
  SoundBodyItem,
  TrackStmt,
} from './ast.js';

export interface FormatOptions {
  indentSize: number;
  maxLineWidth: number;
  insertFinalNewline: boolean;
  trimTrailingWhitespace: boolean;
}

const defaultOptions: FormatOptions = {
  indentSize: 2,
  maxLineWidth: 100,
  insertFinalNewline: true,
  trimTrailingWhitespace: true,
};

export function format(source: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...defaultOptions, ...options };

  // Parse the source
  const lexer = new V4Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new V4Parser(tokens);
  const program = parser.parseProgram();

  // Format the AST
  const formatter = new Formatter(opts);
  let result = formatter.formatProgram(program);

  // Post-processing
  if (opts.trimTrailingWhitespace) {
    result = result
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }

  if (opts.insertFinalNewline && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

class Formatter {
  private indent = 0;
  private opts: FormatOptions;

  constructor(opts: FormatOptions) {
    this.opts = opts;
  }

  private indentStr(): string {
    return ' '.repeat(this.indent * this.opts.indentSize);
  }

  private pushIndent(): void {
    this.indent++;
  }

  private popIndent(): void {
    this.indent--;
  }

  formatProgram(program: Program): string {
    const parts: string[] = [];

    // Group imports
    const imports = program.imports;
    const body = program.body;

    // Format imports
    for (const imp of imports) {
      parts.push(this.formatImport(imp));
    }

    if (imports.length > 0 && body.length > 0) {
      parts.push(''); // Blank line after imports
    }

    // Format declarations
    for (let i = 0; i < body.length; i++) {
      const decl = body[i];
      parts.push(this.formatTopDecl(decl));

      // Add blank line between top-level declarations
      if (i < body.length - 1) {
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  private formatImport(imp: ImportDecl): string {
    const spec = imp.spec;
    const source = imp.from.value;

    if (spec.kind === 'ImportNamed') {
      const names = spec.names.join(', ');
      return `import { ${names} } from "${source}";`;
    } else {
      // ImportAll
      return `import * as ${spec.alias} from "${source}";`;
    }
  }

  private formatTopDecl(decl: TopDecl): string {
    switch (decl.kind) {
      case 'FnDecl':
        return this.formatFnDecl(decl);
      case 'ConstDecl':
        return this.formatConstDecl(decl, true);
      case 'TypeAliasDecl':
        return `type ${decl.name} = ${decl.typeExpr.name};`;
      default:
        return '';
    }
  }

  private formatFnDecl(fn: FnDecl): string {
    const exportStr = fn.exported ? 'export ' : '';
    const params = fn.params.map((p) => {
      const typeStr = p.type ? `: ${p.type.name}` : '';
      return `${p.name}${typeStr}`;
    }).join(', ');
    const returnType = fn.returnType ? ` -> ${fn.returnType.name}` : '';

    const header = `${exportStr}fn ${fn.name}(${params})${returnType} {`;
    const body = this.formatBlock(fn.body);
    return `${header}\n${body}\n${this.indentStr()}}`;
  }

  private formatConstDecl(decl: ConstDecl, topLevel: boolean = false): string {
    const indent = topLevel ? '' : this.indentStr();
    const keyword = decl.mutable ? 'let' : 'const';
    const exportStr = topLevel && decl.exported ? 'export ' : '';
    const typeStr = decl.type ? `: ${decl.type.name}` : '';
    const value = this.formatExpr(decl.value);
    return `${indent}${exportStr}${keyword} ${decl.name}${typeStr} = ${value};`;
  }

  private formatBlock(block: Block): string {
    this.pushIndent();
    const stmts = block.statements.map((s) => this.formatStatement(s));
    this.popIndent();
    return stmts.join('\n');
  }

  private formatStatement(stmt: Statement): string {
    const indent = this.indentStr();

    switch (stmt.kind) {
      case 'ConstDecl':
        return this.formatConstDecl(stmt, false);
      case 'AssignmentStmt':
        return `${indent}${this.formatExpr(stmt.target)} = ${this.formatExpr(stmt.value)};`;
      case 'ReturnStmt':
        return stmt.value
          ? `${indent}return ${this.formatExpr(stmt.value)};`
          : `${indent}return;`;
      case 'IfStmt': {
        let result = `${indent}if (${this.formatExpr(stmt.test)}) {\n`;
        result += this.formatBlock(stmt.consequent);
        result += `\n${indent}}`;
        if (stmt.alternate) {
          if (stmt.alternate.kind === 'IfStmt') {
            // else if
            const elseIfStmt = this.formatStatement(stmt.alternate);
            result += ` else ${elseIfStmt.trimStart()}`;
          } else {
            result += ` else {\n`;
            result += this.formatBlock(stmt.alternate);
            result += `\n${indent}}`;
          }
        }
        return result;
      }
      case 'ForStmt':
        return `${indent}for (${stmt.iterator} in ${this.formatExpr(stmt.iterable)}) {\n${this.formatBlock(stmt.body)}\n${indent}}`;
      case 'ExprStmt':
        return `${indent}${this.formatExpr(stmt.expr)};`;
      default:
        return `${indent}// Unknown statement`;
    }
  }

  private formatExpr(expr: Expr): string {
    switch (expr.kind) {
      case 'NumberLiteral':
        return String(expr.value);
      case 'StringLiteral':
        return `"${this.escapeString(expr.value)}"`;
      case 'BoolLiteral':
        return expr.value ? 'true' : 'false';
      case 'NullLiteral':
        return 'null';
      case 'Identifier':
        return expr.name;
      case 'PitchLiteral':
        return expr.value;
      case 'DurLiteral':
        return expr.value;
      case 'PosRefLiteral':
        return `${expr.bar}:${expr.beat}`;
      case 'ArrayLiteral':
        return `[${expr.elements.map((e) => {
          if (e.kind === 'SpreadElement') {
            return `...${this.formatExpr(e.argument)}`;
          }
          return this.formatExpr(e);
        }).join(', ')}]`;
      case 'ObjectLiteral': {
        if (expr.properties.length === 0) return '{}';
        const props = expr.properties.map((p) => {
          if (p.kind === 'SpreadElement') {
            return `...${this.formatExpr(p.argument)}`;
          }
          return `${p.key}: ${this.formatExpr(p.value)}`;
        });
        return `{ ${props.join(', ')} }`;
      }
      case 'BinaryExpr':
        return `${this.formatExpr(expr.left)} ${expr.operator} ${this.formatExpr(expr.right)}`;
      case 'UnaryExpr':
        return `${expr.operator}${this.formatExpr(expr.operand)}`;
      case 'CallExpr': {
        const args = expr.args.map((a) => this.formatCallArg(a));
        const allArgs = args.join(', ');
        return `${this.formatExpr(expr.callee)}(${allArgs})`;
      }
      case 'MemberExpr':
        return `${this.formatExpr(expr.object)}.${expr.property}`;
      case 'IndexExpr':
        return `${this.formatExpr(expr.object)}[${this.formatExpr(expr.index)}]`;
      case 'MatchExpr':
        return this.formatMatchExpr(expr);
      case 'ScoreExpr':
        return this.formatScoreExpr(expr);
      case 'ClipExpr':
        return this.formatClipExpr(expr);
      default:
        return '/* unknown expr */';
    }
  }

  private formatCallArg(arg: CallArg): string {
    if (arg.name) {
      return `${arg.name}: ${this.formatExpr(arg.value)}`;
    }
    return this.formatExpr(arg.value);
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  }

  private formatMatchExpr(expr: MatchExpr): string {
    const subject = this.formatExpr(expr.value);
    this.pushIndent();
    const arms = expr.arms.map((arm) => this.formatMatchArm(arm)).join('\n');
    this.popIndent();
    return `match (${subject}) {\n${arms}\n${this.indentStr()}}`;
  }

  private formatMatchArm(arm: MatchArm): string {
    const indent = this.indentStr();
    const pattern = arm.isDefault ? 'else' : this.formatPattern(arm.pattern!);
    const guard = arm.guard ? ` if ${this.formatExpr(arm.guard)}` : '';
    const body = this.formatExpr(arm.value);
    return `${indent}${pattern}${guard} -> ${body};`;
  }

  private formatPattern(pattern: MatchPattern): string {
    if (pattern.kind === 'RangePattern') {
      return `${pattern.start.value}..${pattern.end.value}`;
    }
    return this.formatExpr(pattern);
  }

  private formatScoreExpr(expr: ScoreExpr): string {
    this.pushIndent();
    const items = expr.items.map((item) => this.formatScoreItem(item)).join('\n\n');
    this.popIndent();
    return `score {\n${items}\n${this.indentStr()}}`;
  }

  private formatScoreItem(item: ScoreItem): string {
    const indent = this.indentStr();

    switch (item.kind) {
      case 'MetaBlock': {
        this.pushIndent();
        const fields = item.fields.map((f) => {
          const val = this.formatExpr(f.value);
          return `${this.indentStr()}${f.key} ${val};`;
        }).join('\n');
        this.popIndent();
        return `${indent}meta {\n${fields}\n${indent}}`;
      }
      case 'TempoBlock': {
        this.pushIndent();
        const entries = item.items.map((e) => {
          const pos = this.formatExpr(e.at);
          const bpm = this.formatExpr(e.bpm);
          return `${this.indentStr()}${pos} -> ${bpm};`;
        }).join('\n');
        this.popIndent();
        return `${indent}tempo {\n${entries}\n${indent}}`;
      }
      case 'MeterBlock': {
        this.pushIndent();
        const entries = item.items.map((e) => {
          const pos = this.formatExpr(e.at);
          const num = this.formatExpr(e.numerator);
          const denom = this.formatExpr(e.denominator);
          return `${this.indentStr()}${pos} -> ${num}/${denom};`;
        }).join('\n');
        this.popIndent();
        return `${indent}meter {\n${entries}\n${indent}}`;
      }
      case 'SoundDecl': {
        let result = `${indent}sound "${item.id}" kind ${item.soundKind}`;
        if (item.body.length > 0) {
          this.pushIndent();
          const bodyParts = item.body.map((b) => this.formatSoundBodyItem(b)).join('\n');
          this.popIndent();
          result += ` {\n${bodyParts}\n${indent}}`;
        } else {
          result += ' {}';
        }
        return result;
      }
      case 'TrackDecl': {
        let result = `${indent}track "${item.name}" role ${item.role} sound "${item.sound}"`;
        if (item.body.length > 0) {
          this.pushIndent();
          const bodyParts = item.body.map((b) => this.formatTrackStmt(b)).join('\n');
          this.popIndent();
          result += ` {\n${bodyParts}\n${indent}}`;
        } else {
          result += ' {}';
        }
        return result;
      }
      case 'ScoreMarker': {
        const pos = this.formatExpr(item.pos);
        const markerKind = this.formatExpr(item.markerKind);
        const label = this.formatExpr(item.label);
        return `${indent}marker(${pos}, ${markerKind}, ${label});`;
      }
      default:
        return `${indent}// Unknown score item`;
    }
  }

  private formatSoundBodyItem(item: SoundBodyItem): string {
    const indent = this.indentStr();

    if (item.kind === 'SoundField') {
      const val = this.formatExpr(item.value);
      return `${indent}${item.key} ${val};`;
    }
    if (item.kind === 'DrumKeysBlock') {
      const keys = item.keys.join('; ');
      return `${indent}drumKeys { ${keys}; }`;
    }
    if (item.kind === 'VocalBlock') {
      this.pushIndent();
      const fields = item.fields.map((f) => {
        const val = this.formatExpr(f.value);
        return `${this.indentStr()}${f.key} ${val};`;
      }).join('\n');
      this.popIndent();
      return `${indent}vocal {\n${fields}\n${indent}}`;
    }
    return `${indent}// Unknown sound body item`;
  }

  private formatTrackStmt(stmt: TrackStmt): string {
    const indent = this.indentStr();

    if (stmt.kind === 'PlaceStmt') {
      const pos = this.formatExpr(stmt.at);
      const clip = this.formatExpr(stmt.clip);
      return `${indent}place ${pos} ${clip};`;
    }
    return `${indent}// Unknown track statement`;
  }

  private formatClipExpr(expr: ClipExpr): string {
    if (expr.body.length === 0) {
      return 'clip {}';
    }

    this.pushIndent();
    const stmts = expr.body.map((s) => this.formatClipStmt(s)).join('\n');
    this.popIndent();
    return `clip {\n${stmts}\n${this.indentStr()}}`;
  }

  private formatClipStmt(stmt: ClipStmt): string {
    const indent = this.indentStr();

    switch (stmt.kind) {
      case 'NoteStmt': {
        const args = [this.formatExpr(stmt.pitch), this.formatExpr(stmt.dur)];
        for (const opt of stmt.opts) {
          args.push(`${opt.name}: ${this.formatExpr(opt.value)}`);
        }
        return `${indent}note(${args.join(', ')});`;
      }
      case 'RestStmt':
        return `${indent}rest(${this.formatExpr(stmt.dur)});`;
      case 'BreathStmt': {
        const dur = this.formatExpr(stmt.dur);
        if (stmt.intensity) {
          return `${indent}breath(${dur}, ${this.formatExpr(stmt.intensity)});`;
        }
        return `${indent}breath(${dur});`;
      }
      case 'ChordStmt': {
        const pitches = this.formatExpr(stmt.pitches);
        const args = [pitches, this.formatExpr(stmt.dur)];
        for (const opt of stmt.opts) {
          args.push(`${opt.name}: ${this.formatExpr(opt.value)}`);
        }
        return `${indent}chord(${args.join(', ')});`;
      }
      case 'HitStmt': {
        const args = [this.formatExpr(stmt.key), this.formatExpr(stmt.dur)];
        for (const opt of stmt.opts) {
          args.push(`${opt.name}: ${this.formatExpr(opt.value)}`);
        }
        return `${indent}hit(${args.join(', ')});`;
      }
      case 'AtStmt':
        return `${indent}at(${this.formatExpr(stmt.pos)});`;
      case 'CCStmt':
        return `${indent}cc(${this.formatExpr(stmt.num)}, ${this.formatExpr(stmt.value)});`;
      case 'AutomationStmt': {
        const param = this.formatExpr(stmt.param);
        const start = this.formatExpr(stmt.start);
        const end = this.formatExpr(stmt.end);
        const curve = this.formatExpr(stmt.curve);
        return `${indent}automation ${param} from ${start} to ${end} curve ${curve};`;
      }
      case 'MarkerStmt': {
        const markerKind = this.formatExpr(stmt.markerKind);
        const label = this.formatExpr(stmt.label);
        return `${indent}marker(${markerKind}, ${label});`;
      }
      default:
        return `${indent}// Unknown clip statement`;
    }
  }
}
