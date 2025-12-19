---
title: '@tldraw/create-tldraw'
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - cli
  - scaffolding
  - templates
  - create
  - starter
---

The `create-tldraw` package is a CLI tool for scaffolding new tldraw projects. It provides an interactive command-line interface that helps developers quickly bootstrap tldraw applications with various framework templates.

## Overview

This package enables quick project creation via `npx`:

```bash
npx create-tldraw
```

Features:

- Interactive template selection with grouped options
- Support for multiple frameworks (Vite, Next.js)
- Application templates (multiplayer sync)
- Automatic package manager detection (npm, yarn, pnpm)
- Smart directory handling with safety checks

## Usage

### Interactive mode

```bash
npx create-tldraw
```

Guides you through:

1. Selecting a template from grouped options
2. Naming your project
3. Handling existing directories (if applicable)

### Direct template specification

```bash
# Create with specific template
npx create-tldraw my-app --template vite-template

# Overwrite existing directory
npx create-tldraw my-app --overwrite

# Get help
npx create-tldraw --help
```

### Command-line arguments

| Argument      | Alias | Description                                    |
| ------------- | ----- | ---------------------------------------------- |
| `--template`  | `-t`  | Specify template name directly                 |
| `--overwrite` | `-o`  | Overwrite existing directory without prompting |
| `--help`      | `-h`  | Show help information                          |

## Available templates

### Framework templates

**Vite + tldraw** (`tldraw/vite-template`)

The easiest way to get started with tldraw:

- Built with Vite, React, and TypeScript
- Hot module replacement for fast development
- Minimal configuration required
- Best for: Simple drawing apps, prototypes, learning

```bash
npx create-tldraw my-app --template vite-template
```

**Next.js + tldraw** (`tldraw/nextjs-template`)

tldraw in a Next.js application:

- Next.js App Router
- TypeScript configuration
- Production-ready build setup
- Best for: Full-stack apps, SSR requirements

```bash
npx create-tldraw my-app --template nextjs-template
```

### Application templates

**Multiplayer sync** (`tldraw/tldraw-sync-cloudflare`)

Self-hosted real-time collaboration:

- tldraw sync for multiplayer
- Cloudflare Durable Objects backend
- WebSocket-based synchronization
- Best for: Collaborative whiteboards, team drawing

```bash
npx create-tldraw my-app --template tldraw-sync-cloudflare
```

## Template selection UI

Templates are organized into categories:

```
? Select a template

  Frameworks
  > Vite + tldraw
    The easiest way to get started with tldraw.

    Next.js + tldraw
    tldraw in a Next.js app, with TypeScript.

  Apps
    Multiplayer sync
    Self-hosted tldraw with realtime multiplayer.
```

## Directory handling

The CLI handles existing directories safely:

```
? Target directory "my-app" is not empty.

  > Cancel
    Remove existing files and continue
    Ignore existing files and continue
```

Key behaviors:

- `.git` directories are never deleted
- User must explicitly confirm destructive operations
- Can merge with existing content if desired

## Package manager detection

The CLI automatically detects your package manager and provides appropriate commands:

```typescript
// Detected from npm_config_user_agent environment variable
const manager = getPackageManager() // 'npm' | 'yarn' | 'pnpm'

// Generated commands match your package manager
const installCmd = getInstallCommand(manager)
// npm: 'npm install'
// yarn: 'yarn'
// pnpm: 'pnpm install'

const runCmd = getRunCommand(manager, 'dev')
// npm: 'npm run dev'
// yarn: 'yarn dev'
// pnpm: 'pnpm dev'
```

## Post-creation workflow

After project creation, the CLI displays next steps:

```
Done! Now run:

  cd my-tldraw-app
  npm install
  npm run dev
```

## Project customization

The CLI automatically customizes the generated project:

### Package.json modifications

```typescript
// Template package.json is updated:
packageJson.name = userProvidedName
delete packageJson.author // Remove template author
delete packageJson.homepage // Remove template homepage
// License is preserved from template
```

### Package name validation

Names are automatically sanitized for npm compatibility:

```typescript
// Transforms path to valid package name
"My App" → "my-app"
"./my-project" → "my-project"
"_invalid" → "invalid"
```

## Error handling

The CLI handles common errors gracefully:

### Network failures

```
Failed to download template. Please check your internet connection and try again.
```

### User cancellation

```
Operation cancelled
```

### Debug mode

Set `DEBUG=true` for detailed error information:

```bash
DEBUG=true npx create-tldraw
```

## Architecture

### CLI entry point

```
cli.cjs                  # Entry point
  └── dist-cjs/main.cjs  # Bundled CLI (via esbuild)
```

### Source structure

```
src/
├── main.ts          # CLI orchestration
├── templates.ts     # Template definitions
├── utils.ts         # Utility functions
├── group-select.ts  # Grouped selection UI
└── wrap-ansi.ts     # ANSI text wrapping
```

### Template download

Templates are downloaded from GitHub:

```typescript
const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
const response = await fetch(url)
// Extract to target directory, stripping top-level folder
```

## Development

### Building

```bash
cd packages/create-tldraw
./scripts/build.sh    # Production build
./scripts/dev.sh      # Watch mode for development
```

### Testing locally

```bash
# Build first
./scripts/build.sh

# Run locally
node cli.cjs my-test-app
```

### Adding templates

Templates are defined in `templates.ts`:

```typescript
const TEMPLATES = {
	framework: [
		{
			repo: 'tldraw/vite-template',
			name: 'Vite + tldraw',
			description: 'The easiest way to get started with tldraw.',
			category: 'framework',
			order: 1, // Display order
		},
		// Add new framework templates here
	],
	app: [
		{
			repo: 'tldraw/tldraw-sync-cloudflare',
			name: 'Multiplayer sync',
			description: 'Self-hosted tldraw with realtime multiplayer.',
			category: 'app',
			order: 1,
		},
		// Add new app templates here
	],
}
```

### Template requirements

Template repositories should have:

- Valid `package.json` with standard scripts (`dev`, `build`, `typecheck`)
- TypeScript configuration
- README with setup instructions
- Current tldraw version as dependency

## Key files

- packages/create-tldraw/cli.cjs - CLI entry point
- packages/create-tldraw/src/main.ts - Main CLI application
- packages/create-tldraw/src/templates.ts - Template definitions
- packages/create-tldraw/src/utils.ts - Utility functions
- packages/create-tldraw/src/group-select.ts - Template selection UI

## Related

- [Vite template](../templates/vite.md) - Vite starter template
- [Next.js template](../templates/nextjs.md) - Next.js starter template
- [Sync Cloudflare template](../templates/sync-cloudflare.md) - Multiplayer template
