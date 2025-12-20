const fs = require('fs');
const { Lexer } = require('./dist/lexer/index.js');
const { Parser } = require('./dist/parser/index.js');

const files = [
  // Standard library
  'lib/articulation.mf',
  'lib/ornaments.mf',
  'lib/rhythm.mf',
  'lib/theory.mf',
  'lib/utils.mf',
  'lib/curves.mf',
  'lib/patterns.mf',
  'lib/notation.mf',
  'lib/dynamics.mf',
  'lib/expression.mf',
  'lib/genres.mf',
  'lib/composition.mf',
  // Examples
  'examples/simple_melody.mf',
  'examples/euclidean_drums.mf',
  'examples/jazz_progression.mf',
  'examples/generative.mf',
  'examples/full_song.mf'
];

for (const file of files) {
  try {
    console.log(`\nChecking ${file}...`);
    const source = fs.readFileSync(file, 'utf-8');
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, file);
    const ast = parser.parse();
    console.log(`  ✓ ${file} parsed successfully (${ast.statements.length} statements)`);
  } catch (err) {
    console.error(`  ✗ Error in ${file}:`, err.message);
  }
}
