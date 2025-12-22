---
title: Undo/redo squashing - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - undo
  - redo
  - squashing
status: published
date: 12/21/2025
order: 3
---

# Undo/redo squashing: raw notes

Internal research notes for the undo-redo-squashing.md article.

## Core problem

When a user drags a shape across the canvas, the editor receives many position updates (potentially dozens or hundreds). If each update became a separate undo entry, pressing Ctrl+Z would step backward one pixel at a time, which would be useless. The history system needs to automatically collapse these changes into a single undo step.

## Mark-based model vs explicit squashing

**Traditional approach (explicit squashing):**

- Create undo entries explicitly: "add this change to the stack"
- Manually call squash operations to combine entries
- Need to track which changes should be combined
- Requires explicit "begin group" / "end group" operations

**tldraw's mark-based approach (implicit squashing):**

- Changes accumulate silently in a pending diff
- Marks define boundaries where undo should stop
- Squashing happens automatically between marks
- Default behavior is to combine changes, not separate them
- Only need to mark where changes should be separated

## Key architectural components

### HistoryRecorderState enum

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:14-18`

```typescript
enum HistoryRecorderState {
	Recording = 'recording',
	RecordingPreserveRedoStack = 'recordingPreserveRedoStack',
	Paused = 'paused',
}
```

- **Recording**: Normal mode - adds to undo stack, clears redo stack
- **RecordingPreserveRedoStack**: Adds to undo stack but preserves redo stack (for non-branching changes like selection)
- **Paused**: No recording at all (for transient UI state)

Maps to batch options via `modeToState` constant (line 323-327):

```typescript
const modeToState = {
	record: HistoryRecorderState.Recording,
	'record-preserveRedoStack': HistoryRecorderState.RecordingPreserveRedoStack,
	ignore: HistoryRecorderState.Paused,
} as const
```

### PendingDiff class

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:329-352`

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

	isEmpty() {
		return this.isEmptyAtom.get()
	}

	apply(diff: RecordsDiff<R>) {
		squashRecordDiffsMutable(this.diff, [diff])
		this.isEmptyAtom.set(isRecordsDiffEmpty(this.diff))
	}
}
```

**Key properties:**

- Maintains a single `RecordsDiff<R>` that accumulates all changes
- Uses reactive atom to track empty state efficiently
- `clear()` returns the accumulated diff and resets to empty
- `apply()` uses `squashRecordDiffsMutable` to merge incoming changes

### TLHistoryEntry types

Located in `packages/editor/src/lib/editor/types/history-types.ts:4-16`

```typescript
interface TLHistoryMark {
	type: 'stop'
	id: string
}

interface TLHistoryDiff<R extends UnknownRecord> {
	type: 'diff'
	diff: RecordsDiff<R>
}

type TLHistoryEntry<R extends UnknownRecord> = TLHistoryMark | TLHistoryDiff<R>
```

The undo/redo stacks contain these two types:

- **'stop'**: A mark (boundary) with a unique ID
- **'diff'**: Actual record changes

### RecordsDiff structure

Located in `packages/store/src/lib/RecordsDiff.ts:29-36`

```typescript
interface RecordsDiff<R extends UnknownRecord> {
	/** Records that were created, keyed by their ID */
	added: Record<IdOf<R>, R>
	/** Records that were modified, keyed by their ID. Each entry contains [from, to] tuple */
	updated: Record<IdOf<R>, [from: R, to: R]>
	/** Records that were deleted, keyed by their ID */
	removed: Record<IdOf<R>, R>
}
```

Three categories of changes:

- **added**: Records created (maps ID -> new record)
- **updated**: Records modified (maps ID -> [old record, new record])
- **removed**: Records deleted (maps ID -> deleted record)

## Stack implementation

### Immutable linked list structure

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:356-424`

