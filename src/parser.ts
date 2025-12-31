import {
  TokenType,
  type Token,
  type Position,
} from './token.js';
import type {
  Program,
  ImportDecl,
  ImportSpec,
  ImportAll,
  ImportNamed,
  FnDecl,
  ConstDecl,
  TypeAliasDecl,
  EnumDecl,
  EnumVariant,
  Param,
  TypeRef,
  Block,
  Statement,
  ReturnStmt,
  IfStmt,
  ForStmt,
  AssignmentStmt,
  ExprStmt,
  Expr,
  NumberLiteral,
  StringLiteral,
  TemplateLiteral,
  BoolLiteral,
  NullLiteral,
  PitchLiteral,
  DurLiteral,
  PosRefLiteral,
  Identifier,
  ArrayLiteral,
  ObjectLiteral,
  ObjectProperty,
  SpreadElement,
  TupleLiteral,
  TuplePattern,
  TuplePatternElement,
  MemberExpr,
  IndexExpr,
  CallExpr,
  CallArg,
  UnaryExpr,
  BinaryExpr,
  PipeExpr,
  MatchExpr,
  MatchArm,
  MatchPattern,
  RangePattern,
  ScoreExpr,
  ScoreItem,
  MetaBlock,
  MetaField,
  TempoBlock,
  TempoItem,
  MeterBlock,
  MeterItem,
  SoundDecl,
  SoundBodyItem,
  SoundField,
  DrumKeysBlock,
  VocalBlock,
  TrackDecl,
  ScoreMarker,
  TrackStmt,
  PlaceStmt,
  ClipExpr,
  ClipStmt,
  AtStmt,
  RestStmt,
  BreathStmt,
  NoteStmt,
  ChordStmt,
  HitStmt,
  CCStmt,
  AutomationStmt,
  MarkerStmt,
  ArpStmt,
  ArpDirection,
  NamedArg,
  TripletStmt,
} from './ast.js';

export class V4Parser {
  private tokens: Token[];
  private current = 0;
  private filePath?: string;

  constructor(tokens: Token[], filePath?: string) {
    this.tokens = tokens;
    this.filePath = filePath;
  }

  parseProgram(): Program {
    const imports: ImportDecl[] = [];
    const body: (FnDecl | ConstDecl | TypeAliasDecl | EnumDecl)[] = [];
    const start = this.peek().position;

    while (!this.isAtEnd()) {
      if (this.match(TokenType.IMPORT)) {
        const importPos = this.previous().position;
        imports.push(this.parseImport(importPos));
        continue;
      }
      body.push(this.parseTopDecl());
    }

    return {
      kind: 'Program',
      position: start,
      imports,
      body,
    };
  }

  private parseImport(start: Position): ImportDecl {
    const spec = this.parseImportSpec();
    this.expect(TokenType.FROM, "Expected 'from' after import spec");
    const from = this.parseStringLiteral();
    this.expect(TokenType.SEMI, "Expected ';' after import");
    return {
      kind: 'ImportDecl',
      position: start,
      spec,
      from,
    };
  }

  private parseImportSpec(): ImportSpec {
    const start = this.peek().position;
    if (this.match(TokenType.STAR)) {
      this.expect(TokenType.AS, "Expected 'as' in import * as");
      const alias = this.expect(TokenType.IDENT, 'Expected identifier').value as string;
      const spec: ImportAll = {
        kind: 'ImportAll',
        position: start,
        alias,
      };
      return spec;
    }

    this.expect(TokenType.LBRACE, "Expected '{' in import spec");
    const names: string[] = [];
    do {
      const name = this.expectIdentLike('Expected import name');
      names.push(name);
    } while (this.match(TokenType.COMMA));
    this.expect(TokenType.RBRACE, "Expected '}' after import spec");

    const spec: ImportNamed = {
      kind: 'ImportNamed',
      position: start,
      names,
    };
    return spec;
  }

  private parseTopDecl(): FnDecl | ConstDecl | TypeAliasDecl | EnumDecl {
    const exported = this.match(TokenType.EXPORT);
    if (this.match(TokenType.FN)) {
      return this.parseFnDecl(exported);
    }
    if (this.match(TokenType.CONST) || this.match(TokenType.LET)) {
      const mutable = this.previous().type === TokenType.LET;
      return this.parseConstDecl(exported, mutable);
    }
    if (this.match(TokenType.TYPE)) {
      if (exported) {
        throw this.error('Type aliases cannot be exported', this.previous().position);
      }
      return this.parseTypeAliasDecl();
    }
    if (this.match(TokenType.ENUM)) {
      return this.parseEnumDecl(exported);
    }
    throw this.error('Expected declaration', this.peek().position);
  }

