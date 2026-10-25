import { ICONS } from './geometry.js';
import styles from './Icon.module.css';

/**
 * One of the D3-generated F1 icons. Decorative by default; pass `title` to make it meaningful.
 * @param {{ name: keyof typeof ICONS, size?: number, title?: string, className?: string }} props
 */
export default function Icon({ name, size = 22, title, className = '' }) {
  const parts = ICONS[name];
  if (!parts) return null;
  return (
    <svg
      className={`${styles.icon} ${className}`}
      data-icon={name}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {parts.map((p, i) => (
        <path
          key={i}
          d={p.d}
          transform={p.at ? `translate(${p.at[0]} ${p.at[1]})` : undefined}
          className={`${styles[p.mode]} ${styles[p.part] ?? ''}`}
          data-part={p.part}
        />
      ))}
    </svg>
  );
}
