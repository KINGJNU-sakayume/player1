import { Link, NavLink } from 'react-router';
import { Icon, type IconName } from '../../catalogue/components/Icon';
import { Logo } from '../../catalogue/components/Logo';
import { cx } from '../../lib/cx';
import { useSessionControls } from '../sessionControls';
import { useSession } from '../sessionContext';
import styles from './AppShell.module.css';
import { useQueueDrawer } from './queueDrawerContext';

const NAV: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/now-playing', label: 'Now playing', icon: 'disc' },
];

export function Rail() {
  const { mode } = useSession();
  const controls = useSessionControls();
  const queue = useQueueDrawer();

  return (
    <aside className={styles.rail}>
      <Link to="/" className={styles.logo} aria-label="ARC Music, home">
        <Logo size={40} />
      </Link>
      <nav aria-label="Primary">
        <ul className={styles.nav}>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={styles.navItem}>
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.railFoot}>
        <button type="button" className={cx(styles.navItem, styles.railButton)} onClick={queue.open}>
          <Icon name="queue" size={22} />
          <span>Queue</span>
        </button>
        <button
          type="button"
          className={cx(styles.navItem, styles.railButton)}
          onClick={mode === 'preview' ? controls.exitPreview : controls.signOut}
        >
          <Icon name="logout" size={22} />
          <span>{mode === 'preview' ? 'Exit preview' : 'Log out'}</span>
        </button>
      </div>
    </aside>
  );
}
