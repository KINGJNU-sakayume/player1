import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSession } from '../app/sessionContext';
import { hashString } from '../lib/hash';
import type { TimedLyrics } from '../lyrics/types';
import { translateLyrics, type LyricTranslationResult } from './translateLyrics';

export type TranslationState =
  | { status: 'off' }
  | { status: 'unsupported' }
  | { status: 'loading' }
  | LyricTranslationResult;

/**
 * Translation for the current lyrics. Independent of lyric display: when it
 * fails, lyrics keep working and only the translation row disappears.
 */
export function useLyricTranslation(
  trackId: string | null,
  lyrics: TimedLyrics | null,
  enabled: boolean,
): { state: TranslationState; prepare: (() => Promise<void>) | null } {
  const { translation: provider, translationTarget, mode } = useSession();
  const queryClient = useQueryClient();
  const lyricsHash = lyrics ? hashString(lyrics.lines.map((l) => l.text).join('\n')) : null;
  const queryKey = [mode, 'translation', provider?.id, trackId, translationTarget, lyricsHash];

  const query = useQuery({
    queryKey,
    enabled: Boolean(enabled && provider && trackId && lyrics),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: () => translateLyrics(provider!, trackId!, lyrics!, translationTarget),
  });

  const data = query.data;
  const sourceLanguage = data?.status === 'needs-download' ? data.sourceLanguage : null;
  const prepare = useCallback(async () => {
    if (!provider?.prepare || !sourceLanguage) return;
    await provider.prepare(sourceLanguage, translationTarget);
    await queryClient.invalidateQueries({
      queryKey: [mode, 'translation', provider.id, trackId, translationTarget, lyricsHash],
    });
  }, [provider, sourceLanguage, translationTarget, queryClient, mode, trackId, lyricsHash]);

  if (!enabled) return { state: { status: 'off' }, prepare: null };
  if (!provider) return { state: { status: 'unsupported' }, prepare: null };
  if (!lyrics || !trackId) return { state: { status: 'off' }, prepare: null };
  if (query.isPending) return { state: { status: 'loading' }, prepare: null };
  if (query.isError || !data) {
    return { state: { status: 'unavailable', message: 'Translation failed.' }, prepare: null };
  }
  return { state: data, prepare: data.status === 'needs-download' && provider.prepare ? prepare : null };
}
