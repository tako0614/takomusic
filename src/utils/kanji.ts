// Kanji to Hiragana conversion utility using kuroshiro

// @ts-ignore - kuroshiro has no type definitions
import KuroshiroModule from 'kuroshiro';
// @ts-ignore - kuroshiro-analyzer-kuromoji has no type definitions
import KuromojiAnalyzerModule from 'kuroshiro-analyzer-kuromoji';

// Handle both ESM and CommonJS module formats
const Kuroshiro = (KuroshiroModule as { default?: unknown }).default || KuroshiroModule;
const KuromojiAnalyzer = (KuromojiAnalyzerModule as { default?: unknown }).default || KuromojiAnalyzerModule;

// Singleton instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kuroshiroInstance: any = null;
let initPromise: Promise<void> | null = null;

// Check if string contains kanji (CJK Unified Ideographs)
export function containsKanji(str: string): boolean {
  return /[\u4E00-\u9FFF]/.test(str);
}

// Initialize kuroshiro (must be called before conversion)
async function initKuroshiro(): Promise<void> {
  if (kuroshiroInstance) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kuroshiroInstance = new (Kuroshiro as any)();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await kuroshiroInstance.init(new (KuromojiAnalyzer as any)());
  })();

  await initPromise;
}

/**
 * Convert kanji to hiragana
 * @param text Text that may contain kanji
 * @returns Text with kanji converted to hiragana
 */
export async function kanjiToHiragana(text: string): Promise<string> {
  if (!containsKanji(text)) {
    return text;
  }

  await initKuroshiro();

  if (!kuroshiroInstance) {
    throw new Error('Failed to initialize kuroshiro');
  }

  return kuroshiroInstance.convert(text, { to: 'hiragana' });
}

/**
 * Convert kanji to hiragana synchronously using cache
 * For use in contexts where async is not available
 * Returns original text if conversion not cached
 */
const conversionCache = new Map<string, string>();

export async function preloadKanjiConversions(texts: string[]): Promise<void> {
  const textsWithKanji = texts.filter(containsKanji);
  if (textsWithKanji.length === 0) return;

  await initKuroshiro();

  for (const text of textsWithKanji) {
    if (!conversionCache.has(text)) {
      const converted = await kanjiToHiragana(text);
      conversionCache.set(text, converted);
    }
  }
}

export function getCachedHiragana(text: string): string | null {
  return conversionCache.get(text) ?? null;
}

/**
 * Convert all kanji lyrics in an array of note-like objects
 * Returns the texts with kanji converted to hiragana
 */
export async function convertKanjiLyrics(
  lyrics: string[]
): Promise<{ original: string; converted: string }[]> {
  const results: { original: string; converted: string }[] = [];

  for (const lyric of lyrics) {
    if (containsKanji(lyric)) {
      const converted = await kanjiToHiragana(lyric);
      results.push({ original: lyric, converted });
    }
  }

  return results;
}

// Small kana that combine with previous character (don't count as separate syllables)
const SMALL_KANA = /[ゃゅょぁぃぅぇぉっャュョァィゥェォッ]/;

/**
 * Count Japanese syllables (morae) in a string
 * Small kana don't count as separate syllables
 */
export function countSyllables(lyric: string): number {
  // Remove small kana (they don't count as separate syllables)
  const withoutSmall = lyric.replace(new RegExp(SMALL_KANA.source, 'g'), '');
  // Count remaining kana characters
  const kanaOnly = withoutSmall.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
  return kanaOnly.length;
}

/**
 * Split a lyric into syllables (morae)
 * Returns array of syllables, each 1-2 characters
 * Small kana are grouped with the previous character
 */
export function splitIntoSyllables(lyric: string): string[] {
  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < lyric.length; i++) {
    const char = lyric[i];

    // Check if next char is small kana (should be grouped)
    const nextChar = lyric[i + 1];
    const nextIsSmall = nextChar && SMALL_KANA.test(nextChar);

    if (current === '') {
      current = char;
      if (nextIsSmall) {
        current += nextChar;
        i++; // Skip next char since we added it
      }
      syllables.push(current);
      current = '';
    } else {
      // This shouldn't happen normally
      syllables.push(current);
      current = char;
      if (nextIsSmall) {
        current += nextChar;
        i++;
      }
      syllables.push(current);
      current = '';
    }
  }

  if (current) {
    syllables.push(current);
  }

  return syllables;
}

/**
 * Split lyric into chunks of max 2 syllables each
 * For NEUTRINO compatibility
 */
export function splitLyricForNeutrino(lyric: string): string[] {
  const syllables = splitIntoSyllables(lyric);

  if (syllables.length <= 2) {
    return [lyric];
  }

  // Group into chunks of 2 syllables
  const chunks: string[] = [];
  for (let i = 0; i < syllables.length; i += 2) {
    const chunk = syllables.slice(i, i + 2).join('');
    chunks.push(chunk);
  }

  return chunks;
}
