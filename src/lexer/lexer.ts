// Lexer (Tokenizer) for MFS language

import { Token, TokenType, Position, KEYWORDS } from '../types/token.js';
import { MFError } from '../errors.js';

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
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
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push(this.makeToken(TokenType.EOF, ''));
    return tokens;
  }

  private nextToken(): Token | null {
    const pos = this.currentPosition();
    const char = this.peek();

    // String literal
    if (char === '"') {
      return this.readString();
    }

    // Number, Pitch, Dur, or Time literal
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekNext()))) {
      return this.readNumberOrTimeLiteral();
    }

    // Pitch literal starting with letter (C, D, E, F, G, A, B)
    if (this.isPitchStart(char)) {
      const pitch = this.tryReadPitch();
      if (pitch) return pitch;
    }

    // Identifier or keyword
    if (this.isAlpha(char)) {
      return this.readIdentifier();
    }

    // Operators and delimiters
    return this.readOperator();
  }

  private readString(): Token {
    const pos = this.currentPosition();
    this.advance(); // consume opening quote
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
            default: value += escaped;
          }
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
      throw new MFError('SYNTAX', 'Unterminated string', pos, this.filePath);
    }

    this.advance(); // consume closing quote
    return { type: TokenType.STRING, value, position: pos };
  }

  private readNumberOrTimeLiteral(): Token {
    const pos = this.currentPosition();
    const start = this.position;

    // Handle negative sign
    if (this.peek() === '-') {
      this.advance();
    }

    // Read integer part
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Check for Time literal (bar:beat or bar:beat:sub)
    if (this.peek() === ':') {
      return this.readTimeLiteral(pos, start);
    }

    // Check for Dur literal (n/d)
    if (this.peek() === '/') {
      return this.readDurLiteral(pos, start);
    }

    // Check for float
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        this.advance();
      }
      const value = this.source.slice(start, this.position);
      return { type: TokenType.FLOAT, value, position: pos };
    }

    const value = this.source.slice(start, this.position);
    return { type: TokenType.INT, value, position: pos };
  }

  private readTimeLiteral(pos: Position, start: number): Token {
    // Already read bar part, now at ':'
    this.advance(); // consume first ':'

    // Read beat
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Optional :sub
    if (this.peek() === ':') {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.slice(start, this.position);
    return { type: TokenType.TIME, value, position: pos };
  }

  private readDurLiteral(pos: Position, start: number): Token {
    // Already read numerator part, now at '/'
    this.advance(); // consume '/'

    // Read denominator
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    const value = this.source.slice(start, this.position);
    return { type: TokenType.DUR, value, position: pos };
  }

  private isPitchStart(char: string): boolean {
    return 'CDEFGAB'.includes(char.toUpperCase());
  }

  private tryReadPitch(): Token | null {
    const pos = this.currentPosition();
    const start = this.position;

    // Read note name (C-G, A-B)
    const noteName = this.peek().toUpperCase();
    if (!'CDEFGAB'.includes(noteName)) {
      return null;
    }
    this.advance();

    // Check for sharp or flat
    const accidental = this.peek();
    if (accidental === '#' || accidental === 'b') {
      this.advance();
    }

    // Must have octave number
    if (!this.isDigit(this.peek()) && this.peek() !== '-') {
      // Not a pitch, backtrack
      this.position = start;
      this.column = pos.column;
      return null;
    }

    // Handle negative octave (rare but possible)
    if (this.peek() === '-') {
      this.advance();
    }

    // Read octave
    if (!this.isDigit(this.peek())) {
      // Not a pitch, backtrack
      this.position = start;
      this.column = pos.column;
      return null;
    }

    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Make sure next char is not alphanumeric (would be identifier)
    if (this.isAlphaNumeric(this.peek())) {
      // Not a pitch, backtrack
      this.position = start;
      this.column = pos.column;
      return null;
    }

    const value = this.source.slice(start, this.position);
    return { type: TokenType.PITCH, value, position: pos };
  }

  private readIdentifier(): Token {
    const pos = this.currentPosition();
    const start = this.position;

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const value = this.source.slice(start, this.position);
    const type = KEYWORDS[value] || TokenType.IDENT;
    return { type, value, position: pos };
  }

  private readOperator(): Token {
    const pos = this.currentPosition();
    const char = this.advance();

    switch (char) {
      case '+': return { type: TokenType.PLUS, value: '+', position: pos };
      case '-': return { type: TokenType.MINUS, value: '-', position: pos };
      case '*': return { type: TokenType.STAR, value: '*', position: pos };
      case '/': return { type: TokenType.SLASH, value: '/', position: pos };
      case '(': return { type: TokenType.LPAREN, value: '(', position: pos };
      case ')': return { type: TokenType.RPAREN, value: ')', position: pos };
      case '{': return { type: TokenType.LBRACE, value: '{', position: pos };
      case '}': return { type: TokenType.RBRACE, value: '}', position: pos };
      case '[': return { type: TokenType.LBRACKET, value: '[', position: pos };
      case ']': return { type: TokenType.RBRACKET, value: ']', position: pos };
      case ',': return { type: TokenType.COMMA, value: ',', position: pos };
      case ';': return { type: TokenType.SEMICOLON, value: ';', position: pos };
      case ':': return { type: TokenType.COLON, value: ':', position: pos };

      case '=':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.EQEQ, value: '==', position: pos };
        }
        return { type: TokenType.EQ, value: '=', position: pos };

      case '!':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.NEQ, value: '!=', position: pos };
        }
        return { type: TokenType.NOT, value: '!', position: pos };

      case '<':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.LTEQ, value: '<=', position: pos };
        }
        return { type: TokenType.LT, value: '<', position: pos };

      case '>':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.GTEQ, value: '>=', position: pos };
        }
        return { type: TokenType.GT, value: '>', position: pos };

      case '&':
        if (this.peek() === '&') {
          this.advance();
          return { type: TokenType.AND, value: '&&', position: pos };
        }
        throw new MFError('SYNTAX', `Unexpected character: ${char}`, pos, this.filePath);

      case '|':
        if (this.peek() === '|') {
          this.advance();
          return { type: TokenType.OR, value: '||', position: pos };
        }
        throw new MFError('SYNTAX', `Unexpected character: ${char}`, pos, this.filePath);

      case '.':
        if (this.peek() === '.') {
          this.advance();
          if (this.peek() === '=') {
            this.advance();
            return { type: TokenType.DOTDOTEQ, value: '..=', position: pos };
          }
          return { type: TokenType.DOTDOT, value: '..', position: pos };
        }
        throw new MFError('SYNTAX', `Unexpected character: ${char}`, pos, this.filePath);

      default:
        throw new MFError('SYNTAX', `Unexpected character: ${char}`, pos, this.filePath);
    }
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else if (char === '/' && this.peekNext() === '/') {
        // Line comment
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
      } else if (char === '/' && this.peekNext() === '*') {
        // Block comment
        this.advance(); // consume /
        this.advance(); // consume *
        while (!this.isAtEnd()) {
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance();
            this.advance();
            break;
          }
          if (this.peek() === '\n') {
            this.line++;
            this.column = 1;
          }
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private advance(): string {
    const char = this.source[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    );
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private currentPosition(): Position {
    return { line: this.line, column: this.column, offset: this.position };
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, position: this.currentPosition() };
  }
}
