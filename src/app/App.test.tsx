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
    expect(await screen.findByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
  });

  it('renders Now Playing with the synchronised line, its translation and working controls', async () => {
    const user = userEvent.setup();
    renderApp('/now-playing?preview');

    expect(await screen.findByRole('heading', { level: 1, name: 'EARFQUAKE' })).toBeInTheDocument();
    // The preview starts 57 s into the track: the active test line and its Korean translation.
    expect(await screen.findByText('Write it down before it fades')).toBeInTheDocument();
    expect(await screen.findByText('흐려지기 전에 적어 둬')).toBeInTheDocument();
    const upcoming = screen.getByRole('list', { name: 'Next lines' });
    expect(within(upcoming).getAllByRole('listitem')).toHaveLength(2);

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
});
