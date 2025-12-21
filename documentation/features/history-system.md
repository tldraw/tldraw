---
title: History system
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - undo
  - redo
  - history
  - HistoryManager
  - marks
  - batch
reviewed_by: steveruizok
---

## Overview

The history system enables undo/redo functionality by tracking changes to the store through the `HistoryManager`. It organizes changes into batches separated by marks, which act as stopping points for undo/redo operations. This allows complex interactions to be undone as single atomic operations rather than individual edits.

The system integrates with the reactive store to automatically capture modifications. All user-initiated changes are recorded unless explicitly ignored, and the history manager handles compressing multiple rapid changes into cohesive undo steps.

## How it works

The history manager maintains two stacks: one for undo operations and one for redo operations. Each stack contains entries that are either diffs (representing changes to records) or marks (representing stopping points).

When you modify the store, the history manager captures the change as a diff. Changes accumulate in a pending diff buffer until you create a mark, at which point the pending changes are flushed to the undo stack as a single entry. This batching prevents every keystroke or mouse movement from becoming a separate undo step.

```typescript
editor.updateShape({ id: 'shape1', type: 'geo', x: 100, y: 100 })
editor.updateShape({ id: 'shape1', type: 'geo', x: 110, y: 100 })
editor.updateShape({ id: 'shape1', type: 'geo', x: 120, y: 100 })
// All three updates are batched together until a mark is created
```

When you undo, the manager reverses all changes back to the previous mark, moves them to the redo stack, and applies the reversed diff atomically. Redoing performs the inverse operation.

## Marks and stopping points

Marks define where undo and redo operations stop. You typically create marks at the start of user interactions, ensuring that complex operations can be undone in one step.

```typescript
const markId = editor.markHistoryStoppingPoint('rotate shapes')
editor.rotateShapes(editor.getSelectedShapes(), Math.PI / 4)
// Undoing will return to this mark
```

Each mark has a unique identifier that you can use with advanced features like bailing or squashing. Creating a mark flushes pending changes and clears the redo stack, ensuring the history remains linear.

## Basic operations

### Undo and redo

The `undo()` and `redo()` methods move through history marks. Undo reverses changes back to the previous mark, while redo reapplies them.

```typescript
editor.undo() // Reverse to previous mark
editor.redo() // Reapply changes

if (editor.canUndo()) {
	editor.undo()
}

if (editor.canRedo()) {
	editor.redo()
}
```

Both methods return the editor instance for chaining. The reactive `canUndo` and `canRedo` properties let you update UI button states automatically.

### Running operations with history options

The `run()` method executes a function while controlling how changes affect history. This lets you make changes that don't pollute the undo stack or that preserve the redo stack for special operations.

```typescript
// Ignore changes (don't add to undo stack)
editor.run(
	() => {
		editor.updateShape({ id: 'shape1', type: 'geo', x: 100 })
	},
	{ history: 'ignore' }
)

// Record but preserve redo stack
editor.run(
	() => {
		editor.updateShape({ id: 'shape1', type: 'geo', x: 100 })
	},
	{ history: 'record-preserveRedoStack' }
)
```

The three history modes are:

- `record` - Default behavior: add to undo stack and clear redo stack
- `record-preserveRedoStack` - Add to undo stack but keep redo stack intact
- `ignore` - Don't add to either stack

> We use `preserveRedoStack` when selecting shapes. When you don't have any redos, then changing your selection will add an entry onto the undo stack. Normally, adding things to the undo stack will clear the redo stack. However, we use `preserveRedoStack` for selections to prevent this behavior so that you can undo, select things, maybe copy them, and then redo back to where you were before. If, however, you change selection and _then_ make a change to the document that clears the redos, then your pending selections _will_ be added to the new undo stack.

> We use `ignore` when updating the user's pointer, which is used to show a user's live cursor to collaborators.

## Advanced features

### Bailing

Bailing reverses changes without adding them to the redo stack, effectively discarding them. Use this when canceling an interaction.

```typescript
const markId = editor.markHistoryStoppingPoint('begin drag')
// User drags shapes around
// User presses escape to cancel
editor.bailToMark(markId) // Roll back and discard all changes since mark
```

The `bail()` method returns to the most recent mark, while `bailToMark(id)` returns to a specific mark.

> We use bailing while cloning shapes. A user can switch between translating shapes and cloning shapes by pressing or releasing the control modifier key during a drag interaction. When this changes, we bail on the changes since the interaction before applying the new mode's changes.

### Squashing

Squashing combines all changes since a mark into a single undo step, removing intermediate marks. This simplifies the undo experience for complex multi-step operations.

```typescript
const markId = editor.markHistoryStoppingPoint('bump shapes')
editor.nudgeShapes(shapes, { x: 10, y: 0 })
editor.nudgeShapes(shapes, { x: 0, y: 10 })
editor.nudgeShapes(shapes, { x: -5, y: -5 })
editor.squashToMark(markId) // All three nudges become one undo step
```

Squashing doesn't change the current state, only how history is organized.

> We use `squashToMark` during image cropping. As the user adjusts the cropped area, each change is recorded on the history stack, allowing them to undo or redo individual adjustments. However, when the user finishes cropping and exits this state, all of the intermediate changes are combined – or ‘squashed’ – into a single history entry. An undo will restore the image to its original state before cropping began, while a redo will restore the final state after cropping was complete.

### Clearing history

The `clearHistory()` method removes all undo and redo entries, useful when loading new documents or resetting the editor state.

```typescript
editor.loadSnapshot(snapshot)
editor.clearHistory() // Start with clean history
```

## Integration with the store

The history manager listens to store changes through a history interceptor. It only captures changes marked with source `'user'`, ignoring internal updates and external synchronization.

The manager tracks three internal states:

- `Recording` - Normal mode: capture changes and clear redo stack
- `RecordingPreserveRedoStack` - Capture changes but keep redo stack
- `Paused` - Don't capture changes (used during undo/redo operations)

This prevents undo/redo operations from creating new history entries while they apply diffs.

## Key files

- packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts - Core undo/redo logic
- packages/editor/src/lib/editor/types/history-types.ts - History batch options
- packages/editor/src/lib/editor/Editor.ts - Public API methods (undo, redo, mark, bail, squash)

## Related

- [Store](../packages/store.md)
