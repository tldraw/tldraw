---
title: Getting started
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - setup
  - development
  - installation
  - commands
status: published
date: 12/19/2025
order: 1
---

This guide sets up the tldraw monorepo and points to the most common development commands.

## Prerequisites

- Node.js 20+
- Git
- A code editor (VS Code recommended)

## Setup

1. Clone and enter the repo:

```bash
git clone https://github.com/tldraw/tldraw.git
cd tldraw
```

2. Enable Corepack (Yarn):

```bash
npm i -g corepack
corepack enable
```

3. Install dependencies:

```bash
yarn
```

4. Start the examples app:

```bash
yarn dev
```

## Common commands

| Command         | Purpose                       |
| --------------- | ----------------------------- |
| yarn dev        | Examples app (localhost:5420) |
| yarn dev-app    | tldraw.com client             |
| yarn dev-docs   | Documentation site            |
| yarn dev-vscode | VS Code extension             |
| yarn typecheck  | TypeScript checks             |
| yarn lint       | Linting                       |
| yarn test run   | Unit tests (from package dir) |

## Troubleshooting

- Type errors after pulling: run `yarn build`.
- Dependencies out of sync: run `yarn` again.
- Port 5420 busy: stop the process or change the port.

## Key files

- package.json - Workspace scripts and dependencies
- CLAUDE.md - Contributor and agent guidance
- lazy.config.ts - Build system configuration

## Related

- [Repository overview](./repository-overview.md)
- [Architecture overview](./architecture-overview.md)
- [Examples app](../apps/examples.md)
