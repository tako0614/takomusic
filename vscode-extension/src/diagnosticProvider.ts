/**
 * Diagnostic Provider for TakoMusic DSL
 *
 * Provides real-time diagnostics using inline lexer and parser.
 * Converts TakoMusic diagnostics to LSP diagnostics.
 */

import {
  Connection,
  Diagnostic as LspDiagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';

// ============================================================================
// Type Definitions (mirrored from main takomusic package)
// ============================================================================

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  code?: string;
  message: string;
  position?: Position;
  endPosition?: Position;
  filePath?: string;
  suggestion?: string;
  notes?: string[];
}

export interface BaseNode {
  kind: string;
  position: Position;
}

export interface Program extends BaseNode {
  kind: 'Program';
  imports: ImportDecl[];
  body: TopDecl[];
}

export type TopDecl = FnDecl | ConstDecl | TypeAliasDecl | EnumDecl;

export interface ImportDecl extends BaseNode {
  kind: 'ImportDecl';
  spec: ImportSpec;
  from: { value: string };
}

export type ImportSpec = ImportAll | ImportNamed;

export interface ImportAll extends BaseNode {
  kind: 'ImportAll';
  alias: string;
}

export interface ImportNamed extends BaseNode {
  kind: 'ImportNamed';
  names: string[];
}

export interface FnDecl extends BaseNode {
  kind: 'FnDecl';
  name: string;
  params: Param[];
  returnType?: TypeRef;
  body: any;
  exported: boolean;
}

export interface Param extends BaseNode {
  kind: 'Param';
  name: string;
  type?: TypeRef;
}

export interface ConstDecl extends BaseNode {
  kind: 'ConstDecl';
  name: string;
  value: any;
  mutable: boolean;
  type?: TypeRef;
  exported: boolean;
}

export interface TypeRef extends BaseNode {
  kind: 'TypeRef';
  name: string;
}

export interface TypeAliasDecl extends BaseNode {
  kind: 'TypeAliasDecl';
  name: string;
  typeExpr: TypeRef;
}

export interface EnumVariant extends BaseNode {
  kind: 'EnumVariant';
  name: string;
  payload?: TypeRef;
}

export interface EnumDecl extends BaseNode {
  kind: 'EnumDecl';
  name: string;
  variants: EnumVariant[];
  exported: boolean;
}

// ============================================================================
// Token Types
// ============================================================================

enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENT = 'IDENT',
  PITCH = 'PITCH',
  DUR = 'DUR',
  POSREF = 'POSREF',
  BPM = 'BPM',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  FROM = 'FROM',
  FN = 'FN',
  CONST = 'CONST',
  LET = 'LET',
  RETURN = 'RETURN',
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  IN = 'IN',
  MATCH = 'MATCH',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  SCORE = 'SCORE',
  CLIP = 'CLIP',
  TRACK = 'TRACK',
  SOUND = 'SOUND',
  META = 'META',
  TEMPO = 'TEMPO',
  METER = 'METER',
  PLACE = 'PLACE',
  ROLE = 'ROLE',
  KIND = 'KIND',
  AS = 'AS',
  TYPE = 'TYPE',
  ENUM = 'ENUM',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQ = 'EQ',
  EQEQ = 'EQEQ',
  NEQ = 'NEQ',
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  NULLISH = 'NULLISH',
  DOT = 'DOT',
  COMMA = 'COMMA',
  SEMI = 'SEMI',
  COLON = 'COLON',
  ARROW = 'ARROW',
  AT = 'AT',
  DOTDOT = 'DOTDOT',
  SPREAD = 'SPREAD',
  PIPE = 'PIPE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  TEMPLATE_HEAD = 'TEMPLATE_HEAD',
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',
  TEMPLATE_TAIL = 'TEMPLATE_TAIL',
  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value?: string | number;
  position: Position;
}

