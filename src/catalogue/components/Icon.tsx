import type { ReactElement } from 'react';

export type IconName =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'shuffle'
  | 'volume'
  | 'volume-mute'
  | 'queue'
  | 'heart'
  | 'heart-filled'
  | 'device'
  | 'search'
  | 'home'
  | 'disc'
  | 'close'
  | 'arrow-right'
  | 'external'
  | 'translate'
  | 'check'
  | 'plus'
  | 'logout'
  | 'refresh';

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'square' as const };

const PATHS: Record<IconName, ReactElement> = {
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  pause: <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" fill="currentColor" />,
  next: <path d="M5.5 6v12l9-6zM16.2 6h2.1v12h-2.1z" fill="currentColor" />,
  previous: <path d="M18.5 6v12l-9-6zM5.7 6h2.1v12H5.7z" fill="currentColor" />,
  shuffle: <path d="M4 7h3.2l8.6 10H20M4 17h3.2l8.6-10H20M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" {...stroke} />,
  volume: (
    <>
      <path d="M4 9.5h3.4L12 6v12l-4.6-3.5H4z" fill="currentColor" />
      <path d="M15.2 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.6 7.6 0 0 1 0 10.8" {...stroke} strokeLinecap="butt" />
    </>
  ),
  'volume-mute': (
    <>
      <path d="M4 9.5h3.4L12 6v12l-4.6-3.5H4z" fill="currentColor" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" {...stroke} />
    </>
  ),
  queue: (
    <>
      <path d="M4 7h16M4 12h16M4 17h9" {...stroke} />
      <path d="M16 14.5v6l4.8-3z" fill="currentColor" />
    </>
  ),
  heart: <path d="M12 19.2s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 7.7a3.8 3.8 0 0 1 7 2.1c0 5.2-7 9.4-7 9.4z" {...stroke} strokeLinecap="butt" strokeLinejoin="round" />,
  'heart-filled': (
    <path
      d="M12 19.2s-7-4.2-7-9.4A3.8 3.8 0 0 1 12 7.7a3.8 3.8 0 0 1 7 2.1c0 5.2-7 9.4-7 9.4z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  ),
  device: <path d="M4.5 5.5h15v10h-15zM2.5 18.5h19" {...stroke} />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" {...stroke} />
      <path d="M15 15l5 5" {...stroke} />
    </>
  ),
  home: <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" {...stroke} />,
  disc: (
    <>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <circle cx="12" cy="12" r="2.2" {...stroke} />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" {...stroke} />,
  'arrow-right': <path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5" {...stroke} />,
  external: <path d="M13.5 5.5h5v5M18.5 5.5l-8 8M16.5 14v4.5h-11v-11H10" {...stroke} />,
  translate: (
    <>
      <path d="M3.5 6h8.5M7.75 4v2M5.5 6c.5 3 2.4 5.3 5 6.4M10 6c-.6 3-2.6 5.4-5.5 6.6" {...stroke} strokeLinecap="butt" />
      <path d="M12.5 20l3.8-9 3.8 9M13.8 17h5" {...stroke} strokeLinecap="butt" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} />,
  plus: <path d="M12 5v14M5 12h14" {...stroke} />,
  logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" {...stroke} />,
  refresh: <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V9h-4.5" {...stroke} />,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Decorative icon; the surrounding control carries the accessible label. */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
