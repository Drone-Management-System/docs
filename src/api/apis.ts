import type {ApiId, AuthMode} from './types';

export interface ApiInfo {
  id: ApiId;
  name: string;
  /** Key in `siteConfig.customFields.apiBaseUrls`. */
  baseUrlField: ApiId;
  /** Environment variable that sets the documented base URL at build time. */
  docsEnvVar: string;
  /** Shell variable used in copy-paste examples. */
  shellVar: string;
  fallbackBaseUrl: string;
  localBaseUrl: string;
  defaultAuth: AuthMode;
  docsPath: string;
}

export const APIS: Record<ApiId, ApiInfo> = {
  'caa-registry': {
    id: 'caa-registry',
    name: 'CAA Registry',
    baseUrlField: 'caa-registry',
    docsEnvVar: 'DOCS_CAA_REGISTRY_API_BASE_URL',
    shellVar: 'CAA_REGISTRY_API_BASE_URL',
    fallbackBaseUrl: 'https://caa-registry-api.example.com',
    localBaseUrl: 'http://localhost:8000',
    defaultAuth: 'bearer',
    docsPath: '/api/caa-registry/overview',
  },
  'constraint-management': {
    id: 'constraint-management',
    name: 'Constraint Management',
    baseUrlField: 'constraint-management',
    docsEnvVar: 'DOCS_CONSTRAINT_MANAGEMENT_API_BASE_URL',
    shellVar: 'CONSTRAINT_MANAGEMENT_API_BASE_URL',
    fallbackBaseUrl: 'https://constraint-management-api.example.com',
    localBaseUrl: 'http://localhost:8001',
    defaultAuth: 'bearer-or-actor',
    docsPath: '/api/constraint-management/overview',
  },
  'operations-intents': {
    id: 'operations-intents',
    name: 'Operations Intents',
    baseUrlField: 'operations-intents',
    docsEnvVar: 'DOCS_OPERATIONS_INTENTS_API_BASE_URL',
    shellVar: 'OPERATIONS_INTENTS_API_BASE_URL',
    fallbackBaseUrl: 'https://operations-intents-api.example.com',
    localBaseUrl: 'http://localhost:8000',
    defaultAuth: 'bearer-or-actor',
    docsPath: '/api/operations-intents/overview',
  },
  'remote-identification': {
    id: 'remote-identification',
    name: 'Remote Identification',
    baseUrlField: 'remote-identification',
    docsEnvVar: 'DOCS_REMOTE_IDENTIFICATION_API_BASE_URL',
    shellVar: 'REMOTE_IDENTIFICATION_API_BASE_URL',
    fallbackBaseUrl: 'https://remote-identification-api.example.com',
    localBaseUrl: 'http://localhost:8001',
    defaultAuth: 'not-enforced',
    docsPath: '/api/remote-identification/overview',
  },
};

export const AUTH_LABELS: Record<AuthMode, string> = {
  bearer: 'Bearer token',
  'bearer-or-actor': 'Bearer token or trusted actor headers',
  public: 'Public',
  'public-health': 'Public (health bypass)',
  'zitadel-signature': 'ZITADEL signature',
  'not-enforced': 'No auth enforced',
};

export const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export function statusText(status: number): string {
  return STATUS_TEXT[status] ?? '';
}
