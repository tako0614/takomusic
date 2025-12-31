// mf lsp command - start the Language Server Protocol server

import { ExitCodes } from '../../errors.js';

export async function lspCommand(_args: string[]): Promise<number> {
  // Dynamically import to avoid loading LSP deps unless needed
  try {
    await import('../../lsp/server.js');
    // Server runs in event loop, this will never return normally
    return ExitCodes.SUCCESS;
  } catch (err) {
    console.error('Failed to start LSP server:', err);
    return ExitCodes.STATIC_ERROR;
  }
}