```typescript
type Stack<T> = StackItem<T> | EmptyStackItem<T>

class EmptyStackItem<T> implements Iterable<T> {
	readonly length = 0
	readonly head = null
	readonly tail: Stack<T> = this

	push(head: T): Stack<T> {
		return new StackItem<T>(head, this)
	}
}

const EMPTY_STACK_ITEM = new EmptyStackItem()

class StackItem<T> implements Iterable<T> {
	length: number
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

**Why immutable:**

- Not for safety or correctness
- For efficiency: sharing structure between states
- Pushing creates new stack that shares tail with old stack
- Both old and new references remain valid
- Cheap to maintain multiple references (useful during undo/redo)

**Stack operations:**

- `push(item)`: Returns new stack with item on top (O(1))
- `head`: Get top item without removing (O(1))
- `tail`: Get rest of stack without top item (O(1))
- `length`: Cached, calculated on construction (O(1))

### HistoryManager state

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:21-37`

```typescript
export class HistoryManager<R extends UnknownRecord> {
	private readonly store: Store<R>
	readonly dispose: () => void

	private state: HistoryRecorderState = HistoryRecorderState.Recording
	private readonly pendingDiff = new PendingDiff<R>()
	private stacks = atom(
		'HistoryManager.stacks',
		{
			undos: stack<TLHistoryEntry<R>>(),
			redos: stack<TLHistoryEntry<R>>(),
		},
		{
			isEqual: (a, b) => a.undos === b.undos && a.redos === b.redos,
		}
	)

	private readonly annotateError: (error: unknown) => void
}
```

**Key state:**

- `state`: Current recording mode
- `pendingDiff`: Accumulates changes since last mark
- `stacks`: Reactive atom holding undo/redo stacks
- Custom equality check for stacks (reference equality sufficient due to immutability)

## History interceptor

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:44-60`

```typescript
this.dispose = this.store.addHistoryInterceptor((entry, source) => {
	if (source !== 'user') return

	switch (this.state) {
		case HistoryRecorderState.Recording:
			this.pendingDiff.apply(entry.changes)
			this.stacks.update(({ undos }) => ({ undos, redos: stack() }))
			break
		case HistoryRecorderState.RecordingPreserveRedoStack:
			this.pendingDiff.apply(entry.changes)
			break
		case HistoryRecorderState.Paused:
			break
		default:
			exhaustiveSwitchError(this.state)
	}
})
```

**Behavior by state:**

- **Recording**: Apply to pending diff, clear redo stack
- **RecordingPreserveRedoStack**: Apply to pending diff, keep redo stack
- **Paused**: Ignore the change entirely

Only processes changes with `source === 'user'` (not internal or remote changes).

## Mark creation and flushing

### \_mark() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:287-292`

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

**Process:**

1. Flush pending diff to undo stack (if any changes)
2. Push mark onto undo stack
3. Wrapped in `transact()` for atomicity

### flushPendingDiff() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:63-71`

```typescript
private flushPendingDiff() {
    if (this.pendingDiff.isEmpty()) return

    const diff = this.pendingDiff.clear()
    this.stacks.update(({ undos, redos }) => ({
        undos: undos.push({ type: 'diff', diff }),
        redos,
    }))
}
```

**Behavior:**

- Only flushes if pending diff is non-empty
- Clears pending diff and pushes accumulated changes to undo stack
- Preserves redo stack during flush

### Editor wrapper

Located in `packages/editor/src/lib/editor/Editor.ts:1161-1164`

```typescript
markHistoryStoppingPoint(name?: string): string {
    const id = `[${name ?? 'stop'}]_${uniqueId()}`
    this.history._mark(id)
    return id
}
```

**Mark ID format:** `[name]_uniqueId`

- Examples: `[translating]_abc123`, `[stop]_xyz789`
- Name helps with debugging
- Unique ID ensures no collisions

## Diff squashing algorithm

### squashRecordDiffsMutable function

Located in `packages/store/src/lib/RecordsDiff.ts:202-248`

