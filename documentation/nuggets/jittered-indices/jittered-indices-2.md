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

When we added fractional indexing for z-order in tldraw, we ran into a collision problem. Two users working offline would add shapes between the same two existing shapes, then sync—and both shapes would get identical indices. The shapes would flicker or render in undefined order because fractional indexing is deterministic: given the same bounds, it always generates the same result.

We added 30 bits of random jitter to each index. That sounds arbitrary. Why 30? Why not 16, or 64?

The answer comes down to the birthday problem.

## The birthday paradox

The classic birthday problem asks: how many people do you need in a room before there's a 50% chance two share a birthday? The answer is surprisingly small—just 23 people.

With fractional indices, we have the same problem. If two users insert shapes at the same position, their editors each generate a random index. With `b` bits of jitter, there are 2^b possible values. The probability that `k` insertions at the same position produce a collision follows the birthday problem formula:

```
P(collision) = 1 - (2^b)! / ((2^b - k)! × (2^b)^k)
```

For large values, this simplifies to approximately:

```
P(collision) ≈ 1 - e^(-k²/2^(b+1))
```

## What 30 bits gives us

With `b = 30`, we get 2^30 ≈ 1.07 billion possible index values. That's the birthday problem's "calendar" size.

For common scenarios:

- **2 concurrent insertions**: ~1 in 537 million chance of collision
- **10 concurrent insertions**: ~0.000004% chance
- **100 concurrent insertions**: ~0.0046% chance
- **10,000 concurrent insertions**: ~4.5% chance

That last number is important. Even with 10,000 people simultaneously inserting shapes at exactly the same position—an extreme multiplayer scenario—we still have a 95.5% chance of no collision.

In practice, collisions are even rarer because that probability is specific to a single insertion point. If users are adding shapes at different positions in the z-order, each position has its own independent lottery.

## Why not more bits?

You might think: why not use 64 bits and make collisions astronomically unlikely?

Every bit costs space and time. Jittered indices look like `'a1VK3p7q'` in base-62 encoding—about 3 extra characters compared to deterministic indices like `'a1V'`. More bits means longer strings in every shape record.

The generation algorithm works by binary splitting: for `b` bits of jitter, we call the base fractional indexing implementation `b + 1` times. For 30 bits, that's 31 calls. For 64 bits, it would be 65 calls—over twice as slow.

At 30 bits, the overhead is imperceptible at human interaction scale. Shape insertion happens in microseconds regardless. The string length difference is measured in bytes—trivial in modern storage.

## Why not fewer bits?

With 15 bits, we'd have only 32,768 possible values. The math changes dramatically:

- **2 concurrent insertions**: ~0.003% chance (30x worse)
- **100 concurrent insertions**: ~14% chance (3,000x worse)
- **10,000 concurrent insertions**: collision is virtually guaranteed

We saw collision bugs frequently enough in production with deterministic indexing that we needed a real solution. Fifteen bits would still allow collisions in realistic multiplayer scenarios. Thirty bits pushes the probability down to the point where collisions become genuinely rare events rather than expected behavior.

## The sweet spot

Thirty bits is where the tradeoffs balance. Small enough that the overhead doesn't matter. Large enough that collisions move from "this will happen" to "this probably won't happen in production."

The birthday problem shows why: collision probability grows quadratically with the number of insertions, but exponentially with the number of bits. Adding one bit doesn't just double the space—it cuts collision probability roughly in half for any given number of insertions.

We could have picked 28 or 32. But 30 is a round number in bits, the overhead is negligible, and the collision probability is low enough that we haven't seen a collision since we shipped it.

## In the codebase

The implementation lives in `packages/utils/src/lib/reordering.ts`, which wraps the `jittered-fractional-indexing` package. We default to 30 bits in production but disable jitter entirely in tests (by setting `jitterBits: 0`) for deterministic, reproducible behavior.

The binary splitting algorithm generates indices uniformly distributed within the available range. Each iteration narrows the range by half and adds one bit of randomness by randomly choosing which half to subdivide next.

For cryptographically-sensitive applications, you can replace `Math.random()` with `crypto.getRandomValues()`, but that's overkill for z-order collision avoidance. We just need unpredictable enough that concurrent insertions don't collide. Pseudorandomness works fine.
