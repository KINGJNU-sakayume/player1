import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './StatePanel.module.css';

interface StatePanelProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'neutral' | 'alert';
  size?: 'page' | 'inline' | 'compact';
  className?: string;
}

/** Designed empty / error / unavailable state. Never a browser alert. */
export function StatePanel({
  eyebrow,
  title,
  children,
  actions,
  tone = 'neutral',
  size = 'page',
  className,
}: StatePanelProps) {
  return (
    <section
      className={cx(
        styles.panel,
        tone === 'alert' && styles.alert,
        size === 'inline' && styles.inline,
        size === 'compact' && styles.compact,
        className,
      )}
      role={tone === 'alert' ? 'alert' : 'status'}
    >
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}

export function LoadingLine({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <div className={styles.loadingRule} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