```typescript
export function squashRecordDiffsMutable<T extends UnknownRecord>(
	target: RecordsDiff<T>,
	diffs: RecordsDiff<T>[]
): void {
	for (const diff of diffs) {
		// Process added records
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

		// Process updated records
		for (const [id, [_from, to]] of objectMapEntries(diff.updated)) {
			if (target.added[id]) {
				// Was just added, keep it as added with new value
				target.added[id] = to
				delete target.updated[id]
				delete target.removed[id]
				continue
			}
			if (target.updated[id]) {
				// Chain updates: keep original 'from', use new 'to'
				target.updated[id] = [target.updated[id][0], to]
				delete target.removed[id]
				continue
			}

			target.updated[id] = diff.updated[id]
			delete target.removed[id]
		}

		// Process removed records
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

**Squashing rules:**

1. **Added → Updated → Updated** = Added (final state)
   - Line 220-224
   - Example: Create shape at (0,0), move to (10,10), move to (20,20) = Create at (20,20)

2. **Updated → Updated → Updated** = Updated (original → final)
   - Line 226-230
   - Example: Move from (0,0) to (10,10) to (20,20) = Move from (0,0) to (20,20)

3. **Added → Removed** = Nothing
   - Line 238-239
   - Example: Create shape then delete it = No record in diff

4. **Removed → Added** = Updated (if values differ)
   - Line 208-213
   - Example: Delete shape, recreate with different props = Update

5. **Updated → Removed** = Removed (from original state)
   - Line 240-242
   - Example: Move shape then delete it = Delete from original position

**Mutation vs copying:**

- Mutates `target` in place for efficiency
- Avoids allocating intermediate diff objects
- Safe because diffs are flushed atomically

## Undo operation

### \_undo() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:115-187`

```typescript
_undo({ pushToRedoStack, toMark = undefined }: { pushToRedoStack: boolean; toMark?: string }) {
    const previousState = this.state
    this.state = HistoryRecorderState.Paused
    try {
        let { undos, redos } = this.stacks.get()

        // Start by collecting the pending diff (everything since the last mark)
        const pendingDiff = this.pendingDiff.clear()
        const isPendingDiffEmpty = isRecordsDiffEmpty(pendingDiff)
        const diffToUndo = reverseRecordsDiff(pendingDiff)

        if (pushToRedoStack && !isPendingDiffEmpty) {
            redos = redos.push({ type: 'diff', diff: pendingDiff })
        }

        let didFindMark = false
        if (isPendingDiffEmpty) {
            // If nothing has happened since the last mark, pop any intermediate marks
            while (undos.head?.type === 'stop') {
                const mark = undos.head
                undos = undos.tail
                if (pushToRedoStack) {
                    redos = redos.push(mark)
                }
                if (mark.id === toMark) {
                    didFindMark = true
                    break
                }
            }
        }

        if (!didFindMark) {
            loop: while (undos.head) {
                const undo = undos.head
                undos = undos.tail

                if (pushToRedoStack) {
                    redos = redos.push(undo)
                }

                switch (undo.type) {
                    case 'diff':
                        squashRecordDiffsMutable(diffToUndo, [reverseRecordsDiff(undo.diff)])
                        break
                    case 'stop':
                        if (!toMark) break loop
                        if (undo.id === toMark) {
                            didFindMark = true
                            break loop
                        }
                        break
                }
            }
        }

        if (!didFindMark && toMark) {
            // whoops, we didn't find the mark we were looking for
            return this
        }

        this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
        this.store.ensureStoreIsUsable()
        this.stacks.set({ undos, redos })
    } finally {
        this.state = previousState
    }

    return this
}
```

**Process:**

1. Pause recording (prevent undo from creating history entries)
2. Clear and reverse pending diff (changes since last mark)
3. Optionally push pending diff to redo stack
4. Skip any marks at top of stack (if pending diff was empty)
5. Collect all diffs back to next mark (or specified mark)
6. Squash all collected diffs together (reversed)
7. Apply squashed diff atomically
8. Update stacks
9. Restore recording state

**Key optimizations:**

- Squashes all changes between marks into single atomic operation
- Avoids intermediate states during undo
- Uses immutable stack operations (old references still valid)

### undo() vs bail() vs bailToMark()

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:189-249`

```typescript
undo() {
    this._undo({ pushToRedoStack: true })
    return this
}

bail() {
    this._undo({ pushToRedoStack: false })
    return this
}

