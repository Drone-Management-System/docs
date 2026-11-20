import {APIS} from './apis';
import {exampleValues, stringifyBody} from './snippets';
import type {ApiId, EndpointSpec} from './types';

interface PostmanItem {
  name: string;
  request: Record<string, unknown>;
  response: unknown[];
}

function toPostmanPath(path: string): string {
  // Postman uses :name for path variables too, so the path is kept as-is.
  return path;
}

function item(spec: EndpointSpec): PostmanItem {
  const {pathValues, query, headers} = exampleValues(spec);
  const auth = spec.auth ?? APIS[spec.api].defaultAuth;
  const body = stringifyBody(spec.body);
  const requestHeaders = headers.map(([key, value]) => ({key, value}));
  if (auth === 'zitadel-signature') {
    requestHeaders.push({key: 'ZITADEL-Signature', value: 't=<unix>,v1=<hex-hmac-sha256>'});
  }
  if (body !== undefined) {
    requestHeaders.push({key: 'Content-Type', value: 'application/json'});
  }
  const pathSegments = toPostmanPath(spec.path).split('/').filter(Boolean);
  const queryEntries = (spec.queryParams ?? []).map((param) => ({
    key: param.name,
    value: param.example === undefined ? '' : String(param.example),
    description: param.description,
    disabled: param.example === undefined,
  }));
  const rawQuery = query.length ? `?${query.map(([k, v]) => `${k}=${v}`).join('&')}` : '';

  return {
    name: spec.title,
    request: {
      method: spec.method,
      description: spec.description,
      header: requestHeaders,
      ...(auth === 'bearer' || auth === 'bearer-or-actor'
        ? {}
        : {auth: {type: 'noauth'}}),
      url: {
        raw: `{{baseUrl}}${spec.path}${rawQuery}`,
        host: ['{{baseUrl}}'],
        path: pathSegments,
        query: queryEntries,
        variable: (spec.pathParams ?? []).map((param) => ({
          key: param.name,
          value: pathValues[param.name] ?? '',
          description: param.description,
        })),
      },
      ...(body !== undefined ? {body: {mode: 'raw', raw: body, options: {raw: {language: 'json'}}}} : {}),
    },
    response: spec.responses.map((response) => ({
      name: `${response.status} example`,
      code: response.status,
      header: [{key: 'Content-Type', value: 'application/json'}],
      body: response.body !== undefined ? JSON.stringify(response.body, null, 2) : response.text ?? '',
      _postman_previewlanguage: response.body !== undefined ? 'json' : 'text',
    })),
  };
}

export function buildPostmanCollection(api: ApiId, baseUrl: string, endpoints: EndpointSpec[]) {
  const info = APIS[api];
  const folders = new Map<string, PostmanItem[]>();
  for (const endpoint of endpoints) {
    const group = endpoint.group ?? 'General';
    folders.set(group, [...(folders.get(group) ?? []), item(endpoint)]);
  }
  return {
    info: {
      name: `${info.name} API`,
      description: `Generated from the DMS Backend Docs. Set the baseUrl and token collection variables before sending requests.`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{key: 'token', value: '{{token}}', type: 'string'}],
    },
    variable: [
      {key: 'baseUrl', value: baseUrl},
      {key: 'token', value: ''},
    ],
    item: [...folders.entries()].map(([name, items]) => ({name, item: items})),
  };
}
