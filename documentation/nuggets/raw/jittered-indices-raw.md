# Jittered fractional indices: raw notes

Internal research notes for the jittered-indices.md article.

## Core problem

**Scenario:** Two users offline, both add shapes between same two existing shapes, both come back online. Result: identical z-indices causing flickering/undefined rendering order.

**Root cause:** Fractional indexing is deterministic. Given same bounds (e.g., between 'a1' and 'a2'), always generates same result ('a1V').

**Production observation:** This happened frequently enough with offline-first multiplayer to require fixing.

## Fractional indexing background

**Why not integers:**
- Traditional integer ordering (1, 2, 3...) requires renumbering on insertion
- Insert between 1 and 2 → must renumber 2→3, 3→4, etc.
- In multiplayer/offline scenarios, creates merge conflicts on every concurrent insertion

**Fractional indexing properties:**
- Uses lexicographically sortable strings
- Infinite subdivision possible
- Between 'a1' and 'a3' → 'a2'
- Between 'a1' and 'a2' → 'a1V'
- Between 'a1' and 'a1V' → 'a1G'
- No renumbering required, ever

**Base implementation:**
- Based on David Greenspan's "Implementing Fractional Indexing" (Observable HQ)
- Implemented by Rocicorp as `fractional-indexing` package
- Uses base-62 encoding by default

## Jittered implementation

**Package:** `jittered-fractional-indexing` v1.0.0
- Located in `packages/utils/package.json` dependencies
- Author: nathanhleung
- Built on top of `fractional-indexing` v3.2.0
- License: CC0-1.0

**Algorithm: Binary splitting**

From `jittered-fractional-indexing` README and type definitions:

```typescript
/**
 * Generates a fractional index key between two keys, with `jitterBits` for
 * collision avoidance.
 *
 * The implementation works by binary splitting the key range until the desired
 * number of bits of jitter is reached. For instance, for one bit of jitter, we
 * first generate a key between the original lower and upper bounds, then with
 * 50% probability each, we either generate a key between the original lower
 * bound and the midpoint, or a key between the midpoint and the original upper
 * bound. At this point, we have one bit of jitter, so we return this key.
 *
 * Runs in O(`jitterBits`) time with respect to the underlying
 * `fractional-indexing` implementation (specifically, for `b` bits of jitter,
 * we call the underlying, unjittered implementation of `generateKeyBetween`
 * `b + 1` times).
 */
export declare function generateKeyBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  opts?: {
    digits?: string;
    jitterBits?: number;        // Defaults to 30
    getRandomBit?: () => boolean; // Defaults to Math.random() < 0.5
  }
): string;
```

**Step-by-step for 1 bit of jitter:**
1. Generate midpoint between bounds a and b
2. With 50% probability, pick either:
   - Generate between a and midpoint, OR
   - Generate between midpoint and b
3. Result: one random bit

**For 30 bits:**
- Repeat process 30 times
- Each iteration narrows the range and adds one bit of randomness
- Final result: uniformly distributed within original bounds
- Total calls to base implementation: 31 (30 iterations + initial midpoint)

## tldraw integration

**Location:** `packages/utils/src/lib/reordering.ts`

**Environment-based switching:**

```typescript
const generateNKeysBetweenWithNoJitter = (a: string | null, b: string | null, n: number) => {
	return generateNKeysBetween(a, b, n, { jitterBits: 0 })
}

const generateKeysFn =
	process.env.NODE_ENV === 'test' ? generateNKeysBetweenWithNoJitter : generateNKeysBetween
```

**Lines:** 3-8

**Rationale:**
- Production: Always use jitter (default 30 bits)
- Tests: Disable jitter (jitterBits: 0) for deterministic, reproducible results

**Public API:**

```typescript
export type IndexKey = string & { __brand: 'indexKey' }

export const ZERO_INDEX_KEY = 'a0' as IndexKey

export function getIndicesBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
	n: number
) {
	return generateKeysFn(below ?? null, above ?? null, n) as IndexKey[]
}

export function getIndexBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined
) {
	return generateKeysFn(below ?? null, above ?? null, 1)[0] as IndexKey
}

// Also: getIndicesAbove, getIndicesBelow, getIndexAbove, getIndexBelow, getIndices
```

