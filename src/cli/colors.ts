/**
 * ANSI color utilities for CLI output
 * Supports --no-color option and NO_COLOR environment variable
 */

// Check if colors are supported by default
const isColorSupported = (): boolean => {
  if (process.env.NO_COLOR || process.env.FORCE_COLOR === '0') {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  if (process.stdout && !process.stdout.isTTY) {
    return false;
  }
  return true;
};

let colorsEnabled = isColorSupported();

/**
 * Enable or disable color output programmatically
 * Used for --no-color CLI option
 */
export function setColorEnabled(enabled: boolean): void {
  colorsEnabled = enabled;
}

/**
 * Check if colors are currently enabled
 */
export function isColorEnabled(): boolean {
  return colorsEnabled;
}

// ANSI escape codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const UNDERLINE = '\x1b[4m';

// Foreground colors
const FG_RED = '\x1b[31m';
const FG_GREEN = '\x1b[32m';
const FG_YELLOW = '\x1b[33m';
const FG_BLUE = '\x1b[34m';
const FG_MAGENTA = '\x1b[35m';
const FG_CYAN = '\x1b[36m';
const FG_WHITE = '\x1b[37m';
const FG_BRIGHT_RED = '\x1b[91m';
const FG_BRIGHT_BLUE = '\x1b[94m';
const FG_BRIGHT_CYAN = '\x1b[96m';

// Apply ANSI code if colors are enabled
const apply = (code: string, text: string): string => {
  if (!colorsEnabled) return text;
  return `${code}${text}${RESET}`;
};

export const colors = {
  // Basic colors
  red: (text: string) => apply(FG_RED, text),
  green: (text: string) => apply(FG_GREEN, text),
  yellow: (text: string) => apply(FG_YELLOW, text),
  blue: (text: string) => apply(FG_BLUE, text),
  magenta: (text: string) => apply(FG_MAGENTA, text),
  cyan: (text: string) => apply(FG_CYAN, text),
  white: (text: string) => apply(FG_WHITE, text),

  // Bright colors
  brightRed: (text: string) => apply(FG_BRIGHT_RED, text),
  brightBlue: (text: string) => apply(FG_BRIGHT_BLUE, text),
  brightCyan: (text: string) => apply(FG_BRIGHT_CYAN, text),

  // Styles
  bold: (text: string) => apply(BOLD, text),
  dim: (text: string) => apply(DIM, text),
  underline: (text: string) => apply(UNDERLINE, text),

  // Combined styles
  boldRed: (text: string) => apply(BOLD + FG_RED, text),
  boldYellow: (text: string) => apply(BOLD + FG_YELLOW, text),
  boldGreen: (text: string) => apply(BOLD + FG_GREEN, text),
  boldBlue: (text: string) => apply(BOLD + FG_BLUE, text),
  boldCyan: (text: string) => apply(BOLD + FG_CYAN, text),

  // Semantic colors for diagnostics
  error: (text: string) => apply(BOLD + FG_RED, text),
  warning: (text: string) => apply(BOLD + FG_YELLOW, text),
  info: (text: string) => apply(BOLD + FG_BLUE, text),
  hint: (text: string) => apply(FG_CYAN, text),
  note: (text: string) => apply(FG_BRIGHT_CYAN, text),
  success: (text: string) => apply(FG_GREEN, text),

  // For code display
  lineNumber: (text: string) => apply(FG_BRIGHT_BLUE, text),
  pipe: (text: string) => apply(FG_BRIGHT_BLUE, text),
  caret: (text: string) => apply(FG_BRIGHT_RED, text),
  underlineError: (text: string) => apply(FG_RED, text),
  underlineWarning: (text: string) => apply(FG_YELLOW, text),
  location: (text: string) => apply(FG_CYAN, text),
};

export type Colors = typeof colors;
