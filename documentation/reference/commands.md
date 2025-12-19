---
title: Commands reference
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - commands
  - scripts
  - yarn
  - reference
---

## Overview

Common yarn commands for developing and testing the tldraw monorepo.

## Development

```bash
yarn dev

yarn dev-app

yarn dev-docs

yarn dev-vscode
```

## Testing

```bash
yarn test run

yarn test run --grep "selection"

yarn e2e

yarn e2e-dotcom
```

## Code quality

```bash
yarn lint

yarn typecheck

yarn format

yarn api-check
```

## Builds

```bash
yarn build

yarn build-package <name>

yarn build-docs

yarn build-dotcom
```

## Key files

- package.json - Workspace scripts
- lazy.config.ts - Build orchestration

## Related

- [Getting started](../overview/getting-started.md)
- [LazyRepo](../tooling/lazyrepo.md)
