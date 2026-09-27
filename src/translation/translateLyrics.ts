import { BoundedCache } from '../lib/boundedCache';
import { hashString } from '../lib/hash';
import type { TimedLyrics } from '../lyrics/types';
import { detectLineLanguages, sameLanguage } from './languageDetect';
import { TranslationUnavailableError, type TranslationProvider } from './TranslationProvider';

export type LyricTranslationResult =
  /** Every line is already in the target language. */
  | { status: 'not-needed' }
  /** One entry per lyric line; empty string when the line has no translation. */
  | { status: 'ready'; lines: string[] }
  | { status: 'needs-download'; sourceLanguage: string }
  | { status: 'unavailable'; message: string };

const TTL_MS = 60 * 24 * 60 * 60_000;
const defaultCache = new BoundedCache<string[]>({ prefix: 'arc.translation.v1:', maxEntries: 150 });

/**
 * Translates only the lines that are not already in the target language,
 * grouped by detected source language (mixed Korean/English lyrics translate
 * just the English lines). Results are cached by provider, track, language
 * pair and a hash of the source text.
 */
export async function translateLyrics(
  provider: TranslationProvider,
  trackId: string,
  lyrics: TimedLyrics,
  targetLanguage: string,
  cache: BoundedCache<string[]> = defaultCache,
): Promise<LyricTranslationResult> {
  const texts = lyrics.lines.map((line) => line.text);
  const languages = detectLineLanguages(texts, lyrics.language);

  const groups = new Map<string, number[]>();
  languages.forEach((language, index) => {
    if (!language || sameLanguage(language, targetLanguage)) return;
    const group = groups.get(language) ?? [];
    group.push(index);
    groups.set(language, group);
  });
  if (groups.size === 0) return { status: 'not-needed' };

  const output = texts.map(() => '');
  for (const [sourceLanguage, indices] of groups) {
    const groupLines = indices.map((i) => lyrics.lines[i]!);
    const key = `${provider.id}:${trackId}:${sourceLanguage}>${targetLanguage}:${hashString(groupLines.map((l) => l.text).join('\n'))}`;
    let translated = cache.get(key);
    if (!translated) {
      if (provider.availability) {
        const availability = await provider.availability(sourceLanguage, targetLanguage);
        if (availability === 'needs-download') return { status: 'needs-download', sourceLanguage };
        if (availability === 'unavailable') {
          return { status: 'unavailable', message: 'Translation for this language is not available on this device.' };
        }
      }
      try {
        translated = await provider.translateLines(groupLines, sourceLanguage, targetLanguage);
      } catch (error) {
        if (error instanceof TranslationUnavailableError && error.reason === 'needs-download') {
          return { status: 'needs-download', sourceLanguage };
        }
        return {
          status: 'unavailable',
          message: error instanceof Error ? error.message : 'Translation failed.',
        };
      }
      if (translated.length !== groupLines.length) {
        return { status: 'unavailable', message: 'The translation provider returned an incomplete result.' };
      }
      cache.set(key, translated, TTL_MS);
    }
    indices.forEach((lineIndex, i) => {
      output[lineIndex] = translated![i] ?? '';
    });
  }
  return output.some(Boolean) ? { status: 'ready', lines: output } : { status: 'unavailable', message: 'No translation was produced.' };
}
