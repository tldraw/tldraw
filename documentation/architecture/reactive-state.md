---
title: Reactive state
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - state
  - signals
  - reactive
  - atom
  - computed
---

The reactive state system is the foundation of tldraw's real-time updates. Built on signals, it provides automatic dependency tracking, lazy evaluation, and efficient change propagation throughout the entire application.

## Overview

tldraw uses a signals-based reactivity system similar to MobX or SolidJS, implemented in `@tldraw/state`. The core philosophy is: only recompute what actually needs to change, when it needs to change.

Key features:

- **Automatic dependency tracking**: No manual subscriptions
- **Lazy evaluation**: Computed values only run when accessed
- **Efficient updates**: Epoch-based change detection
- **Transaction support**: Batch multiple changes atomically
- **React integration**: Seamless component re-rendering

## Core primitives

### Atoms

Atoms are the foundation of mutable state:

```typescript
import { atom } from '@tldraw/state'

const count = atom('count', 0)

// Read
count.get() // 0

// Write
count.set(5)
count.get() // 5

// Update based on current value
count.update(n => n + 1) // 6
```

Atoms are named for debugging. The name appears in dev tools and error messages.

### Computed values

Computed values derive from other signals:

```typescript
import { computed } from '@tldraw/state'

const firstName = atom('firstName', 'Alice')
const lastName = atom('lastName', 'Smith')

const fullName = computed('fullName', () => {
  return `${firstName.get()} ${lastName.get()}`
})

fullName.get() // 'Alice Smith'

firstName.set('Bob')
fullName.get() // 'Bob Smith' (automatically recomputed)
```

Dependencies are tracked automatically—any signal accessed during computation becomes a dependency.

### Lazy evaluation

Computed values are lazy—they only compute when accessed:

```typescript
const expensive = computed('expensive', () => {
  console.log('Computing...')
  return heavyCalculation()
})

// Nothing logged yet

expensive.get() // Now logs 'Computing...'
expensive.get() // No log - cached value returned
```

## Dependency tracking

### Automatic tracking

When you call `.get()` inside a computed signal, that signal is registered as a dependency:

```typescript
const a = atom('a', 1)
const b = atom('b', 2)

const sum = computed('sum', () => {
  return a.get() + b.get()  // Both tracked
})

const tripled = computed('tripled', () => {
  return sum.get() * 3      // sum tracked
})
```

The dependency graph updates automatically:

```
a.set(5)
  → triggers sum to recalculate
    → triggers tripled to recalculate
```

### Dynamic dependencies

Dependencies can change between executions:

```typescript
const useA = atom('useA', true)
const a = atom('a', 1)
const b = atom('b', 2)

const result = computed('result', () => {
  if (useA.get()) {
    return a.get()  // Depends on useA and a
  } else {
    return b.get()  // Depends on useA and b
  }
})

result.get() // 1, depends on [useA, a]

useA.set(false)
result.get() // 2, now depends on [useA, b]

a.set(100)   // No recomputation - a is no longer a dependency
```

### Reading without tracking

Use `__unsafe__getWithoutCapture()` to read without creating a dependency:

```typescript
const metadata = atom('metadata', { version: 1 })
const data = atom('data', [])

const processed = computed('processed', () => {
  // Track data changes
  const items = data.get()

  // Don't track metadata changes
  const version = metadata.__unsafe__getWithoutCapture()

  return processItems(items, version)
})
```

## Transactions

Transactions batch multiple updates into a single atomic operation:

```typescript
import { transact } from '@tldraw/state'

const firstName = atom('firstName', 'Alice')
const lastName = atom('lastName', 'Smith')

// Without transaction - multiple recomputations
firstName.set('Bob')   // Triggers dependents
lastName.set('Jones')  // Triggers dependents again

// With transaction - single recomputation
transact(() => {
  firstName.set('Charlie')
  lastName.set('Brown')
})
// Dependents computed once with final values
```

### Nested transactions

```typescript
transact(() => {
  count.set(5)

  transact(() => {
    count.set(10)  // Inner transaction
  })

  // count is now 10
})
```

### Rollback

Transactions automatically roll back on exception:

```typescript
const count = atom('count', 0)

try {
  transact(() => {
    count.set(100)
    throw new Error('Abort')
  })
} catch {
  count.get() // Still 0 - rolled back
}
```

Manual rollback:

```typescript
transact((rollback) => {
  makeChanges()

  if (shouldAbort) {
    rollback()
  }
})
```

## Effects

Effects run side effects when dependencies change:

```typescript
import { react } from '@tldraw/state'

const count = atom('count', 0)

const stop = react('logger', () => {
  console.log('Count is:', count.get())
})
// Immediately logs: 'Count is: 0'

count.set(5)
// Logs: 'Count is: 5'

stop() // Clean up
```

### Custom scheduling

Schedule effects for specific timing:

```typescript
const stop = react('dom-update', () => {
  updateDOM(state.get())
}, {
  scheduleEffect: (execute) => {
    requestAnimationFrame(execute)
  }
})
```

