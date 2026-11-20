import {idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, ErrorCase, JsonValue, Param} from '@site/src/api/types';

import {
  ACTOR,
  areaRow,
  exitAreaRow,
  IDS,
  nestedVolume4dWrite,
  permanentVolume4dWrite,
  property,
  propertyName,
  rule,
  status,
  TS,
  TS2,
  volume3d,
  volume3dWrite,
  volume4d,
  volume4dRow,
  volume4dWrite,
} from './samples';

const api = 'constraint-management' as const;

const READ = 'constraints.review';
const WRITE = 'constraints.review.decide';

function authErrors(write: boolean): ErrorCase[] {
  return [
    {status: 401, detail: 'invalid_token', when: 'A bearer token was sent but failed verification.'},
    {status: 400, detail: 'actor_id_required', when: '`x-actor-roles` or `x-actor-permissions` was sent without `x-actor-id`.'},
    {status: 400, detail: 'actor_role_unknown', when: '`x-actor-roles` contains a role other than `admin` or `auditor`.'},
    {status: 403, detail: 'permission_denied', when: write ? 'The caller is not an admin and lacks `constraints.review.decide`. Auditors can never write.' : 'The caller lacks `constraints.review`.'},
  ];
}

const id = (description: string, example: string): Param => idParam('ID', description, example);

/* ------------------------------------------------------------------ */
/* Filter endpoints                                                    */
/* ------------------------------------------------------------------ */

const filterQueryDoc: Param[] = [
  {name: '<column>', type: 'string', description: 'Equality on any table column, for example `status_code=ACTIVE`.'},
  {name: '<column>__<op>', type: 'string', description: 'Operator form. `op` is `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `not_in`, or `is_null`. `in`/`not_in` take a JSON array; `is_null` takes `true` or `false`.'},
  {name: 'all', type: 'boolean', description: 'Return every match. Cannot be combined with `limit` or `offset`.', default: 'false'},
  ...paging(),
];

const filterErrors: ErrorCase[] = [
  {status: 400, detail: 'filter_column_unknown', when: 'A parameter is not a column of this table.'},
  {status: 400, detail: 'filter_operator_invalid', when: 'Unknown `__op` suffix.'},
  {status: 400, detail: 'filter_operator_not_supported', when: 'The operator does not apply to the column type (for example `like` on a UUID, or ordering on JSON).'},
  {status: 400, detail: '<column>_filter_value_invalid', when: 'The value does not fit the column type, or an `in` list is not a non-empty JSON array.'},
  {status: 400, detail: 'filter_query_invalid', when: 'A parameter was repeated.'},
  {status: 400, detail: 'all_pagination_conflict', when: '`all=true` was combined with `limit` or `offset`.'},
];

function filterEndpoint(opts: {
  slug: string; path: string; label: string; group: string; columns: string[];
  query: [string, string][]; row: JsonValue;
}): EndpointSpec {
  return {
    id: `filter-${opts.slug}`, api, group: opts.group, method: 'GET', path: `${opts.path}/filter`,
    title: `Filter ${opts.label}`, permission: READ,
    description: 'Query-string filters on table columns, combined with AND. Rows are enriched exactly like the list endpoint.',
    queryParams: [
      ...opts.query.map(([name, value]) => ({name, type: 'string', description: 'Example filter.', example: value})),
      ...filterQueryDoc,
    ],
    responses: [{status: 200, body: page([opts.row])}],
    errors: [...filterErrors, ...PAGING_ERRORS, ...authErrors(false)],
    notes: [`Filterable columns: ${opts.columns.map((column) => `\`${column}\``).join(', ')}.`],
  };
}

const baseColumns = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];

/* ------------------------------------------------------------------ */
/* Airspace constraints                                                */
/* ------------------------------------------------------------------ */

interface ConstraintKind {
  key: 'areas' | 'monitoringZones' | 'noFlyZones' | 'identificationZones' | 'flightCorridors';
  path: string;
  entity: string;
  singular: string;
  plural: string;
  rowId: string;
  extraFields: Param[];
  extraWrite: {[key: string]: JsonValue};
  extraRow: {[key: string]: JsonValue};
  extraColumns: string[];
  accessibility: 'ALLOW' | 'DENY';
  name: string;
  deleteNote: string;
}

const constraintBaseFields: Param[] = [
  {name: 'name', type: 'string', required: true, description: 'Display name.'},
  {name: 'org_id', type: 'string', required: true, description: 'Owning organization id from the CAA Registry. Stored as text and not checked against the registry.'},
];
const volumeRefFields = (required: boolean): Param[] => [
  {name: 'volume_4d_id', type: 'uuid', description: `Link an existing, unlinked 4D volume. Send this or \`volume_4d\`${required ? ', not both' : ''}.`},
  {name: 'volume_4d', type: 'object', description: `Create a new 4D volume inline. See [4D volume fields](./volumes#create-volume-4d); \`volume_3d_id\` may be replaced by an inline \`volume_3d\`.${required ? '' : ' On update, the previous 4D volume is deleted.'}`},
  {name: 'volume_4d.permanent', type: 'boolean', description: 'Permanent volumes take no `valid_from`/`valid_to` and must be `ACTIVE`. Otherwise both dates are required.', default: 'false'},
  {name: 'volume_4d.default_accessibility', type: 'enum', description: '`ALLOW` or `DENY`. Defaults to `DENY` for no-fly zones and `ALLOW` for every other type.'},
];

