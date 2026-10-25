// Smoke test against the live OpenF1 API: one request per endpoint the dashboard uses,
// checking the response still has the fields the app reads. ~9 requests, spaced by the client.
// This is not a load test — never point load at OpenF1.
// Usage: npm run test:smoke:api [-- <year>]
import { MULTIVIEWER_BASE_URL } from '../src/data/circuitSource.js';
import { createClient } from '../src/data/openf1Client.js';

const api = createClient();
const results = [];

async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, ok: true });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`✗ ${name} — ${error.message}`);
  }
}

function hasFields(rows, fields, what) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`no ${what} returned`);
  const missing = fields.filter((f) => !(f in rows[0]));
  if (missing.length) throw new Error(`${what} missing fields: ${missing.join(', ')}`);
  return `${rows.length} ${what}`;
}

const year = Number(process.argv[2]) || new Date().getFullYear();
let sessions = [];
let latest;

await check(`sessions ${year}`, async () => {
  sessions = await api('sessions', { year, session_type: 'Race' });
  return hasFields(
    sessions,
    ['session_key', 'meeting_key', 'session_name', 'date_start', 'location', 'is_cancelled'],
    'sessions',
  );
});

await check(`meetings ${year}`, async () =>
  hasFields(
    await api('meetings', { year }),
    ['meeting_key', 'meeting_name', 'country_flag'],
    'meetings',
  ),
);

const played = sessions
  .filter((s) => !s.is_cancelled && new Date(s.date_end ?? s.date_start) < new Date())
  .sort((a, b) => a.date_start.localeCompare(b.date_start));
const keys = played.map((s) => s.session_key);

await check('championship_drivers (season range)', async () => {
  if (!keys.length) throw new Error(`no completed sessions in ${year}`);
  const rows = await api('championship_drivers', {
    'session_key>=': Math.min(...keys),
    'session_key<=': Math.max(...keys),
  });
  const scored = new Set(rows.map((r) => r.session_key));
  latest = [...played].reverse().find((s) => scored.has(s.session_key));
  return `${hasFields(rows, ['session_key', 'driver_number', 'position_current', 'position_start', 'points_current', 'points_start'], 'rows')} over ${scored.size} sessions`;
});

if (latest) {
  const k = latest.session_key;
  console.log(`  using ${latest.location} ${latest.session_name} (session_key ${k})`);
  await check('championship_teams', async () =>
    hasFields(
      await api('championship_teams', { session_key: k }),
      ['team_name', 'position_current', 'points_current'],
      'teams',
    ),
  );
  let drivers = [];
  await check('drivers', async () => {
    drivers = await api('drivers', { session_key: k });
    return hasFields(
      drivers,
      ['driver_number', 'last_name', 'name_acronym', 'team_name', 'team_colour'],
      'drivers',
    );
  });
  await check('session_result', async () =>
    hasFields(
      await api('session_result', { session_key: k }),
      ['driver_number', 'position', 'points', 'gap_to_leader', 'dnf'],
      'results',
    ),
  );
  await check('stints', async () =>
    hasFields(
      await api('stints', { session_key: k }),
      ['driver_number', 'stint_number', 'compound', 'lap_start', 'lap_end'],
      'stints',
    ),
  );
  await check('laps (one driver)', async () =>
    hasFields(
      await api('laps', { session_key: k, driver_number: drivers[0]?.driver_number }),
      ['lap_number', 'lap_duration', 'is_pit_out_lap'],
      'laps',
    ),
  );
}

// Track outlines come from MultiViewer (linked from OpenF1 meetings).
await check('multiviewer circuit outline', async () => {
  const meeting = (await api('meetings', { year })).find((m) => m.circuit_key && !m.is_cancelled);
  if (!meeting) throw new Error('no meeting with a circuit_key');
  const circuits = createClient({ baseUrl: MULTIVIEWER_BASE_URL });
  const info = await circuits(`circuits/${meeting.circuit_key}/${year}`);
  for (const f of ['x', 'y', 'rotation', 'corners']) {
    if (!(f in info)) throw new Error(`circuit missing ${f}`);
  }
  if (info.x.length < 50) throw new Error(`outline too short (${info.x.length} points)`);
  return `${meeting.circuit_short_name}: ${info.x.length} points, ${info.corners.length} corners`;
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} API smoke checks passed`);
if (failed.length) {
  console.log(
    'If every check failed with "Live F1 session in progress", OpenF1 is restricting access during a session; rerun afterwards.',
  );
}
process.exit(failed.length ? 1 : 0);
