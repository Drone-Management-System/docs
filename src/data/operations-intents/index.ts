import {idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, ErrorCase, JsonValue, Param} from '@site/src/api/types';

const api = 'operations-intents' as const;

export const IDS = {
  intent: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  conops: '10000000-0000-4000-8000-000000000002',
  risk: '10000000-0000-4000-8000-000000000003',
  hazard: '10000000-0000-4000-8000-000000000005',
  mitigation: '10000000-0000-4000-8000-000000000006',
  volume4d: '10000000-0000-4000-8000-000000000004',
  volume3d: '10000000-0000-4000-8000-000000000007',
  audit: '10000000-0000-4000-8000-000000000008',
  correlation: '7f9c2ba4-e88f-4b2a-9d7b-1a2b3c4d5e6f',
};

const ACTOR = '312244512312345678';
const TS = '2026-06-05T08:00:00.000Z';
const TS2 = '2026-06-05T09:30:00.000Z';
const meta = (id: string) => ({id, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR});

const footprint = {type: 'Polygon', coordinates: [[[55.14, 25.08], [55.15, 25.08], [55.15, 25.09], [55.14, 25.09], [55.14, 25.08]]]};

const volume3dWrite = {name: 'Inspection footprint', footprint, altitude_lower_m: '10', altitude_upper_m: '100', altitude_check: true, altitude_reference_code: 'AGL'};
const volume3d = {...meta(IDS.volume3d), ...volume3dWrite, footprint: {type: 'MultiPolygon', coordinates: [footprint.coordinates]}, altitude_lower_m: '10.00', altitude_upper_m: '100.00'};
const volume4dWrite = {name: 'Inspection volume', volume_3d_id: IDS.volume3d, valid_from: '2026-06-10T01:00:00.000Z', valid_to: '2026-06-10T02:00:00.000Z', status_code: 'ACTIVE'};
const volume4dRow = {...meta(IDS.volume4d), ...volume4dWrite};
const volume4d = {...volume4dRow, volume_3d: volume3d};

const conopsWrite = {
  name: 'Urban inspection CONOPS', description: 'Facade inspection of a single building',
  operating_area_description: 'Downtown block, inside the 4D volume', operating_conditions_description: 'Day VMC, wind below 10 m/s',
  rpic_assumptions: 'Certified RPIC on site', crew_assumptions: 'One visual observer',
  c2_link_assumption: 'LTE primary, 2.4 GHz backup', lost_link_procedure: 'Return to launch at 60 m AGL',
  fly_away_procedure: 'Terminate flight inside the volume', emergency_procedure: 'Notify ATC and the operator duty manager',
  detect_and_avoid_notes: 'Observer scan plus ADS-B In', see_and_avoid_notes: 'Observer keeps visual contact',
  sense_and_avoid_notes: 'Onboard obstacle sensors',
};
const conops = {...meta(IDS.conops), ...conopsWrite};
const riskWrite = {name: 'Urban inspection risk', description: 'SORA-style assessment for the inspection', residual_risk_rating: 'LOW', approval_conditions: 'Stay inside the volume; observer required'};
const risk = {...meta(IDS.risk), ...riskWrite};
const hazardWrite = {risk_assessment_id: IDS.risk, name: 'People nearby', description: 'Pedestrians below the facade', severity: 'MAJOR', likelihood: 'REMOTE', initial_risk_rating: 'MEDIUM', residual_risk_rating: 'LOW'};
const hazard = {...meta(IDS.hazard), ...hazardWrite};
const mitigationWrite = {hazard_id: IDS.hazard, name: 'Cordon below the work area', description: 'Ground crew closes the sidewalk', verification_method: 'Pre-flight checklist photo', effectiveness_notes: 'Reduces exposure to near zero'};
const mitigation = {...meta(IDS.mitigation), ...mitigationWrite};

const intentRow = {
  ...meta(IDS.intent), conops_id: IDS.conops, risk_assessment_id: IDS.risk,
  latest_validation_status_code: 'VALID', latest_validation_checked_at: TS2, latest_validation_context: 'APPROVAL_REQUEST',
  latest_constraint_status_code: 'CONSTRAINT_CLEAR', latest_conflict_status_code: 'NO_CONFLICT',
  latest_priority_status_code: 'PRIORITY_RULES_UNAVAILABLE', latest_privilege_status_code: 'PRIVILEGE_RULES_UNAVAILABLE',
  approval_status_code: 'PENDING_HUMAN_APPROVAL', approval_decision_type: null, approval_decided_at: null,
  approval_reviewed_updated_at: TS, approval_reviewer_id: null, approval_reason: null, approval_correlation_id: IDS.correlation,
};
const newIntentRow = {
  ...meta(IDS.intent), conops_id: IDS.conops, risk_assessment_id: IDS.risk,
  latest_validation_status_code: null, latest_validation_checked_at: null, latest_validation_context: null,
  latest_constraint_status_code: null, latest_conflict_status_code: null, latest_priority_status_code: null, latest_privilege_status_code: null,
  approval_status_code: 'NOT_REQUESTED', approval_decision_type: null, approval_decided_at: null,
  approval_reviewed_updated_at: null, approval_reviewer_id: null, approval_reason: null, approval_correlation_id: null,
};
const intent = {...intentRow, conops, risk_assessment: risk};

