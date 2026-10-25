// Load test for OUR built site only (never OpenF1): serves dist/ and hits the page and its
// bundle with concurrent connections, then checks errors and latency against budgets.
// Usage: npm run test:load [-- --connections 100 --duration 15]
import autocannon from 'autocannon';
import { serveBuild } from './serve-build.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const connections = arg('connections', 50);
const duration = arg('duration', 10);
const BUDGET = { p99Ms: 250, errorRate: 0 };

const run = (opts) =>
  new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });

const { url, close } = await serveBuild();
let failed = false;
try {
  const html = await (await fetch(`${url}/`)).text();
  const js = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  const css = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];

  console.log(`Load: ${connections} connections × ${duration}s against ${url}\n`);
  for (const [name, path] of [
    ['page', '/'],
    ['js bundle', js],
    ['stylesheet', css],
  ]) {
    const r = await run({ url: `${url}${path}`, connections, duration, pipelining: 1 });
    const total = r.requests.total;
    const bad = r.errors + r.timeouts + r.non2xx;
    const errorRate = total ? bad / total : 1;
    const ok = r.latency.p99 <= BUDGET.p99Ms && errorRate <= BUDGET.errorRate;
    failed ||= !ok;
    console.log(
      `${ok ? '✓' : '✗'} ${name.padEnd(10)} ${String(Math.round(r.requests.average)).padStart(6)} req/s` +
        `  p50 ${r.latency.p50}ms  p99 ${r.latency.p99}ms  max ${r.latency.max}ms` +
        `  ${total} requests, ${bad} errors`,
    );
  }
} finally {
  await close();
}
console.log(`\nBudget: p99 ≤ ${BUDGET.p99Ms}ms, zero errors. ${failed ? 'FAILED' : 'PASSED'}`);
process.exit(failed ? 1 : 0);
