---
title: LazyRepo build system
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - lazyrepo
  - build
  - caching
  - monorepo
---

## Overview

tldraw uses LazyRepo for incremental, cached builds across the monorepo. It rebuilds only what changed and caches outputs between runs.

## Commands

```bash
yarn build

yarn build-package @tldraw/editor

yarn build --force
```

## Notes

- Tasks run in dependency order based on workspace relationships.
- Cache outputs live in `node_modules/.cache/lazyrepo/`.

## Key files

- lazy.config.ts - Task definitions
- internal/scripts/build.ts - Build entry

## Related

- [TypeScript](./typescript.md)
- [Commands](../reference/commands.md)
