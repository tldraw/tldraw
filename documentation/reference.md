---
title: Commands reference
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - commands
  - scripts
  - yarn
  - reference
status: published
date: 12/19/2025
order: 1
---

# Commands

Common yarn commands for developing and testing the tldraw monorepo.

## Development

Start development servers for different parts of the monorepo. Each command watches for changes and provides hot reload.

```bash
yarn dev           # Examples app (main SDK showcase)
yarn dev-app       # tldraw.com client
yarn dev-docs      # Documentation site (tldraw.dev)
yarn dev-vscode    # VSCode extension
```

## Testing

Run tests using Vitest for unit tests and Playwright for end-to-end tests. Filter tests by pattern with `--grep`.

```bash
yarn test run                      # Run all tests
yarn test run --grep "selection"   # Filter by pattern
yarn e2e                           # E2E tests for examples
yarn e2e-dotcom                    # E2E tests for tldraw.com
```

## Code quality

Lint, type check, and format code. Run these before committing to catch issues early.

```bash
yarn lint       # ESLint checks
yarn typecheck  # TypeScript type checking (from repo root)
yarn format     # Prettier formatting
yarn api-check  # Validate public API consistency
```

## Builds

Build packages and apps. LazyRepo handles incremental builds automatically.

```bash
yarn build              # Build all changed packages
yarn build-package <n>  # Build a specific package
yarn build-docs         # Build documentation site
yarn build-dotcom       # Build tldraw.com
```

## Key files

- package.json - Workspace scripts
- lazy.config.ts - Build orchestration

## Related

- [Getting started](../overview/getting-started.md)
- [LazyRepo](../tooling/lazyrepo.md)

# API Conventions

## Naming conventions

- Types and IDs use the `TL` prefix (`TLShape`, `TLShapeId`).
- Shape utilities end in `ShapeUtil` and binding utilities end in `BindingUtil`.
- Tools and states use descriptive `StateNode` names.

## Method patterns

Editor APIs follow consistent verbs:

```typescript
editor.getShape(id)
editor.setCurrentTool('draw')
editor.createShape({ type: 'geo', x: 0, y: 0, props: {} })
editor.updateShape({ id, props: { color: 'red' } })
```

## Signals

Signal variables are often prefixed with `$` to indicate reactivity.

# Glossary

Short definitions for common terms used in tldraw docs and code.

## Core concepts

- Asset: a media file (image, video) stored separately from shapes and referenced by ID.
- Binding: a relationship between two shapes.
- Camera: controls viewport position and zoom; bridges screen space and page space.
- Editor: the main orchestration class for tools, shapes, and state.
- Page: a drawing surface within a document; each page has its own shapes and camera state.
- Shape: a canvas element stored as a record.
- ShapeUtil: the class that defines a shape's behavior and rendering.
- Store: the reactive record database.
- Tool: a `StateNode` that handles user input.

## Coordinate systems

- Page space: the infinite canvas coordinate system where shape positions are defined.
- Screen space: browser pixels measured from the document origin.
- Viewport: the visible rendering area of the editor.

## State management

- Atom: mutable signal value.
- Computed: derived signal value.
- History mark: a stopping point that defines where undo/redo operations pause.
- Side effect: a function that runs before or after records change to enforce consistency.
- Transaction: batched updates applied atomically.

## Rendering

- Culling: hiding shapes outside the viewport to optimize rendering performance.
- Fractional index: a string-based z-order system that enables efficient reordering and collaboration.

## Input and interaction

- Edge scrolling: auto-panning the camera when dragging near viewport edges.
- Focused group: the group shape that defines the current editing scope for selection.
- Scribble: temporary freehand visual feedback for operations like erasing or laser pointer.
- Snapping: precision alignment assistance when moving, resizing, or connecting shapes.
- Tick: a frame-synchronized update event from the animation loop.

## Styles and animation

- Easing: a function that controls the rate of change during animations.
- Style: a visual property like color, size, or opacity that can be applied to shapes.
- StyleProp: a class that defines valid values and defaults for a style property.

## Sharing

- Deep link: a URL that encodes editor state (page, viewport, selection) for sharing.

## Multiplayer

- Presence: other users' cursors and selections.
- Room: a shared editing session.
- Sync: diff-based state synchronization.

## UI

- Component override: a custom UI component replacing a default.
- Style panel: UI for editing shared styles.

## Abbreviations

| Abbreviation | Meaning                            |
| ------------ | ---------------------------------- |
| TL           | tldraw type prefix                 |
| DO           | Durable Object                     |
| R2           | Cloudflare object storage          |
| SSE          | Server-Sent Events                 |
| CRDT         | Conflict-free Replicated Data Type |
| E2E          | End-to-End testing                 |

