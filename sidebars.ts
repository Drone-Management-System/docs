import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  backendSidebar: [
    'intro',
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api/overview',
        {
          type: 'category',
          label: 'CAA Registry',
          collapsed: false,
          items: [
            'api/caa-registry/overview',
            'api/caa-registry/auth-and-permissions',
            'api/caa-registry/api-conventions',
            {
              type: 'category',
              label: 'Endpoints',
              collapsed: false,
              items: [
                'api/caa-registry/endpoints/reference-data',
                'api/caa-registry/endpoints/organizations',
                'api/caa-registry/endpoints/users',
                'api/caa-registry/endpoints/zitadel-integrations',
                'api/caa-registry/endpoints/operators',
                'api/caa-registry/endpoints/ua-aircraft',
                'api/caa-registry/endpoints/remote-ids',
                'api/caa-registry/endpoints/custom-properties',
                'api/caa-registry/endpoints/lookup-and-search',
                'api/caa-registry/endpoints/filters',
                'api/caa-registry/endpoints/audit',
                'api/caa-registry/endpoints/system-jobs',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Constraint Management',
          collapsed: false,
          items: [
            'api/constraint-management/overview',
            'api/constraint-management/auth-and-permissions',
            'api/constraint-management/api-conventions',
            {
              type: 'category',
              label: 'Endpoints',
              collapsed: false,
              items: [
                'api/constraint-management/endpoints/airspace-constraints',
                'api/constraint-management/endpoints/volumes',
                'api/constraint-management/endpoints/volume-properties',
                'api/constraint-management/endpoints/rules',
                'api/constraint-management/endpoints/snapshot-and-audit',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Operations Intents',
          collapsed: false,
          items: [
            'api/operations-intents/overview',
            'api/operations-intents/auth-and-permissions',
            'api/operations-intents/api-conventions',
            {
              type: 'category',
              label: 'Endpoints',
              collapsed: false,
              items: [
                'api/operations-intents/endpoints/operational-intents',
                'api/operations-intents/endpoints/review-workflow',
                'api/operations-intents/endpoints/volumes',
                'api/operations-intents/endpoints/conops-and-risk',
                'api/operations-intents/endpoints/audit-log',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Remote Identification',
          collapsed: false,
          items: [
            'api/remote-identification/overview',
            {
              type: 'category',
              label: 'Endpoints',
              collapsed: false,
              items: [
                'api/remote-identification/endpoints/certificates',
                'api/remote-identification/endpoints/sessions',
                'api/remote-identification/endpoints/position-reports',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'RID Auth Server',
          collapsed: false,
          items: [
            'api/rid-auth-server/overview',
            'api/rid-auth-server/api-conventions',
            {
              type: 'category',
              label: 'Endpoints',
              collapsed: false,
              items: [
                'api/rid-auth-server/endpoints/provisioning',
                'api/rid-auth-server/endpoints/verification',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: false,
      items: [
        'development/sign-and-call-api',
      ],
    },
    {
      type: 'category',
      label: 'Module Architecture',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'CAA Registry',
          collapsed: false,
          items: [
            'modules/caa-registry/overview',
            'modules/caa-registry/getting-started',
            'modules/caa-registry/data-model',
            'modules/caa-registry/system-jobs',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
