import {useCallback, useSyncExternalStore} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import {APIS} from './apis';
import type {ApiId} from './types';

/**
 * A tiny browser store shared by every endpoint card on the site.
 *
 * - Base URLs are kept in localStorage (per API) so they survive reloads.
 * - Tokens are kept in sessionStorage so they disappear with the tab.
 * - The preferred snippet language is kept in localStorage.
 *
 * Every read and write is wrapped because storage can be unavailable
 * (private windows, blocked site data, server rendering).
 */

const PREFIX = 'dms-docs';
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function storage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function read(kind: 'local' | 'session', key: string): string | null {
  const cacheKey = `${kind}:${key}`;
  if (memory.has(cacheKey)) {
    return memory.get(cacheKey) ?? null;
  }
  let value: string | null = null;
  try {
    value = storage(kind)?.getItem(key) ?? null;
  } catch {
    value = null;
  }
  memory.set(cacheKey, value ?? '');
  return value;
}

function write(kind: 'local' | 'session', key: string, value: string): void {
  memory.set(`${kind}:${key}`, value);
  try {
    const store = storage(kind);
    if (store) {
      if (value) {
        store.setItem(key, value);
      } else {
        store.removeItem(key);
      }
    }
  } catch {
    // Storage is optional; the in-memory value still applies to this page.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConfiguredBaseUrl(api: ApiId): string {
  const {siteConfig} = useDocusaurusContext();
  const urls = (siteConfig.customFields?.apiBaseUrls ?? {}) as Partial<Record<ApiId, string>>;
  return urls[api] || APIS[api].fallbackBaseUrl;
}

export interface ApiEnvironment {
  baseUrl: string;
  token: string;
  configuredBaseUrl: string;
  isCustomBaseUrl: boolean;
}

export function useApiEnvironment(api: ApiId): [
  ApiEnvironment,
  {setBaseUrl: (value: string) => void; setToken: (value: string) => void; reset: () => void},
] {
  const configuredBaseUrl = useConfiguredBaseUrl(api);
  const baseKey = `${PREFIX}:base-url:${api}`;
  const tokenKey = `${PREFIX}:token:${api}`;

  const storedBase = useSyncExternalStore(
    subscribe,
    () => read('local', baseKey) ?? '',
    () => '',
  );
  const token = useSyncExternalStore(
    subscribe,
    () => read('session', tokenKey) ?? '',
    () => '',
  );

  const setBaseUrl = useCallback((value: string) => write('local', baseKey, value.trim()), [baseKey]);
  const setToken = useCallback((value: string) => write('session', tokenKey, value.trim()), [tokenKey]);
  const reset = useCallback(() => {
    write('local', baseKey, '');
    write('session', tokenKey, '');
  }, [baseKey, tokenKey]);

  const baseUrl = (storedBase || configuredBaseUrl).replace(/\/+$/, '');
  return [
    {baseUrl, token, configuredBaseUrl, isCustomBaseUrl: Boolean(storedBase)},
    {setBaseUrl, setToken, reset},
  ];
}

export type SnippetLanguage = 'curl' | 'javascript' | 'python' | 'http';

export const SNIPPET_LANGUAGES: {id: SnippetLanguage; label: string}[] = [
  {id: 'curl', label: 'cURL'},
  {id: 'javascript', label: 'JavaScript'},
  {id: 'python', label: 'Python'},
  {id: 'http', label: 'HTTP'},
];

export function useSnippetLanguage(): [SnippetLanguage, (value: SnippetLanguage) => void] {
  const key = `${PREFIX}:snippet-language`;
  const value = useSyncExternalStore(
    subscribe,
    () => read('local', key) ?? '',
    () => '',
  );
  const set = useCallback((next: SnippetLanguage) => write('local', key, next), [key]);
  const language = SNIPPET_LANGUAGES.some((item) => item.id === value) ? (value as SnippetLanguage) : 'curl';
  return [language, set];
}
