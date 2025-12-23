// Formatter for TakoScore v2.0 source code

import type {
  Score,
  Statement,
  Expression,
  Parameter,
  GlobalStatement,
  PartDeclaration,
  PhraseBlock,
} from '../types/ast.js';

export class Formatter {
  private indent: number = 0;
  private output: string[] = [];

  private getIndent(): string {
    return '  '.repeat(this.indent);
  }

  private formatExpression(expr: Expression): string {
    return this.formatExpr(expr);
  }

  format(score: Score): string {
    this.indent = 0;
    this.output = [];

    // Score header
    this.output.push(`score "${score.title}" {`);
    this.indent++;

    // Backend config
    if (score.backend) {
      this.output.push(`${this.getIndent()}backend ${score.backend.name} {`);
      this.indent++;
      for (const opt of score.backend.options) {
        this.output.push(`${this.getIndent()}${opt.key} ${this.formatExpression(opt.value)}`);
      }
      this.indent--;
      this.output.push(`${this.getIndent()}}`);
      this.output.push('');
    }

    // Global statements (tempo, time, key, imports, consts)
    for (const stmt of score.globals) {
      this.formatGlobalStatement(stmt);
    }

    if (score.globals.length > 0) {
      this.output.push('');
    }

    // Parts
    for (const part of score.parts) {
      this.formatPart(part);
      this.output.push('');
    }

    this.indent--;
    this.output.push('}');

    return this.output.join('\n') + '\n';
  }

  private formatGlobalStatement(stmt: GlobalStatement): void {
    switch (stmt.kind) {
      case 'TempoStatement':
        this.output.push(`${this.getIndent()}tempo ${this.formatExpression(stmt.bpm)}`);
        break;
      case 'TimeSignatureStatement':
        this.output.push(`${this.getIndent()}time ${this.formatExpression(stmt.numerator)}/${this.formatExpression(stmt.denominator)}`);
        break;
      case 'KeySignatureStatement':
        this.output.push(`${this.getIndent()}key ${this.formatExpression(stmt.root)} ${stmt.mode}`);
        break;
      case 'PpqStatement':
        this.output.push(`${this.getIndent()}ppq ${this.formatExpression(stmt.value)}`);
        break;
      case 'ImportStatement':
        if (stmt.namespace) {
          this.output.push(`${this.getIndent()}import * as ${stmt.namespace} from "${stmt.path}";`);
        } else {
          this.output.push(`${this.getIndent()}import { ${stmt.imports.join(', ')} } from "${stmt.path}";`);
        }
        break;
      case 'ConstDeclaration':
        this.output.push(`${this.getIndent()}const ${stmt.name} = ${this.formatExpression(stmt.value)};`);
        break;
      case 'ProcDeclaration':
        this.formatProcDecl(stmt);
        break;
    }
  }

  private formatPart(part: PartDeclaration): void {
    this.output.push(`${this.getIndent()}part ${part.name} {`);
    this.indent++;

    // MIDI options
    if (part.partKind === 'midi' && part.options.length > 0) {
      const opts = part.options.map(o => `${o.key}:${this.formatExpression(o.value)}`).join(' ');
      this.output.push(`${this.getIndent()}midi ${opts}`);
      this.output.push('');
    }

    for (const item of part.body) {
      if (item.kind === 'PhraseBlock') {
        this.formatPhraseBlock(item);
      } else if (item.kind === 'RestStatement') {
        this.output.push(`${this.getIndent()}rest ${this.formatExpression(item.duration)}`);
      } else if (item.kind === 'MidiBar') {
        const notes = item.items.map(n => {
          if (n.kind === 'MidiNote') {
            return `${this.formatExpression(n.pitch)} ${this.formatExpression(n.duration)}`;
          } else if (n.kind === 'MidiChord') {
            const pitches = n.pitches.map(p => this.formatExpression(p)).join(' ');
            return `[${pitches}] ${this.formatExpression(n.duration)}`;
          } else if (n.kind === 'MidiDrum') {
            return `${n.name} ${this.formatExpression(n.duration)}`;
          }
          return '';
        }).join('  ');
        this.output.push(`${this.getIndent()}| ${notes} |`);
      } else if (item.kind === 'AutomationStatement') {
        const points = item.points.map(p =>
          `${this.formatExpression(p.time)} ${this.formatExpression(p.value)}`
        ).join(', ');
        this.output.push(`${this.getIndent()}${item.paramType} ${points}`);
      } else {
        this.formatStatement(item as Statement);
      }
    }

    this.indent--;
    this.output.push(`${this.getIndent()}}`);
  }