# Code Quality

Code quality in the monorepo is enforced through automated tools that run locally and in CI. These tools form a layered defense against common issues: ESLint catches bugs and enforces patterns, Prettier maintains consistent formatting, TypeScript verifies type safety, and API Extractor guards the public API surface. Running these tools locally before pushing catches problems early, saving time on failed CI builds.

The tools complement each other by focusing on different concerns. ESLint handles logic and pattern enforcement, Prettier handles visual formatting, TypeScript handles type correctness, and API Extractor handles public contract stability. This separation means each tool can excel at its specific task without overlap.

## Linting with ESLint

ESLint analyzes code for potential bugs, enforces coding patterns, and catches common mistakes before they reach production. The tldraw configuration includes rules that prevent issues specific to canvas applications, like ensuring proper cleanup of event listeners and avoiding patterns that cause memory leaks.

```bash
yarn lint
```

The configuration in `eslint.config.mjs` uses the new flat config format introduced in ESLint 9. It combines several rule sets: recommended JavaScript rules, TypeScript-specific rules that leverage type information, and React hooks rules that catch improper hook usage. Custom rules enforce tldraw-specific patterns like proper shape utility implementations.

### Common lint issues

ESLint catches several categories of problems:

- **Unused variables and imports**: Code that does nothing clutters the codebase and can indicate incomplete refactoring.
- **Missing dependencies in hooks**: The `react-hooks/exhaustive-deps` rule prevents stale closure bugs in useEffect and useCallback.
- **Type assertions without cause**: Unnecessary `as` casts can hide type errors that would otherwise be caught.
- **Console statements**: Leftover debugging code shouldn't reach production.

When ESLint reports an error, fix the underlying issue rather than disabling the rule. If a rule genuinely doesn't apply, use a targeted `eslint-disable-next-line` comment with an explanation.

## Formatting with Prettier

Prettier enforces consistent code formatting across the codebase, eliminating debates about style and ensuring diffs show only meaningful changes. The formatter handles indentation, line wrapping, quote styles, and dozens of other formatting decisions automatically.

```bash
yarn format
```

The configuration in `.prettierrc` defines the tldraw style: tabs for indentation, single quotes for strings, and semicolons required. Most editors can integrate with Prettier to format on save, making manual formatting commands rare in practice.

### Editor integration

Configure your editor to format files automatically:

- **VS Code**: Install the Prettier extension and enable "Format on Save"
- **Other editors**: Most have Prettier plugins available

With editor integration, you write code naturally and let Prettier handle formatting. This approach is faster than manual formatting and ensures every file matches the codebase style.

## Type checking with TypeScript

TypeScript type checking catches type errors across all packages. Unlike ESLint which looks at single files, TypeScript understands the entire codebase and catches errors that span multiple files, like passing the wrong type to a function in another package.

```bash
yarn typecheck
```

Always run this command from the repository root. The root configuration uses project references to enable incremental checking - TypeScript only rechecks files that changed or depend on changed files. Running from a package directory works but misses cross-package type errors. See [TypeScript configuration](./typescript.md) for details on how project references work.

## API surface validation

Microsoft API Extractor validates that public APIs haven't changed unexpectedly. This tool reads the TypeScript declarations of public packages and compares them against stored API reports. Any difference - new exports, removed methods, changed signatures - causes the check to fail.

```bash
yarn api-check
```

API Extractor serves two purposes: it prevents accidental breaking changes from reaching users, and it forces intentional changes to be documented. When you legitimately change a public API, you must update the API report files. This requirement ensures that API changes are deliberate and reviewed.

### Updating API reports

When you intentionally change a public API, the `api-check` command will fail. Run `yarn api-check --update` to regenerate the report files. Review the changes carefully - they show exactly what's changing in the public API. Commit the updated reports alongside your code changes so reviewers can see the API impact.

## Pre-commit hooks

The repository uses lint-staged to run quality checks on staged files before commits. This catches issues early without requiring you to run checks manually. The configuration in `package.json` specifies which checks run on which file types.

When a pre-commit hook fails, fix the reported issues before committing. If you need to bypass hooks temporarily (for work-in-progress commits), use `git commit --no-verify`, but remember to fix issues before pushing.

## Key files

- eslint.config.mjs - ESLint configuration with all rule sets
- .prettierrc - Prettier formatting options
- package.json - Scripts, lint-staged config, and tool versions
- internal/config/tsconfig.base.json - Shared TypeScript settings

## Related

