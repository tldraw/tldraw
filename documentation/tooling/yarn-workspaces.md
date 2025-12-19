---
title: Yarn workspaces
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - yarn
  - workspaces
  - monorepo
  - packages
---

## Overview

tldraw uses Yarn workspaces to manage packages, apps, and templates in a single monorepo.

## Common commands

```bash
yarn workspace @tldraw/editor build

yarn workspaces foreach -A run build

yarn workspace @tldraw/editor add lodash
```

## Notes

- Workspace dependencies use `workspace:*` versions.
- The repo uses Yarn v4 with `node-modules` linker.

## Key files

- package.json - Workspace definitions
- .yarnrc.yml - Yarn configuration

## Related

- [Commands](../reference/commands.md)
- [LazyRepo](./lazyrepo.md)
