import {useMemo, useRef, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';

import {statusText} from '@site/src/api/apis';
import {authHeaders, buildQuery, fillPath, stringifyBody, toCurl} from '@site/src/api/snippets';
import {useApiEnvironment} from '@site/src/api/store';
import type {AuthMode, EndpointSpec} from '@site/src/api/types';

import styles from './styles.module.css';

interface Row {
  key: string;
  value: string;
  enabled: boolean;
}

interface Result {
  status: number;
  statusLabel: string;
  durationMs: number;
  sizeBytes: number;
  headers: [string, string][];
  body: string;
  isJson: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function toneFor(status: number): string {
  if (status < 300) return styles.ok;
  if (status < 400) return styles.redirect;
  if (status < 500) return styles.clientError;
  return styles.serverError;
}

export default function TryIt({spec, auth}: {spec: EndpointSpec; auth: AuthMode}): ReactNode {
  const [environment, {setBaseUrl, setToken, reset}] = useApiEnvironment(spec.api);
  const [showToken, setShowToken] = useState(false);
  const [pathValues, setPathValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((spec.pathParams ?? []).map((param) => [param.name, String(param.example ?? '')])),
  );
  const [queryRows, setQueryRows] = useState<Row[]>(() =>
    (spec.queryParams ?? []).map((param) => ({
      key: param.name,
      value: param.example === undefined ? '' : String(param.example),
      enabled: param.example !== undefined,
    })),
  );
  const [headerRows, setHeaderRows] = useState<Row[]>(() =>
    (spec.headers ?? []).map((param) => ({
      key: param.name,
      value: param.example === undefined ? '' : String(param.example),
      enabled: param.example !== undefined,
    })),
  );
  const initialBody = stringifyBody(spec.body) ?? '';
  const [body, setBody] = useState(initialBody);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' ? true : spec.body !== undefined;

  const url = useMemo(() => {
    const query = queryRows.filter((row) => row.enabled && row.key).map((row) => [row.key, row.value] as [string, string]);
    return `${environment.baseUrl}${fillPath(spec.path, pathValues)}${buildQuery(query)}`;
  }, [environment.baseUrl, spec.path, pathValues, queryRows]);

  const requestHeaders = useMemo(() => {
    const headers: [string, string][] = [];
    if (environment.token) {
      headers.push(...authHeaders(auth === 'zitadel-signature' ? 'bearer' : auth, environment.token));
    }
    for (const row of headerRows) {
      if (row.enabled && row.key) {
        headers.push([row.key, row.value]);
      }
    }
    if (hasBody && body.trim()) {
      headers.push(['Content-Type', 'application/json']);
    }
    return headers;
  }, [environment.token, auth, headerRows, hasBody, body]);

  const curlPreview = useMemo(
    () =>
      toCurl({
        method: spec.method,
        url,
        headers: requestHeaders.map(([name, value]) =>
          name === 'Authorization' ? [name, 'Bearer $TOKEN'] : [name, value],
        ),
        body: hasBody && body.trim() ? body : undefined,
      }),
    [spec.method, url, requestHeaders, hasBody, body],
  );

  async function send() {
    setNetworkError(null);
    setBodyError(null);
    let payload: string | undefined;
    if (hasBody && body.trim()) {
      try {
        payload = JSON.stringify(JSON.parse(body));
      } catch (error) {
        setBodyError(`Body is not valid JSON: ${(error as Error).message}`);
        return;
      }
    }
    const missing = (spec.pathParams ?? []).filter((param) => !pathValues[param.name]);
    if (missing.length > 0) {
      setNetworkError(`Fill in the path parameter${missing.length > 1 ? 's' : ''}: ${missing.map((p) => p.name).join(', ')}.`);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method: spec.method,
        headers: Object.fromEntries(requestHeaders),
        body: payload,
        signal: controller.signal,
      });
      const text = await response.text();
      const durationMs = Math.round(performance.now() - started);
      let pretty = text;
      let isJson = false;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
        isJson = true;
      } catch {
        // Not JSON: show the raw text.
      }
      setResult({
        status: response.status,
        statusLabel: response.statusText || statusText(response.status),
        durationMs,
        sizeBytes: new Blob([text]).size,
        headers: [...response.headers.entries()],
        body: pretty,
        isJson,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setNetworkError('Request cancelled.');
      } else {
        setResult(null);
        setNetworkError(
          'The browser could not complete the request. The API may be unreachable from this page, or it may not allow cross-origin requests (CORS). Copy the cURL command below and run it from a terminal instead.',
        );
      }
    } finally {
      setSending(false);
    }
  }

  function updateRow(setter: typeof setQueryRows, index: number, patch: Partial<Row>) {
    setter((rows) => rows.map((row, i) => (i === index ? {...row, ...patch} : row)));
  }

  function rowsEditor(title: string, rows: Row[], setter: typeof setQueryRows): ReactNode {
    return (
      <div className={styles.consoleGroup}>
        <div className={styles.consoleGroupHeader}>
          <span className={styles.sectionLabel}>{title}</span>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setter((current) => [...current, {key: '', value: '', enabled: true}])}>
            + Add
          </button>
        </div>
        {rows.length === 0 ? <div className={styles.consoleEmpty}>None</div> : null}
        {rows.map((row, index) => (
          <div key={index} className={styles.kvRow}>
            <input
              type="checkbox"
              checked={row.enabled}
              aria-label={`Send ${row.key || 'parameter'}`}
              onChange={(event) => updateRow(setter, index, {enabled: event.target.checked})}
            />
            <input
              className={styles.input}
              value={row.key}
              placeholder="name"
              aria-label="Name"
              onChange={(event) => updateRow(setter, index, {key: event.target.value})}
            />
            <input
              className={styles.input}
              value={row.value}
              placeholder="value"
              aria-label={`Value for ${row.key || 'parameter'}`}
              onChange={(event) => updateRow(setter, index, {value: event.target.value, enabled: true})}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.console}>
      <div className={styles.consoleBar}>
        <span className={clsx(styles.consoleMethod, styles[`text${spec.method}`])}>{spec.method}</span>
        <input
          className={clsx(styles.input, styles.urlInput)}
          value={url}
          readOnly
          aria-label="Request URL"
          onFocus={(event) => event.target.select()}
        />
        {sending ? (
          <button type="button" className={styles.sendButton} onClick={() => abortRef.current?.abort()}>
            Cancel
          </button>
        ) : (
          <button type="button" className={styles.sendButton} onClick={() => void send()}>
            Send
          </button>
        )}
      </div>

      <div className={styles.consoleGrid}>
        <div className={styles.consoleGroup}>
          <div className={styles.consoleGroupHeader}>
            <span className={styles.sectionLabel}>Environment</span>
            {environment.isCustomBaseUrl || environment.token ? (
              <button type="button" className={styles.linkButton} onClick={reset}>
                Reset
              </button>
            ) : null}
          </div>
          <label className={styles.field}>
            <span>Base URL</span>
            <input
              className={styles.input}
              value={environment.baseUrl}
              placeholder={environment.configuredBaseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </label>
          {auth !== 'public' && auth !== 'not-enforced' ? (
            <label className={styles.field}>
              <span>Bearer token</span>
              <span className={styles.tokenRow}>
                <input
                  className={styles.input}
                  type={showToken ? 'text' : 'password'}
                  value={environment.token}
                  placeholder="Paste an access token"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setToken(event.target.value)}
                />
                <button type="button" className={styles.linkButton} onClick={() => setShowToken((v) => !v)}>
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
          ) : null}
          <p className={styles.consoleHint}>
            Shared by every endpoint of this API. The base URL is remembered in this browser; the token is
            kept only for this tab.
          </p>
        </div>

        {spec.pathParams && spec.pathParams.length > 0 ? (
          <div className={styles.consoleGroup}>
            <div className={styles.consoleGroupHeader}>
              <span className={styles.sectionLabel}>Path parameters</span>
            </div>
            {spec.pathParams.map((param) => (
              <label key={param.name} className={styles.field}>
                <span>
                  <code>{param.name}</code>
                </span>
                <input
                  className={styles.input}
                  value={pathValues[param.name] ?? ''}
                  onChange={(event) => setPathValues((values) => ({...values, [param.name]: event.target.value}))}
                />
              </label>
            ))}
          </div>
        ) : null}

        {rowsEditor('Query parameters', queryRows, setQueryRows)}
        {rowsEditor('Headers', headerRows, setHeaderRows)}
      </div>

      {hasBody ? (
        <div className={styles.consoleGroup}>
          <div className={styles.consoleGroupHeader}>
            <span className={styles.sectionLabel}>Body (JSON)</span>
            <span className={styles.consoleActions}>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  try {
                    setBody(JSON.stringify(JSON.parse(body), null, 2));
                    setBodyError(null);
                  } catch (error) {
                    setBodyError(`Body is not valid JSON: ${(error as Error).message}`);
                  }
                }}>
                Format
              </button>
              <button type="button" className={styles.linkButton} onClick={() => setBody(initialBody)}>
                Reset
              </button>
            </span>
          </div>
          <textarea
            className={clsx(styles.input, styles.bodyInput)}
            value={body}
            spellCheck={false}
            rows={Math.min(18, Math.max(4, body.split('\n').length + 1))}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Request body"
          />
          {bodyError ? <div className={styles.consoleError}>{bodyError}</div> : null}
        </div>
      ) : null}

      {networkError ? <div className={styles.consoleError}>{networkError}</div> : null}

      {result ? (
        <div className={styles.consoleResult}>
          <div className={styles.resultBar}>
            <span className={clsx(styles.statusPill, toneFor(result.status))}>
              {result.status} {result.statusLabel}
            </span>
            <span className={styles.resultMeta}>{result.durationMs} ms</span>
            <span className={styles.resultMeta}>{formatBytes(result.sizeBytes)}</span>
            {result.headers.find(([name]) => name === 'x-correlation-id') ? (
              <span className={styles.resultMeta}>
                correlation <code>{result.headers.find(([name]) => name === 'x-correlation-id')?.[1]}</code>
              </span>
            ) : null}
          </div>
          <CodeBlock language={result.isJson ? 'json' : 'text'} className={styles.code}>
            {result.body || '(empty body)'}
          </CodeBlock>
        </div>
      ) : null}

      <details className={styles.curlDetails}>
        <summary>This request as cURL</summary>
        <CodeBlock language="bash" className={styles.code}>
          {curlPreview}
        </CodeBlock>
      </details>
    </div>
  );
}
