---
title: Commands reference
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - commands
  - scripts
  - yarn
  - reference
status: published
date: 12/19/2025
order: 1
---

Common yarn commands for developing and testing the tldraw monorepo.

## Development

Start development servers for different parts of the monorepo. Each command watches for changes and provides hot reload.

```bash
yarn dev           # Examples app (main SDK showcase)
yarn dev-app       # tldraw.com client
yarn dev-docs      # Documentation site (tldraw.dev)
yarn dev-vscode    # VSCode extension
```

## Testing

Run tests using Vitest for unit tests and Playwright for end-to-end tests. Filter tests by pattern with `--grep`.

```bash
yarn test run                      # Run all tests
yarn test run --grep "selection"   # Filter by pattern
yarn e2e                           # E2E tests for examples
yarn e2e-dotcom                    # E2E tests for tldraw.com
```

## Code quality

Lint, type check, and format code. Run these before committing to catch issues early.

```bash
yarn lint       # ESLint checks
yarn typecheck  # TypeScript type checking (from repo root)
yarn format     # Prettier formatting
yarn api-check  # Validate public API consistency
```

## Builds

Build packages and apps. LazyRepo handles incremental builds automatically.

```bash
yarn build              # Build all changed packages
yarn build-package <n>  # Build a specific package
yarn build-docs         # Build documentation site
yarn build-dotcom       # Build tldraw.com
```

## Key files

- package.json - Workspace scripts
- lazy.config.ts - Build orchestration

## Related

- [Getting started](../overview/getting-started.md)
- [LazyRepo](../tooling/lazyrepo.md)
