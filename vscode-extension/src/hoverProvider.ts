/**
 * Hover Provider for TakoMusic DSL
 *
 * Provides hover information including function signatures and type information.
 */

import {
  Hover,
  HoverParams,
  MarkupKind,
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

export class HoverProvider {
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
   * Handle hover requests
   */
  onHover(params: HoverParams): Hover | null {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return null;

    const parsed = this.diagnosticProvider.getParsedDocument(params.textDocument.uri);
    if (!parsed?.program) return null;

    const position = params.position;
    const offset = document.offsetAt(position);
    const text = document.getText();

    // Get word at position
    const wordRange = this.getWordRangeAtPosition(text, offset);
    if (!wordRange) return null;

    const word = text.slice(wordRange.start, wordRange.end);

    // Find hover info
    const hoverInfo = this.getHoverInfo(word, parsed.program);
    if (!hoverInfo) return null;

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: hoverInfo,
      },
    };
  }

  /**
   * Get the word range at a given offset
   */
  private getWordRangeAtPosition(
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

  /**
   * Get hover information for a word
   */
  private getHoverInfo(word: string, program: Program): string | null {
    // Check user-defined declarations
    for (const decl of program.body) {
      if (decl.kind === 'FnDecl' && decl.name === word) {
        const fn = decl as FnDecl;
        const params = fn.params
          .map((p) => `${p.name}: ${p.type?.name ?? 'Any'}`)
          .join(', ');
        const returnType = fn.returnType?.name ?? 'Any';
        const exported = fn.exported ? 'export ' : '';
        return `\`\`\`takomusic\n${exported}fn ${word}(${params}) -> ${returnType}\n\`\`\``;
      }

      if (decl.kind === 'ConstDecl' && decl.name === word) {
        const c = decl as ConstDecl;
        const type = c.type?.name ?? 'inferred';
        const exported = c.exported ? 'export ' : '';
        return `\`\`\`takomusic\n${exported}const ${word}: ${type}\n\`\`\``;
      }

      if (decl.kind === 'EnumDecl' && decl.name === word) {
        const e = decl as EnumDecl;
        const variants = e.variants.map((v) => v.name).join(' | ');
        const exported = e.exported ? 'export ' : '';
        return `\`\`\`takomusic\n${exported}enum ${word} { ${variants} }\n\`\`\``;
      }
    }

    // Check built-in functions and types
    const builtinDocs = this.getBuiltinDocs();
    if (builtinDocs[word]) {
      return builtinDocs[word];
    }

    return null;
  }

  /**
   * Get documentation for built-in functions and types
   */
  private getBuiltinDocs(): Record<string, string> {
    return {
      // Clip statements
      note: '```takomusic\nnote(pitch, duration, [vel: Float], [voice: Int])\n```\n\nCreate a musical note.\n\n**Parameters:**\n- `pitch`: Note pitch (e.g., C4, D#5)\n- `duration`: Note duration (e.g., q, h, w)\n- `vel`: Velocity 0.0-1.0 (optional)\n- `voice`: Voice number (optional)',

      rest: '```takomusic\nrest(duration)\n```\n\nCreate a rest (silence).\n\n**Parameters:**\n- `duration`: Rest duration (e.g., q, h)',

      chord: '```takomusic\nchord(pitches, duration, [vel: Float])\n```\n\nCreate a chord from multiple pitches.\n\n**Parameters:**\n- `pitches`: Array of pitches (e.g., [C4, E4, G4])\n- `duration`: Chord duration\n- `vel`: Velocity 0.0-1.0 (optional)',

      hit: '```takomusic\nhit(key, duration, [vel: Float])\n```\n\nCreate a drum hit.\n\n**Parameters:**\n- `key`: Drum key (e.g., kick, snare)\n- `duration`: Hit duration\n- `vel`: Velocity 0.0-1.0 (optional)',

      // Duration values
      w: '**Whole note duration**\n\nEquals 4 beats in 4/4 time.',
      h: '**Half note duration**\n\nEquals 2 beats in 4/4 time.',
      q: '**Quarter note duration**\n\nEquals 1 beat in 4/4 time.',
      e: '**Eighth note duration**\n\nEquals 0.5 beats in 4/4 time.',
      s: '**Sixteenth note duration**\n\nEquals 0.25 beats in 4/4 time.',
      t: '**Thirty-second note duration**\n\nEquals 0.125 beats in 4/4 time.',
      x: '**Sixty-fourth note duration**\n\nEquals 0.0625 beats in 4/4 time.',

      // Score elements
      score: '```takomusic\nscore { ... }\n```\n\nDefine a music score with tracks, tempo, and meter.',
      clip: '```takomusic\nclip { ... }\n```\n\nDefine a musical clip containing notes and rests.',
      track: '```takomusic\ntrack(name) { ... }\n```\n\nDefine a track in the score.',
      sound: '```takomusic\nsound { kind: "instrument" | "drumkit" | "vocal", ... }\n```\n\nDefine a sound source.',
      tempo: '```takomusic\ntempo { 120bpm }\n```\n\nDefine tempo map for the score.',
      meter: '```takomusic\nmeter { 4/4 }\n```\n\nDefine time signature map for the score.',
      meta: '```takomusic\nmeta { title: "...", ... }\n```\n\nDefine metadata for the score.',
      place: '```takomusic\nplace(clip) at pos\n```\n\nPlace a clip at a specific position.',

      // Standard library functions
      repeat: '```takomusic\nrepeat(clip: Clip, count: Int) -> Clip\n```\n\nRepeat a clip multiple times.\n\n**Example:**\n```takomusic\nrepeat(myClip, 4)\n```',

      concat: '```takomusic\nconcat(...clips: Clip[]) -> Clip\n```\n\nConcatenate clips sequentially.\n\n**Example:**\n```takomusic\nconcat(clipA, clipB, clipC)\n```',

      overlay: '```takomusic\noverlay(...clips: Clip[]) -> Clip\n```\n\nOverlay clips (play simultaneously).\n\n**Example:**\n```takomusic\noverlay(melody, harmony)\n```',

      slice: '```takomusic\nslice(clip: Clip, start: Dur, end: Dur) -> Clip\n```\n\nExtract a portion of a clip.',

      mapEvents: '```takomusic\nmapEvents(clip: Clip, fn: (Event) -> Event) -> Clip\n```\n\nMap a function over clip events.',

      transpose: '```takomusic\ntranspose(clip: Clip, semitones: Int) -> Clip\n```\n\nTranspose a clip by semitones.',

      reverse: '```takomusic\nreverse(clip: Clip) -> Clip\n```\n\nReverse the order of events in a clip.',

      majorTriad: '```takomusic\nmajorTriad(root: Pitch) -> Array<Pitch>\n```\n\nCreate a major triad chord.\n\n**Example:**\n```takomusic\nmajorTriad(C4)  // [C4, E4, G4]\n```',

      minorTriad: '```takomusic\nminorTriad(root: Pitch) -> Array<Pitch>\n```\n\nCreate a minor triad chord.\n\n**Example:**\n```takomusic\nminorTriad(A4)  // [A4, C5, E5]\n```',

      scaleMajor: '```takomusic\nscaleMajor(root: Pitch) -> Array<Pitch>\n```\n\nGet notes of a major scale.',

      scaleMinor: '```takomusic\nscaleMinor(root: Pitch) -> Array<Pitch>\n```\n\nGet notes of a minor scale.',

      // Utility functions
      len: '```takomusic\nlen(array: Array | String) -> Int\n```\n\nGet the length of an array or string.',

      push: '```takomusic\npush(array: Array, value: Any) -> Array\n```\n\nAdd an element to the end of an array.',

      map: '```takomusic\nmap(array: Array, fn: (item) -> Any) -> Array\n```\n\nMap a function over an array.',

      filter: '```takomusic\nfilter(array: Array, fn: (item) -> Bool) -> Array\n```\n\nFilter an array by a predicate.',

      reduce: '```takomusic\nreduce(array: Array, init: Any, fn: (acc, item) -> Any) -> Any\n```\n\nReduce an array to a single value.',

      range: '```takomusic\nrange(start: Int, end: Int) -> Array<Int>\n```\n\nCreate an array of integers from start to end (exclusive).',

      random: '```takomusic\nrandom() -> Float\n```\n\nGenerate a random float between 0 and 1.',

      randomInt: '```takomusic\nrandomInt(min: Int, max: Int) -> Int\n```\n\nGenerate a random integer between min and max (inclusive).',

      floor: '```takomusic\nfloor(x: Float) -> Int\n```\n\nRound down to nearest integer.',

      ceil: '```takomusic\nceil(x: Float) -> Int\n```\n\nRound up to nearest integer.',

      round: '```takomusic\nround(x: Float) -> Int\n```\n\nRound to nearest integer.',

      abs: '```takomusic\nabs(x: Number) -> Number\n```\n\nGet absolute value.',

      min: '```takomusic\nmin(a: Number, b: Number) -> Number\n```\n\nGet minimum of two values.',

      max: '```takomusic\nmax(a: Number, b: Number) -> Number\n```\n\nGet maximum of two values.',

      // Types
      Score: '**Score type**\n\nRepresents a complete musical score with tracks, tempo, and metadata.',
      Clip: '**Clip type**\n\nRepresents a sequence of musical events (notes, rests, chords).',
      Int: '**Int type**\n\nInteger number type.',
      Float: '**Float type**\n\nFloating point number type.',
      String: '**String type**\n\nText string type.',
      Bool: '**Bool type**\n\nBoolean type (`true` or `false`).',
      Array: '**Array type**\n\nOrdered collection of values.',
      Pitch: '**Pitch type**\n\nMusical pitch (e.g., C4, D#5, Bb3).',
      Dur: '**Dur type**\n\nDuration type (e.g., q, h, w).',
      Pos: '**Pos type**\n\nPosition type - represents a point in time (bar:beat).',
      Bpm: '**Bpm type**\n\nTempo type (e.g., 120bpm).',

      // Keywords
      fn: '**fn keyword**\n\nDeclare a function.\n\n```takomusic\nfn name(params) -> ReturnType { ... }\n```',
      const: '**const keyword**\n\nDeclare an immutable constant.\n\n```takomusic\nconst name: Type = value\n```',
      let: '**let keyword**\n\nDeclare a mutable variable.\n\n```takomusic\nlet name = value\n```',
      export: '**export keyword**\n\nMark a declaration as public.\n\n```takomusic\nexport fn main() { ... }\n```',
      import: '**import keyword**\n\nImport from another module.\n\n```takomusic\nimport { name } from "module"\n```',
      return: '**return keyword**\n\nReturn a value from a function.',
      if: '**if keyword**\n\nConditional expression.\n\n```takomusic\nif condition { ... } else { ... }\n```',
      else: '**else keyword**\n\nAlternative branch of if expression.',
      for: '**for keyword**\n\nLoop expression.\n\n```takomusic\nfor item in collection { ... }\n```',
      in: '**in keyword**\n\nUsed in for loops and match expressions.',
      match: '**match keyword**\n\nPattern matching expression.\n\n```takomusic\nmatch value {\n  pattern => result,\n  _ => default,\n}\n```',
      true: '**true literal**\n\nBoolean true value.',
      false: '**false literal**\n\nBoolean false value.',
      null: '**null literal**\n\nNull value.',
      type: '**type keyword**\n\nDeclare a type alias.\n\n```takomusic\ntype Name = OtherType\n```',
      enum: '**enum keyword**\n\nDeclare an enumeration.\n\n```takomusic\nenum Status { Active, Inactive }\n```',
    };
  }
}
