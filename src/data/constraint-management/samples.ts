import type {JsonValue} from '@site/src/api/types';

export const IDS = {
  org: '8c3198d0-6f9d-4a41-b276-6b60da0bdf54',
  volume3d: '3d000000-1a2b-4c3d-8e4f-5a6b7c8d9e01',
  volume4d: '4d000000-2b3c-4d4e-9f5a-6b7c8d9e0f02',
  area: 'a0000000-3c4d-4e5f-8a6b-7c8d9e0f1a03',
  exitArea: 'a0000000-4d5e-4f6a-9b7c-8d9e0f1a2b04',
  monitoringZone: 'b0000000-5e6f-4a7b-8c8d-9e0f1a2b3c05',
  noFlyZone: 'c0000000-6f7a-4b8c-9d9e-0f1a2b3c4d06',
  identificationZone: 'd0000000-7a8b-4c9d-8e0f-1a2b3c4d5e07',
  corridor: 'e0000000-8b9c-4d0e-9f1a-2b3c4d5e6f08',
  rule: 'f0000000-9c0d-4e1f-8a2b-3c4d5e6f7a09',
  propertyName: '1b000000-0d1e-4f2a-9b3c-4d5e6f7a8b10',
  property: '2c000000-1e2f-4a3b-8c4d-5e6f7a8b9c11',
  link: '3e000000-2f3a-4b4c-9d5e-6f7a8b9c0d12',
  audit: '4f000000-3a4b-4c5d-8e6f-7a8b9c0d1e13',
};

export const ACTOR = '312244512312345678';
export const TS = '2026-06-01T09:00:00.000Z';
export const TS2 = '2026-06-02T14:15:00.000Z';

const base = (id: string) => ({id, created_at: TS, updated_at: TS, created_by: ACTOR, updated_by: ACTOR});

export const footprint = {
  type: 'Polygon',
  coordinates: [[[55.2708, 25.2048], [55.2808, 25.2048], [55.2808, 25.2148], [55.2708, 25.2148], [55.2708, 25.2048]]],
} satisfies JsonValue;

export const footprintStored = {
  type: 'MultiPolygon',
  coordinates: [footprint.coordinates],
} satisfies JsonValue;

export const volume3dWrite = {
  name: 'Downtown no-fly footprint',
  footprint,
  altitude_lower_m: 0,
  altitude_upper_m: '150',
  altitude_check: true,
  altitude_reference_code: 'AGL',
} satisfies JsonValue;

export const volume3d = {
  ...base(IDS.volume3d),
  name: 'Downtown no-fly footprint',
  footprint: footprintStored,
  altitude_lower_m: '0.00',
  altitude_upper_m: '150.00',
  altitude_check: true,
  altitude_reference_code: 'AGL',
} satisfies JsonValue;

export const status = {
  code: 'ACTIVE',
  name: 'Active',
  description: 'Available for use and currently in effect.',
  created_at: TS,
  updated_at: TS,
} satisfies JsonValue;

export const rule = {
  ...base(IDS.rule),
  name: 'Emergency services only',
  type: 'PRIMARY',
  action: 'DENY',
  command: 'operator.type != "EMERGENCY"',
} satisfies JsonValue;

export const propertyName = {
  ...base(IDS.propertyName),
  name: 'max_noise_db',
  description: 'Maximum permitted noise level',
  data_type: 'integer',
  is_required: false,
  is_unique: true,
  domain_values: {type: 'range', min: 40, max: 90},
} satisfies JsonValue;

export const property = {
  ...base(IDS.property),
  volume_4d_id: IDS.volume4d,
  volume_4d_properties_name_id: IDS.propertyName,
  value: '65',
  property_name: propertyName,
} satisfies JsonValue;

export const volume4dRow = {
  ...base(IDS.volume4d),
  name: 'Downtown no-fly window',
  rule_id: IDS.rule,
  default_accessibility: 'DENY',
  volume_3d_id: IDS.volume3d,
  permanent: false,
  valid_from: '2026-06-10T06:00:00.000Z',
  valid_to: '2026-06-10T22:00:00.000Z',
  status_code: 'ACTIVE',
} satisfies JsonValue;

export const volume4d = {
  ...volume4dRow,
  volume_3d: volume3d,
  status,
  properties: [property],
  rule,
} satisfies JsonValue;

export const volume4dWrite = {
  name: 'Downtown no-fly window',
  rule_id: IDS.rule,
  default_accessibility: 'DENY',
  volume_3d_id: IDS.volume3d,
  permanent: false,
  valid_from: '2026-06-10T06:00:00Z',
  valid_to: '2026-06-10T22:00:00Z',
  status_code: 'ACTIVE',
} satisfies JsonValue;

export const nestedVolume4dWrite = {
  name: 'Downtown no-fly window',
  rule_id: IDS.rule,
  permanent: false,
  valid_from: '2026-06-10T06:00:00Z',
  valid_to: '2026-06-10T22:00:00Z',
  volume_3d: volume3dWrite,
} satisfies JsonValue;

export const permanentVolume4dWrite = {
  name: 'Airport control zone',
  permanent: true,
  volume_3d: {...volume3dWrite, name: 'Airport control zone footprint', altitude_upper_m: '600'},
} satisfies JsonValue;

export const areaRow = {...base(IDS.area), name: 'Marina launch pad', org_id: IDS.org, description: 'Gate area for the coastal corridor'} satisfies JsonValue;
export const exitAreaRow = {...base(IDS.exitArea), name: 'Port Rashid landing pad', org_id: IDS.org, description: null} satisfies JsonValue;
