import type {JsonValue} from '@site/src/api/types';

export const IDS = {
  org: '8c3198d0-6f9d-4a41-b276-6b60da0bdf54',
  org2: '1f0e6a52-93c4-4d8e-a7b1-0c2d3e4f5a6b',
  user: 'afdf33ff-3db4-4972-b89a-2ea1f9e0a708',
  operator: '4af8a923-2e8f-47f9-9c57-2a4f8ba4050e',
  ua: 'c5d1f3a2-8b7e-4f61-9a0d-3e2b1c4d5f60',
  remoteId: '2f6b8c1e-5a4d-4e3f-9b2a-7c8d9e0f1a2b',
  orgAdmin: '6e1a9c3b-7d2f-4a8e-b5c6-0f1e2d3c4b5a',
  zitadelUser: '298183789123456789',
  job: '0b9a8c7d-6e5f-4a3b-9c2d-1e0f2a3b4c5d',
  audit: 'd4c3b2a1-0f9e-4d8c-b7a6-5e4d3c2b1a09',
  operatorPropertyName: '3a7c1e9b-2d4f-4b6a-8c0e-1f3a5b7c9d2e',
  organizationPropertyName: '5b8d2f0c-3e5a-4c7b-9d1f-2a4b6c8d0e3f',
  uaPropertyName: '7c9e3a1d-4f6b-4d8c-a0e2-3b5c7d9e1f4a',
  operatorProperty: '9d0f4b2e-5a7c-4e9d-b1f3-4c6d8e0f2a5b',
  organizationProperty: 'a1b2c3d4-6b8d-4f0e-c2a4-5d7e9f1a3b6c',
  uaProperty: 'b2c3d4e5-7c9e-4a1f-d3b5-6e8f0a2b4c7d',
};

export const TS = '2026-05-14T08:00:00.000Z';
export const TS2 = '2026-05-20T10:30:00.000Z';

export const organization = {
  org_id: IDS.org,
  org_name: 'Skyline Aerial Services',
  organization_kind: 'OPERATOR',
  contact_email: 'ops@skyline.example',
  contact_phone: '+971500000001',
  country_code: 'AE',
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export const organizationWrite = {
  org_name: 'Skyline Aerial Services',
  organization_kind: 'OPERATOR',
  contact_email: 'ops@skyline.example',
  contact_phone: '+971500000001',
  country_code: 'ae',
} satisfies JsonValue;

export const user = {
  user_id: IDS.user,
  org_id: IDS.org,
  user_type_id: 1,
  zitadel_user_id: IDS.zitadelUser,
  zitadel_status: 'active',
  zitadel_deleted_at: null,
  zitadel_last_synced_at: TS,
  national_id_number: '784198012345671',
  national_id_country_code: 'AE',
  national_id_type: 'emirates_id',
  full_name: 'Amina Hassan',
  email: 'amina@skyline.example',
  phone: '+971500000002',
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export const userWrite = {
  org_id: IDS.org,
  user_type_id: 1,
  national_id_number: '784198012345671',
  national_id_country_code: 'ae',
  national_id_type: 'EMIRATES_ID',
  full_name: 'Amina Hassan',
  email: 'Amina@Skyline.example',
  phone: '+971500000002',
} satisfies JsonValue;

export const operatorType = {operator_type_id: 1, code: 'COMMERCIAL', description: 'Commercial UAS operator'} satisfies JsonValue;
export const userType = {user_type_id: 1, code: 'REMOTE_PILOT', description: 'Remote pilot in command'} satisfies JsonValue;

export const operator = {
  operator_id: IDS.operator,
  org_id: IDS.org,
  primary_user_id: IDS.user,
  operator_type_id: 1,
  approval_reference: 'CAA-OP-2026-001',
  approval_valid_from: '2026-01-01',
  approval_valid_to: '2026-12-31',
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export const operatorWrite = {
  org_id: IDS.org,
  primary_user_id: IDS.user,
  operator_type_id: 1,
  approval_reference: 'CAA-OP-2026-001',
  approval_valid_from: '2026-01-01',
  approval_valid_to: '2026-12-31',
} satisfies JsonValue;

export const ua = {
  ua_id: IDS.ua,
  org_id: IDS.org,
  aircraft_type: 'MULTIROTOR',
  propulsion_type: 'ELECTRIC',
  mass_kg: '1.25',
  max_airspeed_mps: '19.50',
  max_altitude_m: '120.00',
  endurance_minutes: 38,
  registration_id: 'UAE-UA-000123',
  serial_number: 'SN-4F7A-2026-0091',
  model_name: 'Mavic 3 Enterprise',
  remote_id_capable: true,
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export const uaWrite = {
  org_id: IDS.org,
  registration_id: 'UAE-UA-000123',
  serial_number: 'SN-4F7A-2026-0091',
  model_name: 'Mavic 3 Enterprise',
  remote_id_capable: true,
  aircraft_type: 'MULTIROTOR',
  propulsion_type: 'ELECTRIC',
  mass_kg: '1.25',
  max_airspeed_mps: 19.5,
  max_altitude_m: 120,
  endurance_minutes: 38,
} satisfies JsonValue;

export const remoteId = {
  remote_id_id: IDS.remoteId,
  org_id: IDS.org,
  reference: 'RID-CERT-2026-0042',
  subject_name: 'CN=UAE-UA-000123',
  valid_from: '2026-06-01T00:00:00.000Z',
  valid_to: '2027-06-01T00:00:00.000Z',
  status_code: 'ACTIVE',
} satisfies JsonValue;

export const remoteIdWrite = {
  org_id: IDS.org,
  reference: 'RID-CERT-2026-0042',
  subject_name: 'CN=UAE-UA-000123',
  valid_from: '2026-06-01T00:00:00Z',
  valid_to: '2027-06-01T00:00:00Z',
  status_code: 'ACTIVE',
} satisfies JsonValue;

export const organizationAdmin = {
  organization_admin_id: IDS.orgAdmin,
  org_id: IDS.org,
  user_id: IDS.user,
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export function auditRow(entityType: string, entityId: string, action: string, after: JsonValue, before: JsonValue = null): JsonValue {
  return {
    audit_id: IDS.audit,
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor: 'amina@skyline.example',
    correlation_id: null,
    created_at: TS2,
    before_json: before,
    after_json: after,
  };
}
