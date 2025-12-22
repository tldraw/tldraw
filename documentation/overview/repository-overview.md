---
title: Repository overview
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - overview
  - monorepo
  - introduction
  - structure
status: published
date: 12/19/2025
order: 2
---

This repository contains the tldraw SDK and the tldraw.com application. It includes published packages, example apps, templates, and infrastructure services.

## Repository layout

```
tldraw/
├── packages/   # Published SDK packages
├── apps/       # Examples, docs, dotcom, vscode
├── templates/  # Starter projects
├── documentation/
└── internal/   # Shared tooling and config
```

## Development entry points

| Command         | Purpose                       |
| --------------- | ----------------------------- |
| yarn dev        | Examples app (localhost:5420) |
| yarn dev-app    | tldraw.com client             |
| yarn dev-docs   | Documentation site            |
| yarn dev-vscode | VS Code extension             |

## Versioning and licensing

Packages are versioned and released together. Licensing details are in `LICENSE.md`.

## Key files

- package.json - Workspace scripts and dependencies
- lazy.config.ts - Build system configuration
- CONTEXT.md - Architecture context entry
- LICENSE.md - License terms

## Related

- [Architecture overview](./architecture-overview.md)
- [Getting started](./getting-started.md)
