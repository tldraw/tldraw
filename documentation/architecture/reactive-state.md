---
title: Reactive state
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - state
  - signals
  - reactive
  - atom
  - computed
---

## Overview

tldraw uses a signals-based reactive state system from `@tldraw/state`. A signal is a reactive value; atoms are mutable signals, and computed values are derived signals. The system powers editor state, store updates, and UI reactivity by tracking dependencies automatically and recomputing only what changes.

## Key components

### Atoms and computed values

Atoms hold mutable state. Computed values derive from atoms (or other computed values) and update lazily when read:

```typescript
import { atom, computed } from '@tldraw/state'

const firstName = atom('firstName', 'Alice')
const lastName = atom('lastName', 'Smith')

const fullName = computed('fullName', () => {
	return `${firstName.get()} ${lastName.get()}`
})
```

Names are used for debugging, and atoms can define custom equality when reference equality is not enough.

### Effects

Effects run side effects when their dependencies change. They are typically scheduled and cleaned up by the caller:

```typescript
import { react } from '@tldraw/state'

const count = atom('count', 0)
const stop = react('logger', () => {
	console.log('Count is:', count.get())
})

stop()
```

### Transactions and epochs

Transactions batch updates into a single recomputation pass, and epochs provide a fast change-detection mechanism:

```typescript
import { transact } from '@tldraw/state'

transact(() => {
	firstName.set('Bob')
	lastName.set('Jones')
})
```

## Data flow

When a computed value calls `.get()` on a signal, that signal becomes a dependency. Writes (`.set()` or `.update()`) invalidate dependents and bump the global epoch. Computed values recompute only when they are read, and effects run after the transaction completes.

## React integration

`@tldraw/state-react` bridges signals to React with `useValue`, `track`, and `useReactor`. Components re-render when the signals they read change, without manual subscriptions.

## Debugging and performance

- Name signals so traces are readable.
- Use `whyAmIRunning` when a computed recomputes unexpectedly.
- Prefer custom equality for object atoms to avoid unnecessary updates.
- Enable history diffs when you need change auditing.

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
