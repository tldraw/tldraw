# Templates

Each folder here is a starter kit that people can clone with `npm create tldraw`. This file is for people who work on the templates in this repo. It is not exported with any template.

## Deploys

Templates with a `deploy` entry in their `package.json` deploy to their `deploy.host` from `.github/workflows/deploy-templates.yml` and on release. A template's worker secrets are listed in `deploy.secrets`, by the name the worker reads (for example `OPENROUTER_API_KEY`). At deploy time, `internal/scripts/deploy-template.ts` reads each one from the environment variable `TEMPLATES_<TEMPLATE>_<NAME>` (for `branching-chat`, `TEMPLATES_BRANCHING_CHAT_OPENROUTER_API_KEY`) and uploads it to Cloudflare. A missing value fails that template's deploy.

To add a secret to a template:

1. Add its name to `deploy.secrets`.
2. In `.github/actions/deploy-templates/action.yml`, set `TEMPLATES_<TEMPLATE>_<NAME>` from an action input.
3. Pass that input from a GitHub secret in the `deploy-production` environment, in both `deploy-templates.yml` and `publish.yml`.