bailToMark(id: string) {
    if (id) {
        this._undo({ pushToRedoStack: false, toMark: id })
    }
    return this
}
```

**Differences:**

- **undo()**: Normal undo, pushes to redo stack
- **bail()**: Undo without redo, as if changes never happened (used for canceling)
- **bailToMark(id)**: Undo to specific mark without redo (used for canceling to specific point)

### Editor wrappers

Located in `packages/editor/src/lib/editor/Editor.ts:1220-1223`

```typescript
bailToMark(id: string): this {
    this.history.bailToMark(id)
    return this
}
```

Example in Translating tool (line 183):

```typescript
reset() {
    this.editor.bailToMark(this.markId)
}
```

## Redo operation

### redo() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:195-235`

```typescript
redo() {
    const previousState = this.state
    this.state = HistoryRecorderState.Paused
    try {
        this.flushPendingDiff()

        let { undos, redos } = this.stacks.get()
        if (redos.length === 0) {
            return this
        }

        // Ignore any intermediate marks
        while (redos.head?.type === 'stop') {
            undos = undos.push(redos.head)
            redos = redos.tail
        }

        // Accumulate diffs to be redone so they can be applied atomically
        const diffToRedo = createEmptyRecordsDiff<R>()

        while (redos.head) {
            const redo = redos.head
            undos = undos.push(redo)
            redos = redos.tail

            if (redo.type === 'diff') {
                squashRecordDiffsMutable(diffToRedo, [redo.diff])
            } else {
                break
            }
        }

        this.store.applyDiff(diffToRedo, { ignoreEphemeralKeys: true })
        this.store.ensureStoreIsUsable()
        this.stacks.set({ undos, redos })
    } finally {
        this.state = previousState
    }

    return this
}
```

**Process:**

1. Pause recording
2. Flush pending diff (ensure clean state)
3. Skip marks at top of redo stack
4. Collect all diffs until next mark
5. Squash collected diffs together
6. Apply squashed diff atomically
7. Move entries from redo to undo stack
8. Restore recording state

**Symmetry with undo:**

- Same squashing behavior
- Same atomic application
- Moves entries between stacks

## squashToMark operation

### squashToMark() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:251-284`

```typescript
squashToMark(id: string) {
    // Remove marks between head and the target mark

    let top = this.stacks.get().undos
    const popped: Array<RecordsDiff<R>> = []

    // Pop entries until we find the target mark
    while (top.head && !(top.head.type === 'stop' && top.head.id === id)) {
        if (top.head.type === 'diff') {
            popped.push(top.head.diff)
        }
        top = top.tail
    }

    if (!top.head || top.head?.id !== id) {
        console.error('Could not find mark to squash to: ', id)
        return this
    }
    if (popped.length === 0) {
        return this
    }

    // Squash all diffs into one
    const diff = createEmptyRecordsDiff<R>()
    squashRecordDiffsMutable(diff, popped.reverse())

    this.stacks.update(({ redos }) => ({
        undos: top.push({
            type: 'diff',
            diff,
        }),
        redos,
    }))

    return this
}
```

**Purpose:**

- Collapses everything since a mark into single undo entry
- Removes intermediate marks
- Useful for complex operations that create multiple marks internally

**Example usage:**
From test file (line 435-473):

```typescript
manager._mark('a')
setA(1)
manager._mark('b')
setB(1)
setB(2)
setB(3)
manager._mark('')
setA(2)
setB(4)
manager._mark('')
setB(5)
setB(6)

// State: { a: 2, b: 6 }

manager.squashToMark('b')

// Now undoing should take us back to mark 'a'
manager.undo()
// State: { a: 1, b: 0 }
```

## Batch operations

### batch() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:84-112`

```typescript
batch(fn: () => void, opts?: TLHistoryBatchOptions) {
    const previousState = this.state

    // Move to new state only if we haven't explicitly paused
    if (previousState !== HistoryRecorderState.Paused && opts?.history) {
        this.state = modeToState[opts.history]
    }

    try {
        if (this._isInBatch) {
            transact(fn)
            return this
        }

        this._isInBatch = true
        try {
            transact(fn)
        } catch (error) {
            this.annotateError(error)
            throw error
        } finally {
            this._isInBatch = false
        }

        return this
    } finally {
        this.state = previousState
    }
}
```

**Behavior:**

- Temporarily changes recording state
- Wraps function in `transact()` for reactivity batching
- Handles nested batches (paused state takes precedence)
- Restores previous state even on error
- Annotates errors for debugging

