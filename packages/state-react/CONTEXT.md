# State-React Package Context

## Overview
The `@tldraw/state-react` package provides React bindings for tldraw's reactive state system (signals). It bridges the gap between the pure signals implementation in `@tldraw/state` and React's component lifecycle, enabling seamless integration of reactive state with React applications.

## Architecture

### Core React Hooks

#### `useValue` - Signal Subscription
The primary hook for extracting values from signals and subscribing to changes:
```typescript
// Direct signal subscription
useValue<Value>(signal: Signal<Value>): Value

// Computed value with dependency tracking
useValue<Value>(name: string, compute: () => Value, deps: unknown[]): Value
```

Implementation details:
- Uses `useSyncExternalStore` for React 18 compatibility
- Creates subscription to signal change events
- Supports both direct signals and computed expressions
- Automatic dependency tracking with deps array
- Safe error handling for render-time exceptions

#### `useAtom` - Component-Local State
Creates component-scoped reactive atoms:
```typescript
useAtom<Value, Diff>(
  name: string,
  valueOrInitialiser: Value | (() => Value),
  options?: AtomOptions<Value, Diff>
): Atom<Value, Diff>
```

Features:
- Created only once per component instance using `useState`
- Supports lazy initialization with function initializers
- Configurable with AtomOptions (diff functions, etc.)
- Automatically cleaned up when component unmounts

#### `useComputed` - Component-Local Computed Values
Creates memoized computed signals within components:
```typescript
useComputed<Value>(name: string, compute: () => Value, deps: any[]): Computed<Value>
useComputed<Value, Diff>(name: string, compute: () => Value, opts: ComputedOptions<Value, Diff>, deps: any[]): Computed<Value>
```

Benefits:
- Memoized using `useMemo` with dependency array
- Reactive dependencies tracked automatically during computation
- Efficient recomputation only when dependencies change
- Named for debugging and performance profiling

### Effect Hooks

#### `useReactor` - Frame-Throttled Effects
Runs reactive effects throttled to animation frames:
```typescript
useReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:
- Uses `EffectScheduler` from state package
- Throttles updates to next animation frame via `throttleToNextFrame`
- Proper cleanup on unmount or dependency changes
- Ideal for visual updates and animations

#### `useQuickReactor` - Immediate Effects
Runs reactive effects without throttling:
```typescript
useQuickReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Use cases:
- Immediate state synchronization
- Non-visual side effects
- Critical updates that can't wait for next frame

### Component Tracking

#### `track` - Higher-Order Component
Automatically tracks signal dependencies in React components:
```typescript
track<T extends FunctionComponent<any>>(
  baseComponent: T
): React.NamedExoticComponent<React.ComponentProps<T>>
```

Advanced implementation:
- **Proxy-based**: Intercepts function calls to track signal access
- **React.memo integration**: Automatically wraps components in memo
- **Forward ref support**: Handles forwardRef components correctly
- **Symbol detection**: Works with React's internal component types

#### `useStateTracking` - Lower-Level Tracking
Manual reactive tracking for render functions:
```typescript
useStateTracking<T>(name: string, render: () => T, deps?: unknown[]): T
```

Features:
- Uses `EffectScheduler` for dependency tracking
- Integrates with `useSyncExternalStore`
- Deferred effect attachment to avoid render-phase side effects
- Prevents "zombie component" issues during unmounting

## Key Design Patterns

### React Integration Strategy
The package uses several React patterns for optimal integration:

1. **useSyncExternalStore**: Official React 18 hook for external state
2. **useEffect**: Lifecycle management for reactive effects
3. **useMemo**: Memoization of expensive signal creation
4. **useState**: Component-local signal instances

### Performance Optimizations

#### Throttling Strategy
```typescript
// Frame-throttled updates for visual changes
useReactor('visual-update', () => {
  // Updates throttled to animation frame
}, [])

// Immediate updates for critical state
useQuickReactor('state-sync', () => {
  // Immediate execution
}, [])
```

#### Dependency Management
- Explicit dependency arrays like React hooks
- Automatic signal dependency tracking during execution
- Efficient change detection using epoch-based snapshots

### Error Handling
- Safe error boundaries during signal reads
- Graceful handling of component unmounting during updates
- Error isolation prevents cascade failures

### Memory Management
- Automatic cleanup of reactive subscriptions
- Proper disposal of effect schedulers
- Prevention of memory leaks through careful lifecycle management

## Usage Patterns

### Basic Component Tracking
```typescript
const Counter = track(function Counter() {
  const count = useAtom('count', 0)
  return <button onClick={() => count.set(count.get() + 1)}>
    {count.get()}
  </button>
})
```

### Computed Values in Components
```typescript
const UserProfile = track(function UserProfile({ userId }: Props) {
  const user = useValue('user', () => getUserById(userId), [userId])
  const displayName = useComputed('displayName', () => 
    `${user.firstName} ${user.lastName}`, [user]
  )
  return <div>{displayName.get()}</div>
})
```

### Side Effects and Synchronization
```typescript
const DataSyncComponent = track(function DataSync() {
  const editor = useEditor()
  
  // Visual updates (throttled)
  useReactor('ui-updates', () => {
    updateUIBasedOnSelection(editor.getSelectedShapeIds())
  }, [editor])
  
  // Critical state sync (immediate)
  useQuickReactor('data-sync', () => {
    syncCriticalData(editor.getPageState())
  }, [editor])
})
```

### Manual State Tracking
```typescript
function CustomComponent() {
  return useStateTracking('CustomComponent', () => {
    const shapes = editor.getCurrentPageShapes()
    return <div>Shape count: {shapes.length}</div>
  })
}
```

## Integration with tldraw

### Editor Components
Used throughout tldraw's React components:
- **TldrawEditor**: Main editor component uses tracking
- **UI Components**: All reactive UI elements use state-react hooks
- **Tool Components**: State machines integrated with React lifecycle

### Performance in Complex UIs
- **Selective Updates**: Only components accessing changed signals re-render
- **Batched Updates**: Multiple signal changes batched into single renders
- **Frame Alignment**: Visual updates aligned with browser paint cycles

## Key Benefits

### Automatic Reactivity
- No manual subscription management required
- Automatic dependency tracking eliminates bugs
- Components automatically re-render when state changes

### React Ecosystem Compatibility
- Works with existing React patterns and tools
- Compatible with React DevTools
- Integrates with React Suspense and Concurrent Features

### Performance
- Fine-grained reactivity prevents unnecessary re-renders
- Efficient change detection and subscription management
- Optimized for large, complex applications

### Developer Experience
- Familiar React hook patterns
- Clear error messages with component context
- TypeScript integration with full type safety

## Dependencies

### External Dependencies
- **React**: Core React hooks and lifecycle integration
- **@tldraw/state**: Core reactive state system
- **@tldraw/utils**: Throttling and utility functions

### Integration Points
- Builds directly on EffectScheduler from state package
- Uses utility functions for performance optimization
- Provides React-specific API surface for signals system