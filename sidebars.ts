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
                'api/caa-registry/endpoints/operators',
                'api/caa-registry/endpoints/uas',
                'api/caa-registry/endpoints/ua-aircraft',
                'api/caa-registry/endpoints/lookup-and-search',
                'api/caa-registry/endpoints/audit',
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
          ],
        },
      ],
    },
  ],
};

export default sidebars;
