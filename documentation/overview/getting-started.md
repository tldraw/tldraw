---
title: Getting started
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - setup
  - development
  - installation
  - commands
---

This guide walks you through setting up the tldraw development environment and introduces the essential commands for working in the repository.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** installed
- **Git** for version control
- A code editor (VSCode recommended)

## Initial setup

### 1. Clone the repository

```bash
git clone https://github.com/tldraw/tldraw.git
cd tldraw
```

### 2. Enable Corepack

Corepack ensures you use the correct version of Yarn:

```bash
npm i -g corepack
corepack enable
```

### 3. Install dependencies

```bash
yarn
```

This installs all dependencies across the monorepo. The first install may take a few minutes.

### 4. Start the development server

```bash
yarn dev
```

Open http://localhost:5420 in your browser. You should see the examples app with a working tldraw canvas.

## Development commands

### Starting development servers

| Command           | What it starts     | URL            |
| ----------------- | ------------------ | -------------- |
| `yarn dev`        | Examples app       | localhost:5420 |
| `yarn dev-app`    | tldraw.com client  | localhost:3000 |
| `yarn dev-docs`   | Documentation site | localhost:3001 |
| `yarn dev-vscode` | VSCode extension   | -              |

The examples app (`yarn dev`) is the primary development environment. Use it to test SDK changes.

### Running a template

To run a specific starter template:

```bash
yarn dev-template vite
yarn dev-template nextjs
yarn dev-template sync-cloudflare
```

### Code quality

Run these before committing:

```bash
yarn typecheck    # Type check all packages
yarn lint         # Lint all packages
yarn format       # Format code with Prettier
```

Always run `yarn typecheck` before pushing. Type errors will fail CI.

### Testing

Run tests from a specific package directory:

```bash
cd packages/editor
yarn test run
```

Filter tests by name:

```bash
yarn test run --grep "selection"
```

Run all tests (slow, avoid unless necessary):

```bash
yarn test run  # from root
```

Run E2E tests:

```bash
yarn e2e         # Examples app E2E tests
yarn e2e-dotcom  # tldraw.com E2E tests
```

### Building

```bash
yarn build           # Build all packages (incremental)
yarn build-package   # Build SDK packages only
yarn build-app       # Build tldraw.com client
yarn build-docs      # Build documentation site
```

The build system (LazyRepo) is incremental—it only rebuilds what changed.

### API validation

Check for public API changes:

```bash
yarn api-check
```

This validates that the public API surface hasn't changed unexpectedly. Run it after modifying exported types or functions.

## Working with CONTEXT.md files

The repository contains `CONTEXT.md` files throughout that document each package and directory. These are designed for both human developers and AI agents.

Find the nearest CONTEXT.md:

```bash
yarn context                    # From current directory
yarn context ./packages/editor  # For a specific path
yarn context -v                 # Show full content
yarn context -r                 # Find all CONTEXT.md files
```

Read these files to understand a package before making changes.

## Project structure

After setup, familiarize yourself with the key directories:

```
tldraw/
├── packages/          # SDK packages (where most code changes happen)
│   ├── editor/        # Core canvas engine
│   ├── tldraw/        # Complete SDK with UI
│   ├── store/         # Reactive database
│   ├── state/         # Signals system
│   └── tlschema/      # Type definitions
├── apps/
│   ├── examples/      # Development testbed (yarn dev)
│   └── dotcom/        # tldraw.com application
└── templates/         # Starter projects
```

## Common workflows

### Making SDK changes

1. Start the dev server: `yarn dev`
2. Make changes to packages
3. Changes hot-reload in the examples app
4. Run `yarn typecheck` before committing

### Adding an example

1. Create a directory in `apps/examples/src/examples/`
2. Add a `README.md` with frontmatter
3. Add your example component (ending in `Example.tsx`)
4. See `apps/examples/writing-examples.md` for details

### Testing a specific feature

1. Find or create a relevant example
2. Use the examples app to test interactively
3. Write unit tests in the appropriate package
4. Run tests with `yarn test run --grep "feature-name"`

## Troubleshooting

### TypeScript errors after pulling

Rebuild to regenerate types:

```bash
yarn build
```

### Dependencies out of sync

Reinstall dependencies:

```bash
yarn
```

### Port already in use

The dev server uses port 5420. If it's occupied:

```bash
# Find and kill the process using the port
lsof -i :5420
kill -9 <PID>
```

### Clearing build cache

```bash
# Remove build artifacts
rm -rf packages/*/dist apps/*/dist
yarn build
```

## Editor setup

### VSCode

Recommended extensions:

- **ESLint** - Linting integration
- **Prettier** - Code formatting
- **TypeScript** - Language support (built-in)

The repository includes VSCode settings in `.vscode/` that configure these automatically.

### Other editors

Ensure your editor:

- Uses the workspace TypeScript version
- Runs ESLint on save
- Formats with Prettier on save

## Next steps

Now that your environment is set up:

1. **Explore the examples** at localhost:5420 to see what's possible
2. **Read the architecture overview** to understand how packages relate
3. **Browse CONTEXT.md files** in packages you'll work with
4. **Try modifying an example** to see hot reloading in action

## Key files

- package.json - Root workspace configuration and scripts
- CLAUDE.md - Essential commands and AI agent guidance
- lazy.config.ts - Build system configuration
- .yarnrc.yml - Yarn configuration

## Related

- [Repository overview](./repository-overview.md) - Monorepo structure
- [Architecture overview](./architecture-overview.md) - SDK design and patterns
- [@tldraw/editor](../packages/editor.md) - Core editor documentation
- [@tldraw/tldraw](../packages/tldraw.md) - Complete SDK documentation
