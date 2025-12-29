---
title: Jittered fractional indices
created_at: 12/20/2025
updated_at: 12/21/2025
keywords:
  - fractional indexing
  - z-order
  - multiplayer
  - offline
  - sync
  - collision
  - randomness
status: published
date: 12/21/2025
order: 0
---

# Jittered fractional indices

Two users go offline. Both add a shape to the same canvas position. Both come back online. Their shapes stack on top of each other with identical z-indices, flickering between which one appears on top depending on sync order. This happened often enough in production that we needed to fix it.

The problem: fractional indexing—our solution for ordering shapes without renumbering everything—is deterministic. Given the same inputs, it produces the same output. That's usually fine, but breaks down in offline-first multiplayer.

## Why fractional indices

Traditional integer ordering fails for collaborative editing. If shapes are ordered 1, 2, 3 and you want to insert between 1 and 2, you must renumber 2 to 3, 3 to 4, and so on. Every insertion potentially touches every item. With offline support, this creates merge conflicts every time two users insert at the same position.

Fractional indices use strings that sort lexicographically and can always be subdivided. Between `'a1'` and `'a3'` you can generate `'a2'`. Between `'a1'` and `'a2'` you can generate `'a1V'`. The space is infinite—you never run out of room to insert.

```typescript
getIndexBetween('a1', 'a3') // Returns 'a2'
getIndexBetween('a1', 'a2') // Returns 'a1V'
getIndexBetween('a1', 'a1V') // Returns 'a1G'
```

This solves the renumbering problem completely. No matter how many shapes exist or where you want to insert, you generate a single new index that slots into position without touching anything else.

## The collision scenario

Deterministic generation creates collisions in offline scenarios:

1. Alice and Bob both have shapes at indices `'a1'` and `'a2'`
2. Both users go offline
3. Both users drag a new shape between those two shapes
4. Both clients deterministically generate index `'a1V'` for their new shape
5. Both users come back online and sync
6. Two different shapes now have identical indices

When rendering, the editor must pick which shape appears on top. Depending on sync timing and internal record ordering, users might see different stacking orders. Worse, if you try to interact with the "top" shape, which shape that is might differ between clients.

This wasn't theoretical—we saw it regularly in production, especially when multiple users worked offline and synced later. The shapes wouldn't properly interleave; they'd cluster at the same index value with undefined rendering order.

## Adding randomness

We add random bits to the generated index. Instead of always producing `'a1V'`, we generate `'a1V8tX'` or `'a1VK3p'` or any of billions of other values between `'a1'` and `'a2'`. The indices still sort correctly—they're all between the bounds—but collisions become vanishingly rare.

We use the `jittered-fractional-indexing` package, which generates indices with 30 bits of entropy by default:

```typescript
import { generateNKeysBetween } from 'jittered-fractional-indexing'

// Production: 30 bits of jitter (default)
generateNKeysBetween('a1', 'a2', 1)
// Returns something like ['a1VK3p7q']

// Tests: deterministic results
generateNKeysBetween('a1', 'a2', 1, { jitterBits: 0 })
// Always returns ['a1V']
```

In production, jitter is always enabled. In tests, we disable it so results are reproducible.

## The math

With 30 bits of entropy, there are 2^30 = 1,073,741,824 possible values between any two indices. Using birthday bound analysis, even if 10,000 users simultaneously insert shapes at the exact same position with the exact same neighboring indices, there's only a ~4.5% chance of any collision occurring.

For typical usage—two users inserting concurrently—the collision probability is roughly 1 in 537 million. At these odds, collisions should be extremely rare in practice.

The tradeoff: jittered indices are about 3 characters longer on average. A deterministic index might be `'a1V'` while a jittered one might be `'a1VK3p7q'`. Given that the alternative is shapes stacking unpredictably in multiplayer, this is trivial.

## How the jittering works

The algorithm uses binary splitting. To add one bit of entropy:

1. Generate a midpoint index between the lower and upper bounds
2. With 50% probability, either:
   - Generate a key between the lower bound and the midpoint, or
   - Generate a key between the midpoint and the upper bound
3. This gives you one random bit

For 30 bits, repeat this 30 times, narrowing the range each time. The result is a uniformly distributed random position within the original bounds.

This runs in O(jitterBits) time—for 30 bits of jitter, we call the base fractional indexing algorithm 31 times. At human scale this is imperceptible. At massive scale (thousands of concurrent insertions) you might consider fewer jitter bits, but we've never hit this limit.

## A small cost for a big win

Three extra characters per index is a trivial cost. The flickering z-order bugs were genuinely confusing for users—shapes would appear to jump between layers unpredictably, and different users would see different stacking orders for the same document. The randomness eliminates this entire class of problem while remaining invisible to users.

## Key files

- `packages/utils/src/lib/reordering.ts` — Index generation with jitter
- `packages/editor/src/lib/utils/reorderShapes.ts` — Shape reordering operations
- `packages/editor/src/lib/utils/reparenting.ts` — Index assignment when reparenting shapes