const kinds: ConstraintKind[] = [
  {key: 'areas', path: '/areas', entity: 'areas', singular: 'area', plural: 'areas', rowId: IDS.area,
    extraFields: [{name: 'description', type: 'string | null', description: 'Free text.'}], extraWrite: {description: 'Gate area for the coastal corridor'},
    extraRow: {description: 'Gate area for the coastal corridor'}, extraColumns: ['description'], accessibility: 'ALLOW', name: 'Marina launch pad',
    deleteNote: 'Also deletes every flight corridor that uses this area as its gate or exit, with their volumes.'},
  {key: 'monitoringZones', path: '/monitoring-zones', entity: 'monitoring_zones', singular: 'monitoring zone', plural: 'monitoring zones', rowId: IDS.monitoringZone,
    extraFields: [], extraWrite: {}, extraRow: {}, extraColumns: [], accessibility: 'ALLOW', name: 'Creek surveillance zone', deleteNote: ''},
  {key: 'noFlyZones', path: '/no-fly-zones', entity: 'no_fly_zones', singular: 'no-fly zone', plural: 'no-fly zones', rowId: IDS.noFlyZone,
    extraFields: [], extraWrite: {}, extraRow: {}, extraColumns: [], accessibility: 'DENY', name: 'Downtown no-fly zone', deleteNote: ''},
  {key: 'identificationZones', path: '/identification-zones', entity: 'identification_zones', singular: 'identification zone', plural: 'identification zones', rowId: IDS.identificationZone,
    extraFields: [], extraWrite: {}, extraRow: {}, extraColumns: [], accessibility: 'ALLOW', name: 'Remote ID required zone', deleteNote: ''},
  {key: 'flightCorridors', path: '/flight-corridors', entity: 'flight_corridors', singular: 'flight corridor', plural: 'flight corridors', rowId: IDS.corridor,
    extraFields: [
      {name: 'gate_area_id', type: 'uuid', required: true, description: 'Area where the corridor starts.'},
      {name: 'exit_area_id', type: 'uuid', required: true, description: 'Area where the corridor ends.'},
      {name: 'bidirectional', type: 'boolean', description: 'Whether traffic may flow both ways.', default: 'false'},
      {name: 'space_buffer_m', type: 'number | string', description: 'Lateral buffer in meters.', default: '0'},
    ],
    extraWrite: {gate_area_id: IDS.area, exit_area_id: IDS.exitArea, bidirectional: true, space_buffer_m: 15},
    extraRow: {bidirectional: true, gate_area_id: IDS.area, exit_area_id: IDS.exitArea, space_buffer_m: '15.00', gate_area: areaRow, exit_area: exitAreaRow},
    extraColumns: ['bidirectional', 'gate_area_id', 'exit_area_id', 'space_buffer_m'], accessibility: 'ALLOW', name: 'Coastal corridor',
    deleteNote: ''},
];

