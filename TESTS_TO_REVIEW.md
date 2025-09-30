# Tests to Review

This document identifies test files that may need cleanup based on the following criteria:

- Tests should focus on business logic, not trivial operations
- Tests should not test simple field creation/deletion or basic type operations
- Tests should be maintainable and not brittle
- Tests should not over-mock to the point of not testing underlying code
- Tests should not duplicate coverage already provided elsewhere
- Tests should not test things TypeScript already catches
- Tests should not test trivial object creation

## Analysis Results

### Packages Analyzed

- [x] packages/worker-shared
- [x] packages/validate
- [x] packages/utils
- [x] packages/tlschema
- [x] packages/sync
- [x] packages/sync-core
- [x] packages/store
- [x] packages/state
- [x] packages/state-react

---

## packages/worker-shared

### Tests Needing Cleanup

**`src/index.test.ts`**

- **Issue**: Contains only a trivial "works" test that does nothing
- **Problem**: This test serves no purpose other than making vitest pass - tests TypeScript compilation rather than business logic
- **Recommendation**: Delete this file entirely as it provides no value

**`src/env.test.ts`**

- **Issues Found**:
  - `returns environment when all required variables are present` - Tests trivial object return behavior that TypeScript guarantees
  - `accepts falsy values except undefined` - Tests type system behavior rather than business logic
  - `handles empty keys object` - Tests trivial edge case with no business value
- **Business Logic Tests (Keep)**: The error throwing tests are valuable as they test the actual validation logic

**`src/sentry.test.ts`**

- **Issues Found**:
  - Tests primarily mock setup and basic object creation rather than business logic
  - Heavy mocking obscures what's actually being tested
  - `returns null when SENTRY_DSN is undefined` - Tests simple conditional logic that could be caught by TypeScript
- **Recommendation**: Simplify to focus on core Sentry configuration logic rather than mocking internals

**`src/handleRequest.test.ts`**

- **Issues Found**:
  - `handles after function throwing error` - Over-engineered test with excessive mocking
  - `parseRequestQuery` and `parseRequestBody` tests mostly validate the validation library rather than business logic
  - Heavy mocking of router, request objects obscures actual functionality being tested
- **Business Logic Tests (Keep)**: Error handling and status code generation tests have value

**`src/userAssetUploads.test.ts`**

- **Issues Found**:
  - Extensive mocking of R2 bucket interface that doesn't test real bucket behavior
  - `propagates bucket errors` tests simple error re-throwing without business logic
  - `returns 409 when asset already exists` - While this tests business logic, the extensive interface mocking reduces confidence
- **Business Logic Tests (Keep)**: Cache behavior and response status logic are valuable

**`src/bookmarks.test.ts`**

- **Tests Look Good**: This file focuses on real business logic - URL validation, metadata extraction, image processing workflows, error handling. The mocking is appropriate and tests actual functionality.

---

## packages/validate

### Tests Analysis

**`src/test/validation.test.ts`**

- **Tests Look Good**: This file tests core validation library functionality - error messages, union types, refinement logic, performance optimizations. All tests focus on essential business logic of the validation system.

**`src/test/validation.fuzz.test.ts`**

- **Tests Look Good**: Property-based/fuzz testing is valuable for validation libraries. Tests random data generation and validation edge cases that might not be covered by unit tests.

**Overall Assessment**: The validate package has well-written tests that focus on the actual validation business logic rather than trivial operations.

---

## packages/utils

### Tests Analysis

**Overall Assessment**: Most utils tests focus on legitimate business logic and behavior verification. However, some tests show patterns that could be cleaned up:

### Tests with Minor Issues

**`src/lib/value.test.ts`**

- **Minor Issues**:
  - Tests like `isDefined` checking basic type comparisons that TypeScript would catch
  - Simple null/undefined checks are somewhat redundant with type system
- **Keep**: Tests involving filter behavior and edge cases are valuable

**`src/lib/object.test.ts`**

- **Minor Issues**:
  - `hasOwnProperty` tests checking basic property existence - mostly testing JavaScript fundamentals
  - `getOwnProperty` basic value retrieval tests
- **Keep**: Tests for edge cases like null prototype objects and overridden hasOwnProperty

**`src/lib/array.test.ts`**

- **Tests Look Good**: Focus on algorithm correctness (rotation, deduplication, etc.) - this is genuine business logic

**`src/lib/id.test.ts`**

- **Minor Issues**:
  - Tests for basic ID generation and length checking are somewhat trivial
- **Keep**: Uniqueness verification tests are valuable for ID generation

**`src/lib/bind.test.ts`**

- **Tests Look Good**: Tests decorator functionality which is complex business logic that needs verification

**`src/lib/debounce.test.ts`**

- **Tests Look Good**: Tests timing behavior and promise handling - essential for debounce functionality

**`src/lib/cache.test.ts`**

- **Tests Look Good**: Tests caching logic, callback invocation patterns - real business logic

### Recommendation

The utils package mostly has appropriate tests. The few minor issues involve tests that verify basic JavaScript/TypeScript behavior rather than complex utility logic. Most tests appropriately verify algorithmic correctness and edge case handling.

---

## packages/tlschema

### Tests Analysis - Major Issues Found

