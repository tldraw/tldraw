---
title: Incremental bindings index
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - bindings
  - index
  - incremental
  - performance
---

# Incremental bindings index

When we built tldraw's bindings system, we needed a way to quickly look up which bindings connect to any given shape. You move an arrow's target, we need to find that arrow binding instantly. You delete a shape with five attached arrows, we need to find all five bindings to clean them up. The obvious solution is an index: a map from shape IDs to their connected bindings.

The naive implementation is straightforward. Iterate through all bindings, build a map where each binding appears twice—once under its `fromId` shape, once under its `toId` shape. Done. This is O(n) where n is the total number of bindings in the document.

Here's the problem: when do you rebuild this index?

## The rebuild cost grows with document size

The simple answer is "rebuild it every time something changes." One arrow moves, rebuild the entire index. In a small document with 50 arrows, that's 50 bindings to iterate. Not a problem. In a large diagram with 2,000 arrows, that's 2,000 bindings to iterate through every time anything changes—even if only a single arrow moved.

The index becomes a bottleneck. Move one arrow, wait for 2,000 bindings to be processed. Select a shape, trigger a selection change, recompute the entire index to check if it has bindings. Zoom the viewport, potentially trigger a culling update, rebuild the index again. Every state change that touches bindings pays the full O(n) cost.

We've seen this pattern before in tldraw. The first implementation of the shape index did the same thing—full rebuild on every change. It worked fine in testing. It fell apart when we tested with thousands of shapes.

## When you can't avoid the work, avoid doing it unnecessarily

You can't escape the fact that an index needs to be built at least once. But you don't need to rebuild it from scratch every time. The document changes incrementally—one arrow moves, one binding updates. The index should update incrementally too.

What we needed was a way to take the previous index value and apply just the changes that happened since the last time we looked at it. Instead of iterating through 2,000 bindings, iterate through the 1 that changed. Instead of O(n) every time, pay O(n) once and then O(d) for subsequent updates, where d is the number of changes.

The trick is keeping track of what changed.

## Source files

- `/packages/editor/src/lib/editor/derivations/bindingsIndex.ts`
- `/packages/store/src/lib/StoreQueries.ts`
- `/packages/state/src/lib/HistoryBuffer.ts`
- `/packages/state/src/lib/Computed.ts`
