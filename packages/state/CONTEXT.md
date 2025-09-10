# CONTEXT.md - @tldraw/state

A reactive signals library providing the foundational state management system for the entire tldraw ecosystem.

## Package Overview

- **Purpose**: Provides reactive signals (atoms and computed values) for efficient state management and change tracking
- **Type**: Core Library
- **Status**: Production
- **Dependencies**: Only `@tldraw/utils` (internal)
- **Consumers**: All major tldraw packages (editor, store, tlschema, sync-core, sync, state-react)

## Architecture

### Core Components

- **Atom**: Mutable signals that can be updated directly via `set()` or `update()` methods
- **Computed**: Derived signals that automatically recalculate when their dependencies change
- **EffectScheduler/Reactor**: System for running side effects in response to signal changes
- **Transaction System**: Batching mechanism for atomic state updates
- **ArraySet**: Efficient set implementation for managing signal dependencies

### Key Files

- `src/index.ts` - Main exports and API version management
- `src/lib/Atom.ts` - Mutable signal implementation with history tracking
- `src/lib/Computed.ts` - Derived signal implementation with dependency tracking
- `src/lib/EffectScheduler.ts` - Side effect management and reaction system
- `src/lib/transactions.ts` - Transaction/batching system for atomic updates
- `src/lib/capture.ts` - Dependency tracking during signal computation
- `src/lib/types.ts` - Core type definitions (Signal, Child, ComputeDiff)

## API/Interface

### Public API

```ts
// Creating signals
const count = atom('count', 0)
const double = computed('double', () => count.get() * 2)

// Reading values
console.log(count.get()) // 0
console.log(double.get()) // 0

// Updating atoms
count.set(5)
count.update(n => n + 1)

// Reactions/effects
const dispose = reactor('effect', () => {
  console.log('Count is:', count.get())
})

// Transactions (batching)
transact(() => {
  count.set(10)
  // other updates...
}) // All subscribers notified once at end
```

Main exports:
- `atom(name, initialValue, options?)` - Create mutable signal
- `computed(name, compute, options?)` - Create derived signal  
- `reactor(name, effect)` - Run side effects
- `transact(fn)` - Batch updates atomically
- `isSignal(value)` - Type guard for signals

### Internal API

- `maybeCaptureParent()` - Dependency tracking during computation
- `advanceGlobalEpoch()` - Global change notification system
- `UNINITIALIZED` - Marker for first computed execution
- `HistoryBuffer` - Diff tracking for change history

## Development

### Setup

```bash
cd packages/state
yarn install
```

### Commands

- `yarn test` - Run Jest tests
- `yarn test-ci` - CI test runner
- `yarn build` - Build package
- `yarn lint` - Lint code

### Testing

- Comprehensive test suite in `src/lib/__tests__/`
- Tests cover atoms, computed values, effects, transactions, and edge cases
- Includes fuzz testing for complex scenarios
- Run tests: `yarn test`

## Integration Points

### Depends On

- `@tldraw/utils` - Utility functions (registerTldrawLibraryVersion, assert)

### Used By

- `@tldraw/store` - TLStore uses atoms for shape data storage
- `@tldraw/editor` - Editor state management built on signals
- `@tldraw/tlschema` - Schema validation with reactive signals
- `@tldraw/sync-core` - Sync system uses signals for state tracking
- `@tldraw/sync` - React sync components consume signals
- `@tldraw/state-react` - React hooks for signal integration

## Common Issues & Solutions

### Multiple Version Conflict
- **Issue**: Error about multiple incompatible versions
- **Solution**: The package includes API versioning to detect conflicts - ensure proper dependency deduplication

### Memory Leaks with Effects
- **Issue**: Reactors not being disposed
- **Solution**: Always call the dispose function returned by `reactor()`

### Performance with Large Objects
- **Issue**: Unnecessary re-renders with object atoms
- **Solution**: Use `isEqual` option in atom config for custom equality checking

## Future Considerations

- The signals system is foundational and stable
- Any API changes increment the internal API version to prevent conflicts
- Performance optimizations focus on dependency tracking efficiency
- Consider integration with React 18+ concurrent features