/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */

const authErrors: ErrorCase[] = [
  {status: 401, detail: 'authentication_required', when: '`AUTH_ENABLED=true` and the request has neither a bearer token nor actor headers.'},
  {status: 401, detail: 'invalid_token', when: 'A bearer token was sent but failed verification.'},
  {status: 400, detail: 'actor_id_header_required', when: 'Actor role or permission headers were sent without `x-actor-id`.'},
];

const id = (description: string, example: string): Param => idParam('ID', description, example);

function resource(opts: {
  slug: string; path: string; entity: string; group: string; singular: string; plural: string;
  row: JsonValue; write: {[key: string]: JsonValue}; fields: Param[]; idExample: string;
  listNote?: string; deleteNote?: string; createErrors?: ErrorCase[]; listRow?: JsonValue;
}) {
  const idSpec = id(`${opts.singular[0].toUpperCase()}${opts.singular.slice(1)} id.`, opts.idExample);
  const article = /^[aeiou]/i.test(opts.singular) ? 'an' : 'a';
  const writeErrors: ErrorCase[] = [
    {status: 400, detail: `${opts.fields[0].name}_invalid`, when: 'A field failed validation. Every field uses `<field>_invalid`.'},
    ...(opts.createErrors ?? []),
    {status: 409, detail: `${opts.entity}_has_invalid_reference`, when: 'A referenced id does not exist.'},
  ];
  return {
    list: {
      id: `list-${opts.slug}`, api, group: opts.group, method: 'GET', path: opts.path,
      title: `List ${opts.plural}`, description: opts.listNote ?? 'Newest first.', queryParams: paging(),
      responses: [{status: 200, body: page([opts.listRow ?? opts.row])}],
      errors: [...PAGING_ERRORS, ...authErrors],
    },
    get: {
      id: `get-${opts.slug}`, api, group: opts.group, method: 'GET', path: `${opts.path}/:ID`,
      title: `Get ${article} ${opts.singular}`, pathParams: [idSpec],
      responses: [{status: 200, body: opts.listRow ?? opts.row}],
      errors: [{status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'}, ...authErrors],
    },
    create: {
      id: `create-${opts.slug}`, api, group: opts.group, method: 'POST', path: opts.path,
      title: `Create ${article} ${opts.singular}`, bodyFields: opts.fields, body: opts.write,
      responses: [{status: 201, body: opts.row}],
      errors: [...writeErrors, ...authErrors],
    },
    replace: {
      id: `replace-${opts.slug}`, api, group: opts.group, method: 'PUT', path: `${opts.path}/:ID`,
      title: `Replace ${article} ${opts.singular}`, description: 'Full replacement, validated like a create.',
      pathParams: [idSpec], bodyFields: opts.fields, body: opts.write,
      responses: [{status: 200, body: opts.row}],
      errors: [{status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'}, ...writeErrors, ...authErrors],
    },
    remove: {
      id: `delete-${opts.slug}`, api, group: opts.group, method: 'DELETE', path: `${opts.path}/:ID`,
      title: `Delete ${article} ${opts.singular}`, description: opts.deleteNote, pathParams: [idSpec],
      responses: [{status: 200, description: 'The deleted record.', body: opts.row}],
      errors: [
        {status: 404, detail: `${opts.entity}_not_found`, when: 'No record has this id.'},
        {status: 409, detail: `${opts.entity}_has_linked_records`, when: 'Other records still reference it. Delete or relink them first.'},
        ...authErrors,
      ],
    },
  } satisfies Record<string, EndpointSpec>;
}

const text = (name: string, description: string, required = true): Param => ({name, type: required ? 'string' : 'string | null', required, description});

/* ------------------------------------------------------------------ */
/* Supporting resources                                                */
/* ------------------------------------------------------------------ */

export const volumes3d = resource({
  slug: 'volume-3d', path: '/volumes-3d', entity: 'volume_3d', group: 'Volumes', singular: '3D volume', plural: '3D volumes',
  row: volume3d, write: volume3dWrite, idExample: IDS.volume3d,
  fields: [
    text('name', 'Display name.'),
    {name: 'footprint', type: 'GeoJSON', required: true, description: '`Polygon` or `MultiPolygon`, WGS 84 `[longitude, latitude]`. Stored and returned as `MultiPolygon`.'},
    {name: 'altitude_lower_m', type: 'number | string', required: true, description: 'Lower altitude in meters.'},
    {name: 'altitude_upper_m', type: 'number | string', required: true, description: 'Upper altitude, greater than the lower bound.'},
    text('altitude_reference_code', 'Altitude datum, for example `AGL` or `AMSL`.'),
    {name: 'altitude_check', type: 'boolean', description: 'Whether validation checks altitudes.', default: 'true'},
  ],
  createErrors: [{status: 400, detail: 'altitude_upper_m_invalid', when: 'The upper bound is not above the lower bound.'}],
});

export const volumes4d = resource({
  slug: 'volume-4d', path: '/volumes-4d', entity: 'volume_4d', group: 'Volumes', singular: '4D volume', plural: '4D volumes',
  row: volume4dRow, listRow: volume4d, write: volume4dWrite, idExample: IDS.volume4d,
  listNote: 'Newest first. Reads include the expanded `volume_3d`.',
  fields: [
    text('name', 'Display name.'),
    {name: 'volume_3d_id', type: 'uuid', required: true, description: 'The footprint.'},
    {name: 'valid_from', type: 'datetime', required: true, description: 'Start of the window.'},
    {name: 'valid_to', type: 'datetime', required: true, description: 'End of the window, after `valid_from`.'},
    {name: 'status_code', type: 'string', description: 'Free-form status. `ACTIVE` volumes count for the `active` filter and conflict checks.', default: 'ACTIVE'},
  ],
  createErrors: [{status: 400, detail: 'valid_to_invalid', when: '`valid_to` is not after `valid_from`.'}],
});

export const conopsResource = resource({
  slug: 'conops', path: '/conops', entity: 'conops', group: 'CONOPS and risk', singular: 'CONOPS', plural: 'CONOPS',
  row: conops, write: conopsWrite, idExample: IDS.conops,
  fields: [
    text('name', 'Display name.'), text('description', 'What the operation does.'),
    text('operating_area_description', 'Where it happens.'), text('operating_conditions_description', 'Weather, light, and airspace conditions.'),
    text('rpic_assumptions', 'Remote pilot in command assumptions.'), text('crew_assumptions', 'Crew and observers.'),
    text('c2_link_assumption', 'Command and control link.'), text('lost_link_procedure', 'Behavior when C2 is lost.'),
    text('fly_away_procedure', 'Fly-away containment.'), text('emergency_procedure', 'Emergency handling.'),
    text('detect_and_avoid_notes', 'Detect-and-avoid approach.'), text('see_and_avoid_notes', 'See-and-avoid approach.'),
    text('sense_and_avoid_notes', 'Sense-and-avoid approach.'),
  ],
});

export const riskAssessments = resource({
  slug: 'risk-assessment', path: '/risk-assessments', entity: 'risk_assessment', group: 'CONOPS and risk', singular: 'risk assessment', plural: 'risk assessments',
  row: risk, write: riskWrite, idExample: IDS.risk,
  fields: [text('name', 'Display name.'), text('description', 'Scope of the assessment.'), text('residual_risk_rating', 'Overall rating after mitigations, for example `LOW`.'), text('approval_conditions', 'Conditions the operation must meet.')],
});

export const riskHazards = resource({
  slug: 'risk-hazard', path: '/risk-hazards', entity: 'risk_hazard', group: 'CONOPS and risk', singular: 'risk hazard', plural: 'risk hazards',
  row: hazard, write: hazardWrite, idExample: IDS.hazard,
  fields: [
    {name: 'risk_assessment_id', type: 'uuid', required: true, description: 'Parent risk assessment.'},
    text('name', 'Hazard name.'), text('description', 'Details.', false), text('severity', 'Severity class.', false),
    text('likelihood', 'Likelihood class.', false), text('initial_risk_rating', 'Rating before mitigation.', false),
    text('residual_risk_rating', 'Rating after mitigation.', false),
  ],
});

export const riskMitigations = resource({
  slug: 'risk-mitigation', path: '/risk-mitigations', entity: 'risk_mitigation', group: 'CONOPS and risk', singular: 'risk mitigation', plural: 'risk mitigations',
  row: mitigation, write: mitigationWrite, idExample: IDS.mitigation,
  fields: [
    {name: 'hazard_id', type: 'uuid', required: true, description: 'Parent hazard.'},
    text('name', 'Mitigation name.'), text('description', 'Details.', false),
    text('verification_method', 'How the mitigation is verified.', false), text('effectiveness_notes', 'Expected effect.', false),
  ],
});

/* ------------------------------------------------------------------ */
/* Operational intents                                                 */
/* ------------------------------------------------------------------ */

const intentBase = resource({
  slug: 'operational-intent', path: '/operational-intents', entity: 'operational_intent', group: 'Operational intents',
  singular: 'operational intent', plural: 'operational intents', row: newIntentRow, listRow: intent,
  write: {conops_id: IDS.conops, risk_assessment_id: IDS.risk}, idExample: IDS.intent,
  listNote: 'Newest first. Each intent includes its `conops` and `risk_assessment`. Use the package endpoints to read or write volumes with the intent.',
  fields: [
    {name: 'conops_id', type: 'uuid', required: true, description: 'CONOPS for the operation.'},
    {name: 'risk_assessment_id', type: 'uuid', required: true, description: 'Risk assessment for the operation.'},
  ],
  deleteNote: 'Fails while 4D volumes are still linked. Remove the [volume links](#delete-intent-volume) first.',
});

const packageFields: Param[] = [
  {name: 'volumes', type: 'array', required: true, description: 'At least one volume. Each item is a 4D volume id, `{ "id": ... }`, a full 4D volume object, or `{ "volume_4d": ... }`. A 4D volume object can reference `volume_3d_id` or inline `volume_3d`.'},
  {name: 'conops', type: 'uuid | object', description: 'An id, `{ "id": ... }`, or a full CONOPS object. A full object with an `id` updates that CONOPS.'},
  {name: 'risk_assessment', type: 'uuid | object', description: 'An id or a full risk assessment. A full object may include `hazards`, each with `mitigations`.'},
  {name: 'intent', type: 'object', description: 'Alternative nesting: `{ conops, risk_assessment, volumes, conops_id, risk_assessment_id }`. Top-level keys win.'},
];

const packageResult = {
  operational_intent: newIntentRow,
  conops,
  risk_assessment: {...risk, hazards: [{...hazard, mitigations: [mitigation]}]},
  volumes: [{volume_4d: volume4dRow, volume_3d: volume3d}],
};

const packageErrors: ErrorCase[] = [
  {status: 400, detail: 'volumes_required', when: '`volumes` is missing or empty.'},
  {status: 400, detail: '<path>_invalid', when: 'A nested field failed validation, for example `volumes_0_volume_4d_valid_to_invalid`.'},
  {status: 404, detail: '<entity>_not_found', when: 'A referenced CONOPS, risk assessment, hazard, mitigation, or volume does not exist.'},
  {status: 409, detail: '<entity>_owner_mismatch', when: 'A referenced hazard or mitigation belongs to a different parent.'},
  {status: 409, detail: 'volume_4d_duplicate', when: 'The same 4D volume appears twice.'},
  {status: 409, detail: 'operational_intent_package_has_invalid_reference', when: 'A foreign key failed.'},
  ...authErrors,
];

export const intents = {
  ...intentBase,
  filter: {
    id: 'filter-operational-intents', api, group: 'Operational intents', method: 'GET', path: '/operational-intents/filter',
    title: 'Filter operational intents',
    description: 'Find intents by their linked 4D volumes: status, time, and position. An intent matches when **one** of its volumes satisfies **all** volume conditions.',
    queryParams: [
      {name: 'active', type: 'boolean', description: '`true`: a linked volume has `status_code = ACTIVE`. `false`: a linked volume is not active.'},
      {name: 'current_time', type: 'boolean', description: '`true`: a linked volume is in effect now. Alias `current`. Cannot be combined with a time range.', example: 'true'},
      {name: 'start_time', type: 'datetime', description: 'Overlap window start. Alias `start`. Requires `end_time`.'},
      {name: 'end_time', type: 'datetime', description: 'Overlap window end, after `start_time`. Alias `end`.'},
      {name: 'latitude', type: 'number', description: 'Point latitude, -90 to 90. Alias `lat`. Requires `longitude`.', example: '25.085'},
      {name: 'longitude', type: 'number', description: 'Point longitude, -180 to 180. Aliases `lng`, `lon`.', example: '55.145'},
      {name: 'buffer_m', type: 'number', description: 'Distance from the point to the footprint, in meters (geodesic, 0 to 1000000).', default: '0', example: '500'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([intent])}],
    errors: [
      {status: 400, detail: 'position_incomplete', when: 'Only one of latitude and longitude was sent.'},
      {status: 400, detail: 'latitude_invalid', when: 'Out of range or not a number (same for `longitude_invalid`, `buffer_m_invalid`).'},
      {status: 400, detail: 'time_range_incomplete', when: 'Only one end of the range was sent.'},
      {status: 400, detail: 'time_range_invalid', when: '`end_time` is not after `start_time`.'},
      {status: 400, detail: 'time_filter_conflict', when: '`current_time` was combined with a range.'},
      {status: 400, detail: 'boolean_query_invalid', when: 'A boolean is not `true` or `false`.'},
      ...PAGING_ERRORS, ...authErrors,
    ],
  },
  createPackage: {
    id: 'create-intent-package', api, group: 'Operational intents', method: 'POST', path: '/operational-intents/package',
    title: 'Create an intent package',
    description: 'Creates an operational intent with its volumes, and optionally its CONOPS and risk assessment, in one transaction. Nested items can reference existing records or create new ones. Audited as `create_package`.',
    bodyFields: packageFields,
    body: {
      conops: IDS.conops,
      risk_assessment: {...riskWrite, hazards: [{name: 'People nearby', severity: 'MAJOR', mitigations: [{name: 'Cordon below the work area'}]}]},
      volumes: [{volume_4d: {name: 'Inspection volume', valid_from: '2026-06-10T01:00:00Z', valid_to: '2026-06-10T02:00:00Z', volume_3d: volume3dWrite}}],
    },
    responses: [{status: 201, body: packageResult}],
    errors: packageErrors,
  },
  updatePackage: {
    id: 'update-intent-package', api, group: 'Operational intents', method: 'PUT', path: '/operational-intents/:id/package',
    title: 'Update an intent package',
    description: '`volumes` replaces the intent\'s volume links. Omitted `conops` or `risk_assessment` keep the current reference. Records that are no longer referenced are never deleted. Audited as `update_package`.',
    pathParams: [idParam('id', 'Operational intent id.', IDS.intent)],
    bodyFields: packageFields,
    body: {volumes: [IDS.volume4d, {id: '10000000-0000-4000-8000-000000000009'}]},
    responses: [{status: 200, body: packageResult}],
    errors: [{status: 404, detail: 'operational_intent_not_found', when: 'No intent has this id.'}, {status: 400, detail: 'id_invalid', when: 'The path id is not a UUID.'}, ...packageErrors],
  },
};

const link = {intent_id: IDS.intent, volume_4d_id: IDS.volume4d};
const linkIds: Param[] = [
  idParam('intentID', 'Operational intent id.', IDS.intent),
  idParam('volume4DID', '4D volume id.', IDS.volume4d),
];

export const intentVolumes = {
  list: {
    id: 'list-intent-volumes', api, group: 'Intent volumes', method: 'GET', path: '/intent-volumes-4d',
    title: 'List intent volume links',
    description: 'Ordered by intent id, then volume id. Each link includes the expanded `operational_intent` and `volume_4d`.',
    queryParams: [
      {name: 'intent_id', type: 'uuid', description: 'Only links of this intent.', example: IDS.intent},
      {name: 'volume_4d_id', type: 'uuid', description: 'Only links of this volume.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([{...link, operational_intent: intent, volume_4d: volume4d}])}],
    errors: [...PAGING_ERRORS, ...authErrors],
  },
  get: {
    id: 'get-intent-volume', api, group: 'Intent volumes', method: 'GET', path: '/intent-volumes-4d/:intentID/:volume4DID',
    title: 'Get an intent volume link', pathParams: linkIds,
    responses: [{status: 200, body: {...link, operational_intent: intent, volume_4d: volume4d}}],
    errors: [{status: 404, detail: 'intent_volume_4d_not_found', when: 'The pair is not linked.'}, ...authErrors],
  },
  create: {
    id: 'create-intent-volume', api, group: 'Intent volumes', method: 'POST', path: '/intent-volumes-4d',
    title: 'Link a volume to an intent',
    bodyFields: [
      {name: 'intent_id', type: 'uuid', required: true, description: 'Operational intent.'},
      {name: 'volume_4d_id', type: 'uuid', required: true, description: '4D volume.'},
    ],
    body: link,
    responses: [{status: 201, body: {...link, operational_intent: intent, volume_4d: volume4d}}],
    errors: [
      {status: 400, detail: 'intent_id_invalid', when: 'Not a UUID (same for `volume_4d_id_invalid`).'},
      {status: 409, detail: 'intent_volume_4d_already_exists', when: 'The pair is already linked.'},
      {status: 409, detail: 'intent_volume_4d_has_invalid_reference', when: 'The intent or volume does not exist.'},
      ...authErrors,
    ],
  },
  remove: {
    id: 'delete-intent-volume', api, group: 'Intent volumes', method: 'DELETE', path: '/intent-volumes-4d/:intentID/:volume4DID',
    title: 'Unlink a volume from an intent', description: 'Deletes only the link. The 4D volume is kept.', pathParams: linkIds,
    responses: [{status: 200, body: link}],
    errors: [{status: 404, detail: 'intent_volume_4d_not_found', when: 'The pair is not linked.'}, ...authErrors],
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Review workflow                                                     */
/* ------------------------------------------------------------------ */

const reviewHeaders: Param[] = [
  {name: 'x-correlation-id', type: 'string', description: 'Optional. Echoed in the response header and body. Generated when absent.', example: IDS.correlation},
];
const intentPath = [idParam('id', 'Operational intent id.', IDS.intent)];

function envelope(code: string, message: string, action: string, data: JsonValue): JsonValue {
  return {success: true, code, message, action, data, correlation_id: IDS.correlation};
}

const validation = {
  intent_id: IDS.intent, context: 'APPROVAL_REQUEST', overall_status: 'REQUIRES_REVIEW',
  constraint_status_code: 'CONSTRAINT_ADVISORY', conflict_status_code: 'NO_CONFLICT',
  priority_status_code: 'PRIORITY_RULES_UNAVAILABLE', privilege_status_code: 'PRIVILEGE_RULES_UNAVAILABLE',
  errors: [],
  warnings: [{code: 'CONSTRAINT_ADVISORY', severity: 'WARNING', category: 'CONSTRAINT', message: 'The volume intersects a monitoring zone.', action: 'Review the advisory before approval.', entity_type: 'volume_4d', entity_id: IDS.volume4d}],
  findings: [
    {code: 'CONSTRAINT_ADVISORY', severity: 'WARNING', category: 'CONSTRAINT', message: 'The volume intersects a monitoring zone.', entity_type: 'volume_4d', entity_id: IDS.volume4d},
    {code: 'PRIORITY_RULES_UNAVAILABLE', severity: 'TODO', category: 'PRIORITY', message: 'Priority rules are not configured.'},
  ],
  checked_at: TS2, correlation_id: IDS.correlation,
};

const decision = (status: string, extra: {[key: string]: JsonValue} = {}): JsonValue => ({
  intent_id: IDS.intent, approval_status: status, decision_type: 'HUMAN', reviewer_id: ACTOR,
  validation_summary: {overall_status: 'REQUIRES_REVIEW', checked_at: TS2}, decided_at: '2026-06-05T10:00:00.000Z',
  correlation_id: IDS.correlation, ...extra,
});

const reviewErrors = (extra: ErrorCase[] = []): ErrorCase[] => [
  {status: 400, detail: 'REQUEST_VALIDATION_FAILED', when: 'The path id is not a UUID or the body has unknown or invalid fields. `details` lists each issue.'},
  {status: 404, detail: 'OPERATIONAL_INTENT_NOT_FOUND', when: 'No intent has this id.'},
  ...extra,
  {status: 500, detail: 'REVIEW_PERSISTENCE_ERROR', when: 'The review result could not be saved (also `AUDIT_WRITE_ERROR`).'},
  {status: 500, detail: 'INTERNAL_SERVER_ERROR', when: 'Unexpected failure. Authentication failures on these routes (missing or invalid credentials) currently surface here too, because the review error handler does not map them to `401`.'},
];

const decideErrors: ErrorCase[] = [
  {status: 403, detail: 'APPROVAL_UNAUTHORIZED_REVIEWER', when: 'The caller lacks `operations.review.decide`.'},
  {status: 409, detail: 'APPROVAL_ALREADY_DECIDED', when: 'The intent already has a final decision.'},
  {status: 409, detail: 'APPROVAL_STALE_REVIEW', when: 'The intent changed after the reviewed version, or `expected_updated_at` does not match.'},
  {status: 409, detail: 'REVIEW_STATE_CONFLICT', when: 'The intent is not pending review.'},
  {status: 422, detail: 'APPROVAL_PRECONDITION_FAILED', when: 'Blocking findings remain. Re-validate first.'},
];

export const review = {
  validate: {
    id: 'validate-intent', api, group: 'Review workflow', method: 'POST', path: '/operational-intents/:id/validate',
    title: 'Validate an operational intent',
    description: 'Runs the validation pipeline: intent and volume checks, CONOPS and risk completeness, constraint checks against Constraint Management, conflict detection with other active intents, and priority and privilege evaluation. Saves the latest status on the intent.',
    pathParams: intentPath, headers: reviewHeaders,
    bodyFields: [{name: 'context', type: 'enum', description: '`CREATE`, `UPDATE`, `APPROVAL_REQUEST`, `ACTIVATION`, or `REVALIDATION`. Approval contexts apply stricter rules.', default: 'REVALIDATION'}],
    body: {context: 'APPROVAL_REQUEST'},
    responses: [
      {status: 200, description: '`code` is `VALIDATION_COMPLETED` when `overall_status` is `VALID`, and `VALIDATION_COMPLETED_REVIEW_REQUIRED` otherwise. A `200` does not mean the intent is valid: check `data.overall_status`.',
        body: envelope('VALIDATION_COMPLETED_REVIEW_REQUIRED', 'System validation completed. Human review is required before approval or activation.', 'Review the findings and resolve or accept them according to policy.', validation)},
    ],
    errors: reviewErrors([
      {status: 422, detail: 'INTENT_DATA_INVALID', when: 'The intent data cannot be validated (also `VOLUME_VALIDATION_ERROR`).'},
      {status: 503, detail: 'CONSTRAINT_VALIDATION_UNAVAILABLE', when: 'Constraint Management could not be reached (also `CONFLICT_DETECTION_ERROR`, `PRIORITY_PRIVILEGE_EVALUATION_ERROR`).'},
      {status: 504, detail: 'CONSTRAINT_VALIDATION_TIMEOUT', when: 'Constraint Management timed out.'},
    ]),
  },
  requestApproval: {
    id: 'request-approval', api, group: 'Review workflow', method: 'POST', path: '/operational-intents/:id/approval-requests',
    title: 'Request approval',
    description: 'Validates in `APPROVAL_REQUEST` context, then either approves automatically (when `AUTO_APPROVE=true` and policy allows) or moves the intent to `PENDING_HUMAN_APPROVAL`. Needs `operations.review` or `operations.review.decide`. The body must be empty or `{}`.',
    permission: ['operations.review'], pathParams: intentPath, headers: reviewHeaders, body: {},
    responses: [
      {status: 200, description: 'Pending human review (`APPROVAL_PENDING_HUMAN_REVIEW`).', body: envelope('APPROVAL_PENDING_HUMAN_REVIEW', 'The operational intent is pending human approval review.', 'Assign an authorized reviewer.',
        {intent_id: IDS.intent, approval_status: 'PENDING_HUMAN_APPROVAL', decision_type: 'HUMAN', validation_summary: {overall_status: 'REQUIRES_REVIEW', checked_at: TS2}, correlation_id: IDS.correlation})},
      {status: 200, description: 'Approved by the automatic policy (`APPROVAL_AUTO_APPROVED`).', body: envelope('APPROVAL_AUTO_APPROVED', 'The operational intent was automatically approved by an explicit rule policy.', 'Record the policy result and continue according to operations procedure.',
        {intent_id: IDS.intent, approval_status: 'AUTO_APPROVED', decision_type: 'RULE_BASED_AUTOMATIC', policy_code: 'AUTO_APPROVE_VALID', validation_summary: {overall_status: 'VALID', checked_at: TS2}, decided_at: TS2, correlation_id: IDS.correlation})},
    ],
    errors: reviewErrors([
      {status: 403, detail: 'APPROVAL_UNAUTHORIZED_REVIEWER', when: 'The caller has neither review permission.'},
      {status: 422, detail: 'APPROVAL_PRECONDITION_FAILED', when: 'Validation found blocking errors.'},
      {status: 503, detail: 'CONSTRAINT_VALIDATION_UNAVAILABLE', when: 'A dependency was unavailable during validation.'},
    ]),
  },
  approve: {
    id: 'approve-intent', api, group: 'Review workflow', method: 'POST', path: '/operational-intents/:id/approve',
    title: 'Approve an operational intent', permission: 'operations.review.decide',
    description: 'Records a human approval. Send `expected_updated_at` (the intent `updated_at` you reviewed) so the approval fails if the intent changed in the meantime.',
    pathParams: intentPath, headers: reviewHeaders,
    bodyFields: [
      {name: 'reason', type: 'string', description: '1 to 2000 characters.'},
      {name: 'comments', type: 'string', description: 'Up to 4000 characters.'},
      {name: 'expected_updated_at', type: 'datetime', description: 'Optimistic concurrency guard.'},
    ],
    body: {reason: 'Mitigations are adequate', comments: 'Observer must stay on the north side.', expected_updated_at: TS},
    responses: [{status: 200, body: envelope('APPROVAL_HUMAN_APPROVED', 'The operational intent was approved by an authorized reviewer.', 'Continue with activation preconditions.',
      decision('HUMAN_APPROVED', {reason: 'Mitigations are adequate', comments: 'Observer must stay on the north side.'}))}],
    errors: reviewErrors(decideErrors),
  },
  reject: {
    id: 'reject-intent', api, group: 'Review workflow', method: 'POST', path: '/operational-intents/:id/reject',
    title: 'Reject an operational intent', permission: 'operations.review.decide',
    pathParams: intentPath, headers: reviewHeaders,
    bodyFields: [
      {name: 'reason', type: 'string', required: true, description: '1 to 2000 characters.'},
      {name: 'comments', type: 'string', description: 'Up to 4000 characters.'},
    ],
    body: {reason: 'Volume overlaps the stadium event closure', comments: 'Resubmit for another date.'},
    responses: [{status: 200, body: envelope('APPROVAL_REJECTED', 'The operational intent was rejected by an authorized reviewer.', 'Review the rejection reason before resubmission.',
      decision('REJECTED', {reason: 'Volume overlaps the stadium event closure', comments: 'Resubmit for another date.'}))}],
    errors: reviewErrors(decideErrors),
  },
  requestChanges: {
    id: 'request-intent-changes', api, group: 'Review workflow', method: 'POST', path: '/operational-intents/:id/request-changes',
    title: 'Request changes', permission: 'operations.review.decide',
    description: 'Sends the intent back to the operator. After editing, the operator validates and requests approval again.',
    pathParams: intentPath, headers: reviewHeaders,
    bodyFields: [
      {name: 'change_instructions', type: 'string', required: true, description: 'What must change, 1 to 4000 characters.'},
      {name: 'comments', type: 'string', description: 'Up to 4000 characters.'},
    ],
    body: {change_instructions: 'Add a lost-link procedure that avoids the school to the east.'},
    responses: [{status: 200, body: envelope('APPROVAL_CHANGES_REQUESTED', 'The reviewer requested changes before the operation can be approved.', 'Update the listed CONOPS, risk, or volume items and submit for validation again.',
      decision('CHANGES_REQUESTED', {comments: 'Add a lost-link procedure that avoids the school to the east.'}))}],
    errors: reviewErrors(decideErrors),
  },
  status: {
    id: 'get-review-status', api, group: 'Review workflow', method: 'GET', path: '/operational-intents/:id/review-status',
    title: 'Get review status',
    description: 'Current approval status, last decision, and latest validation. `reapproval_required` turns `true` when the intent changed materially after approval.',
    pathParams: intentPath, headers: reviewHeaders,
    responses: [{status: 200, body: envelope('APPROVAL_REQUESTED', 'The operational intent was submitted for approval review.', 'A reviewer should evaluate the review package.', {
      intent_id: IDS.intent, approval_status: 'PENDING_HUMAN_APPROVAL',
      latest_validation: {overall_status: 'REQUIRES_REVIEW', checked_at: TS2, context: 'APPROVAL_REQUEST', constraint_status_code: 'CONSTRAINT_ADVISORY', conflict_status_code: 'NO_CONFLICT', priority_status_code: 'PRIORITY_RULES_UNAVAILABLE', privilege_status_code: 'PRIVILEGE_RULES_UNAVAILABLE'},
      reapproval_required: false, material_change_detected: false,
      current_intent_updated_at: TS, reviewed_intent_updated_at: TS, correlation_id: IDS.correlation,
    })}],
    errors: reviewErrors(),
  },
} satisfies Record<string, EndpointSpec>;

/* ------------------------------------------------------------------ */
/* Audit and health                                                    */
/* ------------------------------------------------------------------ */

const auditRow = {audit_id: IDS.audit, entity_type: 'operational_intent', entity_id: IDS.intent, action: 'create_package', actor: ACTOR, correlation_id: null, created_at: TS, before_json: null, after_json: packageResult};

export const auditLog = {
  list: {
    id: 'list-audit-log', api, group: 'Audit', method: 'GET', path: '/audit-log',
    title: 'List audit events', description: 'Newest first. Includes CRUD writes, package writes, and review decisions.', queryParams: paging(),
    responses: [{status: 200, body: page([auditRow])}], errors: [...PAGING_ERRORS, ...authErrors],
  },
  get: {
    id: 'get-audit-log', api, group: 'Audit', method: 'GET', path: '/audit-log/:ID',
    title: 'Get an audit event', pathParams: [id('Audit event id.', IDS.audit)],
    responses: [{status: 200, body: auditRow}],
    errors: [{status: 404, detail: 'audit_log_not_found', when: 'No event has this id.'}, ...authErrors],
  },
} satisfies Record<string, EndpointSpec>;

export const health = {
  get: {
    id: 'get-health', api, group: 'Health', method: 'GET', path: '/health',
    title: 'Check service health', auth: 'public-health',
    responses: [{status: 200, body: {status: 'ok'}}],
  },
} satisfies Record<string, EndpointSpec>;

const groups: Record<string, EndpointSpec>[] = [
  health, intents, intentVolumes, review, volumes3d, volumes4d, conopsResource, riskAssessments, riskHazards, riskMitigations, auditLog,
];
export const allEndpoints: EndpointSpec[] = groups.flatMap((group) => Object.values(group));

const base = '/api/operations-intents/endpoints';
export const pages: Record<string, string> = {
  Health: '/api/operations-intents/overview',
  'Operational intents': `${base}/operational-intents`,
  'Intent volumes': `${base}/operational-intents`,
  'Review workflow': `${base}/review-workflow`,
  Volumes: `${base}/volumes`,
  'CONOPS and risk': `${base}/conops-and-risk`,
  Audit: `${base}/audit-log`,
};
