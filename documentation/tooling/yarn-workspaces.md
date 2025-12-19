---
title: Yarn workspaces
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - yarn
  - workspaces
  - monorepo
  - packages
---

tldraw uses Yarn workspaces for monorepo package management, enabling shared dependencies and efficient builds across all packages.

## Overview

Yarn workspaces allow multiple packages to share:

- A single `node_modules` directory
- Common dependencies
- Linked local packages
- Unified scripts

## Configuration

### Root package.json

```json
{
	"name": "tldraw",
	"workspaces": ["packages/*", "apps/*", "templates/*"],
	"packageManager": "yarn@4.x.x"
}
```

### Workspace structure

```
tldraw/
├── packages/           # Published packages
│   ├── editor/
│   ├── tldraw/
│   ├── store/
│   └── ...
├── apps/              # Applications
│   ├── examples/
│   ├── docs/
│   └── dotcom/
├── templates/         # Starter templates
│   ├── vite/
│   └── ...
└── package.json       # Root config
```

## Working with workspaces

### Running commands

```bash
# Run in all workspaces
yarn workspaces foreach -A run build

# Run in specific workspace
yarn workspace @tldraw/editor build

# Run from workspace directory
cd packages/editor
yarn build
```

### Adding dependencies

```bash
# Add to specific workspace
yarn workspace @tldraw/editor add lodash

# Add dev dependency
yarn workspace @tldraw/editor add -D vitest

# Add to root (shared tooling)
yarn add -D -W typescript
```

### Local package references

Reference local packages with `workspace:*`:

```json
{
	"name": "@tldraw/tldraw",
	"dependencies": {
		"@tldraw/editor": "workspace:*",
		"@tldraw/store": "workspace:*",
		"@tldraw/tlschema": "workspace:*"
	}
}
```

When published, `workspace:*` is replaced with the actual version.

## Common operations

### Install dependencies

```bash
# Install all workspace dependencies
yarn install
```

### List workspaces

```bash
# Show all workspaces
yarn workspaces list

# Show dependency graph
yarn workspaces list --json
```

### Check dependency usage

```bash
# Find where a package is used
yarn why lodash
```

## Workspace commands

Each workspace can define its own scripts:

```json
{
	"name": "@tldraw/editor",
	"scripts": {
		"build": "...",
		"test": "vitest run",
		"lint": "...",
		"typecheck": "tsc --build"
	}
}
```

Run from root with `yarn workspace`:

```bash
yarn workspace @tldraw/editor test
yarn workspace @tldraw/editor build
```

## Yarn Berry (v4)

tldraw uses Yarn Berry with specific features:

### PnP (Plug'n'Play) disabled

Using node_modules for compatibility:

```yaml
# .yarnrc.yml
nodeLinker: node-modules
```

### Constraints

Workspace constraints ensure consistency:

```javascript
// constraints.pro
gen_enforced_dependency(WorkspaceCwd, 'typescript', '5.x', devDependencies) :-
  workspace(WorkspaceCwd).
```

### Plugins

```yaml
# .yarnrc.yml
plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-typescript.cjs
  - path: .yarn/plugins/@yarnpkg/plugin-workspace-tools.cjs
```

## Best practices

### Dependency management

1. **Shared dependencies at root**: Common dev tools like TypeScript, ESLint
2. **Workspace-specific deps**: Package-specific dependencies
3. **Avoid version mismatches**: Use constraints or renovate

### Scripts

1. **Consistent naming**: Same script names across workspaces
2. **Root aggregation**: Root scripts run workspace scripts
3. **Independent execution**: Each workspace works standalone

### Versioning

```bash
# All packages share a version
# See RELEASING.md for release process
```

## Troubleshooting

### Stale dependencies

```bash
# Clean and reinstall
rm -rf node_modules
yarn install
```

### Workspace resolution issues

```bash
# Clear Yarn cache
yarn cache clean

# Verify workspace links
yarn workspaces list
```

### Build order issues

LazyRepo handles build ordering automatically based on workspace dependencies.

## Key files

- `package.json` - Root workspace config
- `.yarnrc.yml` - Yarn configuration
- `packages/*/package.json` - Workspace configs

## Related

- [LazyRepo](./lazyrepo.md) - Build orchestration
- [Commands reference](../reference/commands.md) - Available commands
