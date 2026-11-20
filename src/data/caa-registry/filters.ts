import {bearerErrors, page} from '@site/src/api/helpers';
import type {EndpointSpec, JsonValue, Param} from '@site/src/api/types';

import {IDS, operator, organization, remoteId, ua, user} from './samples';

const api = 'caa-registry' as const;

interface FilterResource {
  slug: string;
  path: string;
  label: string;
  permission: string;
  orgScoped?: boolean;
  columns: string[];
  example: {filters: JsonValue[]; order_by?: JsonValue[]};
  row?: JsonValue;
}

export const filterResources: FilterResource[] = [
  {slug: 'organizations', path: '/organizations', label: 'organizations', permission: 'organizations.read',
    columns: ['org_id', 'org_name', 'organization_kind', 'contact_email', 'contact_phone', 'country_code', 'created_at', 'updated_at'],
    example: {filters: [{column: 'organization_kind', operator: 'in', value: ['OPERATOR', 'USS']}, {column: 'org_name', operator: 'contains', value: 'sky'}], order_by: [{column: 'org_name', direction: 'asc'}]},
    row: organization},
  {slug: 'organization-admins', path: '/organization-admins', label: 'organization admins', permission: 'organizations.read',
    columns: ['organization_admin_id', 'org_id', 'user_id', 'created_at', 'updated_at'],
    example: {filters: [{column: 'org_id', operator: 'eq', value: IDS.org}]}},
  {slug: 'organization-properties', path: '/organization-properties', label: 'organization property values', permission: 'organizations.read',
    columns: ['organization_properties_id', 'org_id', 'organization_properties_name_id', 'value'],
    example: {filters: [{column: 'organization_properties_name_id', operator: 'eq', value: IDS.organizationPropertyName}]}},
  {slug: 'organization-property-names', path: '/organization-property-names', label: 'organization property definitions', permission: 'organizations.read',
    columns: ['organization_properties_names_id', 'name', 'description', 'data_type', 'is_required', 'is_unique', 'domain_values'],
    example: {filters: [{column: 'is_required', operator: 'eq', value: true}]}},
  {slug: 'users', path: '/users', label: 'users', permission: 'users.read',
    columns: ['user_id', 'org_id', 'user_type_id', 'zitadel_user_id', 'zitadel_status', 'zitadel_deleted_at', 'zitadel_last_synced_at', 'national_id_number', 'national_id_country_code', 'national_id_type', 'full_name', 'email', 'phone', 'created_at', 'updated_at'],
    example: {filters: [{column: 'zitadel_status', operator: 'eq', value: 'active'}, {column: 'created_at', operator: 'gte', value: '2026-05-01T00:00:00Z'}], order_by: [{column: 'created_at', direction: 'desc'}]},
    row: user},
  {slug: 'user-identities', path: '/user-identities', label: 'user identity links', permission: 'users.read',
    columns: ['user_identity_id', 'user_id', 'provider', 'provider_user_id', 'status', 'metadata', 'linked_at', 'last_synced_at', 'deleted_at', 'created_at', 'updated_at'],
    example: {filters: [{column: 'provider', operator: 'eq', value: 'zitadel'}, {column: 'status', operator: 'eq', value: 'deleted'}]}},
  {slug: 'operators', path: '/operators', label: 'operators', permission: 'operators.read', orgScoped: true,
    columns: ['operator_id', 'org_id', 'primary_user_id', 'operator_type_id', 'approval_reference', 'approval_valid_from', 'approval_valid_to', 'created_at', 'updated_at'],
    example: {filters: [{column: 'approval_valid_to', operator: 'lt', value: '2026-12-31'}], order_by: [{column: 'approval_valid_to', direction: 'asc'}]},
    row: operator},
  {slug: 'operator-properties', path: '/operator-properties', label: 'operator property values', permission: 'operators.read', orgScoped: true,
    columns: ['operators_properties_id', 'operator_id', 'operators_properties_name_id', 'value'],
    example: {filters: [{column: 'value', operator: 'is_null'}]}},
  {slug: 'operator-property-names', path: '/operator-property-names', label: 'operator property definitions', permission: 'operators.read',
    columns: ['operators_properties_names_id', 'name', 'description', 'data_type', 'is_required', 'is_unique', 'domain_values'],
    example: {filters: [{column: 'domain_values', operator: 'json_contains', value: {kind: 'range'}}]}},
  {slug: 'operator-types', path: '/operator-types', label: 'operator types', permission: 'reference.read',
    columns: ['operator_type_id', 'code', 'description'],
    example: {filters: [{column: 'code', operator: 'starts_with', value: 'COM'}]}},
  {slug: 'user-types', path: '/user-types', label: 'user types', permission: 'reference.read',
    columns: ['user_type_id', 'code', 'description'],
    example: {filters: [{column: 'user_type_id', operator: 'in', value: [1, 2]}]}},
  {slug: 'ua', path: '/ua', label: 'UA aircraft', permission: 'ua.read', orgScoped: true,
    columns: ['ua_id', 'org_id', 'aircraft_type', 'propulsion_type', 'mass_kg', 'max_airspeed_mps', 'max_altitude_m', 'endurance_minutes', 'registration_id', 'serial_number', 'model_name', 'remote_id_capable', 'created_at', 'updated_at'],
    example: {filters: [{column: 'mass_kg', operator: 'lte', value: '2'}, {column: 'remote_id_capable', operator: 'eq', value: true}], order_by: [{column: 'mass_kg', direction: 'desc'}]},
    row: ua},
  {slug: 'ua-properties', path: '/ua-properties', label: 'UA property values', permission: 'ua.read', orgScoped: true,
    columns: ['ua_properties_id', 'ua_id', 'ua_properties_name_id', 'value'],
    example: {filters: [{column: 'ua_id', operator: 'eq', value: IDS.ua}]}},
  {slug: 'ua-property-names', path: '/ua-property-names', label: 'UA property definitions', permission: 'ua.read',
    columns: ['ua_properties_names_id', 'name', 'description', 'data_type', 'is_required', 'is_unique', 'domain_values'],
    example: {filters: [{column: 'data_type', operator: 'eq', value: 'number'}]}},
  {slug: 'remote-ids', path: '/remote-ids', label: 'Remote ID records', permission: 'remote_ids.read',
    columns: ['remote_id_id', 'org_id', 'reference', 'subject_name', 'valid_from', 'valid_to', 'status_code'],
    example: {filters: [{column: 'valid_to', operator: 'lt', value: '2026-12-31T00:00:00Z'}, {column: 'status_code', operator: 'eq', value: 'ACTIVE'}]},
    row: remoteId},
  {slug: 'audit', path: '/audit', label: 'audit events', permission: 'audit.read',
    columns: ['audit_id', 'entity_type', 'entity_id', 'action', 'actor', 'correlation_id', 'created_at', 'before_json', 'after_json'],
    example: {filters: [{column: 'entity_type', operator: 'eq', value: 'ua'}, {column: 'action', operator: 'in', value: ['update', 'delete']}], order_by: [{column: 'created_at', direction: 'desc'}]}},
  {slug: 'system-jobs', path: '/system/jobs', label: 'system jobs', permission: 'users.read',
    columns: ['system_job_id', 'type', 'status', 'created_by_subject', 'created_by_name', 'payload', 'result_summary', 'error_message', 'started_at', 'completed_at', 'failed_at', 'created_at', 'updated_at'],
    example: {filters: [{column: 'status', operator: 'eq', value: 'failed'}]}},
  {slug: 'system-job-state', path: '/system/job-state', label: 'system job state', permission: 'users.read',
    columns: ['key', 'value', 'updated_at'],
    example: {filters: [{column: 'key', operator: 'eq', value: 'zitadel_user_reconciliation'}]}},
];

