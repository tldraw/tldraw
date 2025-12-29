---
title: Immutable stack structure
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - undo
  - redo
  - immutable
  - linked list
  - structural sharing
edited_by: steve
status: published
date: 12/21/2025
order: 2
---

History was among the first systems we designed for tldraw. A good undo / redo system is fast, efficient, and resiliant to cases where operations fail, such as when you try to redo a change on a shape that another user has deleted.

The current design of our history system reflects a host of requirements that we slowly encountered while implementing the canvas. In this article, we'll look at the data structure we use for our history and unpack our design decisions.

## The stack implementation

The editor's history manager uses **immutable linked lists**, called "stacks", for its undos and redos.

We define stacks as linked lists with two node types:

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

Every operation returns a new stack. The `push` method doesn't modify the existing stack—it allocates a new `StackItem` whose tail points to the old stack. Importantly, both references remain valid. This structural sharing means multiple undo/redo operations can coexist without copying the entire stack.

## Why this matters

Consider what happens during an undo operation. We need to:

1. Move entries from the undo stack to the redo stack
2. Keep both old and new stack references valid
3. Avoid copying the entire stack contents

With an immutable linked list, this is simple:

```typescript
let { undos, redos } = this.stacks.get()

// Pop from undos, push to redos
const entry = undos.head
undos = undos.tail
redos = redos.push(entry)
```

The old `undos` and `redos` references still work. The new references share structure with them. No copying happens—we just allocate new head nodes.

This structural sharing becomes critical during complex operations. When cloning shapes mid-drag, we bail back to a mark, create a new mark, and continue. The old stack reference remains valid throughout. When squashing history entries, we can hold references to multiple points in the stack simultaneously without worrying about mutation.

## Memory characteristics

With a mutable array, each modification either mutates in place (breaking old references) or copies the entire array (expensive). With structural sharing:

- Pushing is O(1) time, O(1) space (one new node)
- Both old and new stacks remain usable
- Shared portions consume no additional memory
- Length is cached at construction, so checking stack size is O(1)

The tradeoff is that you can't efficiently access the middle of the stack. But for undo/redo, we only care about the top—we pop entries one at a time until we hit a mark. Random access would never happen.

## Example: stack evolution

Start with an empty undo stack:

```
undos = []
```

After three operations, with marks between them:

```
undos = [diff_1, mark_a, diff_2, mark_b, diff_3]
```

Now undo once. We pop everything back to `mark_b`:

```typescript
let redos = stack()

// Pop diff_3
redos = redos.push(undos.head) // redos = [diff_3]
undos = undos.tail // undos = [diff_2, mark_b, diff_1, mark_a]

// Pop mark_b
redos = redos.push(undos.head) // redos = [mark_b, diff_3]
undos = undos.tail // undos = [diff_2, diff_1, mark_a]
```

The key observation: at every step, both the old and new stack references work. If we needed to bail out mid-operation, we could. The original `undos` reference still points to `[diff_1, mark_a, diff_2, mark_b, diff_3]`, unchanged.

## Integration with reactive atoms

The history manager stores stacks in a reactive atom:

```typescript
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
```

Note the `isEqual` method there. That's a custom equality check. By default, atoms identify whether two versions of an atom are equal using a reference equality check. In our case, however, we're mutating the same `stacks` object, so the default check would always return `true`.

To accurately capture change, we perform our reference equality checks on the undo and redo stacks instead. Since stacks are immutable, if the references are the same, the contents must be the same. This makes change detection trivial—no deep equality checks needed.

When we update the stacks:

```typescript
this.stacks.update(({ undos, redos }) => ({
	undos: undos.push({ type: 'diff', diff }),
	redos,
}))
```

The update function receives the current stacks and returns new ones. If we only modify `undos`, we return the same `redos` reference. The atom's equality check sees that `redos` hasn't changed and avoids triggering unnecessary reactions.

## Iteration support

Although we rarely need it, the stack implements the iterable protocol:

```typescript
class StackItem<T> implements Iterable<T> {
	*[Symbol.iterator]() {
		let stack: Stack<T> = this
		while (stack.head !== null) {
			yield stack.head
			stack = stack.tail
		}
	}
}
```

This allows converting a stack to an array for debugging:

```typescript
debug() {
    const { undos, redos } = this.stacks.get()
    return {
        undos: undos.toArray(),
        redos: redos.toArray(),
        pendingDiff: this.pendingDiff.debug(),
        state: this.state,
    }
}
```

But in production code, we never iterate. We only access `head` and `tail`, popping entries until we hit what we're looking for.

## Where this lives

The stack implementation is in `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts` (lines 356-424). It's a private detail of the history system—no other code uses these types directly. The history manager exposes only high-level operations like `undo()`, `redo()`, and `mark()`.

The pattern appears occasionally elsewhere in tldraw when we need efficient snapshotting of sequential data. But arrays work fine for most cases. Immutable stacks matter here because history operations are frequent, stack references need to remain valid across complex operations, and we never need random access.
