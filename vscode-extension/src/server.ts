/**
 * TakoMusic DSL Language Server
 *
 * LSP server entry point for TakoMusic v4.
 * Provides real-time diagnostics, hover information, and code completion.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CodeAction,
  CodeActionKind,
  Position,
  Range,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticProvider } from './diagnosticProvider';
import { HoverProvider } from './hoverProvider';
import { CompletionProvider } from './completionProvider';

// Create a connection using Node's IPC for communication with the client
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager for document synchronization
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize providers
let diagnosticProvider: DiagnosticProvider;
let hoverProvider: HoverProvider;
let completionProvider: CompletionProvider;

const INDENT_UNIT = '  ';

const formatDocument = (text: string): string => {
  const lines = text.split(/\r?\n/);
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmedRight = line.replace(/\s+$/, '');
    const trimmed = trimmedRight.trim();
    if (!trimmed) return '';

    const hasLeadingClose = trimmed.startsWith('}');
    const indent = Math.max(indentLevel - (hasLeadingClose ? 1 : 0), 0);
    const lineOut = `${INDENT_UNIT.repeat(indent)}${trimmed}`;

    const openCount = (trimmed.match(/{/g) || []).length;
    const closeCount = (trimmed.match(/}/g) || []).length;
    indentLevel = Math.max(indentLevel + openCount - closeCount, 0);

    return lineOut;
  });
  return formatted.join('\n');
};

const buildOrganizeImportsEdit = (document: TextDocument): WorkspaceEdit | null => {
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  let start = -1;
  let end = -1;
  const originalImports: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (start === -1) {
      if (!trimmed || trimmed.startsWith('//')) continue;
      if (trimmed.startsWith('import ')) {
        start = i;
        end = i;
        originalImports.push(trimmed);
        continue;
      }
      break;
    }

    if (trimmed.startsWith('import ')) {
      end = i;
      originalImports.push(trimmed);
    } else {
      break;
    }
  }

  if (start === -1) return null;

  const uniqueImports = Array.from(new Set(originalImports));
  const sortedImports = [...uniqueImports].sort((a, b) => a.localeCompare(b));
  const changed =
    sortedImports.length !== originalImports.length ||
    sortedImports.some((line, idx) => line !== originalImports[idx]);

  if (!changed) return null;

  let replacement = sortedImports.join('\n');
  let endPos: Position;
  if (end + 1 < lines.length) {
    replacement += '\n';
    endPos = Position.create(end + 1, 0);
  } else {
    endPos = Position.create(end, lines[end].length);
  }

  return {
    changes: {
      [document.uri]: [
        TextEdit.replace(Range.create(Position.create(start, 0), endPos), replacement),
      ],
    },
  };
};

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  // Initialize providers
  diagnosticProvider = new DiagnosticProvider(connection, documents);
  hoverProvider = new HoverProvider(documents, diagnosticProvider);
  completionProvider = new CompletionProvider(documents, diagnosticProvider);

  return {
    capabilities: {
      // Use Incremental sync for better performance
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: ['.', ':', '"', '('],
        resolveProvider: false,
      },
      documentFormattingProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.SourceOrganizeImports],
      },
    },
  };
});

connection.onInitialized(() => {
  connection.console.log('TakoMusic Language Server initialized');
});

// Handle document content changes for real-time diagnostics
documents.onDidChangeContent((change) => {
  diagnosticProvider.validateDocument(change.document);
});

// Clean up on document close
documents.onDidClose((e) => {
  diagnosticProvider.clearDocument(e.document.uri);
});

// Register hover handler
connection.onHover((params) => {
  return hoverProvider.onHover(params);
});

// Register completion handler
connection.onCompletion((params) => {
  return completionProvider.onCompletion(params);
});

connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const original = document.getText();
  const formatted = formatDocument(original);
  if (formatted === original) return [];

  const lines = original.split(/\r?\n/);
  const endLine = Math.max(0, lines.length - 1);
  const endChar = lines[endLine]?.length ?? 0;
  return [TextEdit.replace(Range.create(Position.create(0, 0), Position.create(endLine, endChar)), formatted)];
});

connection.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const edit = buildOrganizeImportsEdit(document);
  if (!edit) return [];

  const action: CodeAction = {
    title: 'Organize Imports',
    kind: CodeActionKind.SourceOrganizeImports,
    edit,
  };

  return [action];
});

// Start listening for document events and connection messages
documents.listen(connection);
connection.listen();
