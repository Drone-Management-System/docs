import type {ReactNode} from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

export default function MethodBadge({method, size = 'md'}: {method: string; size?: 'sm' | 'md'}): ReactNode {
  return (
    <span className={clsx(styles.badge, styles[method.toLowerCase()], size === 'sm' && styles.small)}>
      {method === 'DELETE' ? 'DEL' : method}
    </span>
  );
}
