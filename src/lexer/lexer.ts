// Lexer (Tokenizer) for MFS language

import { Token, TokenType, Position, KEYWORDS } from '../types/token.js';
import { MFError } from '../errors.js';

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private filePath?: string;
  private templateStack: number = 0; // Track nested template literals
  private inTemplateExpr: boolean = false; // Are we inside ${...}?

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

    // Template literal
    if (char === '`') {
      return this.readTemplateStart();
    }

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

  private readTemplateStart(): Token {
    const pos = this.currentPosition();
    this.advance(); // consume opening backtick
    let value = '';

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === '`') {
        // End of template, no interpolation
        this.advance();
        return { type: TokenType.TEMPLATE_STRING, value, position: pos };
      }

      if (char === '$' && this.peekNext() === '{') {
        // Start of interpolation
        this.advance(); // consume $
        this.advance(); // consume {
        this.templateStack++;
        this.inTemplateExpr = true;
        return { type: TokenType.TEMPLATE_HEAD, value, position: pos };
      }

      if (char === '\\') {
        // Escape sequence
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '`': value += '`'; break;
            case '$': value += '$'; break;
            default: value += escaped;
          }
        }
      } else {
        if (char === '\n') {
          this.line++;
          this.column = 1;
        }
        value += this.advance();
      }
    }

    throw new MFError('SYNTAX', 'Unterminated template literal', pos, this.filePath);
  }

  private readTemplateMiddle(pos: Position): Token {
    // We're at the closing } of a template expression
    // Continue reading template content
    let value = '';

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === '`') {
        // End of template
        this.advance();
        this.templateStack--;
        this.inTemplateExpr = this.templateStack > 0;
        return { type: TokenType.TEMPLATE_TAIL, value, position: pos };
      }

      if (char === '$' && this.peekNext() === '{') {
        // Another interpolation
        this.advance(); // consume $
        this.advance(); // consume {
        return { type: TokenType.TEMPLATE_MIDDLE, value, position: pos };
      }

      if (char === '\\') {
        // Escape sequence
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '`': value += '`'; break;
            case '$': value += '$'; break;
            default: value += escaped;
          }
        }
      } else {
        if (char === '\n') {
          this.line++;
          this.column = 1;
        }
        value += this.advance();
      }
    }

    throw new MFError('SYNTAX', 'Unterminated template literal', pos, this.filePath);
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

    // Read optional dots for dotted notes (1/4., 1/4..)
    while (this.peek() === '.') {
      this.advance();
    }

    const value = this.source.slice(start, this.position);
    return { type: TokenType.DUR, value, position: pos };
  }

  private isPitchStart(char: string): boolean {
    // Only uppercase letters are pitch starts (C4, E5, etc.)
    // Lowercase letters like 'e5' are identifiers
    return 'CDEFGAB'.includes(char);
  }

  private tryReadPitch(): Token | null {
    const pos = this.currentPosition();
    const start = this.position;

    // Read note name (C-G, A-B)
    const noteName = this.peek();
    if (!'CDEFGAB'.includes(noteName)) {
      return null;
    }
    this.advance();

    // Check for accidentals (supports single and double sharps/flats)
    const accidental = this.peek();
    if (accidental === '#') {
      this.advance();
      // Check for double sharp (##)
      if (this.peek() === '#') {
        this.advance();
      }
    } else if (accidental === 'x') {
      // 'x' notation for double sharp (Cx = C##)
      this.advance();
    } else if (accidental === 'b') {
      this.advance();
      // Check for double flat (bb)
      if (this.peek() === 'b') {
        this.advance();
      }
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
      case '+':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.PLUSEQ, value: '+=', position: pos };
        }
        return { type: TokenType.PLUS, value: '+', position: pos };
      case '-':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.MINUSEQ, value: '-=', position: pos };
        }
        return { type: TokenType.MINUS, value: '-', position: pos };
      case '*':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.STAREQ, value: '*=', position: pos };
        }
        return { type: TokenType.STAR, value: '*', position: pos };
      case '/':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.SLASHEQ, value: '/=', position: pos };
        }
        return { type: TokenType.SLASH, value: '/', position: pos };
      case '%':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.PERCENTEQ, value: '%=', position: pos };
        }
        return { type: TokenType.PERCENT, value: '%', position: pos };
      case '(': return { type: TokenType.LPAREN, value: '(', position: pos };
      case ')': return { type: TokenType.RPAREN, value: ')', position: pos };
      case '{': return { type: TokenType.LBRACE, value: '{', position: pos };
      case '}':
        // Check if we're closing a template expression
        if (this.inTemplateExpr) {
          return this.readTemplateMiddle(pos);
        }
        return { type: TokenType.RBRACE, value: '}', position: pos };
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
        if (this.peek() === '>') {
          this.advance();
          return { type: TokenType.ARROW, value: '=>', position: pos };
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
        if (this.peek() === '<') {
          this.advance();
          if (this.peek() === '=') {
            this.advance();
            return { type: TokenType.SHLEQ, value: '<<=', position: pos };
          }
          return { type: TokenType.SHL, value: '<<', position: pos };
        }
        return { type: TokenType.LT, value: '<', position: pos };

      case '>':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.GTEQ, value: '>=', position: pos };
        }
        if (this.peek() === '>') {
          this.advance();
          if (this.peek() === '=') {
            this.advance();
            return { type: TokenType.SHREQ, value: '>>=', position: pos };
          }
          return { type: TokenType.SHR, value: '>>', position: pos };
        }
        return { type: TokenType.GT, value: '>', position: pos };

      case '&':
        if (this.peek() === '&') {
          this.advance();
          return { type: TokenType.AND, value: '&&', position: pos };
        }
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.BITANDEQ, value: '&=', position: pos };
        }
        return { type: TokenType.BITAND, value: '&', position: pos };

      case '|':
        if (this.peek() === '|') {
          this.advance();
          return { type: TokenType.OR, value: '||', position: pos };
        }
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.BITOREQ, value: '|=', position: pos };
        }
        return { type: TokenType.BITOR, value: '|', position: pos };

      case '^':
        if (this.peek() === '=') {
          this.advance();
          return { type: TokenType.BITXOREQ, value: '^=', position: pos };
        }
        return { type: TokenType.BITXOR, value: '^', position: pos };

      case '~':
        return { type: TokenType.BITNOT, value: '~', position: pos };

      case '.':
        if (this.peek() === '.') {
          this.advance();
          if (this.peek() === '.') {
            this.advance();
            return { type: TokenType.SPREAD, value: '...', position: pos };
          }
          if (this.peek() === '=') {
            this.advance();
            return { type: TokenType.DOTDOTEQ, value: '..=', position: pos };
          }
          return { type: TokenType.DOTDOT, value: '..', position: pos };
        }
        return { type: TokenType.DOT, value: '.', position: pos };

      case '?':
        if (this.peek() === '.') {
          this.advance();
          return { type: TokenType.QUESTIONDOT, value: '?.', position: pos };
        }
        if (this.peek() === '?') {
          this.advance();
          return { type: TokenType.NULLISH, value: '??', position: pos };
        }
        return { type: TokenType.QUESTION, value: '?', position: pos };

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
        // Block comment with nesting support
        this.advance(); // consume /
        this.advance(); // consume *
        let depth = 1;
        while (!this.isAtEnd() && depth > 0) {
          if (this.peek() === '/' && this.peekNext() === '*') {
            // Nested block comment start
            this.advance();
            this.advance();
            depth++;
          } else if (this.peek() === '*' && this.peekNext() === '/') {
            // Block comment end
            this.advance();
            this.advance();
            depth--;
          } else {
            if (this.peek() === '\n') {
              this.line++;
              this.column = 1;
            }
            this.advance();
          }
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
