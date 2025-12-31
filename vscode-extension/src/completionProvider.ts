/**
 * Completion Provider for TakoMusic DSL
 *
 * Provides code completion for keywords, standard library functions,
 * and user-defined symbols.
 */

import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  InsertTextFormat,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';

import {
  DiagnosticProvider,
  Program,
  FnDecl,
  ConstDecl,
  EnumDecl,
} from './diagnosticProvider';

export class CompletionProvider {
  private documents: TextDocuments<TextDocument>;
  private diagnosticProvider: DiagnosticProvider;

  constructor(
    documents: TextDocuments<TextDocument>,
    diagnosticProvider: DiagnosticProvider
  ) {
    this.documents = documents;
    this.diagnosticProvider = diagnosticProvider;
  }

  /**
   * Handle completion requests
   */
  onCompletion(params: CompletionParams): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Add keywords
    items.push(...this.getKeywordCompletions());

    // Add types
    items.push(...this.getTypeCompletions());

    // Add standard library functions
    items.push(...this.getStdlibCompletions());

    // Add duration literals
    items.push(...this.getDurationCompletions());

    // Add snippet completions
    items.push(...this.getSnippetCompletions());

    // Add symbols from current document
    const parsed = this.diagnosticProvider.getParsedDocument(params.textDocument.uri);
    if (parsed?.program) {
      items.push(...this.getDocumentSymbolCompletions(parsed.program));
    }

