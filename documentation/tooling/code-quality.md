---
title: Code quality
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - linting
  - eslint
  - prettier
  - formatting
  - api-extractor
---

## Overview

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

### What TypeScript catches

TypeScript excels at finding certain classes of bugs:

- **Null and undefined access**: Strict null checks catch property access on potentially undefined values.
- **Wrong argument types**: Passing a string where a number is expected fails at compile time.
- **Missing properties**: Object shapes must match their type definitions.
- **Incorrect return types**: Functions must return values matching their declared return type.

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