## Epochs and change detection

The system uses epochs for efficient change detection:

```typescript
import { getGlobalEpoch } from '@tldraw/state'

const count = atom('count', 0)
const epoch1 = getGlobalEpoch()

count.set(1)
const epoch2 = getGlobalEpoch()

epoch2 > epoch1 // true - global epoch incremented
```

Each signal tracks its last change epoch:

```typescript
count.lastChangedEpoch  // When count last changed
```

Computed signals compare epochs to determine if recalculation is needed—much faster than deep comparison.

## Custom equality

By default, atoms use strict equality (`===`). For objects, provide custom comparison:

```typescript
const position = atom('position', { x: 0, y: 0 }, {
  isEqual: (a, b) => a.x === b.x && a.y === b.y
})

position.set({ x: 0, y: 0 }) // No update - equal
position.set({ x: 1, y: 0 }) // Update triggered
```

## History tracking

Atoms can track change history:

```typescript
const shapes = atom('shapes', [], {
  historyLength: 100,
  computeDiff: (prev, next) => ({
    added: next.filter(s => !prev.includes(s)),
    removed: prev.filter(s => !next.includes(s))
  })
})

const oldEpoch = getGlobalEpoch()
shapes.set([{ id: 'a' }])
shapes.set([{ id: 'a' }, { id: 'b' }])

const diffs = shapes.getDiffSince(oldEpoch)
// [{ added: [{ id: 'a' }], removed: [] },
//  { added: [{ id: 'b' }], removed: [] }]
```

## React integration

### useValue

Subscribe to signal values in components:

```typescript
import { useValue } from '@tldraw/state-react'

function Counter() {
  const value = useValue(count)  // Re-renders when count changes
  return <div>{value}</div>
}
```

### track

Automatically track dependencies in components:

```typescript
import { track } from '@tldraw/state-react'

const ShapeList = track(function ShapeList() {
  // Any signal accessed here triggers re-render
  const shapes = editor.getCurrentPageShapes()
  return <ul>{shapes.map(s => <li key={s.id}>{s.type}</li>)}</ul>
})
```

### useReactor

Run effects synchronized with React lifecycle:

```typescript
import { useReactor } from '@tldraw/state-react'

function Visualizer() {
  useReactor('render', () => {
    // Runs when dependencies change, throttled to animation frame
    updateCanvas(data.get())
  }, [])
}
```

## Usage in the Editor

The Editor uses signals throughout:

```typescript
class Editor {
  // All state is reactive
  private _currentPage = atom('currentPage', ...)
  private _selectedShapeIds = atom('selectedShapeIds', ...)
  private _camera = atom('camera', ...)

  // Computed values for derived state
  @computed getCurrentPageShapes() {
    return this.getShapesOnPage(this._currentPage.get().id)
  }

  @computed getSelectedShapes() {
    const ids = this._selectedShapeIds.get()
    return ids.map(id => this.getShape(id))
  }
}
```

Components automatically re-render when editor state changes:

```typescript
const SelectionInfo = track(function SelectionInfo() {
  const editor = useEditor()
  const shapes = editor.getSelectedShapes()  // Reactive

  return <div>Selected: {shapes.length} shapes</div>
})
```

## Performance considerations

### Memory efficiency

- `ArraySet`: Hybrid structure (array for ≤8 items, Set for larger)
- Empty arrays use shared singleton
- History buffers only allocated when requested
- Automatic cleanup of unused dependencies

### Computation efficiency

- Lazy evaluation prevents unnecessary work
- Epoch comparison is O(1)
- Dependencies are pruned automatically
- Batched transactions minimize recomputations

### Best practices

1. **Name your signals** for debugging
2. **Use transactions** for related changes
3. **Prefer computed** over manual updates
4. **Avoid deep nesting** in computed functions
5. **Use custom equality** for object atoms

## Debugging

### whyAmIRunning

Understand why a computed is recalculating:

```typescript
import { whyAmIRunning } from '@tldraw/state'

const myComputed = computed('myComputed', () => {
  whyAmIRunning()  // Prints dependency tree
  return calculate()
})
```

### Signal names

Names appear in debugging output:

```typescript
// Good - descriptive names
const userCount = atom('userCount', 0)
const activeUsers = computed('activeUsers', () => ...)

// Avoid - generic names
const a = atom('a', 0)
const c = computed('c', () => ...)
```

## Key files

- packages/state/src/lib/Atom.ts - Mutable state implementation
- packages/state/src/lib/Computed.ts - Derived state with lazy evaluation
- packages/state/src/lib/capture.ts - Automatic dependency tracking
- packages/state/src/lib/transactions.ts - Batched updates
- packages/state/src/lib/EffectScheduler.ts - Side effect management
- packages/state-react/src/lib/useValue.ts - React integration
- packages/state-react/src/lib/track.ts - Component tracking

## Related

- [@tldraw/state](../packages/state.md) - Core signals package
- [@tldraw/state-react](../packages/state-react.md) - React bindings
- [@tldraw/store](../packages/store.md) - Record storage built on signals
