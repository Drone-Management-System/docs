export type ApiId =
  | 'caa-registry'
  | 'constraint-management'
  | 'operations-intents'
  | 'remote-identification';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * How a request authenticates.
 * - `bearer`: ZITADEL bearer token required.
 * - `bearer-or-actor`: bearer token, or trusted actor headers from a backend proxy.
 * - `public`: no credentials.
 * - `public-health`: public while the health auth bypass is enabled.
 * - `zitadel-signature`: ZITADEL Actions V2 HMAC signature header.
 * - `not-enforced`: the service does not currently check credentials.
 */
export type AuthMode =
  | 'bearer'
  | 'bearer-or-actor'
  | 'public'
  | 'public-health'
  | 'zitadel-signature'
  | 'not-enforced';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {[key: string]: JsonValue | undefined};

export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  /** Value used in generated examples and to prefill the console. */
  example?: string | number | boolean;
  default?: string;
}

export interface ResponseExample {
  status: number;
  description?: string;
  body?: JsonValue;
  /** Plain-text body, for non-JSON responses. */
  text?: string;
}

export interface ErrorCase {
  status: number;
  /** The `detail` value (or `code` for envelope errors). */
  detail: string;
  when: string;
}

export interface EndpointSpec {
  /** Stable id, unique per API. Used for Postman export. */
  id: string;
  api: ApiId;
  method: HttpMethod;
  path: string;
  title: string;
  description?: string;
  permission?: string | string[];
  auth?: AuthMode;
  pathParams?: Param[];
  queryParams?: Param[];
  headers?: Param[];
  bodyFields?: Param[];
  body?: JsonValue;
  responses: ResponseExample[];
  errors?: ErrorCase[];
  /** Short notes rendered under the parameter tables. */
  notes?: string[];
  /** Postman folder name. */
  group?: string;
}
