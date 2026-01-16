export interface Position {
  line: number;
  column: number;
  offset: number;
}

// Span represents a range in the source code (start to end)
export interface Span {
  start: Position;
  end: Position;
}

// Create a span from start position to end position
export function makeSpan(start: Position, end: Position): Span {
  return { start, end };
}

// Create a span from a single position (zero-width)
export function pointSpan(pos: Position): Span {
  return { start: pos, end: pos };
}

// Create a span covering a token
export function tokenSpan(pos: Position, length: number): Span {
  return {
    start: pos,
    end: { line: pos.line, column: pos.column + length, offset: pos.offset + length },
  };
}

export enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  TEMPLATE_HEAD = 'TEMPLATE_HEAD',
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',
  TEMPLATE_TAIL = 'TEMPLATE_TAIL',
  TEMPLATE_NO_SUBST = 'TEMPLATE_NO_SUBST',
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
  TRY = 'TRY',
  CATCH = 'CATCH',
  GRACE = 'GRACE',
  GLISS = 'GLISS',

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
  QUESTION = 'QUESTION',
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

  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value?: string | number;
  position: Position;
}

export const KEYWORDS: Record<string, TokenType> = {
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
  try: TokenType.TRY,
  catch: TokenType.CATCH,
  grace: TokenType.GRACE,
  gliss: TokenType.GLISS,
};
