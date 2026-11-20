import type {ErrorCase, JsonValue, Param} from './types';

export function limitParam(max = 200, fallback = 50): Param {
  return {
    name: 'limit',
    type: 'integer',
    description: `Page size, from 1 to ${max}.`,
    default: String(fallback),
    example: fallback === 50 ? 20 : fallback,
  };
}

export function offsetParam(): Param {
  return {
    name: 'offset',
    type: 'integer',
    description: 'Number of rows to skip, from 0 to 100000.',
    default: '0',
  };
}

export const paging = (max = 200, fallback = 50): Param[] => [limitParam(max, fallback), offsetParam()];

export function page(items: JsonValue[], limit = 20, offset = 0, hasMore = false): JsonValue {
  return {items, limit, offset, has_more: hasMore};
}

export const PAGING_ERRORS: ErrorCase[] = [
  {status: 400, detail: 'limit_invalid', when: '`limit` is not an integer in range.'},
  {status: 400, detail: 'offset_invalid', when: '`offset` is not an integer in range.'},
];

export function bearerErrors(permission?: string): ErrorCase[] {
  const errors: ErrorCase[] = [
    {status: 401, detail: 'authentication_required', when: 'The `Authorization` header is missing.'},
    {status: 401, detail: 'invalid_token', when: 'The token signature, issuer, audience, or expiry is invalid.'},
  ];
  if (permission) {
    errors.push({status: 403, detail: 'permission_denied', when: `The token does not grant \`${permission}\`.`});
  }
  return errors;
}

export function idParam(name: string, description: string, example: string, type = 'uuid'): Param {
  return {name, type, required: true, description, example};
}