**Batch options:**
From `packages/editor/src/lib/editor/types/history-types.ts:19-27`:

```typescript
interface TLHistoryBatchOptions {
	/**
	 * How should this change interact with the history stack?
	 * - record: Add to the undo stack and clear the redo stack
	 * - record-preserveRedoStack: Add to the undo stack but do not clear the redo stack
	 * - ignore: Do not add to the undo stack or the redo stack
	 */
	history?: 'record' | 'record-preserveRedoStack' | 'ignore'
}
```

## Ephemeral keys handling

### ignoreEphemeralKeys flag

Used in `applyDiff()` calls during undo/redo (line 179, 227):

```typescript
this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
```

### Store implementation

Located in `packages/store/src/lib/Store.ts:1078-1103`

```typescript
applyDiff(
    diff: RecordsDiff<R>,
    {
        runCallbacks = true,
        ignoreEphemeralKeys = false,
    }: { runCallbacks?: boolean; ignoreEphemeralKeys?: boolean } = {}
) {
    this.atomic(() => {
        // ... handle added records ...

        for (const [_from, to] of objectMapValues(diff.updated)) {
            const type = this.schema.getType(to.typeName)
            if (ignoreEphemeralKeys && type.ephemeralKeySet.size) {
                const existing = this.get(to.id)
                if (!existing) {
                    toPut.push(to)
                    continue
                }
                let changed: R | null = null
                for (const [key, value] of Object.entries(to)) {
                    if (type.ephemeralKeySet.has(key) || Object.is(value, getOwnProperty(existing, key))) {
                        continue
                    }
                    // ... apply non-ephemeral changes ...
                }
            } else {
                toPut.push(to)
            }
        }

        // ... handle removed records ...
    })
}
```

**Ephemeral keys:**
From `packages/store/src/lib/RecordType.ts:53-62`:

```typescript
/**
 * Ephemeral properties are not included in snapshots or synchronization.
 * @public
 */
readonly ephemeralKeys?: { readonly [K in Exclude<keyof R, 'id' | 'typeName'>]: boolean }

/**
 * Set of property names that are marked as ephemeral for efficient lookup.
 * @public
 */
readonly ephemeralKeySet: ReadonlySet<string>
```

**Purpose:**

- Some record properties are transient (e.g., hover states, temporary flags)
- These shouldn't be restored during undo/redo
- `ignoreEphemeralKeys: true` skips these properties when applying diffs
- Prevents undoing visual states that shouldn't be part of document history

## Mark usage patterns in tools

### Translating state (drag operation)

Located in `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts:53-83`

```typescript
override onEnter(info: TranslatingInfo) {
    const { isCreating = false, creatingMarkId, onCreate = () => void null } = info

    if (!this.editor.getSelectedShapeIds()?.length) {
        this.parent.transition('idle')
        return
    }

    this.info = info
    if (typeof info.onInteractionEnd === 'string') {
        this.parent.setCurrentToolIdMask(info.onInteractionEnd)
    }
    this.isCreating = isCreating

    this.markId = ''

    if (isCreating) {
        if (creatingMarkId) {
            this.markId = creatingMarkId
        } else {
            // Handle legacy implicit marks
            const markId = this.editor.getMarkIdMatching(
                `creating:${this.editor.getOnlySelectedShapeId()}`
            )
            if (markId) {
                this.markId = markId
            }
        }
    } else {
        this.markId = this.editor.markHistoryStoppingPoint('translating')
    }

    this.onCreate = onCreate
    // ... rest of setup ...
}
```

**Pattern:**

- Create mark when entering drag state
- Store mark ID in state
- All position updates accumulate in pending diff
- Mark stays on stack until next mark or completion

**Cancel handling** (line 215-238):

```typescript
private cancel() {
    // Call onTranslateCancel callback before resetting
    const { movingShapes } = this.snapshot

    movingShapes.forEach((shape) => {
        const current = this.editor.getShape(shape.id)
        if (current) {
            const util = this.editor.getShapeUtil(shape)
            util.onTranslateCancel?.(shape, current)
        }
    })

    this.reset()
    // ... transition handling ...
}
```

**Reset method** (line 182-184):

```typescript
reset() {
    this.editor.bailToMark(this.markId)
}
```

