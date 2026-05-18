import type {ReactNode} from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

type EndpointProps = {
  method: Method;
  path: string;
  title: string;
  permission?: string;
  success?: string;
  auth?: string;
  summary?: string;
};

const methodClass: Record<Method, string> = {
  GET: styles.get,
  POST: styles.post,
  PUT: styles.put,
  DELETE: styles.delete,
};

export default function Endpoint({
  method,
  path,
  title,
  permission,
  success,
  auth = 'Bearer token',
  summary,
}: EndpointProps): ReactNode {
  return (
    <div className={styles.endpoint}>
      <div className={styles.header}>
        <span className={clsx(styles.method, methodClass[method])}>{method}</span>
        <code className={styles.path}>{path}</code>
      </div>
      <div className={styles.body}>
        <strong className={styles.title}>{title}</strong>
        {summary ? <p className={styles.summary}>{summary}</p> : null}
        <dl className={styles.meta}>
          {permission ? (
            <>
              <dt>Permission</dt>
              <dd>
                <code>{permission}</code>
              </dd>
            </>
          ) : null}
          <dt>Auth</dt>
          <dd>{auth}</dd>
          {success ? (
            <>
              <dt>Success</dt>
              <dd>{success}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
