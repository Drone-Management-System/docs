import {useMemo, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';
import BrowserOnly from '@docusaurus/BrowserOnly';

import {APIS, AUTH_LABELS, statusText} from '@site/src/api/apis';
import {inline} from '@site/src/api/inline';
import {exampleRequest, renderSnippet, SNIPPET_PRISM_LANGUAGE} from '@site/src/api/snippets';
import {SNIPPET_LANGUAGES, useApiEnvironment, useSnippetLanguage} from '@site/src/api/store';
import type {EndpointSpec, Param} from '@site/src/api/types';

import MethodBadge from '../MethodBadge';
import TryIt from './TryIt';
import styles from './styles.module.css';

export function statusTone(status: number): string {
  if (status < 300) return styles.ok;
  if (status < 400) return styles.redirect;
  if (status < 500) return styles.clientError;
  return styles.serverError;
}

export function PathText({path}: {path: string}): ReactNode {
  const parts = path.split(/(:[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith(':') ? (
          <span key={index} className={styles.pathParam}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function ParamTable({title, params}: {title: string; params?: Param[]}): ReactNode {
  if (!params || params.length === 0) {
    return null;
  }
  return (
    <div className={styles.paramGroup}>
      <div className={styles.sectionLabel}>{title}</div>
      <div className={styles.paramList}>
        {params.map((param) => (
          <div key={param.name} className={styles.paramRow}>
            <div className={styles.paramName}>
              <code>{param.name}</code>
              <span className={styles.paramType}>{param.type}</span>
              {param.required ? (
                <span className={styles.required}>required</span>
              ) : (
                <span className={styles.optional}>optional</span>
              )}
            </div>
            <div className={styles.paramDescription}>
              {inline(param.description)}
              {param.default !== undefined ? (
                <span className={styles.paramMeta}>
                  {' '}
                  Default: <code>{param.default}</code>.
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestExamples({spec}: {spec: EndpointSpec}): ReactNode {
  const [environment] = useApiEnvironment(spec.api);
  const [language, setLanguage] = useSnippetLanguage();
  const auth = spec.auth ?? APIS[spec.api].defaultAuth;
  const snippet = useMemo(
    () => renderSnippet(language, exampleRequest(spec, environment.baseUrl, auth, language)),
    [spec, environment.baseUrl, auth, language],
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.sectionLabel}>Request</span>
        <div className={styles.tabs} role="tablist" aria-label="Request example language">
          {SNIPPET_LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={language === item.id}
              className={clsx(styles.tab, language === item.id && styles.tabActive)}
              onClick={() => setLanguage(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <CodeBlock language={SNIPPET_PRISM_LANGUAGE[language]} className={styles.code}>
        {snippet}
      </CodeBlock>
    </div>
  );
}

function ResponseExamples({spec}: {spec: EndpointSpec}): ReactNode {
  const tabs = [
    ...spec.responses.map((response, index) => ({key: `r${index}`, kind: 'response' as const, response})),
    ...(spec.errors && spec.errors.length > 0 ? [{key: 'errors', kind: 'errors' as const}] : []),
  ];
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  if (!current) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.sectionLabel}>Response</span>
        <div className={styles.tabs} role="tablist" aria-label="Response examples">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={current.key === tab.key}
              className={clsx(styles.tab, current.key === tab.key && styles.tabActive)}
              onClick={() => setActive(tab.key)}>
              {tab.kind === 'response' ? (
                <>
                  <span className={clsx(styles.statusDot, statusTone(tab.response.status))} />
                  {tab.response.status}
                  <span className={styles.tabMuted}>{statusText(tab.response.status)}</span>
                </>
              ) : (
                <>
                  <span className={clsx(styles.statusDot, styles.clientError)} />
                  Errors
                  <span className={styles.tabMuted}>{spec.errors?.length}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      {current.kind === 'response' ? (
        <>
          {current.response.description ? (
            <p className={styles.responseNote}>{inline(current.response.description)}</p>
          ) : null}
          {current.response.body !== undefined ? (
            <CodeBlock language="json" className={styles.code}>
              {JSON.stringify(current.response.body, null, 2)}
            </CodeBlock>
          ) : current.response.text !== undefined ? (
            <CodeBlock language="text" className={styles.code}>
              {current.response.text}
            </CodeBlock>
          ) : (
            <p className={styles.responseNote}>No response body.</p>
          )}
        </>
      ) : (
        <div className={styles.errorTable}>
          {[...(spec.errors ?? [])].sort((a, b) => a.status - b.status).map((error) => (
            <div key={`${error.status}-${error.detail}`} className={styles.errorRow}>
              <span className={clsx(styles.statusPill, statusTone(error.status))}>{error.status}</span>
              <code className={styles.errorDetail}>{error.detail}</code>
              <span className={styles.errorWhen}>{inline(error.when)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyPathButton({path}: {path: string}): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.iconButton}
      title="Copy path"
      aria-label="Copy path"
      onClick={() => {
        void navigator.clipboard?.writeText(path).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ApiEndpoint(spec: EndpointSpec): ReactNode {
  const [tryOpen, setTryOpen] = useState(false);
  const auth = spec.auth ?? APIS[spec.api].defaultAuth;
  const permissions = spec.permission === undefined ? [] : [spec.permission].flat();

  return (
    <section className={clsx(styles.card, styles[`m${spec.method}`])} aria-label={`${spec.method} ${spec.path}`}>
      <header className={styles.header}>
        <div className={styles.route}>
          <MethodBadge method={spec.method} />
          <code className={styles.path}>
            <PathText path={spec.path} />
          </code>
        </div>
        <div className={styles.headerActions}>
          <CopyPathButton path={spec.path} />
          <button
            type="button"
            className={clsx(styles.tryButton, tryOpen && styles.tryButtonOpen)}
            aria-expanded={tryOpen}
            onClick={() => setTryOpen((open) => !open)}>
            {tryOpen ? 'Close console' : 'Try it'}
          </button>
        </div>
      </header>

      <div className={styles.metaBar}>
        {permissions.map((permission) => (
          <span key={permission} className={clsx(styles.chip, styles.chipPermission)} title="Required permission">
            <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.chipIcon}>
              <path d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm1.5 0h5V5a2.5 2.5 0 0 0-5 0v2Z" />
            </svg>
            {permission}
          </span>
        ))}
        <span className={clsx(styles.chip, auth === 'not-enforced' && styles.chipWarn)} title="Authentication">
          {AUTH_LABELS[auth]}
        </span>
        {spec.responses[0] ? (
          <span className={styles.chip} title="Success status">
            <span className={clsx(styles.statusDot, statusTone(spec.responses[0].status))} />
            {spec.responses[0].status} {statusText(spec.responses[0].status)}
          </span>
        ) : null}
      </div>

      {tryOpen ? (
        <BrowserOnly>{() => <TryIt spec={spec} auth={auth} />}</BrowserOnly>
      ) : null}

      <div className={styles.body}>
        <ParamTable title="Path parameters" params={spec.pathParams} />
        <ParamTable title="Query parameters" params={spec.queryParams} />
        <ParamTable title="Headers" params={spec.headers} />
        <ParamTable title="Body fields" params={spec.bodyFields} />
        {spec.notes && spec.notes.length > 0 ? (
          <ul className={styles.notes}>
            {spec.notes.map((note) => (
              <li key={note}>{inline(note)}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.examples}>
          <RequestExamples spec={spec} />
          <ResponseExamples spec={spec} />
        </div>
      </div>
    </section>
  );
}