Uses `bailToMark` to undo all changes since drag started without adding to redo stack.

### Rotating state

Located in `packages/tldraw/src/lib/tools/SelectTool/childStates/Rotating.ts:27-62`

```typescript
override onEnter(
    info: TLPointerEventInfo & { target: 'selection'; onInteractionEnd?: string | (() => void) }
) {
    this.info = info
    if (typeof info.onInteractionEnd === 'string') {
        this.parent.setCurrentToolIdMask(info.onInteractionEnd)
    }

    this.markId = this.editor.markHistoryStoppingPoint('rotate start')

    const snapshot = getRotationSnapshot({
        editor: this.editor,
        ids: this.editor.getSelectedShapeIds(),
    })
    if (!snapshot) return this.parent.transition('idle', this.info)
    this.snapshot = snapshot

    // ... apply initial rotation ...
}
```

**Pattern identical to Translating:**

- Create mark on enter
- Store mark ID
- All rotation updates accumulate
- Can cancel back to mark if needed

### Drawing state (for draw/highlight tools)

Located in `packages/tldraw/src/lib/shapes/draw/toolStates/Drawing.ts:161-217`

```typescript
private startShape() {
    const inputs = this.editor.inputs
    const originPagePoint = inputs.getOriginPagePoint()
    const isPen = inputs.getIsPen()

    this.markId = this.editor.markHistoryStoppingPoint('draw start')

    // Detect pen vs stylus by pressure
    const pressure = inputs.currentPagePoint.z
    if (isPen) {
        this.isPen = true
        this.isPenOrStylus = true
    } else if (pressure > 0 && pressure < 0.5) {
        this.isPen = false
        this.isPenOrStylus = true
    } else {
        this.isPen = false
        this.isPenOrStylus = false
    }

    // ... create shape ...
}
```

**Special case: palm rejection** (line 64-77):

```typescript
override onPointerMove() {
    const { inputs } = this.editor
    const isPen = inputs.getIsPen()

    if (this.isPen && !isPen) {
        // User made palm gesture before pen gesture
        // Bail to mark and restart
        if (this.markId) {
            this.editor.bailToMark(this.markId)
            this.startShape()
            return
        }
    }

    // ... continue drawing ...
}
```

Uses `bailToMark` to restart drawing if pen input detection changes.

## Cloning during translation

Located in `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts:156-180`

```typescript
protected startCloning() {
    if (this.isCreating) return
    const shapeIds = Array.from(this.editor.getSelectedShapeIds())

    // If we can't create the shapes, don't even start cloning
    if (!this.editor.canCreateShapes(shapeIds)) return

    this.isCloning = true
    this.reset()  // Bail to original mark
    this.markId = this.editor.markHistoryStoppingPoint('translate cloning')

    this.editor.duplicateShapes(Array.from(this.editor.getSelectedShapeIds()))

    this.snapshot = getTranslatingSnapshot(this.editor)
    this.handleStart()
    this.updateShapes()
}

protected stopCloning() {
    this.isCloning = false
    this.snapshot = this.selectionSnapshot
    this.reset()  // Bail to cloning mark
    this.markId = this.editor.markHistoryStoppingPoint('translate')
    this.updateShapes()
}
```

**Pattern:**

1. User starts dragging (creates 'translating' mark)
2. User presses Alt (wants to clone)
3. Bail back to 'translating' mark (undo the drag)
4. Create new mark 'translate cloning'
5. Duplicate shapes
6. Continue dragging from same starting point

**Result:** Seamless transition from move to clone without visible undo/redo.

## Number of undos calculation

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:73-79`

```typescript
getNumUndos() {
    return this.stacks.get().undos.length + (this.pendingDiff.isEmpty() ? 0 : 1)
}

