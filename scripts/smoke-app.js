// Smoke test for the production build: build, serve, and check the page and every asset it
// references load with the right types. Fails fast with a non-zero exit code.
// Usage: npm run test:smoke:app
import { serveBuild } from './serve-build.js';

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const { url, close } = await serveBuild();
try {
  const res = await fetch(`${url}/`);
  const html = await res.text();
  check('GET / returns 200', res.status === 200, `${res.status}`);
  check('page has the React root', html.includes('<div id="root"></div>'));
  check(
    'page has a viewport meta for mobile',
    /<meta name="viewport"[^>]*width=device-width/.test(html),
  );
  check('page has a title', /<title>[^<]+<\/title>/.test(html));

  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  check(
    'page references built JS and CSS',
    assets.some((a) => a.endsWith('.js')) && assets.some((a) => a.endsWith('.css')),
    assets.join(', '),
  );

  for (const path of assets) {
    const r = await fetch(`${url}${path}`);
    const type = r.headers.get('content-type') ?? '';
    const body = await r.text();
    const expected = path.endsWith('.js') ? 'javascript' : 'css';
    check(
      `GET ${path}`,
      r.status === 200 && type.includes(expected) && body.length > 0,
      `${r.status} ${type} ${body.length}B`,
    );
    if (path.endsWith('.js')) {
      check('bundle talks to OpenF1', body.includes('api.openf1.org'));
      check('bundle has no source-map or dev-server leftovers', !body.includes('/@vite/client'));
    }
  }

  const missing = await fetch(`${url}/assets/does-not-exist.js`);
  check(
    'unknown asset is not served as JS',
    !(missing.headers.get('content-type') ?? '').includes('javascript'),
    `${missing.status}`,
  );
} finally {
  await close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} app smoke checks passed`);
process.exit(failed.length ? 1 : 0);
