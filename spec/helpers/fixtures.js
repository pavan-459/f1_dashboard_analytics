import { readFileSync } from 'node:fs';

/** Load a JSON fixture relative to the repo's fixtures/ folder. */
export const fixture = (path) =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${path}`, import.meta.url), 'utf8'));
