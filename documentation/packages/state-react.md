---
title: "@tldraw/state-react"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - react
  - state
  - signals
  - hooks
  - reactive
---

The `@tldraw/state-react` package provides React bindings for tldraw's reactive state system. It bridges the signals implementation in `@tldraw/state` with React's component lifecycle, enabling seamless integration of reactive state with React applications.

## Overview

This package provides hooks and utilities to use tldraw's signals system within React components:

- **useValue**: Subscribe to signal values and re-render on changes
- **useAtom**: Create component-scoped reactive atoms
- **useComputed**: Create memoized computed signals
- **useReactor/useQuickReactor**: Run reactive side effects
- **track**: HOC for automatic signal dependency tracking

## Core hooks

### useValue

The primary hook for extracting values from signals:

```typescript
import { useValue } from '@tldraw/state-react'
import { atom } from '@tldraw/state'

const count = atom('count', 0)

function Counter() {
  // Direct signal subscription - re-renders when count changes
  const value = useValue(count)

  return <div>{value}</div>
}
```

For computed values with dependencies:

```typescript
function UserDisplay({ userId }: { userId: string }) {
  // Computed value - re-renders when result changes
  const user = useValue('user', () => {
    return users.get().find(u => u.id === userId)
  }, [userId])

  return <div>{user?.name}</div>
}
```

The hook uses React's `useSyncExternalStore` for React 18 compatibility and proper concurrent mode support.

### useAtom

Create component-local reactive atoms:

```typescript
import { useAtom } from '@tldraw/state-react'

function Counter() {
  // Created once per component instance
  const $count = useAtom('count', 0)

  return (
    <button onClick={() => $count.set($count.get() + 1)}>
      Count: {$count.get()}
    </button>
  )
}
```

With lazy initialization:

```typescript
function ExpensiveComponent() {
  const $data = useAtom('data', () => computeExpensiveDefault())
  // ...
}
```

### useComputed

Create memoized computed signals within components:

```typescript
import { useComputed } from '@tldraw/state-react'

function FilteredList({ filter }: { filter: string }) {
  const $items = useAtom('items', [])

  // Recomputed when $items or filter changes
  const $filtered = useComputed('filtered', () => {
    return $items.get().filter(item => item.name.includes(filter))
  }, [filter])

  return (
    <ul>
      {$filtered.get().map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  )
}
```

## Effect hooks

### useReactor

Runs reactive effects throttled to animation frames:

```typescript
import { useReactor } from '@tldraw/state-react'

function Visualizer() {
  const editor = useEditor()

  // Visual updates throttled to ~60fps
  useReactor('updateVisualization', () => {
    const shapes = editor.getCurrentPageShapes()
    updateCanvas(shapes)
  }, [editor])

  return <canvas ref={canvasRef} />
}
```

Best for:

- DOM updates
- Canvas rendering
- Animations
- Visual effects

### useQuickReactor

Runs reactive effects immediately without throttling:

```typescript
import { useQuickReactor } from '@tldraw/state-react'

function DataSync() {
  const editor = useEditor()

  // Immediate execution when dependencies change
  useQuickReactor('syncData', () => {
    const selection = editor.getSelectedShapeIds()
    sendToServer(selection)
  }, [editor])

  return null
}
```

Best for:

- Critical state synchronization
- Event handling
- Non-visual side effects

## Component tracking

### track

Higher-order component that automatically tracks signal dependencies:

```typescript
import { track } from '@tldraw/state-react'

const ShapeList = track(function ShapeList() {
  const editor = useEditor()

  // Accessing signals inside track() automatically subscribes
  const shapes = editor.getCurrentPageShapes()
  const selectedIds = editor.getSelectedShapeIds()

  return (
    <ul>
      {shapes.map(shape => (
        <li
          key={shape.id}
          className={selectedIds.includes(shape.id) ? 'selected' : ''}
        >
          {shape.type}
        </li>
      ))}
    </ul>
  )
})
```

The `track` function:

- Wraps component in `React.memo` for performance
- Automatically detects signal access during render
- Re-renders only when accessed signals change
- Works with forwardRef components

### useStateTracking

