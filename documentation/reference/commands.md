---
title: Commands reference
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - commands
  - scripts
  - yarn
  - reference
---

Complete reference of yarn commands available in the tldraw monorepo.

## Development commands

### Starting development servers

```bash
yarn dev            # Start examples app development server
yarn dev-app        # Start tldraw.com client development
yarn dev-docs       # Start documentation site development
yarn dev-vscode     # Start VS Code extension development
yarn dev-template <name>  # Run a specific template
```

### Running tests

```bash
# From root
yarn test run          # Run all tests (slow, avoid)

# From workspace
cd packages/editor
yarn test run          # Run tests in this package
yarn test run --grep "selection"  # Filter tests

# E2E tests
yarn e2e               # Run examples E2E tests
yarn e2e-dotcom        # Run tldraw.com E2E tests
```

### Code quality

```bash
yarn lint              # Lint all packages
yarn typecheck         # Type check all packages
yarn format            # Format code with Prettier
yarn api-check         # Validate public API consistency
```

## Build commands

### Building packages

```bash
yarn build             # Build all packages
yarn build-package <name>  # Build specific package
```

### Building apps

```bash
yarn build-docs        # Build documentation site
yarn build-dotcom      # Build tldraw.com client
yarn build-vscode      # Build VS Code extension
```

## Asset management

```bash
yarn refresh-assets    # Regenerate asset exports after changes
yarn refresh-context   # Update CONTEXT.md files
```

## Package workspace commands

### From any workspace

```bash
yarn test run          # Run tests
yarn lint              # Lint code
yarn typecheck         # Check types
```

### Examples specific

```bash
cd apps/examples
yarn dev               # Start development server
yarn e2e               # Run Playwright tests
```

### Documentation specific

```bash
cd apps/docs
yarn refresh-content   # Rebuild content database
yarn refresh-api       # Regenerate API docs
yarn refresh-everything  # Full rebuild
```

## Git and CI

### Pre-commit checks

```bash
yarn lint              # Runs automatically via husky
yarn format            # Auto-fixes formatting
```

### CI commands

```bash
yarn test-ci           # CI-optimized test runner
yarn check-bundle-size # Validate bundle sizes
```

## Common patterns

### Filtering tests

```bash
# Run specific test file
yarn test run packages/editor/src/lib/Editor.test.ts

# Run tests matching pattern
yarn test run --grep "should handle"

# Run with coverage
yarn test run --coverage
```

### Type checking specific packages

```bash
cd packages/editor
yarn typecheck
```

### Building for production

```bash
yarn build             # Build everything
yarn api-check         # Verify API consistency
```

## Important notes

- Always use `yarn typecheck` instead of bare `tsc`
- Run `typecheck` from the root of the repo
- Prefer running tests from specific workspaces, not root
- Use `yarn` not `npm` (enforced by packageManager field)

## Related

- [Getting started](../overview/getting-started.md) - Development setup
- [LazyRepo](../tooling/lazyrepo.md) - Build system details
