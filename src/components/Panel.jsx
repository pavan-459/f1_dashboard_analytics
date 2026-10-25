import styles from './Panel.module.css';

/**
 * Dashboard card with a kerb-striped title bar.
 * @param {{ title: string, kicker?: string, actions?: import('react').ReactNode, className?: string, children: import('react').ReactNode }} props
 */
export default function Panel({ title, kicker, actions, className = '', children }) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={`${styles.panel} ${className}`} aria-labelledby={id}>
      <header className={styles.header}>
        <div>
          {kicker && <p className={styles.kicker}>{kicker}</p>}
          <h2 id={id} className={styles.title}>
            {title}
          </h2>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/**
 * Two-to-four option segmented control.
 * @param {{ label: string, options: { value: string, label: string }[], value: string, onChange: (v: string) => void }} props
 */
export function Segmented({ label, options, value, onChange }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
