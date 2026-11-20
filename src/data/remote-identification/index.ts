import {idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, ErrorCase, JsonValue, Param} from '@site/src/api/types';

const api = 'remote-identification' as const;

const IDS = {
  certificate: '5a1e0c3d-2b4f-4e6a-9c8d-7f6e5d4c3b2a',
  uas: 'c5d1f3a2-8b7e-4f61-9a0d-3e2b1c4d5f60',
  authority: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  session: '6b2f1d4e-3c5a-4f7b-8d9e-0a1b2c3d4e5f',
  operation: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  position: '7c3a2e5f-4d6b-4a8c-9e0f-1b2c3d4e5f6a',
  message: '8d4b3f6a-5e7c-4b9d-a0f1-2c3d4e5f6a7b',
  receiver: '9e5c4a7b-6f8d-4cae-b1a2-3d4e5f6a7b8c',
  audit: 'af6d5b8c-7a9e-4dbf-82b3-4e5f6a7b8c9d',
};
const TS = '2026-06-10T01:05:00.000Z';
const TS2 = '2026-06-10T01:05:01.240Z';

const certificateWrite = {
  uas_id: IDS.uas, authority_id: IDS.authority, reference: 'RID-CERT-2026-0042', subject_name: 'CN=UAE-UA-000123',
  valid_from: '2026-06-01T00:00:00Z', valid_to: '2027-06-01T00:00:00Z', status_code: 'ACTIVE',
};
const certificate = {
  id: IDS.certificate, created_at: TS, updated_at: TS, ...certificateWrite,
  valid_from: '2026-06-01T00:00:00.000Z', valid_to: '2027-06-01T00:00:00.000Z',
};
const sessionRow = {id: IDS.session, created_at: TS, updated_at: TS, operation_id: IDS.operation, certificate_id: IDS.certificate};
const session = {...sessionRow, certificate};

const ridPayload = {
  basic_id: {ua_type: 'HELICOPTER_OR_MULTIROTOR', id_type: 'SERIAL_NUMBER', uas_id: 'SN-4F7A-2026-0091'},
  location: {status: 'AIRBORNE', direction: 92, speed_horizontal: 7.5, speed_vertical: 0.2, latitude: 25.0851, longitude: 55.1453, altitude_geodetic: 64.3, timestamp: '2026-06-10T01:05:00Z'},
};
const positionWrite = {
  observed_at: '2026-06-10T01:05:00Z', latitude: 25.0851, longitude: 55.1453, altitude_m: 64.3,
  session_id: IDS.session, receiver_id: IDS.receiver, message_type_code: 'LOCATION', transport_code: 'BROADCAST',
  payload: ridPayload, signature_data: 'MEUCIQDx...q4w=', signature_algorithm: 'ES256',
  horizontal_speed_m_s: 7.5, vertical_speed_m_s: 0.2, accuracy_horizontal_m: 3, accuracy_vertical_m: 4.5,
};
const position = {
  id: IDS.position, created_at: TS2, updated_at: TS2, observed_at: TS,
  longitude: '55.145300', latitude: '25.085100', altitude_m: '64.30',
  session_id: IDS.session, certificate_id: IDS.certificate, message_id: IDS.message,
  payload: ridPayload, payload_hash: '3f5b1c9e0d7a2b4c6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d',
  signature_data: 'MEUCIQDx...q4w=', signature_algorithm: 'ES256',
  verification_status_code: 'NOT_VERIFIED', verification_checked_at: null, verification_result_ref: null,
  receiver_id: IDS.receiver, horizontal_speed_m_s: '7.50', vertical_speed_m_s: '0.20', accuracy_horizontal_m: '3.00', accuracy_vertical_m: '4.50',
  message_type_code: 'LOCATION', transport_code: 'BROADCAST',
};

const writeErrors = (entity: string, field: string): ErrorCase[] => [
  {status: 400, detail: `${field}_invalid`, when: 'A field failed validation. Every field uses `<field>_invalid`.'},
  {status: 409, detail: `${entity}_has_invalid_reference`, when: 'A referenced id does not exist.'},
  {status: 409, detail: `${entity}_already_exists`, when: 'A unique constraint failed.'},
];

const id = (description: string, example: string): Param => idParam('ID', description, example);

/* Certificates ------------------------------------------------------- */