**Lines:** 17-155

## Collision probability math

**Formula (birthday bounds):**

For `k` keys and `b` bits of jitter, probability of collision:

```
P(collision) = 1 - (2^b)! / ((2^b - k)! * (2^b)^k)
```

**Default configuration (b = 30 bits):**
- Total possible values: 2^30 = 1,073,741,824
- With k = 10,000 concurrent insertions at same position: ~4.5% collision chance
- With k = 2 concurrent insertions: ~1 in 537 million collision chance

**From package documentation:**
> "When `b = 30` and `k = 10_000`, we get a ~4.5% chance of collision. Note that this probability is specific to `a` and `b`, i.e., it is when 10,000 keys are generated at the same time for the same `a` and `b`; it is not a general probability of collision for all key ranges."

## Performance characteristics

**Time complexity:** O(jitterBits)
- For 30 bits: calls base `generateKeyBetween` 31 times
- At human interaction scale: imperceptible
- At massive scale (thousands of concurrent insertions): might consider fewer bits

**Space overhead:**
- Deterministic index: ~3 characters (e.g., 'a1V')
- Jittered index: ~3 additional characters (e.g., 'a1VK3p7q')
- Total overhead: ~3 characters per index on average

**From article:**
> "A deterministic index might be `'a1V'` while a jittered one might be `'a1VK3p7q'`."

## Usage in shape operations

**Reordering shapes:**

File: `packages/editor/src/lib/utils/reorderShapes.ts`

Key operations using `getIndicesBetween`:

1. **To back** (lines 64-104):
```typescript
function reorderToBack(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	// Find first non-moving shape from bottom
	// Generate indices between below (if any) and that shape
	const indices = getIndicesBetween(below, above, moving.size)
	// Apply indices to moving shapes
}
```

2. **To front** (lines 113-153):
```typescript
function reorderToFront(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	// Find first non-moving shape from top
	// Generate indices between that shape and above (if any)
	const indices = getIndicesBetween(below, above, moving.size)
}
```

3. **Forward/Backward** (lines 183-288):
Uses `getIndicesBetween` with overlap detection to move shapes one layer at a time.

**Reparenting shapes:**

File: `packages/editor/src/lib/utils/reparenting.ts`

Uses `getIndexBetween` and `getIndexAbove` when assigning indices to shapes being moved to new parents (lines 103-127):

```typescript
// If old parent is direct child of new parent, insert above old parent
const indexKeyAbove = siblingsIndexAbove
	? editor.getShape(siblingsIndexAbove)!.index
	: getIndexAbove(prevParent.index)
insertIndexKey = getIndexBetween(prevParent.index, indexKeyAbove)
```

## Constants

From `packages/utils/src/lib/reordering.ts`:

```typescript
export const ZERO_INDEX_KEY = 'a0' as IndexKey  // Line 23
```

**Default jitter configuration (from package):**
```typescript
jitterBits: 30  // Default entropy
digits: BASE_62_DIGITS  // 0-9, A-Z, a-z (base-62 encoding)
getRandomBit: () => Math.random() < 0.5  // Default RNG
```

## Cryptographic randomness option

**From package documentation:**

For cryptographically-sensitive applications, can replace default `Math.random()`:

```typescript
// Browser
const getRandomBit = () => {
  const arr = new Uint8Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] & 1) === 1;
}

// Node.js
import crypto from 'node:crypto';
const getRandomBit = () => {
  return (crypto.randomBytes(1)[0] & 1) === 1;
}
```

**Requirement:** Must return uniformly-distributed boolean (50/50 chance) for unbiased keys.

## Alternative configurations

**Fewer jitter bits:**

For extremely high-volume scenarios, can reduce bits:

```typescript
generateNKeysBetween('a1', 'a2', 1, { jitterBits: 15 })
// 2^15 = 32,768 possible values
// Faster generation (16 calls vs 31 calls)
// Higher collision probability
```

**No jitter (deterministic):**

