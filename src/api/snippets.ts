import type {AuthMode, EndpointSpec, JsonValue} from './types';
import type {SnippetLanguage} from './store';

export interface RequestShape {
  method: string;
  url: string;
  headers: [string, string][];
  body?: string;
}

const TOKEN_PLACEHOLDER = {
  curl: '$TOKEN',
  javascript: '${process.env.TOKEN}',
  python: '{os.environ["TOKEN"]}',
  http: '<token>',
};

export function fillPath(path: string, values: Record<string, string>): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (match, name: string) => {
    const value = values[name];
    return value ? encodeURIComponent(value) : match;
  });
}

export function buildQuery(entries: [string, string][]): string {
  if (entries.length === 0) {
    return '';
  }
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

export function exampleValues(spec: EndpointSpec) {
  const pathValues: Record<string, string> = {};
  for (const param of spec.pathParams ?? []) {
    if (param.example !== undefined) {
      pathValues[param.name] = String(param.example);
    }
  }
  const query: [string, string][] = (spec.queryParams ?? [])
    .filter((param) => param.example !== undefined)
    .map((param) => [param.name, String(param.example)]);
  const headers: [string, string][] = (spec.headers ?? [])
    .filter((param) => param.example !== undefined)
    .map((param) => [param.name, String(param.example)]);
  return {pathValues, query, headers};
}

export function authHeaders(auth: AuthMode, tokenValue: string): [string, string][] {
  switch (auth) {
    case 'bearer':
    case 'bearer-or-actor':
      return [['Authorization', `Bearer ${tokenValue}`]];
    case 'zitadel-signature':
      return [['ZITADEL-Signature', 't=1767225600,v1=<hex-hmac-sha256>']];
    default:
      return [];
  }
}

export function stringifyBody(body: JsonValue | undefined): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body, null, 2);
}

export function exampleRequest(
  spec: EndpointSpec,
  baseUrl: string,
  auth: AuthMode,
  language: SnippetLanguage,
): RequestShape {
  const {pathValues, query, headers} = exampleValues(spec);
  const body = stringifyBody(spec.body);
  const allHeaders: [string, string][] = [
    ...authHeaders(auth, TOKEN_PLACEHOLDER[language]),
    ...headers,
  ];
  if (body !== undefined) {
    allHeaders.push(['Content-Type', 'application/json']);
  }
  return {
    method: spec.method,
    url: `${baseUrl}${fillPath(spec.path, pathValues)}${buildQuery(query)}`,
    headers: allHeaders,
    body,
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
}

function pythonLiteral(json: string): string {
  return json
    .replace(/\btrue\b/g, 'True')
    .replace(/\bfalse\b/g, 'False')
    .replace(/\bnull\b/g, 'None');
}

export function toCurl(request: RequestShape): string {
  const lines = [`curl -X ${request.method} "${request.url}"`];
  for (const [name, value] of request.headers) {
    // Keep $TOKEN expandable by using double quotes.
    lines.push(`  -H "${name}: ${value.replace(/"/g, '\\"')}"`);
  }
  if (request.body !== undefined) {
    lines.push(`  --data-raw ${shellQuote(request.body)}`);
  }
  return lines.join(' \\\n');
}

export function toJavaScript(request: RequestShape): string {
  const headerLines = request.headers.map(([name, value]) => `    ${JSON.stringify(name)}: \`${value}\`,`);
  const parts = [
    `const response = await fetch("${request.url}", {`,
    `  method: "${request.method}",`,
  ];
  if (headerLines.length > 0) {
    parts.push('  headers: {', ...headerLines, '  },');
  }
  if (request.body !== undefined) {
    parts.push(`  body: JSON.stringify(${indent(request.body, 2)}),`);
  }
  parts.push('});', '', 'const data = await response.json();', 'console.log(response.status, data);');
  return parts.join('\n');
}

export function toPython(request: RequestShape): string {
  const needsOs = request.headers.some(([, value]) => value.includes('os.environ'));
  const parts = [];
  if (needsOs) {
    parts.push('import os');
  }
  parts.push('import requests', '');
  const args = [`    "${request.url}",`];
  if (request.headers.length > 0) {
    const headerLines = request.headers.map(([name, value]) =>
      value.includes('{os.environ')
        ? `        ${JSON.stringify(name)}: f"${value.replace(/"/g, "'")}",`
        : `        ${JSON.stringify(name)}: ${JSON.stringify(value)},`,
    );
    args.push('    headers={', ...headerLines, '    },');
  }
  if (request.body !== undefined) {
    args.push(`    json=${indent(pythonLiteral(request.body), 4)},`);
  }
  parts.push(`response = requests.${request.method.toLowerCase()}(`, ...args, ')', '');
  parts.push('print(response.status_code, response.json())');
  return parts.join('\n');
}

export function toHttp(request: RequestShape): string {
  let host = '';
  let target = request.url;
  try {
    const url = new URL(request.url);
    host = url.host;
    target = `${url.pathname}${url.search}`;
  } catch {
    // Leave the URL as-is when it cannot be parsed.
  }
  const lines = [`${request.method} ${target} HTTP/1.1`];
  if (host) {
    lines.push(`Host: ${host}`);
  }
  for (const [name, value] of request.headers) {
    lines.push(`${name}: ${value}`);
  }
  if (request.body !== undefined) {
    lines.push('', request.body);
  }
  return lines.join('\n');
}

export function renderSnippet(language: SnippetLanguage, request: RequestShape): string {
  switch (language) {
    case 'javascript':
      return toJavaScript(request);
    case 'python':
      return toPython(request);
    case 'http':
      return toHttp(request);
    default:
      return toCurl(request);
  }
}

export const SNIPPET_PRISM_LANGUAGE: Record<SnippetLanguage, string> = {
  curl: 'bash',
  javascript: 'javascript',
  python: 'python',
  http: 'http',
};
