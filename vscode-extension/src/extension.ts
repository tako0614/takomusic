import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Path to the server module (compiled from server.ts)
  const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));

  // Server options - use Node.js IPC for communication
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register the server for TakoMusic documents
    documentSelector: [{ scheme: 'file', language: 'takomusic' }],
    synchronize: {
      // Watch for .mf file changes in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.mf'),
    },
  };

  // Create the language client
  client = new LanguageClient(
    'takomusicLanguageServer',
    'TakoMusic Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (which also starts the server)
  client.start();

  console.log('TakoMusic extension is now active');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
