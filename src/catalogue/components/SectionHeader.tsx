import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  id: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
}

/** Catalogue section heading: a hairline rule, title, count and optional action. */
export function SectionHeader({ id, title, meta, action, as: Heading = 'h2' }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      <Heading id={id} className={styles.title}>
        {title}
      </Heading>
      {meta !== undefined && meta !== null && <span className={styles.meta}>{meta}</span>}
      {action && <div className={styles.action}>{action}</div>}
    </header>
  );
}
