---
title: LazyRepo build system
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - lazyrepo
  - build
  - caching
  - monorepo
  - incremental
---

## Overview

tldraw uses LazyRepo as its monorepo build orchestrator. LazyRepo provides incremental builds with caching: it tracks which packages have changed since the last build, rebuilds only those packages, and caches outputs so unchanged work doesn't repeat. This transforms build times from minutes to seconds during typical development.

Monorepos face a fundamental challenge: as the number of packages grows, build times grow with them. A naive approach rebuilds everything on every change, wasting time recompiling code that hasn't changed. LazyRepo solves this by treating each package as an independent cacheable unit. Source files are hashed, and if the hash matches a cached build, the cached output is used instantly.

## Why LazyRepo

LazyRepo was chosen over alternatives like Turborepo and Nx for its simplicity and alignment with the tldraw workflow. Unlike Turborepo, LazyRepo doesn't require a remote cache service for good performance - local caching handles most cases well. Unlike Nx, LazyRepo has minimal configuration and doesn't impose its own project structure conventions.

The key differentiator is LazyRepo's approach to cache invalidation. Rather than tracking file timestamps or git commits, LazyRepo hashes actual file contents. This means copying a clean repository and running a build produces the same cache keys as an incremental build, making cache behavior predictable across machines and CI environments.

## Building packages

The primary build command compiles all packages that have changed since the last build:

```bash
yarn build
```

LazyRepo reads the workspace dependency graph and determines the correct build order. Packages are built only after all their dependencies have completed. Within each "level" of the dependency tree, packages build in parallel for maximum speed.

### Building specific packages

To build a single package and its dependencies:

```bash
yarn build-package @tldraw/editor
```

This command is useful when you only need one package. LazyRepo still resolves the full dependency chain, so if `@tldraw/editor` depends on `@tldraw/state`, both packages build (in the correct order).

### Forcing rebuilds

To rebuild everything from scratch, ignoring cached outputs:

```bash
yarn build --force
```

Force rebuilds are useful when you suspect cache corruption or want to verify a clean build matches an incremental build. In practice, cache issues are rare - LazyRepo's content-based hashing prevents most staleness problems.

## How caching works

LazyRepo caches build outputs locally in `node_modules/.cache/lazyrepo/`. Each package's cache entry is keyed by a hash computed from its source files. When you run a build, LazyRepo computes the current hash for each package and compares it against cached entries.

### Cache invalidation

The hash includes all files that affect the build output:

- Source files (TypeScript, JavaScript)
- Configuration files (tsconfig.json, package.json)
- Dependencies' output hashes (changes cascade through the graph)

This content-based approach means the cache invalidates precisely when needed - no more, no less. Changing a comment in a source file invalidates that package's cache. Changing an unrelated package doesn't.

### Cache restoration

When a hash matches, LazyRepo restores the cached output files directly without running the build script. This typically takes milliseconds. The cached artifacts include compiled JavaScript, TypeScript declaration files, and any other build outputs.

## Task configuration

Build tasks are defined in `lazy.config.ts` at the repository root. This configuration tells LazyRepo which scripts constitute "build" tasks, what their dependencies are, and which files to include in the cache hash.

```typescript
// Simplified example from lazy.config.ts
{
  build: {
    inputs: ['src/**/*', 'tsconfig.json', 'package.json'],
    outputs: ['dist/**/*', '.tsbuild/**/*'],
    dependsOn: ['^build'], // Run dependencies' build tasks first
  }
}
```

The `inputs` array specifies which files affect the cache hash. The `outputs` array specifies which files to cache. The `dependsOn` array establishes task ordering - `^build` means "run the build task in all dependency packages first."

### Custom tasks

Beyond building, LazyRepo can orchestrate any task that benefits from caching. The tldraw configuration includes tasks for type checking, asset generation, and API extraction. Each task defines its own inputs and outputs, enabling fine-grained caching.

## Common issues

### Stale cache behavior

If builds seem to use outdated code, the cache may have become inconsistent. This is rare but can happen after interrupted builds or disk issues. Run `yarn build --force` to rebuild from scratch.

### Missing dependencies

If a package fails to build with import errors, ensure its `tsconfig.json` includes all necessary project references. LazyRepo relies on explicit dependency declarations to determine build order.

## Key files

- lazy.config.ts - Task definitions and cache configuration
- internal/scripts/build.ts - The build script LazyRepo executes for each package
- node_modules/.cache/lazyrepo/ - Local cache storage (can be deleted safely)

## Related

- [TypeScript](./typescript.md) - How TypeScript project references integrate with LazyRepo caching
- [Yarn workspaces](./yarn-workspaces.md) - Workspace structure that LazyRepo builds upon
- [Commands](../reference/commands.md) - All available build commands
