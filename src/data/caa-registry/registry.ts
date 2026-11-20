import {bearerErrors, idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, Param} from '@site/src/api/types';

import {
  auditRow,
  IDS,
  operator,
  operatorType,
  operatorWrite,
  organization,
  remoteId,
  remoteIdWrite,
  TS2,
  ua,
  uaWrite,
  user,
} from './samples';

const api = 'caa-registry' as const;

const expectedOrgParam: Param = {
  name: 'expected_org_id',
  type: 'uuid',
  description: 'Compare-and-set guard: the write only applies if the record still belongs to this organization. May be sent in the query or the body, but the two must match.',
};
const expectedOrgErrors = [
  {status: 400, detail: 'expected_org_id_invalid', when: '`expected_org_id` is not a UUID.'},
  {status: 400, detail: 'expected_org_id_conflict', when: 'Query and body carry different values.'},
  {status: 409, detail: 'expected_org_id_mismatch', when: 'The record belongs to another organization.'},
];

/* ------------------------------------------------------------------ */
/* Operators                                                           */
/* ------------------------------------------------------------------ */

const operatorIdParam = idParam('operatorId', 'Operator id.', IDS.operator);
const operatorBodyFields: Param[] = [
  {name: 'org_id', type: 'uuid', required: true, description: 'Owning organization. Must exist.'},
  {name: 'primary_user_id', type: 'uuid | null', description: 'Primary contact user. Must exist, and must belong to `org_id` when the user has an organization.'},
  {name: 'operator_type_id', type: 'integer | null', description: 'Operator type id. Must exist when set.'},
  {name: 'approval_reference', type: 'string | null', description: 'Unique CAA approval reference.'},
  {name: 'approval_valid_from', type: 'date | null', description: '`YYYY-MM-DD`.'},
  {name: 'approval_valid_to', type: 'date | null', description: '`YYYY-MM-DD`. Cannot be before `approval_valid_from`.'},
];
const operatorWriteErrors = [
  {status: 400, detail: 'org_id_required', when: '`org_id` is missing.'},
  {status: 400, detail: 'operator_type_id_invalid', when: '`operator_type_id` is not a smallint.'},
  {status: 400, detail: 'approval_valid_from_invalid', when: 'Not a valid `YYYY-MM-DD` date.'},
  {status: 400, detail: 'approval_valid_to_invalid', when: 'Not a valid `YYYY-MM-DD` date.'},
  {status: 400, detail: 'approval_valid_to_before_from', when: 'The approval window ends before it starts.'},
  {status: 404, detail: 'organization_not_found', when: '`org_id` does not exist.'},
  {status: 404, detail: 'primary_user_not_found', when: '`primary_user_id` does not exist.'},
  {status: 404, detail: 'operator_type_not_found', when: '`operator_type_id` does not exist.'},
  {status: 409, detail: 'primary_user_org_mismatch', when: 'The primary user belongs to a different organization.'},
  {status: 500, detail: 'internal_server_error', when: '`approval_reference` already exists. The unique violation is not mapped to `409`.'},
];

