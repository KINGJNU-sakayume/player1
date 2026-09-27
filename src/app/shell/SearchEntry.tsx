import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../catalogue/components/Icon';
import styles from './SearchEntry.module.css';

/** Compact search entry point; submitting opens the Search page. Focus with "/". */
export function SearchEntry({ id = 'global-search' }: { id?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  return (
    <form
      role="search"
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
        setValue('');
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        Search Spotify
      </label>
      <Icon name="search" size={18} className={styles.icon} />
      <input
        id={id}
        className={styles.input}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search"
        autoComplete="off"
        spellCheck={false}
        aria-keyshortcuts="/"
      />
      <kbd className={styles.kbd} aria-hidden="true">
        /
      </kbd>
    </form>
  );
}