    return items;
  }

  /**
   * Get keyword completions
   */
  private getKeywordCompletions(): CompletionItem[] {
    const keywords = [
      { label: 'fn', detail: 'Function declaration' },
      { label: 'const', detail: 'Constant declaration' },
      { label: 'let', detail: 'Variable declaration' },
      { label: 'if', detail: 'Conditional expression' },
      { label: 'else', detail: 'Else branch' },
      { label: 'for', detail: 'For loop' },
      { label: 'in', detail: 'In operator' },
      { label: 'return', detail: 'Return statement' },
      { label: 'match', detail: 'Pattern matching' },
      { label: 'import', detail: 'Import declaration' },
      { label: 'export', detail: 'Export modifier' },
      { label: 'from', detail: 'Import source' },
      { label: 'true', detail: 'Boolean true' },
      { label: 'false', detail: 'Boolean false' },
      { label: 'null', detail: 'Null value' },
      { label: 'type', detail: 'Type alias' },
      { label: 'enum', detail: 'Enumeration' },
      { label: 'as', detail: 'Type cast / alias' },
    ];

    return keywords.map((kw) => ({
      label: kw.label,
      kind: CompletionItemKind.Keyword,
      detail: kw.detail,
    }));
  }

  /**
   * Get type completions
   */
  private getTypeCompletions(): CompletionItem[] {
    const types = [
      { label: 'Score', detail: 'Musical score type' },
      { label: 'Clip', detail: 'Musical clip type' },
      { label: 'Int', detail: 'Integer type' },
      { label: 'Float', detail: 'Floating point type' },
      { label: 'String', detail: 'String type' },
      { label: 'Bool', detail: 'Boolean type' },
      { label: 'Array', detail: 'Array type' },
      { label: 'Pitch', detail: 'Musical pitch type' },
      { label: 'Dur', detail: 'Duration type' },
      { label: 'Pos', detail: 'Position type' },
      { label: 'Bpm', detail: 'Tempo type' },
      { label: 'Any', detail: 'Any type' },
    ];

    return types.map((t) => ({
      label: t.label,
      kind: CompletionItemKind.Class,
      detail: t.detail,
    }));
  }

  /**
   * Get standard library function completions
   */
  private getStdlibCompletions(): CompletionItem[] {
    const stdlib = [
      // Score elements
      { label: 'score', detail: 'Define a music score', kind: CompletionItemKind.Keyword },
      { label: 'clip', detail: 'Define a musical clip', kind: CompletionItemKind.Keyword },
      { label: 'track', detail: 'Define a track', kind: CompletionItemKind.Keyword },
      { label: 'sound', detail: 'Define a sound source', kind: CompletionItemKind.Keyword },
      { label: 'tempo', detail: 'Define tempo', kind: CompletionItemKind.Keyword },
      { label: 'meter', detail: 'Define time signature', kind: CompletionItemKind.Keyword },
      { label: 'meta', detail: 'Define metadata', kind: CompletionItemKind.Keyword },
      { label: 'place', detail: 'Place clip at position', kind: CompletionItemKind.Keyword },

      // Clip statements
      { label: 'note', detail: 'Create a note', kind: CompletionItemKind.Function },
      { label: 'rest', detail: 'Create a rest', kind: CompletionItemKind.Function },
      { label: 'chord', detail: 'Create a chord', kind: CompletionItemKind.Function },
      { label: 'hit', detail: 'Create a drum hit', kind: CompletionItemKind.Function },

      // Clip operations
      { label: 'repeat', detail: 'Repeat a clip', kind: CompletionItemKind.Function },
      { label: 'concat', detail: 'Concatenate clips', kind: CompletionItemKind.Function },
      { label: 'overlay', detail: 'Overlay clips', kind: CompletionItemKind.Function },
      { label: 'slice', detail: 'Slice a clip', kind: CompletionItemKind.Function },
      { label: 'mapEvents', detail: 'Map over events', kind: CompletionItemKind.Function },
      { label: 'transpose', detail: 'Transpose a clip', kind: CompletionItemKind.Function },
      { label: 'reverse', detail: 'Reverse a clip', kind: CompletionItemKind.Function },

      // Chord/Scale functions
      { label: 'majorTriad', detail: 'Create major triad', kind: CompletionItemKind.Function },
      { label: 'minorTriad', detail: 'Create minor triad', kind: CompletionItemKind.Function },
      { label: 'scaleMajor', detail: 'Get major scale', kind: CompletionItemKind.Function },
      { label: 'scaleMinor', detail: 'Get minor scale', kind: CompletionItemKind.Function },

      // Array functions
      { label: 'len', detail: 'Get length', kind: CompletionItemKind.Function },
      { label: 'push', detail: 'Add to array', kind: CompletionItemKind.Function },
      { label: 'map', detail: 'Map over array', kind: CompletionItemKind.Function },
      { label: 'filter', detail: 'Filter array', kind: CompletionItemKind.Function },
      { label: 'reduce', detail: 'Reduce array', kind: CompletionItemKind.Function },
      { label: 'range', detail: 'Create range', kind: CompletionItemKind.Function },
      { label: 'flatten', detail: 'Flatten nested arrays', kind: CompletionItemKind.Function },
      { label: 'zip', detail: 'Zip arrays together', kind: CompletionItemKind.Function },

      // Math functions
      { label: 'random', detail: 'Random float 0-1', kind: CompletionItemKind.Function },
      { label: 'randomInt', detail: 'Random integer', kind: CompletionItemKind.Function },
      { label: 'floor', detail: 'Round down', kind: CompletionItemKind.Function },
      { label: 'ceil', detail: 'Round up', kind: CompletionItemKind.Function },
      { label: 'round', detail: 'Round nearest', kind: CompletionItemKind.Function },
      { label: 'abs', detail: 'Absolute value', kind: CompletionItemKind.Function },
      { label: 'min', detail: 'Minimum value', kind: CompletionItemKind.Function },
      { label: 'max', detail: 'Maximum value', kind: CompletionItemKind.Function },
      { label: 'pow', detail: 'Power function', kind: CompletionItemKind.Function },
      { label: 'sqrt', detail: 'Square root', kind: CompletionItemKind.Function },
      { label: 'sin', detail: 'Sine function', kind: CompletionItemKind.Function },
      { label: 'cos', detail: 'Cosine function', kind: CompletionItemKind.Function },

      // String functions
      { label: 'split', detail: 'Split string', kind: CompletionItemKind.Function },
      { label: 'join', detail: 'Join array', kind: CompletionItemKind.Function },
      { label: 'trim', detail: 'Trim whitespace', kind: CompletionItemKind.Function },
      { label: 'toLowerCase', detail: 'To lowercase', kind: CompletionItemKind.Function },
      { label: 'toUpperCase', detail: 'To uppercase', kind: CompletionItemKind.Function },

      // Utility functions
      { label: 'print', detail: 'Print to console', kind: CompletionItemKind.Function },
      { label: 'debug', detail: 'Debug output', kind: CompletionItemKind.Function },
      { label: 'typeof', detail: 'Get type name', kind: CompletionItemKind.Function },
    ];

    return stdlib.map((fn) => ({
      label: fn.label,
      kind: fn.kind,
      detail: fn.detail,
    }));
  }

  /**
   * Get duration literal completions
   */
  private getDurationCompletions(): CompletionItem[] {
    const durations = [
      { label: 'w', detail: 'Whole note (4 beats)' },
      { label: 'h', detail: 'Half note (2 beats)' },
      { label: 'q', detail: 'Quarter note (1 beat)' },
      { label: 'e', detail: 'Eighth note (1/2 beat)' },
      { label: 's', detail: 'Sixteenth note (1/4 beat)' },
      { label: 't', detail: 'Thirty-second note (1/8 beat)' },
      { label: 'x', detail: 'Sixty-fourth note (1/16 beat)' },
      { label: 'w.', detail: 'Dotted whole note' },
      { label: 'h.', detail: 'Dotted half note' },
      { label: 'q.', detail: 'Dotted quarter note' },
      { label: 'e.', detail: 'Dotted eighth note' },
    ];

    return durations.map((d) => ({
      label: d.label,
      kind: CompletionItemKind.Constant,
      detail: d.detail,
    }));
  }

  /**
   * Get snippet completions for common patterns
   */
  private getSnippetCompletions(): CompletionItem[] {
    return [
      {
        label: 'fn main',
        kind: CompletionItemKind.Snippet,
        detail: 'Main function template',
        insertText: 'export fn main() -> Score {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'fn',
        kind: CompletionItemKind.Snippet,
        detail: 'Function template',
        insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'score',
        kind: CompletionItemKind.Snippet,
        detail: 'Score block template',
        insertText: 'score {\n\tmeta { title: "${1:Title}" }\n\ttempo { ${2:120bpm} }\n\tmeter { ${3:4/4} }\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'clip',
        kind: CompletionItemKind.Snippet,
        detail: 'Clip block template',
        insertText: 'clip {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'track',
        kind: CompletionItemKind.Snippet,
        detail: 'Track template',
        insertText: 'track("${1:name}") {\n\tsound { kind: "${2:instrument}", name: "${3:Piano}" }\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'for',
        kind: CompletionItemKind.Snippet,
        detail: 'For loop template',
        insertText: 'for ${1:item} in ${2:collection} {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'if',
        kind: CompletionItemKind.Snippet,
        detail: 'If expression template',
        insertText: 'if ${1:condition} {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'ifelse',
        kind: CompletionItemKind.Snippet,
        detail: 'If-else expression template',
        insertText: 'if ${1:condition} {\n\t$2\n} else {\n\t$0\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'match',
        kind: CompletionItemKind.Snippet,
        detail: 'Match expression template',
        insertText: 'match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${0:default},\n}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'import std',
        kind: CompletionItemKind.Snippet,
        detail: 'Import from std library',
        insertText: 'import { ${1:functions} } from "std:${2:core}"',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'const',
        kind: CompletionItemKind.Snippet,
        detail: 'Constant declaration',
        insertText: 'const ${1:name} = ${0:value}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
      {
        label: 'let',
        kind: CompletionItemKind.Snippet,
        detail: 'Variable declaration',
        insertText: 'let ${1:name} = ${0:value}',
        insertTextFormat: InsertTextFormat.Snippet,
      },
    ];
  }

  /**
   * Get completions from user-defined symbols in the current document
   */
  private getDocumentSymbolCompletions(program: Program): CompletionItem[] {
    const items: CompletionItem[] = [];

    for (const decl of program.body) {
      if (decl.kind === 'FnDecl') {
        const fn = decl as FnDecl;
        const params = fn.params.map((p) => p.name).join(', ');
        items.push({
          label: fn.name,
          kind: CompletionItemKind.Function,
          detail: `(${params}) -> ${fn.returnType?.name ?? 'Any'}`,
        });
      }

      if (decl.kind === 'ConstDecl') {
        const c = decl as ConstDecl;
        items.push({
          label: c.name,
          kind: CompletionItemKind.Constant,
          detail: c.type?.name ?? 'const',
        });
      }

      if (decl.kind === 'EnumDecl') {
        const e = decl as EnumDecl;
        items.push({
          label: e.name,
          kind: CompletionItemKind.Enum,
          detail: 'enum',
        });

        // Add enum variants as completions
        for (const variant of e.variants) {
          items.push({
            label: `${e.name}.${variant.name}`,
            kind: CompletionItemKind.EnumMember,
            detail: `${e.name} variant`,
          });
        }
      }

      if (decl.kind === 'TypeAliasDecl') {
        items.push({
          label: decl.name,
          kind: CompletionItemKind.TypeParameter,
          detail: 'type alias',
        });
      }
    }

    // Add imported symbols
    for (const imp of program.imports) {
      if (imp.spec.kind === 'ImportNamed') {
        for (const name of imp.spec.names) {
          items.push({
            label: name,
            kind: CompletionItemKind.Reference,
            detail: `from ${imp.from.value}`,
          });
        }
      } else if (imp.spec.kind === 'ImportAll') {
        items.push({
          label: imp.spec.alias,
          kind: CompletionItemKind.Module,
          detail: `* as ${imp.spec.alias} from ${imp.from.value}`,
        });
      }
    }

    return items;
  }
}
