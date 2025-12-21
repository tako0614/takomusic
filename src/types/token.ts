// Token types for MFS language

export enum TokenType {
  // Literals
  INT = 'INT',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  PITCH = 'PITCH',
  DUR = 'DUR',
  TIME = 'TIME',

  // Template literals
  TEMPLATE_HEAD = 'TEMPLATE_HEAD',      // `text${
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',  // }text${
  TEMPLATE_TAIL = 'TEMPLATE_TAIL',      // }text`
  TEMPLATE_STRING = 'TEMPLATE_STRING',  // `text` (no interpolation)

  // Identifiers and Keywords
  IDENT = 'IDENT',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  PROC = 'PROC',
  CONST = 'CONST',
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  WHILE = 'WHILE',
  IN = 'IN',
  RETURN = 'RETURN',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  MATCH = 'MATCH',
  CASE = 'CASE',
  DEFAULT = 'DEFAULT',
  AS = 'AS',
  TYPEOF = 'TYPEOF',

  // Track kinds (contextual keywords)
  VOCAL = 'VOCAL',
  MIDI = 'MIDI',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  PLUSEQ = 'PLUSEQ',
  MINUSEQ = 'MINUSEQ',
  STAREQ = 'STAREQ',
  SLASHEQ = 'SLASHEQ',
  PERCENTEQ = 'PERCENTEQ',  // %=
  BITANDEQ = 'BITANDEQ',    // &=
  BITOREQ = 'BITOREQ',      // |=
  BITXOREQ = 'BITXOREQ',    // ^=
  SHLEQ = 'SHLEQ',          // <<=
  SHREQ = 'SHREQ',          // >>=
  EQ = 'EQ',
  EQEQ = 'EQEQ',
  NEQ = 'NEQ',
  LT = 'LT',
  GT = 'GT',
  LTEQ = 'LTEQ',
  GTEQ = 'GTEQ',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  QUESTION = 'QUESTION',      // ? for ternary operator
  QUESTIONDOT = 'QUESTIONDOT', // ?. for optional chaining
  NULLISH = 'NULLISH',        // ?? for nullish coalescing

  // Bitwise operators
  BITAND = 'BITAND',      // &
  BITOR = 'BITOR',        // |
  BITXOR = 'BITXOR',      // ^
  BITNOT = 'BITNOT',      // ~
  SHL = 'SHL',            // <<
  SHR = 'SHR',            // >>

  // Range operators
  DOTDOT = 'DOTDOT',
  DOTDOTEQ = 'DOTDOTEQ',

  // Access and function operators
  DOT = 'DOT',
  ARROW = 'ARROW',
  SPREAD = 'SPREAD',

  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',

  // Special
  EOF = 'EOF',
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

export const KEYWORDS: Record<string, TokenType> = {
  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  proc: TokenType.PROC,
  const: TokenType.CONST,
  let: TokenType.LET,
  if: TokenType.IF,
  else: TokenType.ELSE,
  for: TokenType.FOR,
  while: TokenType.WHILE,
  in: TokenType.IN,
  return: TokenType.RETURN,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
  match: TokenType.MATCH,
  case: TokenType.CASE,
  default: TokenType.DEFAULT,
  as: TokenType.AS,
  typeof: TokenType.TYPEOF,
  vocal: TokenType.VOCAL,
  midi: TokenType.MIDI,
};
