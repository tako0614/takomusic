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

// Start listening for document events and connection messages
documents.listen(connection);
connection.listen();
