import {bearerErrors, idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, JsonValue} from '@site/src/api/types';

import {IDS, operatorType, organization, organizationAdmin, organizationWrite, TS2, user, userType, userWrite} from './samples';

const api = 'caa-registry' as const;
const UUID_500 = {
  status: 500,
  detail: 'internal_server_error',
  when: 'The path id is not a valid UUID. This route does not validate the id before querying.',
};

export const health = {
  get: {
    id: 'get-health',
    api,
    group: 'Health',
    method: 'GET',
    path: '/health',
    title: 'Check service health',
    description: 'Checks PostgreSQL connectivity and reports whether Redis is connected.',
    auth: 'public-health',
    responses: [
      {status: 200, description: 'The database answered. `cache` is `connected` when Redis is open.', body: {status: 'ok', database: 'ok', cache: 'disabled_or_unavailable'}},
    ],
    errors: [
      {status: 500, detail: 'internal_server_error', when: 'The database health query failed.'},
      {status: 401, detail: 'authentication_required', when: '`ZITADEL_BYPASS_AUTH_FOR_HEALTH=false` and no token was sent.'},
    ],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

function referenceType(opts: {
  path: string;
  param: string;
  idField: string;
  entity: string;
  label: string;
  plural: string;
  sample: {[key: string]: JsonValue};
  write: {[key: string]: JsonValue};
}) {
  const idParamSpec = idParam(opts.param, `Numeric ${opts.label} id (smallint).`, '1', 'integer');
  const bodyFields = [
    {name: 'id', type: 'integer', required: true, description: `Smallint primary key chosen by the client. On \`PUT\` the path id is used instead.`, example: 1},
    {name: 'code', type: 'string', required: true, description: 'Unique, non-empty code.'},
    {name: 'description', type: 'string | null', description: 'Free-text description. Blank strings are stored as `null`.'},
  ];
  const group = 'Reference data';
  return {
    list: {
      id: `list-${opts.entity}s`, api, group, method: 'GET', path: opts.path,
      title: `List ${opts.plural}`, permission: 'reference.read',
      description: `Returns ${opts.plural} ordered by id, highest first.`,
      queryParams: paging(),
      responses: [{status: 200, body: page([opts.sample])}],
      errors: [...PAGING_ERRORS, ...bearerErrors('reference.read')],
    },
    get: {
      id: `get-${opts.entity}`, api, group, method: 'GET', path: `${opts.path}/:${opts.param}`,
      title: `Get a ${opts.label}`, permission: 'reference.read',
      pathParams: [idParamSpec],
      responses: [{status: 200, body: opts.sample}],
      errors: [
        {status: 400, detail: `${opts.entity}_id_invalid`, when: 'The id is not a smallint.'},
        {status: 404, detail: `${opts.entity}_not_found`, when: 'No row has this id.'},
        ...bearerErrors('reference.read'),
      ],
    },
    create: {
      id: `create-${opts.entity}`, api, group, method: 'POST', path: opts.path,
      title: `Create a ${opts.label}`, permission: 'reference.write',
      bodyFields, body: {id: 1, ...opts.write},
      responses: [{status: 201, body: opts.sample}],
      errors: [
        {status: 400, detail: 'id_invalid', when: '`id` is missing or not a smallint.'},
        {status: 400, detail: 'code_required', when: '`code` is missing or blank.'},
        {status: 500, detail: 'internal_server_error', when: 'The `id` or `code` already exists. Duplicates are not mapped to `409` on this route.'},
        ...bearerErrors('reference.write'),
      ],
      notes: ['Writes an audit event with action `create`.'],
    },
    replace: {
      id: `replace-${opts.entity}`, api, group, method: 'PUT', path: `${opts.path}/:${opts.param}`,
      title: `Replace a ${opts.label}`, permission: 'reference.write',
      description: 'Replaces `code` and `description`. The id cannot change.',
      pathParams: [idParamSpec],
      bodyFields: bodyFields.slice(1),
      body: opts.write,
      responses: [{status: 200, body: opts.sample}],
      errors: [
        {status: 400, detail: `${opts.entity}_id_invalid`, when: 'The path id is not a smallint.'},
        {status: 400, detail: 'code_required', when: '`code` is missing or blank.'},
        {status: 404, detail: `${opts.entity}_not_found`, when: 'No row has this id.'},
        ...bearerErrors('reference.write'),
      ],
    },
    remove: {
      id: `delete-${opts.entity}`, api, group, method: 'DELETE', path: `${opts.path}/:${opts.param}`,
      title: `Delete a ${opts.label}`, permission: 'reference.delete',
      description: `Deletes the row and returns it. Rows that referenced it keep a \`null\` ${opts.idField}.`,
      pathParams: [idParamSpec],
      responses: [{status: 200, description: 'The deleted row.', body: opts.sample}],
      errors: [
        {status: 404, detail: `${opts.entity}_not_found`, when: 'No row has this id.'},
        ...bearerErrors('reference.delete'),
      ],
    },
  } satisfies Record<string, EndpointSpec>;
}

export const operatorTypes = referenceType({
  path: '/operator-types', param: 'operatorTypeId', idField: '`operator_type_id`', entity: 'operator_type',
  label: 'operator type', plural: 'operator types', sample: operatorType,
  write: {code: 'COMMERCIAL', description: 'Commercial UAS operator'},
});

export const userTypes = referenceType({
  path: '/user-types', param: 'userTypeId', idField: '`user_type_id`', entity: 'user_type',
  label: 'user type', plural: 'user types', sample: userType,
  write: {code: 'REMOTE_PILOT', description: 'Remote pilot in command'},
});

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

const orgIdParam = idParam('orgId', 'Organization id.', IDS.org);
const orgBodyFields = [
  {name: 'org_name', type: 'string', required: true, description: 'Unique organization name.'},
  {name: 'organization_kind', type: 'enum', description: 'One of `CAA`, `USS`, `OPERATOR`, `SERVICE_PROVIDER`, `OTHER`. Case-insensitive.', default: 'OTHER'},
  {name: 'contact_email', type: 'string | null', description: 'Contact email. Blank strings become `null`.'},
  {name: 'contact_phone', type: 'string | null', description: 'Contact phone number.'},
  {name: 'country_code', type: 'string | null', description: 'Country code, stored upper-case.'},
];
const orgWriteErrors = [
  {status: 400, detail: 'org_name_required', when: '`org_name` is missing or blank.'},
  {status: 400, detail: 'organization_kind_invalid', when: '`organization_kind` is not one of the allowed values.'},
  {status: 500, detail: 'internal_server_error', when: '`org_name` already exists. The unique violation is not mapped to `409` on this route.'},
];

export const organizations = {
  list: {
    id: 'list-organizations', api, group: 'Organizations', method: 'GET', path: '/organizations',
    title: 'List organizations', permission: 'organizations.read',
    description: 'Newest first. Combine `q` and `organization_kind` to narrow results.',
    queryParams: [
      {name: 'q', type: 'string', description: 'Case-insensitive match on `org_name`, `contact_email`, or `country_code`.', example: 'skyline'},
      {name: 'organization_kind', type: 'enum', description: 'Exact kind, case-insensitive.', example: 'OPERATOR'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([organization])}],
    errors: [...PAGING_ERRORS, {status: 400, detail: 'organization_kind_invalid', when: 'The kind filter is not an allowed value.'}, ...bearerErrors('organizations.read')],
  },
  get: {
    id: 'get-organization', api, group: 'Organizations', method: 'GET', path: '/organizations/:orgId',
    title: 'Get an organization', permission: 'organizations.read',
    pathParams: [orgIdParam],
    responses: [{status: 200, body: organization}],
    errors: [{status: 404, detail: 'organization_not_found', when: 'No organization has this id.'}, UUID_500, ...bearerErrors('organizations.read')],
  },
  create: {
    id: 'create-organization', api, group: 'Organizations', method: 'POST', path: '/organizations',
    title: 'Create an organization', permission: 'organizations.write',
    bodyFields: orgBodyFields, body: organizationWrite,
    responses: [{status: 201, description: '`organization_kind` and `country_code` are normalized to upper case.', body: organization}],
    errors: [...orgWriteErrors, ...bearerErrors('organizations.write')],
  },
  replace: {
    id: 'replace-organization', api, group: 'Organizations', method: 'PUT', path: '/organizations/:orgId',
    title: 'Replace an organization', permission: 'organizations.write',
    description: 'Full replacement: omitted optional fields become `null`, and an omitted kind becomes `OTHER`.',
    pathParams: [orgIdParam], bodyFields: orgBodyFields, body: {...organizationWrite, contact_phone: '+971500000099'},
    responses: [{status: 200, body: {...organization, contact_phone: '+971500000099', updated_at: TS2}}],
    errors: [...orgWriteErrors, {status: 404, detail: 'organization_not_found', when: 'No organization has this id.'}, ...bearerErrors('organizations.write')],
  },
  remove: {
    id: 'delete-organization', api, group: 'Organizations', method: 'DELETE', path: '/organizations/:orgId',
    title: 'Delete an organization', permission: 'organizations.delete',
    description: 'Deletes the organization and returns it. Admin links, organization properties, and Remote ID records are deleted with it; users keep their row with `org_id` set to `null`.',
    pathParams: [orgIdParam],
    responses: [{status: 200, description: 'The deleted row.', body: organization}],
    errors: [
      {status: 404, detail: 'organization_not_found', when: 'No organization has this id.'},
      {status: 409, detail: 'organization_reference_conflict', when: 'UA aircraft still belong to the organization.'},
      {status: 500, detail: 'internal_server_error', when: 'Operators still belong to the organization (the restrict violation is not mapped).'},
      ...bearerErrors('organizations.delete'),
    ],
  },
  history: {
    id: 'organization-history', api, group: 'Organizations', method: 'GET', path: '/organizations/:orgId/history',
    title: 'Get organization history', permission: 'audit.read',
    description: 'Audit events for one organization, newest first. Returns a plain array, not a page.',
    pathParams: [orgIdParam],
    queryParams: [{name: 'limit', type: 'integer', description: 'Maximum events, 1 to 500.', default: '100', example: 20}],
    responses: [{status: 200, body: [{audit_id: IDS.audit, entity_type: 'organization', entity_id: IDS.org, action: 'update', actor: 'amina@skyline.example', correlation_id: null, created_at: TS2, before_json: organization, after_json: {...organization, contact_phone: '+971500000099'}}]}],
    errors: [{status: 400, detail: 'limit_invalid', when: '`limit` is out of range.'}, ...bearerErrors('audit.read')],
  },
} satisfies Record<string, EndpointSpec>;

const adminIdParam = idParam('organizationAdminId', 'Organization admin link id.', IDS.orgAdmin);
const adminBody = {org_id: IDS.org, user_id: IDS.user};
const adminBodyFields = [
  {name: 'org_id', type: 'uuid', required: true, description: 'Organization the user administers.'},
  {name: 'user_id', type: 'uuid', required: true, description: 'Registry user who becomes an admin.'},
];
const adminWriteErrors = [
  {status: 400, detail: 'payload_invalid', when: 'The body is not an object or has unknown keys.'},
  {status: 400, detail: 'org_id_invalid', when: '`org_id` is missing or not a UUID.'},
  {status: 400, detail: 'user_id_invalid', when: '`user_id` is missing or not a UUID.'},
  {status: 404, detail: 'organization_not_found', when: 'The organization does not exist.'},
  {status: 404, detail: 'user_not_found', when: 'The user does not exist.'},
  {status: 409, detail: 'organization_admin_already_exists', when: 'The user is already an admin of this organization.'},
];

export const organizationAdmins = {
  list: {
    id: 'list-organization-admins', api, group: 'Organization admins', method: 'GET', path: '/organization-admins',
    title: 'List organization admins', permission: 'organizations.read',
    queryParams: [
      {name: 'org_id', type: 'uuid', description: 'Only admins of this organization.', example: IDS.org},
      {name: 'user_id', type: 'uuid', description: 'Only links for this user.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([organizationAdmin])}],
    errors: [...PAGING_ERRORS, {status: 400, detail: 'org_id_invalid', when: '`org_id` is not a UUID.'}, {status: 400, detail: 'user_id_invalid', when: '`user_id` is not a UUID.'}, ...bearerErrors('organizations.read')],
  },
  get: {
    id: 'get-organization-admin', api, group: 'Organization admins', method: 'GET', path: '/organization-admins/:organizationAdminId',
    title: 'Get an organization admin link', permission: 'organizations.read',
    pathParams: [adminIdParam],
    responses: [{status: 200, body: organizationAdmin}],
    errors: [{status: 400, detail: 'organization_admin_id_invalid', when: 'The id is not a UUID.'}, {status: 404, detail: 'organization_admin_not_found', when: 'No link has this id.'}, ...bearerErrors('organizations.read')],
  },
  create: {
    id: 'create-organization-admin', api, group: 'Organization admins', method: 'POST', path: '/organization-admins',
    title: 'Add an organization admin', permission: 'organizations.write',
    bodyFields: adminBodyFields, body: adminBody,
    responses: [{status: 201, body: organizationAdmin}],
    errors: [...adminWriteErrors, ...bearerErrors('organizations.write')],
  },
  replace: {
    id: 'replace-organization-admin', api, group: 'Organization admins', method: 'PUT', path: '/organization-admins/:organizationAdminId',
    title: 'Replace an organization admin link', permission: 'organizations.write',
    pathParams: [adminIdParam], bodyFields: adminBodyFields, body: adminBody,
    responses: [{status: 200, body: {...organizationAdmin, updated_at: TS2}}],
    errors: [...adminWriteErrors, {status: 404, detail: 'organization_admin_not_found', when: 'No link has this id.'}, ...bearerErrors('organizations.write')],
  },
  remove: {
    id: 'delete-organization-admin', api, group: 'Organization admins', method: 'DELETE', path: '/organization-admins/:organizationAdminId',
    title: 'Remove an organization admin', permission: 'organizations.delete',
    pathParams: [adminIdParam],
    responses: [{status: 200, description: 'The deleted link.', body: organizationAdmin}],
    errors: [{status: 404, detail: 'organization_admin_not_found', when: 'No link has this id.'}, ...bearerErrors('organizations.delete')],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

const userIdParam = idParam('userId', 'Registry user id.', IDS.user);
const userBodyFields = [
  {name: 'full_name', type: 'string', required: true, description: 'Display name.'},
  {name: 'email', type: 'string', required: true, description: 'Unique email. Stored lower-case.'},
  {name: 'org_id', type: 'uuid | null', description: 'Organization the user belongs to. Must exist when set.'},
  {name: 'user_type_id', type: 'integer | null', description: 'User type id. Must exist when set.'},
  {name: 'phone', type: 'string | null', description: 'Phone number.'},
  {name: 'national_id_number', type: 'string | null', description: 'National id number. Send all three national id fields or none.'},
  {name: 'national_id_country_code', type: 'string | null', description: 'Issuing country, stored upper-case.'},
  {name: 'national_id_type', type: 'string | null', description: 'Document type, stored lower-case (for example `emirates_id`).'},
];
const userWriteErrors = [
  {status: 400, detail: 'email_required', when: '`email` is missing or blank.'},
  {status: 400, detail: 'full_name_required', when: '`full_name` is missing or blank.'},
  {status: 400, detail: 'user_type_id_invalid', when: '`user_type_id` is not a smallint.'},
  {status: 400, detail: 'national_id_incomplete', when: 'Only some of the three national id fields were sent.'},
  {status: 404, detail: 'organization_not_found', when: '`org_id` does not exist.'},
  {status: 404, detail: 'user_type_not_found', when: '`user_type_id` does not exist.'},
  {status: 409, detail: 'email_conflict', when: 'Another user has this email.'},
  {status: 409, detail: 'national_id_conflict', when: 'Another user has the same country, type, and number.'},
];

export const users = {
  list: {
    id: 'list-users', api, group: 'Users', method: 'GET', path: '/users',
    title: 'List users', permission: 'users.read',
    description: 'Newest first. All filters combine with AND.',
    queryParams: [
      {name: 'q', type: 'string', description: 'Case-insensitive match on `full_name` or `email`.', example: 'amina'},
      {name: 'org_id', type: 'uuid', description: 'Only users of this organization.'},
      {name: 'user_type_id', type: 'integer', description: 'Only users of this type.'},
      {name: 'email', type: 'string', description: 'Exact email, case-insensitive.'},
      {name: 'zitadel_user_id', type: 'string', description: 'Exact ZITADEL user id.'},
      {name: 'zitadel_status', type: 'enum', description: '`active` or `deleted`.'},
      {name: 'national_id_number', type: 'string', description: 'National id lookup. Requires all three national id parameters.'},
      {name: 'national_id_country_code', type: 'string', description: 'Issuing country for the national id lookup.'},
      {name: 'national_id_type', type: 'string', description: 'Document type for the national id lookup.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([user])}],
    errors: [
      ...PAGING_ERRORS,
      {status: 400, detail: 'user_type_id_invalid', when: '`user_type_id` is not a smallint.'},
      {status: 400, detail: 'zitadel_status_invalid', when: '`zitadel_status` is not `active` or `deleted`.'},
      {status: 400, detail: 'national_id_filter_incomplete', when: 'Only some of the national id parameters were sent.'},
      ...bearerErrors('users.read'),
    ],
  },
  get: {
    id: 'get-user', api, group: 'Users', method: 'GET', path: '/users/:userId',
    title: 'Get a user', permission: 'users.read', pathParams: [userIdParam],
    responses: [{status: 200, body: user}],
    errors: [{status: 404, detail: 'user_not_found', when: 'No user has this id.'}, UUID_500, ...bearerErrors('users.read')],
  },
  create: {
    id: 'create-user', api, group: 'Users', method: 'POST', path: '/users',
    title: 'Create a user', permission: 'users.write',
    description: 'Creates a registry user without a ZITADEL link. Users created from ZITADEL events arrive through the integration endpoints instead.',
    bodyFields: userBodyFields, body: userWrite,
    responses: [{status: 201, body: {...user, zitadel_user_id: null, zitadel_last_synced_at: null}}],
    errors: [...userWriteErrors, ...bearerErrors('users.write')],
  },
  replace: {
    id: 'replace-user', api, group: 'Users', method: 'PUT', path: '/users/:userId',
    title: 'Replace a user', permission: 'users.write',
    description: 'Full replacement of the writable fields. Omitted national id fields clear the national id. ZITADEL fields are not writable here.',
    pathParams: [userIdParam], bodyFields: userBodyFields, body: {...userWrite, phone: '+971500000077'},
    responses: [{status: 200, body: {...user, phone: '+971500000077', updated_at: TS2}}],
    errors: [...userWriteErrors, {status: 404, detail: 'user_not_found', when: 'No user has this id.'}, ...bearerErrors('users.write')],
  },
  nationalId: {
    id: 'update-user-national-id', api, group: 'Users', method: 'PATCH', path: '/users/:userId/national-id',
    title: 'Set or clear a national id', permission: 'users.write',
    description: 'Changes only the national id. Send all three fields to set it, or all three as `null` to clear it. Audited as `update_national_id`.',
    pathParams: [userIdParam],
    bodyFields: userBodyFields.slice(5).map((field) => ({...field, required: true})),
    body: {national_id_number: '784198012345671', national_id_country_code: 'AE', national_id_type: 'emirates_id'},
    responses: [{status: 200, body: {...user, updated_at: TS2}}],
    errors: [
      {status: 400, detail: 'national_id_payload_required', when: 'None of the three fields is present in the body.'},
      {status: 400, detail: 'national_id_incomplete', when: 'Some, but not all, fields have values.'},
      {status: 404, detail: 'user_not_found', when: 'No user has this id.'},
      {status: 409, detail: 'national_id_conflict', when: 'Another user already has this national id.'},
      ...bearerErrors('users.write'),
    ],
  },
  remove: {
    id: 'delete-user', api, group: 'Users', method: 'DELETE', path: '/users/:userId',
    title: 'Delete a user', permission: 'users.delete',
    description: 'Hard delete. Identity links and admin links are removed; operators that named this user keep the row with `primary_user_id` set to `null`.',
    pathParams: [userIdParam],
    responses: [{status: 200, description: 'The deleted row.', body: user}],
    errors: [{status: 404, detail: 'user_not_found', when: 'No user has this id.'}, ...bearerErrors('users.delete')],
  },
  history: {
    id: 'user-history', api, group: 'Users', method: 'GET', path: '/users/:userId/history',
    title: 'Get user history', permission: 'audit.read',
    description: 'Audit events for one user, newest first. Includes `zitadel_sync_*` actions.',
    pathParams: [userIdParam],
    queryParams: [{name: 'limit', type: 'integer', description: 'Maximum events, 1 to 500.', default: '100', example: 20}],
    responses: [{status: 200, body: [{audit_id: IDS.audit, entity_type: 'user', entity_id: IDS.user, action: 'zitadel_sync_create', actor: 'system', correlation_id: null, created_at: TS2, before_json: null, after_json: user}]}],
    errors: [{status: 400, detail: 'limit_invalid', when: '`limit` is out of range.'}, ...bearerErrors('audit.read')],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* ZITADEL integrations                                                */
/* ------------------------------------------------------------------ */

const signatureHeader = {
  name: 'ZITADEL-Signature',
  type: 'string',
  required: true,
  description: '`t=<unix seconds>,v1=<hex HMAC-SHA256>` over `<t>.<raw body>` using `ZITADEL_ACTION_SIGNING_KEY`. `X-ZITADEL-Signature` is also accepted.',
};
const signatureErrors = [
  {status: 503, detail: 'zitadel_action_signing_key_missing', when: 'The service has no signing key configured.'},
  {status: 400, detail: 'zitadel_raw_body_missing', when: 'The request had no body.'},
  {status: 401, detail: 'zitadel_signature_missing', when: 'No signature header was sent.'},
  {status: 401, detail: 'zitadel_signature_invalid', when: 'The header is malformed or no `v1` value matches.'},
  {status: 401, detail: 'zitadel_signature_expired', when: 'The timestamp is outside the tolerance window (default 300 seconds).'},
  {status: 400, detail: 'zitadel_event_payload_invalid', when: 'The event body is missing required fields.'},
  {status: 400, detail: 'zitadel_event_type_unsupported', when: 'The event type is not handled by this endpoint.'},
];

export const zitadel = {
  users: {
    id: 'zitadel-user-event', api, group: 'ZITADEL integrations', method: 'POST', path: '/integrations/zitadel/users',
    title: 'Receive a ZITADEL user event', auth: 'zitadel-signature',
    description: 'Preferred Actions V2 target. `user.human.added` creates or updates a registry user; `user.removed` marks it deleted.',
    headers: [signatureHeader],
    bodyFields: [
      {name: 'aggregateID', type: 'string', required: true, description: 'ZITADEL user id.'},
      {name: 'event_type', type: 'string', required: true, description: '`user.human.added` or `user.removed`. `eventType` is also accepted.'},
      {name: 'event_payload', type: 'object', description: 'For `user.human.added`: `email`, and optionally `displayName` or first and last names, and `phoneNumber`.'},
      {name: 'created_at', type: 'string', description: 'For `user.removed`: when the user was removed. Stored as `zitadel_deleted_at`.'},
    ],
    body: {aggregateID: IDS.zitadelUser, event_type: 'user.human.added', event_payload: {email: 'amina@skyline.example', displayName: 'Amina Hassan', phoneNumber: '+971500000002'}},
    responses: [
      {status: 201, description: 'A new registry user was created and linked. Audited as `zitadel_sync_create`.', body: {action: 'created', user}},
      {status: 200, description: 'An existing user was updated (`updated`, audited as `zitadel_sync_update`) or already matched (`unchanged`). For `user.removed` the action is `marked_deleted`, `unchanged`, or `missing`.', body: {action: 'updated', user}},
    ],
    errors: signatureErrors,
  },
  deleted: {
    id: 'zitadel-user-deleted-event', api, group: 'ZITADEL integrations', method: 'POST', path: '/integrations/zitadel/users/deleted',
    title: 'Receive a ZITADEL user removal', auth: 'zitadel-signature',
    description: 'Delete-only target for deployments that send `user.removed` to a separate URL. Registry users are soft-marked, never hard-deleted.',
    headers: [signatureHeader],
    bodyFields: [
      {name: 'aggregateID', type: 'string', required: true, description: 'ZITADEL user id.'},
      {name: 'event_type', type: 'string', required: true, description: 'Must be `user.removed`.'},
      {name: 'created_at', type: 'string', description: 'Removal time.'},
    ],
    body: {aggregateID: IDS.zitadelUser, event_type: 'user.removed', created_at: '2026-06-03T12:00:00Z'},
    responses: [
      {status: 200, description: '`marked_deleted` sets `zitadel_status` to `deleted` and audits `zitadel_sync_delete`. `missing` means the user was never synced; the call still succeeds so ZITADEL does not retry.', body: {action: 'marked_deleted', user: {...user, zitadel_status: 'deleted', zitadel_deleted_at: '2026-06-03T12:00:00.000Z'}}},
    ],
    errors: signatureErrors,
  },
} satisfies Record<string, EndpointSpec>;
