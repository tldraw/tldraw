---
title: LazyRepo build system
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - lazyrepo
  - build
  - caching
  - monorepo
---

tldraw uses LazyRepo for incremental, cached builds across the monorepo. It provides fast rebuilds by only processing what's changed.

## Overview

LazyRepo is the build orchestration system that:

- Tracks file inputs and outputs
- Caches build artifacts
- Runs tasks in dependency order
- Parallelizes independent work

## How it works

### Incremental builds

```bash
yarn build
```

On first run, builds everything. On subsequent runs, only rebuilds packages with changed inputs.

### Caching

LazyRepo hashes input files and caches outputs. If inputs haven't changed, cached outputs are used instead of rebuilding.

### Task ordering

Tasks run in dependency order based on workspace dependencies in package.json files.

## Configuration

### lazy.config.js

```javascript
module.exports = {
	tasks: {
		build: {
			baseCommand: 'yarn run -T tsx scripts/build.ts',
			cache: {
				inputs: {
					include: ['src/**/*', 'package.json', 'tsconfig.json'],
					exclude: ['**/*.test.ts'],
				},
				outputs: ['dist/**/*', '.tsbuildinfo'],
			},
		},
		typecheck: {
			baseCommand: 'yarn run -T tsc --build',
			cache: {
				inputs: {
					include: ['src/**/*', 'tsconfig.json'],
				},
				outputs: ['.tsbuildinfo'],
			},
		},
	},
}
```

### Task definition

| Property               | Description                |
| ---------------------- | -------------------------- |
| `baseCommand`          | Shell command to run       |
| `cache.inputs.include` | Files that affect the task |
| `cache.inputs.exclude` | Files to ignore            |
| `cache.outputs`        | Files produced by the task |

## Running tasks

### Build all packages

```bash
yarn build
```

### Build specific package

```bash
yarn build-package @tldraw/editor
```

### Force rebuild

```bash
yarn build --force
```

### Dry run

```bash
yarn build --dry-run
```

## Cache management

### Cache location

Caches are stored in `node_modules/.cache/lazyrepo/`.

### Clearing cache

```bash
# Clear all caches
rm -rf node_modules/.cache/lazyrepo

# Or rebuild from scratch
yarn build --force
```

## Performance tips

### Fast feedback loop

For development, use package-specific commands:

```bash
cd packages/editor
yarn build
```

### Parallel execution

LazyRepo automatically runs independent tasks in parallel. The number of workers is based on available CPU cores.

### Cache hits

Watch for cache hit logs:

```
[lazyrepo] build @tldraw/editor (cached)
[lazyrepo] build @tldraw/tldraw (running...)
```

## Integration

### With TypeScript

LazyRepo works with TypeScript project references for incremental type checking:

```json
// tsconfig.json
{
	"references": [{ "path": "../editor" }, { "path": "../store" }]
}
```

### With CI

CI runs use the same caching:

```yaml
- name: Build
  run: yarn build
```

Caches are shared via CI cache actions for faster CI builds.

## Troubleshooting

### Stale cache

If you see unexpected behavior, try clearing the cache:

```bash
yarn build --force
```

### Missing outputs

Check that your `cache.outputs` pattern matches what the build produces.

### Circular dependencies

LazyRepo detects circular dependencies and errors. Fix by restructuring dependencies.

## Key files

- `lazy.config.js` - LazyRepo configuration
- `node_modules/.cache/lazyrepo/` - Cache directory

## Related

- [Yarn workspaces](./yarn-workspaces.md) - Package management
- [TypeScript configuration](./typescript.md) - Type checking setup