const certificateFields: Param[] = [
  {name: 'uas_id', type: 'uuid', required: true, description: 'Aircraft identifier from the registry. Not checked against the CAA Registry.'},
  {name: 'authority_id', type: 'uuid', required: true, description: 'Issuing authority.'},
  {name: 'reference', type: 'string', required: true, description: 'Certificate reference.'},
  {name: 'subject_name', type: 'string', required: true, description: 'Certificate subject.'},
  {name: 'valid_from', type: 'datetime', required: true, description: 'Start of validity.'},
  {name: 'valid_to', type: 'datetime', required: true, description: 'End of validity, after `valid_from`.'},
  {name: 'status_code', type: 'string', description: 'Free-form status.', default: 'ACTIVE'},
];

export const certificates = {
  list: {
    id: 'list-certificates', api, group: 'Certificates', method: 'GET', path: '/certificates',
    title: 'List certificates', description: 'Newest first.', queryParams: paging(),
    responses: [{status: 200, body: page([certificate])}], errors: PAGING_ERRORS,
  },
  get: {
    id: 'get-certificate', api, group: 'Certificates', method: 'GET', path: '/certificates/:ID',
    title: 'Get a certificate', pathParams: [id('Certificate id.', IDS.certificate)],
    responses: [{status: 200, body: certificate}],
    errors: [{status: 404, detail: 'certificate_not_found', when: 'No certificate has this id.'}],
  },
  create: {
    id: 'create-certificate', api, group: 'Certificates', method: 'POST', path: '/certificates',
    title: 'Create a certificate', bodyFields: certificateFields, body: certificateWrite,
    responses: [{status: 201, body: certificate}],
    errors: [...writeErrors('certificate', 'uas_id'), {status: 400, detail: 'valid_to_invalid', when: '`valid_to` is not after `valid_from`.'}],
  },
  replace: {
    id: 'replace-certificate', api, group: 'Certificates', method: 'PUT', path: '/certificates/:ID',
    title: 'Replace a certificate', description: 'Full replacement, validated like a create.',
    pathParams: [id('Certificate id.', IDS.certificate)], bodyFields: certificateFields, body: {...certificateWrite, status_code: 'REVOKED'},
    responses: [{status: 200, body: {...certificate, status_code: 'REVOKED'}}],
    errors: [{status: 404, detail: 'certificate_not_found', when: 'No certificate has this id.'}, ...writeErrors('certificate', 'uas_id')],
  },
  remove: {
    id: 'delete-certificate', api, group: 'Certificates', method: 'DELETE', path: '/certificates/:ID',
    title: 'Delete a certificate', description: 'Fails while sessions use the certificate.',
    pathParams: [id('Certificate id.', IDS.certificate)],
    responses: [{status: 200, description: 'The deleted certificate.', body: certificate}],
    errors: [{status: 404, detail: 'certificate_not_found', when: 'No certificate has this id.'}, {status: 409, detail: 'certificate_has_linked_records', when: 'Sessions still reference it.'}],
  },
} satisfies Record<string, EndpointSpec>;

/* Sessions ----------------------------------------------------------- */

const sessionFilters: Param[] = [
  {name: 'operation_id', type: 'uuid', description: 'Operational intent the flight belongs to.'},
  {name: 'certificate_id', type: 'uuid', description: 'Certificate used by the session.'},
  {name: 'certificate_uas_id', type: 'uuid', description: 'Aircraft id on the certificate.'},
  {name: 'certificate_authority_id', type: 'uuid', description: 'Issuing authority on the certificate.'},
  {name: 'certificate_reference', type: 'string', description: 'Exact certificate reference.'},
  {name: 'certificate_subject_name', type: 'string', description: 'Case-insensitive substring of the certificate subject.'},
  {name: 'certificate_valid_at', type: 'datetime', description: 'Certificate is valid at this instant.'},
  {name: 'created_from', type: 'datetime', description: 'Created at or after.'},
  {name: 'created_to', type: 'datetime', description: 'Created at or before.'},
  {name: 'updated_from', type: 'datetime', description: 'Updated at or after.'},
  {name: 'updated_to', type: 'datetime', description: 'Updated at or before.'},
];
const sessionFilterErrors: ErrorCase[] = [
  {status: 400, detail: 'operation_id_invalid', when: 'A UUID filter is not a valid UUID. Each filter has its own `<name>_invalid` code.'},
  {status: 400, detail: 'created_from_invalid', when: 'A date filter cannot be parsed.'},
];
const sessionFields: Param[] = [
  {name: 'certificate_id', type: 'uuid', required: true, description: 'Certificate the aircraft broadcasts with. Must exist.'},
  {name: 'operation_id', type: 'uuid | null', description: 'Operational intent id from Operations Intents. Not checked.'},
];

