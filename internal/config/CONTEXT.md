# Internal Config Package

This package provides shared configuration files and utilities for the tldraw monorepo's build system, testing, and development tools.

## Purpose

The `@internal/config` package centralizes common configuration to ensure consistency across all packages in the monorepo. It includes TypeScript configurations, API documentation settings, and testing utilities.

## Key files

### TypeScript configuration

- **`tsconfig.base.json`** - Base TypeScript configuration extended by all packages
  - Enables strict mode, composite builds, and declaration generation
  - Configured for React JSX and modern ES modules
  - Includes Vitest globals for testing

- **`tsconfig.json`** - Package-specific TypeScript configuration

### API documentation

- **`api-extractor.json`** - Microsoft API Extractor configuration for generating consistent API documentation and validating public API surfaces across packages

### Testing configuration

- **`vitest/setup.ts`** - Global test setup and polyfills
  - Canvas mocking for browser-based tests
  - Animation frame polyfills
  - Text encoding utilities
  - Custom Jest-style matchers

- **`vitest/node-preset.ts`** - Node.js-specific Vitest configuration preset

## Usage

Other packages in the monorepo extend these configurations:

```json
{
	"extends": "config/tsconfig.base.json"
}
```

The testing setup is imported in package-specific Vitest configs to ensure consistent test environments across the monorepo.

## Dependencies

- **@jest/expect-utils** - Utilities for custom test matchers
- **@peculiar/webcrypto** - WebCrypto API polyfill for Node.js environments
- **jest-matcher-utils** - Formatting utilities for test output
- **lazyrepo** - Build system integration
- **vitest-canvas-mock** - Canvas API mocking for tests
