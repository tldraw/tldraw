---
title: Undo/redo squashing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - undo
  - redo
  - squashing
status: published
date: 12/21/2025
order: 4
---

# Undo/redo squashing

When you drag a shape across the canvas, the editor receives dozens of position updates—one for every pixel of movement. If each became a separate undo entry, pressing Ctrl+Z would step backwards one pixel at a time. Useless. tldraw collapses these changes automatically, so the entire drag becomes a single undo step. This happens without explicit squashing calls; it's a natural consequence of how the history system structures changes around marks.

## The mark-based model

Most undo systems work by creating explicit undo entries: "here's a change, add it to the stack." tldraw works differently. Changes accumulate silently in a pending diff, and marks define where the undo stack should stop.

```typescript
// User starts dragging a shape
this.markId = this.editor.markHistoryStoppingPoint('translating')

// Many position updates happen, all accumulating in the pending diff
// ...shape moves to (10, 5)
// ...shape moves to (10, 10)
// ...shape moves to (15, 15)

// User releases - the drag is complete
// All those updates are now one undo step (everything since the mark)
```

The key insight: squashing is the default, not an opt-in feature. Every change between two marks automatically becomes one undo entry. You don't squash changes together; you mark where they should be separated.

## The pending diff

The `HistoryManager` maintains a `PendingDiff` that accumulates all changes since the last mark. When changes occur, they flow into this pending diff:

```typescript
// In the history interceptor
switch (this.state) {
	case HistoryRecorderState.Recording:
		this.pendingDiff.apply(entry.changes)
		this.stacks.update(({ undos }) => ({ undos, redos: stack() }))
		break
	// ...
}
```

The pending diff doesn't go on the undo stack immediately. It sits there, accepting more changes, until something flushes it—typically creating a new mark:

```typescript
private flushPendingDiff() {
  if (this.pendingDiff.isEmpty()) return

  const diff = this.pendingDiff.clear()
  this.stacks.update(({ undos, redos }) => ({
    undos: undos.push({ type: 'diff', diff }),
    redos,
  }))
}

_mark(id: string) {
  transact(() => {
    this.flushPendingDiff()
    this.stacks.update(({ undos, redos }) => ({
      undos: undos.push({ type: 'stop', id }),
      redos
    }))
  })
}
```

Creating a mark flushes the pending diff onto the stack, then pushes the mark itself. The mark acts as a boundary: "undo should stop here."

## Diff squashing algorithm

When multiple changes affect the same record, they need to be combined intelligently. The `squashRecordDiffsMutable` function handles this:

```typescript
export function squashRecordDiffsMutable<T extends UnknownRecord>(
	target: RecordsDiff<T>,
	diffs: RecordsDiff<T>[]
): void {
	for (const diff of diffs) {
		// Added records
		for (const [id, value] of objectMapEntries(diff.added)) {
			if (target.removed[id]) {
				// Was removed, now added back = update
				const original = target.removed[id]
				delete target.removed[id]
				if (original !== value) {
					target.updated[id] = [original, value]
				}
			} else {
				target.added[id] = value
			}
		}

		// Updated records
		for (const [id, [_from, to]] of objectMapEntries(diff.updated)) {
			if (target.added[id]) {
				// Was just added, keep it as added with new value
				target.added[id] = to
			} else if (target.updated[id]) {
				// Chain updates: keep original 'from', use new 'to'
				target.updated[id] = [target.updated[id][0], to]
			} else {
				target.updated[id] = diff.updated[id]
			}
		}

		// Removed records
		for (const [id, value] of objectMapEntries(diff.removed)) {
			if (target.added[id]) {
				// Added then removed = nothing happened
				delete target.added[id]
			} else if (target.updated[id]) {
				// Updated then removed = removed from original state
				target.removed[id] = target.updated[id][0]
				delete target.updated[id]
			} else {
				target.removed[id] = value
			}
		}
	}
}
```

The algorithm collapses sequences like:

- Add → Update → Update = Add (with final state)
- Update → Update → Update = Update (original → final)
- Add → Remove = Nothing
- Remove → Add = Update (if values differ)
- Update → Remove = Remove (from original state)

This means the undo stack stores the minimal representation of what changed, not the full history of intermediate states.

## The undo stack structure

The undo and redo stacks use an immutable linked list:

