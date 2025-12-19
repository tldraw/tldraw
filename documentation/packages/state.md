---
title: '@tldraw/state'
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - state
  - reactive
  - signals
  - atom
  - computed
  - performance
---

The `@tldraw/state` package is a fine-grained reactive state management library built on signals. It provides automatic dependency tracking, lazy evaluation, and efficient updates with minimal overhead—designed specifically for tldraw's performance requirements.

## Overview

This package implements a signals-based reactivity system similar to MobX or SolidJS, but optimized for tldraw's specific needs. The core philosophy: only recompute what actually needs to change, when it needs to change.

Key features:

- Automatic dependency tracking with zero configuration
- Lazy evaluation for computed values
- Efficient epoch-based change detection
- Transaction support for batched updates
- Optional change history and diff tracking
- No external runtime dependencies

The package powers all reactive state management in tldraw, from the store's record system to the editor's selection and viewport state.

## Core concepts

### Signals

A signal is a reactive value container that automatically manages dependencies and triggers updates when its value changes. There are two types:

**Atom** - Mutable state that can be directly updated:

```typescript
import { atom } from '@tldraw/state'

const count = atom('count', 0)

console.log(count.get()) // 0
count.set(5)
console.log(count.get()) // 5
```

**Computed** - Derived state that automatically recomputes when dependencies change:

```typescript
import { computed } from '@tldraw/state'

const doubled = computed('doubled', () => count.get() * 2)

console.log(doubled.get()) // 10
count.set(3)
console.log(doubled.get()) // 6
```

All signals share a common interface with these key methods:

| Method                          | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `get()`                         | Read the current value and establish dependency |
| `__unsafe__getWithoutCapture()` | Read without creating dependency                |
| `getDiffSince(epoch)`           | Get incremental changes since a point in time   |

### Atoms

Atoms are the foundation of mutable state. Create them with an initial value:

```typescript
const name = atom('name', 'Alice')
const age = atom('age', 30)
const isActive = atom('isActive', true)
```

Update atoms directly:

```typescript
// Direct assignment
name.set('Bob')

// Functional update
age.update((current) => current + 1)
```

#### Custom equality

By default, atoms use strict equality (`===`) and `Object.is` to detect changes. For complex objects, provide custom comparison:

```typescript
const user = atom(
	'user',
	{ id: 1, name: 'Alice' },
	{
		isEqual: (a, b) => a.id === b.id && a.name === b.name,
	}
)

// These two sets are treated as equal - no update propagated
user.set({ id: 1, name: 'Alice' })
user.set({ id: 1, name: 'Alice' })
```

#### History tracking

Atoms can track their change history for features like undo/redo or synchronization:

```typescript
const shapes = atom('shapes', [], {
	historyLength: 100, // Keep last 100 changes
	computeDiff: (prev, next) => {
		return {
			added: next.filter((s) => !prev.includes(s)),
			removed: prev.filter((s) => !next.includes(s)),
		}
	},
})

const oldEpoch = getGlobalEpoch()
shapes.set([{ id: 'a' }])
shapes.set([{ id: 'a' }, { id: 'b' }])

const diffs = shapes.getDiffSince(oldEpoch)
// diffs = [{ added: [{ id: 'a' }], removed: [] }, { added: [{ id: 'b' }], removed: [] }]
```

### Computed signals

Computed signals derive their values from other signals. They automatically track dependencies and only recalculate when dependencies change:

```typescript
const firstName = atom('firstName', 'Alice')
const lastName = atom('lastName', 'Smith')

const fullName = computed('fullName', () => {
	return `${firstName.get()} ${lastName.get()}`
})

console.log(fullName.get()) // 'Alice Smith'
firstName.set('Bob')
console.log(fullName.get()) // 'Bob Smith'
```

#### Lazy evaluation

Computed values are evaluated lazily—they only run when accessed:

```typescript
const expensive = computed('expensive', () => {
	console.log('Computing...')
	return performExpensiveCalculation()
})

// Nothing logged yet - not computed until accessed
const result = expensive.get() // Now logs 'Computing...'
```

#### Incremental computation

For expensive computations, use the previous value to perform incremental updates:

```typescript
const items = atom('items', [])

const processed = computed('processed', (prevValue) => {
	if (isUninitialized(prevValue)) {
		// First run - do full computation
		return expensiveProcess(items.get())
	}

	// Subsequent runs - incremental update
	return incrementalUpdate(prevValue, items.get())
})
```

The `UNINITIALIZED` symbol indicates the first computation. Use `isUninitialized()` to check for it.

#### Providing diffs manually

Return a `WithDiff` instance to provide both the value and its diff:

```typescript
import { withDiff } from '@tldraw/state'

const count = atom('count', 0)

const doubled = computed('doubled', (prevValue) => {
	const nextValue = count.get() * 2

	if (isUninitialized(prevValue)) {
		return nextValue
	}

	return withDiff(nextValue, nextValue - prevValue)
})
```

## Dependency tracking

The signals system automatically tracks dependencies using a capture mechanism. When you call `.get()` inside a computed signal or effect, that signal is registered as a dependency:

