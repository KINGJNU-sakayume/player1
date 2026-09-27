// Static hosts such as GitHub Pages have no SPA fallback. Serving the app shell
// as 404.html lets deep links (/album/:id) and the OAuth /callback route load
// the client router instead of the host's error page.
import { copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const index = resolve(dist, 'index.html');

await access(index);
await copyFile(index, resolve(dist, '404.html'));
console.log('postbuild: dist/404.html written (SPA fallback for static hosting)');
