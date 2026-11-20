import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import type {EndpointSpec} from '@site/src/api/types';
import MethodBadge from '../MethodBadge';
import {PathText} from '../ApiEndpoint';
import styles from './styles.module.css';

/**
 * Compact index of the endpoints on a page. Each row links to the
 * endpoint heading, whose id must equal the endpoint `id`.
 */
export default function EndpointTable({
  endpoints,
  linkTo,
  pages,
}: {
  endpoints: EndpointSpec[];
  /** Optional page path when the endpoints live on another page. */
  linkTo?: string;
  /** Page path per endpoint group, for indexes that span several pages. */
  pages?: Record<string, string>;
}): ReactNode {
  return (
    <div className={styles.table} role="list">
      {endpoints.map((endpoint) => (
        <Link
          key={`${endpoint.method}-${endpoint.path}-${endpoint.id}`}
          to={`${(endpoint.group && pages?.[endpoint.group]) ?? linkTo ?? ''}#${endpoint.id}`}
          className={styles.row}
          role="listitem">
          <MethodBadge method={endpoint.method} size="sm" />
          <code className={styles.path}>
            <PathText path={endpoint.path} />
          </code>
          <span className={styles.title}>{endpoint.title}</span>
        </Link>
      ))}
    </div>
  );
}