Lower-level hook for manual reactive tracking:

```typescript
import { useStateTracking } from '@tldraw/state-react'

function CustomComponent() {
  return useStateTracking('CustomComponent', () => {
    const editor = useEditor()
    const shapes = editor.getCurrentPageShapes()
    return <div>Shape count: {shapes.length}</div>
  })
}
```

## Usage patterns

### Basic tracked component

```typescript
const Counter = track(function Counter() {
  const $count = useAtom('count', 0)

  return (
    <button onClick={() => $count.set($count.get() + 1)}>
      {$count.get()}
    </button>
  )
})
```

### Computed values in components

```typescript
const UserProfile = track(function UserProfile({ userId }: Props) {
  const $user = useValue('user', () => getUserById(userId), [userId])

  const $displayName = useComputed('displayName', () => {
    const user = $user
    return `${user.firstName} ${user.lastName}`
  }, [$user])

  return <div>{$displayName.get()}</div>
})
```

### Combining effects

```typescript
const DataSyncComponent = track(function DataSync() {
  const editor = useEditor()

  // Visual updates (throttled)
  useReactor('ui-updates', () => {
    updateUIBasedOnSelection(editor.getSelectedShapeIds())
  }, [editor])

  // Critical sync (immediate)
  useQuickReactor('data-sync', () => {
    syncCriticalData(editor.getPageState())
  }, [editor])

  return <EditorUI />
})
```

## Performance considerations

### When to use each hook

| Hook | Use case | Performance |
|------|----------|-------------|
| `useValue` | Simple signal subscriptions | Optimal for frequently changing values |
| `useReactor` | Visual updates, animations | Throttled to 60fps |
| `useQuickReactor` | Critical state sync | Immediate, higher CPU |
| `useStateTracking` | Complex render logic | Fine-grained control |

### Optimization tips

1. **Use the `$` prefix convention** for signals (`$count`, `$user`)

2. **Batch related changes** to minimize renders:
   ```typescript
   transact(() => {
     $firstName.set('Alice')
     $lastName.set('Smith')
   })
   ```

3. **Choose appropriate effect hooks** based on timing needs

4. **Minimize dependency arrays** - only include truly reactive deps

5. **Avoid creating signals in render** - use `useAtom`/`useComputed`

### Memory management

The package handles cleanup automatically:

- Signal subscriptions are unsubscribed on unmount
- Effect schedulers are disposed properly
- No manual cleanup required in most cases

```typescript
// Cleanup happens automatically
useReactor('effect', () => {
  // ...
}, [deps])
// Disposed when component unmounts or deps change
```

## Integration with tldraw

### Editor components

```typescript
import { useEditor, track } from '@tldraw/tldraw'

const ShapeIndicator = track(function ShapeIndicator() {
  const editor = useEditor()

  // These calls track dependencies automatically
  const shapes = editor.getCurrentPageShapes()
  const camera = editor.getCamera()

  return (
    <div>
      {shapes.length} shapes at zoom {camera.z.toFixed(2)}
    </div>
  )
})
```

### Custom tools

```typescript
const ToolStatus = track(function ToolStatus() {
  const editor = useEditor()
  const currentTool = editor.getCurrentToolId()

  useReactor('toolChange', () => {
    console.log('Tool changed to:', currentTool)
  }, [currentTool])

  return <div>Current tool: {currentTool}</div>
})
```

## Key files

- packages/state-react/src/lib/useValue.ts - Signal value subscription
- packages/state-react/src/lib/useAtom.ts - Component-local atoms
- packages/state-react/src/lib/useComputed.ts - Computed signal creation
- packages/state-react/src/lib/useReactor.ts - Throttled reactive effects
- packages/state-react/src/lib/useQuickReactor.ts - Immediate reactive effects
- packages/state-react/src/lib/track.ts - Component tracking HOC
- packages/state-react/src/lib/useStateTracking.ts - Manual state tracking

## Related

- [@tldraw/state](./state.md) - Core signals implementation
- [@tldraw/tldraw](./tldraw.md) - Uses state-react throughout
- [Reactive state architecture](../architecture/reactive-state.md) - How signals work
