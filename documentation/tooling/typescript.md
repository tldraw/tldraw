---
title: TypeScript configuration
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - typescript
  - tsconfig
  - types
  - configuration
---

tldraw uses TypeScript throughout the codebase with project references for fast incremental compilation.

## Configuration structure

### Root tsconfig.json

The root config extends a base and references all packages:

```json
{
  "extends": "./config/tsconfig.base.json",
  "references": [
    { "path": "packages/editor" },
    { "path": "packages/tldraw" },
    { "path": "packages/store" }
  ]
}
```

### Package tsconfig.json

Each package has its own config:

```json
{
  "extends": "../../config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../store" },
    { "path": "../tlschema" }
  ]
}
```

### Base config

Shared compiler options in `config/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  }
}
```

## Type checking

### Running typecheck

```bash
# From repository root
yarn typecheck

# From specific workspace
cd packages/editor
yarn typecheck
```

### Important notes

- Always use `yarn typecheck`, never bare `tsc`
- Run typecheck from the root for full project validation
- Individual packages use `tsc --build` for project references

## Project references

Project references enable:

- Incremental compilation
- Faster rebuilds
- Proper dependency ordering
- Separate output per package

### Defining references

```json
{
  "references": [
    { "path": "../store" }
  ]
}
```

### Building with references

```bash
# Build all referenced projects
tsc --build

# Clean and rebuild
tsc --build --clean
```

## Strict mode

tldraw uses strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

## Module resolution

Using bundler resolution for modern tooling:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true
  }
}
```

## Declaration files

Generated `.d.ts` files for public APIs:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "declarationDir": "./dist"
  }
}
```

## API Extractor

Public API surface validated with Microsoft API Extractor:

```bash
# Validate API consistency
yarn api-check

# Update API snapshots
yarn api-update
```

API reports stored in `api/` directories:

```
packages/editor/
├── api/
│   └── editor.api.md
├── src/
└── package.json
```

## Path mapping

For development convenience:

```json
{
  "compilerOptions": {
    "paths": {
      "@tldraw/editor": ["../editor/src"],
      "@tldraw/store": ["../store/src"]
    }
  }
}
```

## JSX configuration

React JSX transform settings:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

## Common issues

### "Cannot find module"

```bash
# Rebuild TypeScript projects
yarn typecheck

# Or rebuild completely
yarn build
```

### Declaration errors

Ensure proper references in tsconfig:

```json
{
  "references": [
    { "path": "../dependency-package" }
  ]
}
```

### Incremental build issues

```bash
# Clear TypeScript build info
rm -rf **/tsconfig.tsbuildinfo

# Rebuild
yarn typecheck
```

## Best practices

1. **Always run typecheck**: Before committing changes
2. **Maintain references**: Keep project references up to date
3. **Use workspace types**: Import from `@tldraw/package` not relative paths
4. **Check API changes**: Run `yarn api-check` for public API changes

## Key files

- `config/tsconfig.base.json` - Base configuration
- `tsconfig.json` - Root references
- `packages/*/tsconfig.json` - Package configs
- `api/*.api.md` - API reports

## Related

- [LazyRepo](./lazyrepo.md) - Build system
- [Commands reference](../reference/commands.md) - Available commands
