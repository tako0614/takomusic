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

  // Skip empty documents
  if (text.trim().length === 0) {
    diagnosticCollection.set(document.uri, []);
    return;
  }

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
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }
  } catch (error) {
    if (error instanceof MFError) {
      const diagnostic = createDiagnosticFromError(document, error);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    } else if (error instanceof Error) {
      // Unexpected error - show at start of document
      const range = new vscode.Range(0, 0, 0, Math.min(document.lineAt(0).text.length, 1));
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

function createDiagnostic(document: vscode.TextDocument, d: Diagnostic): vscode.Diagnostic | null {
  const range = getRange(document, d.position);
  if (!range) {
    return null;
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

function createDiagnosticFromError(document: vscode.TextDocument, error: MFError): vscode.Diagnostic | null {
  const range = getRange(document, error.position);
  if (!range) {
    // Fallback to first character
    return new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      error.message,
      vscode.DiagnosticSeverity.Error
    );
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

function getRange(document: vscode.TextDocument, position?: { line: number; column: number }): vscode.Range | null {
  // Handle missing position
  if (!position) {
    if (document.lineCount === 0) {
      return new vscode.Range(0, 0, 0, 0);
    }
    return new vscode.Range(0, 0, 0, Math.min(document.lineAt(0).text.length, 10));
  }

  // VS Code uses 0-based line numbers, our lexer uses 1-based
  const line = Math.max(0, position.line - 1);
  const col = Math.max(0, position.column - 1);

  // Bounds check for line
  if (line >= document.lineCount) {
    const lastLine = document.lineCount - 1;
    const lastLineText = document.lineAt(lastLine).text;
    return new vscode.Range(lastLine, 0, lastLine, lastLineText.length);
  }

  const lineText = document.lineAt(line).text;

  // Bounds check for column
  const safeCol = Math.min(col, lineText.length);
  let endCol = safeCol;

  // Extend to end of identifier/keyword
  while (endCol < lineText.length && /[a-zA-Z0-9_]/.test(lineText[endCol])) {
    endCol++;
  }

  // If we didn't find anything, at least highlight one character
  if (endCol === safeCol) {
    endCol = Math.min(safeCol + 1, lineText.length);
  }

  // Ensure we have at least some range
  if (endCol === safeCol && lineText.length > 0) {
    endCol = Math.min(safeCol + 1, lineText.length);
  }

  return new vscode.Range(line, safeCol, line, endCol);
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