function constraintEndpoints(kind: ConstraintKind) {
  const group = 'Airspace constraints';
  const volumes = [{...volume4d, default_accessibility: kind.accessibility}];
  const row = {id: kind.rowId, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR, name: kind.name, org_id: IDS.org, ...kind.extraRow, volumes_4d: volumes};
  const write = {name: kind.name, org_id: IDS.org, ...kind.extraWrite, volume_4d: nestedVolume4dWrite};
  const idSpec = id(`${kind.singular[0].toUpperCase()}${kind.singular.slice(1)} id.`, kind.rowId);
  const bodyFields = (required: boolean) => [
    ...constraintBaseFields,
    ...kind.extraFields,
    ...volumeRefFields(required),
  ];
  const writeErrors: ErrorCase[] = [
    {status: 400, detail: 'volume_4d_required', when: 'Neither `volume_4d_id` nor `volume_4d` was sent (create only).'},
    {status: 400, detail: 'volume_4d_reference_conflict', when: 'Both `volume_4d_id` and `volume_4d` were sent.'},
    {status: 400, detail: 'name_invalid', when: 'A field failed validation. Fields use `<path>_invalid`, for example `volume_4d_volume_3d_altitude_upper_m_invalid`.'},
    {status: 400, detail: 'permanent_volume_dates_forbidden', when: 'A permanent volume has `valid_from` or `valid_to`.'},
    {status: 400, detail: 'valid_from_required', when: 'A non-permanent volume has no `valid_from` (same for `valid_to_required`).'},
    {status: 400, detail: 'volume_4d_time_range_invalid', when: '`valid_to` is not after `valid_from`.'},
    {status: 409, detail: `${kind.entity}_already_exists`, when: 'The 4D volume is already linked to another constraint.'},
    {status: 409, detail: `${kind.entity}_has_invalid_reference`, when: 'A referenced volume, rule, status, or area does not exist.'},
  ];
  return {
    list: {
      id: `list-${kind.entity}`, api, group, method: 'GET', path: kind.path,
      title: `List ${kind.plural}`, permission: READ,
      description: 'Newest first. Each row includes `volumes_4d`, fully expanded with its 3D volume, status, rule, and properties.',
      queryParams: paging(),
      responses: [{status: 200, body: page([row])}],
      errors: [...PAGING_ERRORS, ...authErrors(false)],
    },
    filter: filterEndpoint({
      slug: kind.entity, path: kind.path, label: kind.plural, group,
      columns: [...baseColumns, 'name', 'org_id', ...kind.extraColumns],
      query: [['org_id', IDS.org], ['name__ilike', '%downtown%']], row,
    }),
    get: {
      id: `get-${kind.entity}`, api, group, method: 'GET', path: `${kind.path}/:ID`,
      title: `Get ${/^[aeiou]/.test(kind.singular) ? 'an' : 'a'} ${kind.singular}`, permission: READ, pathParams: [idSpec],
      responses: [{status: 200, body: row}],
      errors: [{status: 404, detail: `${kind.entity}_not_found`, when: 'No record has this id.'}, ...authErrors(false)],
    },
    create: {
      id: `create-${kind.entity}`, api, group, method: 'POST', path: kind.path,
      title: `Create ${/^[aeiou]/.test(kind.singular) ? 'an' : 'a'} ${kind.singular}`, permission: WRITE,
      description: 'Creates the constraint and links exactly one 4D volume, in one transaction. Inline volumes are created first.',
      bodyFields: bodyFields(true), body: write,
      responses: [{status: 201, body: row}],
      errors: [...writeErrors, ...authErrors(true)],
      notes: ['Clears the cached `/constraints` snapshot.'],
    },
    replace: {
      id: `replace-${kind.entity}`, api, group, method: 'PUT', path: `${kind.path}/:ID`,
      title: `Replace ${/^[aeiou]/.test(kind.singular) ? 'an' : 'a'} ${kind.singular}`, permission: WRITE,
      description: 'Replaces the constraint fields. The volume reference is optional: omit it to keep the current volume, or send one to replace the link.',
      pathParams: [idSpec],
      bodyFields: bodyFields(false), body: {name: kind.name, org_id: IDS.org, ...kind.extraWrite, volume_4d_id: IDS.volume4d},
      responses: [{status: 200, body: {...row, updated_at: TS2}}],
      errors: [{status: 404, detail: `${kind.entity}_not_found`, when: 'No record has this id.'}, ...writeErrors.filter((error) => error.detail !== 'volume_4d_required'), ...authErrors(true)],
    },
    remove: {
      id: `delete-${kind.entity}`, api, group, method: 'DELETE', path: `${kind.path}/:ID`,
      title: `Delete ${/^[aeiou]/.test(kind.singular) ? 'an' : 'a'} ${kind.singular}`, permission: WRITE,
      description: `Deletes the constraint together with the volumes it owns: its 4D volumes, their 3D volumes, and their properties. ${kind.deleteNote}`.trim(),
      pathParams: [idSpec],
      responses: [{status: 200, description: 'The deleted constraint, without `volumes_4d`.', body: {id: kind.rowId, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR, name: kind.name, org_id: IDS.org, ...Object.fromEntries(Object.entries(kind.extraRow).filter(([key]) => !key.endsWith('_area')))}}],
      errors: [{status: 404, detail: `${kind.entity}_not_found`, when: 'No record has this id.'}, ...authErrors(true)],
    },
  } satisfies Record<string, EndpointSpec>;
}

