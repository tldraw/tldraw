---
title: TypeScript configuration
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - typescript
  - tsconfig
  - types
  - configuration
  - project references
---

## Overview

The tldraw monorepo uses TypeScript's project references feature to enable fast incremental compilation across dozens of packages. This architecture allows TypeScript to track dependencies between packages and recompile only what changed, reducing type check times from minutes to seconds. The configuration prioritizes both developer productivity through speed and code quality through strict type safety.

Project references solve a critical challenge in monorepo development: as codebases grow, full recompilation becomes prohibitively slow. By modeling package dependencies explicitly, TypeScript can cache unchanged packages and skip unnecessary work, making the type checker responsive even in a large workspace.

## How project references work

TypeScript's project references create a build graph that mirrors the monorepo's package dependencies. Each package declares its dependencies in its `tsconfig.json` file using the `references` array. When you modify a file, TypeScript identifies which package contains that file, then determines which other packages depend on it through the reference graph.

The `@tldraw/editor` package demonstrates this pattern. Its configuration extends the base settings and lists the packages it depends on:

```json
{
	"extends": "../../internal/config/tsconfig.base.json",
	"references": [
		{ "path": "../state" },
		{ "path": "../state-react" },
		{ "path": "../store" },
		{ "path": "../tlschema" },
		{ "path": "../utils" },
		{ "path": "../validate" }
	]
}
```

When you change code in `@tldraw/state`, TypeScript knows it must recheck both `@tldraw/state` and any packages that reference it, like `@tldraw/editor`. Packages that don't depend on `@tldraw/state` remain cached and skip type checking entirely. This selective recompilation is what makes the system fast.

## Configuration architecture

The monorepo centralizes TypeScript compiler options in `internal/config/tsconfig.base.json`. This base configuration establishes strict type safety defaults that all packages inherit. Centralizing these settings ensures consistency and makes it easy to update compiler behavior across the entire codebase.

The base configuration enables several strict mode features that catch common errors at compile time. These include `strictNullChecks` to prevent null reference errors, `noImplicitAny` to catch missing type annotations, and `noImplicitReturns` to ensure all code paths return values. The `composite: true` option is required for project references to work - it tells TypeScript to generate declaration maps that enable cross-package navigation and incremental builds.

Individual packages extend the base and add package-specific paths. The `outDir` setting directs build artifacts to `.tsbuild` directories that LazyRepo can cache, while `rootDir` tells TypeScript where source files live. Some packages override specific options when needed, like disabling `noImplicitReturns` for packages with complex control flow.

## Type checking in development

The monorepo provides a `yarn typecheck` command that runs TypeScript correctly with project reference awareness. This command first refreshes assets to ensure generated types are current, then invokes a custom script that orchestrates the type check across all packages.

Never run bare `tsc` directly. Without understanding the project reference graph, raw `tsc` produces incorrect results because it doesn't know which packages to check or in what order. The `yarn typecheck` command handles this complexity, respecting dependencies and leveraging incremental builds automatically.

For faster feedback during development, you can run `yarn typecheck` from individual package directories. This checks only that package and its dependencies, providing nearly instant results for focused work. The full repository-level `yarn typecheck` validates everything and should run before commits.

## Build artifact organization

TypeScript emits declaration files to `.tsbuild` directories within each package. These `.d.ts` files provide type information for consumers of the package without requiring them to recompile the original source. The `declarationMap: true` option generates `.d.ts.map` files that enable "Go to Definition" to jump into the original source code across package boundaries.

The `emitDeclarationOnly: true` setting tells TypeScript to generate only declaration files, not JavaScript. Build tools like Vite and tsup handle actual JavaScript compilation, so TypeScript focuses purely on type checking and declaration generation. This separation of concerns keeps type checking fast while allowing modern build tools to handle bundling and optimization.

## Key files

- internal/config/tsconfig.base.json - Base compiler options inherited by all packages
- internal/config/tsconfig.json - Configuration wrapper for the config directory itself
- packages/\*/tsconfig.json - Package-specific configuration with references to dependencies
- apps/\*/tsconfig.json - Application configurations extending the base

## Related

- [Code quality](./code-quality.md) - How TypeScript integrates with linting and formatting
- [LazyRepo](./lazyrepo.md) - Build system that caches TypeScript artifacts
