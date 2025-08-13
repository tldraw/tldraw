````markdown
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
````

Implementation details:

- Uses `useSyncExternalStore` for React 18 compatibility
- Creates subscription to signal change events
- Returns unwrapped value using `__unsafe__getWithoutCapture()` method
- Supports both direct signals and computed expressions
- Automatic dependency tracking with deps array
- Safe error handling with try-catch blocks for render-time exceptions

**Return Signature:**
The hook returns the actual value (not the signal wrapper) by using `__unsafe__getWithoutCapture()` to avoid triggering dependency tracking during the subscription callback.

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
// Basic computed value
useComputed<Value>(name: string, compute: () => Value, deps: any[]): Computed<Value>

// Advanced computed value with options
useComputed<Value, Diff>(
  name: string,
  compute: () => Value,
  opts: ComputedOptions<Value, Diff>,
  deps: any[]
): Computed<Value>
```

The second overload accepts `ComputedOptions` which allows configuration of diff functions, equality checks, and other advanced behaviors for optimization.

Benefits:

- Memoized using `useMemo` with dependency array
- Reactive dependencies tracked automatically during computation
- Efficient recomputation only when dependencies change
- Named for debugging and performance profiling

### Effect Hooks

#### `useReactor` - Frame-Throttled Effects

Runs reactive effects with updates throttled to animation frames:

```typescript
useReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with custom `scheduleEffect` callback
- The throttling is handled by `throttleToNextFrame` utility passed to the scheduler
- `EffectScheduler` itself doesn't handle throttling - it delegates to the provided callback
- Proper cleanup on unmount or dependency changes
- Ideal for visual updates and animations

#### `useQuickReactor` - Immediate Effects

Runs reactive effects without throttling:

```typescript
useQuickReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with immediate execution (no throttling callback)
- Effects run synchronously when dependencies change

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

- **ProxyHandlers**: Uses JavaScript Proxy to intercept function calls and track signal access
- **React.memo integration**: Automatically wraps components in memo for performance
- **Forward ref support**: Handles forwardRef components correctly
- **Symbol detection**: Works with React's internal component types

#### `useStateTracking` - Lower-Level Tracking

Manual reactive tracking for render functions:

```typescript
useStateTracking<T>(name: string, render: () => T, deps: unknown[] = []): T
```

Features:

- Uses `EffectScheduler` for dependency tracking
- Integrates with `useSyncExternalStore`
- Uses `scheduleCount` mechanism for efficient snapshot-based change detection
- Deferred effect attachment to avoid render-phase side effects
- Prevents "zombie component" issues during unmounting
- `deps` parameter has default empty array value

## Key Implementation Details

### The `__unsafe__getWithoutCapture` Method

This internal method is used in `useValue` to extract signal values without triggering dependency tracking:

```typescript
// In useValue implementation
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		return signal.subscribe(signal.name, onStoreChange)
	},
	[$signal]
)

const getSnapshot = useCallback(() => {
	return $signal.__unsafe__getWithoutCapture() // Avoids dependency tracking
}, [$signal])
```

**Why it's needed:**

- During subscription callbacks, we want the current value without creating reactive dependencies
- Prevents infinite loops where getting a value triggers the subscription
- Ensures clean separation between subscription and value extraction

### ProxyHandlers Implementation

The `track` function uses JavaScript Proxy to intercept React component function calls:

```typescript
const proxiedComponent = new Proxy(baseComponent, {
	apply(target, thisArg, argArray) {
		return useStateTracking(target.name || 'TrackedComponent', () => {
			return target.apply(thisArg, argArray)
		})
	},
})
```

This allows automatic signal tracking without manual hook calls in every component.

### EffectScheduler Integration

The package uses `EffectScheduler` differently for different hooks:

**useReactor (throttled):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn,
			{ scheduleEffect: throttleToNextFrame } // Custom scheduling
		),
	deps
)
```

**useQuickReactor (immediate):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn
			// No scheduleEffect = immediate execution
		),
	deps
)
```

The `EffectScheduler` itself is agnostic to timing - it delegates scheduling to the provided callback or executes immediately.

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
useReactor(
	'visual-update',
	() => {
		// Updates throttled to animation frame
	},
	[]
)

// Immediate updates for critical state
useQuickReactor(
	'state-sync',
	() => {
		// Immediate execution
	},
	[]
)
```

#### Dependency Management

- Explicit dependency arrays like React hooks
- Automatic signal dependency tracking during execution
- Efficient change detection using epoch-based snapshots
- `scheduleCount` mechanism in `useStateTracking` for batched updates

