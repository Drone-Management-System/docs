import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

function loadEnvFile(fileName: string): void {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const caaRegistryApiBaseUrl =
  process.env.DOCS_CAA_REGISTRY_API_BASE_URL ??
  'https://caa-registry-api.example.com';

const config: Config = {
  title: 'DMS Backend Docs',
  tagline: 'Public API references and backend module architecture',
  favicon: 'img/favicon.ico',
  customFields: {
    caaRegistryApiBaseUrl,
  },

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://drone-management-system.github.io',
  baseUrl: '/docs/',
  trailingSlash: false,

  organizationName: 'Drone-Management-System',
  projectName: 'docs',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'DMS Backend Docs',
      logo: {
        alt: 'DMS Backend Docs Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'backendSidebar',
          position: 'left',
          label: 'Docs',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
          ],
        },
        {
          title: 'API Reference',
          items: [
            {
              label: 'API Catalog',
              to: '/docs/api/overview',
            },
            {
              label: 'CAA Registry',
              to: '/docs/api/caa-registry/overview',
            },
          ],
        },
        {
          title: 'Module Architecture',
          items: [
            {
              label: 'CAA Registry Module',
              to: '/docs/modules/caa-registry/overview',
            },
            {
              label: 'Data Model',
              to: '/docs/modules/caa-registry/data-model',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DMS Backend Docs.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
