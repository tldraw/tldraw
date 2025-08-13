# CONTEXT.md - @tldraw/state Package

This file provides comprehensive context for understanding the `@tldraw/state` package, a powerful reactive state management library using signals.

## Package Overview

`@tldraw/state` is a fine-grained reactive state management library similar to MobX or SolidJS reactivity, but designed specifically for tldraw's performance requirements. It provides automatic dependency tracking, lazy evaluation, and efficient updates through a signals-based architecture.

**Core Philosophy:** Only recompute what actually needs to change, when it needs to change, with minimal overhead.

## Architecture Overview

### Signal System Foundation

The entire system is built around the `Signal<Value, Diff>` interface defined in `src/lib/types.ts`:

```typescript
interface Signal<Value, Diff = unknown> {
	name: string
	get(): Value
	lastChangedEpoch: number
	getDiffSince(epoch: number): RESET_VALUE | Diff[]
	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value
	children: ArraySet<Child>
}
```

**Two Signal Types:**

1. **Atoms** (`src/lib/Atom.ts`) - Mutable state containers that hold raw values
2. **Computed** (`src/lib/Computed.ts`) - Derived values that automatically recompute when dependencies change

### Dependency Tracking System

**Capture Mechanism (`src/lib/capture.ts`):**

- Uses a global capture stack to automatically track dependencies
- When `.get()` is called during computation, `maybeCaptureParent()` registers dependencies
- `CaptureStackFrame` manages the capture context with efficient parent tracking
- `unsafe__withoutCapture()` allows reading values without creating dependencies

**Parent-Child Relationships:**

- Each signal maintains an `ArraySet<Child>` of dependents
- Each child maintains arrays of `parents` and `parentEpochs`
- Automatic cleanup when no more children exist

### Memory-Optimized Data Structures

**ArraySet (`src/lib/ArraySet.ts`):**

- Hybrid array/Set implementation for optimal performance
- Uses array for small collections (≤8 items), switches to Set for larger ones
- Constant-time operations with minimal memory overhead
- Critical for managing parent-child relationships efficiently

### Reactive Update Propagation

**Effect Scheduling (`src/lib/EffectScheduler.ts`):**

- `EffectScheduler` manages side effects and reactions
- `react()` creates immediate reactions, `reactor()` creates controllable ones
- Pluggable `scheduleEffect` for custom batching (e.g., requestAnimationFrame)
- Automatic cleanup and lifecycle management

**Epoch-Based Invalidation:**

- Global epoch counter increments on any state change
- Each signal tracks `lastChangedEpoch` for efficient dirty checking
- `haveParentsChanged()` in `helpers.ts` compares epochs to determine if recomputation needed

### Transaction System

**Atomic Updates (`src/lib/transactions.ts`):**

- `transact()` batches multiple state changes into single atomic operation
- `transaction()` supports nested transactions with individual rollback
- Automatic rollback on exceptions
- `initialAtomValues` map stores original values for rollback

**Global State Management:**

- Singleton pattern for global transaction state
- `globalEpoch` tracks current time
- `globalIsReacting` prevents infinite loops
- `cleanupReactors` manages effect cleanup during reactions

### History and Time Travel

**Change Tracking (`src/lib/HistoryBuffer.ts`):**

- Circular buffer stores diffs between sequential values
- Configurable `historyLength` per signal
- `ComputeDiff<Value, Diff>` functions for custom diff computation
- `RESET_VALUE` symbol when history insufficient for incremental updates

**Incremental Computation:**

- `withDiff()` helper for manually providing diffs
- `isUninitialized()` for handling first computation
- Diff-based computation allows efficient updates for large data structures

## Key Classes and Components

### Core Signal Implementations

**`__Atom__` (src/lib/Atom.ts):**

```typescript
class __Atom__<Value, Diff> implements Atom<Value, Diff> {
	private current: Value
	children: ArraySet<Child>
	historyBuffer?: HistoryBuffer<Diff>
	lastChangedEpoch: number

	get(): Value // captures parent relationship
	set(value: Value, diff?: Diff): Value
	update(updater: (Value) => Value): Value
}
```

**`__UNSAFE__Computed` (src/lib/Computed.ts):**

```typescript
class __UNSAFE__Computed<Value, Diff> implements Computed<Value, Diff> {
	private derivation: (prevValue: Value | UNINITIALIZED) => Value
	private lastComputedEpoch: number
	private state: 'dirty' | 'computing' | 'computed-clean'
	parents: Signal<any, any>[]
	parentSet: ArraySet<Signal<any, any>>

	// Lazy evaluation with dependency tracking
	get(): Value
}
```

### Supporting Infrastructure

**Capture Stack Frame:**

- Manages dependency tracking during computation
- Efficiently handles parent addition/removal
- Supports debugging with ancestor epoch tracking

**Transaction Management:**

- Nested transaction support with proper cleanup
- Rollback capability with value restoration
- Integration with effect scheduling

## Performance Optimizations

### Memory Efficiency

- `EMPTY_ARRAY` singleton for zero-allocation empty dependencies
- `ArraySet` hybrid data structure minimizes memory for small collections
- Lazy `HistoryBuffer` allocation only when history tracking needed
- `singleton()` pattern prevents duplicate global state

### Computation Efficiency

- **Lazy Evaluation:** Computed values only recalculate when dependencies change
- **Epoch Comparison:** Fast dirty checking via numeric epoch comparison
- **Dependency Pruning:** Automatic cleanup of unused parent-child relationships
- **Batch Updates:** Transaction system prevents intermediate computations

### Runtime Optimizations

