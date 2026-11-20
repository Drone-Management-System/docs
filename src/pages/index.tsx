import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import {allEndpoints as caaEndpoints} from '@site/src/data/caa-registry';
import {allEndpoints as cmEndpoints} from '@site/src/data/constraint-management';
import {allEndpoints as oiEndpoints} from '@site/src/data/operations-intents';
import {allEndpoints as ridEndpoints} from '@site/src/data/remote-identification';

import styles from './index.module.css';

const apis = [
  {
    name: 'CAA Registry',
    to: '/api/caa-registry/overview',
    count: caaEndpoints.length,
    description: 'Organizations, users, operators, UA aircraft, Remote IDs, custom properties, filters, and audit history.',
  },
  {
    name: 'Constraint Management',
    to: '/api/constraint-management/overview',
    count: cmEndpoints.length,
    description: 'Areas, zones, corridors, 3D and 4D volumes, rules, and the cached constraint snapshot.',
  },
  {
    name: 'Operations Intents',
    to: '/api/operations-intents/overview',
    count: oiEndpoints.length,
    description: 'Planned operations with CONOPS and risk, validation against constraints, and approval review.',
  },
  {
    name: 'Remote Identification',
    to: '/api/remote-identification/overview',
    count: ridEndpoints.length,
    description: 'Remote ID certificates, flight sessions, and received position reports.',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/api/overview">
            Open API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description="Reference documentation for DMS backend modules">
      <HomepageHeader />
      <main>
        <section className={styles.moduleBand}>
          <div className="container">
            <div className={styles.moduleGrid}>
              {apis.map((api) => (
                <article key={api.name} className={styles.moduleCard}>
                  <p className={styles.eyebrow}>Public reference · {api.count} endpoints</p>
                  <Heading as="h2">{api.name} API</Heading>
                  <p>{api.description}</p>
                  <Link to={api.to}>Read the API reference</Link>
                </article>
              ))}
              <article className={clsx(styles.moduleCard, styles.wide)}>
                <p className={styles.eyebrow}>Internal reference</p>
                <Heading as="h2">Module Architecture</Heading>
                <p>
                  Implementation notes for the CAA Registry service: runtime setup, database ownership, startup flow,
                  system jobs, and the data model.
                </p>
                <Link to="/modules/caa-registry/overview">Read architecture notes</Link>
              </article>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
