// Parser for MFS language

import { Token, TokenType } from '../types/token.js';
import {
  Program,
  Statement,
  Expression,
  ImportStatement,
  ExportStatement,
  ProcDeclaration,
  ConstDeclaration,
  LetDeclaration,
  AssignmentStatement,
  IndexAssignmentStatement,
  PropertyAssignmentStatement,
  IfStatement,
  ForStatement,
  ForEachStatement,
  WhileStatement,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  ExpressionStatement,
  TrackBlock,
  IntLiteral,
  FloatLiteral,
  StringLiteral,
  BoolLiteral,
  PitchLiteral,
  DurLiteral,
  TimeLiteral,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  IndexExpression,
  MemberExpression,
  ArrayLiteral,
  ObjectLiteral,
  ObjectProperty,
  ArrowFunction,
  SpreadElement,
  RangeExpression,
  Parameter,
} from '../types/ast.js';
import { MFError } from '../errors.js';

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

    if (this.check(TokenType.WHILE)) {
      return this.parseWhile();
    }

    if (this.check(TokenType.RETURN)) {
      return this.parseReturn();
    }

    if (this.check(TokenType.BREAK)) {
      return this.parseBreak();
    }

    if (this.check(TokenType.CONTINUE)) {
      return this.parseContinue();
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
    const params: Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        // Check for rest parameter
        if (this.check(TokenType.SPREAD)) {
          this.advance(); // consume '...'
          const param = this.expect(TokenType.IDENT, 'Expected rest parameter name');
          params.push({ name: param.value, rest: true });
          break; // Rest must be last
        }
        const param = this.expect(TokenType.IDENT, 'Expected parameter name');
        params.push({ name: param.value });
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

  private parseLet(): LetDeclaration {
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

  private parseFor(): ForStatement | ForEachStatement {
    const pos = this.advance().position; // consume 'for'
    this.expect(TokenType.LPAREN, "Expected '(' after 'for'");
    const variable = this.expect(TokenType.IDENT, 'Expected loop variable').value;
    this.expect(TokenType.IN, "Expected 'in' after loop variable");

    const firstExpr = this.parseAdditive();

    // Check if this is a range (has ..) or array iteration
    if (this.check(TokenType.DOTDOT) || this.check(TokenType.DOTDOTEQ)) {
      // Range iteration: for (i in 0..10) or for (i in 0..=10)
      let inclusive = false;
      if (this.match(TokenType.DOTDOTEQ)) {
        inclusive = true;
      } else {
        this.advance(); // consume '..'
      }

      const rangeEnd = this.parseAdditive();

      const range: RangeExpression = {
        kind: 'RangeExpression',
        start: firstExpr,
        end: rangeEnd,
        inclusive,
        position: firstExpr.position,
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
    } else {
      // Array iteration: for (x in array)
      this.expect(TokenType.RPAREN, "Expected ')' after iterable");
      this.expect(TokenType.LBRACE, "Expected '{' before for body");

      const body = this.parseBlock();

      return {
        kind: 'ForEachStatement',
        variable,
        iterable: firstExpr,
        body,
        position: pos,
      };
    }
  }

  private parseWhile(): WhileStatement {
    const pos = this.advance().position; // consume 'while'
    this.expect(TokenType.LPAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    this.expect(TokenType.LBRACE, "Expected '{' before while body");

    const body = this.parseBlock();

    return {
      kind: 'WhileStatement',
      condition,
      body,
      position: pos,
    };
  }

  private parseReturn(): ReturnStatement {
    const pos = this.advance().position; // consume 'return'

    let value: Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.parseExpression();
    }

    this.expect(TokenType.SEMICOLON, "Expected ';' after return");

    return {
      kind: 'ReturnStatement',
      value,
      position: pos,
    };
  }

  private parseBreak(): BreakStatement {
    const pos = this.advance().position; // consume 'break'
    this.expect(TokenType.SEMICOLON, "Expected ';' after break");
    return { kind: 'BreakStatement', position: pos };
  }

  private parseContinue(): ContinueStatement {
    const pos = this.advance().position; // consume 'continue'
    this.expect(TokenType.SEMICOLON, "Expected ';' after continue");
    return { kind: 'ContinueStatement', position: pos };
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

    // Parse the left-hand side expression first
    const expr = this.parseExpression();

    // Check for assignment operators
    if (this.check(TokenType.EQ)) {
      this.advance(); // consume '='
      const value = this.parseExpression();
      this.expect(TokenType.SEMICOLON, "Expected ';' after assignment");

      // Simple variable assignment
      if (expr.kind === 'Identifier') {
        return {
          kind: 'AssignmentStatement',
          name: expr.name,
          value,
          position: pos,
        };
      }

      // Index assignment: arr[i] = value
      if (expr.kind === 'IndexExpression') {
        return {
          kind: 'IndexAssignmentStatement',
          object: expr.object,
          index: expr.index,
          value,
          position: pos,
        };
      }

      // Property assignment: obj.prop = value
      if (expr.kind === 'MemberExpression') {
        return {
          kind: 'PropertyAssignmentStatement',
          object: expr.object,
          property: expr.property,
          value,
          position: pos,
        } as PropertyAssignmentStatement;
      }

      throw this.error('Invalid assignment target');
    }

    // Compound assignment: +=, -=, *=, /=
    if (this.checkCompoundAssign()) {
      const op = this.advance().value; // e.g., '+='
      const binaryOp = op.charAt(0); // e.g., '+'
      const rhs = this.parseExpression();
      this.expect(TokenType.SEMICOLON, "Expected ';' after assignment");

      // Desugar: x += y  ->  x = x + y
      if (expr.kind === 'Identifier') {
        const binaryExpr: BinaryExpression = {
          kind: 'BinaryExpression',
          operator: binaryOp,
          left: expr,
          right: rhs,
          position: pos,
        };
        return {
          kind: 'AssignmentStatement',
          name: expr.name,
          value: binaryExpr,
          position: pos,
        };
      }

      // arr[i] += y  ->  arr[i] = arr[i] + y
      if (expr.kind === 'IndexExpression') {
        const binaryExpr: BinaryExpression = {
          kind: 'BinaryExpression',
          operator: binaryOp,
          left: expr,
          right: rhs,
          position: pos,
        };
        return {
          kind: 'IndexAssignmentStatement',
          object: expr.object,
          index: expr.index,
          value: binaryExpr,
          position: pos,
        };
      }

      throw this.error('Invalid compound assignment target');
    }

    // Expression statement
    this.expect(TokenType.SEMICOLON, "Expected ';' after expression");

    return {
      kind: 'ExpressionStatement',
      expression: expr,
      position: pos,
    };
  }

  private checkCompoundAssign(): boolean {
    return this.check(TokenType.PLUSEQ) || this.check(TokenType.MINUSEQ) ||
           this.check(TokenType.STAREQ) || this.check(TokenType.SLASHEQ);
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

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.PERCENT)) {
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
    let expr = this.parsePrimary();

    while (true) {
      if (this.check(TokenType.LPAREN)) {
        // Function call: expr(args) - supports first-class functions
        expr = this.finishCall(expr);
      } else if (this.check(TokenType.LBRACKET)) {
        // Index access: expr[index]
        const pos = this.advance().position; // consume '['
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, "Expected ']' after index");
        expr = {
          kind: 'IndexExpression',
          object: expr,
          index,
          position: pos,
        } as IndexExpression;
      } else if (this.check(TokenType.DOT)) {
        // Member access: expr.property
        const pos = this.advance().position; // consume '.'
        const prop = this.expect(TokenType.IDENT, 'Expected property name after "."');
        expr = {
          kind: 'MemberExpression',
          object: expr,
          property: prop.value,
          position: pos,
        } as MemberExpression;
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expression): CallExpression {
    const pos = this.advance().position; // consume '('
    const args: (Expression | SpreadElement)[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        // Check for spread argument
        if (this.check(TokenType.SPREAD)) {
          const spreadPos = this.advance().position; // consume '...'
          args.push({
            kind: 'SpreadElement',
            argument: this.parseExpression(),
            position: spreadPos,
          } as SpreadElement);
        } else {
          args.push(this.parseExpression());
        }
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, "Expected ')' after arguments");

    return {
      kind: 'CallExpression',
      callee,
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

    // Parenthesized expression or arrow function
    if (this.check(TokenType.LPAREN)) {
      return this.parseParenOrArrow();
    }

    throw this.error(`Unexpected token: ${token.value}`);
  }

  // Parse either a parenthesized expression or an arrow function
  private parseParenOrArrow(): Expression {
    const startPos = this.peek().position;
    this.advance(); // consume '('

    // Empty params: () => ...
    if (this.check(TokenType.RPAREN)) {
      this.advance(); // consume ')'
      if (this.check(TokenType.ARROW)) {
        return this.finishArrowFunction([], startPos);
      }
      throw this.error('Empty parentheses are not allowed except for arrow functions');
    }

    // Try to parse as parameters for arrow function
    // We need to look ahead to determine if this is arrow function or just parens
    const savedPos = this.current;

    // Check if we can parse as parameters (all identifiers/rest, no complex expressions)
    const params: Parameter[] = [];
    let isArrow = true;

    try {
      do {
        if (this.check(TokenType.SPREAD)) {
          this.advance();
          const name = this.expect(TokenType.IDENT, 'Expected parameter name');
          params.push({ name: name.value, rest: true });
          break;
        }
        if (!this.check(TokenType.IDENT)) {
          isArrow = false;
          break;
        }
        const name = this.advance().value;
        params.push({ name });
      } while (this.match(TokenType.COMMA));

      if (isArrow && this.check(TokenType.RPAREN)) {
        this.advance(); // consume ')'
        if (this.check(TokenType.ARROW)) {
          return this.finishArrowFunction(params, startPos);
        }
      }
    } catch {
      // Not a valid arrow function parameter list
    }

    // Backtrack and parse as parenthesized expression
    this.current = savedPos;
    const expr = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after expression");

    // Check for arrow after single-param parens: (x) => ...
    if (this.check(TokenType.ARROW) && expr.kind === 'Identifier') {
      return this.finishArrowFunction([{ name: expr.name }], startPos);
    }

    return expr;
  }

  private finishArrowFunction(params: Parameter[], startPos: { line: number; column: number; offset: number }): ArrowFunction {
    this.advance(); // consume '=>'

    let body: Expression | Statement[];
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume '{'
      body = this.parseBlock();
    } else {
      body = this.parseExpression();
    }

    return {
      kind: 'ArrowFunction',
      params,
      body,
      position: startPos,
    };
  }

  private parsePitchLiteral(token: Token): PitchLiteral {
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

  private parseDurLiteral(token: Token): DurLiteral {
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

  private parseTimeLiteral(token: Token): TimeLiteral {
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

  private parseArrayLiteral(): ArrayLiteral {
    const pos = this.advance().position; // consume '['
    const elements: (Expression | SpreadElement)[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.check(TokenType.SPREAD)) {
          const spreadPos = this.advance().position; // consume '...'
          elements.push({
            kind: 'SpreadElement',
            argument: this.parseExpression(),
            position: spreadPos,
          } as SpreadElement);
        } else {
          elements.push(this.parseExpression());
        }
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
    const properties: ObjectProperty[] = [];

    if (!this.check(TokenType.RBRACE)) {
      do {
        // Spread property: { ...obj }
        if (this.check(TokenType.SPREAD)) {
          this.advance(); // consume '...'
          const argument = this.parseExpression();
          properties.push({ kind: 'spread', argument });
        } else {
          const keyToken = this.expect(TokenType.IDENT, 'Expected property name');
          const key = keyToken.value;

          // Shorthand property: { x } means { x: x }
          if (this.check(TokenType.COMMA) || this.check(TokenType.RBRACE)) {
            properties.push({
              kind: 'property',
              key,
              value: { kind: 'Identifier', name: key, position: keyToken.position } as Identifier,
              shorthand: true,
            });
          } else {
            // Full property: { key: value }
            this.expect(TokenType.COLON, "Expected ':' after property name");
            const value = this.parseExpression();
            properties.push({ kind: 'property', key, value, shorthand: false });
          }
        }
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
