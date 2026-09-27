import { describe, expect, it } from 'vitest';
import { getAlbumEditorial, getArtistEditorial } from './lookup';

const VAUNDY = '2IUl3m1H1EQ7QfNbNWvgru';
const TYLER = '4V8LLVI7PbaPR0K2TGSxFF';
const TRIPLES = '5Z71xE9prhpHrqL5thVMyK';

describe('artist editorial overrides', () => {
  it.each([
    ['Vaundy', VAUNDY],
    ['Tyler, The Creator', TYLER],
    ['tripleS', TRIPLES],
  ])('has a curated entry for %s', (name, id) => {
    const editorial = getArtistEditorial(id);
    expect(editorial?.name).toBe(name);
    expect(editorial?.bio?.length).toBeGreaterThan(0);
  });

  it('returns null for artists without an override (Spotify metadata only)', () => {
    expect(getArtistEditorial('0TnOYISbd1XYRBk9myaseg')).toBeNull();
    expect(getArtistEditorial(undefined)).toBeNull();
    expect(getArtistEditorial('')).toBeNull();
  });

  it('treats entries without usable content as absent and trims blank paragraphs', () => {
    const source = {
      empty: { artistId: 'empty', bio: ['   '] },
      partial: { artistId: 'partial', bio: ['', 'One paragraph.', '  '] },
    };
    expect(getArtistEditorial('empty', source)).toBeNull();
    expect(getArtistEditorial('partial', source)?.bio).toEqual(['One paragraph.']);
  });
});

describe('album editorial overrides', () => {
  it('returns descriptions for curated albums', () => {
    const igor = getAlbumEditorial('5zi7WsKlIiUXv09tbGLKsE');
    expect(igor?.description?.length).toBeGreaterThan(0);
    expect(igor?.language).toBe('ko');
  });

  it('omits albums without a description instead of inventing one', () => {
    expect(getAlbumEditorial('3RhkGySFESW5d50IlNWuP1')).toBeNull();
    expect(getAlbumEditorial('x', { x: { albumId: 'x', description: [''] } })).toBeNull();
  });
});
