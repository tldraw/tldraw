# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the state package in this repository.

## Package Overview

The `@tldraw/state` package is tldraw's custom reactive signals library, similar to libraries like SolidJS signals or Preact signals. It provides fine-grained reactivity with automatic dependency tracking, batched updates, and sophisticated performance optimizations. This is the foundation of tldraw's state management system.

## Core Architecture

### Reactive Primitives

The library implements three core reactive primitives:

1. **Atoms** (`src/lib/Atom.ts`) - Mutable reactive state containers
2. **Computed** (`src/lib/Computed.ts`) - Derived reactive values that update when dependencies change
3. **EffectScheduler** (`src/lib/EffectScheduler.ts`) - Side effects that run when dependencies change

### Key Architectural Concepts

#### Signal Graph and Dependency Tracking
- **Parent-Child Relationships**: Computed values and effects automatically track which atoms/computeds they depend on
- **Capture System** (`src/lib/capture.ts`): Tracks signal dependencies during computation using a stack-based approach
- **Epoch-based Updates** (`src/lib/transactions.ts`): Global versioning system to efficiently determine what needs recomputation

#### Performance Optimizations
- **Lazy Evaluation**: Computed values only recalculate when accessed and dependencies have changed
- **Smart Scheduling**: Effects can be batched and scheduled via custom schedulers (e.g., requestAnimationFrame)
- **Incremental Updates**: History buffers track diffs for efficient incremental computations
- **Early Bailouts**: Multiple strategies to avoid unnecessary recomputations

## Key Patterns and APIs

### Basic Usage Patterns

```typescript
// Atom - mutable reactive state
const count = atom('count', 0)
count.set(5)
count.update(n => n + 1)

// Computed - derived reactive state  
const doubled = computed('doubled', () => count.get() * 2)

// Effect - side effects
const stopEffect = react('log changes', () => {
  console.log('count is now:', count.get())
})
```

### Advanced Features

#### History and Diffs
Both atoms and computeds support history tracking with custom diff computation:
```typescript
const myAtom = atom('myAtom', initialValue, {
  historyLength: 10,
  computeDiff: (prev, next) => ({ from: prev, to: next })
})
```

#### Incremental Computation
Use `withDiff()` to provide both value and diff for computed values:
```typescript
const incrementalComputed = computed('incremental', (prevValue) => {
  const newValue = computeNewValue()
  if (isUninitialized(prevValue)) {
    return newValue
  }
  const diff = computeIncrementalDiff(prevValue, newValue)
  return withDiff(newValue, diff)
})
```

#### Custom Effect Scheduling
```typescript
react('my effect', () => {
  // effect logic
}, {
  scheduleEffect: (runEffect) => {
    // Custom scheduling, e.g., requestAnimationFrame
    requestAnimationFrame(runEffect)
  }
})
```

## File Structure Guide

### Core Implementation
- **`src/lib/Atom.ts`**: Mutable reactive state with history tracking
- **`src/lib/Computed.ts`**: Derived values with lazy evaluation and caching
- **`src/lib/EffectScheduler.ts`**: Side effect scheduling and lifecycle management

### Reactive System Infrastructure  
- **`src/lib/capture.ts`**: Dependency tracking during signal evaluation
- **`src/lib/transactions.ts`**: Batching, epochs, and change propagation
- **`src/lib/helpers.ts`**: Core utilities for parent-child relationships and equality checking

### Utilities and Types
- **`src/lib/types.ts`**: Core type definitions and interfaces
- **`src/lib/ArraySet.ts`**: Efficient set implementation for managing signal relationships
- **`src/lib/HistoryBuffer.ts`**: Circular buffer for tracking signal value history
- **`src/lib/constants.ts`**: Global constants and configuration

## Key Implementation Details

### Epoch System
The library uses a global epoch counter that increments with each transaction. This allows efficient "have things changed?" checks without walking the entire dependency graph.

### Capture Stack
When a computed value or effect runs, a "capture stack" tracks which signals are accessed. This automatically builds the dependency graph without manual subscription management.

### Transaction System
Changes are batched in transactions. Effects only run once per transaction, even if multiple dependencies changed. Nested transactions are supported with proper rollback semantics.

### Memory Management
- **WeakSet-based cleanup**: Automatic cleanup of unused computed values
- **History buffers**: Configurable circular buffers for diffs
- **Parent-child detachment**: Proper cleanup when effects stop

## Decorator Pattern

The `@computed` decorator supports both legacy and TC39 decorator syntax for class-based reactive computations:

```typescript
class MyStore {
  @computed getName() {
    return this.firstName.get() + ' ' + this.lastName.get()  
  }
}
```

## Testing and Debugging

### Testing Utilities
- Tests in `src/lib/__tests__/` cover all core scenarios
- `fuzz.tlstate.test.ts` provides property-based testing
- Each core concept has dedicated test files

### Debugging Features
- **Signal naming**: All signals have debug names for easier debugging
- **whyAmIRunning()**: Utility to debug why effects are running
- **Capture introspection**: Debug tools to inspect the capture stack

## Common Development Patterns

### Creating Custom Reactive Stores
```typescript
class TodoStore {
  todos = atom('todos', [] as Todo[])
  
  @computed getCompletedCount() {
    return this.todos.get().filter(t => t.completed).length
  }
  
  addTodo(text: string) {
    this.todos.update(todos => [...todos, { id: uuid(), text, completed: false }])
  }
}
```

### Performance Considerations
- Use history buffers only when you need diffs
- Batch related changes in transactions using `transact()`
- Consider custom equality functions for complex objects
- Use `unsafe__withoutCapture()` to read signals without creating dependencies

## Integration Points

This package is used by:
- **`@tldraw/state-react`**: React bindings for this reactive system
- **`@tldraw/editor`**: Editor state management
- **`@tldraw/store`**: Document store reactivity

The singleton pattern ensures only one instance of the reactive system exists across the entire application, preventing version conflicts.

## Warning and Error System

The library includes comprehensive warnings (`src/lib/warnings.ts`) for common mistakes:
- Using getters instead of methods with `@computed`  
- Signal access patterns that might cause issues
- Development-time guidance for proper usage