  private parseTypeAliasDecl(): TypeAliasDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.IDENT, 'Expected type alias name').value as string;
    this.expect(TokenType.EQ, "Expected '=' after type alias name");
    const typeExpr = this.parseTypeRef();
    this.expect(TokenType.SEMI, "Expected ';' after type alias");
    return {
      kind: 'TypeAliasDecl',
      position: pos,
      name,
      typeExpr,
    };
  }

  private parseEnumDecl(exported: boolean): EnumDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.IDENT, 'Expected enum name').value as string;
    this.expect(TokenType.LBRACE, "Expected '{' after enum name");

    const variants: EnumVariant[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const variantPos = this.peek().position;
      const variantName = this.expect(TokenType.IDENT, 'Expected variant name').value as string;

      let payload: TypeRef | undefined;
      // Check for payload type: Variant(Type)
      if (this.match(TokenType.LPAREN)) {
        payload = this.parseTypeRef();
        this.expect(TokenType.RPAREN, "Expected ')' after variant payload type");
      }

      variants.push({
        kind: 'EnumVariant',
        position: variantPos,
        name: variantName,
        payload,
      });

      // Optional trailing comma
      if (!this.match(TokenType.COMMA)) {
        break;
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}' after enum variants");

    return {
      kind: 'EnumDecl',
      position: pos,
      name,
      variants,
      exported,
    };
  }

  private parseFnDecl(exported: boolean): FnDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.IDENT, 'Expected function name').value as string;

    // Parse optional type parameters: fn identity<T, U>(...)
    let typeParams: string[] | undefined;
    if (this.match(TokenType.LT)) {
      typeParams = this.parseTypeParams();
    }

    this.expect(TokenType.LPAREN, "Expected '('");
    const params: Param[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramPos = this.peek().position;
        const paramName = this.expect(TokenType.IDENT, 'Expected parameter').value as string;
        let type: TypeRef | undefined;
        if (this.match(TokenType.COLON)) {
          type = this.parseTypeRef();
        }
        params.push({ kind: 'Param', position: paramPos, name: paramName, type });
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, "Expected ')'");
    let returnType: TypeRef | undefined;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseTypeRef();
    }
    const body = this.parseBlock();
    return {
      kind: 'FnDecl',
      position: pos,
      name,
      typeParams,
      params,
      returnType,
      body,
      exported,
    };
  }

  private parseTypeParams(): string[] {
    const params: string[] = [];
    do {
      const paramName = this.expect(TokenType.IDENT, 'Expected type parameter name').value as string;
      params.push(paramName);
    } while (this.match(TokenType.COMMA));
    this.expect(TokenType.GT, "Expected '>' after type parameters");
    return params;
  }

  private parseConstDecl(exported: boolean, mutable: boolean): ConstDecl {
    const pos = this.previous().position;

    // Check for tuple destructuring pattern: const (a, b) = expr
    if (this.check(TokenType.LPAREN)) {
      const pattern = this.parseTuplePattern();
      this.expect(TokenType.EQ, "Expected '='");
      const value = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';'");
      return {
        kind: 'ConstDecl',
        position: pos,
        name: '',  // No single name for tuple destructuring
        pattern,
        value,
        mutable,
        exported,
      };
    }

    const name = this.expectIdentLike('Expected identifier');
    let type: TypeRef | undefined;
    if (this.match(TokenType.COLON)) {
      type = this.parseTypeRef();
    }
    this.expect(TokenType.EQ, "Expected '='");
    const value = this.parseExpression();
    this.expect(TokenType.SEMI, "Expected ';'");
    return {
      kind: 'ConstDecl',
      position: pos,
      name,
      value,
      mutable,
      type,
      exported,
    };
  }

  private parseTuplePattern(): TuplePattern {
    const pos = this.peek().position;
    this.expect(TokenType.LPAREN, "Expected '('");
    const elements: TuplePatternElement[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const elemPos = this.peek().position;
        let rest = false;

        // Check for rest pattern: ...rest
        if (this.match(TokenType.SPREAD)) {
          rest = true;
        }

        const name = this.expect(TokenType.IDENT, 'Expected identifier in tuple pattern').value as string;
        elements.push({
          kind: 'TuplePatternElement',
          position: elemPos,
          name,
          rest,
        });

        // Rest pattern must be last
        if (rest && !this.check(TokenType.RPAREN)) {
          throw this.error('Rest pattern must be last in tuple destructuring', elemPos);
        }
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, "Expected ')'");

    if (elements.length === 0) {
      throw this.error('Empty tuple pattern is not allowed', pos);
    }

    return {
      kind: 'TuplePattern',
      position: pos,
      elements,
    };
  }

  // Parse either a parenthesized expression (expr) or a tuple literal (expr, expr, ...)
  private parseParenOrTuple(): Expr {
    const pos = this.peek().position;
    this.expect(TokenType.LPAREN, "Expected '('");

    // Empty parens - error
    if (this.check(TokenType.RPAREN)) {
      throw this.error('Empty parentheses are not allowed', pos);
    }

    // Parse the first expression
    const first = this.parseExpression();

    // Check if this is a tuple (has comma) or just a grouped expression
    if (this.match(TokenType.COMMA)) {
      // This is a tuple literal
      const elements: Expr[] = [first];

      // Parse remaining elements
      if (!this.check(TokenType.RPAREN)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.COMMA) && !this.check(TokenType.RPAREN));
      }

      this.expect(TokenType.RPAREN, "Expected ')'");

      const tuple: TupleLiteral = {
        kind: 'TupleLiteral',
        position: pos,
        elements,
      };
      return tuple;
    }

    // Just a grouped expression
    this.expect(TokenType.RPAREN, "Expected ')'");
    return first;
  }

  private parseTypeRef(): TypeRef {
    const pos = this.peek().position;
    const name = this.expect(TokenType.IDENT, 'Expected type name').value as string;

    // Parse optional type arguments: TypeName<Arg1, Arg2>
    let typeArgs: TypeRef[] | undefined;
    if (this.match(TokenType.LT)) {
      typeArgs = this.parseTypeArgs();
    }

    return { kind: 'TypeRef', position: pos, name, typeArgs };
  }

  private parseTypeArgs(): TypeRef[] {
    const args: TypeRef[] = [];
    do {
      args.push(this.parseTypeRef());
    } while (this.match(TokenType.COMMA));
    this.expect(TokenType.GT, "Expected '>' after type arguments");
    return args;
  }

  private parseBlock(): Block {
    const pos = this.peek().position;
    this.expect(TokenType.LBRACE, "Expected '{'");
    const statements: Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'Block', position: pos, statements };
  }

  private parseStatement(): Statement {
    if (this.match(TokenType.CONST) || this.match(TokenType.LET)) {
      const mutable = this.previous().type === TokenType.LET;
      return this.parseConstDecl(false, mutable);
    }
    if (this.match(TokenType.RETURN)) {
      const pos = this.previous().position;
      if (this.check(TokenType.SEMI)) {
        this.advance();
        return { kind: 'ReturnStmt', position: pos };
      }
      const value = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';'");
      const stmt: ReturnStmt = { kind: 'ReturnStmt', position: pos, value };
      return stmt;
    }
    if (this.match(TokenType.IF)) {
      return this.parseIf();
    }
    if (this.match(TokenType.FOR)) {
      return this.parseFor();
    }

    const expr = this.parseExpression();
    if (this.match(TokenType.EQ)) {
      if (!this.isAssignable(expr)) {
        throw this.error('Invalid assignment target', expr.position);
      }
      const value = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';'");
      const stmt: AssignmentStmt = { kind: 'AssignmentStmt', position: expr.position, target: expr, value };
      return stmt;
    }

    this.expect(TokenType.SEMI, "Expected ';'");
    const stmt: ExprStmt = { kind: 'ExprStmt', position: expr.position, expr };
    return stmt;
  }

  private parseIf(): IfStmt {
    const pos = this.previous().position;
    this.expect(TokenType.LPAREN, "Expected '('");
    const test = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')'");
    const consequent = this.parseBlock();
    let alternate: Block | IfStmt | undefined;
    if (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        alternate = this.parseIf();
      } else {
        alternate = this.parseBlock();
      }
    }
    return { kind: 'IfStmt', position: pos, test, consequent, alternate };
  }

  private parseFor(): ForStmt {
    const pos = this.previous().position;
    this.expect(TokenType.LPAREN, "Expected '('");
    const iterator = this.expect(TokenType.IDENT, 'Expected identifier').value as string;
    this.expect(TokenType.IN, "Expected 'in'");
    const iterable = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')'");
    const body = this.parseBlock();
    return { kind: 'ForStmt', position: pos, iterator, iterable, body };
  }

  private parseExpression(): Expr {
    return this.parsePipe();
  }

  private parsePipe(): Expr {
    let expr = this.parseBinary(0);
    while (this.match(TokenType.PIPE)) {
      const pipePos = this.previous().position;
      // Parse the right side which must be a call expression
      const callee = this.parsePostfix();
      if (callee.kind !== 'CallExpr') {
        throw this.error('パイプライン式で関数呼び出しが必要です', pipePos);
      }
      const call = callee as CallExpr;
      // Create pipe expression
      const pipeExpr: PipeExpr = {
        kind: 'PipeExpr',
        position: pipePos,
        left: expr,
        call,
      };
      expr = pipeExpr;
    }
    return expr;
  }

  private parseBinary(minPrec: number): Expr {
    let expr = this.parseUnary();
    while (true) {
      const precedence = this.getPrecedence(this.peek().type);
      if (precedence < minPrec) break;
      const opToken = this.advance();
      const right = this.parseBinary(precedence + 1);
      const node: BinaryExpr = {
        kind: 'BinaryExpr',
        position: opToken.position,
        operator: this.operatorText(opToken),
        left: expr,
        right,
      };
      expr = node;
    }
    return expr;
  }

  private parseUnary(): Expr {
    if (this.match(TokenType.NOT) || this.match(TokenType.MINUS)) {
      const op = this.previous();
      const operand = this.parseUnary();
      const node: UnaryExpr = {
        kind: 'UnaryExpr',
        position: op.position,
        operator: this.operatorText(op),
        operand,
      };
      return node;
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match(TokenType.DOT)) {
        const name = this.parsePropertyName();
        expr = { kind: 'MemberExpr', position: expr.position, object: expr, property: name };
        continue;
      }
      if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, "Expected ']'");
        const node: IndexExpr = { kind: 'IndexExpr', position: expr.position, object: expr, index };
        expr = node;
        continue;
      }
      if (this.match(TokenType.LPAREN)) {
        const args = this.parseCallArgs();
        this.expect(TokenType.RPAREN, "Expected ')'");
        expr = { kind: 'CallExpr', position: expr.position, callee: expr, args };
        continue;
      }
      break;
    }
    return expr;
  }

  private parseCallArgs(): CallArg[] {
    const args: CallArg[] = [];
    if (this.check(TokenType.RPAREN)) return args;
    do {
      const pos = this.peek().position;
      if (this.check(TokenType.IDENT) && this.checkNext(TokenType.COLON)) {
        const name = this.advance().value as string;
        this.expect(TokenType.COLON, "Expected ':'");
        const value = this.parseExpression();
        args.push({ kind: 'CallArg', position: pos, name, value });
      } else {
        const value = this.parseExpression();
        args.push({ kind: 'CallArg', position: pos, value });
      }
    } while (this.match(TokenType.COMMA));
    return args;
  }

  private parsePrimary(): Expr {
    const token = this.peek();
    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return { kind: 'NumberLiteral', position: token.position, value: token.value as number } as NumberLiteral;
      case TokenType.STRING:
        this.advance();
        return { kind: 'StringLiteral', position: token.position, value: token.value as string } as StringLiteral;
      case TokenType.TEMPLATE_HEAD:
        return this.parseTemplateLiteral();
      case TokenType.TRUE:
      case TokenType.FALSE:
        this.advance();
        return { kind: 'BoolLiteral', position: token.position, value: token.type === TokenType.TRUE } as BoolLiteral;
      case TokenType.NULL:
        this.advance();
        return { kind: 'NullLiteral', position: token.position } as NullLiteral;
      case TokenType.PITCH:
        this.advance();
        return { kind: 'PitchLiteral', position: token.position, value: token.value as string } as PitchLiteral;
      case TokenType.DUR:
        this.advance();
        return { kind: 'DurLiteral', position: token.position, value: token.value as string } as DurLiteral;
      case TokenType.POSREF: {
        this.advance();
        const text = token.value as string;
        const [barStr, beatStr] = text.split(':');
        return {
          kind: 'PosRefLiteral',
          position: token.position,
          bar: parseInt(barStr, 10),
          beat: parseInt(beatStr, 10),
        } as PosRefLiteral;
      }
      case TokenType.IDENT:
        this.advance();
        return { kind: 'Identifier', position: token.position, name: token.value as string } as Identifier;
      case TokenType.LPAREN: {
        return this.parseParenOrTuple();
      }
      case TokenType.LBRACKET:
        return this.parseArrayLiteral();
      case TokenType.LBRACE:
        return this.parseObjectLiteral();
      case TokenType.SCORE:
        return this.parseScoreExpr();
      case TokenType.CLIP:
        return this.parseClipExpr();
      case TokenType.MATCH:
        return this.parseMatchExpr();
      default:
        throw this.error('Unexpected token in expression', token.position);
    }
  }

  private parseTemplateLiteral(): TemplateLiteral {
    const pos = this.peek().position;
    const quasis: string[] = [];
    const expressions: Expr[] = [];

    // First part: TEMPLATE_HEAD
    const head = this.expect(TokenType.TEMPLATE_HEAD, 'Expected template head');
    quasis.push(head.value as string);

    // Parse expressions and middle/tail parts
    while (!this.isAtEnd()) {
      // Parse the expression inside ${}
      const expr = this.parseExpression();
      expressions.push(expr);

      // Next token should be TEMPLATE_MIDDLE or TEMPLATE_TAIL
      const next = this.peek();
      if (next.type === TokenType.TEMPLATE_MIDDLE) {
        this.advance();
        quasis.push(next.value as string);
      } else if (next.type === TokenType.TEMPLATE_TAIL) {
        this.advance();
        quasis.push(next.value as string);
        break;
      } else {
        throw this.error('Expected template continuation', next.position);
      }
    }

    return {
      kind: 'TemplateLiteral',
      position: pos,
      quasis,
      expressions,
    };
  }

  private parseMatchExpr(): MatchExpr {
    const pos = this.peek().position;
    this.expect(TokenType.MATCH, "Expected 'match'");
    this.expect(TokenType.LPAREN, "Expected '(' after match");
    const value = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')'");
    this.expect(TokenType.LBRACE, "Expected '{' after match");
    const arms: MatchArm[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const armPos = this.peek().position;
      let pattern: MatchPattern | undefined;
      let guard: Expr | undefined;
      let isDefault = false;
      if (this.match(TokenType.ELSE)) {
        isDefault = true;
      } else {
        pattern = this.parseMatchPattern();
        // Check for guard condition: pattern if condition -> value
        if (this.match(TokenType.IF)) {
          guard = this.parseExpression();
        }
      }
      this.expect(TokenType.ARROW, "Expected '->' in match arm");
      const valueExpr = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';' after match arm");
      arms.push({
        kind: 'MatchArm',
        position: armPos,
        pattern,
        guard,
        value: valueExpr,
        isDefault,
      });
    }
    this.expect(TokenType.RBRACE, "Expected '}' after match");
    return { kind: 'MatchExpr', position: pos, value, arms };
  }

  private parseMatchPattern(): MatchPattern {
    // Check for range pattern: NUMBER..NUMBER
    if (this.check(TokenType.NUMBER) && this.checkNext(TokenType.DOTDOT)) {
      const startToken = this.advance();
      const startLiteral: NumberLiteral = {
        kind: 'NumberLiteral',
        position: startToken.position,
        value: startToken.value as number,
      };
      this.expect(TokenType.DOTDOT, "Expected '..' in range pattern");
      const endToken = this.expect(TokenType.NUMBER, "Expected number after '..' in range pattern");
      const endLiteral: NumberLiteral = {
        kind: 'NumberLiteral',
        position: endToken.position,
        value: endToken.value as number,
      };
      const rangePattern: RangePattern = {
        kind: 'RangePattern',
        position: startToken.position,
        start: startLiteral,
        end: endLiteral,
      };
      return rangePattern;
    }
    // Otherwise, parse as regular expression
    return this.parseExpression();
  }

  private parseArrayLiteral(): ArrayLiteral {
    const pos = this.peek().position;
    this.expect(TokenType.LBRACKET, "Expected '['");
    const elements: (Expr | SpreadElement)[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const spreadPos = this.previous().position;
          const argument = this.parseExpression();
          elements.push({ kind: 'SpreadElement', position: spreadPos, argument });
        } else {
          elements.push(this.parseExpression());
        }
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RBRACKET, "Expected ']'");
    return { kind: 'ArrayLiteral', position: pos, elements };
  }

  private parseObjectLiteral(): ObjectLiteral {
    const pos = this.peek().position;
    this.expect(TokenType.LBRACE, "Expected '{'");
    const properties: (ObjectProperty | SpreadElement)[] = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const spreadPos = this.previous().position;
          const argument = this.parseExpression();
          properties.push({ kind: 'SpreadElement', position: spreadPos, argument });
        } else {
          const keyToken = this.peek();
          if (!this.isPropertyToken(keyToken.type)) {
            throw this.error('Expected key', keyToken.position);
          }
          this.advance();
          this.expect(TokenType.COLON, "Expected ':'");
          const value = this.parseExpression();
          properties.push({
            kind: 'ObjectProperty',
            position: keyToken.position,
            key: keyToken.value as string,
            value,
          });
        }
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'ObjectLiteral', position: pos, properties };
  }

  private parseScoreExpr(): ScoreExpr {
    const pos = this.peek().position;
    this.expect(TokenType.SCORE, "Expected 'score'");
    this.expect(TokenType.LBRACE, "Expected '{' after score");
    const items: ScoreItem[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      items.push(this.parseScoreItem());
    }
    this.expect(TokenType.RBRACE, "Expected '}' after score");
    return { kind: 'ScoreExpr', position: pos, items };
  }

  private parseScoreItem(): ScoreItem {
    if (this.match(TokenType.META)) {
      return this.parseMetaBlock();
    }
    if (this.match(TokenType.TEMPO)) {
      return this.parseTempoBlock();
    }
    if (this.match(TokenType.METER)) {
      return this.parseMeterBlock();
    }
    if (this.match(TokenType.SOUND)) {
      return this.parseSoundDecl();
    }
    if (this.match(TokenType.TRACK)) {
      return this.parseTrackDecl();
    }
    if (this.check(TokenType.IDENT) && (this.peek().value as string) === 'marker') {
      this.advance();
      return this.parseScoreMarker();
    }
    throw this.error('Unexpected score item', this.peek().position);
  }

  private parseScoreMarker(): ScoreMarker {
    const pos = this.previous().position;
    this.expect(TokenType.LPAREN, "Expected '(' after marker");
    const markerPos = this.parseExpression();
    this.expect(TokenType.COMMA, "Expected ',' after marker position");
    const markerKind = this.parseExpression();
    this.expect(TokenType.COMMA, "Expected ',' after marker kind");
    const label = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')'");
    this.expect(TokenType.SEMI, "Expected ';'");
    return { kind: 'ScoreMarker', position: pos, pos: markerPos, markerKind, label };
  }

  private parseMetaBlock(): MetaBlock {
    const pos = this.previous().position;
    this.expect(TokenType.LBRACE, "Expected '{' after meta");
    const fields: MetaField[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const keyToken = this.expect(TokenType.IDENT, 'Expected meta key');
      const value = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';'");
      fields.push({ kind: 'MetaField', position: keyToken.position, key: keyToken.value as string, value });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'MetaBlock', position: pos, fields };
  }

  private parseTempoBlock(): TempoBlock {
    const pos = this.previous().position;
    this.expect(TokenType.LBRACE, "Expected '{' after tempo");
    const items: TempoItem[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const itemPos = this.peek().position;
      const at = this.parseExpression();
      this.expect(TokenType.ARROW, "Expected '->'");

      // Check for gradational tempo syntax: at -> endAt curveType bpm
      // Peek ahead to see if we have: expression followed by 'ramp' or 'ease'
      let endAt: Expr | undefined;
      let curveType: 'linear' | 'ease' | undefined;
      let bpm: Expr;

      // Try to parse the next expression
      const firstExprAfterArrow = this.parseTempoExprOrBpm();

      // Check if next token is 'ramp' or 'ease' (curve type keyword)
      if (this.check(TokenType.IDENT)) {
        const nextIdent = this.peek().value as string;
        if (nextIdent === 'ramp' || nextIdent === 'ease') {
          // This is gradational syntax: at -> endAt curveType bpm
          endAt = firstExprAfterArrow;
          curveType = nextIdent === 'ramp' ? 'linear' : 'ease';
          this.advance(); // consume 'ramp' or 'ease'

          // Now parse the BPM
          bpm = this.parseTempoExprOrBpm();
        } else {
          // Not gradational - first expression is the BPM
          bpm = firstExprAfterArrow;
          // Check for optional 'bpm' suffix
          if (nextIdent === 'bpm') {
            this.advance();
          }
        }
      } else {
        // No identifier after expression - first expression is the BPM
        bpm = firstExprAfterArrow;
      }

      let unit: Expr | undefined;
      if (this.match(TokenType.AT)) {
        unit = this.parseExpression();
      }
      this.expect(TokenType.SEMI, "Expected ';'");
      items.push({ kind: 'TempoItem', position: itemPos, at, bpm, unit, endAt, curveType });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'TempoBlock', position: pos, items };
  }

  // Helper method to parse BPM value (handles both BPM token and regular expression)
  private parseTempoExprOrBpm(): Expr {
    if (this.match(TokenType.BPM)) {
      const token = this.previous();
      return { kind: 'NumberLiteral', position: token.position, value: token.value as number };
    }
    return this.parseExpression();
  }

  private parseMeterBlock(): MeterBlock {
    const pos = this.previous().position;
    this.expect(TokenType.LBRACE, "Expected '{' after meter");
    const items: MeterItem[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const itemPos = this.peek().position;
      const at = this.parseExpression();
      this.expect(TokenType.ARROW, "Expected '->'");
      const numerator = this.parsePrimary();
      this.expect(TokenType.SLASH, "Expected '/'");
      const denominator = this.parsePrimary();
      this.expect(TokenType.SEMI, "Expected ';'");
      items.push({ kind: 'MeterItem', position: itemPos, at, numerator, denominator });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'MeterBlock', position: pos, items };
  }

  private parseSoundDecl(): SoundDecl {
    const pos = this.previous().position;
    const id = this.expect(TokenType.STRING, 'Expected sound id').value as string;
    this.expect(TokenType.KIND, "Expected 'kind'");
    const kindIdent = this.expect(TokenType.IDENT, 'Expected sound kind').value as string;
    this.expect(TokenType.LBRACE, "Expected '{' after sound");
    const body: SoundBodyItem[] = [];
    while (!this.check(TokenType.RBRACE)) {
      if (this.check(TokenType.IDENT) && (this.peek().value as string) === 'drumKeys') {
        body.push(this.parseDrumKeys());
        continue;
      }
      if (this.check(TokenType.IDENT) && (this.peek().value as string) === 'vocal') {
        body.push(this.parseVocalBlock());
        continue;
      }
      body.push(this.parseSoundField());
    }
    this.expect(TokenType.RBRACE, "Expected '}' after sound body");
    return { kind: 'SoundDecl', position: pos, id, soundKind: kindIdent, body };
  }

  private parseSoundField(): SoundField {
    const keyToken = this.expect(TokenType.IDENT, 'Expected sound field');
    let value: Expr;
    if (this.check(TokenType.PITCH)) {
      const low = this.parseExpression();
      if (this.match(TokenType.DOTDOT)) {
        const high = this.parseExpression();
        value = { kind: 'BinaryExpr', position: keyToken.position, operator: '..', left: low, right: high } as BinaryExpr;
      } else {
        value = low;
      }
    } else {
      value = this.parseExpression();
      if (this.match(TokenType.DOTDOT)) {
        const high = this.parseExpression();
        value = { kind: 'BinaryExpr', position: keyToken.position, operator: '..', left: value, right: high } as BinaryExpr;
      }
    }
    this.expect(TokenType.SEMI, "Expected ';'");
    return { kind: 'SoundField', position: keyToken.position, key: keyToken.value as string, value };
  }

  private parseDrumKeys(): DrumKeysBlock {
    const pos = this.peek().position;
    this.advance();
    this.expect(TokenType.LBRACE, "Expected '{' after drumKeys");
    const keys: string[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const key = this.expect(TokenType.IDENT, 'Expected drum key').value as string;
      this.expect(TokenType.SEMI, "Expected ';'");
      keys.push(key);
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'DrumKeysBlock', position: pos, keys };
  }

  private parseVocalBlock(): VocalBlock {
    const pos = this.peek().position;
    this.advance();
    this.expect(TokenType.LBRACE, "Expected '{' after vocal");
    const fields: SoundField[] = [];
    while (!this.check(TokenType.RBRACE)) {
      fields.push(this.parseSoundField());
    }
    this.expect(TokenType.RBRACE, "Expected '}' after vocal");
    return { kind: 'VocalBlock', position: pos, fields };
  }

  private parseTrackDecl(): TrackDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.STRING, 'Expected track name').value as string;
    this.expect(TokenType.ROLE, "Expected 'role'");
    const role = this.expect(TokenType.IDENT, 'Expected role').value as string;
    this.expect(TokenType.SOUND, "Expected 'sound'");
    const sound = this.expect(TokenType.STRING, 'Expected sound id').value as string;
    this.expect(TokenType.LBRACE, "Expected '{' after track");
    const body: TrackStmt[] = [];
    while (!this.check(TokenType.RBRACE)) {
      body.push(this.parseTrackStmt());
    }
    this.expect(TokenType.RBRACE, "Expected '}' after track");
    return { kind: 'TrackDecl', position: pos, name, role, sound, body };
  }

  private parseTrackStmt(): TrackStmt {
    const pos = this.peek().position;
    const keyword = this.expect(TokenType.PLACE, "Expected 'place'");
    const at = this.parseExpression();
    const clip = this.parseExpression();
    this.expect(TokenType.SEMI, "Expected ';'");
    const stmt: PlaceStmt = { kind: 'PlaceStmt', position: keyword.position, at, clip };
    return stmt;
  }

  private parseClipExpr(): ClipExpr {
    const pos = this.peek().position;
    this.expect(TokenType.CLIP, "Expected 'clip'");
    this.expect(TokenType.LBRACE, "Expected '{' after clip");
    const body: ClipStmt[] = [];
    while (!this.check(TokenType.RBRACE)) {
      body.push(this.parseClipStmt());
    }
    this.expect(TokenType.RBRACE, "Expected '}' after clip");
    return { kind: 'ClipExpr', position: pos, body };
  }

  private parseClipStmt(): ClipStmt {
    const pos = this.peek().position;
    const ident = this.expect(TokenType.IDENT, 'Expected clip statement').value as string;

    // Handle triplet and tuplet which use { } instead of ( )
    if (ident === 'triplet' || ident === 'tuplet') {
      return this.parseTripletStmt(pos, ident);
    }

    this.expect(TokenType.LPAREN, "Expected '('");
    switch (ident) {
      case 'at': {
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: AtStmt = { kind: 'AtStmt', position: pos, pos: expr };
        return stmt;
      }
      case 'rest': {
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: RestStmt = { kind: 'RestStmt', position: pos, dur: expr };
        return stmt;
      }
      case 'breath': {
        const dur = this.parseExpression();
        let intensity: Expr | null = null;
        if (this.check(TokenType.COMMA)) {
          this.advance();
          intensity = this.parseExpression();
        }
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: BreathStmt = { kind: 'BreathStmt', position: pos, dur, intensity };
        return stmt;
      }
      case 'note': {
        const pitch = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const dur = this.parseExpression();
        const opts = this.parseNamedArgs();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: NoteStmt = { kind: 'NoteStmt', position: pos, pitch, dur, opts };
        return stmt;
      }
      case 'chord': {
        const pitches = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const dur = this.parseExpression();
        const opts = this.parseNamedArgs();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: ChordStmt = { kind: 'ChordStmt', position: pos, pitches, dur, opts };
        return stmt;
      }
      case 'hit': {
        const key = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const dur = this.parseExpression();
        const opts = this.parseNamedArgs();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: HitStmt = { kind: 'HitStmt', position: pos, key, dur, opts };
        return stmt;
      }
      case 'cc': {
        const num = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const value = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: CCStmt = { kind: 'CCStmt', position: pos, num, value };
        return stmt;
      }
      case 'automation': {
        const param = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const start = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const end = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const curve = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: AutomationStmt = { kind: 'AutomationStmt', position: pos, param, start, end, curve };
        return stmt;
      }
      case 'marker': {
        const markerKind = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const label = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: MarkerStmt = { kind: 'MarkerStmt', position: pos, markerKind, label };
        return stmt;
      }
      case 'arp': {
        const pitches = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const duration = this.parseExpression();
        this.expect(TokenType.COMMA, "Expected ','");
        const directionToken = this.expect(TokenType.IDENT, 'Expected direction (up, down, updown, downup, random)');
        const directionValue = directionToken.value as string;
        if (!this.isValidArpDirection(directionValue)) {
          throw this.error(`Invalid arp direction: ${directionValue}. Expected up, down, updown, downup, or random`, directionToken.position);
        }
        const direction = directionValue as ArpDirection;
        const opts = this.parseNamedArgs();
        this.expect(TokenType.RPAREN, "Expected ')'");
        this.expect(TokenType.SEMI, "Expected ';'");
        const stmt: ArpStmt = { kind: 'ArpStmt', position: pos, pitches, duration, direction, opts };
        return stmt;
      }
      default:
        throw this.error(`Unknown clip statement: ${ident}`, pos);
    }
  }

  private parseTripletStmt(pos: Position, keyword: string): TripletStmt {
    this.expect(TokenType.LPAREN, "Expected '('");

    let n: number;
    let inTime: number;

    if (keyword === 'triplet') {
      // triplet(inTime) { ... } - defaults to n = 3 notes in inTime beats
      // Or triplet(3) defaults to 3 notes in 2 beats
      const firstArg = this.expect(TokenType.NUMBER, 'Expected number');
      const firstValue = firstArg.value as number;

      if (this.match(TokenType.COMMA)) {
        // triplet(n, inTime) form - explicit both values
        n = firstValue;
        const secondArg = this.expect(TokenType.NUMBER, 'Expected number for inTime');
        inTime = secondArg.value as number;
      } else {
        // triplet(n) form - defaults: n notes in (n-1) beats
        n = firstValue;
        inTime = n - 1;
      }
    } else {
      // tuplet(n, inTime) { ... } - explicit both values required
      const nArg = this.expect(TokenType.NUMBER, 'Expected number for n');
      n = nArg.value as number;
      this.expect(TokenType.COMMA, "Expected ','");
      const inTimeArg = this.expect(TokenType.NUMBER, 'Expected number for inTime');
      inTime = inTimeArg.value as number;
    }

    this.expect(TokenType.RPAREN, "Expected ')'");
    this.expect(TokenType.LBRACE, "Expected '{'");

    const body: ClipStmt[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseClipStmt());
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    const stmt: TripletStmt = {
      kind: 'TripletStmt',
      position: pos,
      n,
      inTime,
      body,
    };
    return stmt;
  }

  private isValidArpDirection(value: string): value is ArpDirection {
    return value === 'up' || value === 'down' || value === 'updown' || value === 'downup' || value === 'random';
  }

  private parseNamedArgs(): NamedArg[] {
    const args: NamedArg[] = [];
    if (!this.match(TokenType.COMMA)) return args;
    do {
      const pos = this.peek().position;
      const name = this.expect(TokenType.IDENT, 'Expected option name').value as string;
      this.expect(TokenType.COLON, "Expected ':'");
      const value = this.parseExpression();
      args.push({ kind: 'NamedArg', position: pos, name, value });
    } while (this.match(TokenType.COMMA));
    return args;
  }

  private getPrecedence(type: TokenType): number {
    // Precedence (high number = binds tighter):
    // || < && < ?? < == != < < <= > >= < + - < * / % < ..
    switch (type) {
      case TokenType.OR: return 1;
      case TokenType.AND: return 2;
      case TokenType.NULLISH: return 3;
      case TokenType.EQEQ:
      case TokenType.NEQ: return 4;
      case TokenType.LT:
      case TokenType.LTE:
      case TokenType.GT:
      case TokenType.GTE: return 5;
      case TokenType.PLUS:
      case TokenType.MINUS: return 6;
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT: return 7;
      case TokenType.DOTDOT: return 8;
      default: return -1;
    }
  }

  private operatorText(token: Token): string {
    switch (token.type) {
      case TokenType.PLUS: return '+';
      case TokenType.MINUS: return '-';
      case TokenType.STAR: return '*';
      case TokenType.SLASH: return '/';
      case TokenType.PERCENT: return '%';
      case TokenType.EQEQ: return '==';
      case TokenType.NEQ: return '!=';
      case TokenType.LT: return '<';
      case TokenType.LTE: return '<=';
      case TokenType.GT: return '>';
      case TokenType.GTE: return '>=';
      case TokenType.AND: return '&&';
      case TokenType.OR: return '||';
      case TokenType.NOT: return '!';
      case TokenType.NULLISH: return '??';
      case TokenType.DOTDOT: return '..';
      default: return token.value ? String(token.value) : token.type;
    }
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    return this.peekNext().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (!this.check(type)) {
      throw this.error(message, this.peek().position);
    }
    return this.advance();
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    return this.tokens[this.current + 1] ?? this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private parseStringLiteral(): StringLiteral {
    const token = this.expect(TokenType.STRING, 'Expected string literal');
    return { kind: 'StringLiteral', position: token.position, value: token.value as string };
  }

  private expectIdentLike(message: string): string {
    const token = this.peek();
    if (token.type === TokenType.IDENT || token.type === TokenType.DUR) {
      this.advance();
      return token.value as string;
    }
    throw this.error(message, token.position);
  }

  private parsePropertyName(): string {
    const token = this.peek();
    if (this.isPropertyToken(token.type)) {
      this.advance();
      return token.value as string;
    }
    throw this.error('Expected property', token.position);
  }

  private isPropertyToken(type: TokenType): boolean {
      switch (type) {
        case TokenType.IDENT:
        case TokenType.DUR:
        case TokenType.KIND:
        case TokenType.ROLE:
        case TokenType.SOUND:
      case TokenType.TRACK:
      case TokenType.META:
      case TokenType.TEMPO:
      case TokenType.METER:
      case TokenType.PLACE:
      case TokenType.SCORE:
      case TokenType.CLIP:
      case TokenType.IMPORT:
      case TokenType.EXPORT:
      case TokenType.FROM:
      case TokenType.FN:
      case TokenType.CONST:
      case TokenType.LET:
      case TokenType.RETURN:
      case TokenType.IF:
      case TokenType.ELSE:
      case TokenType.FOR:
      case TokenType.IN:
      case TokenType.MATCH:
      case TokenType.TRUE:
      case TokenType.FALSE:
      case TokenType.NULL:
      case TokenType.AS:
      case TokenType.TYPE:
      case TokenType.ENUM:
        return true;
      default:
        return false;
    }
  }

  private isAssignable(expr: Expr): expr is Identifier | MemberExpr | IndexExpr {
    return expr.kind === 'Identifier' || expr.kind === 'MemberExpr' || expr.kind === 'IndexExpr';
  }

  private error(message: string, position: Position): Error {
    const loc = this.filePath ? `${this.filePath}:${position.line}:${position.column}` : `${position.line}:${position.column}`;
    return new Error(`[parser] ${message} at ${loc}`);
  }
}
