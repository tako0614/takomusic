// Parser for TakoMusic language

import { Token, TokenType } from './types/token';
import {
  Program,
  Statement,
  Expression,
  ImportStatement,
  ExportStatement,
  ProcDeclaration,
  ConstDeclaration,
  LetDeclaration,
  IfStatement,
  ForStatement,
  ExpressionStatement,
  TrackBlock,
  Identifier,
  ObjectLiteral,
  RangeExpression,
} from './types/ast';
import { MFError } from './errors';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private filePath?: string;

  constructor(tokens: Token[], filePath?: string) {
    this.tokens = tokens;
    this.filePath = filePath;
  }

  parse(): Program {
    const statements: Statement[] = [];
    const pos = this.peek().position;

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return { kind: 'Program', statements, position: pos };
  }

  private parseStatement(): Statement | null {
    if (this.check(TokenType.IMPORT)) {
      return this.parseImport();
    }

    if (this.check(TokenType.EXPORT)) {
      return this.parseExport();
    }

    if (this.check(TokenType.PROC)) {
      return this.parseProc(false);
    }

    if (this.check(TokenType.CONST)) {
      return this.parseConst(false);
    }

    if (this.check(TokenType.LET)) {
      return this.parseLet();
    }

    if (this.check(TokenType.IF)) {
      return this.parseIf();
    }

    if (this.check(TokenType.FOR)) {
      return this.parseFor();
    }

    // track block: track(kind, id, opts?) { ... }
    if (this.checkIdent('track')) {
      return this.parseTrackBlock();
    }

    // Assignment or expression statement
    return this.parseAssignmentOrExpression();
  }

  private parseImport(): ImportStatement {
    const pos = this.advance().position; // consume 'import'

    this.expect(TokenType.LBRACE, "Expected '{' after 'import'");
    const imports: string[] = [];

    if (!this.check(TokenType.RBRACE)) {
      do {
        const ident = this.expect(TokenType.IDENT, 'Expected identifier in import list');
        imports.push(ident.value);
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RBRACE, "Expected '}' after import list");
    this.expect(TokenType.IDENT, "Expected 'from'"); // 'from' keyword
    const pathToken = this.expect(TokenType.STRING, 'Expected module path');
    this.expect(TokenType.SEMICOLON, "Expected ';' after import");

    return {
      kind: 'ImportStatement',
      imports,
      path: pathToken.value,
      position: pos,
    };
  }

  private parseExport(): ExportStatement {
    const pos = this.advance().position; // consume 'export'

    let declaration: ProcDeclaration | ConstDeclaration;

    if (this.check(TokenType.PROC)) {
      declaration = this.parseProc(true);
    } else if (this.check(TokenType.CONST)) {
      declaration = this.parseConst(true);
    } else {
      throw this.error("Expected 'proc' or 'const' after 'export'");
    }

    return {
      kind: 'ExportStatement',
      declaration,
      position: pos,
    };
  }

  private parseProc(exported: boolean): ProcDeclaration {
    const pos = this.advance().position; // consume 'proc'
    const name = this.expect(TokenType.IDENT, 'Expected proc name').value;

    this.expect(TokenType.LPAREN, "Expected '(' after proc name");
    const params: string[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const param = this.expect(TokenType.IDENT, 'Expected parameter name');
        params.push(param.value);
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, "Expected ')' after parameters");
    this.expect(TokenType.LBRACE, "Expected '{' before proc body");

    const body = this.parseBlock();

    return {
      kind: 'ProcDeclaration',
      name,
      params,
      body,
      exported,
      position: pos,
    };
  }

  private parseConst(exported: boolean): ConstDeclaration {
    const pos = this.advance().position; // consume 'const'
    const name = this.expect(TokenType.IDENT, 'Expected constant name').value;
    this.expect(TokenType.EQ, "Expected '=' after constant name");
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON, "Expected ';' after constant value");

    return {
      kind: 'ConstDeclaration',
      name,
      value,
      exported,
      position: pos,
    };
  }

  private parseLet(): Statement {
    const pos = this.advance().position; // consume 'let'
    const name = this.expect(TokenType.IDENT, 'Expected variable name').value;
    this.expect(TokenType.EQ, "Expected '=' after variable name");
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON, "Expected ';' after variable value");

    return {
      kind: 'LetDeclaration',
      name,
      value,
      position: pos,
    };
  }

  private parseIf(): IfStatement {
    const pos = this.advance().position; // consume 'if'
    this.expect(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    this.expect(TokenType.LBRACE, "Expected '{' before if body");

    const consequent = this.parseBlock();
    let alternate: Statement[] | null = null;

    if (this.match(TokenType.ELSE)) {
      this.expect(TokenType.LBRACE, "Expected '{' after 'else'");
      alternate = this.parseBlock();
    }

    return {
      kind: 'IfStatement',
      condition,
      consequent,
      alternate,
      position: pos,
    };
  }

  private parseFor(): ForStatement {
    const pos = this.advance().position; // consume 'for'
    this.expect(TokenType.LPAREN, "Expected '(' after 'for'");
    const variable = this.expect(TokenType.IDENT, 'Expected loop variable').value;
    this.expect(TokenType.IN, "Expected 'in' after loop variable");

    const rangeStart = this.parseAdditive();

    let inclusive = false;
    if (this.match(TokenType.DOTDOTEQ)) {
      inclusive = true;
    } else {
      this.expect(TokenType.DOTDOT, "Expected '..' or '..=' in range");
    }

    const rangeEnd = this.parseAdditive();

    const range: RangeExpression = {
      kind: 'RangeExpression',
      start: rangeStart,
      end: rangeEnd,
      inclusive,
      position: rangeStart.position,
    };

    this.expect(TokenType.RPAREN, "Expected ')' after range");
    this.expect(TokenType.LBRACE, "Expected '{' before for body");

    const body = this.parseBlock();

    return {
      kind: 'ForStatement',
      variable,
      range,
      body,
      position: pos,
    };
  }

  private parseTrackBlock(): TrackBlock {
    const pos = this.advance().position; // consume 'track'
    this.expect(TokenType.LPAREN, "Expected '(' after 'track'");

    // Parse track kind (vocal or midi)
    const kindToken = this.advance();
    if (kindToken.type !== TokenType.VOCAL && kindToken.type !== TokenType.MIDI) {
      throw this.error("Expected 'vocal' or 'midi' as track kind");
    }
    const trackKind = kindToken.value as 'vocal' | 'midi';

    this.expect(TokenType.COMMA, "Expected ',' after track kind");

    const id = this.expect(TokenType.IDENT, 'Expected track id').value;

    let options: ObjectLiteral | null = null;
    if (this.match(TokenType.COMMA)) {
      options = this.parseObjectLiteral();
    }

    this.expect(TokenType.RPAREN, "Expected ')' after track arguments");
    this.expect(TokenType.LBRACE, "Expected '{' before track body");

    const body = this.parseBlock();

    return {
      kind: 'TrackBlock',
      trackKind,
      id,
      options,
      body,
      position: pos,
    };
  }

  private parseBlock(): Statement[] {
    const statements: Statement[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}' after block");
    return statements;
  }

  private parseAssignmentOrExpression(): Statement {
    const pos = this.peek().position;

    // Check for assignment: ident = expr;
    if (this.check(TokenType.IDENT) && this.checkAhead(1, TokenType.EQ)) {
      const name = this.advance().value;
      this.advance(); // consume '='
      const value = this.parseExpression();
      this.expect(TokenType.SEMICOLON, "Expected ';' after assignment");

      return {
        kind: 'AssignmentStatement',
        name,
        value,
        position: pos,
      };
    }

    // Expression statement
    const expr = this.parseExpression();
    this.expect(TokenType.SEMICOLON, "Expected ';' after expression");

    return {
      kind: 'ExpressionStatement',
      expression: expr,
      position: pos,
    };
  }

  // Expression parsing with precedence climbing
  private parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = {
        kind: 'BinaryExpression',
        operator: '||',
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const right = this.parseEquality();
      left = {
        kind: 'BinaryExpression',
        operator: '&&',
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseEquality(): Expression {
    let left = this.parseComparison();

    while (this.check(TokenType.EQEQ) || this.check(TokenType.NEQ)) {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = {
        kind: 'BinaryExpression',
        operator: op,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();

    while (
      this.check(TokenType.LT) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.LTEQ) ||
      this.check(TokenType.GTEQ)
    ) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = {
        kind: 'BinaryExpression',
        operator: op,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        kind: 'BinaryExpression',
        operator: op,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.check(TokenType.STAR)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = {
        kind: 'BinaryExpression',
        operator: op,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.NOT) || this.check(TokenType.MINUS)) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return {
        kind: 'UnaryExpression',
        operator: op,
        operand,
        position: operand.position,
      };
    }

    return this.parseCall();
  }

  private parseCall(): Expression {
    const expr = this.parsePrimary();

    if (expr.kind === 'Identifier' && this.check(TokenType.LPAREN)) {
      return this.finishCall(expr as Identifier);
    }

    return expr;
  }

  private finishCall(callee: Identifier): Expression {
    const pos = this.advance().position; // consume '('
    const args: Expression[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, "Expected ')' after arguments");

    return {
      kind: 'CallExpression',
      callee: callee.name,
      arguments: args,
      position: callee.position,
    };
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    // Int literal
    if (this.check(TokenType.INT)) {
      this.advance();
      return {
        kind: 'IntLiteral',
        value: parseInt(token.value, 10),
        position: token.position,
      };
    }

    // Float literal
    if (this.check(TokenType.FLOAT)) {
      this.advance();
      return {
        kind: 'FloatLiteral',
        value: parseFloat(token.value),
        position: token.position,
      };
    }

    // String literal
    if (this.check(TokenType.STRING)) {
      this.advance();
      return {
        kind: 'StringLiteral',
        value: token.value,
        position: token.position,
      };
    }

    // Bool literal
    if (this.check(TokenType.TRUE)) {
      this.advance();
      return {
        kind: 'BoolLiteral',
        value: true,
        position: token.position,
      };
    }

    if (this.check(TokenType.FALSE)) {
      this.advance();
      return {
        kind: 'BoolLiteral',
        value: false,
        position: token.position,
      };
    }

    // Pitch literal
    if (this.check(TokenType.PITCH)) {
      this.advance();
      return this.parsePitchLiteral(token);
    }

    // Dur literal
    if (this.check(TokenType.DUR)) {
      this.advance();
      return this.parseDurLiteral(token);
    }

    // Time literal
    if (this.check(TokenType.TIME)) {
      this.advance();
      return this.parseTimeLiteral(token);
    }

    // Array literal
    if (this.check(TokenType.LBRACKET)) {
      return this.parseArrayLiteral();
    }

    // Object literal
    if (this.check(TokenType.LBRACE)) {
      return this.parseObjectLiteral();
    }

    // Identifier
    if (this.check(TokenType.IDENT)) {
      this.advance();
      return {
        kind: 'Identifier',
        name: token.value,
        position: token.position,
      };
    }

    // Parenthesized expression
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw this.error(`Unexpected token: ${token.value}`);
  }

  private parsePitchLiteral(token: Token): Expression {
    // Parse pitch like C4, C#4, Db4
    const value = token.value;
    let idx = 0;

    const noteChar = value[idx++].toUpperCase();
    let accidental = '';
    if (value[idx] === '#' || value[idx] === 'b') {
      accidental = value[idx++];
    }

    const octaveStr = value.slice(idx);
    const octave = parseInt(octaveStr, 10);

    const note = noteChar + accidental;
    const midi = this.noteToMidi(note, octave);

    return {
      kind: 'PitchLiteral',
      note,
      octave,
      midi,
      position: token.position,
    };
  }

  private noteToMidi(note: string, octave: number): number {
    const noteOffsets: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'Fb': 4, 'E#': 5,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11, 'Cb': 11, 'B#': 0,
    };

    const offset = noteOffsets[note] ?? 0;
    // MIDI: C4 = 60, so C0 = 12
    return (octave + 1) * 12 + offset;
  }

  private parseDurLiteral(token: Token): Expression {
    // Parse duration like 1/4, 3/8
    const [numStr, denStr] = token.value.split('/');
    const numerator = parseInt(numStr, 10);
    const denominator = parseInt(denStr, 10);

    return {
      kind: 'DurLiteral',
      numerator,
      denominator,
      position: token.position,
    };
  }

  private parseTimeLiteral(token: Token): Expression {
    // Parse time like 1:1 or 1:1:0
    const parts = token.value.split(':').map((p) => parseInt(p, 10));
    const bar = parts[0];
    const beat = parts[1];
    const sub = parts[2] ?? 0;

    return {
      kind: 'TimeLiteral',
      bar,
      beat,
      sub,
      position: token.position,
    };
  }

  private parseArrayLiteral(): Expression {
    const pos = this.advance().position; // consume '['
    const elements: Expression[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RBRACKET, "Expected ']' after array elements");

    return {
      kind: 'ArrayLiteral',
      elements,
      position: pos,
    };
  }

  private parseObjectLiteral(): ObjectLiteral {
    const pos = this.advance().position; // consume '{'
    const properties: { key: string; value: Expression }[] = [];

    if (!this.check(TokenType.RBRACE)) {
      do {
        const key = this.expect(TokenType.IDENT, 'Expected property name').value;
        this.expect(TokenType.COLON, "Expected ':' after property name");
        const value = this.parseExpression();
        properties.push({ key, value });
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RBRACE, "Expected '}' after object properties");

    return {
      kind: 'ObjectLiteral',
      properties,
      position: pos,
    };
  }

  // Helper methods
  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekAhead(offset: number): Token {
    const idx = this.current + offset;
    if (idx >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[idx];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkAhead(offset: number, type: TokenType): boolean {
    return this.peekAhead(offset).type === type;
  }

  private checkIdent(name: string): boolean {
    return this.check(TokenType.IDENT) && this.peek().value === name;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(message);
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private error(message: string): MFError {
    const token = this.peek();
    return new MFError('SYNTAX', message, token.position, this.filePath);
  }
}
