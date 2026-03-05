## Cursor Cloud specific instructions

### Environment

- Node.js 20 is required (`engines.node: ^20.0.0`). Install via nvm: `nvm install 20 && nvm use 20`.
- Corepack must be enabled for Yarn 4.12: `npm i -g corepack`.
- Install dependencies: `yarn` (runs `husky install` and `refresh-assets` via postinstall).

### Running services

- `yarn dev` starts the SDK examples app at `localhost:5420` along with `bemo-worker` (:8989) and `image-resize-worker` (:8786). No Docker required.
- `yarn dev-app` (tldraw.com) requires Docker for PostgreSQL. Not needed for SDK development.

### Commands reference

All standard commands are documented in `CLAUDE.md`. Key gotchas:

- **Never run bare `tsc`** — always use `yarn typecheck` from the repo root.
- **Lint**: `yarn lint` runs repo-wide; `yarn lint-current` lints changed files but may OOM on large diffs — increase heap with `NODE_OPTIONS="--max-old-space-size=4096"` or lint specific packages instead (e.g., `cd packages/editor && yarn lint`).
- **Tests**: Run in a workspace with `cd packages/tldraw && yarn test run`. Avoid `yarn vitest` (runs all tests, slow).
- **Build**: `yarn build-package` builds SDK packages only. `yarn build` builds everything.

### Pre-commit hooks

The husky pre-commit hook runs `yarn install --immutable`, `build-api`, `build-i18n`, and `lint-staged`. The pre-push hook requires `git-lfs`.
