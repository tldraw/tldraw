---
title: Incremental bindings index - Raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - incremental
  - bindings
---

# Incremental bindings index - Raw notes

## Source files

- `/packages/editor/src/lib/editor/derivations/bindingsIndex.ts` (108 lines)
- `/packages/store/src/lib/StoreQueries.ts` (677 lines)
- `/packages/state/src/lib/HistoryBuffer.ts` (162 lines)
- `/packages/state/src/lib/Computed.ts` (693 lines)
- `/packages/state/src/lib/types.ts` (229 lines)
- `/packages/store/src/lib/RecordsDiff.ts` (249 lines)
- `/packages/store/src/lib/IncrementalSetConstructor.ts` (188 lines)
- `/packages/state/src/lib/constants.ts` (27 lines)
- `/packages/state/src/lib/transactions.ts` (partial)

## Data structure details

### TLBindingsIndex type
```typescript
// bindingsIndex.ts:6
type TLBindingsIndex = Map<TLShapeId, TLBinding[]>
```

The index maps shape IDs to arrays of bindings. Each binding appears in two entries:
- One for `binding.fromId`
- One for `binding.toId`

### TLBinding structure
```typescript
// From tlschema
interface TLBinding {
  id: TLBindingId
  fromId: TLShapeId
  toId: TLShapeId
  // ... other properties
}
```

## Epoch tracking implementation

### GLOBAL_START_EPOCH constant
```typescript
// constants.ts:26
export const GLOBAL_START_EPOCH = -1
```

This initial epoch value marks derivations as dirty before their first computation. Global epoch starts at 0 (`GLOBAL_START_EPOCH + 1`), so anything initialized with -1 will be considered dirty when compared to any positive epoch.

### Global epoch management
```typescript
// transactions.ts:70-79
const inst = singleton('transactions', () => ({
  // The current epoch (global to all atoms).
  globalEpoch: GLOBAL_START_EPOCH + 1,  // Starts at 0
  // Whether any transaction is reacting.
  globalIsReacting: false,
  currentTransaction: null as Transaction | null,

  cleanupReactors: null as null | Set<EffectScheduler<unknown>>,
  reactionEpoch: GLOBAL_START_EPOCH + 1,
}))
```

### Signal interface epochs
```typescript
// types.ts:98
lastChangedEpoch: number
```

Every signal tracks when its value last changed. Computed signals remember this epoch and compare it against dependencies' epochs to detect staleness.

### Computed signal epoch tracking
```typescript
// Computed.ts:213-214
lastChangedEpoch = GLOBAL_START_EPOCH
lastTraversedEpoch = GLOBAL_START_EPOCH
```

Additional tracking in Computed class:
```typescript
// Computed.ts:221
private lastCheckedEpoch = GLOBAL_START_EPOCH
```

## HistoryBuffer implementation details

### Buffer structure
```typescript
// HistoryBuffer.ts:9
type RangeTuple<Diff> = [fromEpoch: number, toEpoch: number, diff: Diff]

// HistoryBuffer.ts:33
private index = 0

// HistoryBuffer.ts:39
buffer: Array<RangeTuple<Diff> | undefined>

// HistoryBuffer.ts:50
constructor(private readonly capacity: number) {
  this.buffer = new Array(capacity)
}
```

Circular buffer using modulo arithmetic for wrap-around:
```typescript
// HistoryBuffer.ts:84
this.index = (this.index + 1) % this.capacity
```

### pushEntry algorithm
```typescript
// HistoryBuffer.ts:70-85
pushEntry(lastComputedEpoch: number, currentEpoch: number, diff: Diff | RESET_VALUE) {
  if (diff === undefined) {
    return
  }

  if (diff === RESET_VALUE) {
    this.clear()
    return
  }

  // Add the diff to the buffer as a range tuple.
  this.buffer[this.index] = [lastComputedEpoch, currentEpoch, diff]

  // Bump the index, wrapping around if necessary.
  this.index = (this.index + 1) % this.capacity
}
```

