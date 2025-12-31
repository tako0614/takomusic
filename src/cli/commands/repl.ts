// mf repl command - interactive REPL for TakoMusic

import * as readline from 'readline';
import { V4Lexer } from '../../lexer.js';
import { V4Parser } from '../../parser.js';
import { typeCheckProgram } from '../../typecheck.js';
import { V4Evaluator } from '../../evaluator.js';
import { Scope } from '../../scope.js';
import { ExitCodes } from '../../errors.js';
import { colors } from '../colors.js';
import type { Diagnostic } from '../../diagnostics.js';
import type { RuntimeValue } from '../../runtime.js';
import type { Program } from '../../ast.js';

interface ReplState {
  scope: Scope;
  diagnostics: Diagnostic[];
  history: string[];
  multilineBuffer: string;
  inMultiline: boolean;
}

export async function replCommand(args: string[]): Promise<number> {
  // Parse arguments
  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      printHelp();
      return ExitCodes.SUCCESS;
    }
  }

  console.log(colors.cyan('TakoMusic REPL') + ' (v4)');
  console.log('Type expressions to evaluate. Use ' + colors.yellow('.help') + ' for commands.');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.green('tako> '),
    historySize: 100,
  });

  const state: ReplState = {
    scope: new Scope(),
    diagnostics: [],
    history: [],
    multilineBuffer: '',
    inMultiline: false,
  };

  rl.prompt();

  rl.on('line', (line: string) => {
    const trimmed = line.trim();

    // Handle dot commands
    if (trimmed.startsWith('.') && !state.inMultiline) {
      handleDotCommand(trimmed, state, rl);
      rl.prompt();
      return;
    }

    // Handle multiline input
    if (state.inMultiline) {
      if (trimmed === '') {
        // Empty line ends multiline input
        const code = state.multilineBuffer;
        state.multilineBuffer = '';
        state.inMultiline = false;
        evaluateAndPrint(code, state);
        rl.setPrompt(colors.green('tako> '));
      } else {
        state.multilineBuffer += '\n' + line;
        rl.setPrompt(colors.dim('...  '));
      }
      rl.prompt();
      return;
    }

    // Check for multiline start (opening brace without closing)
    if (needsMoreInput(trimmed)) {
      state.inMultiline = true;
      state.multilineBuffer = line;
      rl.setPrompt(colors.dim('...  '));
      rl.prompt();
      return;
    }

    // Single line evaluation
    if (trimmed !== '') {
      state.history.push(trimmed);
      evaluateAndPrint(trimmed, state);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n' + colors.cyan('Goodbye!'));
    process.exit(ExitCodes.SUCCESS);
  });

  // Keep process alive
  return new Promise(() => {});
}