export const sessions = {
  list: {
    id: 'list-sessions', api, group: 'Sessions', method: 'GET', path: '/sessions',
    title: 'List sessions', description: 'Newest first. Each session includes its `certificate`.', queryParams: paging(),
    responses: [{status: 200, body: page([session])}], errors: PAGING_ERRORS,
  },
  filter: {
    id: 'filter-sessions', api, group: 'Sessions', method: 'GET', path: '/sessions/filter',
    title: 'Filter sessions', description: 'All filters are optional and combined with AND.',
    queryParams: [{...sessionFilters[0], example: IDS.operation}, ...sessionFilters.slice(1), ...paging()],
    responses: [{status: 200, body: page([session])}], errors: [...sessionFilterErrors, ...PAGING_ERRORS],
  },
  single: {
    id: 'filter-single-session', api, group: 'Sessions', method: 'GET', path: '/sessions/filter/single',
    title: 'Find one session with its track',
    description: 'Finds exactly one session and returns it with its position reports, newest first. Use it to replay a flight: for example, the session of one operation and certificate.',
    queryParams: [
      {...sessionFilters[0], example: IDS.operation},
      {...sessionFilters[1], example: IDS.certificate},
      ...sessionFilters.slice(2),
      {name: 'position_report_limit', type: 'integer', description: 'Reports to include, 1 to 500.', default: '200'},
      {name: 'position_report_offset', type: 'integer', description: 'Reports to skip.', default: '0'},
    ],
    responses: [{status: 200, body: {...session, position_reports: [position], position_report_limit: 200, position_report_offset: 0, position_reports_has_more: false}}],
    errors: [
      {status: 400, detail: 'session_filter_required', when: 'No filter was sent.'},
      {status: 404, detail: 'session_not_found', when: 'Nothing matches.'},
      {status: 409, detail: 'session_filter_not_unique', when: 'More than one session matches. Add filters.'},
      {status: 400, detail: 'position_report_limit_invalid', when: 'Out of range (same for `position_report_offset_invalid`).'},
      ...sessionFilterErrors,
    ],
  },
  get: {
    id: 'get-session', api, group: 'Sessions', method: 'GET', path: '/sessions/:ID',
    title: 'Get a session', pathParams: [id('Session id.', IDS.session)],
    responses: [{status: 200, body: session}],
    errors: [{status: 404, detail: 'session_not_found', when: 'No session has this id.'}],
  },
  create: {
    id: 'create-session', api, group: 'Sessions', method: 'POST', path: '/sessions',
    title: 'Start a session', bodyFields: sessionFields, body: {operation_id: IDS.operation, certificate_id: IDS.certificate},
    responses: [{status: 201, description: 'The created session, without the expanded certificate.', body: sessionRow}],
    errors: writeErrors('session', 'certificate_id'),
  },
  replace: {
    id: 'replace-session', api, group: 'Sessions', method: 'PUT', path: '/sessions/:ID',
    title: 'Replace a session', pathParams: [id('Session id.', IDS.session)], bodyFields: sessionFields,
    body: {operation_id: IDS.operation, certificate_id: IDS.certificate},
    responses: [{status: 200, body: sessionRow}],
    errors: [{status: 404, detail: 'session_not_found', when: 'No session has this id.'}, ...writeErrors('session', 'certificate_id')],
  },
  remove: {
    id: 'delete-session', api, group: 'Sessions', method: 'DELETE', path: '/sessions/:ID',
    title: 'Delete a session', description: 'Fails while position reports reference the session.',
    pathParams: [id('Session id.', IDS.session)],
    responses: [{status: 200, description: 'The deleted session.', body: sessionRow}],
    errors: [{status: 404, detail: 'session_not_found', when: 'No session has this id.'}, {status: 409, detail: 'session_has_linked_records', when: 'Position reports still reference it.'}],
  },
} satisfies Record<string, EndpointSpec>;

/* Position reports --------------------------------------------------- */

