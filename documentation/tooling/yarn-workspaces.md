---
title: Yarn workspaces
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - yarn
  - workspaces
  - monorepo
  - packages
  - dependencies
---

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
