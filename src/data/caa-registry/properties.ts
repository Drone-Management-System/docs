import {bearerErrors, idParam, page, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, JsonValue, Param} from '@site/src/api/types';

import {IDS} from './samples';

const api = 'caa-registry' as const;

interface Owner {
  key: 'operator' | 'organization' | 'ua';
  label: string;
  plural: string;
  permission: 'operators' | 'organizations' | 'ua';
  namesPath: string;
  valuesPath: string;
  nameIdField: string;
  valueIdField: string;
  valueNameField: string;
  parentField: string;
  parentId: string;
  parentNotFound: string;
  nameId: string;
  valueId: string;
  definition: {[key: string]: JsonValue};
  value: string;
  orgScoped: boolean;
}

const owners: Owner[] = [
  {
    key: 'operator', label: 'operator', plural: 'operators', permission: 'operators',
    namesPath: '/operator-property-names', valuesPath: '/operator-properties',
    nameIdField: 'operators_properties_names_id', valueIdField: 'operators_properties_id',
    valueNameField: 'operators_properties_name_id', parentField: 'operator_id', parentId: IDS.operator,
    parentNotFound: 'operator_not_found', nameId: IDS.operatorPropertyName, valueId: IDS.operatorProperty,
    definition: {name: 'insurance_policy_expiry', description: 'Liability insurance expiry date', data_type: 'date', is_required: true, is_unique: true, domain_values: {kind: 'range', min: {relative: 'today'}}},
    value: '2027-03-31', orgScoped: true,
  },
  {
    key: 'organization', label: 'organization', plural: 'organizations', permission: 'organizations',
    namesPath: '/organization-property-names', valuesPath: '/organization-properties',
    nameIdField: 'organization_properties_names_id', valueIdField: 'organization_properties_id',
    valueNameField: 'organization_properties_name_id', parentField: 'org_id', parentId: IDS.org,
    parentNotFound: 'organization_not_found', nameId: IDS.organizationPropertyName, valueId: IDS.organizationProperty,
    definition: {name: 'trade_license_tier', description: 'Commercial license tier', data_type: 'string', is_required: false, is_unique: true, domain_values: {kind: 'set', values: ['BASIC', 'STANDARD', 'PREMIUM']}},
    value: 'STANDARD', orgScoped: false,
  },
  {
    key: 'ua', label: 'UA aircraft', plural: 'UA aircraft', permission: 'ua',
    namesPath: '/ua-property-names', valuesPath: '/ua-properties',
    nameIdField: 'ua_properties_names_id', valueIdField: 'ua_properties_id',
    valueNameField: 'ua_properties_name_id', parentField: 'ua_id', parentId: IDS.ua,
    parentNotFound: 'ua_not_found', nameId: IDS.uaPropertyName, valueId: IDS.uaProperty,
    definition: {name: 'payload_capacity_kg', description: 'Maximum payload mass', data_type: 'number', is_required: false, is_unique: true, domain_values: {kind: 'range', min: 0, max: 25}},
    value: '2.5', orgScoped: true,
  },
];

const definitionFields: Param[] = [
  {name: 'name', type: 'string', required: true, description: 'Unique property name.'},
  {name: 'description', type: 'string | null', description: 'Human-readable description.'},
  {name: 'data_type', type: 'enum', description: 'One of `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `json`.', default: 'string'},
  {name: 'is_required', type: 'boolean', description: 'Values cannot be empty. Applies to new and changed values only.', default: 'false'},
  {name: 'is_unique', type: 'boolean', description: 'At most one value per parent record.', default: 'false'},
  {name: 'domain_values', type: 'object | null', description: 'Allowed values. `{"kind":"set","values":[...]}` for any type, or `{"kind":"range","min":...,"max":...}` for `integer`, `number`, `date`, and `datetime`. Date bounds may be relative, for example `{"relative":"today","years":-18}`.'},
];

