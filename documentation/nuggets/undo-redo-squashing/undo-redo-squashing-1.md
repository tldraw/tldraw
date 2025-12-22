---
title: Undo/redo squashing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - undo
  - redo
  - history
  - squashing
  - marks
status: published
date: 12/21/2025
order: 0
---

# Undo/redo squashing

When you drag a shape across the canvas, tldraw receives dozens or hundreds of position updates. If each one became a separate undo entry, pressing Ctrl+Z would step backward one pixel at a time. History systems need to collapse these changes into a single undo step, but how they do it reveals different design philosophies.

Traditional undo systems use explicit squashing—you call methods to start and end groups, or you manually combine entries on the stack. We use a different approach: changes accumulate silently until you mark a boundary. The default behavior is to combine changes, not separate them.

## How marks work

In tldraw's history system, changes flow into a pending diff. This diff sits outside the undo stack, accumulating every change you make. Nothing gets added to the stack until you create a mark.

A mark is a boundary. It says "undo should stop here." When you create a mark, we flush the pending diff onto the undo stack and push the mark itself. The mark stays there as a stopping point. Any new changes start accumulating in a fresh pending diff.

```typescript
// User starts dragging a shape
editor.markHistoryStoppingPoint('translating')

// These all accumulate in the pending diff:
editor.updateShapes([{ id: 'shape1', x: 100, y: 100 }])
editor.updateShapes([{ id: 'shape1', x: 101, y: 100 }])
editor.updateShapes([{ id: 'shape1', x: 102, y: 100 }])
// ... dozens more updates ...

// User stops dragging, tool creates another mark
editor.markHistoryStoppingPoint('translating')

// Now pressing Ctrl+Z will undo all those updates at once
```

The pending diff is invisible to the undo operation. When you press Ctrl+Z, we first grab whatever's in the pending diff, then walk backward through the undo stack until we hit a mark. Everything in between gets squashed together and reversed.

## Why this is different

Most undo systems work the other way around. They add entries to the stack immediately, then you call methods to group them:

```typescript
// Explicit squashing model (not what we do):
history.beginGroup()
updateShape({ x: 100 })
updateShape({ x: 101 })
updateShape({ x: 102 })
history.endGroup()
```

This requires tracking which changes belong together. You need to know when to start and end the group. If you forget to end it, changes keep getting added. If you forget to start it, each change becomes its own undo step.

With marks, you only specify where changes should stop combining. You don't need matching pairs of calls. You don't track whether you're inside a group. Changes just accumulate until you mark a boundary.

```typescript
// Mark-based model (what we do):
markHistoryStoppingPoint('start')
updateShape({ x: 100 })
updateShape({ x: 101 })
updateShape({ x: 102 })
markHistoryStoppingPoint('end')
```

The marks are the same conceptually, but there's no pairing requirement. Each mark stands alone as a boundary. The pending diff automatically handles everything in between.

## The pending diff

The `PendingDiff` class holds a single `RecordsDiff` that accumulates changes:

```typescript
class PendingDiff<R extends UnknownRecord> {
	private diff = createEmptyRecordsDiff<R>()
	private isEmptyAtom = atom('PendingDiff.isEmpty', true)

	clear() {
		const diff = this.diff
		this.diff = createEmptyRecordsDiff<R>()
		this.isEmptyAtom.set(true)
		return diff
	}

	apply(diff: RecordsDiff<R>) {
		squashRecordDiffsMutable(this.diff, [diff])
		this.isEmptyAtom.set(isRecordsDiffEmpty(this.diff))
	}
}
```

When a change comes in through the history interceptor, we call `apply()` with the new diff. It squashes the incoming change into the accumulated diff using `squashRecordDiffsMutable`. This function implements the core rules:

- **Added then updated**: Keep it as added with the final state
- **Updated then updated**: Keep the original state, use the final state
- **Added then removed**: Nothing (the record never existed in history)
- **Removed then added**: Update (if the values differ)

These rules ensure that when we flush the pending diff, we're adding the minimal change needed to represent everything that happened.

When you create a mark, `flushPendingDiff()` checks if the pending diff is empty. If not, it clears the diff and pushes it onto the undo stack as a single entry. Then it pushes the mark itself:

```typescript
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

## How undo works with marks

When you press Ctrl+Z, we first reverse whatever's in the pending diff. Then we walk backward through the undo stack, collecting diffs and squashing them together until we hit a mark:

```typescript
_undo({ pushToRedoStack, toMark = undefined }) {
    // Pause recording so undo doesn't create history entries
    this.state = HistoryRecorderState.Paused

    // Start with the pending diff
    const pendingDiff = this.pendingDiff.clear()
    const diffToUndo = reverseRecordsDiff(pendingDiff)

    // Skip any marks at the top of the stack
    while (undos.head?.type === 'stop') {
        undos = undos.tail
        if (undos.head?.id === toMark) break
    }

    // Collect diffs until we hit the next mark
    while (undos.head) {
        const undo = undos.head
        undos = undos.tail

        if (undo.type === 'diff') {
            squashRecordDiffsMutable(diffToUndo, [reverseRecordsDiff(undo.diff)])
        } else if (undo.type === 'stop') {
            break
        }
    }

    // Apply all changes at once
    this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
    this.stacks.set({ undos, redos })
}
```

Because we squash all the diffs together before applying them, the entire undo operation happens atomically. There are no intermediate states. The UI updates once with the final result.

## Marks in practice

Tools create marks when entering states that might be canceled:

```typescript
// From the Translating state (dragging shapes):
override onEnter(info: TranslatingInfo) {
    if (isCreating) {
        this.markId = info.creatingMarkId
    } else {
        this.markId = this.editor.markHistoryStoppingPoint('translating')
    }
}
```

The mark ID gets stored so we can bail back to it if the user cancels:

```typescript
reset() {
    this.editor.bailToMark(this.markId)
}
```

`bailToMark` is like undo, but it doesn't push anything onto the redo stack. It's as if the changes never happened. This is how pressing Escape during a drag operation works—we rewind to the mark we created on pointer down.

The drawing tool uses marks for palm rejection. When you start drawing with an Apple Pencil, we create a mark immediately. If we detect a palm gesture before a pen gesture, we bail back to that mark and restart:

```typescript
override onPointerMove() {
    if (this.isPen && !inputs.getIsPen()) {
        // Palm touched before pen—restart from mark
        if (this.markId) {
            this.editor.bailToMark(this.markId)
            this.startShape()
            return
        }
    }
}
```

This happens invisibly. The user never sees the false start.

## Why this works for us

The mark-based model fits how tldraw tools work. Tools enter states, perform continuous updates, then exit states. The state boundaries are natural places for marks. We don't need to track whether we're "in a group"—we just mark the entry point and let changes accumulate.

It also makes cancellation simple. Store the mark ID when you start an operation. If the user cancels, bail to that mark. You don't need to manually track what changed or build a reverse operation.

The pending diff as a staging area keeps the undo stack clean. Only meaningful boundaries get marks. Everything between marks squashes automatically. We never push incomplete operations onto the stack.

The tradeoff is that you need discipline about creating marks. If you forget to mark before a long operation, pressing undo will reverse too much. In practice, this hasn't been a problem—tools have clear entry points where marks belong.

## Related files

The history manager implementation lives in `/packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts`. The diff squashing algorithm is in `/packages/store/src/lib/RecordsDiff.ts`. Example usage in tools can be found in `/packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` and `/packages/tldraw/src/lib/shapes/draw/toolStates/Drawing.ts`.