export const operators = {
  list: {
    id: 'list-operators', api, group: 'Operators', method: 'GET', path: '/operators',
    title: 'List operators', permission: 'operators.read',
    queryParams: [
      {name: 'org_id', type: 'uuid', description: 'Only operators of this organization.', example: IDS.org},
      {name: 'operator_type_id', type: 'integer', description: 'Only operators of this type.'},
      {name: 'q', type: 'string', description: 'Case-insensitive match on `approval_reference`.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([operator])}],
    errors: [...PAGING_ERRORS, {status: 400, detail: 'org_id_invalid', when: '`org_id` is not a UUID.'}, {status: 400, detail: 'operator_type_id_invalid', when: 'Not a smallint.'}, ...bearerErrors('operators.read')],
  },
  get: {
    id: 'get-operator', api, group: 'Operators', method: 'GET', path: '/operators/:operatorId',
    title: 'Get an operator', permission: 'operators.read',
    description: 'Returns the operator joined with its organization, primary user, and operator type. `primary_user` and `operator_type` are `null` when unset.',
    pathParams: [operatorIdParam],
    responses: [{status: 200, body: {operator, organization, primary_user: user, operator_type: operatorType}}],
    errors: [{status: 404, detail: 'operator_not_found', when: 'No operator has this id.'}, {status: 500, detail: 'internal_server_error', when: 'The id is not a valid UUID.'}, ...bearerErrors('operators.read')],
  },
  create: {
    id: 'create-operator', api, group: 'Operators', method: 'POST', path: '/operators',
    title: 'Create an operator', permission: 'operators.write',
    bodyFields: operatorBodyFields, body: operatorWrite,
    responses: [{status: 201, body: operator}],
    errors: [...operatorWriteErrors, ...bearerErrors('operators.write')],
  },
  replace: {
    id: 'replace-operator', api, group: 'Operators', method: 'PUT', path: '/operators/:operatorId',
    title: 'Replace an operator', permission: 'operators.write',
    description: 'Full replacement. Send `expected_org_id` to make sure the operator was not moved to another organization since you read it.',
    pathParams: [operatorIdParam],
    queryParams: [{...expectedOrgParam, example: IDS.org}],
    bodyFields: operatorBodyFields, body: {...operatorWrite, approval_valid_to: '2027-06-30'},
    responses: [{status: 200, body: {...operator, approval_valid_to: '2027-06-30', updated_at: TS2}}],
    errors: [...operatorWriteErrors, {status: 404, detail: 'operator_not_found', when: 'No operator has this id.'}, ...expectedOrgErrors, ...bearerErrors('operators.write')],
  },
  remove: {
    id: 'delete-operator', api, group: 'Operators', method: 'DELETE', path: '/operators/:operatorId',
    title: 'Delete an operator', permission: 'operators.delete',
    description: 'Deletes the operator and its custom property values.',
    pathParams: [operatorIdParam],
    queryParams: [expectedOrgParam],
    responses: [{status: 200, description: 'The deleted row.', body: operator}],
    errors: [{status: 404, detail: 'operator_not_found', when: 'No operator has this id.'}, ...expectedOrgErrors, ...bearerErrors('operators.delete')],
  },
  history: {
    id: 'operator-history', api, group: 'Operators', method: 'GET', path: '/operators/:operatorId/history',
    title: 'Get operator history', permission: 'audit.read',
    pathParams: [operatorIdParam],
    queryParams: [{name: 'limit', type: 'integer', description: 'Maximum events, 1 to 500.', default: '100', example: 20}],
    responses: [{status: 200, body: [auditRow('operator', IDS.operator, 'create', operator)]}],
    errors: [{status: 400, detail: 'limit_invalid', when: '`limit` is out of range.'}, ...bearerErrors('audit.read')],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* UA aircraft                                                         */
/* ------------------------------------------------------------------ */

const uaIdParam = idParam('uaId', 'UA aircraft id.', IDS.ua);
const registrationParam = idParam('registrationId', 'CAA registration id.', 'UAE-UA-000123', 'string');
const uaBodyFields: Param[] = [
  {name: 'org_id', type: 'uuid', required: true, description: 'Owning organization. Must exist.'},
  {name: 'registration_id', type: 'string', required: true, description: 'Unique CAA registration id.'},
  {name: 'serial_number', type: 'string', required: true, description: 'Unique manufacturer serial number.'},
  {name: 'aircraft_type', type: 'string', required: true, description: 'Aircraft category, for example `MULTIROTOR` or `FIXED_WING`.'},
  {name: 'model_name', type: 'string | null', description: 'Model name.'},
  {name: 'propulsion_type', type: 'string | null', description: 'For example `ELECTRIC`.'},
  {name: 'remote_id_capable', type: 'boolean', description: 'Accepts `true`/`false` or the strings `"true"`/`"false"`.', default: 'true'},
  {name: 'mass_kg', type: 'number | string | null', description: 'Non-negative. Returned as a decimal string.'},
  {name: 'max_airspeed_mps', type: 'number | string | null', description: 'Non-negative. Returned as a decimal string.'},
  {name: 'max_altitude_m', type: 'number | string | null', description: 'Non-negative. Returned as a decimal string.'},
  {name: 'endurance_minutes', type: 'integer | null', description: 'Positive integer.'},
];
const uaWriteErrors = [
  {status: 400, detail: 'payload_invalid', when: 'The body is not an object or contains an unknown key.'},
  {status: 400, detail: 'org_id_required', when: '`org_id` is missing.'},
  {status: 400, detail: 'org_id_invalid', when: '`org_id` is not a UUID.'},
  {status: 400, detail: 'registration_id_required', when: '`registration_id` is missing or blank.'},
  {status: 400, detail: 'serial_number_required', when: '`serial_number` is missing or blank.'},
  {status: 400, detail: 'aircraft_type_required', when: '`aircraft_type` is missing or blank.'},
  {status: 400, detail: 'boolean_invalid', when: '`remote_id_capable` is not a boolean.'},
  {status: 400, detail: 'mass_kg_invalid', when: 'Negative or not a number. The same pattern applies to `max_airspeed_mps_invalid`, `max_altitude_m_invalid`, and `endurance_minutes_invalid`.'},
  {status: 404, detail: 'organization_not_found', when: '`org_id` does not exist.'},
  {status: 409, detail: 'registration_id_exists', when: 'Another aircraft has this registration id.'},
  {status: 409, detail: 'serial_number_exists', when: 'Another aircraft has this serial number.'},
];

export const aircraft = {
  list: {
    id: 'list-ua', api, group: 'UA aircraft', method: 'GET', path: '/ua',
    title: 'List UA aircraft', permission: 'ua.read',
    description: 'Newest first. The old `uas_id` and `operator_id` filters were removed with the UAS layer and now return `400`.',
    queryParams: [
      {name: 'org_id', type: 'uuid', description: 'Only aircraft of this organization.', example: IDS.org},
      {name: 'remote_id_capable', type: 'boolean', description: '`true` or `false`.'},
      {name: 'q', type: 'string', description: 'Case-insensitive match on registration id, serial number, model, aircraft type, or propulsion type.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([ua])}],
    errors: [
      ...PAGING_ERRORS,
      {status: 400, detail: 'ua_relationship_filter_removed', when: '`uas_id` or `operator_id` was sent.'},
      {status: 400, detail: 'org_id_invalid', when: '`org_id` is not a UUID.'},
      {status: 400, detail: 'boolean_query_invalid', when: '`remote_id_capable` is not `true` or `false`.'},
      ...bearerErrors('ua.read'),
    ],
  },
  byRegistration: {
    id: 'get-ua-by-registration', api, group: 'UA aircraft', method: 'GET', path: '/ua/by-registration/:registrationId',
    title: 'Get UA by registration id', permission: 'ua.read',
    pathParams: [registrationParam],
    responses: [{status: 200, body: ua}],
    errors: [{status: 404, detail: 'ua_not_found', when: 'No aircraft has this registration id.'}, ...bearerErrors('ua.read')],
  },
  get: {
    id: 'get-ua', api, group: 'UA aircraft', method: 'GET', path: '/ua/:uaId',
    title: 'Get a UA aircraft', permission: 'ua.read', pathParams: [uaIdParam],
    responses: [{status: 200, body: ua}],
    errors: [{status: 400, detail: 'ua_id_invalid', when: 'The id is not a UUID.'}, {status: 404, detail: 'ua_not_found', when: 'No aircraft has this id.'}, ...bearerErrors('ua.read')],
  },
  create: {
    id: 'create-ua', api, group: 'UA aircraft', method: 'POST', path: '/ua',
    title: 'Register a UA aircraft', permission: 'ua.write',
    description: 'Unknown keys are rejected, so clients still sending `uas_id` or `operator_id` get `payload_invalid`.',
    bodyFields: uaBodyFields, body: uaWrite,
    responses: [{status: 201, body: ua}],
    errors: [...uaWriteErrors, ...bearerErrors('ua.write')],
  },
  replace: {
    id: 'replace-ua', api, group: 'UA aircraft', method: 'PUT', path: '/ua/:uaId',
    title: 'Replace a UA aircraft', permission: 'ua.write',
    description: 'Full replacement. `expected_org_id` may also be sent in the body.',
    pathParams: [uaIdParam],
    queryParams: [{...expectedOrgParam, example: IDS.org}],
    bodyFields: [...uaBodyFields, expectedOrgParam],
    body: {...uaWrite, endurance_minutes: 42},
    responses: [{status: 200, body: {...ua, endurance_minutes: 42, updated_at: TS2}}],
    errors: [...uaWriteErrors, {status: 400, detail: 'ua_id_invalid', when: 'The path id is not a UUID.'}, {status: 404, detail: 'ua_not_found', when: 'No aircraft has this id.'}, ...expectedOrgErrors, ...bearerErrors('ua.write')],
  },
  remove: {
    id: 'delete-ua', api, group: 'UA aircraft', method: 'DELETE', path: '/ua/:uaId',
    title: 'Delete a UA aircraft', permission: 'ua.delete',
    description: 'Deletes the aircraft and its custom property values.',
    pathParams: [uaIdParam], queryParams: [expectedOrgParam],
    responses: [{status: 200, description: 'The deleted row.', body: ua}],
    errors: [{status: 404, detail: 'ua_not_found', when: 'No aircraft has this id.'}, ...expectedOrgErrors, ...bearerErrors('ua.delete')],
  },
  history: {
    id: 'ua-history', api, group: 'UA aircraft', method: 'GET', path: '/ua/:uaId/history',
    title: 'Get UA history', permission: 'audit.read', pathParams: [uaIdParam],
    queryParams: [{name: 'limit', type: 'integer', description: 'Maximum events, 1 to 500.', default: '100', example: 20}],
    responses: [{status: 200, body: [auditRow('ua', IDS.ua, 'update', {...ua, endurance_minutes: 42}, ua)]}],
    errors: [{status: 400, detail: 'ua_id_invalid', when: 'The id is not a UUID.'}, ...bearerErrors('audit.read')],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Remote IDs                                                          */
/* ------------------------------------------------------------------ */

const remoteIdParam = idParam('remoteIdId', 'Remote ID record id.', IDS.remoteId);
const remoteIdFields: Param[] = [
  {name: 'org_id', type: 'uuid', required: true, description: 'Owning organization. Must exist.'},
  {name: 'reference', type: 'string', required: true, description: 'Certificate or registration reference.'},
  {name: 'subject_name', type: 'string', required: true, description: 'Certificate subject.'},
  {name: 'valid_from', type: 'datetime', required: true, description: 'ISO 8601 with offset, at most millisecond precision.'},
  {name: 'valid_to', type: 'datetime', required: true, description: 'Must be after `valid_from`.'},
  {name: 'status_code', type: 'string', description: 'Free-form status.', default: 'ACTIVE'},
];
const remoteIdErrors = [
  {status: 400, detail: 'payload_invalid', when: 'The body is not an object or has unknown keys.'},
  {status: 400, detail: 'org_id_invalid', when: 'Missing or not a UUID. Other fields follow the same `<field>_invalid` pattern.'},
  {status: 400, detail: 'valid_from_invalid', when: 'Not an ISO 8601 timestamp with offset.'},
  {status: 400, detail: 'valid_to_must_be_after_valid_from', when: 'The validity window is empty or reversed.'},
  {status: 404, detail: 'organization_not_found', when: '`org_id` does not exist.'},
];

export const remoteIds = {
  list: {
    id: 'list-remote-ids', api, group: 'Remote IDs', method: 'GET', path: '/remote-ids',
    title: 'List Remote ID records', permission: 'remote_ids.read',
    description: 'Ordered by `valid_from`, latest first. The removed `authority_id` filter returns `400`.',
    queryParams: [{name: 'org_id', type: 'uuid', description: 'Only records of this organization.', example: IDS.org}, ...paging()],
    responses: [{status: 200, body: page([remoteId])}],
    errors: [...PAGING_ERRORS, {status: 400, detail: 'remote_id_authority_filter_removed', when: '`authority_id` was sent.'}, {status: 400, detail: 'org_id_invalid', when: 'Not a UUID.'}, ...bearerErrors('remote_ids.read')],
  },
  get: {
    id: 'get-remote-id', api, group: 'Remote IDs', method: 'GET', path: '/remote-ids/:remoteIdId',
    title: 'Get a Remote ID record', permission: 'remote_ids.read', pathParams: [remoteIdParam],
    responses: [{status: 200, body: remoteId}],
    errors: [{status: 400, detail: 'remote_id_id_invalid', when: 'Not a UUID.'}, {status: 404, detail: 'remote_id_not_found', when: 'No record has this id.'}, ...bearerErrors('remote_ids.read')],
  },
  create: {
    id: 'create-remote-id', api, group: 'Remote IDs', method: 'POST', path: '/remote-ids',
    title: 'Create a Remote ID record', permission: 'remote_ids.write',
    bodyFields: remoteIdFields, body: remoteIdWrite,
    responses: [{status: 201, body: remoteId}],
    errors: [...remoteIdErrors, ...bearerErrors('remote_ids.write')],
  },
  replace: {
    id: 'replace-remote-id', api, group: 'Remote IDs', method: 'PUT', path: '/remote-ids/:remoteIdId',
    title: 'Replace a Remote ID record', permission: 'remote_ids.write',
    pathParams: [remoteIdParam], bodyFields: remoteIdFields, body: {...remoteIdWrite, status_code: 'SUSPENDED'},
    responses: [{status: 200, body: {...remoteId, status_code: 'SUSPENDED'}}],
    errors: [...remoteIdErrors, {status: 404, detail: 'remote_id_not_found', when: 'No record has this id.'}, ...bearerErrors('remote_ids.write')],
  },
  remove: {
    id: 'delete-remote-id', api, group: 'Remote IDs', method: 'DELETE', path: '/remote-ids/:remoteIdId',
    title: 'Delete a Remote ID record', permission: 'remote_ids.delete', pathParams: [remoteIdParam],
    responses: [{status: 200, description: 'The deleted row.', body: remoteId}],
    errors: [{status: 404, detail: 'remote_id_not_found', when: 'No record has this id.'}, ...bearerErrors('remote_ids.delete')],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Lookup, search, audit                                               */
/* ------------------------------------------------------------------ */

export const lookup = {
  ua: {
    id: 'lookup-ua', api, group: 'Lookup and search', method: 'GET', path: '/lookup/ua/:registrationId',
    title: 'Look up a UA by registration id', permission: 'ua.read',
    description: 'Operational lookup by registration id. Returns the same row as `GET /ua/by-registration/:registrationId`. The old `/lookup/uas/...` route no longer exists.',
    pathParams: [registrationParam],
    responses: [{status: 200, body: ua}],
    errors: [{status: 404, detail: 'ua_not_found', when: 'No aircraft has this registration id.'}, ...bearerErrors('ua.read')],
  },
  search: {
    id: 'search', api, group: 'Lookup and search', method: 'GET', path: '/search',
    title: 'Search the registry', permission: 'search.read',
    description: 'Runs the same case-insensitive term against organizations, users, operators, and aircraft. Each section is paged independently with the same `limit` and `offset`.',
    queryParams: [
      {name: 'q', type: 'string', required: true, description: 'Search term, at least 2 characters.', example: 'skyline'},
      {name: 'org_id', type: 'uuid', description: 'Restrict every section to one organization.'},
      {name: 'limit', type: 'integer', description: 'Rows per section, 1 to 50.', default: '10', example: 10},
      {name: 'offset', type: 'integer', description: 'Rows to skip in each section.', default: '0'},
    ],
    responses: [{
      status: 200,
      body: {
        organizations: [organization], users: [], operators: [operator], ua: [ua],
        limit: 10, offset: 0,
        organizations_has_more: false, users_has_more: false, operators_has_more: false, ua_has_more: false,
      },
    }],
    errors: [
      {status: 400, detail: 'q_required', when: '`q` is missing or blank.'},
      {status: 400, detail: 'q_too_short', when: '`q` has fewer than 2 characters.'},
      {status: 400, detail: 'org_id_invalid', when: '`org_id` is not a UUID.'},
      ...PAGING_ERRORS,
      ...bearerErrors('search.read'),
    ],
  },
} satisfies Record<string, EndpointSpec>;

export const audit = {
  list: {
    id: 'list-audit', api, group: 'Audit', method: 'GET', path: '/audit',
    title: 'List audit events', permission: 'audit.read',
    description: 'All audit events, newest first.',
    queryParams: [
      {name: 'entity_type', type: 'string', description: 'For example `organization`, `user`, `operator`, `ua`, `remote_id`, `organization_admin`, `ua_property`.', example: 'operator'},
      {name: 'action', type: 'string', description: 'For example `create`, `update`, `delete`, `update_national_id`, `zitadel_sync_create`.'},
      {name: 'actor', type: 'string', description: 'Exact actor: token email, then username, then subject, or `system`.'},
      {name: 'limit', type: 'integer', description: 'Page size, 1 to 500.', default: '100', example: 20},
      {name: 'offset', type: 'integer', description: 'Rows to skip.', default: '0'},
    ],
    responses: [{status: 200, body: page([auditRow('operator', IDS.operator, 'create', operator)])}],
    errors: [...PAGING_ERRORS, ...bearerErrors('audit.read')],
  },
} satisfies Record<string, EndpointSpec>;
