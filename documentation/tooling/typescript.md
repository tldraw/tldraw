---
title: TypeScript configuration
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - typescript
  - tsconfig
  - types
  - configuration
---

## Overview

tldraw uses TypeScript project references for incremental builds and strict type checking.

## Key configuration

- Root `tsconfig.json` references packages.
- Shared settings live in `config/tsconfig.base.json`.
- Each package has its own `tsconfig.json` with `outDir` and `rootDir`.

## Type checking

```bash
yarn typecheck
```

## Key files

- tsconfig.json - Root references
- config/tsconfig.base.json - Shared compiler options
- packages/\*/tsconfig.json - Package configs

## Related

- [Code quality](./code-quality.md)
- [LazyRepo](./lazyrepo.md)