const positionFields: Param[] = [
  {name: 'observed_at', type: 'datetime', required: true, description: 'When the aircraft was at this position.'},
  {name: 'latitude', type: 'number | string', required: true, description: '-90 to 90. Stored with 6 decimals.'},
  {name: 'longitude', type: 'number | string', required: true, description: '-180 to 180. Stored with 6 decimals.'},
  {name: 'altitude_m', type: 'number | string', required: true, description: 'Altitude in meters.'},
  {name: 'session_id', type: 'uuid | null', description: 'Flight session. Optional for reports not yet tied to a session.'},
  {name: 'receiver_id', type: 'uuid', required: true, description: 'Receiver that captured the message.'},
  {name: 'message_type_code', type: 'string', required: true, description: 'For example `LOCATION`, `BASIC_ID`, `SYSTEM`.'},
  {name: 'transport_code', type: 'string', required: true, description: '`BROADCAST` (Bluetooth or Wi-Fi) or `NETWORK`.'},
  {name: 'payload', type: 'JSON', required: true, description: 'The decoded Remote ID message, stored as-is.'},
  {name: 'payload_hash', type: 'string', description: 'Defaults to the SHA-256 hex digest of `JSON.stringify(payload)`.'},
  {name: 'signature_data', type: 'string | null', description: 'Message signature, if any.'},
  {name: 'signature_algorithm', type: 'string | null', description: 'For example `ES256`.'},
  {name: 'verification_status_code', type: 'string', description: 'Verification result.', default: 'NOT_VERIFIED'},
  {name: 'verification_checked_at', type: 'datetime | null', description: 'When the signature was checked.'},
  {name: 'verification_result_ref', type: 'string | null', description: 'Reference to the verification record.'},
  {name: 'horizontal_speed_m_s', type: 'number | null', description: 'Ground speed.'},
  {name: 'vertical_speed_m_s', type: 'number | null', description: 'Climb rate.'},
  {name: 'accuracy_horizontal_m', type: 'number | null', description: 'Horizontal accuracy.'},
  {name: 'accuracy_vertical_m', type: 'number | null', description: 'Vertical accuracy.'},
];

const reportId = id('Position report id.', IDS.position);