function needsMoreInput(code: string): boolean {
  let braceCount = 0;
  let bracketCount = 0;
  let parenCount = 0;
  let inString = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (char === '"' && (i === 0 || code[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
    else if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
  }

  return braceCount > 0 || bracketCount > 0 || parenCount > 0;
}

function handleDotCommand(cmd: string, state: ReplState, rl: readline.Interface): void {
  const parts = cmd.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();

  switch (command) {
    case 'help':
      printReplHelp();
      break;

    case 'clear':
      console.clear();
      console.log(colors.cyan('TakoMusic REPL') + ' (v4)');
      break;

    case 'reset':
      state.scope = new Scope();
      state.diagnostics = [];
      console.log(colors.yellow('Environment reset'));
      break;

    case 'vars':
    case 'scope':
      printScope(state.scope);
      break;

    case 'history':
      printHistory(state.history);
      break;

    case 'exit':
    case 'quit':
      rl.close();
      break;

    case 'load':
      if (parts[1]) {
        loadFile(parts[1], state);
      } else {
        console.log(colors.error('Usage: .load <filename>'));
      }
      break;

    default:
      console.log(colors.error(`Unknown command: .${command}`));
      console.log('Type .help for available commands');
  }
}

function evaluateAndPrint(code: string, state: ReplState): void {
  state.diagnostics = [];

  try {
    const lexer = new V4Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new V4Parser(tokens);
    const program = parser.parseProgram();

    // Type check
    typeCheckProgram(program, state.diagnostics, 'repl');

    // Check for errors
    const errors = state.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      for (const err of errors) {
        console.log(colors.error('error') + ': ' + err.message);
      }
      return;
    }

    // Evaluate
    const evalDiags: Diagnostic[] = [];
    const evaluator = new V4Evaluator(evalDiags, 'repl');

    // Execute statements and capture result
    const result = executeProgram(program, state.scope, evaluator);

    // Print result
    if (result !== undefined && result !== null) {
      console.log(colors.cyan('=> ') + formatValue(result));
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(colors.error('error') + ': ' + message);
  }
}

function executeProgram(program: Program, scope: Scope, evaluator: V4Evaluator): RuntimeValue | undefined {
  let lastValue: RuntimeValue | undefined;

  // Handle imports (just skip them in REPL)
  if (program.imports.length > 0) {
    console.log(colors.dim('(imports are not supported in REPL)'));
  }

  // Process declarations
  for (const decl of program.body) {
    switch (decl.kind) {
      case 'ConstDecl': {
        const value = evaluator.evaluateExpr(decl.value, scope);
        scope.defineUser(decl.name, value, false);
        lastValue = value;
        break;
      }

      case 'FnDecl': {
        const fnValue = evaluator.createFunction(decl, scope);
        scope.defineUser(decl.name, fnValue, false);
        lastValue = fnValue;
        break;
      }
    }
  }

  return lastValue;
}

function formatValue(value: RuntimeValue): string {
  if (value === null || value === undefined) {
    return colors.dim('null');
  }

  switch (value.type) {
    case 'number':
      return colors.yellow(String(value.value));

    case 'string':
      return colors.green('"' + value.value + '"');

    case 'bool':
      return colors.cyan(String(value.value));

    case 'pitch':
      return colors.magenta(formatPitch(value.value));

    case 'rat':
      return colors.yellow(`${value.value.n}/${value.value.d}`);

    case 'array':
      if (value.elements.length === 0) {
        return '[]';
      }
      if (value.elements.length <= 5) {
        const items = value.elements.map((v: RuntimeValue) => formatValue(v)).join(', ');
        return `[${items}]`;
      }
      return `[Array(${value.elements.length})]`;

    case 'object':
      const keys = Array.from(value.props.keys());
      if (keys.length === 0) {
        return '{}';
      }
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;

    case 'function':
      return colors.cyan(`[Function: ${value.name || 'anonymous'}]`);

    case 'clip':
      const eventCount = value.clip?.events?.length || 0;
      return colors.cyan(`[Clip: ${eventCount} events]`);

    case 'score':
      const trackCount = value.score?.tracks?.length || 0;
      return colors.cyan(`[Score: ${trackCount} tracks]`);

    case 'pos':
      return colors.yellow(`[Pos]`);

    case 'range':
      return colors.yellow(`[Range]`);

    case 'curve':
      return colors.yellow(`[Curve]`);

    case 'lyric':
      return colors.green(`[Lyric]`);

    case 'lyricToken':
      return colors.green(`[LyricToken]`);

    case 'rng':
      return colors.dim(`[RNG]`);

    default:
      return colors.dim(`[${(value as RuntimeValue).type}]`);
  }
}

function formatPitch(pitch: { midi: number; spelling?: unknown }): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = pitch.midi;
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

function printScope(scope: Scope): void {
  console.log(colors.cyan('User-defined variables:'));
  const vars = scope.getAllBindings();

  const userVars = vars.filter(([name]) => scope.isUserDefined(name));

  if (userVars.length === 0) {
    console.log(colors.dim('  (no user-defined variables)'));
    return;
  }

  for (const [name, value] of userVars) {
    console.log(`  ${colors.green(name)}: ${formatValue(value)}`);
  }
}

function printHistory(history: string[]): void {
  if (history.length === 0) {
    console.log(colors.dim('No history'));
    return;
  }

  console.log(colors.cyan('History:'));
  const start = Math.max(0, history.length - 10);
  for (let i = start; i < history.length; i++) {
    console.log(`  ${colors.dim(String(i + 1))} ${history[i]}`);
  }
}

function loadFile(filename: string, state: ReplState): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(process.cwd(), filename);
    const content = fs.readFileSync(fullPath, 'utf-8');

    console.log(colors.cyan(`Loading ${filename}...`));
    evaluateAndPrint(content, state);
    console.log(colors.green('File loaded successfully'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(colors.error(`Failed to load file: ${message}`));
  }
}

function printReplHelp(): void {
  console.log(`
${colors.cyan('REPL Commands:')}

  ${colors.yellow('.help')}     Show this help
  ${colors.yellow('.clear')}    Clear the screen
  ${colors.yellow('.reset')}    Reset the environment
  ${colors.yellow('.vars')}     Show defined variables
  ${colors.yellow('.history')}  Show command history
  ${colors.yellow('.load')} ${colors.dim('<file>')}  Load and execute a file
  ${colors.yellow('.exit')}     Exit the REPL

${colors.cyan('Tips:')}
  - Type expressions to evaluate them
  - Use ${colors.green('let')} or ${colors.green('const')} to define variables
  - Use ${colors.green('fn')} to define functions
  - Multi-line input: open brace continues to next line
  - Empty line in multi-line mode submits the code
`);
}

function printHelp(): void {
  console.log(`Usage: mf repl [options]

Start an interactive REPL session.

Options:
  -h, --help    Show this help message

Examples:
  mf repl                Start the REPL
`);
}