const KEYWORDS: Record<string, TokenType> = {
  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  from: TokenType.FROM,
  fn: TokenType.FN,
  const: TokenType.CONST,
  let: TokenType.LET,
  return: TokenType.RETURN,
  if: TokenType.IF,
  else: TokenType.ELSE,
  for: TokenType.FOR,
  in: TokenType.IN,
  match: TokenType.MATCH,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
  score: TokenType.SCORE,
  clip: TokenType.CLIP,
  track: TokenType.TRACK,
  sound: TokenType.SOUND,
  meta: TokenType.META,
  tempo: TokenType.TEMPO,
  meter: TokenType.METER,
  place: TokenType.PLACE,
  role: TokenType.ROLE,
  kind: TokenType.KIND,
  as: TokenType.AS,
  type: TokenType.TYPE,
  enum: TokenType.ENUM,
};

// ============================================================================
// Simplified Lexer for LSP
// ============================================================================

class SimpleLexer {
  private source: string;
  private index = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      try {
        const token = this.nextToken();
        tokens.push(token);
      } catch (e) {
        // On error, skip the character and continue
        this.advance();
      }
    }
    tokens.push({ type: TokenType.EOF, position: this.currentPosition() });
    return tokens;
  }

  private nextToken(): Token {
    const pos = this.currentPosition();
    const ch = this.peek();

    if (ch === '"') return this.readString();

    if (this.isDigit(ch)) {
      return this.readNumberLike();
    }

    if (this.isAlpha(ch)) {
      return this.readIdentifier();
    }

    return this.readOperator();
  }

  private readString(): Token {
    const pos = this.currentPosition();
    this.advance(); // consume opening "
    let value = '';
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            default: value += escaped; break;
          }
        }
      } else {
        value += this.advance();
      }
    }
    if (!this.isAtEnd()) {
      this.advance(); // consume closing "
    }
    return { type: TokenType.STRING, value, position: pos };
  }

  private readNumberLike(): Token {
    const pos = this.currentPosition();
    const start = this.index;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const numberText = this.source.slice(start, this.index);

    if (this.peek() === ':' && this.isDigit(this.peekNext())) {
      this.advance();
      const beatStart = this.index;
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
      const beatText = this.source.slice(beatStart, this.index);
      return { type: TokenType.POSREF, value: `${numberText}:${beatText}`, position: pos };
    }

    if (this.peek() === 'b' && this.peekNext() === 'p' && this.charAt(this.index + 2) === 'm') {
      this.advance();
      this.advance();
      this.advance();
      return { type: TokenType.BPM, value: parseFloat(numberText), position: pos };
    }

    return { type: TokenType.NUMBER, value: parseFloat(numberText), position: pos };
  }

  private readIdentifier(): Token {
    const pos = this.currentPosition();
    const start = this.index;
    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      this.advance();
    }
    const text = this.source.slice(start, this.index);
    const keyword = KEYWORDS[text];
    if (keyword) {
      return { type: keyword, value: text, position: pos };
    }
    return { type: TokenType.IDENT, value: text, position: pos };
  }

  private readOperator(): Token {
    const pos = this.currentPosition();
    const ch = this.advance();

    switch (ch) {
      case '+': return { type: TokenType.PLUS, position: pos };
      case '-':
        if (this.match('>')) return { type: TokenType.ARROW, position: pos };
        return { type: TokenType.MINUS, position: pos };
      case '*': return { type: TokenType.STAR, position: pos };
      case '/': return { type: TokenType.SLASH, position: pos };
      case '%': return { type: TokenType.PERCENT, position: pos };
      case '=':
        if (this.match('=')) return { type: TokenType.EQEQ, position: pos };
        return { type: TokenType.EQ, position: pos };
      case '!':
        if (this.match('=')) return { type: TokenType.NEQ, position: pos };
        return { type: TokenType.NOT, position: pos };
      case '<':
        if (this.match('=')) return { type: TokenType.LTE, position: pos };
        return { type: TokenType.LT, position: pos };
      case '>':
        if (this.match('=')) return { type: TokenType.GTE, position: pos };
        return { type: TokenType.GT, position: pos };
      case '&':
        if (this.match('&')) return { type: TokenType.AND, position: pos };
        break;
      case '|':
        if (this.match('|')) return { type: TokenType.OR, position: pos };
        if (this.match('>')) return { type: TokenType.PIPE, position: pos };
        break;
      case '?':
        if (this.match('?')) return { type: TokenType.NULLISH, position: pos };
        break;
      case '.':
        if (this.peek() === '.' && this.peekNext() === '.') {
          this.advance();
          this.advance();
          return { type: TokenType.SPREAD, position: pos };
        }
        if (this.match('.')) return { type: TokenType.DOTDOT, position: pos };
        return { type: TokenType.DOT, position: pos };
      case ',': return { type: TokenType.COMMA, position: pos };
      case ';': return { type: TokenType.SEMI, position: pos };
      case ':': return { type: TokenType.COLON, position: pos };
      case '@': return { type: TokenType.AT, position: pos };
      case '(': return { type: TokenType.LPAREN, position: pos };
      case ')': return { type: TokenType.RPAREN, position: pos };
      case '{': return { type: TokenType.LBRACE, position: pos };
      case '}': return { type: TokenType.RBRACE, position: pos };
      case '[': return { type: TokenType.LBRACKET, position: pos };
      case ']': return { type: TokenType.RBRACKET, position: pos };
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n') {
        this.advance();
        continue;
      }
      if (ch === '/' && this.peekNext() === '/') {
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }
      if (ch === '/' && this.peekNext() === '*') {
        this.advance();
        this.advance();
        while (!this.isAtEnd()) {
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
        continue;
      }
      break;
    }
  }

  private currentPosition(): Position {
    return { line: this.line, column: this.column, offset: this.index };
  }

  private isAtEnd(): boolean {
    return this.index >= this.source.length;
  }

  private peek(): string {
    return this.source[this.index] ?? '\0';
  }

  private peekNext(): string {
    return this.source[this.index + 1] ?? '\0';
  }

  private charAt(idx: number): string {
    return this.source[idx] ?? '\0';
  }

  private advance(): string {
    const ch = this.source[this.index] ?? '\0';
    this.index++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private match(expected: string): boolean {
    if (this.peek() !== expected) return false;
    this.advance();
    return true;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }
}

