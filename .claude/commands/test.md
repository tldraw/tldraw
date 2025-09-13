---
description: Create or update vitest tests for the specified file or current context
argument-hint: [file-path] [test-type]
allowed-tools: Read, Edit, MultiEdit, Bash(yarn test:*), Bash(yarn typecheck:*)
---

# Test Creation and Management

Create comprehensive vitest tests for tldraw codebase following project conventions.

## Instructions

**Arguments:**

- `$1` (optional): File path to test (if not provided, uses current context)

## Test Requirements

### File Naming Conventions

- Unit tests: `src/lib/MyFile.test.ts` (same directory as source)
- Integration tests: `src/test/my-feature.test.ts` (separate test directory)

### Test Structure

- Use vitest framework (`import { describe, it, expect } from 'vitest'`)
- Import from relative paths (e.g., `import { atom } from '../Atom'`)
- Group related tests in `describe` blocks with clear names
- Use descriptive test names that explain the behavior being tested (e.g., `'contain data'`, `'can be updated'`)
- For editor tests requiring tldraw shapes/tools: write tests in tldraw workspace, not editor workspace
- Test all exported functions, classes, and methods
- Include edge cases and error conditions
- Test both sync and async operations where applicable
- Use both `it()` and `test()` functions as appropriate (following existing patterns)

### Test Categories

1. **Unit Tests**: Test individual functions/methods in isolation
2. **Integration Tests**: Test interaction between multiple components
3. **Editor Tests**: Test editor functionality (use tldraw workspace for default shapes)

### Running Tests

- Run specific package tests: `yarn test run` from package directory
- Run all tests: `yarn test` from repo root (avoid unless necessary)
- Type checking: `yarn typecheck`

### Test Analysis Strategy

When working with existing tests:

1. **Read existing test files** to understand current coverage and patterns
2. **Compare with source code** to identify gaps in test coverage
3. **Check for outdated assertions** that may no longer match current behavior
4. **Look for missing edge cases** or error scenarios
5. **Evaluate test structure** against tldraw conventions
6. **Assess test performance** and identify potential optimizations

## Your Task

1. **Analyze the target file** to understand its exports and functionality
2. **Check for existing tests** and determine the appropriate action:
   - If no tests exist: Create new test files following naming conventions
   - If tests exist but are incomplete: Add missing test cases and improve coverage
   - If tests exist but are outdated: Update tests to match current implementation
   - If tests are comprehensive: Review and suggest improvements or optimizations

3. **Handle existing test scenarios:**
   - **Missing coverage**: Identify untested functions/methods and add comprehensive tests
   - **Outdated tests**: Update tests that no longer match the current API or behavior
   - **Incomplete test cases**: Add missing edge cases, error conditions, or scenarios
   - **Poor test structure**: Refactor tests to follow tldraw conventions and best practices
   - **Performance issues**: Optimize slow or inefficient test patterns

4. **Write or update tests covering:**
   - All exported functions/classes/methods
   - Happy path scenarios
   - Edge cases and error conditions
   - Type safety where applicable
   - State changes and side effects
   - Transaction handling and rollbacks (where applicable)

5. **Ensure tests follow tldraw testing patterns and best practices:**
   - Use relative imports for local modules
   - Group logically related tests in describe blocks
   - Test both individual functions and their interactions
   - Include async test patterns when needed
   - Maintain consistent naming and structure with existing tests

6. **Validate and finalize:**
   - Run tests to verify they pass
   - Check test coverage is comprehensive
   - Ensure new/updated tests integrate well with existing test suite

### Tips

If testing editor functionality, remember to use the tldraw workspace for access to default shapes and tools.

When writing tests, NEVER modify the source code that you are testing.

Use test.fails on tests that are failing if you are >75% confident that the tests themselves are correct and that the underlying issue is with the code you're testing. It is possible that the code that you're testing has a bug in it. Do not try to fix the bug. Do not try to write your test in a way that causes the test to pass despite the bug.

We have a linter that will remove any unused imports. You will need to add imports only when they are used.

You can use `npx tsx` to run the code that you are testing.