- `__unsafe__getWithoutCapture()` bypasses dependency tracking for hot paths
- `isEqual` custom comparison functions prevent unnecessary updates
- Pluggable effect scheduling for batching (e.g., RAF)
- `haveParentsChanged()` efficiently checks if recomputation needed

## API Patterns and Usage

### Basic Reactive State

```typescript
// Mutable state
const count = atom('count', 0)

// Derived state
const doubled = computed('doubled', () => count.get() * 2)

// Side effects
const stop = react('logger', () => console.log(doubled.get()))
```

### Advanced Patterns

```typescript
// Custom equality
const user = atom('user', userObj, {
  isEqual: (a, b) => a.id === b.id
})

// History tracking
const shapes = atom('shapes', [], {
  historyLength: 100,
  computeDiff: (prev, next) => /* custom diff logic */
})

// Incremental computation
const processedData = computed('processed', (prevValue) => {
  if (isUninitialized(prevValue)) {
    return expensiveInitialComputation()
  }
  return incrementalUpdate(prevValue)
})
```

### Transaction Patterns

```typescript
// Atomic updates
transact(() => {
	firstName.set('Jane')
	lastName.set('Smith')
	// Reactions run only once after both updates
})

// Rollback on error
try {
	transact((rollback) => {
		makeRiskyChanges()
		if (shouldAbort) rollback()
	})
} catch (error) {
	// Automatic rollback occurred
}
```

### Performance Patterns

```typescript
// Reading without dependency tracking
const expensiveComputed = computed('expensive', () => {
	const important = importantAtom.get() // Creates dependency

	// Read metadata without creating dependency
	const metadata = unsafe__withoutCapture(() => metadataAtom.get())

	return computeExpensiveValue(important, metadata)
})

// Custom effect scheduling
const stop = react('dom-update', updateDOM, {
	scheduleEffect: (execute) => requestAnimationFrame(execute),
})
```

## Debugging and Development

### Dependency Debugging

- `whyAmIRunning()` prints hierarchical dependency tree showing what triggered updates
- Each signal has a `name` for debugging identification
- Debug flags track ancestor epochs in development

### Development Warnings

- Warnings for computed getters (should use `@computed` decorator)
- API version checking prevents incompatible package versions
- Error boundaries with proper error propagation

## Integration Points

### Internal Dependencies

- `@tldraw/utils` for `registerTldrawLibraryVersion()`, `assert()`, utilities
- No external runtime dependencies - pure TypeScript implementation

### Related Packages

- **`@tldraw/state-react`** - React hooks and components for state integration
- **`@tldraw/store`** - Record-based storage built on @tldraw/state
- **`@tldraw/editor`** - Canvas editor using reactive state throughout

### Extension Points

- `AtomOptions.isEqual` - Custom equality comparison
- `ComputeDiff<Value, Diff>` - Custom diff computation
- `EffectSchedulerOptions.scheduleEffect` - Custom effect batching
- `@computed` decorator for class-based computed properties

## Key Files and Their Roles

### Core Implementation

- **`src/lib/types.ts`** - Foundational interfaces and types
- **`src/lib/Atom.ts`** - Mutable state containers (~200 lines)
- **`src/lib/Computed.ts`** - Derived state with lazy evaluation (~400 lines)
- **`src/lib/EffectScheduler.ts`** - Side effect management (~200 lines)

### Infrastructure

- **`src/lib/capture.ts`** - Dependency tracking mechanism (~150 lines)
- **`src/lib/transactions.ts`** - Atomic updates and rollback (~250 lines)
- **`src/lib/helpers.ts`** - Utilities and optimizations (~100 lines)
- **`src/lib/ArraySet.ts`** - Hybrid array/set data structure (~150 lines)
- **`src/lib/HistoryBuffer.ts`** - Change tracking storage (~100 lines)

### Support Files

- **`src/lib/constants.ts`** - System constants
- **`src/lib/isSignal.ts`** - Type guards
- **`src/lib/warnings.ts`** - Development warnings
- **`src/index.ts`** - Public API exports

## Development Guidelines

### Signal Creation

- Always provide meaningful names for debugging
- Use `historyLength` only when diffs are needed
- Prefer built-in equality checking unless custom logic required
- Consider memory implications of history buffers

### Computed Signals

- Use `@computed` decorator for class-based computed properties
- Handle `UNINITIALIZED` for incremental computations
- Use `withDiff()` when manually computing diffs
- Prefer lazy evaluation - avoid forcing computation unnecessarily

### Effect Management

- Use `react()` for fire-and-forget effects
- Use `reactor()` when you need start/stop control
- Always clean up effects to prevent memory leaks
- Consider custom `scheduleEffect` for batching DOM updates

### Performance Best Practices

- Use `unsafe__withoutCapture()` sparingly for hot paths
- Implement custom `isEqual` for complex objects
- Batch updates with transactions
- Minimize signal creation in hot paths

### Debugging Workflow

1. Use `whyAmIRunning()` to trace unexpected updates
2. Check signal names for clarity in debug output
3. Verify epoch tracking with ancestor debugging
4. Use browser devtools to inspect signal state

## Testing Patterns

Located in `src/lib/__tests__/`:

- Unit tests for each core component
- Integration tests for complex scenarios
- Performance tests for optimization validation
- Mock implementations for external dependencies

## Common Pitfalls

1. **Infinite Loops:** Avoid updating atoms inside their own reactions
2. **Memory Leaks:** Always clean up reactions and computed signals
3. **Unnecessary Dependencies:** Use `unsafe__withoutCapture()` judiciously
4. **Transaction Misuse:** Don't nest transactions unnecessarily
5. **History Overhead:** Set appropriate `historyLength` based on usage patterns