// ============================================================================
// Simplified Parser for LSP (extracts declarations only)
// ============================================================================

class SimpleParser {
  private tokens: Token[];
  private current = 0;
  private diagnostics: Diagnostic[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseProgram(): { program: Program; diagnostics: Diagnostic[] } {
    const imports: ImportDecl[] = [];
    const body: TopDecl[] = [];
    const startPos = this.peek().position;

    while (!this.isAtEnd()) {
      try {
        if (this.check(TokenType.IMPORT)) {
          const imp = this.parseImport();
          if (imp) imports.push(imp);
        } else if (this.check(TokenType.EXPORT)) {
          this.advance(); // consume export
          const decl = this.parseTopDecl(true);
          if (decl) body.push(decl);
        } else if (
          this.check(TokenType.FN) ||
          this.check(TokenType.CONST) ||
          this.check(TokenType.TYPE) ||
          this.check(TokenType.ENUM)
        ) {
          const decl = this.parseTopDecl(false);
          if (decl) body.push(decl);
        } else {
          // Skip unknown tokens
          this.advance();
        }
      } catch (e) {
        // On parse error, record and skip to next potential declaration
        if (e instanceof Error) {
          this.diagnostics.push({
            severity: 'error',
            message: e.message,
            position: this.peek().position,
          });
        }
        this.advance();
      }
    }

    return {
      program: {
        kind: 'Program',
        imports,
        body,
        position: startPos,
      },
      diagnostics: this.diagnostics,
    };
  }

  private parseImport(): ImportDecl | null {
    const pos = this.peek().position;
    this.advance(); // consume 'import'

    let spec: ImportSpec;

    if (this.check(TokenType.LBRACE)) {
      // import { name, name2 } from "..."
      this.advance();
      const names: string[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.check(TokenType.IDENT)) {
          names.push(this.advance().value as string);
        }
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          break;
        }
      }
      if (this.check(TokenType.RBRACE)) this.advance();
      spec = { kind: 'ImportNamed', names, position: pos };
    } else if (this.check(TokenType.STAR)) {
      // import * as name from "..."
      this.advance();
      if (this.check(TokenType.AS)) this.advance();
      const alias = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';
      spec = { kind: 'ImportAll', alias, position: pos };
    } else {
      return null;
    }

