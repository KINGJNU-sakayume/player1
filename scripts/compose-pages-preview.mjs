// Composes one GitHub Pages site from two builds: the production build (main)
// at the root and a pull request build under a sub-directory, so a PR can be
// tried on the real site without merging it.
//
//   node scripts/compose-pages-preview.mjs <main-dist> <preview-dist> <out-dir> <preview-subdir>
//
// GitHub Pages serves a single 404.html (the root one) for every unknown path.
// The root 404.html therefore decides at load time which app's assets to boot:
// deep links and the OAuth callback under /<base>/<preview-subdir>/ start the
// preview app, everything else starts production.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [mainDist, previewDist, outDir, previewSubdir = 'preview'] = process.argv.slice(2);
if (!mainDist || !previewDist || !outDir) {
  console.error('usage: compose-pages-preview.mjs <main-dist> <preview-dist> <out-dir> [preview-subdir]');
  process.exit(1);
}

const SCRIPT = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>\s*/g;
const STYLE = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>\s*/g;
const PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*>\s*/g;

/** The app's own entry assets (fonts and other external stylesheets are left in place). */
function entryAssets(html) {
  const own = (url) => !/^https?:/.test(url);
  return {
    js: [...html.matchAll(SCRIPT)].map((m) => m[1]).filter(own),
    css: [...html.matchAll(STYLE)].map((m) => m[1]).filter(own),
  };
}

function stripEntryAssets(html) {
  return html
    .replace(SCRIPT, (tag, src) => (/^https?:/.test(src) ? tag : ''))
    .replace(STYLE, (tag, href) => (/^https?:/.test(href) ? tag : ''))
    .replace(PRELOAD, '');
}

const mainIndex = await readFile(resolve(mainDist, 'index.html'), 'utf8');
const previewIndex = await readFile(resolve(previewDist, 'index.html'), 'utf8');
const mainAssets = entryAssets(mainIndex);
const previewAssets = entryAssets(previewIndex);
if (mainAssets.js.length === 0 || previewAssets.js.length === 0) {
  throw new Error('Could not find the module entry script in one of the builds.');
}

// The preview's base path, e.g. "/player1/preview/", taken from its own asset URLs.
const previewBase = previewAssets.js[0].replace(/assets\/.*$/, '');
if (!previewBase.endsWith(`/${previewSubdir}/`)) {
  throw new Error(`The preview build is not based at /${previewSubdir}/ (found ${previewBase}).`);
}

const loader = `<script>
      (function () {
        var sets = ${JSON.stringify({ main: mainAssets, preview: previewAssets })};
        var set = location.pathname.indexOf(${JSON.stringify(previewBase)}) === 0 ? sets.preview : sets.main;
        set.css.forEach(function (href) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.crossOrigin = '';
          link.href = href;
          document.head.appendChild(link);
        });
        set.js.forEach(function (src) {
          var script = document.createElement('script');
          script.type = 'module';
          script.crossOrigin = '';
          script.src = src;
          document.head.appendChild(script);
        });
      })();
    </script>
  </head>`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(mainDist, outDir, { recursive: true });
await cp(previewDist, resolve(outDir, previewSubdir), { recursive: true });
await writeFile(resolve(outDir, '404.html'), stripEntryAssets(mainIndex).replace('</head>', loader));
console.log(`compose-pages-preview: production at /, preview at ${previewBase}`);
