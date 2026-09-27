/**
 * Hand-curated editorial overrides. Kept separate from Spotify API models:
 * pages combine the two, and every field here is optional.
 */

export interface ArtistEditorial {
  /** Spotify artist ID (the key used for lookup). */
  artistId: string;
  /** Reference for whoever edits this file; the page always shows Spotify's name. */
  name?: string;
  /** BCP 47 language of `bio`, used for correct CJK glyph selection. */
  language?: string;
  /** Short biography paragraphs. */
  bio?: string[];
  /** Spotify album IDs to exhibit as "Selected releases", in order. */
  featuredReleaseIds?: string[];
  /** Fallback when an ID is unknown or changes: matched against the artist's discography by title. */
  featuredReleaseTitles?: string[];
}

export interface AlbumEditorial {
  /** Spotify album ID (the key used for lookup). */
  albumId: string;
  /** Reference for whoever edits this file. */
  title?: string;
  language?: string;
  /** 1–3 description paragraphs. */
  description?: string[];
}
