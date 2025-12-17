// Error definitions for TakoMusic language

import type { Position } from './types/token';

export class MFError extends Error {
  public suggestion?: string;

  constructor(
    public code: string,
    message: string,
    public position?: Position,
    public filePath?: string,
    suggestion?: string
  ) {
    super(message);
    this.name = 'MFError';
    this.suggestion = suggestion;
  }
}

// Find similar symbol names using Levenshtein distance
export function findSimilarSymbols(name: string, available: string[], maxDistance = 3): string[] {
  const results: { name: string; distance: number }[] = [];

  for (const sym of available) {
    const dist = levenshteinDistance(name.toLowerCase(), sym.toLowerCase());
    if (dist <= maxDistance) {
      results.push({ name: sym, distance: dist });
    }
  }

  return results
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((r) => r.name);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