    if (this.check(TokenType.FROM)) this.advance();
    const fromValue = this.check(TokenType.STRING) ? (this.advance().value as string) : '';

    return {
      kind: 'ImportDecl',
      spec,
      from: { value: fromValue },
      position: pos,
    };
  }

  private parseTopDecl(exported: boolean): TopDecl | null {
    if (this.check(TokenType.FN)) {
      return this.parseFnDecl(exported);
    }
    if (this.check(TokenType.CONST) || this.check(TokenType.LET)) {
      return this.parseConstDecl(exported);
    }
    if (this.check(TokenType.TYPE)) {
      return this.parseTypeAlias();
    }
    if (this.check(TokenType.ENUM)) {
      return this.parseEnum(exported);
    }
    return null;
  }

  private parseFnDecl(exported: boolean): FnDecl {
    const pos = this.peek().position;
    this.advance(); // consume 'fn'

    const name = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';
    const params: Param[] = [];

    if (this.check(TokenType.LPAREN)) {
      this.advance();
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        if (this.check(TokenType.IDENT)) {
          const paramName = this.advance().value as string;
          let paramType: TypeRef | undefined;
          if (this.check(TokenType.COLON)) {
            this.advance();
            if (this.check(TokenType.IDENT)) {
              paramType = {
                kind: 'TypeRef',
                name: this.advance().value as string,
                position: this.previous().position,
              };
            }
          }
          params.push({
            kind: 'Param',
            name: paramName,
            type: paramType,
            position: pos,
          });
        }
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          break;
        }
      }
      if (this.check(TokenType.RPAREN)) this.advance();
    }

    let returnType: TypeRef | undefined;
    if (this.check(TokenType.ARROW)) {
      this.advance();
      if (this.check(TokenType.IDENT)) {
        returnType = {
          kind: 'TypeRef',
          name: this.advance().value as string,
          position: this.previous().position,
        };
      }
    }

    // Skip the function body
    this.skipBlock();

    return {
      kind: 'FnDecl',
      name,
      params,
      returnType,
      body: { kind: 'Block', statements: [], position: pos },
      exported,
      position: pos,
    };
  }

  private parseConstDecl(exported: boolean): ConstDecl {
    const pos = this.peek().position;
    const mutable = this.check(TokenType.LET);
    this.advance(); // consume 'const' or 'let'

    const name = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';
    let type: TypeRef | undefined;

    if (this.check(TokenType.COLON)) {
      this.advance();
      if (this.check(TokenType.IDENT)) {
        type = {
          kind: 'TypeRef',
          name: this.advance().value as string,
          position: this.previous().position,
        };
      }
    }

    if (this.check(TokenType.EQ)) {
      this.advance();
      this.skipExpression();
    }

    return {
      kind: 'ConstDecl',
      name,
      value: null,
      mutable,
      type,
      exported,
      position: pos,
    };
  }

  private parseTypeAlias(): TypeAliasDecl {
    const pos = this.peek().position;
    this.advance(); // consume 'type'

    const name = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';

    if (this.check(TokenType.EQ)) this.advance();

    const typeName = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';

    return {
      kind: 'TypeAliasDecl',
      name,
      typeExpr: { kind: 'TypeRef', name: typeName, position: pos },
      position: pos,
    };
  }

  private parseEnum(exported: boolean): EnumDecl {
    const pos = this.peek().position;
    this.advance(); // consume 'enum'

    const name = this.check(TokenType.IDENT) ? (this.advance().value as string) : 'unknown';
    const variants: EnumVariant[] = [];

    if (this.check(TokenType.LBRACE)) {
      this.advance();
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.check(TokenType.IDENT)) {
          const variantName = this.advance().value as string;
          variants.push({
            kind: 'EnumVariant',
            name: variantName,
            position: this.previous().position,
          });
        }
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else if (!this.check(TokenType.RBRACE)) {
          break;
        }
      }
      if (this.check(TokenType.RBRACE)) this.advance();
    }

    return {
      kind: 'EnumDecl',
      name,
      variants,
      exported,
      position: pos,
    };
  }

  private skipBlock(): void {
    if (!this.check(TokenType.LBRACE)) return;
    this.advance();
    let depth = 1;
    while (!this.isAtEnd() && depth > 0) {
      if (this.check(TokenType.LBRACE)) depth++;
      if (this.check(TokenType.RBRACE)) depth--;
      this.advance();
    }
  }

  private skipExpression(): void {
    // Skip tokens until we hit something that ends an expression
    let depth = 0;
    while (!this.isAtEnd()) {
      if (this.check(TokenType.LBRACE) || this.check(TokenType.LPAREN) || this.check(TokenType.LBRACKET)) {
        depth++;
      }
      if (this.check(TokenType.RBRACE) || this.check(TokenType.RPAREN) || this.check(TokenType.RBRACKET)) {
        if (depth === 0) break;
        depth--;
      }
      if (depth === 0 && (this.check(TokenType.SEMI) || this.check(TokenType.COMMA))) {
        break;
      }
      this.advance();
    }
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current] ?? { type: TokenType.EOF, position: { line: 1, column: 1, offset: 0 } };
  }

  private previous(): Token {
    return this.tokens[this.current - 1] ?? this.peek();
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }
}