**Overall Assessment**: This package has the most problematic tests of all analyzed packages. The majority of tests focus on trivial validation rather than business logic.

### Tests Needing Cleanup

**Most asset, shape, and record test files (`src/assets/*.test.ts`, `src/shapes/*.test.ts`, `src/records/*.test.ts`)**

- **Major Issues**:
  - Tests like `should accept valid shape IDs` and `should reject IDs without shape prefix` are testing basic string validation
  - ID validation tests are redundant with TypeScript and the validation library
  - Object creation tests that simply verify field assignment
  - Simple validation of required vs optional fields

**`src/misc/TLColor.test.ts`**

- **Major Issues**:
  - `should contain all expected canvas UI color types` - Tests a static Set contains expected values (trivial)
  - `should validate all valid canvas UI color types` - Tests basic enum validation already covered by type system

**`src/translations/languages.test.ts`**

- **Major Issues**:
  - `should have unique locale identifiers` - Tests array uniqueness (trivial operation)
  - `should follow BCP 47 format patterns` - Tests regex pattern matching (not business logic)
  - `should contain data and have correct structure` - Tests basic object property existence

### Pattern of Problems

The tlschema package tests suffer from a systematic issue: they primarily test the validation schemas rather than any complex business logic. These are essentially testing:

1. **Type validation** - Already handled by TypeScript
2. **Schema validation** - Already tested in the @tldraw/validate package
3. **Basic object creation** - Trivial operations
4. **String pattern matching** - No business logic involved

### Recommended Actions

**High Priority for Cleanup**:

- All basic ID validation tests across assets, shapes, records
- Object structure validation tests
- Basic field presence/absence tests
- Simple enum/set membership tests

**Keep** (if any):

- Migration tests (actual business logic)
- Complex validation scenarios with business rules
- Edge case handling that involves domain-specific logic

### Impact

Removing these trivial tests would significantly reduce maintenance overhead while losing no meaningful test coverage, as the underlying functionality is already covered by TypeScript's type system and the validation library's own tests.

---

## packages/sync

### Tests Analysis

**`src/index.test.ts`**

- **Major Issue**: Contains only a trivial "make ci pass with empty test" placeholder
- **Recommendation**: Delete this file entirely

**`src/useSyncDemo.test.ts`**

- **Tests Look Good**: This file tests real business logic - URI encoding, host configuration, asset upload restrictions, bookmark metadata handling, file name sanitization. All tests focus on actual functionality rather than trivial operations.

---

## packages/sync-core

### Tests Analysis

**`src/lib/protocol.test.ts`**

- **Issues Found**:
  - `should return version 7 as the current version` - Tests a simple constant return value
  - `should contain all expected incompatibility reason constants` - Tests static constant values
- **Recommendation**: These are trivial constant tests that provide no business value

**`src/lib/server-types.test.ts`**

- **Tests Look Good**: Tests JSON serialization compatibility for database storage - this is legitimate business logic for persistence systems

**Other test files** (sampled):

- Most sync-core tests appear to focus on complex synchronization logic, protocol handling, and system integration - appropriate for testing

---

## packages/store

### Tests Analysis

**`src/lib/BaseRecord.test.ts`**

- **Minor Issues**:
  - `should return true/false for valid/invalid records` - Basic type checking tests
  - `should work as type guard` - Testing TypeScript's type system behavior
- **Keep**: The tests do verify runtime type guard behavior which has some value

**`src/lib/setUtils.test.ts`**

- **Tests Look Good**: Tests set operations algorithms (intersection, diffing) - legitimate mathematical business logic

**Overall Assessment**: Store package tests mostly focus on complex data structure operations, migrations, queries, and reactive patterns - appropriate testing for a sophisticated storage system.

---

## packages/state

### Tests Analysis

**`src/lib/__tests__/atom.test.ts`**

- **Tests Look Good**: Tests core reactive state functionality - atom creation, updates, epoch management, history tracking. This is complex business logic that needs verification.

**Overall Assessment**: State package tests focus on reactive programming primitives, effect scheduling, transaction management - all complex business logic that requires thorough testing.

---

## packages/state-react

### Tests Analysis

**`src/lib/useAtom.test.tsx`**

- **Tests Look Good**: Tests React integration with state system - hook behavior, re-render patterns, atom lifecycle management. Complex integration logic that needs verification.

**Overall Assessment**: State-react package tests focus on React integration patterns and hook behavior - legitimate testing of complex integration logic.

---

## Summary

### Packages with Major Test Issues

1. **packages/tlschema** - Extensive trivial validation testing
2. **packages/worker-shared** - Multiple files with over-mocking and trivial tests
3. **packages/sync** - One completely empty test file

### Packages with Minor Issues

4. **packages/utils** - Some basic JavaScript behavior tests
5. **packages/store** - Minor type checking tests

### Packages with Good Tests

6. **packages/validate** - Well-focused validation business logic
7. **packages/sync-core** - Complex synchronization logic testing
8. **packages/state** - Reactive programming primitives
9. **packages/state-react** - React integration patterns

### Overall Recommendation

The **packages/tlschema** package should be the highest priority for test cleanup, as it contains the most systematic issues with trivial validation testing that duplicates TypeScript's type checking capabilities.

---
