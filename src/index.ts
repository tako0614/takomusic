// TakoMusic - Music composition with MFS language

export * from './config/index.js';
export * from './errors.js';
export { V4Lexer as V7Lexer } from './lexer.js';
export { V4Parser as V7Parser } from './parser.js';
export { V4Compiler as V7Compiler } from './compiler.js';
export { V4Evaluator as V7Evaluator } from './evaluator.js';
export { normalizeScore } from './normalize.js';
export { validateProgram, type ValidationContext } from './validation.js';
export * from './runtime.js';
export * from './ir.js';
export * from './rat.js';
export * from './pitch.js';
export * from './diagnostics.js';

// Legacy exports (deprecated - use V7* instead)
// These will be removed in v8.0
export { V4Lexer } from './lexer.js';
export { V4Parser } from './parser.js';
export { V4Compiler } from './compiler.js';
export { V4Evaluator } from './evaluator.js';