```typescript
class StackItem<T> {
	constructor(
		public readonly head: T,
		public readonly tail: Stack<T>
	) {
		this.length = tail.length + 1
	}

	push(head: T): Stack<T> {
		return new StackItem(head, this)
	}
}
```

Immutability here isn't about safety—it's about efficiency. Pushing a new item creates a new stack that shares its tail with the old stack. This makes both push and maintaining multiple references cheap.

The stack contains two types of entries:

```typescript
type TLHistoryEntry<R> =
	| { type: 'stop'; id: string } // Mark
	| { type: 'diff'; diff: RecordsDiff<R> } // Actual changes
```

Marks are just stopping points with IDs. Diffs contain the actual record changes.

## How undo works

When you press undo, the system doesn't just pop one item off the stack. It collects everything back to the last mark:

```typescript
_undo({ pushToRedoStack, toMark }) {
  // Start with the pending diff (changes since last mark)
  const pendingDiff = this.pendingDiff.clear()
  const diffToUndo = reverseRecordsDiff(pendingDiff)

  // Skip any marks at the top
  while (undos.head?.type === 'stop') {
    undos = undos.tail
  }

  // Collect diffs until we hit a mark (or toMark if specified)
  while (undos.head) {
    const undo = undos.head
    undos = undos.tail

    if (undo.type === 'diff') {
      squashRecordDiffsMutable(diffToUndo, [reverseRecordsDiff(undo.diff)])
    } else {
      // Hit a mark - stop here
      break
    }
  }

  // Apply the reversed, squashed diff
  this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
}
```

The result: all changes since the last mark are undone atomically. If you dragged a shape through 50 positions, they all revert in one step.

## Marks in practice

Tools create marks at interaction boundaries. The Translating state (for dragging shapes) shows the pattern:

```typescript
override onEnter(info: TranslatingInfo) {
  if (isCreating) {
    // Use the existing creating mark
    this.markId = creatingMarkId
  } else {
    // Create a new mark for this drag
    this.markId = this.editor.markHistoryStoppingPoint('translating')
  }
  // ... begin dragging
}
```

If the user cancels (presses Escape), the tool can bail back to that mark:

```typescript
private cancel() {
  this.editor.bailToMark(this.markId)
  this.parent.transition('idle')
}
```

`bailToMark` is like undo but doesn't push to the redo stack—it's as if the changes never happened.

## The redo stack

When you undo, the undone entries move to the redo stack:

```typescript
if (pushToRedoStack && !isPendingDiffEmpty) {
	redos = redos.push({ type: 'diff', diff: pendingDiff })
}
```

Normal changes clear the redo stack (you branched history), but there's a special mode `record-preserveRedoStack` that lets you make changes without losing redo history. This is used for things like selection changes—selecting different shapes shouldn't prevent you from redoing.

## Batch modes

The `batch` method controls how changes interact with history:

```typescript
editor.history.batch(
	() => {
		editor.updateShapes(/* ... */)
		editor.updateShapes(/* ... */)
	},
	{ history: 'record' }
) // Normal recording

editor.history.batch(
	() => {
		editor.setSelectedShapes(/* ... */)
	},
	{ history: 'ignore' }
) // Don't record at all
```

Three modes:

- `record`: Normal behavior—add to undo stack, clear redo stack
- `record-preserveRedoStack`: Add to undo stack but keep redo stack intact
- `ignore`: Don't record to history at all (for transient UI state)

## Why marks instead of explicit squashing

The mark-based approach has a key advantage: you don't need to know in advance which changes will be squashed together. The Translating state creates a mark when dragging starts, but it doesn't know how many position updates will follow. It doesn't need to—all updates automatically accumulate until something creates a new mark.

This also handles nested operations naturally. If a tool calls a helper that makes its own changes, those changes join the same pending diff. No explicit "squash with previous" calls needed.

The tradeoff is that you need to create marks at the right places. Forget a mark before a user interaction and changes from different interactions might merge together. But in practice, the pattern is consistent: mark at the start of any user-initiated change.

## Key files

- `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts` — The history manager implementation
- `packages/store/src/lib/RecordsDiff.ts` — Diff types and the squashRecordDiffsMutable function
- `packages/editor/src/lib/editor/types/history-types.ts` — TLHistoryEntry and TLHistoryBatchOptions types
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` — Example of mark usage in a tool

## Related

- [Sync](./sync.md) — How diffs are used for real-time synchronization
- [Incremental bindings index](./incremental-bindings.md) — Another use of diff-based change tracking
