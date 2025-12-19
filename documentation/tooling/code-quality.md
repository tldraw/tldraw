---
title: Code quality
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - linting
  - eslint
  - prettier
  - formatting
---

tldraw maintains code quality through ESLint for linting, Prettier for formatting, and automated checks.

## Linting with ESLint

### Running lint

```bash
# Lint all packages
yarn lint

# Lint specific package
cd packages/editor
yarn lint
```

### Configuration

ESLint config at `.eslintrc.js`:

```javascript
module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'react', 'react-hooks'],
	rules: {
		// Custom rules
	},
}
```

### Key rules

```javascript
{
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // React
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  }
}
```

## Formatting with Prettier

### Running format

```bash
# Format all files
yarn format

# Check formatting without fixing
yarn format --check
```

### Configuration

Prettier config at `.prettierrc`:

```json
{
	"semi": false,
	"singleQuote": true,
	"trailingComma": "es5",
	"tabWidth": 2,
	"useTabs": true,
	"printWidth": 100
}
```

### Editor integration

VS Code settings for auto-format:

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Type checking

```bash
# Type check all packages
yarn typecheck

# Run from repository root, not individual packages
```

See [TypeScript configuration](./typescript.md) for details.

## API validation

Public API consistency checked with API Extractor:

```bash
# Check API hasn't changed unexpectedly
yarn api-check

# Update API snapshots after intentional changes
yarn api-update
```

## Pre-commit hooks

Husky runs checks before commits:

```bash
# Hooks defined in .husky/
# - pre-commit: lint-staged
# - commit-msg: commitlint
```

### lint-staged

```json
{
	"lint-staged": {
		"*.{ts,tsx}": ["eslint --fix", "prettier --write"],
		"*.{json,md}": ["prettier --write"]
	}
}
```

## CI checks

Automated checks run on pull requests:

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn test run
```

## Bundle size checking

```bash
# Validate bundle sizes haven't regressed
yarn check-bundle-size
```

## Common issues

### ESLint errors on save

```bash
# Fix auto-fixable issues
yarn lint --fix
```

### Prettier conflicts

```bash
# Format specific file
npx prettier --write path/to/file.ts
```

### Type errors

```bash
# Full typecheck from root
yarn typecheck
```

## Best practices

1. **Run before committing**: `yarn lint && yarn typecheck`
2. **Fix lint warnings**: Don't ignore eslint-disable without reason
3. **Consistent formatting**: Use editor integration
4. **Review CI failures**: Fix before merging

## Key files

- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.husky/` - Git hooks
- `config/` - Shared configurations

## Related

- [TypeScript configuration](./typescript.md) - Type checking
- [Commands reference](../reference/commands.md) - Available commands