```typescript
const a = atom('a', 1)
const b = atom('b', 2)

const sum = computed('sum', () => {
	return a.get() + b.get() // Both a and b tracked as dependencies
})

const tripled = computed('tripled', () => {
	return sum.get() * 3 // sum tracked as dependency
})
```

The dependency graph updates automatically:

```typescript
a.set(5)
// This triggers sum to recalculate
// Which triggers tripled to recalculate
```

### Reading without capturing

Sometimes you need to read a value without creating a dependency. Use `__unsafe__getWithoutCapture()`:

```typescript
const metadata = atom('metadata', { version: 1 })
const data = atom('data', [])

const processed = computed('processed', () => {
	// Create dependency on data - recompute when data changes
	const items = data.get()

	// Read metadata without dependency - don't recompute when metadata changes
	const version = metadata.__unsafe__getWithoutCapture()

	return processItems(items, version)
})
```

You can also use the `unsafe__withoutCapture` helper function:

```typescript
import { unsafe__withoutCapture } from '@tldraw/state'

const value = unsafe__withoutCapture(() => {
	// Any .get() calls here won't create dependencies
	return someSignal.get()
})
```

## Transactions and batching

Transactions batch multiple updates into a single atomic operation, preventing intermediate reactions:

```typescript
import { transact } from '@tldraw/state'

const firstName = atom('firstName', 'Alice')
const lastName = atom('lastName', 'Smith')

const fullName = computed('fullName', () => {
	console.log('Computing full name')
	return `${firstName.get()} ${lastName.get()}`
})

// Without transaction - fullName computes twice
firstName.set('Bob')
lastName.set('Jones')

// With transaction - fullName computes once
transact(() => {
	firstName.set('Charlie')
	lastName.set('Brown')
})
```

### Nested transactions

Transactions can be nested, and each can be rolled back independently:

```typescript
transact(() => {
	count.set(5)

	transact(() => {
		count.set(10)
	})

	// count is now 10
})
```

### Rolling back

Transactions automatically roll back on exceptions:

```typescript
try {
	transact(() => {
		count.set(100)
		throw new Error('Something went wrong')
	})
} catch (error) {
	// count rolled back to its previous value
}
```

You can also manually trigger a rollback:

```typescript
transact((rollback) => {
	makeChanges()

	if (shouldAbort) {
		rollback()
	}
})
```

## Effects and reactions

Effects are side effects that automatically re-run when their dependencies change:

```typescript
import { react } from '@tldraw/state'

const count = atom('count', 0)

// Create an effect
const stop = react('logger', () => {
	console.log('Count is:', count.get())
})
// Immediately logs: 'Count is: 0'

count.set(5)
// Logs: 'Count is: 5'

// Clean up when done
stop()
```

### Reactor for manual control

Use `reactor()` for more control over when effects run:

```typescript
import { reactor } from '@tldraw/state'

const r = reactor('manual', () => {
	console.log('Count:', count.get())
})

// Start the reactor
r.start()

// Manually trigger
r.go()

// Stop when done
r.stop()
```

### Custom effect scheduling

Batch effects using custom scheduling. This is useful for coordinating with animation frames or other timing:

```typescript
const stop = react(
	'dom-update',
	() => {
		updateDOM(state.get())
	},
	{
		scheduleEffect: (execute) => {
			requestAnimationFrame(execute)
		},
	}
)
```

## Epochs and change detection

The package uses an epoch-based system for efficient change detection. The global epoch increments whenever any atom changes:

```typescript
import { getGlobalEpoch } from '@tldraw/state'

const count = atom('count', 0)
const epoch1 = getGlobalEpoch()

count.set(1)
const epoch2 = getGlobalEpoch()

console.log(epoch2 > epoch1) // true
```

Each signal tracks when it last changed:

```typescript
const a = atom('a', 1)
const b = computed('b', () => a.get() * 2)

console.log(a.lastChangedEpoch)
console.log(b.lastChangedEpoch)
```

This enables efficient dirty checking—computed signals compare epochs to determine if they need to recalculate.

## Performance optimizations

### Memory efficiency

The package is designed for minimal memory overhead:

- `ArraySet` hybrid structure uses arrays for small collections (≤8 items), switches to Set for larger ones
- Empty arrays use a shared singleton to avoid allocations
- History buffers are only allocated when explicitly requested
- Automatic cleanup of unused parent-child relationships

### Computation efficiency

Several strategies minimize unnecessary work:

**Lazy evaluation**: Computed values only run when accessed:

```typescript
const expensive = computed('expensive', () => {
	// This only runs when someone calls expensive.get()
	return doExpensiveWork()
})
```

**Epoch comparison**: Fast numeric comparison determines if recomputation is needed, without traversing the entire dependency graph.

**Dependency pruning**: Unused dependencies are automatically cleaned up:

```typescript
const a = atom('a', 1)
const b = atom('b', 2)
const c = atom('c', true)

const result = computed('result', () => {
	if (c.get()) {
		return a.get()
	} else {
		return b.get()
	}
})

result.get() // Depends on c and a

c.set(false)
result.get() // Now depends on c and b (a dependency removed automatically)
```