getNumRedos() {
    return this.stacks.get().redos.length
}
```

**Pending diff counts as one undo:**

- Stack length gives number of flushed entries
- If pending diff non-empty, add 1 (will be flushed on next mark/undo)
- Accurate count for UI display

## Test examples

### Basic squashing

From `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.test.ts:180-194`

```typescript
it('allows squashing of commands', () => {
	editor.increment()

	editor.history._mark('stop at 1')
	expect(editor.getCount()).toBe(1)

	editor.increment(1)
	editor.increment(1)
	editor.increment(1)
	editor.increment(1)

	expect(editor.getCount()).toBe(5)

	expect(editor.history.getNumUndos()).toBe(3)
})
```

**Breakdown:**

- First increment creates pending diff
- Mark flushes it (1 diff + 1 mark = 2 entries)
- Four more increments accumulate in pending diff (1 entry)
- Total: 3 undo entries (first diff, mark, pending diff)

### Ignore mode

From test file (line 195-206):

```typescript
it('allows ignore commands that do not affect the stack', () => {
	editor.increment()
	editor.history._mark('stop at 1')
	editor.increment()
	editor.setName('wilbur') // Uses history: 'ignore'
	editor.increment()
	expect(editor.getCount()).toBe(3)
	expect(editor.getName()).toBe('wilbur')
	editor.history.undo()
	expect(editor.getCount()).toBe(1)
	expect(editor.getName()).toBe('wilbur') // Name unchanged!
})
```

### Record-preserveRedoStack mode

From test file (line 208-231):

```typescript
it('allows inconsequential commands that do not clear the redo stack', () => {
	editor.increment()
	editor.history._mark('stop at 1')
	editor.increment()
	expect(editor.getCount()).toBe(2)
	editor.history.undo()
	expect(editor.getCount()).toBe(1)
	editor.history._mark('stop at age 35')
	editor.setAge(23) // Uses history: 'record-preserveRedoStack'
	editor.history._mark('stop at age 23')
	expect(editor.getCount()).toBe(1)
	editor.history.redo()
	expect(editor.getCount()).toBe(2) // Redo still works!
	expect(editor.getAge()).toBe(23)
	editor.history.undo()
	expect(editor.getCount()).toBe(1)
	expect(editor.getAge()).toBe(23)
	editor.history.undo()
	expect(editor.getCount()).toBe(1)
	expect(editor.getAge()).toBe(35) // Can undo age change
})
```

**Use case:** Selection changes shouldn't clear redo stack.

### Nested batches

From test file (line 399-433):

```typescript
it('nested ignore', () => {
	manager._mark('')
	manager.batch(
		() => {
			setA(1)
			// Even though we set this to record, it will still be ignored
			manager.batch(() => setB(1), { history: 'record' })
			setA(2)
		},
		{ history: 'ignore' }
	)
	expect(getState()).toMatchObject({ a: 2, b: 1 })

	// Changes were ignored:
	manager.undo()
	expect(getState()).toMatchObject({ a: 2, b: 1 })

	manager._mark('')
	manager.batch(
		() => {
			setA(3)
			manager.batch(() => setB(2), { history: 'ignore' })
		},
		{ history: 'record-preserveRedoStack' }
	)
	expect(getState()).toMatchObject({ a: 3, b: 2 })

	// Changes to A were recorded, but changes to B were ignore:
	manager.undo()
	expect(getState()).toMatchObject({ a: 2, b: 2 })

	// We can still redo because we preserved the redo stack:
	manager.redo()
	expect(getState()).toMatchObject({ a: 3, b: 2 })
})
```

**Rule:** Paused state takes precedence in nested batches.

## Performance considerations

### Why immutable stacks

**Memory sharing:**

- Multiple undo/redo operations don't copy entire stack
- Each state shares structure with previous state
- Only new top item is allocated

**Example:**

```
Stack A: [1, 2, 3, 4]
Stack B = A.push(5): [5, 1, 2, 3, 4]

