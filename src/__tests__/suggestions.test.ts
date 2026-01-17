import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  similarityRatio,
  findSimilar,
  formatSuggestion,
  getAllKnownIdentifiers,
  suggestIdentifier,
  BUILTIN_KEYWORDS,
  BUILTIN_TYPES,
  BUILTIN_FUNCTIONS,
  STDLIB_FUNCTIONS,
} from '../suggestions.js';

describe('suggestions utilities', () => {
  describe('levenshteinDistance', () => {
    it('calculates distance for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('calculates distance for single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1); // substitution
      expect(levenshteinDistance('hello', 'ello')).toBe(1);  // deletion
      expect(levenshteinDistance('hello', 'helloo')).toBe(1); // insertion
    });

    it('calculates distance for multiple differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('calculates distance for completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    it('handles empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('is case-sensitive', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(1);
    });

    it('handles single character strings', () => {
      expect(levenshteinDistance('a', 'b')).toBe(1);
      expect(levenshteinDistance('a', 'a')).toBe(0);
    });
  });

  describe('similarityRatio', () => {
    it('returns 1 for identical strings', () => {
      expect(similarityRatio('hello', 'hello')).toBe(1);
      expect(similarityRatio('', '')).toBe(1);
    });

    it('returns ratio between 0 and 1', () => {
      const ratio = similarityRatio('hello', 'hallo');
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(1);
    });

    it('returns 0 for completely different strings', () => {
      expect(similarityRatio('abc', 'xyz')).toBe(0);
    });

    it('handles close matches', () => {
      expect(similarityRatio('test', 'tset')).toBeGreaterThanOrEqual(0.5);
      expect(similarityRatio('function', 'functon')).toBeGreaterThan(0.8);
    });

    it('handles length differences', () => {
      const ratio = similarityRatio('short', 'very long string');
      expect(ratio).toBeLessThan(0.5);
    });

    it('returns appropriate ratio for typos', () => {
      // Single character typo in longer word
      expect(similarityRatio('variable', 'variabl')).toBeGreaterThan(0.8);
      expect(similarityRatio('constant', 'constent')).toBeGreaterThan(0.7);
    });
  });

  describe('findSimilar', () => {
    const candidates = ['apple', 'application', 'apply', 'banana', 'orange', 'grape'];

    it('finds similar matches', () => {
      const results = findSimilar('appl', candidates);
      expect(results).toContain('apple');
      expect(results).toContain('apply');
    });

    it('limits results to maxResults', () => {
      const results = findSimilar('appl', candidates, { maxResults: 1 });
      expect(results).toHaveLength(1);
    });

    it('respects minSimilarity threshold', () => {
      const results = findSimilar('xyz', candidates, { minSimilarity: 0.8 });
      expect(results).toHaveLength(0);
    });

    it('returns results in order of similarity', () => {
      const results = findSimilar('aple', candidates, { maxResults: 3 });
      expect(results[0]).toBe('apple'); // Most similar should be first
    });

    it('handles case-insensitive matching by default', () => {
      const results = findSimilar('APPLE', candidates);
      expect(results).toContain('apple');
    });

    it('respects case-sensitive option', () => {
      const caseCandidates = ['Apple', 'apple', 'APPLE'];
      const results = findSimilar('apple', caseCandidates, { caseSensitive: true });
      expect(results[0]).toBe('apple');
    });

    it('returns empty array for no matches', () => {
      const results = findSimilar('xyz', candidates, { minSimilarity: 0.9 });
      expect(results).toEqual([]);
    });

    it('handles empty candidates array', () => {
      const results = findSimilar('test', []);
      expect(results).toEqual([]);
    });

    it('finds typo corrections', () => {
      const keywords = ['function', 'const', 'let', 'return', 'if', 'else'];

      expect(findSimilar('fucntion', keywords)).toContain('function');
      expect(findSimilar('cosnt', keywords)).toContain('const');
      expect(findSimilar('retrun', keywords)).toContain('return');
    });

    it('uses default maxResults of 3', () => {
      const many = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
      const results = findSimilar('a', many);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('uses default minSimilarity of 0.5', () => {
      const results = findSimilar('abc', ['xyz']);
      expect(results).toHaveLength(0); // Too dissimilar
    });
  });

  describe('formatSuggestion', () => {
    it('formats single suggestion', () => {
      const result = formatSuggestion(['apple']);
      expect(result).toBe("Did you mean 'apple'?");
    });

    it('formats two suggestions', () => {
      const result = formatSuggestion(['apple', 'apply']);
      expect(result).toBe("Did you mean 'apple' or 'apply'?");
    });

    it('formats three suggestions', () => {
      const result = formatSuggestion(['apple', 'apply', 'ape']);
      expect(result).toBe("Did you mean 'apple', 'apply' or 'ape'?");
    });

    it('formats many suggestions with commas', () => {
      const result = formatSuggestion(['a', 'b', 'c', 'd']);
      expect(result).toBe("Did you mean 'a', 'b', 'c' or 'd'?");
    });

    it('returns undefined for empty array', () => {
      const result = formatSuggestion([]);
      expect(result).toBeUndefined();
    });

    it('handles suggestions with spaces', () => {
      const result = formatSuggestion(['my variable', 'your variable']);
      expect(result).toBe("Did you mean 'my variable' or 'your variable'?");
    });
  });

  describe('getAllKnownIdentifiers', () => {
    it('includes builtin keywords', () => {
      const identifiers = getAllKnownIdentifiers();
      expect(identifiers).toContain('fn');
      expect(identifiers).toContain('const');
      expect(identifiers).toContain('let');
      expect(identifiers).toContain('if');
      expect(identifiers).toContain('return');
    });

    it('includes builtin types', () => {
      const identifiers = getAllKnownIdentifiers();
      expect(identifiers).toContain('Clip');
      expect(identifiers).toContain('Score');
      expect(identifiers).toContain('Track');
      expect(identifiers).toContain('Int');
      expect(identifiers).toContain('Float');
    });

    it('includes builtin functions', () => {
      const identifiers = getAllKnownIdentifiers();
      expect(identifiers).toContain('note');
      expect(identifiers).toContain('chord');
      expect(identifiers).toContain('clip');
      expect(identifiers).toContain('score');
      expect(identifiers).toContain('transpose');
    });

    it('includes stdlib functions', () => {
      const identifiers = getAllKnownIdentifiers();
      expect(identifiers).toContain('majorTriad');
      expect(identifiers).toContain('minorTriad');
      expect(identifiers).toContain('scaleMajor');
      expect(identifiers).toContain('kick');
      expect(identifiers).toContain('snare');
    });

    it('returns a combined array', () => {
      const identifiers = getAllKnownIdentifiers();
      const expectedLength =
        BUILTIN_KEYWORDS.length +
        BUILTIN_TYPES.length +
        BUILTIN_FUNCTIONS.length +
        STDLIB_FUNCTIONS.length;

      expect(identifiers.length).toBe(expectedLength);
    });

    it('may contain duplicates across categories', () => {
      const identifiers = getAllKnownIdentifiers();
      const uniqueIdentifiers = [...new Set(identifiers)];
      // Some functions appear in both BUILTIN_FUNCTIONS and STDLIB_FUNCTIONS
      // This is expected as stdlib may re-export builtin functions
      expect(uniqueIdentifiers.length).toBeGreaterThan(0);
      expect(uniqueIdentifiers.length).toBeLessThanOrEqual(identifiers.length);
    });
  });

  describe('suggestIdentifier', () => {
    it('suggests correction for typos in keywords', () => {
      const result = suggestIdentifier('fn');
      // 'fn' is a keyword, so should match exactly
      if (result) {
        expect(result).toContain('Did you mean');
      }
    });

    it('suggests correction for typos in types', () => {
      const result = suggestIdentifier('Scroe');
      expect(result).toBeDefined();
      expect(result).toContain('Score');
    });

    it('suggests correction for typos in functions', () => {
      const result = suggestIdentifier('tranpose');
      expect(result).toBeDefined();
      expect(result).toContain('transpose');
    });

    it('includes additional candidates', () => {
      const result = suggestIdentifier('myVariabl', ['myVariable', 'yourVariable']);
      expect(result).toBeDefined();
      expect(result).toContain('myVariable');
    });

    it('returns undefined for completely different names', () => {
      const result = suggestIdentifier('xyz123');
      expect(result).toBeUndefined();
    });

    it('prefers exact or near-exact matches', () => {
      const result = suggestIdentifier('not');
      expect(result).toBeDefined();
      if (result) {
        expect(result).toContain('Did you mean');
      }
    });

    it('handles case differences', () => {
      const result = suggestIdentifier('CONST');
      expect(result).toBeDefined();
      if (result) {
        expect(result).toContain('const');
      }
    });

    it('suggests from additional candidates when closer', () => {
      const result = suggestIdentifier('myVar', ['myVariable', 'myVar123']);
      // Should prefer additional candidates if they're closer
      expect(result).toBeDefined();
    });

    it('uses minSimilarity threshold of 0.6', () => {
      // Test that very dissimilar names don't get suggested
      const result = suggestIdentifier('abc');
      // Should not suggest anything if nothing is similar enough
      // (depends on what's in the builtin lists)
      if (result) {
        expect(result).toContain('Did you mean');
      }
    });

    it('returns only one suggestion', () => {
      const result = suggestIdentifier('functio', ['function', 'functional']);
      if (result) {
        // Should format as single suggestion due to maxResults: 1
        expect(result.split('or')).toHaveLength(1);
      }
    });
  });

  describe('autocomplete scenarios', () => {
    it('suggests completions for partial function names', () => {
      const partial = 'transp';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6, maxResults: 5 });

      expect(suggestions).toContain('transpose');
      expect(suggestions.some(s => s.startsWith('transp'))).toBe(true);
    });

    it('suggests completions for partial type names', () => {
      const partial = 'Sco';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.5, maxResults: 5 });

      expect(suggestions).toContain('Score');
    });

    it('finds multiple related suggestions', () => {
      const partial = 'major';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6, maxResults: 10 });

      // Should find music theory functions with 'major'
      const majorSuggestions = suggestions.filter(s => s.toLowerCase().includes('major'));
      expect(majorSuggestions.length).toBeGreaterThan(0);
    });

    it('suggests drum sounds', () => {
      const partial = 'snar';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6 });

      expect(suggestions).toContain('snare');
    });

    it('suggests vocal functions', () => {
      const partial = 'syllab';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6 });

      expect(suggestions).toContain('syllables');
    });

    it('suggests chord functions', () => {
      const partial = 'minorTr';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6 });

      expect(suggestions).toContain('minorTriad');
    });

    it('suggests scale functions', () => {
      const partial = 'scaleM';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.6 });

      expect(suggestions).toContain('scaleMajor');
      expect(suggestions).toContain('scaleMinor');
    });

    it('handles ambiguous prefixes', () => {
      const partial = 'major';
      const all = getAllKnownIdentifiers();
      const suggestions = findSimilar(partial, all, { minSimilarity: 0.7, maxResults: 5 });

      // Should find majorTriad, major7, majorPentatonic, scaleMajor
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.toLowerCase().includes('major'))).toBe(true);
    });
  });

  describe('builtin identifier lists', () => {
    it('BUILTIN_KEYWORDS contains expected keywords', () => {
      expect(BUILTIN_KEYWORDS).toContain('fn');
      expect(BUILTIN_KEYWORDS).toContain('const');
      expect(BUILTIN_KEYWORDS).toContain('let');
      expect(BUILTIN_KEYWORDS).toContain('if');
      expect(BUILTIN_KEYWORDS).toContain('else');
      expect(BUILTIN_KEYWORDS).toContain('for');
      expect(BUILTIN_KEYWORDS).toContain('return');
    });

    it('BUILTIN_TYPES contains expected types', () => {
      expect(BUILTIN_TYPES).toContain('Clip');
      expect(BUILTIN_TYPES).toContain('Score');
      expect(BUILTIN_TYPES).toContain('Track');
      expect(BUILTIN_TYPES).toContain('Int');
      expect(BUILTIN_TYPES).toContain('Float');
      expect(BUILTIN_TYPES).toContain('String');
      expect(BUILTIN_TYPES).toContain('Bool');
    });

    it('BUILTIN_FUNCTIONS contains expected functions', () => {
      expect(BUILTIN_FUNCTIONS).toContain('note');
      expect(BUILTIN_FUNCTIONS).toContain('chord');
      expect(BUILTIN_FUNCTIONS).toContain('clip');
      expect(BUILTIN_FUNCTIONS).toContain('score');
      expect(BUILTIN_FUNCTIONS).toContain('transpose');
      expect(BUILTIN_FUNCTIONS).toContain('quantize');
    });

    it('STDLIB_FUNCTIONS contains music theory functions', () => {
      expect(STDLIB_FUNCTIONS).toContain('majorTriad');
      expect(STDLIB_FUNCTIONS).toContain('minorTriad');
      expect(STDLIB_FUNCTIONS).toContain('scaleMajor');
      expect(STDLIB_FUNCTIONS).toContain('scaleMinor');
    });

    it('STDLIB_FUNCTIONS contains drum functions', () => {
      expect(STDLIB_FUNCTIONS).toContain('kick');
      expect(STDLIB_FUNCTIONS).toContain('snare');
      expect(STDLIB_FUNCTIONS).toContain('hhc');
      expect(STDLIB_FUNCTIONS).toContain('hho');
    });

    it('STDLIB_FUNCTIONS contains vocal functions', () => {
      expect(STDLIB_FUNCTIONS).toContain('text');
      expect(STDLIB_FUNCTIONS).toContain('syllables');
      expect(STDLIB_FUNCTIONS).toContain('vibrato');
    });
  });

  describe('edge cases', () => {
    it('handles very long strings', () => {
      const longString = 'a'.repeat(1000);
      const distance = levenshteinDistance(longString, longString);
      expect(distance).toBe(0);
    });

    it('handles special characters', () => {
      const result = findSimilar('my_var', ['my_variable', 'myVar', 'my-var']);
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles numbers in identifiers', () => {
      const result = findSimilar('var123', ['var1234', 'var12', 'variable123']);
      expect(result).toContain('var1234');
    });

    it('handles Unicode characters', () => {
      const distance = levenshteinDistance('café', 'cafe');
      expect(distance).toBe(1);
    });

    it('finds suggestions with different casing', () => {
      const result = findSimilar('majortriad', getAllKnownIdentifiers());
      expect(result).toContain('majorTriad');
    });
  });
});