```typescript
generateNKeysBetween('a1', 'a2', 1, { jitterBits: 0 })
// Always returns same result for same inputs
// Used in tldraw tests
```

## Test patterns

From `packages/utils/src/lib/reordering.test.ts`:

Tests verify indices are ordered correctly but don't check specific values (because jitter is disabled in tests):

```typescript
describe('getIndicesBetween', () => {
	it('should generate indices between two indices', () => {
		const indices = getIndicesBetween('a0' as IndexKey, 'a2' as IndexKey, 2)
		expect(indices).toHaveLength(2)
		expect(indices.every((index) => index > 'a0' && index < 'a2')).toBe(true)
	})
})
```

Lines 30-46 show tests validate ordering properties, not exact values.

## Index validation

From `packages/utils/src/lib/reordering.ts`:

```typescript
export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		generateKeyBetween(index, null)
	} catch {
		throw new Error('invalid index: ' + index)
	}
}
```

Lines 31-37

Validates by attempting to generate a key after the given index. If underlying library throws, index is invalid.

## Sorting utilities

```typescript
export function sortByIndex<T extends { index: IndexKey }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}
```

Lines 173-180

Simple lexicographic comparison. Works because fractional indices are designed to sort correctly as strings.

## Edge cases

**Null/undefined bounds:**
- `getIndexBetween(null, 'a2')` → generates index below 'a2'
- `getIndexBetween('a1', null)` → generates index above 'a1'
- `getIndexBetween(null, null)` → generates new index (typically starts at 'a1')

**Validation examples from tests:**

```typescript
// Valid
validateIndexKey('a0')  // passes
validateIndexKey('a1')  // passes
validateIndexKey('a0V') // passes

// Invalid
validateIndexKey('')        // throws 'invalid index: '
validateIndexKey('invalid') // throws 'invalid index: invalid'
validateIndexKey('123')     // throws 'invalid index: 123'
```

Lines 16-28 in test file

## Multiple key generation

**API for generating N keys:**

```typescript
export function generateNKeysBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  n: number,
  opts?: {
    digits?: string;
    jitterBits?: number;
    getRandomBit?: () => boolean;
  }
): string[]
```

**Implementation strategy:**
1. Generate n+1 evenly-spaced keys between a and b (no jitter)
2. For each adjacent pair, generate a jittered key between them
3. Result: n keys evenly distributed with individual jitter

**Time complexity:** O(n * jitterBits)

For n=10 keys with 30 bits: ~310 calls to base implementation

## Production trade-offs

**Why 30 bits is reasonable:**
- String overhead: ~3 characters (trivial in modern storage)
- CPU overhead: 31 function calls (imperceptible at human scale)
- Collision prevention: Virtually eliminates the flickering bug
- User experience: Shapes maintain predictable z-order in multiplayer

**Alternative approaches considered (implicit from design):**
- Server-side coordination: Would add latency to every insertion
- Timestamp-based: Clock skew could still cause collisions
- UUID-based: Would break sortability, require separate order field
- Higher precision timestamps: Still deterministic if generated simultaneously

## Key source files

- `packages/utils/src/lib/reordering.ts` - Index generation with jitter (lines 1-200)
- `packages/utils/src/lib/reordering.test.ts` - Test suite (lines 1-169)
- `packages/editor/src/lib/utils/reorderShapes.ts` - Shape reordering operations (lines 1-289)
- `packages/editor/src/lib/utils/reparenting.ts` - Index assignment when reparenting (lines 1-324)
- `node_modules/jittered-fractional-indexing/README.md` - Algorithm documentation
- `node_modules/jittered-fractional-indexing/dist/index.d.ts` - Type definitions (lines 1-79)

## Related patterns in codebase

Other uses of `process.env.NODE_ENV === 'test'`:
- `packages/store/src/lib/isDev.ts:3` - Development mode detection
- `packages/utils/src/lib/throttle.ts:3` - Disable throttling in tests
- `packages/editor/src/lib/editor/managers/TickManager/TickManager.ts:5` - RAF vs immediate execution

Pattern: Deterministic behavior in tests, production-optimized behavior in runtime.
