import {useState, type ReactNode} from 'react';
import clsx from 'clsx';

import {APIS} from '@site/src/api/apis';
import {buildPostmanCollection} from '@site/src/api/postman';
import {useApiEnvironment} from '@site/src/api/store';
import type {ApiId, EndpointSpec} from '@site/src/api/types';

import styles from './styles.module.css';

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Environment panel for one API: the configured base URL, a per-browser
 * override used by every "Try it" console, and a Postman collection export.
 */
export default function ApiEnvironment({api, endpoints}: {api: ApiId; endpoints?: EndpointSpec[]}): ReactNode {
  const info = APIS[api];
  const [environment, {setBaseUrl, setToken, reset}] = useApiEnvironment(api);
  const [showToken, setShowToken] = useState(false);
  const count = endpoints?.length ?? 0;

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <div className={styles.cell}>
          <span className={styles.label}>Documented base URL</span>
          <code className={styles.value}>{environment.configuredBaseUrl}</code>
          <span className={styles.hint}>
            Set at build time with <code>{info.docsEnvVar}</code>.
          </span>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>Local default</span>
          <code className={styles.value}>{info.localBaseUrl}</code>
        </div>
      </div>
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Base URL for Try it</span>
          <input
            className={styles.input}
            value={environment.baseUrl}
            placeholder={environment.configuredBaseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
        </label>
        {info.defaultAuth !== 'not-enforced' ? (
          <label className={styles.field}>
            <span className={styles.label}>Bearer token</span>
            <span className={styles.inline}>
              <input
                className={styles.input}
                type={showToken ? 'text' : 'password'}
                value={environment.token}
                placeholder="Paste an access token"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setToken(event.target.value)}
              />
              <button type="button" className={styles.ghost} onClick={() => setShowToken((value) => !value)}>
                {showToken ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
        ) : null}
      </div>
      <div className={styles.footer}>
        <span className={styles.hint}>
          Used by every <strong>Try it</strong> console for {info.name}. The base URL is remembered in this
          browser; the token stays in this tab only and is never shown in code samples.
        </span>
        <span className={styles.actions}>
          {environment.isCustomBaseUrl || environment.token ? (
            <button type="button" className={styles.ghost} onClick={reset}>
              Reset
            </button>
          ) : null}
          {count > 0 ? (
            <button
              type="button"
              className={clsx(styles.primary)}
              onClick={() =>
                download(
                  `${api}.postman_collection.json`,
                  buildPostmanCollection(api, environment.baseUrl, endpoints ?? []),
                )
              }>
              Download Postman collection ({count})
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
