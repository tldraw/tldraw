# @tldraw/scripts

Build scripts and development tooling for the tldraw monorepo.

## Overview

This package contains TypeScript scripts and utilities that support the tldraw development workflow, including build automation, deployment, testing, publishing, and maintenance tasks.

## Key scripts

### Build & development

- `api-check.ts` - Validates public API consistency across packages using Microsoft API Extractor
- `build-api.ts` - Generates API documentation and type definitions
- `build-package.ts` - Builds individual packages with proper dependency handling
- `typecheck.ts` - Runs TypeScript compilation checks across workspaces
- `lint.ts` - Runs ESLint across the monorepo with custom rules
- `clean.sh` - Removes build artifacts and node_modules

### Context management

- `context.ts` - Finds and displays nearest CONTEXT.md files (supports -v, -r, -u flags)
- `refresh-context.ts` - Updates CONTEXT.md files using Claude Code CLI integration
- Script supports reviewing all packages or specific directories

### Publishing & deployment

- `publish-new.ts` - Publishes new package versions
- `publish-patch.ts` - Handles patch releases
- `publish-prerelease.ts` - Manages prerelease versions
- `publish-manual.ts` - Manual publishing workflow
- `publish-vscode-extension.ts` - VSCode extension publishing
- `deploy-dotcom.ts` - Deploys tldraw.com application
- `deploy-bemo.ts` - Deploys collaboration backend

### Asset management

- `refresh-assets.ts` - Updates icons, fonts, and translations across packages
- Assets are centrally managed and distributed during builds
- `purge-css.ts` - Removes unused CSS
- `upload-static-assets.ts` - Handles CDN asset uploads

### Internationalization

- `i18n-upload-strings.ts` - Uploads translation strings to Lokalise
- `i18n-download-strings.ts` - Downloads localized strings from Lokalise
- Supports the tldraw UI translation workflow

### Testing & quality

- `check-packages.ts` - Validates package configurations and dependencies
- `check-worker-bundle.ts` - Verifies worker bundle integrity
- `license-report.ts` - Generates license compliance reports
- `generate-test-licenses.ts` - Creates test license configurations

### Template management

- `export-template.ts` - Generates starter templates for different frameworks
- `refresh-create-templates.ts` - Updates npm create tldraw templates
- `dev-template.sh` - Development script for testing templates

### Utilities library (`lib/`)

- `exec.ts` - Enhanced command execution with logging
- `file.ts` - File system operations and path utilities
- `workspace.ts` - Yarn workspace management utilities
- `publishing.ts` - Package publishing logic
- `deploy.ts` - Deployment orchestration
- `eslint-plugin.ts` - Custom ESLint rules for tldraw
- `discord.ts` - Discord webhook integrations
- `pr-info.ts` - GitHub PR metadata extraction

### Version management

- `bump-versions.ts` - Automated version bumping across packages
- `get-pr-numbers.ts` - Extracts PR numbers from commit history
- `update-pr-template.ts` - Updates GitHub PR templates

### Deployment support

- `trigger-dotcom-hotfix.ts` - Emergency deployment triggers
- `trigger-sdk-hotfix.ts` - SDK hotfix deployment
- `prune-preview-deploys.ts` - Cleanup preview deployments

## Architecture

Built on Node.js with TypeScript, using:

- **LazyRepo** for incremental build orchestration
- **yarn workspaces** for monorepo package management
- **AWS SDK** for cloud deployments and asset management
- **GitHub Actions integration** for CI/CD workflows
- **Lokalise API** for translation management

## Usage patterns

Scripts are typically run via yarn from the monorepo root:

```bash
yarn api-check           # Validate API surface
yarn context             # Find nearest CONTEXT.md
yarn refresh-context     # Update CONTEXT.md files
yarn refresh-assets      # Update icons/fonts/translations
```

Most scripts support command-line arguments and environment variables for configuration. Check individual script files for specific usage patterns.

## Development

Scripts use shared utilities from `lib/` for common operations like:

- Command execution with proper logging
- File system operations with error handling
- Workspace package discovery and management
- Git operations and PR metadata extraction

All scripts are written in TypeScript and executed via `tsx` for direct TS execution without compilation steps.