### getChangesSince algorithm
```typescript
// HistoryBuffer.ts:124-160
getChangesSince(sinceEpoch: number): RESET_VALUE | Diff[] {
  const { index, capacity, buffer } = this

  // For each item in the buffer...
  for (let i = 0; i < capacity; i++) {
    const offset = (index - 1 + capacity - i) % capacity

    const elem = buffer[offset]

    // If there's no element in the offset position, return the reset value
    if (!elem) {
      return RESET_VALUE
    }

    const [fromEpoch, toEpoch] = elem

    // If the first element is already too early, bail
    if (i === 0 && sinceEpoch >= toEpoch) {
      return []
    }

    // If the element is since the given epoch, return an array with all diffs from this element and all following elements
    if (fromEpoch <= sinceEpoch && sinceEpoch < toEpoch) {
      const len = i + 1
      const result = new Array(len)

      for (let j = 0; j < len; j++) {
        result[j] = buffer[(offset + j) % capacity]![2]
      }

      return result
    }
  }

  // If we haven't returned yet, return the reset value
  return RESET_VALUE
}
```

The algorithm walks backwards from the most recent entry. It searches for a range tuple `[fromEpoch, toEpoch]` where `fromEpoch <= sinceEpoch < toEpoch`, then collects all diffs from that point forward.

### Buffer clear implementation
```typescript
// HistoryBuffer.ts:99-102
clear() {
  this.index = 0
  this.buffer.fill(undefined)
}
```

## RESET_VALUE sentinel

### Definition
```typescript
// types.ts:31
export const RESET_VALUE: unique symbol = Symbol.for('com.tldraw.state/RESET_VALUE')

// types.ts:40
export type RESET_VALUE = typeof RESET_VALUE
```

A unique symbol that cannot be accidentally created or confused with other values.

### When RESET_VALUE is returned

1. **First computation**: `isUninitialized(prevValue)` returns true
2. **History overflow**: Buffer doesn't have entries going back far enough
3. **Empty slot in buffer**: `if (!elem) return RESET_VALUE`
4. **Explicit clear**: When `pushEntry` receives RESET_VALUE, it calls `clear()`

### Computed signal handling
```typescript
// Computed.ts:293
const result = this.derive(this.state, this.lastCheckedEpoch)

// Computed.ts:298-305
if (this.historyBuffer && !isUninitialized) {
  const diff = result instanceof WithDiff ? result.diff : undefined
  this.historyBuffer.pushEntry(
    this.lastChangedEpoch,
    getGlobalEpoch(),
    diff ??
      this.computeDiff?.(this.state, newState, this.lastCheckedEpoch, getGlobalEpoch()) ??
      RESET_VALUE
  )
}
```

If no diff is provided and no `computeDiff` function exists, RESET_VALUE is pushed.

## filterHistory implementation

Located in `StoreQueries.ts:180-267`.

### Method signature
```typescript
// StoreQueries.ts:180-182
public filterHistory<TypeName extends R['typeName']>(
  typeName: TypeName
): Computed<number, RecordsDiff<Extract<R, { typeName: TypeName }>>>
```

Returns a computed signal that tracks the current epoch and provides diffs filtered by type.

### Caching
```typescript
// StoreQueries.ts:112
private historyCache = new Map<string, Computed<number, RecordsDiff<R>>>()

// StoreQueries.ts:185-187
if (this.historyCache.has(typeName)) {
  return this.historyCache.get(typeName) as any
}
```

Cache key is just the type name string.

### History buffer configuration
```typescript
// StoreQueries.ts:261
{ historyLength: 100 }
```

The filterHistory computed signal is configured with a history buffer capacity of 100.

### Diff consolidation algorithm
```typescript
// StoreQueries.ts:199-252
const res = { added: {}, removed: {}, updated: {} } as RecordsDiff<S>
let numAdded = 0
let numRemoved = 0
let numUpdated = 0

for (const changes of diff) {
  for (const added of objectMapValues(changes.added)) {
    if (added.typeName === typeName) {
      if (res.removed[added.id as IdOf<S>]) {
        const original = res.removed[added.id as IdOf<S>]
        delete res.removed[added.id as IdOf<S>]
        numRemoved--
        if (original !== added) {
          res.updated[added.id as IdOf<S>] = [original, added as S]
          numUpdated++
        }
      } else {
        res.added[added.id as IdOf<S>] = added as S
        numAdded++
      }
    }
  }

  for (const [from, to] of objectMapValues(changes.updated)) {
    if (to.typeName === typeName) {
      if (res.added[to.id as IdOf<S>]) {
        res.added[to.id as IdOf<S>] = to as S
      } else if (res.updated[to.id as IdOf<S>]) {
        res.updated[to.id as IdOf<S>] = [res.updated[to.id as IdOf<S>][0], to as S]
      } else {
        res.updated[to.id as IdOf<S>] = [from as S, to as S]
        numUpdated++
      }
    }
  }

  for (const removed of objectMapValues(changes.removed)) {
    if (removed.typeName === typeName) {
      if (res.added[removed.id as IdOf<S>]) {
        // was added during this diff sequence, so just undo the add
        delete res.added[removed.id as IdOf<S>]
        numAdded--
      } else if (res.updated[removed.id as IdOf<S>]) {
        // remove oldest version
        res.removed[removed.id as IdOf<S>] = res.updated[removed.id as IdOf<S>][0]
        delete res.updated[removed.id as IdOf<S>]
        numUpdated--
        numRemoved++
      } else {
        res.removed[removed.id as IdOf<S>] = removed as S
        numRemoved++
      }
    }
  }
}
```