### Error Handling Patterns

The package includes comprehensive error handling:

```typescript
// In useValue subscription
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		try {
			return $signal.subscribe($signal.name, onStoreChange)
		} catch (error) {
			// Handle subscription errors gracefully
			console.error('Signal subscription failed:', error)
			return () => {} // Return no-op cleanup
		}
	},
	[$signal]
)
```

Common patterns:

- Try-catch blocks around signal operations
- Graceful degradation on subscription failures
- Error isolation to prevent cascade failures
- Safe cleanup functions to prevent memory leaks

### Memory Management

- Automatic cleanup of reactive subscriptions
- Proper disposal of effect schedulers
- Prevention of memory leaks through careful lifecycle management
- Component unmounting detection to avoid "zombie" subscriptions

## Component Unmounting and Cleanup

### Handling Component Lifecycle

```typescript
// Effect cleanup on unmount
useEffect(() => {
	const scheduler = new EffectScheduler(name, reactFn, options)
	return () => scheduler.dispose() // Automatic cleanup
}, deps)

// Atom cleanup (handled automatically by React)
const atom = useAtom('myAtom', initialValue)
// No manual cleanup needed - React handles disposal
```

### Preventing Memory Leaks

- All reactive subscriptions are automatically unsubscribed on unmount
- Effect schedulers are properly disposed
- Signal references are cleared when components unmount
- Proxy objects don't create persistent references

## Usage Patterns

### Basic Component Tracking

```typescript
const Counter = track(function Counter() {
  const $count = useAtom('count', 0)
  return <button onClick={() => $count.set($count.get() + 1)}>
    {$count.get()}
  </button>
})
```

### Computed Values in Components

```typescript
const UserProfile = track(function UserProfile({ userId }: Props) {
  const $user = useValue('user', () => getUserById(userId), [userId])
  const $displayName = useComputed('displayName', () =>
    `${$user.firstName} ${$user.lastName}`, [$user]
  )
  return <div>{$displayName.get()}</div>
})
```

### Side Effects and Synchronization

```typescript
const DataSyncComponent = track(function DataSync() {
	const $editor = useEditor()

	// Visual updates (throttled to animation frame)
	useReactor(
		'ui-updates',
		() => {
			updateUIBasedOnSelection($editor.getSelectedShapeIds())
		},
		[$editor]
	)

	// Critical state sync (immediate)
	useQuickReactor(
		'data-sync',
		() => {
			syncCriticalData($editor.getPageState())
		},
		[$editor]
	)
})
```

### Manual State Tracking

```typescript
function CustomComponent() {
  return useStateTracking('CustomComponent', () => {
    const $shapes = editor.getCurrentPageShapes()
    return <div>Shape count: {$shapes.length}</div>
  })
}
```

## Performance Considerations

### When to Use Each Hook

**useValue:**

- Best for: Simple signal subscriptions and computed values
- Performance: Optimal for frequently changing values
- Use when: You need the raw value, not the signal wrapper

**useReactor:**

- Best for: Visual updates, DOM manipulations, animations
- Performance: Throttled to 60fps, prevents excessive renders
- Use when: Updates can be batched to animation frames

**useQuickReactor:**

- Best for: Critical state synchronization, event handling
- Performance: Immediate execution, higher CPU usage
- Use when: Updates must happen immediately

**useStateTracking:**

- Best for: Complex render logic with multiple signal dependencies
- Performance: Fine-grained control over tracking behavior
- Use when: You need manual control over the tracking lifecycle

### Optimization Guidelines

1. **Prefer `$` prefix**: Use consistent naming for signals (`$count`, `$user`)
2. **Batch related changes**: Group signal updates to minimize renders
3. **Use appropriate effect hooks**: Choose throttled vs immediate based on use case
4. **Minimize dependency arrays**: Only include truly reactive dependencies
5. **Avoid creating signals in render**: Use `useAtom`/`useComputed` for component-local state

### Memory and Performance Monitoring

- Signal subscriptions are lightweight but should be monitored in large applications
- Use React DevTools to identify unnecessary re-renders
- Monitor `EffectScheduler` instances in development for cleanup verification
- Track signal creation/disposal patterns to identify memory leaks

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
- **@tldraw/state**: Core reactive state system (EffectScheduler, signals)
- **@tldraw/utils**: Throttling utilities (`throttleToNextFrame`)

### Integration Points

- Builds directly on EffectScheduler from state package
- Uses utility functions for performance optimization
- Provides React-specific API surface for signals system

```

```