function definitionEndpoints(owner: Owner) {
  const row = {[owner.nameIdField]: owner.nameId, ...owner.definition};
  const group = 'Custom properties';
  const entity = `${owner.key}_property_name`;
  const param = idParam('propertyNameId', `Property definition id (\`${owner.nameIdField}\`).`, owner.nameId);
  const writeErrors = [
    {status: 400, detail: 'payload_invalid', when: 'The body is not an object or has unknown keys.'},
    {status: 400, detail: 'name_invalid', when: '`name` is missing or blank. Other fields use `<field>_invalid`.'},
    {status: 400, detail: 'data_type_invalid', when: '`data_type` is not supported.'},
    {status: 400, detail: 'domain_values_invalid', when: 'The domain does not match the data type or shape rules.'},
    {status: 409, detail: `${entity}_already_exists`, when: 'Another definition uses this name.'},
  ];
  return {
    list: {
      id: `list-${owner.key}-property-names`, api, group, method: 'GET', path: owner.namesPath,
      title: `List ${owner.label} property definitions`, permission: `${owner.permission}.read`,
      description: 'Sorted by name.',
      queryParams: [{name: 'q', type: 'string', description: 'Case-insensitive match on `name` or `description`.'}, ...paging()],
      responses: [{status: 200, body: page([row])}],
      errors: [...PAGING_ERRORS, {status: 400, detail: 'q_invalid', when: '`q` contains characters PostgreSQL cannot store.'}, ...bearerErrors(`${owner.permission}.read`)],
    },
    get: {
      id: `get-${owner.key}-property-name`, api, group, method: 'GET', path: `${owner.namesPath}/:propertyNameId`,
      title: `Get a ${owner.label} property definition`, permission: `${owner.permission}.read`, pathParams: [param],
      responses: [{status: 200, body: row}],
      errors: [{status: 400, detail: `${owner.nameIdField}_invalid`, when: 'Not a UUID.'}, {status: 404, detail: `${entity}_not_found`, when: 'No definition has this id.'}, ...bearerErrors(`${owner.permission}.read`)],
    },
    create: {
      id: `create-${owner.key}-property-name`, api, group, method: 'POST', path: owner.namesPath,
      title: `Create a ${owner.label} property definition`, permission: `${owner.permission}.write`,
      bodyFields: definitionFields, body: owner.definition,
      responses: [{status: 201, body: row}],
      errors: [...writeErrors, ...bearerErrors(`${owner.permission}.write`)],
    },
    replace: {
      id: `replace-${owner.key}-property-name`, api, group, method: 'PUT', path: `${owner.namesPath}/:propertyNameId`,
      title: `Replace a ${owner.label} property definition`, permission: `${owner.permission}.write`,
      description: 'Changing `data_type` or `domain_values` re-checks every stored value. Turning on `is_required` does not invalidate existing empty values.',
      pathParams: [param], bodyFields: definitionFields, body: owner.definition,
      responses: [{status: 200, body: row}],
      errors: [
        ...writeErrors,
        {status: 404, detail: `${entity}_not_found`, when: 'No definition has this id.'},
        {status: 409, detail: `${entity}_duplicates_exist`, when: '`is_unique` is turned on but a parent already has several values.'},
        {status: 409, detail: `${entity}_values_conflict`, when: 'Stored values do not fit the new type or domain.'},
        ...bearerErrors(`${owner.permission}.write`),
      ],
    },
    remove: {
      id: `delete-${owner.key}-property-name`, api, group, method: 'DELETE', path: `${owner.namesPath}/:propertyNameId`,
      title: `Delete a ${owner.label} property definition`, permission: `${owner.permission}.delete`,
      description: 'Deletes the definition and every value assigned under it.',
      pathParams: [param],
      responses: [{status: 200, description: 'The deleted definition.', body: row}],
      errors: [{status: 404, detail: `${entity}_not_found`, when: 'No definition has this id.'}, ...bearerErrors(`${owner.permission}.delete`)],
    },
  } satisfies Record<string, EndpointSpec>;
}

