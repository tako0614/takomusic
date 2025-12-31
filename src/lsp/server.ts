/**
 * TakoMusic Language Server
 *
 * Provides LSP features for TakoMusic v4:
 * - Diagnostics (real-time error checking)
 * - Hover information
 * - Code completion
 * - Document symbols
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  Hover,
  CompletionItem,
  CompletionItemKind,
  DocumentSymbol,
  SymbolKind,
  DiagnosticSeverity,
  Diagnostic as LspDiagnostic,
  Position as LspPosition,
  Range,
  Location,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  MarkupKind,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { V4Lexer } from '../lexer.js';
import { V4Parser } from '../parser.js';
import { typeCheckProgram } from '../typecheck.js';
import type { Diagnostic } from '../diagnostics.js';
import type { Program, FnDecl, ConstDecl } from '../ast.js';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Parsed documents cache
const parsedDocuments = new Map<string, { program?: Program; diagnostics: Diagnostic[] }>();

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: ['.', ':', '"', '('],
        resolveProvider: false,
      },
      documentSymbolProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
      },
    },
  };
});

// Validate document and send diagnostics
async function validateDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const uri = textDocument.uri;
  const diagnostics: LspDiagnostic[] = [];
  const mfDiagnostics: Diagnostic[] = [];

  try {
    // Lexer and Parser
    const lexer = new V4Lexer(text);
    const tokens = lexer.tokenize();
    const parser = new V4Parser(tokens);
    const program = parser.parseProgram();

    // Type checking
    typeCheckProgram(program, mfDiagnostics, uri);

    // Store parsed program
    parsedDocuments.set(uri, { program, diagnostics: mfDiagnostics });
  } catch (err) {
    // Parse error
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

    parsedDocuments.set(uri, { diagnostics: mfDiagnostics });
  }

  // Convert MF diagnostics to LSP diagnostics
  for (const diag of mfDiagnostics) {
    const pos = diag.position;
    const range: Range = pos
      ? {
          start: { line: pos.line - 1, character: pos.column - 1 },
          end: { line: pos.line - 1, character: pos.column },
        }
      : {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        };

    diagnostics.push({
      severity:
        diag.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      range,
      message: diag.message,
      source: 'takomusic',
      code: diag.code,
    });
  }

  connection.sendDiagnostics({ uri, diagnostics });
}

// Document change handler
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

// Hover provider
connection.onHover((params): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const parsed = parsedDocuments.get(params.textDocument.uri);
  if (!parsed?.program) return null;

  const position = params.position;
  const offset = document.offsetAt(position);
  const text = document.getText();

  // Get word at position
  const wordRange = getWordRangeAtPosition(text, offset);
  if (!wordRange) return null;

  const word = text.slice(wordRange.start, wordRange.end);

  // Find hover info
  const hoverInfo = getHoverInfo(word, parsed.program);
  if (!hoverInfo) return null;

  return {
    contents: {
      kind: 'markdown',
      value: hoverInfo,
    },
  };
});

function getWordRangeAtPosition(
  text: string,
  offset: number
): { start: number; end: number } | null {
  const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let match;
  while ((match = wordPattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return { start, end };
    }
    if (start > offset) break;
  }
  return null;
}

function getHoverInfo(word: string, program: Program): string | null {
  // Check if it's a function
  for (const decl of program.body) {
    if (decl.kind === 'FnDecl' && decl.name === word) {
      const fn = decl as FnDecl;
      const params = fn.params.map((p) => `${p.name}: ${p.type?.name ?? 'Any'}`).join(', ');
      const returnType = fn.returnType?.name ?? 'Any';
      return `\`\`\`takomusic\nfn ${word}(${params}) -> ${returnType}\n\`\`\``;
    }
    if (decl.kind === 'ConstDecl' && decl.name === word) {
      const c = decl as ConstDecl;
      const type = c.type?.name ?? 'inferred';
      return `\`\`\`takomusic\nconst ${word}: ${type}\n\`\`\``;
    }
  }

  // Built-in functions and types
  const builtins = getBuiltinDocs();
  if (builtins[word]) {
    return builtins[word];
  }

  return null;
}

function getBuiltinDocs(): Record<string, string> {
  return {
    // Clip statements
    note: '```takomusic\nnote(pitch, duration, [options])\n```\nCreate a musical note.\n- `pitch`: Note pitch (e.g., C4, D#5)\n- `duration`: Note duration (e.g., q, h, w)',
    rest: '```takomusic\nrest(duration)\n```\nCreate a rest (silence).\n- `duration`: Rest duration (e.g., q, h)',
    chord: '```takomusic\nchord(pitches, duration, [options])\n```\nCreate a chord from multiple pitches.',
    // Time values
    q: 'Quarter note duration',
    h: 'Half note duration',
    w: 'Whole note duration',
    e: 'Eighth note duration',
    s: 'Sixteenth note duration',
    // Score elements
    score: 'Define a music score with tracks, tempo, and meter',
    clip: 'Define a musical clip containing notes and rests',
    track: 'Define a track in the score',
    sound: 'Define a sound source (instrument, drumkit, vocal)',
    tempo: 'Define tempo map for the score',
    meter: 'Define time signature map for the score',
    // Standard library
    repeat: '```takomusic\nrepeat(clip, count) -> Clip\n```\nRepeat a clip multiple times.',
    concat: '```takomusic\nconcat(...clips) -> Clip\n```\nConcatenate clips sequentially.',
    overlay: '```takomusic\noverlay(...clips) -> Clip\n```\nOverlay clips (play simultaneously).',
    // Types
    Score: 'Score type - represents a complete musical score',
    Clip: 'Clip type - represents a sequence of musical events',
    Int: 'Integer type',
    Float: 'Floating point number type',
    String: 'String type',
    Bool: 'Boolean type',
    Array: 'Array type',
    Pos: 'Position type - represents a point in time (bar:beat)',
    Dur: 'Duration type - represents a length of time',
  };
}

// Completion provider
connection.onCompletion((params): CompletionItem[] => {
  const items: CompletionItem[] = [];

  // Keywords
  const keywords = [
    'fn',
    'const',
    'let',
    'if',
    'else',
    'for',
    'in',
    'return',
    'match',
    'import',
    'export',
    'from',
    'score',
    'clip',
    'track',
    'sound',
    'tempo',
    'meter',
    'meta',
    'place',
    'note',
    'rest',
    'chord',
  ];

  for (const kw of keywords) {
    items.push({
      label: kw,
      kind: CompletionItemKind.Keyword,
    });
  }

  // Types
  const types = ['Score', 'Clip', 'Int', 'Float', 'String', 'Bool', 'Array', 'Pos', 'Dur'];
  for (const t of types) {
    items.push({
      label: t,
      kind: CompletionItemKind.Class,
    });
  }

  // Standard library functions
  const stdlib = ['repeat', 'concat', 'overlay', 'slice', 'mapEvents'];
  for (const fn of stdlib) {
    items.push({
      label: fn,
      kind: CompletionItemKind.Function,
    });
  }

  // Duration literals
  const durations = [
    { label: 'w', detail: 'Whole note' },
    { label: 'h', detail: 'Half note' },
    { label: 'q', detail: 'Quarter note' },
    { label: 'e', detail: 'Eighth note' },
    { label: 's', detail: 'Sixteenth note' },
  ];
  for (const d of durations) {
    items.push({
      label: d.label,
      kind: CompletionItemKind.Constant,
      detail: d.detail,
    });
  }

  // Add functions from current document
  const parsed = parsedDocuments.get(params.textDocument.uri);
  if (parsed?.program) {
    for (const decl of parsed.program.body) {
      if (decl.kind === 'FnDecl') {
        const fn = decl as FnDecl;
        items.push({
          label: fn.name,
          kind: CompletionItemKind.Function,
          detail: `(${fn.params.map((p) => p.name).join(', ')})`,
        });
      }
      if (decl.kind === 'ConstDecl') {
        const c = decl as ConstDecl;
        items.push({
          label: c.name,
          kind: CompletionItemKind.Constant,
        });
      }
    }
  }

  return items;
});

// Document symbols provider
connection.onDocumentSymbol((params): DocumentSymbol[] => {
  const parsed = parsedDocuments.get(params.textDocument.uri);
  if (!parsed?.program) return [];

  const symbols: DocumentSymbol[] = [];

  for (const decl of parsed.program.body) {
    if (decl.kind === 'FnDecl') {
      const fn = decl as FnDecl;
      const range: Range = {
        start: { line: fn.position.line - 1, character: fn.position.column - 1 },
        end: { line: fn.position.line - 1, character: fn.position.column + fn.name.length },
      };
      symbols.push({
        name: fn.name,
        kind: SymbolKind.Function,
        range,
        selectionRange: range,
        detail: fn.returnType?.name,
      });
    }
    if (decl.kind === 'ConstDecl') {
      const c = decl as ConstDecl;
      const range: Range = {
        start: { line: c.position.line - 1, character: c.position.column - 1 },
        end: { line: c.position.line - 1, character: c.position.column + c.name.length },
      };
      symbols.push({
        name: c.name,
        kind: SymbolKind.Constant,
        range,
        selectionRange: range,
      });
    }
    if (decl.kind === 'TypeAliasDecl') {
      const t = decl;
      const range: Range = {
        start: { line: t.position.line - 1, character: t.position.column - 1 },
        end: { line: t.position.line - 1, character: t.position.column + t.name.length },
      };
      symbols.push({
        name: t.name,
        kind: SymbolKind.TypeParameter,
        range,
        selectionRange: range,
        detail: `= ${t.typeExpr.name}`,
      });
    }
  }

  return symbols;
});

// Go to definition
connection.onDefinition((params): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const parsed = parsedDocuments.get(params.textDocument.uri);
  if (!parsed?.program) return null;

  const position = params.position;
  const offset = document.offsetAt(position);
  const text = document.getText();

  // Get word at position
  const wordRange = getWordRangeAtPosition(text, offset);
  if (!wordRange) return null;

  const word = text.slice(wordRange.start, wordRange.end);

  // Find definition in current document
  for (const decl of parsed.program.body) {
    if (decl.kind === 'FnDecl' && decl.name === word) {
      return {
        uri: params.textDocument.uri,
        range: {
          start: { line: decl.position.line - 1, character: decl.position.column - 1 },
          end: { line: decl.position.line - 1, character: decl.position.column + word.length },
        },
      };
    }
    if (decl.kind === 'ConstDecl' && decl.name === word) {
      return {
        uri: params.textDocument.uri,
        range: {
          start: { line: decl.position.line - 1, character: decl.position.column - 1 },
          end: { line: decl.position.line - 1, character: decl.position.column + word.length },
        },
      };
    }
  }

  // Check imports
  for (const imp of parsed.program.imports) {
    if (imp.spec.kind === 'ImportNamed') {
      if (imp.spec.names.includes(word)) {
        // Return the import location (can't jump to std lib)
        return {
          uri: params.textDocument.uri,
          range: {
            start: { line: imp.position.line - 1, character: imp.position.column - 1 },
            end: { line: imp.position.line - 1, character: imp.position.column + 10 },
          },
        };
      }
    }
    if (imp.spec.kind === 'ImportAll' && imp.spec.alias === word) {
      return {
        uri: params.textDocument.uri,
        range: {
          start: { line: imp.position.line - 1, character: imp.position.column - 1 },
          end: { line: imp.position.line - 1, character: imp.position.column + 10 },
        },
      };
    }
  }

  return null;
});

// Find references
connection.onReferences((params): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const position = params.position;
  const offset = document.offsetAt(position);
  const text = document.getText();

  // Get word at position
  const wordRange = getWordRangeAtPosition(text, offset);
  if (!wordRange) return [];

  const word = text.slice(wordRange.start, wordRange.end);

  // Find all occurrences of the word
  const locations: Location[] = [];
  const wordPattern = new RegExp(`\\b${word}\\b`, 'g');
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + word.length);
    locations.push({
      uri: params.textDocument.uri,
      range: {
        start: startPos,
        end: endPos,
      },
    });
  }

  return locations;
});

// Signature help
connection.onSignatureHelp((params): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Find the function call context
  const context = getFunctionCallContext(text, offset);
  if (!context) return null;

  const { functionName, paramIndex } = context;

  // Get signature from parsed document or builtins
  const parsed = parsedDocuments.get(params.textDocument.uri);
  let signature: SignatureInformation | null = null;

  // Check user-defined functions
  if (parsed?.program) {
    for (const decl of parsed.program.body) {
      if (decl.kind === 'FnDecl' && decl.name === functionName) {
        const fn = decl as FnDecl;
        const params = fn.params.map((p) => `${p.name}: ${p.type?.name ?? 'Any'}`);
        const returnType = fn.returnType?.name ?? 'Any';
        signature = {
          label: `${functionName}(${params.join(', ')}) -> ${returnType}`,
          documentation: { kind: MarkupKind.Markdown, value: `User-defined function \`${functionName}\`` },
          parameters: fn.params.map((p) => ({
            label: `${p.name}: ${p.type?.name ?? 'Any'}`,
            documentation: `Parameter \`${p.name}\``,
          })),
        };
        break;
      }
    }
  }

  // Check builtin functions
  if (!signature) {
    signature = getBuiltinSignature(functionName);
  }

  if (!signature) return null;

  return {
    signatures: [signature],
    activeSignature: 0,
    activeParameter: paramIndex,
  };
});

function getFunctionCallContext(
  text: string,
  offset: number
): { functionName: string; paramIndex: number } | null {
  // Walk backwards to find the opening paren
  let depth = 0;
  let paramIndex = 0;
  let parenStart = -1;

  for (let i = offset - 1; i >= 0; i--) {
    const char = text[i];
    if (char === ')') {
      depth++;
    } else if (char === '(') {
      if (depth === 0) {
        parenStart = i;
        break;
      }
      depth--;
    } else if (char === ',' && depth === 0) {
      paramIndex++;
    }
  }

  if (parenStart === -1) return null;

  // Find the function name before the paren
  const beforeParen = text.slice(0, parenStart);
  const match = beforeParen.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
  if (!match) return null;

  return { functionName: match[1], paramIndex };
}

function getBuiltinSignature(name: string): SignatureInformation | null {
  const signatures: Record<string, SignatureInformation> = {
    note: {
      label: 'note(pitch, duration, [vel: Float], [voice: Int])',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a musical note' },
      parameters: [
        { label: 'pitch', documentation: 'Note pitch (e.g., C4, D#5)' },
        { label: 'duration', documentation: 'Note duration (e.g., q, h, w)' },
        { label: 'vel: Float', documentation: 'Velocity (0.0-1.0)' },
        { label: 'voice: Int', documentation: 'Voice number' },
      ],
    },
    rest: {
      label: 'rest(duration)',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a rest (silence)' },
      parameters: [{ label: 'duration', documentation: 'Rest duration (e.g., q, h)' }],
    },
    chord: {
      label: 'chord(pitches, duration, [vel: Float])',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a chord from multiple pitches' },
      parameters: [
        { label: 'pitches', documentation: 'Array of pitches (e.g., [C4, E4, G4])' },
        { label: 'duration', documentation: 'Chord duration' },
        { label: 'vel: Float', documentation: 'Velocity (0.0-1.0)' },
      ],
    },
    hit: {
      label: 'hit(key, duration, [vel: Float])',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a drum hit' },
      parameters: [
        { label: 'key', documentation: 'Drum key (e.g., kick, snare)' },
        { label: 'duration', documentation: 'Hit duration' },
        { label: 'vel: Float', documentation: 'Velocity (0.0-1.0)' },
      ],
    },
    repeat: {
      label: 'repeat(clip, count) -> Clip',
      documentation: { kind: MarkupKind.Markdown, value: 'Repeat a clip multiple times' },
      parameters: [
        { label: 'clip', documentation: 'The clip to repeat' },
        { label: 'count', documentation: 'Number of times to repeat' },
      ],
    },
    concat: {
      label: 'concat(a, b) -> Clip',
      documentation: { kind: MarkupKind.Markdown, value: 'Concatenate two clips sequentially' },
      parameters: [
        { label: 'a', documentation: 'First clip' },
        { label: 'b', documentation: 'Second clip' },
      ],
    },
    overlay: {
      label: 'overlay(a, b) -> Clip',
      documentation: { kind: MarkupKind.Markdown, value: 'Overlay two clips (play simultaneously)' },
      parameters: [
        { label: 'a', documentation: 'First clip' },
        { label: 'b', documentation: 'Second clip' },
      ],
    },
    majorTriad: {
      label: 'majorTriad(root) -> Array',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a major triad chord' },
      parameters: [{ label: 'root', documentation: 'Root pitch (e.g., C4)' }],
    },
    minorTriad: {
      label: 'minorTriad(root) -> Array',
      documentation: { kind: MarkupKind.Markdown, value: 'Create a minor triad chord' },
      parameters: [{ label: 'root', documentation: 'Root pitch (e.g., A4)' }],
    },
    scaleMajor: {
      label: 'scaleMajor(root) -> Array',
      documentation: { kind: MarkupKind.Markdown, value: 'Get notes of a major scale' },
      parameters: [{ label: 'root', documentation: 'Root pitch' }],
    },
    scaleMinor: {
      label: 'scaleMinor(root) -> Array',
      documentation: { kind: MarkupKind.Markdown, value: 'Get notes of a minor scale' },
      parameters: [{ label: 'root', documentation: 'Root pitch' }],
    },
  };

  return signatures[name] ?? null;
}

// Document lifecycle
documents.onDidClose((e) => {
  parsedDocuments.delete(e.document.uri);
});

// Start listening
documents.listen(connection);
connection.listen();
