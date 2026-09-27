import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEngine } from '../../playback/hooks';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * "/" focuses search; Space toggles playback when focus is not on a control
 * (so it never hijacks buttons, links or sliders).
 */
export function GlobalShortcuts() {
  const engine = useEngine();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === '/') {
        event.preventDefault();
        const input = document.getElementById('search-input') ?? document.getElementById('global-search');
        if (input) input.focus();
        else navigate('/search');
        return;
      }

      const target = event.target as HTMLElement | null;
      const onPage = !target || target === document.body || target.id === 'main';
      if (event.key === ' ' && onPage) {
        event.preventDefault();
        engine.activateAudio();
        void engine.togglePlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [engine, navigate]);

  return null;
}
