# @tldraw/state Architecture

This document provides a machine-readable guide to the @tldraw/state package structure, optimized for AI agents and automated tools.

## Package Overview

**Package Name**: @tldraw/state  
**Purpose**: Reactive state management library using signals  
**Entry Point**: `src/index.ts`  
**Main Export**: Complete reactive signals API  
**Dependencies**: @tldraw/utils

## Directory Structure

```
packages/state/
├── src/
│   ├── index.ts                    # Main entry point, all exports
│   └── lib/                        # Core implementation modules
│       ├── Atom.ts                 # Mutable reactive state containers
│       ├── Computed.ts             # Derived reactive values
│       ├── EffectScheduler.ts      # Side effects and reactions
│       ├── ArraySet.ts             # Optimized set data structure
│       ├── HistoryBuffer.ts        # Change tracking and history
│       ├── capture.ts              # Dependency tracking system
│       ├── transactions.ts         # Batched updates and rollbacks
│       ├── types.ts                # Core type definitions
│       ├── constants.ts            # System constants
│       ├── helpers.ts              # Utility functions
│       ├── isSignal.ts            # Type guards
│       ├── warnings.ts            # Development warnings
│       └── __tests__/             # Test files
├── DOCS.md                        # Human-readable documentation
├── README.md                      # Package introduction
└── ARCHITECTURE.md               # This file
```

## Core Modules

### Primary API Modules

#### `Atom.ts`

- **Exports**: `atom()`, `isAtom()`, `Atom` interface, `AtomOptions`
- **Purpose**: Mutable reactive state containers
- **Key Classes**: `_Atom`
- **Dependencies**: ArraySet, HistoryBuffer, capture, helpers, transactions, types

#### `Computed.ts`

- **Exports**: `computed()`, `@computed`, `getComputedInstance()`, `isUninitialized()`, `UNINITIALIZED`, `withDiff()`
- **Purpose**: Derived reactive values with lazy evaluation
- **Key Classes**: `_Computed`
- **Dependencies**: ArraySet, HistoryBuffer, capture, helpers, transactions, types

#### `EffectScheduler.ts`

- **Exports**: `EffectScheduler`, `react()`, `reactor()`, `EffectSchedulerOptions`, `Reactor`
- **Purpose**: Side effects and reaction management
- **Key Classes**: `__EffectScheduler__`, `_Reactor`
- **Dependencies**: ArraySet, capture, helpers, transactions, types

### Supporting Infrastructure

#### `types.ts`

- **Core Types**: `Signal<Value, Diff>`, `Child`, `ComputeDiff`, `RESET_VALUE`
- **Purpose**: Foundational type definitions for the entire system
- **Role**: Defines interfaces implemented by Atom and Computed

#### `capture.ts`

- **Exports**: `unsafe__withoutCapture()`, `whyAmIRunning()`
- **Purpose**: Dependency tracking and debugging
- **Key Classes**: `CaptureStackFrame`
- **Role**: Manages parent-child relationships between signals

#### `transactions.ts`

- **Exports**: `transact()`, `transaction()`, `deferAsyncEffects()`
- **Purpose**: Batched updates with rollback capability
- **Key Classes**: `Transaction`
- **Role**: Ensures atomic state updates

#### `helpers.ts`

- **Exports**: `EMPTY_ARRAY`, utility functions
- **Purpose**: Common utilities and performance optimizations
- **Key Functions**: `equals()`, `singleton()`, `attach()`, `detach()`, `haveParentsChanged()`

#### `ArraySet.ts`

- **Exports**: `ArraySet`
- **Purpose**: Performance-optimized set implementation
- **Role**: Manages parent-child relationships efficiently

#### `HistoryBuffer.ts`

- **Purpose**: Change tracking for time-travel debugging
- **Role**: Stores diffs for getDiffSince functionality

## Export Mapping

```typescript
// Core reactive primitives
atom(name, value, options?) -> Atom<T>
computed(name, fn, options?) -> Computed<T>
react(name, fn, options?) -> () => void
reactor(name, fn) -> Reactor<T>

// Transaction management
transact(fn) -> void
transaction(fn) -> void
deferAsyncEffects(fn) -> void

// Debugging and utilities
unsafe__withoutCapture(fn) -> T
whyAmIRunning() -> void
isSignal(value) -> boolean
isAtom(value) -> boolean
isUninitialized(value) -> boolean

// Advanced features
@computed -> PropertyDecorator
getComputedInstance(obj, prop) -> Computed
withDiff(value, diff) -> WithDiff
UNINITIALIZED -> symbol
RESET_VALUE -> symbol
EMPTY_ARRAY -> readonly array
```

