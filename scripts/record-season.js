// Usage: npm run record:season -- <year>
// Saves everything the season dashboard loads to fixtures/seasons/<year>.json, for tests.
import { mkdir, writeFile } from 'node:fs/promises';
import { loadSeason } from '../src/data/championshipSource.js';

const year = Number(process.argv[2]);
if (!year) {
  console.error('Usage: npm run record:season -- <year>');
  process.exit(1);
}

const season = await loadSeason(year);
const dir = new URL('../fixtures/seasons/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL(`${year}.json`, dir), JSON.stringify(season));
console.log(
  `Saved ${year}: ${season.sessions.length} race/sprint sessions, ` +
    `${season.driverStandings.length} driver standings rows, ` +
    `${season.teamStandings.length} team rows, ${season.drivers.length} driver records`,
);