  private formatPhraseBlock(phrase: PhraseBlock): void {
    this.output.push(`${this.getIndent()}phrase {`);
    this.indent++;

    // Notes section
    if (phrase.notesSection) {
      this.output.push(`${this.getIndent()}notes:`);
      this.indent++;
      for (const bar of phrase.notesSection.bars) {
        const notes = bar.notes.map(n => {
          let s = `${this.formatExpression(n.pitch)} ${this.formatExpression(n.duration)}`;
          // Voice parameters
          if (n.voiceParams && n.voiceParams.params.length > 0) {
            const params = n.voiceParams.params.map(p =>
              `${p.type}:${this.formatExpression(p.value)}`
            ).join(' ');
            s += ` [${params}]`;
          }
          if (n.tieStart) s += '~';
          return s;
        }).join('  ');
        this.output.push(`${this.getIndent()}| ${notes} |`);
      }
      this.output.push(`${this.getIndent()};`);
      this.indent--;
      this.output.push('');
    }

    // Lyrics section
    if (phrase.lyricsSection) {
      const tokens = phrase.lyricsSection.tokens.map(t => t.value).join(' ');
      this.output.push(`${this.getIndent()}lyrics ${phrase.lyricsSection.mode}:`);
      this.indent++;
      this.output.push(`${this.getIndent()}${tokens};`);
      this.indent--;
    }

    this.indent--;
    this.output.push(`${this.getIndent()}}`);
  }

  private formatProcDecl(proc: { name: string; params: Parameter[]; body: Statement[] }): void {
    const params = proc.params.map(p => {
      if (p.rest) return `...${p.name}`;
      if (p.defaultValue) return `${p.name} = ${this.formatExpression(p.defaultValue)}`;
      return p.name;
    }).join(', ');

    this.output.push(`${this.getIndent()}proc ${proc.name}(${params}) {`);
    this.indent++;
    for (const stmt of proc.body) {
      this.formatStatement(stmt);
    }
    this.indent--;
    this.output.push(`${this.getIndent()}}`);
  }

  private formatStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'ImportStatement':
        if (stmt.namespace) {
          this.line(`import * as ${stmt.namespace} from "${stmt.path}";`);
        } else {
          this.line(`import { ${stmt.imports.join(', ')} } from "${stmt.path}";`);
        }
        break;

      case 'ExportStatement':
        this.formatExport(stmt.declaration);
        break;

      case 'ProcDeclaration':
        this.formatProc(stmt.name, stmt.params, stmt.body, stmt.exported);
        break;

      case 'ConstDeclaration':
        const constPrefix = stmt.exported ? 'export ' : '';
        this.line(`${constPrefix}const ${stmt.name} = ${this.formatExpr(stmt.value)};`);
        break;

      case 'LetDeclaration':
        this.line(`let ${stmt.name} = ${this.formatExpr(stmt.value)};`);
        break;

      case 'AssignmentStatement':
        this.line(`${stmt.name} = ${this.formatExpr(stmt.value)};`);
        break;