The algorithm consolidates multiple diffs into a single diff, handling cases like:
- Add then remove = no-op
- Add then update = add with final value
- Update then remove = remove with original value
- Multiple updates = single update from first to last

## bindingsIndex implementation

Located in `bindingsIndex.ts:32-107`.

### fromScratch function
```typescript
// bindingsIndex.ts:8-30
function fromScratch(bindingsQuery: Computed<TLBinding[], unknown>) {
  const allBindings = bindingsQuery.get() as TLBinding[]

  const shapesToBindings: TLBindingsIndex = new Map()

  for (const binding of allBindings) {
    const { fromId, toId } = binding
    const bindingsForFromShape = shapesToBindings.get(fromId)
    if (!bindingsForFromShape) {
      shapesToBindings.set(fromId, [binding])
    } else {
      bindingsForFromShape.push(binding)
    }
    const bindingsForToShape = shapesToBindings.get(toId)
    if (!bindingsForToShape) {
      shapesToBindings.set(toId, [binding])
    } else {
      bindingsForToShape.push(binding)
    }
  }

  return shapesToBindings
}
```

O(N) operation iterating over all bindings to build the complete index.

### Initial checks
```typescript
// bindingsIndex.ts:37-40
return computed<TLBindingsIndex>('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
  if (isUninitialized(_lastValue)) {
    return fromScratch(bindingsQuery)
  }
```

First computation always builds from scratch.

### Diff retrieval
```typescript
// bindingsIndex.ts:44-47
const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

if (diff === RESET_VALUE) {
  return fromScratch(bindingsQuery)
}
```

Falls back to from-scratch if history is insufficient.

### Copy-on-write implementation
```typescript
// bindingsIndex.ts:50
let nextValue: TLBindingsIndex | undefined = undefined
```

Deferred allocation using `??=` operator:
```typescript
// bindingsIndex.ts:53, 71
nextValue ??= new Map(lastValue)
```

Only allocates a new Map when actually making changes. If no changes are made, returns the original `lastValue` unchanged (line 105).

### removingBinding function
```typescript
// bindingsIndex.ts:52-68
function removingBinding(binding: TLBinding) {
  nextValue ??= new Map(lastValue)
  const prevFrom = nextValue.get(binding.fromId)
  const nextFrom = prevFrom?.filter((b) => b.id !== binding.id)
  if (!nextFrom?.length) {
    nextValue.delete(binding.fromId)
  } else {
    nextValue.set(binding.fromId, nextFrom)
  }
  const prevTo = nextValue.get(binding.toId)
  const nextTo = prevTo?.filter((b) => b.id !== binding.id)
  if (!nextTo?.length) {
    nextValue.delete(binding.toId)
  } else {
    nextValue.set(binding.toId, nextTo)
  }
}
```

Removes binding from both `fromId` and `toId` arrays. If an array becomes empty, deletes the map entry entirely.

Note: This creates new arrays via `filter()` but doesn't use the `ensureNewArray` pattern. Arrays are always copied when modified.

### ensureNewArray function
```typescript
// bindingsIndex.ts:70-82
function ensureNewArray(shapeId: TLShapeId) {
  nextValue ??= new Map(lastValue)

  let result = nextValue.get(shapeId)
  if (!result) {
    result = []
    nextValue.set(shapeId, result)
  } else if (result === lastValue.get(shapeId)) {
    result = result.slice(0)
    nextValue.set(shapeId, result)
  }
  return result
}
```

Three cases:
1. Shape not in map: create empty array
2. Shape in map but array is shared with lastValue: copy array with `slice(0)`
3. Shape in map and array already copied: return existing array