Stack B's tail is Stack A (pointer, not copy)
Both stacks can exist simultaneously without duplication
```

### Atomic diff application

**All changes applied together:**

- Squash multiple diffs before applying
- Single `store.applyDiff()` call
- Avoids intermediate states
- Triggers reactions once instead of multiple times

**Code location:** Line 179 and 227 in HistoryManager.ts

```typescript
this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
```

### Reactive state management

**PendingDiff uses atom:**

```typescript
private isEmptyAtom = atom('PendingDiff.isEmpty', true)
```

**Benefits:**

- Reactive components can track pending diff state
- Automatic updates when changes occur
- Efficient equality checks (boolean)

**HistoryManager stacks use atom:**

```typescript
private stacks = atom('HistoryManager.stacks', { undos, redos }, {
    isEqual: (a, b) => a.undos === b.undos && a.redos === b.redos
})
```

**Custom equality:**

- Reference equality sufficient for immutable stacks
- Avoids deep equality checks
- Fast updates when stacks change

## Constants and thresholds

No specific constants for history system itself, but related:

**From Editor.ts:**

- Mark ID format: `[${name ?? 'stop'}]_${uniqueId()}`
- Name defaults to "stop" if not provided

**From tests:**

- No minimum time between marks
- No maximum stack depth enforced (limited by memory)
- No automatic mark creation on timeout

## Debugging utilities

### getMarkIdMatching() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:300-309`

```typescript
getMarkIdMatching(idSubstring: string) {
    let top = this.stacks.get().undos
    while (top.head) {
        if (top.head.type === 'stop' && top.head.id.includes(idSubstring)) {
            return top.head.id
        }
        top = top.tail
    }
    return null
}
```

**Purpose:**

- Find mark by substring match
- Used for legacy "creating:{shapeId}" marks
- Returns most recent matching mark (searches from top)

### debug() method

Located in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts:312-320`

```typescript
debug() {
    const { undos, redos } = this.stacks.get()
    return {
        undos: undos.toArray(),
        redos: redos.toArray(),
        pendingDiff: this.pendingDiff.debug(),
        state: this.state as string,
    }
}
```

**Returns:**

- Arrays of undo/redo entries (converted from linked lists)
- Pending diff state
- Current recording state
- Useful for debugging undo stack issues

## Edge cases and error handling

### Empty mark ID

From bailToMark (line 243-249):

```typescript
bailToMark(id: string) {
    if (id) {
        this._undo({ pushToRedoStack: false, toMark: id })
    }
    return this
}
```

Early return if mark ID is empty/falsy.

### Mark not found

From squashToMark (line 264-267):

```typescript
if (!top.head || top.head?.id !== id) {
	console.error('Could not find mark to squash to: ', id)
	return this
}
```

Logs error but doesn't throw - graceful degradation.

From \_undo (line 173-177):

```typescript
if (!didFindMark && toMark) {
	// whoops, we didn't find the mark we were looking for
	// don't do anything
	return this
}
```

No-op if specified mark not found in bailToMark.

### Empty redo stack

From redo (line 202-204):

```typescript
if (redos.length === 0) {
	return this
}
```

Early return if nothing to redo.

### Batch error handling

From batch (line 100-104):

```typescript
try {
	transact(fn)
} catch (error) {
	this.annotateError(error)
	throw error
} finally {
	this._isInBatch = false
}
```

**Behavior:**

- Annotates error for debugging
- Re-throws error (doesn't swallow)
- Ensures `_isInBatch` flag reset
- State restored in outer finally block (line 109-111)

### Store validation

After undo/redo (line 180, 228):

```typescript
this.store.ensureStoreIsUsable()
```

Validates store integrity after applying diffs.

## Key source files

- `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts` - Main history manager (425 lines)
- `packages/store/src/lib/RecordsDiff.ts` - Diff types and squashing algorithm (249 lines)
- `packages/editor/src/lib/editor/types/history-types.ts` - Type definitions (28 lines)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts` - Example: dragging (570 lines)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Rotating.ts` - Example: rotating
- `packages/tldraw/src/lib/shapes/draw/toolStates/Drawing.ts` - Example: drawing with palm rejection
- `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.test.ts` - Comprehensive tests (863 lines)
- `packages/store/src/lib/Store.ts` - Store implementation with applyDiff and ephemeral keys
- `packages/editor/src/lib/editor/Editor.ts` - Public API wrappers (markHistoryStoppingPoint, bailToMark, squashToMark)

## Related concepts

- **Reactive signals** (@tldraw/state): History manager uses atoms for reactive state
- **Store system**: History intercepts store changes via addHistoryInterceptor
- **Transact**: Batches reactive updates, used in mark creation and undo/redo
- **Ephemeral keys**: Record properties excluded from history (hover states, etc)
- **Source tracking**: Only 'user' source changes are recorded (not 'remote' or 'internal')
