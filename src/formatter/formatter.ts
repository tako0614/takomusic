// Formatter for MFS source code

import type {
  Program,
  Statement,
  Expression,
  Parameter,
} from '../types/ast.js';

export class Formatter {
  private indent: number = 0;
  private output: string[] = [];

  format(program: Program): string {
    this.indent = 0;
    this.output = [];

    // Group statements
    const imports: Statement[] = [];
    const others: Statement[] = [];

    for (const stmt of program.statements) {
      if (stmt.kind === 'ImportStatement') {
        imports.push(stmt);
      } else {
        others.push(stmt);
      }
    }

    // Format imports first
    for (const stmt of imports) {
      this.formatStatement(stmt);
    }

    // Add blank line after imports if there are any
    if (imports.length > 0 && others.length > 0) {
      this.output.push('');
    }

    // Format other statements
    for (let i = 0; i < others.length; i++) {
      this.formatStatement(others[i]);
      // Add blank line between top-level declarations
      if (i < others.length - 1) {
        this.output.push('');
      }
    }

    return this.output.join('\n') + '\n';
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

      case 'TrackBlock':
        let trackArgs = `${stmt.trackKind}, ${stmt.id}`;
        if (stmt.options) {
          trackArgs += `, ${this.formatExpr(stmt.options)}`;
        }
        this.line(`track(${trackArgs}) {`);
        this.indent++;
        for (const s of stmt.body) {
          this.formatStatement(s);
        }
        this.indent--;
        this.line('}');
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
        return `${expr.numerator}/${expr.denominator}${'.'.repeat(expr.dots)}`;

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
