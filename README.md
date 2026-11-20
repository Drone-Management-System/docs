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
    overview.mdx                  # API catalog and how services connect
    <module>/
      overview.mdx                # environment panel, endpoint index, health
      auth-and-permissions.mdx
      api-conventions.mdx
      endpoints/*.mdx             # one heading + <ApiEndpoint> card per endpoint
  development/
    sign-and-call-api.mdx
  modules/
    caa-registry/                 # maintainer architecture notes
src/
  api/                            # types, snippet generator, browser store, Postman export
  components/
    ApiEndpoint/                  # endpoint card and "Try it" console
    ApiEnvironment/               # per-API base URL, token, Postman download
    EndpointTable/                # endpoint index with method badges
    MethodBadge/
  data/<module>/                  # endpoint specs: params, bodies, responses, errors
```

Documented modules: `caa-registry`, `constraint-management`,
`operations-intents`, `remote-identification`, and `rid-auth-server`.

### How endpoint pages work

Endpoint details live in TypeScript data files under `src/data/<module>/`, one
`EndpointSpec` per endpoint (see `src/api/types.ts`). MDX pages import them and
render a heading plus a card:

```mdx
import ApiEndpoint from '@site/src/components/ApiEndpoint';
import {organizations} from '@site/src/data/caa-registry';

### Create an organization \{#create-organization\}

<ApiEndpoint {...organizations.create} />
```

The heading id must equal the spec `id`, so endpoint tables can link to it.
From one spec the card renders the parameter tables, request examples in cURL,
JavaScript, Python, and HTTP, response and error tabs, the **Try it** console,
and the module's Postman collection export. `bun run typecheck` checks every
spec against the types.

## Backend Relationship

This repository does not run the backend APIs. It documents backend modules that
live beside this project:

| Module | Source |
| --- | --- |
| CAA Registry | `../caa-registry` |
| Constraint Management | `../constraint-management_api` |
| Operations Intents | `../operations-intents` |
| Remote Identification | `../remote-identification` |

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
DOCS_CONSTRAINT_MANAGEMENT_API_BASE_URL=https://constraint-management-api.example.com
DOCS_OPERATIONS_INTENTS_API_BASE_URL=https://operations-intents-api.example.com
DOCS_REMOTE_IDENTIFICATION_API_BASE_URL=https://remote-identification-api.example.com
ZITADEL_DOMAIN=https://zitadel.example.com
PROJECT_ID=000000000000000000
KEY_FILE=./service-user-key.json
API_BASE_URL=https://api.example.com
API_TEST_PATH=/protected-endpoint
```

| Variable | Purpose |
| --- | --- |
| `DOCS_CAA_REGISTRY_API_BASE_URL` | CAA Registry base URL used in examples and as the "Try it" default. |
| `DOCS_CONSTRAINT_MANAGEMENT_API_BASE_URL` | Same for Constraint Management. |
| `DOCS_OPERATIONS_INTENTS_API_BASE_URL` | Same for Operations Intents. |
| `DOCS_REMOTE_IDENTIFICATION_API_BASE_URL` | Same for Remote Identification. |
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
3. Add the `DOCS_*_API_BASE_URL` values as repository Actions variables.
4. Push to `main`.

The workflow installs dependencies, runs type checking, builds the Docusaurus
site, and publishes the `build/` directory to GitHub Pages.

When an API moves to a new host, update the relevant `DOCS_*_API_BASE_URL`
variable, rebuild the docs, and redeploy the static output.

## Adding Another Backend Module

1. Add the API to `src/api/apis.ts` (`ApiId` in `src/api/types.ts`) and its
   `DOCS_<MODULE>_API_BASE_URL` to `docusaurus.config.ts`, `.env.example`, and
   `.github/workflows/deploy-pages.yml`.
2. Describe the endpoints in `src/data/<module>/index.ts` and export
   `allEndpoints` and `pages`.
3. Create `docs/api/<module>/overview.mdx` with `<ApiEnvironment>` and
   `<EndpointTable>`, plus auth, conventions, and `endpoints/` pages.
4. Add the pages to `sidebars.ts`, and link the module from `docs/intro.mdx`,
   `docs/api/overview.mdx`, and the footer.
