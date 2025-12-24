import { KEYWORDS, TokenType, type Token, type Position } from './token.js';
import { parsePitchLiteral } from './pitch.js';

export class V3Lexer {
  private source: string;
  private index = 0;
  private line = 1;
  private column = 1;
  private filePath?: string;

  constructor(source: string, filePath?: string) {
    this.source = source;
    this.filePath = filePath;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      const token = this.nextToken();
      tokens.push(token);
    }
    tokens.push({ type: TokenType.EOF, position: this.currentPosition() });
    return tokens;
  }

  private nextToken(): Token {
    const pos = this.currentPosition();
    const ch = this.peek();

    if (ch === '"') return this.readString();

    if (this.isDigit(ch)) {
      const numberToken = this.readNumberLike();
      if (numberToken) return numberToken;
    }

    if (this.isPitchStart(ch)) {
      const pitch = this.tryReadPitch();
      if (pitch) return pitch;
    }

    if (this.isDurStart(ch)) {
      const dur = this.tryReadDurLiteral();
      if (dur) return dur;
    }

    if (this.isAlpha(ch)) {
      return this.readIdentifier();
    }

    return this.readOperator();
  }

  private readString(): Token {
    const pos = this.currentPosition();
    this.advance();
    let value = '';
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        if (this.isAtEnd()) break;
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += escaped; break;
        }
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 1;
        }
        value += this.advance();
      }
    }
    if (this.isAtEnd()) {
      throw this.error('Unterminated string literal', pos);
    }
    this.advance();
    return { type: TokenType.STRING, value, position: pos };
  }

  private readNumberLike(): Token | null {
    const pos = this.currentPosition();
    const start = this.index;
    let hasDot = false;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      hasDot = true;
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const numberText = this.source.slice(start, this.index);

    if (this.peek() === ':' && this.isDigit(this.peekNext())) {
      this.advance();
      const bar = parseInt(numberText, 10);
      const beatStart = this.index;
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
      const beatText = this.source.slice(beatStart, this.index);
      const beat = parseInt(beatText, 10);
      return { type: TokenType.POSREF, value: `${bar}:${beat}`, position: pos };
    }

    if (this.peek() === 'b' && this.peekNext() === 'p' && this.peekNextNext() === 'm') {
      this.advance();
      this.advance();
      this.advance();
      const value = parseFloat(numberText);
      return { type: TokenType.BPM, value, position: pos };
    }

    const value = parseFloat(numberText);
    return { type: TokenType.NUMBER, value, position: pos };
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
        break;
      case '.':
        if (this.match('.')) return { type: TokenType.DOTDOT, position: pos };
        return { type: TokenType.DOT, position: pos };
      case ',': return { type: TokenType.COMMA, position: pos };
      case ';': return { type: TokenType.SEMI, position: pos };
      case ':': return { type: TokenType.COLON, position: pos };
      case '@': return { type: TokenType.AT, position: pos };
      case '(':
        return { type: TokenType.LPAREN, position: pos };
      case ')':
        return { type: TokenType.RPAREN, position: pos };
      case '{':
        return { type: TokenType.LBRACE, position: pos };
      case '}':
        return { type: TokenType.RBRACE, position: pos };
      case '[':
        return { type: TokenType.LBRACKET, position: pos };
      case ']':
        return { type: TokenType.RBRACKET, position: pos };
      default:
        break;
    }

    throw this.error(`Unexpected character: ${ch}`, pos);
  }

  private tryReadPitch(): Token | null {
    const pos = this.currentPosition();
    const start = this.index;
    const maxLen = 10;
    let len = 1;
    while (!this.isAtEnd() && len <= maxLen) {
      const text = this.source.slice(start, start + len);
      try {
        parsePitchLiteral(text);
        if (!this.isAlphaNumeric(this.charAt(start + len))) {
          this.advanceBy(len);
          return { type: TokenType.PITCH, value: text, position: pos };
        }
      } catch {
        // ignore
      }
      len++;
    }
    return null;
  }

  private tryReadDurLiteral(): Token | null {
    const pos = this.currentPosition();
    const ch = this.peek();
    const base = 'whqestx';
    if (base.indexOf(ch) === -1) return null;
    const next = this.peekNext();
    if (this.isAlphaNumeric(next)) return null;
    this.advance();
    if (next === '.') {
      this.advance();
      return { type: TokenType.DUR, value: `${ch}.`, position: pos };
    }
    return { type: TokenType.DUR, value: ch, position: pos };
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n') {
        this.advance();
        continue;
      }
      if (ch === '/' && this.peekNext() === '/') {
        this.advance();
        this.advance();
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

  private peekNextNext(): string {
    return this.source[this.index + 2] ?? '\0';
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

  private advanceBy(count: number): void {
    for (let i = 0; i < count; i++) {
      this.advance();
    }
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

  private isPitchStart(ch: string): boolean {
    return 'ABCDEFG'.indexOf(ch) !== -1;
  }

  private isDurStart(ch: string): boolean {
    return 'whqestx'.indexOf(ch) !== -1;
  }

  private error(message: string, position: Position): Error {
    const loc = this.filePath ? `${this.filePath}:${position.line}:${position.column}` : `${position.line}:${position.column}`;
    return new Error(`[v3 lexer] ${message} at ${loc}`);
  }
}