export const filterBodyFields = (orgScoped?: boolean): Param[] => [
  {name: 'filters', type: 'array', description: 'Up to 100 conditions: `{ "column", "operator", "value" }`. Columns are the resource column names listed below.'},
  {name: 'filters[].operator', type: 'enum', description: '`eq`, `ne`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `contains`, `starts_with`, `ends_with`, `json_contains`, `is_null`, `is_not_null`.'},
  {name: 'match', type: 'enum', description: '`all` joins conditions with AND, `any` with OR.', default: 'all'},
  {name: 'order_by', type: 'array', description: '`{ "column", "direction": "asc" | "desc" }`. The primary key is always appended as a tie-breaker.'},
  {name: 'limit', type: 'integer', description: 'Page size, 1 to 200.', default: '50'},
  {name: 'offset', type: 'integer', description: 'Rows to skip, 0 to 100000.', default: '0'},
  {name: 'all', type: 'boolean', description: 'Return every match without paging. Cannot be combined with `limit` or `offset`.', default: 'false'},
  ...(orgScoped
    ? [{name: 'org_id', type: 'uuid', description: 'Restrict to one organization. Applied outside `match`, so `any` cannot escape it.'}]
    : []),
];

export const filterErrors = [
  {status: 400, detail: 'filter_body_field_invalid', when: 'The body has an unknown top-level key (including `org_id` on resources that do not support it).'},
  {status: 400, detail: 'filter_column_invalid', when: 'A column name is not a column of this resource.'},
  {status: 400, detail: 'filter_operator_invalid', when: 'Unknown operator.'},
  {status: 400, detail: 'filter_operator_invalid_for_column', when: 'Ordering operators on non-ordered columns, text operators on non-text columns, or `json_contains` on non-JSON columns.'},
  {status: 400, detail: 'filter_value_invalid:<column>', when: 'The value does not match the column type (UUID, date, timestamp, integer, boolean, numeric, enum).'},
  {status: 400, detail: 'filter_list_invalid', when: '`in`/`not_in` value is not an array of 1 to 1000 items.'},
  {status: 400, detail: 'filter_value_required', when: 'A non-null operator has no `value`.'},
  {status: 400, detail: 'filter_null_operator_has_value', when: '`is_null`/`is_not_null` was given a `value`.'},
  {status: 400, detail: 'filter_all_with_pagination', when: '`all: true` was combined with `limit` or `offset`.'},
  {status: 400, detail: 'filter_order_duplicate', when: 'The same column appears twice in `order_by`.'},
  {status: 400, detail: 'filter_parameter_limit_exceeded', when: 'The query would bind more than 10000 parameters.'},
];

export const filters = Object.fromEntries(
  filterResources.map((resource) => {
    const body: {[key: string]: JsonValue} = {...resource.example, match: 'all', limit: 20};
    const spec: EndpointSpec = {
      id: `filter-${resource.slug}`,
      api,
      group: 'Filters',
      method: 'POST',
      path: `${resource.path}/filter`,
      title: `Filter ${resource.label}`,
      permission: resource.permission,
      bodyFields: filterBodyFields(resource.orgScoped),
      body: resource.orgScoped ? {...body, org_id: IDS.org} : body,
      responses: [
        {status: 200, body: page(resource.row ? [resource.row] : [])},
        ...(resource.slug === 'organizations'
          ? [{status: 200, description: 'With `"all": true` the response has `limit: null` and `has_more: false`.', body: {items: [organization], limit: null, offset: 0, has_more: false}}]
          : []),
      ],
      errors: [...filterErrors, ...bearerErrors(resource.permission)],
      notes: [`Filterable columns: ${resource.columns.map((column) => `\`${column}\``).join(', ')}.`],
    };
    return [resource.slug, spec];
  }),
) as Record<string, EndpointSpec>;
