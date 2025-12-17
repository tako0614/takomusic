import * as vscode from 'vscode';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Checker, Diagnostic } from './checker';
import { MFError } from './errors';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('TakoMusic extension is now active');

  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection('takomusic');
  context.subscriptions.push(diagnosticCollection);

  // Run diagnostics on active editor
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document);
  }

  // Run diagnostics when document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'takomusic') {
        updateDiagnostics(e.document);
      }
    })
  );

  // Run diagnostics when switching editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'takomusic') {
        updateDiagnostics(editor.document);
      }
    })
  );

  // Run diagnostics when opening documents
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'takomusic') {
        updateDiagnostics(document);
      }
    })
  );

  // Clear diagnostics when closing documents
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection.delete(document.uri);
    })
  );
}

function updateDiagnostics(document: vscode.TextDocument): void {
  if (document.languageId !== 'takomusic') {
    return;
  }

  const text = document.getText();
  const diagnostics: vscode.Diagnostic[] = [];

  try {
    // Lexer phase
    const lexer = new Lexer(text, document.uri.fsPath);
    const tokens = lexer.tokenize();

    // Parser phase
    const parser = new Parser(tokens, document.uri.fsPath);
    const ast = parser.parse();

    // Checker phase
    const checker = new Checker();
    const checkerDiagnostics = checker.check(ast);

    // Convert checker diagnostics to VS Code diagnostics
    for (const d of checkerDiagnostics) {
      const diagnostic = createDiagnostic(document, d);
      diagnostics.push(diagnostic);
    }
  } catch (error) {
    if (error instanceof MFError) {
      const diagnostic = createDiagnosticFromError(document, error);
      diagnostics.push(diagnostic);
    } else if (error instanceof Error) {
      // Unexpected error - show at start of document
      const range = new vscode.Range(0, 0, 0, 0);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Internal error: ${error.message}`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

function createDiagnostic(document: vscode.TextDocument, d: Diagnostic): vscode.Diagnostic {
  let range: vscode.Range;

  if (d.position) {
    // VS Code uses 0-based line numbers, our lexer uses 1-based
    const line = d.position.line - 1;
    const col = d.position.column - 1;

    // Try to get a meaningful range by finding the word at position
    const lineText = document.lineAt(line).text;
    let endCol = col;

    // Extend to end of identifier/keyword
    while (endCol < lineText.length && /[a-zA-Z0-9_]/.test(lineText[endCol])) {
      endCol++;
    }

    // If we didn't find anything, at least highlight one character
    if (endCol === col) {
      endCol = Math.min(col + 1, lineText.length);
    }

    range = new vscode.Range(line, col, line, endCol);
  } else {
    // No position info - highlight first line
    range = new vscode.Range(0, 0, 0, document.lineAt(0).text.length);
  }

  const severity = d.severity === 'error'
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning;

  const message = d.suggestion
    ? `${d.message}\n\nHint: ${d.suggestion}`
    : d.message;

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.code = d.code;
  diagnostic.source = 'takomusic';

  return diagnostic;
}

function createDiagnosticFromError(document: vscode.TextDocument, error: MFError): vscode.Diagnostic {
  let range: vscode.Range;

  if (error.position) {
    const line = error.position.line - 1;
    const col = error.position.column - 1;

    const lineText = document.lineAt(line).text;
    let endCol = col;

    while (endCol < lineText.length && /[a-zA-Z0-9_]/.test(lineText[endCol])) {
      endCol++;
    }

    if (endCol === col) {
      endCol = Math.min(col + 1, lineText.length);
    }

    range = new vscode.Range(line, col, line, endCol);
  } else {
    range = new vscode.Range(0, 0, 0, document.lineAt(0).text.length);
  }

  const message = error.suggestion
    ? `${error.message}\n\nHint: ${error.suggestion}`
    : error.message;

  const diagnostic = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Error
  );
  diagnostic.code = error.code;
  diagnostic.source = 'takomusic';

  return diagnostic;
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
