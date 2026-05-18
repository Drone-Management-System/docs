import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type CustomFields = {
  caaRegistryApiBaseUrl?: string;
};

export default function ApiBaseUrl(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const {caaRegistryApiBaseUrl} = siteConfig.customFields as CustomFields;

  return <code>{caaRegistryApiBaseUrl ?? 'https://caa-registry-api.example.com'}</code>;
}
