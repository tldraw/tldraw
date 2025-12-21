---
title: Jittered fractional indices
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fractional indexing
  - jitter
  - z-order
---

# Jittered fractional indices

When we added multiplayer support to tldraw, we ran into an interesting problem with concurrent shape insertions. Two users working offline would both add shapes between the same two existing shapes. When they came back online, both shapes ended up with identical z-indices, causing flickering and undefined rendering order. The issue was subtle but reproducible: fractional indexing is deterministic, so inserting between the same bounds always generates the same result.

We solved this by adding randomness—jitter—to the index generation. But introducing randomness created a new problem: how do you write tests for a system that produces different results each time?

## Disabling jitter in tests

Our test environment needs predictable, reproducible results. We can't assert exact index values if they're random. But we also can't test with a completely different code path—we want to validate the actual production logic.

The solution was to make jitter configurable and disable it during tests:

```typescript
const generateNKeysBetweenWithNoJitter = (a: string | null, b: string | null, n: number) => {
	return generateNKeysBetween(a, b, n, { jitterBits: 0 })
}

const generateKeysFn =
	process.env.NODE_ENV === 'test' ? generateNKeysBetweenWithNoJitter : generateNKeysBetween
```

When `jitterBits` is set to 0, the underlying `jittered-fractional-indexing` package skips all randomization and returns the deterministic midpoint. Production code gets the default 30 bits of entropy. Tests get repeatable sequences.

All of tldraw's public index APIs use `generateKeysFn` internally:

```typescript
export function getIndexBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined
) {
	return generateKeysFn(below ?? null, above ?? null, 1)[0] as IndexKey
}
```

This means the environment switch affects every index generation in the codebase without requiring any test-specific mocking or injection.

## Testing ordering properties

Since we can't test exact values in production mode (and shouldn't need to), our tests validate that indices maintain correct ordering:

```typescript
describe('getIndicesBetween', () => {
	it('should generate indices between two indices', () => {
		const indices = getIndicesBetween('a0' as IndexKey, 'a2' as IndexKey, 2)
		expect(indices).toHaveLength(2)
		expect(indices.every((index) => index > 'a0' && index < 'a2')).toBe(true)
	})
})
```

We check that:
- The count is correct
- All generated indices fall between the bounds
- Indices sort lexicographically in the expected order

The specific strings don't matter—only the relationships. This lets us test with deterministic indices while remaining confident that jittered indices preserve the same ordering guarantees.

## Validating indices

We also need a way to check if a string is a valid fractional index. The validation logic is simple: try to generate a key after it and see if the library throws:

```typescript
export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		generateKeyBetween(index, null)
	} catch {
		throw new Error('invalid index: ' + index)
	}
}
```

This works because the `jittered-fractional-indexing` library has its own internal validation. If you pass it malformed input, it fails when trying to split the range. We don't duplicate that validation logic—we just delegate to the library that already knows how to parse its own format.

Tests verify that valid indices pass and invalid ones throw:

```typescript
validateIndexKey('a0')  // passes
validateIndexKey('a1')  // passes
validateIndexKey('a0V') // passes

validateIndexKey('')        // throws 'invalid index: '
validateIndexKey('invalid') // throws 'invalid index: invalid'
validateIndexKey('123')     // throws 'invalid index: 123'
```

## Why this works

The key insight is that jitter changes the specific values, not the structure of the algorithm. Deterministic indices and jittered indices both:
- Sort lexicographically
- Fall within specified bounds
- Support infinite subdivision
- Use the same base-62 encoding

Jitter adds entropy to avoid collisions, but it doesn't change these fundamental properties. So we can test the unjittered version and trust that adding randomness doesn't break the ordering guarantees.

This pattern appears elsewhere in the codebase too. For example, `TickManager` uses `requestAnimationFrame` in production but switches to immediate execution in tests. Same logic, different timing behavior. The goal is always to keep the same code paths active while making the output deterministic enough to test.

## Source files

- `packages/utils/src/lib/reordering.ts` - Environment switching and public index API (lines 3-155)
- `packages/utils/src/lib/reordering.test.ts` - Test suite with ordering assertions (lines 1-169)
- `packages/editor/src/lib/utils/reorderShapes.ts` - Usage in shape reordering (lines 1-289)