### Runtime optimizations

**Skipping dependency tracking**: Use `__unsafe__getWithoutCapture()` for hot paths:

```typescript
const hotPath = computed('hotPath', () => {
	// Critical dependency
	const important = importantData.get()

	// Read metadata without overhead
	const meta = metadataAtom.__unsafe__getWithoutCapture()

	return process(important, meta)
})
```

**Custom equality**: Prevent unnecessary updates with specialized comparison:

```typescript
const position = atom(
	'position',
	{ x: 0, y: 0 },
	{
		isEqual: (a, b) => a.x === b.x && a.y === b.y,
	}
)
```

**Effect batching**: Schedule effects efficiently:

```typescript
react('render', updateView, {
	scheduleEffect: (execute) => requestAnimationFrame(execute),
})
```

## Common patterns

### Deriving state

Create computed signals for derived data instead of duplicating state:

```typescript
const todos = atom('todos', [])

const completedTodos = computed('completed', () => {
	return todos.get().filter((todo) => todo.completed)
})

const activeTodos = computed('active', () => {
	return todos.get().filter((todo) => !todo.completed)
})

const stats = computed('stats', () => {
	const all = todos.get()
	return {
		total: all.length,
		completed: completedTodos.get().length,
		active: activeTodos.get().length,
	}
})
```

### Sync to external systems

Use effects to synchronize with external systems:

```typescript
// Sync to localStorage
react('persist', () => {
	const data = appState.get()
	localStorage.setItem('app-state', JSON.stringify(data))
})

// Sync to server
react(
	'save',
	() => {
		const data = documentState.get()
		saveToServer(data)
	},
	{
		scheduleEffect: debounce, // Debounce network requests
	}
)
```

### Class-based computed properties

Use the `@computed` decorator for class properties:

```typescript
import { atom, computed as computedDecorator } from '@tldraw/state'

class Counter {
	count = atom('count', 0)

	@computedDecorator
	get doubled() {
		return this.count.get() * 2
	}

	@computedDecorator
	get tripled() {
		return this.count.get() * 3
	}
}

const counter = new Counter()
console.log(counter.doubled) // 0
counter.count.set(5)
console.log(counter.doubled) // 10
```

### Incremental processing

Handle expensive computations incrementally:

```typescript
interface ProcessedData {
	items: Item[]
	index: Map<string, Item>
}

const items = atom('items', [])

const processed = computed('processed', (prev): ProcessedData => {
	const currentItems = items.get()

	if (isUninitialized(prev)) {
		// Initial computation
		const index = new Map()
		currentItems.forEach((item) => index.set(item.id, item))
		return { items: currentItems, index }
	}

	// Incremental update - only rebuild what changed
	const newIndex = new Map(prev.index)
	currentItems.forEach((item) => {
		if (!newIndex.has(item.id)) {
			newIndex.set(item.id, item)
		}
	})

	return { items: currentItems, index: newIndex }
})
```

## Debugging

### Signal names

Always provide descriptive names when creating signals—they appear in debugging output:

```typescript
// Good
const userCount = atom('userCount', 0)
const activeUsers = computed('activeUsers', () => users.get().filter(u => u.active))

// Avoid
const a = atom('a', 0)
const c = computed('c', () => ...)
```

### Dependency inspection

Use `whyAmIRunning()` to understand why a signal is updating:

```typescript
import { whyAmIRunning } from '@tldraw/state'

const myComputed = computed('myComputed', () => {
  whyAmIRunning() // Prints dependency tree
  return ...
})
```

This prints a hierarchical tree showing:

- Which signals changed
- What triggered the computation
- The full dependency chain

### Development warnings

The package includes helpful warnings in development:

- Warns when computed getters are used (should use `@computed` decorator)
- Detects infinite reaction loops
- Validates API versions across packages

## Integration with React

While `@tldraw/state` is framework-agnostic, the `@tldraw/state-react` package provides React-specific bindings:

```typescript
import { useValue } from '@tldraw/state-react'

const count = atom('count', 0)

function Counter() {
  // Component re-renders when count changes
  const value = useValue(count)

  return (
    <div>
      <span>{value}</span>
      <button onClick={() => count.set(value + 1)}>
        Increment
      </button>
    </div>
  )
}
```

## Key files

- packages/state/src/lib/types.ts - Core interfaces and type definitions
- packages/state/src/lib/Atom.ts - Mutable state implementation
- packages/state/src/lib/Computed.ts - Derived state with lazy evaluation
- packages/state/src/lib/EffectScheduler.ts - Side effect management
- packages/state/src/lib/capture.ts - Automatic dependency tracking
- packages/state/src/lib/transactions.ts - Batched updates and rollback
- packages/state/src/lib/ArraySet.ts - Memory-optimized hybrid collection
- packages/state/src/lib/HistoryBuffer.ts - Circular buffer for change tracking
- packages/state/src/lib/helpers.ts - Utility functions and optimizations

## Related

- [@tldraw/store](./store.md) - Record-based storage built on this package
- [@tldraw/editor](./editor.md) - Canvas editor using reactive state throughout
