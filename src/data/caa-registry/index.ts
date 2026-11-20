import type {EndpointSpec} from '@site/src/api/types';

import {health, operatorTypes, organizationAdmins, organizations, userTypes, users, zitadel} from './core';
import {filters} from './filters';
import {
  operatorProperties,
  operatorPropertyNames,
  organizationProperties,
  organizationPropertyNames,
  uaProperties,
  uaPropertyNames,
} from './properties';
import {aircraft, audit, lookup, operators, remoteIds} from './registry';
import {systemJobs} from './system-jobs';

export {
  aircraft,
  audit,
  filters,
  health,
  lookup,
  operatorProperties,
  operatorPropertyNames,
  operators,
  operatorTypes,
  organizationAdmins,
  organizationProperties,
  organizationPropertyNames,
  organizations,
  remoteIds,
  systemJobs,
  uaProperties,
  uaPropertyNames,
  users,
  userTypes,
  zitadel,
};

const groups: Record<string, EndpointSpec>[] = [
  health,
  operatorTypes,
  userTypes,
  organizations,
  organizationAdmins,
  users,
  zitadel,
  operators,
  aircraft,
  remoteIds,
  organizationPropertyNames,
  operatorPropertyNames,
  uaPropertyNames,
  organizationProperties,
  operatorProperties,
  uaProperties,
  lookup,
  audit,
  filters,
  systemJobs,
];

export const allEndpoints: EndpointSpec[] = groups.flatMap((group) => Object.values(group));

const base = '/api/caa-registry/endpoints';

/** Documentation page for each endpoint group. */
export const pages: Record<string, string> = {
  Health: '/api/caa-registry/overview',
  'Reference data': `${base}/reference-data`,
  Organizations: `${base}/organizations`,
  'Organization admins': `${base}/organizations`,
  Users: `${base}/users`,
  'ZITADEL integrations': `${base}/zitadel-integrations`,
  Operators: `${base}/operators`,
  'UA aircraft': `${base}/ua-aircraft`,
  'Remote IDs': `${base}/remote-ids`,
  'Custom properties': `${base}/custom-properties`,
  'Lookup and search': `${base}/lookup-and-search`,
  Audit: `${base}/audit`,
  Filters: `${base}/filters`,
  'System jobs': `${base}/system-jobs`,
};
