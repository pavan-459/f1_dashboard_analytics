// Usage: npm run record -- <session_key> [--latest]
// Fetches a session from OpenF1 and saves it to fixtures/sessions/<session_key>.json.
// --latest also writes it as fixtures/sessions/latest.json (the default replay fixture).
import { mkdir, writeFile } from 'node:fs/promises';
import {
  getSessions,
  getDrivers,
  getLaps,
  getIntervals,
  getStints,
  getPosition,
} from '../src/data/openf1Client.js';

const [sessionKey, ...flags] = process.argv.slice(2);
if (!sessionKey) {
  console.error('Usage: npm run record -- <session_key> [--latest]');
  process.exit(1);
}

// OpenF1 rate-limits bursts, so fetch one endpoint at a time.
const [session] = await getSessions({ session_key: sessionKey });
if (!session) {
  console.error(`No session found for session_key=${sessionKey}`);
  process.exit(1);
}
const drivers = await getDrivers(sessionKey);
const laps = await getLaps(sessionKey);
const intervals = await getIntervals(sessionKey);
const stints = await getStints(sessionKey);
const position = await getPosition(sessionKey);

const json = JSON.stringify({ session, drivers, laps, intervals, stints, position });
const dir = new URL('../fixtures/sessions/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL(`${sessionKey}.json`, dir), json);
if (flags.includes('--latest')) await writeFile(new URL('latest.json', dir), json);

console.log(
  `Saved ${session.session_name} ${session.year} ${session.location} (${sessionKey}): ` +
    `${drivers.length} drivers, ${laps.length} laps, ${intervals.length} intervals, ` +
    `${stints.length} stints, ${position.length} positions`,
);
