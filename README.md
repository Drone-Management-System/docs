# DMS Backend Docs

DMS Backend Docs is the documentation site for DMS backend modules. It is built
with Docusaurus and is intended to publish two kinds of documentation side by
side:

- Public API references for teams and clients that call backend endpoints.
- Module architecture notes for engineers maintaining the backend services.

The first documented module is CAA Registry. Additional backend modules should
follow the same structure so the site remains predictable as the platform grows.

## Documentation Structure

```text
docs/
  api/
    overview.mdx
    caa-registry/
      overview.mdx
      auth-and-permissions.mdx
      api-conventions.mdx
      endpoints/
  development/
    sign-and-call-api.mdx
  modules/
    caa-registry/
```

Use `docs/api` for public-facing endpoint documentation. Each module gets its
own folder, and endpoint pages should live under that module's `endpoints`
folder.

Use `docs/modules` for implementation and architecture documentation. These
pages can describe service startup, database schema, plugins, internal flows,
and maintenance notes.

Use `docs/development` for shared developer workflows that apply across
modules, such as signing a service-user JWT and calling a protected endpoint.

## Backend Relationship

This repository does not run the backend APIs. It documents backend modules that
live beside this project, such as:

```text
../caa_registry/node-api
```

Deploy backend modules independently. After a module API is available, configure
this docs project with that API's public base URL, rebuild, and deploy the
static site.

## Requirements

- Node.js 20 or newer
- Bun

Install dependencies:

```bash
bun install
```

## Configuration

Create a local environment file:

```bash
cp .env.example .env
```

Set the values for the environment you are documenting:

```env
DOCS_CAA_REGISTRY_API_BASE_URL=https://caa-registry-api.example.com
ZITADEL_DOMAIN=https://zitadel.example.com
PROJECT_ID=000000000000000000
KEY_FILE=./service-user-key.json
API_BASE_URL=https://api.example.com
API_TEST_PATH=/protected-endpoint
```

| Variable | Purpose |
| --- | --- |
| `DOCS_CAA_REGISTRY_API_BASE_URL` | Base URL shown in the CAA Registry API docs. |
| `ZITADEL_DOMAIN` | ZITADEL issuer used by the development signing template. |
| `PROJECT_ID` | ZITADEL project ID used in the token audience scope. |
| `KEY_FILE` | Local service-user JSON key path for development API checks. |
| `API_BASE_URL` | API base URL used by the sign-and-call development script. |
| `API_TEST_PATH` | Protected endpoint path used by the sign-and-call development script. |

Do not commit `.env` or service-user key files. The repository ignores
`service-user-key.json` by default.

## Local Development

Start the documentation server:

```bash
bun run start
```

The development server reads `.env` when Docusaurus starts. Restart it after
changing environment variables.

## Validation

Run the checks before publishing changes:

```bash
bun run typecheck
bun run build
```

`bun run build` generates the static site in `build/`.

## Deployment

The site is configured for GitHub Pages at:

```text
https://drone-management-system.github.io/docs/
```

Deployment is handled by `.github/workflows/deploy-pages.yml`.

1. Deploy the backend module APIs, such as CAA Registry.
2. In GitHub, set the repository Pages source to GitHub Actions.
3. Add `DOCS_CAA_REGISTRY_API_BASE_URL` as a repository Actions variable.
4. Push to `main`.

The workflow installs dependencies, runs type checking, builds the Docusaurus
site, and publishes the `build/` directory to GitHub Pages.

When an API moves to a new host, update the relevant `DOCS_*_API_BASE_URL`
variable, rebuild the docs, and redeploy the static output.

## Adding Another Backend Module

Create a public API section:

```text
docs/api/<module-name>/
  overview.mdx
  auth-and-permissions.mdx
  api-conventions.mdx
  endpoints/
```

Create an architecture section:

```text
docs/modules/<module-name>/
  overview.mdx
```

Then add the new pages to `sidebars.ts`. If the module has its own deployment
URL, add a `DOCS_<MODULE>_API_BASE_URL` variable and expose it through
`docusaurus.config.ts`.