## Dependency Graph

```
index.ts
├── Atom.ts
│   ├── ArraySet.ts
│   ├── HistoryBuffer.ts
│   ├── capture.ts
│   ├── helpers.ts
│   ├── transactions.ts
│   └── types.ts
├── Computed.ts
│   ├── ArraySet.ts
│   ├── HistoryBuffer.ts
│   ├── capture.ts
│   ├── constants.ts
│   ├── helpers.ts
│   ├── transactions.ts
│   ├── types.ts
│   └── warnings.ts
├── EffectScheduler.ts
│   ├── ArraySet.ts
│   ├── capture.ts
│   ├── constants.ts
│   ├── helpers.ts
│   ├── transactions.ts
│   └── types.ts
├── capture.ts
│   ├── Computed.ts
│   ├── helpers.ts
│   └── types.ts
└── transactions.ts
    ├── Atom.ts
    ├── EffectScheduler.ts
    ├── constants.ts
    ├── helpers.ts
    └── types.ts
```

## Key Architectural Patterns

### Signal Interface Pattern

- All reactive values implement `Signal<Value, Diff>` interface
- Unified API: `get()`, `getDiffSince()`, `__unsafe__getWithoutCapture()`
- Polymorphic handling of atoms and computed values

### Dependency Tracking Pattern

- `capture.ts` manages parent-child relationships
- `Child` interface for dependents, `ArraySet<Child>` for parents
- Automatic dependency detection via `maybeCaptureParent()`

### Lazy Evaluation Pattern

- Computed values only recalculate when dependencies change
- `lastChangedEpoch` tracking for invalidation
- `haveParentsChanged()` for efficient dirty checking

### Transaction Pattern

- Nested transaction support with rollback
- `initialAtomValues` map for restoration
- Deferred effect scheduling until commit

### History Tracking Pattern

- Optional `HistoryBuffer` for change tracking
- `computeDiff` functions for incremental updates
- `RESET_VALUE` for uncomputable diffs

## Performance Optimizations

### Memory Management

- `ArraySet` for efficient parent-child tracking
- `EMPTY_ARRAY` singleton for empty dependencies
- Lazy history buffer allocation

### Computation Efficiency

- Epoch-based invalidation system
- `unsafe__withoutCapture` for hot paths
- Singleton pattern for global state

### Effect Scheduling

- Pluggable `scheduleEffect` for batching
- `deferAsyncEffects` for transaction control
- `isActivelyListening` state management

## API Categories by Use Case

### Basic State Management

- `atom()` - mutable state
- `computed()` - derived state
- `react()` - side effects

### Advanced Control

- `reactor()` - controllable reactions
- `transact()` - batched updates
- `@computed` - class-based computed properties

### Performance & Debugging

- `unsafe__withoutCapture()` - performance optimization
- `whyAmIRunning()` - dependency debugging
- History tracking options for undo/redo

### Type Guards & Utilities

- `isSignal()`, `isAtom()`, `isUninitialized()`
- `UNINITIALIZED`, `RESET_VALUE` constants
- `withDiff()` for incremental computation

## Integration Points

### External Dependencies

- `@tldraw/utils`: `registerTldrawLibraryVersion()`, `assert()`

### Related Packages

- `@tldraw/state-react`: React integration layer
- `@tldraw/store`: Record storage using @tldraw/state
- `@tldraw/editor`: Canvas editor using reactive state

### Extension Points

- `AtomOptions.isEqual` - custom equality functions
- `ComputeDiff` - custom diff computation
- `EffectSchedulerOptions.scheduleEffect` - custom scheduling

## File Navigation Guide for AI Agents

**To understand signals**: Start with `types.ts` → `Atom.ts` → `Computed.ts`  
**To understand reactivity**: Start with `EffectScheduler.ts` → `capture.ts`  
**To understand transactions**: Start with `transactions.ts`  
**To understand the API**: Start with `index.ts` exports  
**To understand performance**: Focus on `helpers.ts` → `ArraySet.ts`  
**To understand change tracking**: Focus on `HistoryBuffer.ts`

**Key entry points for specific functionality**:

- State creation: `Atom.ts:atom()`
- Derived values: `Computed.ts:computed()`
- Side effects: `EffectScheduler.ts:react()`
- Batching: `transactions.ts:transact()`
- Debugging: `capture.ts:whyAmIRunning()`
