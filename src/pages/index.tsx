import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

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
          <Link
            className="button button--secondary button--lg"
            to="/docs/api/caa-registry/overview">
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
    <Layout
      title={siteConfig.title}
      description="Reference documentation for DMS backend modules">
      <HomepageHeader />
      <main>
        <section className={styles.moduleBand}>
          <div className="container">
            <div className={styles.moduleGrid}>
              <article className={styles.moduleCard}>
                <p className={styles.eyebrow}>Public reference</p>
                <Heading as="h2">CAA Registry API</Heading>
                <p>
                  Consumer-facing endpoint docs for organizations, users,
                  operators, UAS records, UA aircraft, lookup, search, and
                  audit history.
                </p>
                <Link to="/docs/api/caa-registry/overview">
                  Read the API reference
                </Link>
              </article>
              <article className={styles.moduleCard}>
                <p className={styles.eyebrow}>Internal reference</p>
                <Heading as="h2">Module Architecture</Heading>
                <p>
                  Implementation notes for the Fastify service, runtime setup,
                  database ownership, startup flow, and data model.
                </p>
                <Link to="/docs/modules/caa-registry/overview">
                  Read architecture notes
                </Link>
              </article>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