// ============================================================================
// Parsed Document Cache
// ============================================================================

export interface ParsedDocument {
  program?: Program;
  diagnostics: Diagnostic[];
}

// ============================================================================
// Diagnostic Provider
// ============================================================================

export class DiagnosticProvider {
  private connection: Connection;
  private documents: TextDocuments<TextDocument>;
  private parsedDocuments = new Map<string, ParsedDocument>();

  constructor(connection: Connection, documents: TextDocuments<TextDocument>) {
    this.connection = connection;
    this.documents = documents;
  }

  /**
   * Validate a document and send diagnostics to the client
   */
  async validateDocument(textDocument: TextDocument): Promise<void> {
    const text = textDocument.getText();
    const uri = textDocument.uri;
    const diagnostics: LspDiagnostic[] = [];

    try {
      // Lexer and Parser
      const lexer = new SimpleLexer(text);
      const tokens = lexer.tokenize();
      const parser = new SimpleParser(tokens);
      const { program, diagnostics: parseDiags } = parser.parseProgram();

      // Store parsed program for use by other providers
      this.parsedDocuments.set(uri, { program, diagnostics: parseDiags });

      // Convert diagnostics to LSP format
      for (const diag of parseDiags) {
        const pos = diag.position;
        const endPos = diag.endPosition;

        const range: Range = pos
          ? {
              start: { line: pos.line - 1, character: pos.column - 1 },
              end: endPos
                ? { line: endPos.line - 1, character: endPos.column - 1 }
                : { line: pos.line - 1, character: pos.column },
            }
          : {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 1 },
            };

        diagnostics.push({
          severity:
            diag.severity === 'error'
              ? DiagnosticSeverity.Error
              : DiagnosticSeverity.Warning,
          range,
          message: diag.message,
          source: 'takomusic',
          code: diag.code,
        });
      }
    } catch (err) {
      // Parse error - extract position from error message
      const message = err instanceof Error ? err.message : String(err);
      const match = message.match(/at line (\d+), column (\d+)/);
      const line = match ? parseInt(match[1], 10) - 1 : 0;
      const column = match ? parseInt(match[2], 10) - 1 : 0;

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line, character: column },
          end: { line, character: column + 1 },
        },
        message: message.replace(/at line \d+, column \d+/, '').trim(),
        source: 'takomusic',
      });

      // Store empty diagnostics on parse failure
      this.parsedDocuments.set(uri, { diagnostics: [] });
    }

    // Send diagnostics to client
    this.connection.sendDiagnostics({ uri, diagnostics });
  }

  /**
   * Get parsed document for a given URI
   */
  getParsedDocument(uri: string): ParsedDocument | undefined {
    return this.parsedDocuments.get(uri);
  }

  /**
   * Clear diagnostics for a closed document
   */
  clearDocument(uri: string): void {
    this.parsedDocuments.delete(uri);
    this.connection.sendDiagnostics({ uri, diagnostics: [] });
  }
}
