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
  BoolLiteral,
  NullLiteral,
  PitchLiteral,
  DurLiteral,
  PosRefLiteral,
  Identifier,
  ArrayLiteral,
  ObjectLiteral,
  ObjectProperty,
  MemberExpr,
  CallExpr,
  CallArg,
  UnaryExpr,
  BinaryExpr,
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
  TrackStmt,
  PlaceStmt,
  ClipExpr,
  ClipStmt,
  AtStmt,
  RestStmt,
  NoteStmt,
  ChordStmt,
  HitStmt,
  CCStmt,
  AutomationStmt,
  MarkerStmt,
  NamedArg,
} from './ast.js';

export class V3Parser {
  private tokens: Token[];
  private current = 0;
  private filePath?: string;

  constructor(tokens: Token[], filePath?: string) {
    this.tokens = tokens;
    this.filePath = filePath;
  }

  parseProgram(): Program {
    const imports: ImportDecl[] = [];
    const body: (FnDecl | ConstDecl)[] = [];
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
      const name = this.expect(TokenType.IDENT, 'Expected import name').value as string;
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

  private parseTopDecl(): FnDecl | ConstDecl {
    const exported = this.match(TokenType.EXPORT);
    if (this.match(TokenType.FN)) {
      return this.parseFnDecl(exported);
    }
    if (this.match(TokenType.CONST) || this.match(TokenType.LET)) {
      const mutable = this.previous().type === TokenType.LET;
      return this.parseConstDecl(exported, mutable);
    }
    throw this.error('Expected declaration', this.peek().position);
  }

  private parseFnDecl(exported: boolean): FnDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.IDENT, 'Expected function name').value as string;
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
      params,
      returnType,
      body,
      exported,
    };
  }

  private parseConstDecl(exported: boolean, mutable: boolean): ConstDecl {
    const pos = this.previous().position;
    const name = this.expect(TokenType.IDENT, 'Expected identifier').value as string;
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

  private parseTypeRef(): TypeRef {
    const pos = this.peek().position;
    const name = this.expect(TokenType.IDENT, 'Expected type name').value as string;
    return { kind: 'TypeRef', position: pos, name };
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

    if (this.check(TokenType.IDENT) && this.checkNext(TokenType.EQ)) {
      const pos = this.peek().position;
      const target = this.parsePrimary();
      this.expect(TokenType.EQ, "Expected '='");
      const value = this.parseExpression();
      this.expect(TokenType.SEMI, "Expected ';'");
      const stmt: AssignmentStmt = { kind: 'AssignmentStmt', position: pos, target, value };
      return stmt;
    }

    const expr = this.parseExpression();
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
    return this.parseBinary(0);
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
        const name = this.expect(TokenType.IDENT, 'Expected property').value as string;
        expr = { kind: 'MemberExpr', position: expr.position, object: expr, property: name };
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
        this.advance();
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN, "Expected ')'");
        return expr;
      }
      case TokenType.LBRACKET:
        return this.parseArrayLiteral();
      case TokenType.LBRACE:
        return this.parseObjectLiteral();
      case TokenType.SCORE:
        return this.parseScoreExpr();
      case TokenType.CLIP:
        return this.parseClipExpr();
      default:
        throw this.error('Unexpected token in expression', token.position);
    }
  }

  private parseArrayLiteral(): ArrayLiteral {
    const pos = this.peek().position;
    this.expect(TokenType.LBRACKET, "Expected '['");
    const elements: Expr[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RBRACKET, "Expected ']'");
    return { kind: 'ArrayLiteral', position: pos, elements };
  }

  private parseObjectLiteral(): ObjectLiteral {
    const pos = this.peek().position;
    this.expect(TokenType.LBRACE, "Expected '{'");
    const properties: ObjectProperty[] = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        const keyToken = this.expect(TokenType.IDENT, 'Expected key');
        this.expect(TokenType.COLON, "Expected ':'");
        const value = this.parseExpression();
        properties.push({ kind: 'ObjectProperty', position: keyToken.position, key: keyToken.value as string, value });
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
    throw this.error('Unexpected score item', this.peek().position);
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
      let bpm: Expr;
      if (this.match(TokenType.BPM)) {
        const token = this.previous();
        bpm = { kind: 'NumberLiteral', position: token.position, value: token.value as number };
      } else {
        bpm = this.parseExpression();
        if (this.check(TokenType.IDENT) && (this.peek().value as string) === 'bpm') {
          this.advance();
        }
      }
      let unit: Expr | undefined;
      if (this.match(TokenType.AT)) {
        unit = this.parseExpression();
      }
      this.expect(TokenType.SEMI, "Expected ';'");
      items.push({ kind: 'TempoItem', position: itemPos, at, bpm, unit });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: 'TempoBlock', position: pos, items };
  }

  private parseMeterBlock(): MeterBlock {
    const pos = this.previous().position;
    this.expect(TokenType.LBRACE, "Expected '{' after meter");
    const items: MeterItem[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const itemPos = this.peek().position;
      const at = this.parseExpression();
      this.expect(TokenType.ARROW, "Expected '->'");
      const numerator = this.parseExpression();
      this.expect(TokenType.SLASH, "Expected '/'");
      const denominator = this.parseExpression();
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
      default:
        throw this.error(`Unknown clip statement: ${ident}`, pos);
    }
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
    switch (type) {
      case TokenType.OR: return 1;
      case TokenType.AND: return 2;
      case TokenType.EQEQ:
      case TokenType.NEQ: return 3;
      case TokenType.LT:
      case TokenType.LTE:
      case TokenType.GT:
      case TokenType.GTE: return 4;
      case TokenType.PLUS:
      case TokenType.MINUS: return 5;
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT: return 6;
      case TokenType.DOTDOT: return 7;
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

  private error(message: string, position: Position): Error {
    const loc = this.filePath ? `${this.filePath}:${position.line}:${position.column}` : `${position.line}:${position.column}`;
    return new Error(`[v3 parser] ${message} at ${loc}`);
  }
}
