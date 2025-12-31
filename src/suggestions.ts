/**
 * Suggestions utility for "Did you mean?" style error messages
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Find the most similar string from a list of candidates
 * Returns null if no good match is found
 */
export function findSimilar(
  target: string,
  candidates: string[],
  options: {
    minSimilarity?: number;
    maxResults?: number;
    caseSensitive?: boolean;
  } = {}
): string[] {
  const { minSimilarity = 0.5, maxResults = 3, caseSensitive = false } = options;

  const normalizedTarget = caseSensitive ? target : target.toLowerCase();

  const scored = candidates
    .map((candidate) => {
      const normalizedCandidate = caseSensitive ? candidate : candidate.toLowerCase();
      return {
        candidate,
        score: similarityRatio(normalizedTarget, normalizedCandidate),
      };
    })
    .filter((item) => item.score >= minSimilarity)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((item) => item.candidate);
}

/**
 * Format a "Did you mean?" suggestion message
 */
export function formatSuggestion(suggestions: string[]): string | undefined {
  if (suggestions.length === 0) {
    return undefined;
  }

  if (suggestions.length === 1) {
    return `Did you mean '${suggestions[0]}'?`;
  }

  const lastSuggestion = suggestions[suggestions.length - 1];
  const otherSuggestions = suggestions.slice(0, -1);
  return `Did you mean ${otherSuggestions.map((s) => `'${s}'`).join(', ')} or '${lastSuggestion}'?`;
}

// Built-in keywords and functions for suggestions
export const BUILTIN_KEYWORDS = [
  'fn', 'const', 'let', 'if', 'else', 'for', 'in', 'return', 'match',
  'import', 'export', 'from', 'true', 'false', 'null',
];

export const BUILTIN_TYPES = [
  'Clip', 'Score', 'Track', 'Int', 'Float', 'String', 'Bool', 'Pitch', 'Dur',
  'Instrument', 'Drums', 'Vocal', 'Automation',
];

export const BUILTIN_FUNCTIONS = [
  'note', 'chord', 'hit', 'rest', 'breath',
  'clip', 'score', 'track', 'sound', 'meta', 'tempo', 'meter', 'place',
  'concat', 'repeat', 'length', 'overlay', 'slice', 'shift', 'padTo',
  'transpose', 'stretch', 'quantize', 'swing', 'humanize',
  'mapEvents', 'updateEvent',
  'linear', 'easeInOut', 'piecewise',
];

export const STDLIB_FUNCTIONS = [
  // std:theory
  'majorTriad', 'minorTriad', 'diminished', 'augmented', 'sus2', 'sus4',
  'major7', 'minor7', 'dominant7', 'diminished7', 'halfDiminished7',
  'scaleMajor', 'scaleMinor', 'harmonicMinor', 'melodicMinor',
  'majorPentatonic', 'minorPentatonic', 'blues', 'bebop',
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
  'transposeUp', 'transposeDown', 'transposeOctave',
  'pitchClass', 'octaveOf', 'makePitch',
  'arpeggioUp', 'arpeggioDown', 'arpeggioAlberti', 'arpeggioBroken',
  'progressionTwoFiveOne', 'progressionPopCanon', 'progressionBlues',
  'crescendo', 'decrescendo', 'accentPattern',
  // std:core
  'repeat', 'concat', 'overlay', 'length',
  // std:drums
  'kick', 'snare', 'hhc', 'hho', 'crash', 'ride', 'tom1', 'tom2', 'tom3', 'clap',
  // std:vocal
  'text', 'syllables', 'align', 'vibrato', 'autoBreath',
];

/**
 * Get all known identifiers for suggestion matching
 */
export function getAllKnownIdentifiers(): string[] {
  return [
    ...BUILTIN_KEYWORDS,
    ...BUILTIN_TYPES,
    ...BUILTIN_FUNCTIONS,
    ...STDLIB_FUNCTIONS,
  ];
}

/**
 * Suggest a similar identifier when one is not found
 */
export function suggestIdentifier(
  unknown: string,
  additionalCandidates: string[] = []
): string | undefined {
  const allCandidates = [...getAllKnownIdentifiers(), ...additionalCandidates];
  const similar = findSimilar(unknown, allCandidates, { minSimilarity: 0.6, maxResults: 1 });
  return formatSuggestion(similar);
}