The check `result === lastValue.get(shapeId)` uses reference equality to detect shared arrays. When `nextValue` is created with `new Map(lastValue)`, both maps initially point to the same array objects.

### addBinding function
```typescript
// bindingsIndex.ts:84-87
function addBinding(binding: TLBinding) {
  ensureNewArray(binding.fromId).push(binding)
  ensureNewArray(binding.toId).push(binding)
}
```

Adds binding to both shape arrays, ensuring arrays are copied before modification.

### Diff application
```typescript
// bindingsIndex.ts:89-102
for (const changes of diff) {
  for (const newBinding of objectMapValues(changes.added)) {
    addBinding(newBinding)
  }

  for (const [prev, next] of objectMapValues(changes.updated)) {
    removingBinding(prev)
    addBinding(next)
  }

  for (const prev of objectMapValues(changes.removed)) {
    removingBinding(prev)
  }
}
```

Updates are handled as remove-then-add because the binding's `fromId` or `toId` might have changed.

### Return value
```typescript
// bindingsIndex.ts:105
return nextValue ?? lastValue
```

If `nextValue` was never allocated (no changes), return original `lastValue` to preserve reference equality.

## RecordsDiff structure

```typescript
// RecordsDiff.ts:29-36
export interface RecordsDiff<R extends UnknownRecord> {
  /** Records that were created, keyed by their ID */
  added: Record<IdOf<R>, R>
  /** Records that were modified, keyed by their ID. Each entry contains [from, to] tuple */
  updated: Record<IdOf<R>, [from: R, to: R]>
  /** Records that were deleted, keyed by their ID */
  removed: Record<IdOf<R>, R>
}
```

All three properties are objects (not Maps) with record IDs as keys. Updated records store `[from, to]` tuples to preserve both old and new values.

## IncrementalSetConstructor

Used by other indexes (like the general-purpose index in StoreQueries) for copy-on-write set operations.

### Structure
```typescript
// IncrementalSetConstructor.ts:31
private nextValue?: Set<T>

// IncrementalSetConstructor.ts:38
private diff?: CollectionDiff<T>

// IncrementalSetConstructor.ts:47
constructor(private readonly previousValue: Set<T>) {}
```

### CollectionDiff type
```typescript
// Store.ts:50-55
export interface CollectionDiff<T> {
  /** Items that were added to the collection */
  added?: Set<T>
  /** Items that were removed from the collection */
  removed?: Set<T>
}
```

### get() method
```typescript
// IncrementalSetConstructor.ts:71-78
public get() {
  const numRemoved = this.diff?.removed?.size ?? 0
  const numAdded = this.diff?.added?.size ?? 0
  if (numRemoved === 0 && numAdded === 0) {
    return undefined
  }
  return { value: this.nextValue!, diff: this.diff! }
}
```

Returns undefined if no changes, otherwise returns both the new set and the diff.

### add() logic
```typescript
// IncrementalSetConstructor.ts:118-131
add(item: T) {
  const wasAlreadyPresent = this.previousValue.has(item)
  if (wasAlreadyPresent) {
    const wasRemoved = this.diff?.removed?.has(item)
    // if it wasn't removed during the lifetime of this set constructor, there's no need to add it again
    if (!wasRemoved) return
    return this._add(item, wasAlreadyPresent)
  }
  const isCurrentlyPresent = this.nextValue?.has(item)
  // if it's already there, no need to add it again
  if (isCurrentlyPresent) return
  // otherwise add it
  this._add(item, wasAlreadyPresent)
}
```

Handles re-adding previously removed items by removing them from the diff.removed set.

### _add() implementation
```typescript
// IncrementalSetConstructor.ts:87-98
private _add(item: T, wasAlreadyPresent: boolean) {
  this.nextValue ??= new Set(this.previousValue)
  this.nextValue.add(item)

  this.diff ??= {}
  if (wasAlreadyPresent) {
    this.diff.removed?.delete(item)
  } else {
    this.diff.added ??= new Set()
    this.diff.added.add(item)
  }
}
```

Lazy allocation of both `nextValue` and `diff`.