export const positionReports = {
  list: {
    id: 'list-position-reports', api, group: 'Position reports', method: 'GET', path: '/position-reports',
    title: 'List position reports',
    description: 'Most recent observation first. Each row merges the report with its message fields and the session\'s `certificate_id`.',
    queryParams: paging(), responses: [{status: 200, body: page([position])}], errors: PAGING_ERRORS,
  },
  filter: {
    id: 'filter-position-reports', api, group: 'Position reports', method: 'GET', path: '/position-reports/filter',
    title: 'Filter position reports',
    description: 'Combine filters with AND. A bounding box plus a time window returns the traffic in an area.',
    queryParams: [
      {name: 'session_id', type: 'uuid', description: 'Reports of one session.', example: IDS.session},
      {name: 'certificate_id', type: 'uuid', description: 'Reports whose session uses this certificate.'},
      {name: 'id', type: 'uuid', description: 'One report.'},
      {name: 'message_id', type: 'uuid', description: 'One message.'},
      {name: 'receiver_id', type: 'uuid', description: 'Reports from one receiver.'},
      {name: 'observed_from', type: 'datetime', description: 'Observed at or after.', example: '2026-06-10T01:00:00Z'},
      {name: 'observed_to', type: 'datetime', description: 'Observed at or before.'},
      {name: 'created_from', type: 'datetime', description: 'Stored at or after.'},
      {name: 'created_to', type: 'datetime', description: 'Stored at or before.'},
      {name: 'latitude_min', type: 'number', description: 'Bounding box. Also `latitude_max`, `longitude_min`, `longitude_max`.'},
      {name: 'latitude_max', type: 'number', description: 'Bounding box upper latitude.'},
      {name: 'longitude_min', type: 'number', description: 'Bounding box western edge.'},
      {name: 'longitude_max', type: 'number', description: 'Bounding box eastern edge.'},
      {name: 'altitude_min_m', type: 'number', description: 'Minimum altitude.'},
      {name: 'altitude_max_m', type: 'number', description: 'Maximum altitude.'},
      {name: 'verification_status_code', type: 'string', description: 'Exact verification status.'},
      {name: 'message_type_code', type: 'string', description: 'Exact message type.'},
      {name: 'transport_code', type: 'string', description: 'Exact transport.'},
      {name: 'payload_hash', type: 'string', description: 'Exact payload hash, for de-duplication.'},
      ...paging(),
    ],
    responses: [{status: 200, body: page([position])}],
    errors: [
      {status: 400, detail: 'session_id_invalid', when: 'A UUID filter is invalid. Each filter has its own `<name>_invalid` code.'},
      {status: 400, detail: 'latitude_min_invalid', when: 'A numeric filter is out of range.'},
      {status: 400, detail: 'observed_from_invalid', when: 'A date filter cannot be parsed.'},
      ...PAGING_ERRORS,
    ],
  },
  get: {
    id: 'get-position-report', api, group: 'Position reports', method: 'GET', path: '/position-reports/:ID',
    title: 'Get a position report', pathParams: [reportId],
    responses: [{status: 200, body: position}],
    errors: [{status: 404, detail: 'position_report_not_found', when: 'No report has this id.'}],
  },
  create: {
    id: 'create-position-report', api, group: 'Position reports', method: 'POST', path: '/position-reports',
    title: 'Ingest a position report',
    description: 'Stores the raw message and the position in one transaction. One request per received Remote ID message.',
    bodyFields: positionFields, body: positionWrite,
    responses: [{status: 201, body: position}],
    errors: writeErrors('position_report', 'observed_at'),
  },
  replace: {
    id: 'replace-position-report', api, group: 'Position reports', method: 'PUT', path: '/position-reports/:ID',
    title: 'Replace a position report', description: 'Replaces both the report and its message. Use it to record a verification result.',
    pathParams: [reportId], bodyFields: positionFields,
    body: {...positionWrite, verification_status_code: 'VERIFIED', verification_checked_at: '2026-06-10T01:05:02Z', verification_result_ref: 'rid-verify-000981'},
    responses: [{status: 200, body: {...position, verification_status_code: 'VERIFIED', verification_checked_at: '2026-06-10T01:05:02.000Z', verification_result_ref: 'rid-verify-000981'}}],
    errors: [{status: 404, detail: 'position_report_not_found', when: 'No report has this id.'}, ...writeErrors('position_report', 'observed_at')],
  },
  remove: {
    id: 'delete-position-report', api, group: 'Position reports', method: 'DELETE', path: '/position-reports/:ID',
    title: 'Delete a position report', description: 'Deletes the report and its message.', pathParams: [reportId],
    responses: [{status: 200, description: 'The deleted report.', body: position}],
    errors: [{status: 404, detail: 'position_report_not_found', when: 'No report has this id.'}],
  },
} satisfies Record<string, EndpointSpec>;

/* Audit and health --------------------------------------------------- */

const auditRow: JsonValue = {audit_id: IDS.audit, entity_type: 'position_report', entity_id: IDS.position, action: 'create', actor: 'system', correlation_id: null, created_at: TS2, before_json: null, after_json: position};

export const auditLogs = {
  list: {
    id: 'list-audit-logs', api, group: 'Audit', method: 'GET', path: '/audit-logs',
    title: 'List audit events', description: 'Newest first.', queryParams: paging(),
    responses: [{status: 200, body: page([auditRow])}], errors: PAGING_ERRORS,
  },
  get: {
    id: 'get-audit-log', api, group: 'Audit', method: 'GET', path: '/audit-logs/:ID',
    title: 'Get an audit event', pathParams: [id('Audit event id.', IDS.audit)],
    responses: [{status: 200, body: auditRow}],
    errors: [{status: 404, detail: 'audit_log_not_found', when: 'No event has this id.'}],
  },
} satisfies Record<string, EndpointSpec>;

export const health = {
  get: {
    id: 'get-health', api, group: 'Health', method: 'GET', path: '/health',
    title: 'Check service health', auth: 'public', responses: [{status: 200, body: {status: 'ok'}}],
  },
} satisfies Record<string, EndpointSpec>;

const groups: Record<string, EndpointSpec>[] = [health, certificates, sessions, positionReports, auditLogs];
export const allEndpoints: EndpointSpec[] = groups.flatMap((group) => Object.values(group));

const base = '/api/remote-identification/endpoints';
export const pages: Record<string, string> = {
  Health: '/api/remote-identification/overview',
  Certificates: `${base}/certificates`,
  Sessions: `${base}/sessions`,
  'Position reports': `${base}/position-reports`,
  Audit: `${base}/position-reports`,
};