- [TypeScript](./typescript.md) - Project references and configuration details
- [Commands](../reference/commands.md) - All available quality commands

# Lazy Repo

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

# Yarn Workspaces

tldraw uses Yarn workspaces to manage packages, apps, and templates in a single monorepo. Workspaces allow multiple npm packages to coexist in one repository while sharing dependencies and enabling cross-package development without publishing. Changes to a dependency package are immediately visible to packages that use it, without any manual linking or publishing steps.

The workspace structure organizes code by purpose: `packages/` contains publishable npm packages, `apps/` contains deployable applications, and `templates/` contains starter projects. This separation makes it clear what's meant for external consumption versus internal use.

## How workspaces work

Yarn workspaces operate on a simple principle: the root `package.json` declares which directories contain workspaces, and Yarn treats each as an independent package with its own `package.json`. When you run `yarn install`, Yarn resolves dependencies for all workspaces together, hoisting shared dependencies to the root `node_modules` to avoid duplication.

### Workspace dependency resolution

When one workspace depends on another, Yarn uses the local code directly rather than fetching from npm. This enables rapid iteration: change code in `@tldraw/state`, and packages that import it immediately see the changes without rebuilding or republishing.

The `workspace:*` version specifier makes this explicit:

```json
{
	"dependencies": {
		"@tldraw/state": "workspace:*"
	}
}
```

This tells Yarn to always use the local workspace version. During publishing, Yarn automatically replaces `workspace:*` with the actual version number, so published packages have correct version requirements.

## Common commands

### Running commands in specific workspaces

To run a script in a single workspace:

```bash
yarn workspace @tldraw/editor build
```

This runs the `build` script defined in `@tldraw/editor`'s `package.json`. Use this when you need to work with one specific package.

### Running commands across all workspaces

To run a script in every workspace that has it:

```bash
yarn workspaces foreach -A run build
```

The `-A` flag includes all workspaces. This is rarely needed directly - the LazyRepo build system handles coordinated builds more efficiently.

### Adding dependencies

To add a dependency to a specific workspace:

```bash
yarn workspace @tldraw/editor add lodash
```

This modifies `@tldraw/editor`'s `package.json` and updates the lockfile. Always specify the workspace to avoid accidentally adding dependencies to the wrong package.

To add a dependency to the root (for monorepo-wide tooling):

```bash
yarn add -W eslint
```

The `-W` flag explicitly targets the root workspace.

### Linking workspaces as dependencies

To make one workspace depend on another:

```bash
yarn workspace @tldraw/editor add @tldraw/state
```

Yarn automatically uses `workspace:*` for local packages. This creates the dependency relationship and ensures changes propagate correctly.

## Workspace structure

The root `package.json` defines workspace locations:

```json
{
	"workspaces": ["packages/*", "apps/*", "templates/*"]
}
```

Each directory matching these patterns that contains a `package.json` becomes a workspace. The package name in each `package.json` determines how to reference that workspace.

### Package naming conventions

- Public packages use the `@tldraw/` scope: `@tldraw/editor`, `@tldraw/state`
- Internal packages may use unscoped names or a different scope
- Apps often use descriptive names: `examples`, `docs`, `dotcom`

## Yarn version

The repository uses Yarn v4 (Berry) with the `node-modules` linker. This linker creates a traditional `node_modules` structure that's compatible with all tools, unlike Yarn's Plug'n'Play mode which requires additional configuration.

The `packageManager` field in the root `package.json` enforces a specific Yarn version. Corepack (bundled with Node.js) automatically uses the correct version when you run `yarn` commands.

## Common issues

### Wrong workspace receiving changes

If `yarn add` modifies the wrong `package.json`, you may be running from the wrong directory or forgot to specify the workspace. Always use `yarn workspace <name> add` to be explicit.

### Dependency version conflicts

When workspaces require different versions of the same dependency, Yarn installs multiple versions. This is usually fine, but can cause issues with packages that expect singletons (like React). The root `package.json` can use `resolutions` to force a single version when needed.

### Missing workspace dependency

If imports fail between workspaces, ensure the dependency is declared in `package.json`. Unlike regular npm packages, workspace packages must explicitly declare their dependencies even though the code is local.

## Key files

- package.json - Root workspace definitions and shared dependencies
- .yarnrc.yml - Yarn configuration including linker settings
- yarn.lock - Lockfile ensuring reproducible installs
- packages/\*/package.json - Individual package configurations

## Related

- [LazyRepo](./lazyrepo.md) - Build system that orchestrates workspace builds
- [TypeScript](./typescript.md) - Project references that mirror workspace dependencies
- [Commands](../reference/commands.md) - All available workspace commands