export const areas = constraintEndpoints(kinds[0]);
export const monitoringZones = constraintEndpoints(kinds[1]);
export const noFlyZones = constraintEndpoints(kinds[2]);
export const identificationZones = constraintEndpoints(kinds[3]);
export const flightCorridors = constraintEndpoints(kinds[4]);

/* ------------------------------------------------------------------ */
/* Generic resources                                                   */
/* ------------------------------------------------------------------ */

function resource(opts: {
  slug: string; path: string; entity: string; group: string; singular: string; plural: string;
  row: JsonValue; write?: {[key: string]: JsonValue}; fields?: Param[]; idExample: string;
  columns: string[]; filterQuery: [string, string][]; readOnly?: boolean; idLabel?: string;
  createErrors?: ErrorCase[]; deleteNote?: string; listNote?: string; listRow?: JsonValue;
}) {
  const idSpec = id(opts.idLabel ?? `${opts.singular[0].toUpperCase()}${opts.singular.slice(1)} id.`, opts.idExample);
  const article = /^[aeiou]/i.test(opts.singular) ? 'an' : 'a';
  const result: Record<string, EndpointSpec> = {
    list: {
      id: `list-${opts.slug}`, api, group: opts.group, method: 'GET', path: opts.path,
      title: `List ${opts.plural}`, permission: READ, description: opts.listNote,
      queryParams: paging(),
      responses: [{status: 200, body: page([opts.listRow ?? opts.row])}],
      errors: [...PAGING_ERRORS, ...authErrors(false)],
    },
    filter: filterEndpoint({slug: opts.slug, path: opts.path, label: opts.plural, group: opts.group, columns: opts.columns, query: opts.filterQuery, row: opts.listRow ?? opts.row}),
    get: {
      id: `get-${opts.slug}`, api, group: opts.group, method: 'GET', path: `${opts.path}/:ID`,
      title: `Get ${article} ${opts.singular}`, permission: READ, pathParams: [idSpec],
      responses: [{status: 200, body: opts.row}],
      errors: [{status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'}, ...authErrors(false)],
    },
  };
  if (opts.readOnly) {
    return result;
  }
  const writeErrors: ErrorCase[] = [
    ...(opts.createErrors ?? []),
    {status: 409, detail: `${opts.entity}_already_exists`, when: 'A unique constraint would be violated.'},
    {status: 409, detail: `${opts.entity}_has_invalid_reference`, when: 'A referenced record does not exist.'},
  ];
  result.create = {
    id: `create-${opts.slug}`, api, group: opts.group, method: 'POST', path: opts.path,
    title: `Create ${article} ${opts.singular}`, permission: WRITE,
    bodyFields: opts.fields, body: opts.write,
    responses: [{status: 201, body: opts.row}],
    errors: [...writeErrors, ...authErrors(true)],
  };
  result.replace = {
    id: `replace-${opts.slug}`, api, group: opts.group, method: 'PUT', path: `${opts.path}/:ID`,
    title: `Replace ${article} ${opts.singular}`, permission: WRITE,
    description: 'Full replacement, validated like a create.',
    pathParams: [idSpec], bodyFields: opts.fields, body: opts.write,
    responses: [{status: 200, body: opts.row}],
    errors: [{status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'}, ...writeErrors, ...authErrors(true)],
  };
  result.remove = {
    id: `delete-${opts.slug}`, api, group: opts.group, method: 'DELETE', path: `${opts.path}/:ID`,
    title: `Delete ${article} ${opts.singular}`, permission: WRITE, description: opts.deleteNote,
    pathParams: [idSpec],
    responses: [{status: 200, description: 'The deleted record.', body: opts.listRow ?? opts.row}],
    errors: [
      {status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'},
      {status: 409, detail: `${opts.entity}_has_linked_records`, when: 'Other records still reference it.'},
      ...authErrors(true),
    ],
  };
  return result;
}

const volume3dFields: Param[] = [
  {name: 'name', type: 'string', required: true, description: 'Display name.'},
  {name: 'footprint', type: 'GeoJSON', required: true, description: '`Polygon` or `MultiPolygon` in WGS 84 (`[longitude, latitude]`). Stored as a MultiPolygon, so reads always return `MultiPolygon`. Must be a valid geometry.'},
  {name: 'altitude_lower_m', type: 'number | string', required: true, description: 'Lower altitude in meters.'},
  {name: 'altitude_upper_m', type: 'number | string', required: true, description: 'Upper altitude in meters. Must be greater than the lower bound.'},
  {name: 'altitude_reference_code', type: 'string', required: true, description: 'Altitude datum, for example `AGL`, `AMSL`, or `WGS84`.'},
  {name: 'altitude_check', type: 'boolean', description: 'Whether altitude limits are enforced.', default: 'true'},
];

export const volumes3d = resource({
  slug: 'volume-3d', path: '/volumes-3d', entity: 'volueme_3d', group: 'Volumes', singular: '3D volume', plural: '3D volumes',
  row: volume3d, write: volume3dWrite, fields: volume3dFields, idExample: IDS.volume3d,
  columns: [...baseColumns, 'name', 'footprint', 'altitude_lower_m', 'altitude_upper_m', 'altitude_check', 'altitude_reference_code'],
  filterQuery: [['altitude_upper_m__gte', '100'], ['altitude_reference_code', 'AGL']],
  createErrors: [
    {status: 400, detail: 'footprint_invalid', when: 'Not a GeoJSON Polygon or MultiPolygon.'},
    {status: 400, detail: 'altitude_upper_m_invalid', when: 'Not a number, or not above `altitude_lower_m`.'},
  ],
  deleteNote: '**Cascades widely:** deletes every 4D volume built on this footprint, their properties and links, and every constraint linked to those volumes, including flight corridors that use an affected area.',
});

const volume4dFields: Param[] = [
  {name: 'name', type: 'string', required: true, description: 'Display name.'},
  {name: 'volume_3d_id', type: 'uuid', required: true, description: 'Footprint to use. Each 3D volume can back only one 4D volume.'},
  {name: 'permanent', type: 'boolean', description: 'Permanent volumes have no time window and must be `ACTIVE`.', default: 'false'},
  {name: 'valid_from', type: 'datetime', description: 'Required unless `permanent`.'},
  {name: 'valid_to', type: 'datetime', description: 'Required unless `permanent`. Must be after `valid_from`.'},
  {name: 'status_code', type: 'string', description: 'A code from [4D volume statuses](#list-volume-4d-status).', default: 'ACTIVE'},
  {name: 'default_accessibility', type: 'enum', description: '`ALLOW` or `DENY`.', default: 'ALLOW'},
  {name: 'rule_id', type: 'uuid | null', description: 'Rule applied inside the volume.'},
];

export const volumes4d = resource({
  slug: 'volume-4d', path: '/volumes-4d', entity: 'volume_4d', group: 'Volumes', singular: '4D volume', plural: '4D volumes',
  row: volume4d, write: volume4dWrite, fields: volume4dFields, idExample: IDS.volume4d,
  columns: [...baseColumns, 'name', 'rule_id', 'default_accessibility', 'volume_3d_id', 'permanent', 'valid_from', 'valid_to', 'status_code'],
  filterQuery: [['status_code', 'ACTIVE'], ['valid_to__gte', '2026-06-10T00:00:00Z']],
  listNote: 'Each row is expanded with `volume_3d`, `status`, `rule`, and `properties`.',
  createErrors: [
    {status: 400, detail: 'permanent_volume_dates_forbidden', when: 'A permanent volume has dates.'},
    {status: 400, detail: 'permanent_volume_status_must_be_active', when: 'A permanent volume is not `ACTIVE`.'},
    {status: 400, detail: 'valid_from_required', when: 'A non-permanent volume has no `valid_from` (same for `valid_to_required`).'},
    {status: 400, detail: 'volume_4d_time_range_invalid', when: '`valid_to` is not after `valid_from`.'},
  ],
  deleteNote: '**Cascades:** also deletes the volume\'s properties, every constraint linked to it (and corridors that use an affected area), the links, and the 3D volume it was built on.',
});

export const volume4dStatuses = resource({
  slug: 'volume-4d-status', path: '/volume-4d-statuses', entity: 'volume_4d_status', group: 'Volumes', singular: 'volume status', plural: '4D volume statuses',
  row: status, idExample: 'ACTIVE', idLabel: 'Status code, for example `ACTIVE`.', readOnly: true,
  columns: ['code', 'name', 'description', 'created_at', 'updated_at'], filterQuery: [['code__in', '["ACTIVE","SCHEDULED"]']],
});

export const volumeLinks = resource({
  slug: 'constraint-volume-link', path: '/airspace-constraint-volume-links', entity: 'airspace_constraints_volumes_join', group: 'Volumes',
  singular: 'constraint volume link', plural: 'constraint volume links', idExample: IDS.link,
  row: {id: IDS.link, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR, airspace_constraint_id: IDS.noFlyZone, volume_4d_id: IDS.volume4d,
    airspace_constraint: {constraint_type: 'no_fly_zone', id: IDS.noFlyZone, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR, name: 'Downtown no-fly zone', org_id: IDS.org},
    volume_4d: volume4d},
  write: {airspace_constraint_id: IDS.noFlyZone, volume_4d_id: IDS.volume4d},
  fields: [
    {name: 'airspace_constraint_id', type: 'uuid', required: true, description: 'Id of an area, zone, or corridor. Each constraint can have one link.'},
    {name: 'volume_4d_id', type: 'uuid', required: true, description: 'A 4D volume. Each volume can be linked once.'},
  ],
  columns: [...baseColumns, 'airspace_constraint_id', 'volume_4d_id'], filterQuery: [['volume_4d_id', IDS.volume4d]],
  listNote: 'Links are normally managed through the constraint endpoints. Each row shows the constraint (with `constraint_type`) and the expanded 4D volume.',
});

export const rules = resource({
  slug: 'rule', path: '/rules', entity: 'rules', group: 'Rules', singular: 'rule', plural: 'rules',
  row: rule, idExample: IDS.rule,
  write: {name: 'Emergency services only', type: 'PRIMARY', action: 'DENY', command: 'operator.type != "EMERGENCY"'},
  fields: [
    {name: 'name', type: 'string', required: true, description: 'Display name.'},
    {name: 'type', type: 'enum', required: true, description: '`PRIMARY` or `SECONDARY`.'},
    {name: 'action', type: 'enum', description: '`ALLOW` or `DENY`.', default: 'ALLOW'},
    {name: 'command', type: 'string', required: true, description: 'Rule expression evaluated by consumers. Stored as-is.'},
  ],
  columns: [...baseColumns, 'name', 'type', 'action', 'command'], filterQuery: [['type', 'PRIMARY'], ['action', 'DENY']],
  createErrors: [{status: 400, detail: 'command_required', when: '`command` is blank.'}, {status: 400, detail: 'type_invalid', when: '`type` is not `PRIMARY` or `SECONDARY`.'}],
  deleteNote: '4D volumes that used the rule keep their row with `rule_id` set to `null`.',
});

rules.bulk = {
  id: 'bulk-rules', api, group: 'Rules', method: 'POST', path: '/rules/bulk',
  title: 'Save rules in bulk', permission: WRITE,
  description: 'Creates, updates, and deletes rules in one transaction, for editors that save a whole rule list at once. Rules with an `id` are updated (unchanged ones are skipped), rules without one are created, and `deleted_ids` are removed.',
  bodyFields: [
    {name: 'rules', type: 'array', description: 'Rules to keep: `{ id?, name, type, action?, command }`.'},
    {name: 'deleted_ids', type: 'uuid[]', description: 'Rules to delete.'},
  ],
  body: {
    rules: [
      {id: IDS.rule, name: 'Emergency services only', type: 'PRIMARY', action: 'DENY', command: 'operator.type != "EMERGENCY"'},
      {name: 'Night curfew', type: 'SECONDARY', action: 'DENY', command: 'time.hour >= 23 || time.hour < 5'},
    ],
    deleted_ids: ['f1111111-9c0d-4e1f-8a2b-3c4d5e6f7a10'],
  },
  responses: [{status: 200, body: {
    counts: {created: 1, updated: 0, unchanged: 1, deleted: 1},
    created: [{...rule, id: 'f2222222-9c0d-4e1f-8a2b-3c4d5e6f7a11', name: 'Night curfew', type: 'SECONDARY', command: 'time.hour >= 23 || time.hour < 5'}],
    updated: [], unchanged: [rule],
    deleted: [{...rule, id: 'f1111111-9c0d-4e1f-8a2b-3c4d5e6f7a10', name: 'Old weekend rule', type: 'SECONDARY', action: 'ALLOW'}],
  }}],
  errors: [
    {status: 400, detail: 'rules_bulk_duplicate_id', when: 'The same id appears twice in `rules`.'},
    {status: 400, detail: 'rules_bulk_duplicate_deleted_id', when: 'The same id appears twice in `deleted_ids`.'},
    {status: 400, detail: 'rules_bulk_id_conflict', when: 'An id is both kept and deleted.'},
    {status: 404, detail: 'rules_bulk_ids_not_found', when: 'A kept or deleted id does not exist. Nothing is saved.'},
    ...authErrors(true),
  ],
};

export const propertyNames = resource({
  slug: 'volume-4d-property-name', path: '/volume-4d-property-names', entity: 'volume_4d_properties_names', group: 'Volume properties',
  singular: 'property definition', plural: 'property definitions', row: propertyName, idExample: IDS.propertyName,
  write: {name: 'max_noise_db', description: 'Maximum permitted noise level', data_type: 'integer', is_required: false, is_unique: true, domain_values: {type: 'range', min: 40, max: 90}},
  fields: [
    {name: 'name', type: 'string', required: true, description: 'Unique property name.'},
    {name: 'description', type: 'string | null', description: 'Free text.'},
    {name: 'data_type', type: 'enum', description: '`string`, `integer`, `number`, `boolean`, `date`, `datetime`, or `json`.', default: 'string'},
    {name: 'is_required', type: 'boolean', description: 'Values cannot be empty.', default: 'false'},
    {name: 'is_unique', type: 'boolean', description: 'At most one value per 4D volume.', default: 'false'},
    {name: 'domain_values', type: 'object | null', description: '`{"type":"set","values":[...]}` or `{"type":"range","min":...,"max":...}`. Ranges apply to `integer`, `number`, `date`, and `datetime`. Note the key is `type` here, not `kind` as in the CAA Registry.'},
  ],
  columns: [...baseColumns, 'name', 'description', 'data_type', 'is_required', 'is_unique', 'domain_values'], filterQuery: [['data_type', 'integer']],
  createErrors: [
    {status: 400, detail: 'data_type_invalid', when: 'Unsupported `data_type`.'},
    {status: 400, detail: 'domain_values_invalid', when: 'The domain is malformed.'},
    {status: 400, detail: 'domain_values_type_invalid', when: 'Domain values do not match `data_type`.'},
    {status: 400, detail: 'domain_values_range_unsupported', when: 'A range was given for a type that has no order.'},
    {status: 400, detail: 'domain_values_range_invalid', when: 'The range has no bounds, or `min` is above `max`.'},
  ],
  deleteNote: 'Deletes every value assigned under this definition.',
});

export const properties = resource({
  slug: 'volume-4d-property', path: '/volume-4d-properties', entity: 'volume_4d_properties', group: 'Volume properties',
  singular: 'property value', plural: 'property values', row: property, idExample: IDS.property,
  write: {volume_4d_id: IDS.volume4d, volume_4d_properties_name_id: IDS.propertyName, value: '65'},
  fields: [
    {name: 'volume_4d_id', type: 'uuid', required: true, description: 'The 4D volume that owns the value.'},
    {name: 'volume_4d_properties_name_id', type: 'uuid', required: true, description: 'The property definition.'},
    {name: 'value', type: 'string | null', description: 'Always a string, parsed by the definition\'s `data_type`.'},
  ],
  columns: [...baseColumns, 'volume_4d_id', 'volume_4d_properties_name_id', 'value'], filterQuery: [['volume_4d_id', IDS.volume4d]],
  listNote: 'Each row includes its `property_name` definition.',
  createErrors: [
    {status: 400, detail: 'property_name_not_found', when: 'The definition does not exist.'},
    {status: 400, detail: 'volume_4d_not_found', when: 'The 4D volume does not exist.'},
    {status: 400, detail: 'property_value_required', when: 'The definition is required and the value is empty.'},
    {status: 400, detail: 'property_value_type_invalid', when: 'The value cannot be parsed as the definition type.'},
    {status: 400, detail: 'property_value_out_of_domain', when: 'The value is outside the allowed set or range.'},
    {status: 400, detail: 'property_definition_duplicate_for_parent', when: 'The definition is unique and the volume already has a value.'},
    {status: 400, detail: 'property_reference_changed_retry', when: 'A concurrent write moved the value. Re-read and retry.'},
  ],
});

/* ------------------------------------------------------------------ */
/* Snapshot, audit, health                                             */
/* ------------------------------------------------------------------ */

const snapshot = {
  generated_at: TS2,
  rules: [rule],
  constraints: {
    flight_corridors: [],
    areas: [],
    identification_zones: [],
    no_fly_zones: [{id: IDS.noFlyZone, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR, name: 'Downtown no-fly zone', org_id: IDS.org, volumes_4d: [volume4d]}],
    monitoring_zones: [],
  },
};

export const cache = {
  get: {
    id: 'get-constraints', api, group: 'Snapshot', method: 'GET', path: '/constraints',
    title: 'Get the constraint snapshot', permission: READ,
    description: 'Every rule and every constraint of every type, fully expanded, in one document. Served from Redis when cached; otherwise built from the database and, when Redis is enabled, saved.',
    responses: [
      {status: 200, description: '`source` is `redis`, `database_saved_to_redis`, or `database` (Redis disabled or unavailable).', body: {source: 'redis', cache_key: 'constraint-management:constraints:v5', data: snapshot}},
    ],
    errors: authErrors(false),
  },
  refresh: {
    id: 'refresh-constraints', api, group: 'Snapshot', method: 'POST', path: '/constraints/refresh',
    title: 'Rebuild the constraint snapshot', permission: WRITE,
    description: 'Rebuilds the snapshot from the database and stores it in Redis. Every write already clears the cache, so this is only needed after direct database changes.',
    responses: [{status: 200, body: {source: 'database_saved_to_redis', cache_key: 'constraint-management:constraints:v5', data: snapshot}}],
    errors: authErrors(true),
  },
} satisfies Record<string, EndpointSpec>;

const auditRow = {
  audit_id: IDS.audit, entity_type: 'no_fly_zones', entity_id: IDS.noFlyZone, action: 'create', actor: ACTOR,
  correlation_id: null, created_at: TS, before_json: null,
  after_json: {id: IDS.noFlyZone, name: 'Downtown no-fly zone', org_id: IDS.org, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR},
};

export const auditLogs = resource({
  slug: 'audit-log', path: '/audit-logs', entity: 'audit_log', group: 'Audit', singular: 'audit event', plural: 'audit events',
  row: auditRow, idExample: IDS.audit, readOnly: true, listNote: 'Newest first.',
  columns: ['audit_id', 'entity_type', 'entity_id', 'action', 'actor', 'correlation_id', 'created_at', 'before_json', 'after_json'],
  filterQuery: [['entity_type', 'no_fly_zones'], ['created_at__gte', '2026-06-01']],
});

export const health = {
  get: {
    id: 'get-health', api, group: 'Health', method: 'GET', path: '/health',
    title: 'Check service health', auth: 'public',
    responses: [{status: 200, body: {status: 'ok'}}],
  },
} satisfies Record<string, EndpointSpec>;

const groups: Record<string, EndpointSpec>[] = [
  health, areas, monitoringZones, noFlyZones, identificationZones, flightCorridors,
  volumes3d, volumes4d, volume4dStatuses, volumeLinks, propertyNames, properties, rules, cache, auditLogs,
];

export const allEndpoints: EndpointSpec[] = groups.flatMap((group) => Object.values(group));

const base = '/api/constraint-management/endpoints';
export const pages: Record<string, string> = {
  Health: '/api/constraint-management/overview',
  'Airspace constraints': `${base}/airspace-constraints`,
  Volumes: `${base}/volumes`,
  'Volume properties': `${base}/volume-properties`,
  Rules: `${base}/rules`,
  Snapshot: `${base}/snapshot-and-audit`,
  Audit: `${base}/snapshot-and-audit`,
};

export {volume4dRow, permanentVolume4dWrite};
