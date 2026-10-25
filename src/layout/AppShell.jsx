import { useEffect, useState } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Icon from '../icons/Icon.jsx';
import { PAGES, toHref } from '../state/useRoute.js';
import styles from './AppShell.module.css';

const KEY = 'pitwall-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Sidebar + top bar layout. Desktop: collapsible rail. Mobile: slide-in drawer.
 * @param {{
 *   path: string,
 *   linkParams: Record<string, string | number | undefined>,
 *   year: number,
 *   years: number[],
 *   onYearChange: (year: number) => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function AppShell({ path, linkParams, year, years, onYearChange, children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const page = PAGES.find((p) => p.path === path) ?? PAGES[0];

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      // Storage blocked; the preference just won't persist.
    }
  }, [collapsed]);

  // Close the drawer on navigation and on Escape.
  useEffect(() => setDrawerOpen(false), [path]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className={styles.shell} data-collapsed={collapsed || undefined}>
      <aside
        className={styles.sidebar}
        data-open={drawerOpen || undefined}
        aria-label="Main navigation"
      >
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true" />
          <span className={styles.brandName}>Pit Wall</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className={styles.nav}>
          {PAGES.map((p) => {
            const active = p.path === page.path;
            return (
              <a
                key={p.path}
                href={toHref(p.path, linkParams)}
                className={`nav-link ${styles.link} ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? p.title : undefined}
              >
                <Icon name={p.icon} size={22} />
                <span className={styles.label}>{p.title}</span>
              </a>
            );
          })}
        </nav>
        <button
          type="button"
          className={`nav-link ${styles.collapse}`}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? 'expand' : 'collapse'} />
          <span className={styles.label}>Collapse</span>
        </button>
      </aside>
      {drawerOpen && (
        <div className={styles.scrim} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menu}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" />
          </button>
          <h1 className={styles.pageTitle}>{page.title}</h1>
          <div className={styles.controls}>
            <label className={styles.season}>
              <span className={styles.seasonLabel}>Season</span>
              <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <ThemeToggle />
          </div>
        </header>
        <div className={styles.content}>{children}</div>
        <footer className={styles.footer}>
          Data from <a href="https://openf1.org">OpenF1</a> and MultiViewer. Unofficial fan project,
          not associated with Formula 1 or the FIA.
        </footer>
      </div>
    </div>
  );
}