### remove() logic
```typescript
// IncrementalSetConstructor.ts:173-186
remove(item: T) {
  const wasAlreadyPresent = this.previousValue.has(item)
  if (!wasAlreadyPresent) {
    const wasAdded = this.diff?.added?.has(item)
    // if it wasn't added during the lifetime of this set constructor, there's no need to remove it
    if (!wasAdded) return
    return this._remove(item, wasAlreadyPresent)
  }
  const hasAlreadyBeenRemoved = this.diff?.removed?.has(item)
  // if it's already removed, no need to remove it again
  if (hasAlreadyBeenRemoved) return
  // otherwise remove it
  this._remove(item, wasAlreadyPresent)
}
```

Handles removing recently-added items by removing them from diff.added.

### _remove() implementation
```typescript
// IncrementalSetConstructor.ts:140-153
private _remove(item: T, wasAlreadyPresent: boolean) {
  this.nextValue ??= new Set(this.previousValue)
  this.nextValue.delete(item)

  this.diff ??= {}
  if (wasAlreadyPresent) {
    // it was in the original set, so we need to add it to the removed diff
    this.diff.removed ??= new Set()
    this.diff.removed.add(item)
  } else {
    // if it was added during the lifetime of this set constructor, we need to remove it from the added diff
    this.diff.added?.delete(item)
  }
}
```

## Performance analysis

### From-scratch cost
Iterating N bindings and building the index:
- N binding iterations
- N * 2 Map.get() calls
- N * 2 Array.push() calls or Map.set() calls
- **Total: O(N)**

### Incremental update cost
For D changed bindings:
- Diff retrieval: O(H) where H is history buffer capacity (typically 100)
- D binding updates
- Each update: 2 array filters + 2 array pushes = O(K) where K is bindings per shape
- **Total: O(H + D*K)**

For typical cases where D << N and K is small (most shapes have few bindings), this is effectively O(1).

### Memory overhead
- Previous index value: N bindings * 2 entries per binding
- History buffer: 100 * RecordsDiff<TLBinding>
- Each RecordsDiff contains added/updated/removed objects with ID keys

### History buffer overflow scenarios
At 100 capacity:
- 100+ binding changes in a single transaction sequence
- 100+ commits between index reads
- Unusual but possible in batch operations or paste operations with many arrows

## Computed signal getDiffSince

```typescript
// Computed.ts:343-354
getDiffSince(epoch: number): RESET_VALUE | Diff[] {
  // we can ignore any errors thrown during derive
  this.__unsafe__getWithoutCapture(true)
  // and we still need to capture this signal as a parent
  maybeCaptureParent(this)

  if (epoch >= this.lastChangedEpoch) {
    return EMPTY_ARRAY
  }

  return this.historyBuffer?.getChangesSince(epoch) ?? RESET_VALUE
}
```

Special case: if `epoch >= this.lastChangedEpoch`, nothing has changed, so return empty array immediately without checking the buffer.

### EMPTY_ARRAY constant
```typescript
// helpers.ts (referenced in Computed.ts:7)
export const EMPTY_ARRAY = []
```

Reused empty array to avoid allocations.

## isUninitialized implementation

```typescript
// Computed.ts:29
export const UNINITIALIZED = Symbol.for('com.tldraw.state/UNINITIALIZED')

// Computed.ts:58-60
export function isUninitialized(value: any): value is UNINITIALIZED {
  return value === UNINITIALIZED
}
```

Initial state of computed signals before first computation:
```typescript
// Computed.ts:237
private state: Value = UNINITIALIZED as unknown as Value
```

## withDiff helper

```typescript
// Computed.ts:81-90
export const WithDiff = singleton(
  'WithDiff',
  () =>
    class WithDiff<Value, Diff> {
      constructor(
        public value: Value,
        public diff: Diff
      ) {}
    }
)

// Computed.ts:131-133
export function withDiff<Value, Diff>(value: Value, diff: Diff): WithDiff<Value, Diff> {
  return new WithDiff(value, diff)
}
```

Used in computed functions to return both a value and its diff:
```typescript
// Example from article
return withDiff(nextValue, nextDiff)
```

Checked in computed:
```typescript
// Computed.ts:294
const result = this.derive(this.state, this.lastCheckedEpoch)
const newState = result instanceof WithDiff ? result.value : result

// Computed.ts:298
const diff = result instanceof WithDiff ? result.diff : undefined
```

## ComputedOptions historyLength