function valueEndpoints(owner: Owner) {
  const write = {[owner.parentField]: owner.parentId, [owner.valueNameField]: owner.nameId, value: owner.value};
  const row = {[owner.valueIdField]: owner.valueId, ...write};
  const group = 'Custom properties';
  const entity = `${owner.key}_property`;
  const param = idParam(`${owner.key === 'organization' ? 'organization' : owner.key}PropertyId`, `Property value id (\`${owner.valueIdField}\`).`, owner.valueId);
  const fields: Param[] = [
    {name: owner.parentField, type: 'uuid', required: true, description: `The ${owner.label} that owns the value.`},
    {name: owner.valueNameField, type: 'uuid', required: true, description: 'Property definition id.'},
    {name: 'value', type: 'string | null', description: 'Always sent as a string and parsed by the definition `data_type`, for example `"42"`, `"true"`, `"2027-03-31"`, or a JSON string.'},
  ];
  const writeErrors = [
    {status: 400, detail: 'payload_invalid', when: 'The body is not an object or has unknown keys.'},
    {status: 400, detail: `${owner.parentField}_invalid`, when: 'Not a UUID.'},
    {status: 400, detail: 'value_required', when: 'The definition is required and the value is empty.'},
    {status: 400, detail: 'value_invalid', when: 'The value cannot be parsed as the definition type.'},
    {status: 400, detail: 'value_out_of_domain', when: 'The value is outside the allowed set or range.'},
    {status: 404, detail: `${entity}_name_not_found`, when: 'The definition does not exist.'},
    {status: 404, detail: owner.parentNotFound, when: `The ${owner.label} does not exist.`},
    {status: 409, detail: `${entity}_duplicate_definition`, when: 'The definition is unique and the parent already has a value.'},
  ];
  const queryParams: Param[] = [
    {name: owner.parentField, type: 'uuid', description: `Only values of this ${owner.label}.`, example: owner.parentId},
    ...(owner.orgScoped ? [{name: 'org_id', type: 'uuid', description: `Only values whose ${owner.label} currently belongs to this organization.`}] : []),
    {name: owner.valueNameField, type: 'uuid', description: 'Only values of this definition.'},
    ...paging(),
  ];
  return {
    list: {
      id: `list-${owner.key}-properties`, api, group, method: 'GET', path: owner.valuesPath,
      title: `List ${owner.label} property values`, permission: `${owner.permission}.read`,
      queryParams, responses: [{status: 200, body: page([row])}],
      errors: [...PAGING_ERRORS, ...bearerErrors(`${owner.permission}.read`)],
    },
    get: {
      id: `get-${owner.key}-property`, api, group, method: 'GET', path: `${owner.valuesPath}/:${param.name}`,
      title: `Get a ${owner.label} property value`, permission: `${owner.permission}.read`, pathParams: [param],
      responses: [{status: 200, body: row}],
      errors: [{status: 404, detail: `${entity}_not_found`, when: 'No value has this id.'}, ...bearerErrors(`${owner.permission}.read`)],
    },
    create: {
      id: `create-${owner.key}-property`, api, group, method: 'POST', path: owner.valuesPath,
      title: `Assign a ${owner.label} property value`, permission: `${owner.permission}.write`,
      bodyFields: fields, body: write,
      responses: [{status: 201, body: row}],
      errors: [...writeErrors, ...bearerErrors(`${owner.permission}.write`)],
    },
    replace: {
      id: `replace-${owner.key}-property`, api, group, method: 'PUT', path: `${owner.valuesPath}/:${param.name}`,
      title: `Replace a ${owner.label} property value`, permission: `${owner.permission}.write`,
      description: 'An assignment that was already empty may stay empty after its definition became required.',
      pathParams: [param], bodyFields: fields, body: write,
      responses: [{status: 200, body: row}],
      errors: [...writeErrors, {status: 404, detail: `${entity}_not_found`, when: 'No value has this id.'}, {status: 409, detail: `${entity}_changed`, when: 'The value was moved by a concurrent write. Re-read and retry.'}, ...bearerErrors(`${owner.permission}.write`)],
    },
    remove: {
      id: `delete-${owner.key}-property`, api, group, method: 'DELETE', path: `${owner.valuesPath}/:${param.name}`,
      title: `Delete a ${owner.label} property value`, permission: `${owner.permission}.delete`, pathParams: [param],
      responses: [{status: 200, description: 'The deleted value.', body: row}],
      errors: [{status: 404, detail: `${entity}_not_found`, when: 'No value has this id.'}, ...bearerErrors(`${owner.permission}.delete`)],
    },
  } satisfies Record<string, EndpointSpec>;
}

export const operatorPropertyNames = definitionEndpoints(owners[0]);
export const organizationPropertyNames = definitionEndpoints(owners[1]);
export const uaPropertyNames = definitionEndpoints(owners[2]);
export const operatorProperties = valueEndpoints(owners[0]);
export const organizationProperties = valueEndpoints(owners[1]);
export const uaProperties = valueEndpoints(owners[2]);
