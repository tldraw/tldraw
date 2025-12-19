---
title: Code quality
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - linting
  - eslint
  - prettier
  - formatting
---

## Overview

Code quality in the monorepo is enforced with ESLint, Prettier, type checking, and API surface checks.

## Commands

```bash
yarn lint

yarn format

yarn typecheck

yarn api-check
```

## Tooling notes

- Run `yarn typecheck` from the repo root.
- Prettier and ESLint are wired into editor tooling and CI.

## Key files

- eslint.config.mjs - ESLint configuration
- .prettierrc - Prettier configuration
- package.json - Scripts and lint-staged config

## Related

- [TypeScript](./typescript.md)
- [Commands](../reference/commands.md)