```typescript
// Computed.ts:149-173
export interface ComputedOptions<Value, Diff> {
  /**
   * The maximum number of diffs to keep in the history buffer.
   */
  historyLength?: number
  /**
   * A method used to compute a diff between the computed's old and new values.
   */
  computeDiff?: ComputeDiff<Value, Diff>
  /**
   * If provided, this will be used to compare the old and new values
   */
  isEqual?(a: any, b: any): boolean
}
```

Usage in bindingsIndex:
```typescript
// bindingsIndex.ts:37
return computed<TLBindingsIndex>('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
  // ... computation
})
```

No explicit historyLength option passed, so no history buffer is created for the bindingsIndex itself. It relies on the history buffer in `bindingsHistory` (which has historyLength: 100).

filterHistory usage:
```typescript
// StoreQueries.ts:189, 261
const filtered = computed<number, RecordsDiff<S>>(
  'filterHistory:' + typeName,
  (lastValue, lastComputedEpoch) => { /* ... */ },
  { historyLength: 100 }
)
```

## Edge cases

### Empty binding arrays
When last binding is removed from a shape, the map entry is deleted entirely:
```typescript
// bindingsIndex.ts:56-58
if (!nextFrom?.length) {
  nextValue.delete(binding.fromId)
}
```

### Self-referencing bindings
If `binding.fromId === binding.toId`, the binding appears twice in the same shape's array. The code doesn't special-case this - it just adds the binding twice.

### Binding updates that don't change IDs
If an update changes binding properties but not `fromId` or `toId`, the remove-then-add approach still works but does unnecessary work:
- Removes binding from arrays
- Immediately adds it back to same arrays

This is correct but not optimal. The article mentions "simpler to just remove and re-add" rather than checking whether IDs changed.

### Multiple bindings between same shapes
Multiple arrows from shape A to shape B create multiple binding entries in both shapes' arrays. The array structure naturally handles this.

## Related index implementations

### General-purpose index
`StoreQueries.__uncached_createIndex()` at lines 325-445 uses similar incremental pattern but with `IncrementalSetConstructor` for sets instead of arrays.

History buffer configuration:
```typescript
// StoreQueries.ts:444
{ historyLength: 100 }
```

### IDs query
`StoreQueries.ids()` at lines 554-643 also uses incremental updates with `IncrementalSetConstructor`.

History buffer configuration:
```typescript
// StoreQueries.ts:642
{ historyLength: 50 }
```

Lower history length (50 vs 100) presumably because IDs queries are more common and memory-constrained.

## Constants summary

- `GLOBAL_START_EPOCH = -1` - Initial epoch for uncomputed signals
- `historyLength: 100` - Standard buffer size for most indexes
- `historyLength: 50` - Buffer size for IDs queries
- Default history length if not specified: no buffer created

## Algorithm complexity details

### HistoryBuffer.getChangesSince
- Best case: O(1) if epoch >= toEpoch of most recent entry (returns empty array)
- Average case: O(H) where H is history buffer capacity (max 100 iterations)
- Worst case: O(H) + O(H) for result array construction

### bindingsIndex incremental update
Given D changed bindings, K average bindings per shape:
- getDiffSince: O(H)
- Iterate diff: O(D)
- addBinding: O(1) amortized for array push
- removingBinding: O(K) for filter operation
- Total: **O(H + D*K)**

When D = 1 (single arrow moved) and K is small: effectively O(1).

### fromScratch
Given N total bindings:
- Iterate all bindings: O(N)
- For each: 2 Map.get() + 2 array operations
- Total: **O(N)**

### Reference equality check cost
```typescript
// bindingsIndex.ts:77
result === lastValue.get(shapeId)
```

O(1) reference comparison, not O(K) array comparison. This is why copy-on-write is efficient.

## Store integration

The bindingsIndex is created in the Editor class:
```typescript
// bindingsIndex.ts:32
export const bindingsIndex = (editor: Editor): Computed<TLBindingsIndex> => {
  const { store } = editor
  const bindingsHistory = store.query.filterHistory('binding')
  const bindingsQuery = store.query.records('binding')
  // ...
}
```

`store.query` is a `StoreQueries` instance with methods:
- `filterHistory('binding')` returns `Computed<number, RecordsDiff<TLBinding>>`
- `records('binding')` returns `Computed<TLBinding[]>`

The store maintains a single global history atom:
```typescript
// StoreQueries.ts:98
constructor(
  private readonly recordMap: AtomMap<IdOf<R>, R>,
  private readonly history: Atom<number, RecordsDiff<R>>
) {}
```

This history atom is the source of truth for all changes.
