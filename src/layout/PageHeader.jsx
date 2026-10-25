import styles from './PageHeader.module.css';

/**
 * Large page title, muted subtitle and a short red accent bar.
 * @param {{ title: string, subtitle?: import('react').ReactNode, children?: import('react').ReactNode }} props
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <span className={styles.accent} aria-hidden="true" />
      {children}
    </div>
  );
}
