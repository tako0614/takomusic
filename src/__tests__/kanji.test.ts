import { describe, it, expect, beforeAll } from 'vitest';
import {
  containsKanji,
  kanjiToHiragana,
  preloadKanjiConversions,
  getCachedHiragana,
  convertKanjiLyrics,
  countSyllables,
  splitIntoSyllables,
  countPhonemes,
  splitLyricBySyllables,
} from '../utils/kanji.js';

describe('kanji utilities', () => {
  describe('containsKanji', () => {
    it('detects kanji in text', () => {
      expect(containsKanji('音楽')).toBe(true);
      expect(containsKanji('今日は')).toBe(true);
      expect(containsKanji('hello 世界')).toBe(true);
    });

    it('returns false for hiragana only', () => {
      expect(containsKanji('おんがく')).toBe(false);
      expect(containsKanji('きょうは')).toBe(false);
    });

    it('returns false for katakana only', () => {
      expect(containsKanji('オンガク')).toBe(false);
      expect(containsKanji('キョウハ')).toBe(false);
    });

    it('returns false for romaji', () => {
      expect(containsKanji('ongaku')).toBe(false);
      expect(containsKanji('kyouha')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(containsKanji('')).toBe(false);
    });

    it('returns false for numbers and punctuation', () => {
      expect(containsKanji('123')).toBe(false);
      expect(containsKanji('!?.')).toBe(false);
    });
  });

  describe('kanjiToHiragana', () => {
    it('converts simple kanji to hiragana', async () => {
      const result = await kanjiToHiragana('音楽');
      expect(result).toBe('おんがく');
    });

    it('converts kanji with okurigana', async () => {
      const result = await kanjiToHiragana('食べる');
      expect(result).toBe('たべる');
    });

    it('converts mixed kanji and kana', async () => {
      const result = await kanjiToHiragana('今日は');
      expect(result).toBe('きょうは');
    });

    it('preserves hiragana-only text', async () => {
      const result = await kanjiToHiragana('ひらがな');
      expect(result).toBe('ひらがな');
    });

    it('converts complex phrases', async () => {
      const result = await kanjiToHiragana('桜が咲く');
      expect(result).toBe('さくらがさく');
    });

    it('handles empty string', async () => {
      const result = await kanjiToHiragana('');
      expect(result).toBe('');
    });

    it('handles text without kanji', async () => {
      const result = await kanjiToHiragana('hello');
      expect(result).toBe('hello');
    });
  });

  describe('conversion caching', () => {
    beforeAll(async () => {
      // Preload some conversions
      await preloadKanjiConversions(['音楽', '今日', '桜']);
    });

    it('retrieves cached conversions', () => {
      expect(getCachedHiragana('音楽')).toBe('おんがく');
      expect(getCachedHiragana('今日')).toBe('きょう');
      expect(getCachedHiragana('桜')).toBe('さくら');
    });

    it('returns null for uncached text', () => {
      expect(getCachedHiragana('未登録')).toBe(null);
    });

    it('returns null for hiragana-only text', () => {
      expect(getCachedHiragana('ひらがな')).toBe(null);
    });

    it('preload skips text without kanji', async () => {
      await preloadKanjiConversions(['hello', 'ひらがな', 'カタカナ']);
      expect(getCachedHiragana('hello')).toBe(null);
      expect(getCachedHiragana('ひらがな')).toBe(null);
    });

    it('handles preload with empty array', async () => {
      await expect(preloadKanjiConversions([])).resolves.toBeUndefined();
    });
  });

  describe('convertKanjiLyrics', () => {
    it('converts array of lyrics with kanji', async () => {
      const lyrics = ['音楽', 'ひらがな', '今日は'];
      const result = await convertKanjiLyrics(lyrics);

      expect(result).toHaveLength(2); // Only items with kanji
      expect(result[0]).toEqual({ original: '音楽', converted: 'おんがく' });
      expect(result[1]).toEqual({ original: '今日は', converted: 'きょうは' });
    });

    it('returns empty array when no kanji present', async () => {
      const lyrics = ['ひらがな', 'hello', 'カタカナ'];
      const result = await convertKanjiLyrics(lyrics);
      expect(result).toHaveLength(0);
    });

    it('handles empty array', async () => {
      const result = await convertKanjiLyrics([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('countSyllables', () => {
    it('counts hiragana syllables', () => {
      expect(countSyllables('さくら')).toBe(3);
      expect(countSyllables('おんがく')).toBe(4);
    });

    it('counts katakana syllables', () => {
      expect(countSyllables('サクラ')).toBe(3);
      expect(countSyllables('オンガク')).toBe(4);
    });

    it('does not count small kana as separate syllables', () => {
      expect(countSyllables('きょう')).toBe(2); // きょ + う
      expect(countSyllables('しゃ')).toBe(1); // Small ゃ doesn't count
      expect(countSyllables('ちゃん')).toBe(2); // ちゃ + ん
    });

    it('handles small tsu (っ)', () => {
      expect(countSyllables('がっこう')).toBe(3); // が + っ doesn't count + こ + う
      expect(countSyllables('きって')).toBe(2); // き + って (っ doesn't count)
    });

    it('handles mixed hiragana and katakana', () => {
      expect(countSyllables('ひらガナ')).toBe(4);
    });

    it('ignores non-kana characters', () => {
      expect(countSyllables('hello さくら')).toBe(3);
      expect(countSyllables('123あいう')).toBe(3);
    });

    it('returns 0 for empty string', () => {
      expect(countSyllables('')).toBe(0);
    });

    it('returns 0 for non-Japanese text', () => {
      expect(countSyllables('hello')).toBe(0);
      expect(countSyllables('123')).toBe(0);
    });
  });

  describe('splitIntoSyllables', () => {
    it('splits simple hiragana', () => {
      expect(splitIntoSyllables('さくら')).toEqual(['さ', 'く', 'ら']);
      expect(splitIntoSyllables('あいう')).toEqual(['あ', 'い', 'う']);
    });

    it('groups small kana with previous character', () => {
      expect(splitIntoSyllables('きょう')).toEqual(['きょ', 'う']);
      expect(splitIntoSyllables('しゃしん')).toEqual(['しゃ', 'し', 'ん']);
      expect(splitIntoSyllables('ちょっと')).toEqual(['ちょ', 'っ', 'と']);
    });

    it('handles small tsu', () => {
      expect(splitIntoSyllables('がっこう')).toEqual(['がっ', 'こ', 'う']);
      expect(splitIntoSyllables('きって')).toEqual(['きっ', 'て']);
    });

    it('handles katakana', () => {
      expect(splitIntoSyllables('サクラ')).toEqual(['サ', 'ク', 'ラ']);
      expect(splitIntoSyllables('キョウ')).toEqual(['キョ', 'ウ']);
    });

    it('handles mixed content', () => {
      expect(splitIntoSyllables('aさくらb')).toEqual(['a', 'さ', 'く', 'ら', 'b']);
    });

    it('returns empty array for empty string', () => {
      expect(splitIntoSyllables('')).toEqual([]);
    });

    it('handles single character', () => {
      expect(splitIntoSyllables('あ')).toEqual(['あ']);
      expect(splitIntoSyllables('a')).toEqual(['a']);
    });
  });

  describe('countPhonemes', () => {
    it('counts vowel phonemes', () => {
      expect(countPhonemes('あいうえお')).toBe(5); // 1 each
      expect(countPhonemes('アイウエオ')).toBe(5);
    });

    it('counts consonant+vowel phonemes', () => {
      expect(countPhonemes('さくら')).toBe(6); // sa(2) + ku(2) + ra(2)
      expect(countPhonemes('たこ')).toBe(4); // ta(2) + ko(2)
    });

    it('counts palatalized consonants correctly', () => {
      // Characters that can take small ya/yu/yo
      expect(countPhonemes('き')).toBe(2); // ki = k + i
      expect(countPhonemes('きゃ')).toBe(3); // kya = k + y + a
      expect(countPhonemes('しゅ')).toBe(3); // shu = sh + y + u
      expect(countPhonemes('ちょ')).toBe(3); // cho = ch + y + o
    });

    it('counts small tsu (geminate)', () => {
      expect(countPhonemes('っ')).toBe(1);
      expect(countPhonemes('がっこう')).toBe(6); // ga(2) + っ(1) + ko(2) + u(1)
    });

    it('counts n sound', () => {
      expect(countPhonemes('ん')).toBe(1);
      expect(countPhonemes('さん')).toBe(3); // sa(2) + n(1)
    });

    it('handles mixed hiragana and katakana', () => {
      expect(countPhonemes('さクラ')).toBe(6); // sa(2) + ku(2) + ra(2)
    });

    it('returns 0 for empty string', () => {
      expect(countPhonemes('')).toBe(0);
    });

    it('returns 0 for non-kana characters', () => {
      expect(countPhonemes('hello')).toBe(0);
      expect(countPhonemes('123')).toBe(0);
    });

    it('handles complex lyrics', () => {
      // "kyou" = きょう = ki + yo + u (with small yo)
      expect(countPhonemes('きょう')).toBe(4); // ki(2) + yo(small, 1) + u(1)
    });
  });

  describe('splitLyricBySyllables', () => {
    it('returns single chunk when within limit', () => {
      const result = splitLyricBySyllables('さくら', 7);
      expect(result).toEqual(['さくら']);
    });

    it('splits when exceeding syllable limit', () => {
      const result = splitLyricBySyllables('あいうえおかきくけこ', 5);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('あいうえお');
      expect(result[1]).toBe('かきくけこ');
    });

    it('uses default maxSyllables of 7', () => {
      const lyric = 'あいうえおかきくけこ'; // 10 syllables
      const result = splitLyricBySyllables(lyric);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('あいうえおかき');
      expect(result[1]).toBe('くけこ');
    });

    it('handles small kana grouping in chunks', () => {
      const result = splitLyricBySyllables('きょうのてんきはいい', 4);
      // きょ(1) う(2) の(3) て(4) | ん(5) き(6) は(7) い(8) | い(9)
      expect(result).toHaveLength(3);
    });

    it('handles empty string', () => {
      const result = splitLyricBySyllables('');
      expect(result).toEqual(['']);
    });

    it('handles single syllable', () => {
      const result = splitLyricBySyllables('あ', 7);
      expect(result).toEqual(['あ']);
    });

    it('splits into multiple chunks for very long lyrics', () => {
      const lyric = 'あいうえおかきくけこさしすせそたちつてと'; // 20 syllables
      const result = splitLyricBySyllables(lyric, 5);
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('あいうえお');
      expect(result[1]).toBe('かきくけこ');
      expect(result[2]).toBe('さしすせそ');
      expect(result[3]).toBe('たちつてと');
    });

    it('respects custom maxSyllables parameter', () => {
      const lyric = 'さくら'; // 3 syllables
      const result = splitLyricBySyllables(lyric, 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('さく');
      expect(result[1]).toBe('ら');
    });
  });
});