      case 'IfStatement':
        this.line(`if (${this.formatExpr(stmt.condition)}) {`);
        this.indent++;
        for (const s of stmt.consequent) {
          this.formatStatement(s);
        }
        this.indent--;
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            // else: alternate is Statement[]
            this.line('} else {');
            this.indent++;
            for (const s of stmt.alternate) {
              this.formatStatement(s);
            }
            this.indent--;
            this.line('}');
          } else {
            // else if: alternate is a single IfStatement
            // Format as "} else if (...) {"
            const indentStr = '  '.repeat(this.indent);
            this.output.push(`${indentStr}} else if (${this.formatExpr(stmt.alternate.condition)}) {`);
            this.indent++;
            for (const s of stmt.alternate.consequent) {
              this.formatStatement(s);
            }
            this.indent--;
            // Handle the else if's alternate recursively
            if (stmt.alternate.alternate) {
              if (Array.isArray(stmt.alternate.alternate)) {
                this.line('} else {');
                this.indent++;
                for (const s of stmt.alternate.alternate) {
                  this.formatStatement(s);
                }
                this.indent--;
                this.line('}');
              } else {
                // More else if chains - use recursion via a helper
                this.formatElseIf(stmt.alternate.alternate);
              }
            } else {
              this.line('}');
            }
          }
        } else {
          this.line('}');
        }
        break;

      case 'ForStatement':
        const rangeOp = stmt.range.inclusive ? '..=' : '..';
        this.line(
          `for (${stmt.variable} in ${this.formatExpr(stmt.range.start)}${rangeOp}${this.formatExpr(stmt.range.end)}) {`
        );
        this.indent++;
        for (const s of stmt.body) {
          this.formatStatement(s);
        }
        this.indent--;
        this.line('}');
        break;

      case 'WhileStatement':
        this.line(`while (${this.formatExpr(stmt.condition)}) {`);
        this.indent++;
        for (const s of stmt.body) {
          this.formatStatement(s);
        }
        this.indent--;
        this.line('}');
        break;

      case 'ForEachStatement':
        this.line(`for (${stmt.variable} in ${this.formatExpr(stmt.iterable)}) {`);
        this.indent++;
        for (const s of stmt.body) {
          this.formatStatement(s);
        }
        this.indent--;
        this.line('}');
        break;

      case 'ReturnStatement':
        if (stmt.value) {
          this.line(`return ${this.formatExpr(stmt.value)};`);
        } else {
          this.line('return;');
        }
        break;

      case 'BreakStatement':
        this.line('break;');
        break;

      case 'ContinueStatement':
        this.line('continue;');
        break;

      case 'IndexAssignmentStatement':
        this.line(`${this.formatExpr(stmt.object)}[${this.formatExpr(stmt.index)}] = ${this.formatExpr(stmt.value)};`);
        break;

      case 'ExpressionStatement':
        this.line(`${this.formatExpr(stmt.expression)};`);
        break;
    }
  }

  private formatExport(decl: Statement & { kind: 'ProcDeclaration' | 'ConstDeclaration' }): void {
    if (decl.kind === 'ProcDeclaration') {
      this.formatProc(decl.name, decl.params, decl.body, true);
    } else {
      this.line(`export const ${decl.name} = ${this.formatExpr(decl.value)};`);
    }
  }

  private formatProc(name: string, params: Parameter[], body: Statement[], exported: boolean): void {
    const prefix = exported ? 'export ' : '';
    const paramStr = params.map(p => (p.rest ? '...' : '') + p.name).join(', ');
    this.line(`${prefix}proc ${name}(${paramStr}) {`);
    this.indent++;
    for (const stmt of body) {
      this.formatStatement(stmt);
    }
    this.indent--;
    this.line('}');
  }

  private formatExpr(expr: Expression): string {
    switch (expr.kind) {
      case 'IntLiteral':
        return expr.value.toString();

      case 'FloatLiteral':
        return expr.value.toString();

      case 'StringLiteral':
        return `"${this.escapeString(expr.value)}"`;

      case 'BoolLiteral':
        return expr.value ? 'true' : 'false';

      case 'NullLiteral':
        return 'null';

      case 'PitchLiteral':
        return `${expr.note}${expr.octave}`;

      case 'DurLiteral':
        // Tick-based duration
        if (expr.ticks !== undefined) {
          return `${expr.ticks}t`;
        }
        // Fraction/note-based duration
        return `${expr.numerator}/${expr.denominator}${'.'.repeat(expr.dots ?? 0)}`;

      case 'TimeLiteral':
        if (expr.sub === 0) {
          return `${expr.bar}:${expr.beat}`;
        }
        return `${expr.bar}:${expr.beat}:${expr.sub}`;

      case 'Identifier':
        return expr.name;

      case 'BinaryExpression':
        return `${this.formatExpr(expr.left)} ${expr.operator} ${this.formatExpr(expr.right)}`;

      case 'UnaryExpression':
        return `${expr.operator}${this.formatExpr(expr.operand)}`;

      case 'CallExpression':
        const calleeStr = this.formatExpr(expr.callee);
        const argsStr = expr.arguments.map((a) => {
          if (a.kind === 'SpreadElement') {
            return '...' + this.formatExpr(a.argument);
          }
          return this.formatExpr(a);
        }).join(', ');
        return `${calleeStr}(${argsStr})`;

      case 'IndexExpression':
        return `${this.formatExpr(expr.object)}[${this.formatExpr(expr.index)}]`;

      case 'MemberExpression':
        return `${this.formatExpr(expr.object)}.${expr.property}`;

      case 'ArrayLiteral':
        const elemStr = expr.elements.map((e) => {
          if (e.kind === 'SpreadElement') {
            return '...' + this.formatExpr(e.argument);
          }
          return this.formatExpr(e);
        }).join(', ');
        return `[${elemStr}]`;

      case 'ObjectLiteral':
        const props = expr.properties.map((p) => {
          if (p.kind === 'spread') {
            return '...' + this.formatExpr(p.argument);
          }
          if (p.shorthand) {
            return p.key;
          }
          return `${p.key}: ${this.formatExpr(p.value)}`;
        });
        return `{ ${props.join(', ')} }`;

      case 'ArrowFunction':
        const paramStr = expr.params.map(p => (p.rest ? '...' : '') + p.name).join(', ');
        if (Array.isArray(expr.body)) {
          return `(${paramStr}) => { ... }`;
        }
        return `(${paramStr}) => ${this.formatExpr(expr.body)}`;

      case 'SpreadElement':
        return `...${this.formatExpr(expr.argument)}`;

      case 'RangeExpression':
        const op = expr.inclusive ? '..=' : '..';
        return `${this.formatExpr(expr.start)}${op}${this.formatExpr(expr.end)}`;

      default:
        return `<unknown: ${(expr as Expression).kind}>`;
    }
  }

  private escapeString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  }

  private line(text: string): void {
    const indentStr = '  '.repeat(this.indent);
    this.output.push(indentStr + text);
  }

  private formatElseIf(stmt: import('../types/ast.js').IfStatement): void {
    const indentStr = '  '.repeat(this.indent);
    this.output.push(`${indentStr}} else if (${this.formatExpr(stmt.condition)}) {`);
    this.indent++;
    for (const s of stmt.consequent) {
      this.formatStatement(s);
    }
    this.indent--;
    if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        this.line('} else {');
        this.indent++;
        for (const s of stmt.alternate) {
          this.formatStatement(s);
        }
        this.indent--;
        this.line('}');
      } else {
        // More else if chains
        this.formatElseIf(stmt.alternate);
      }
    } else {
      this.line('}');
    }
  }
}
