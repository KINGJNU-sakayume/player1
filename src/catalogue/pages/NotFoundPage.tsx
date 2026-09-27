import { usePageTitle } from '../../app/pageTitle';
import { ButtonLink } from '../components/Button';
import { StatePanel } from '../components/StatePanel';
import styles from './Page.module.css';

export function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <div className={styles.page}>
      <StatePanel
        eyebrow="404"
        title="There is no page at this address"
        actions={
          <>
            <ButtonLink to="/" variant="primary" icon="home">
              Home
            </ButtonLink>
            <ButtonLink to="/search" icon="search">
              Search
            </ButtonLink>
          </>
        }
      >
        <p>The link may be outdated. Albums and artists open from their Spotify ID.</p>
      </StatePanel>
    </div>
  );
}
