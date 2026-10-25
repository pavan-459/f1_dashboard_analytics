import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

const MODES = ['system', 'light', 'dark'];
const LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' };
const KEY = 'pitwall-theme';

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Cycles Auto → Light → Dark. Auto follows prefers-color-scheme. */
export default function ThemeToggle() {
  const [mode, setMode] = useState(readSaved);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') delete root.dataset.theme;
    else root.dataset.theme = mode;
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // Storage blocked (private mode); the choice just won't persist.
    }
  }, [mode]);

  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setMode(next)}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[next]}`}
    >
      <span aria-hidden="true" className={styles.icon} data-mode={mode} />
      {LABEL[mode]}
    </button>
  );
}
