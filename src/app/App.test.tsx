import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { readConfig } from './config';
import { createAppServices } from './services';

function renderApp(path: string) {
  window.history.replaceState({}, '', path);
  const services = createAppServices(readConfig({ BASE_URL: '/', VITE_ENABLE_PREVIEW: 'true' }, 'http://localhost:3000'));
  return render(<App services={services} />);
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('App (preview catalogue)', () => {
  it('offers setup guidance and a preview when Spotify is not configured', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Spotify isn’t configured yet/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview without Spotify' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
    // Liked songs, followed artists and liked albums lead; playlists and history follow.
    const liked = await screen.findByRole('heading', { name: 'Liked songs' });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.slice(0, 3)).toEqual(['Liked songs', 'Artists', 'Liked albums']);
    expect(liked).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Vaundy' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
  });

  it('shows previous, play and next in the top-bar mini player', async () => {
    const user = userEvent.setup();
    renderApp('/?preview');
    const mini = await screen.findByRole('group', { name: 'Mini player' });
    await user.click(within(mini).getByRole('button', { name: 'Next track' }));
    expect(await within(mini).findByText('I THINK')).toBeInTheDocument();
    await user.click(within(mini).getByRole('button', { name: 'Previous track' }));
    expect(await within(mini).findByText('EARFQUAKE')).toBeInTheDocument();
    expect(within(mini).getByRole('button', { name: /^(Play|Pause)$/ })).toBeInTheDocument();
  });

  it('renders Now Playing with the synchronised line, its translation and working controls', async () => {
    const user = userEvent.setup();
    renderApp('/now-playing?preview');

    expect(await screen.findByRole('heading', { level: 1, name: 'EARFQUAKE' })).toBeInTheDocument();
    // The preview starts 57 s into the track: the active test line and its Korean translation.
    expect(await screen.findByText('Write it down before it fades')).toBeInTheDocument();
    expect(await screen.findByText('흐려지기 전에 적어 둬')).toBeInTheDocument();
    const upcoming = screen.getByRole('list', { name: 'Next lines' });
    expect(within(upcoming).getAllByRole('listitem')).toHaveLength(3);

    const toggle = screen.getByRole('button', { name: /Translation/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(screen.queryByText('흐려지기 전에 적어 둬')).not.toBeInTheDocument());
    expect(screen.getByText('Write it down before it fades')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next track' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'I THINK' })).toBeInTheDocument();

    const seek = screen.getByRole('slider', { name: 'Seek' });
    expect(seek).toHaveAttribute('aria-valuemax', '212');
  });

  it('uses the existing Now Playing stage for fullscreen focus mode and restores its controls on exit', async () => {
    const user = userEvent.setup();
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    const requestFullscreen = vi.fn(() => {
      fullscreenElement = document.querySelector('[data-page="now-playing"]');
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    renderApp('/now-playing?preview');
    const fullscreen = await screen.findByRole('button', { name: 'Enter fullscreen' });
    const translation = screen.getByRole('button', { name: /Translation/ });
    if (translation.getAttribute('aria-pressed') === 'false') await user.click(translation);
    expect(await screen.findByText('흐려지기 전에 적어 둬')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lyrics' })).toBeInTheDocument();

    await user.click(fullscreen);

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(fullscreenElement).toBe(screen.getByRole('heading', { level: 1, name: 'EARFQUAKE' }).closest('[data-page]'));
    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lyrics' })).not.toBeInTheDocument();
    expect(screen.getByText('Write it down before it fades')).toBeInTheDocument();
    expect(screen.getByText('흐려지기 전에 적어 둬')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();

    // Presentation mode does not replace the player: the existing global playback
    // shortcut still reaches the same engine while transport controls are hidden.
    await user.keyboard(' ');
    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).not.toBeInTheDocument();

    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(await screen.findByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Play|Pause)$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lyrics' })).toBeInTheDocument();
  });
});
