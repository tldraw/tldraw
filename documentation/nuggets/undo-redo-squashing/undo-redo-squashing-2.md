---
title: The diff squashing algorithm
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - undo
  - redo
  - squashing
  - history
  - diffs
status: published
date: 12/21/2025
order: 1
---

# The diff squashing algorithm

When you drag a shape across the canvas, the editor sees dozens or hundreds of position updates. If each became a separate undo entry, pressing Ctrl+Z would step backward one pixel at a time. Instead, we squash all those changes into a single atomic operation.

The core of this behavior is `squashRecordDiffsMutable`, a function that combines multiple diffs by following surprisingly simple rules. Here's how it works.

## Three categories of change

A diff tracks three types of record changes:

```typescript
interface RecordsDiff<R> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}
```

When a record is created, it appears in `added`. When modified, it goes in `updated` with its before and after states. When deleted, it moves to `removed`.

The squashing algorithm walks through incoming diffs and merges them into a target diff by applying rules for how different change types combine.

## The squashing rules

When we combine diffs, we need to handle every possible sequence of operations. The rules are:

**Added then updated**: Keep it as added with the final state.

```typescript
if (target.added[id]) {
	target.added[id] = to
	delete target.updated[id]
	delete target.removed[id]
}
```

If a record was just created and then modified, it's still a creation—just with the updated properties. There's no need to track the intermediate state.

**Updated then updated**: Chain from original to final.

```typescript
if (target.updated[id]) {
	target.updated[id] = [target.updated[id][0], to]
	delete target.removed[id]
}
```

Multiple updates to the same record collapse into a single change from the first version to the last. If you move a shape from (0,0) to (10,10) to (20,20), the diff records a single move from (0,0) to (20,20).

**Added then removed**: Nothing happened.

```typescript
if (target.added[id]) {
	delete target.added[id]
}
```

If a record is created and then deleted before the next mark, it never existed as far as undo/redo is concerned. The diff contains no reference to it.

**Removed then added**: Becomes an update if values differ.

```typescript
if (target.removed[id]) {
	const original = target.removed[id]
	delete target.removed[id]
	if (original !== value) {
		target.updated[id] = [original, value]
	}
}
```

This case is unusual but possible. If a record is deleted and then recreated with the same ID but different properties, that's effectively an update from the original to the new version.

**Updated then removed**: Removed from original state.

```typescript
if (target.updated[id]) {
	target.removed[id] = target.updated[id][0]
	delete target.updated[id]
}
```

If you modify a shape and then delete it, the undo stack needs to know about the deletion—but it should restore the original version, not the intermediate modified state.

## Why mutation

The function name ends with `Mutable` because it modifies the target diff in place rather than creating a new one:

```typescript
export function squashRecordDiffsMutable<T extends UnknownRecord>(
	target: RecordsDiff<T>,
	diffs: RecordsDiff<T>[]
): void {
	for (const diff of diffs) {
		// Apply rules to target directly
	}
}
```

This is purely for efficiency. Diffs can be large when many shapes change, and allocating intermediate objects would add overhead. Since diffs are flushed atomically, mutation is safe—no other code sees the diff while it's being built.

## Example walkthrough

Here's a typical drag operation:

1. User starts dragging (history mark created)
2. Shape moves from (0,0) to (5,5) → `updated: { shape1: [(0,0), (5,5)] }`
3. Shape moves to (10,10) → squashed to `updated: { shape1: [(0,0), (10,10)] }`
4. Shape moves to (15,15) → squashed to `updated: { shape1: [(0,0), (15,15)] }`
5. User stops dragging (history mark created)

The pending diff contains exactly one update: the shape's position changed from (0,0) to (15,15). When flushed, this becomes a single undo entry.

If the user had Alt-clicked to clone the shape mid-drag:

1. User starts dragging original shape → mark created
2. Shape moves to (10,10) → pending diff
3. User presses Alt → bail to mark (undoes the drag)
4. New mark created for cloning
5. Original shape duplicated → `added: { shape2: {...} }`
6. Both shapes move to (20,20) → squashed into added and updated

The clone appears in `added` with its final position. There's no record of intermediate positions during the drag.

## Where this lives

The squashing function is in `packages/store/src/lib/RecordsDiff.ts`. It's called from two places:

- `PendingDiff.apply()` in the history manager, which accumulates changes between marks
- `HistoryManager._undo()` and `redo()`, which squash multiple diffs when moving through the stack

You can see the full implementation in the `squashRecordDiffsMutable` function starting at line 202 of `RecordsDiff.ts`.

The rules might look mechanical, but they handle every combination of operations you can perform—create, modify, delete, and their various orderings. That simplicity is what makes the undo system reliable without requiring special-case handling for different types of edits.
