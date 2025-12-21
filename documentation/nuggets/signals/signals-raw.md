---
title: Raw notes - Fine-grained reactivity with signals
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - signals
---

# Raw notes: Fine-grained reactivity with signals

## Source files

- `/packages/state/src/lib/Atom.ts` - Mutable state containers (~292 lines)
- `/packages/state/src/lib/Computed.ts` - Derived values with lazy evaluation (~693 lines)
- `/packages/state/src/lib/EffectScheduler.ts` - Side effect management (~365 lines)
- `/packages/state/src/lib/capture.ts` - Dependency tracking mechanism (~277 lines)
- `/packages/state/src/lib/transactions.ts` - Atomic updates and rollback (~439 lines)
- `/packages/state/src/lib/helpers.ts` - Utilities and optimizations (~236 lines)
- `/packages/state/src/lib/ArraySet.ts` - Hybrid array/set data structure (~282 lines)
- `/packages/state/src/lib/HistoryBuffer.ts` - Change tracking storage (~162 lines)
- `/packages/state/src/lib/types.ts` - Foundational interfaces and types (~229 lines)
- `/packages/state/src/lib/constants.ts` - System constants (~27 lines)
- `/packages/state-react/src/lib/useValue.ts` - React integration with useSyncExternalStore (~109 lines)
- `/packages/state-react/src/lib/useQuickReactor.ts` - Direct DOM updates bypassing React (~55 lines)
- `/packages/store/src/lib/Store.ts` - Reactive record database built on signals

## Historical context

From `/packages/state/CONTEXT.md`:
- Originally developed as standalone project called "signia"
- Incorporated back into tldraw monorepo as `@tldraw/state`
- Designed specifically for tldraw's performance requirements
- Similar to MobX or SolidJS reactivity but optimized for tldraw's scale

## Core architecture

### Signal interface definition

From `/packages/state/src/lib/types.ts` (lines 72-127):

```typescript
export interface Signal<Value, Diff = unknown> {
	name: string
	get(): Value
	lastChangedEpoch: number
	getDiffSince(epoch: number): RESET_VALUE | Diff[]
	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value
	children: ArraySet<Child>
}
```

### Child interface definition

From `/packages/state/src/lib/types.ts` (lines 139-180):

```typescript
export interface Child {
	lastTraversedEpoch: number
	readonly parentSet: ArraySet<Signal<any, any>>
	readonly parents: Signal<any, any>[]
	readonly parentEpochs: number[]
	readonly name: string
	isActivelyListening: boolean
	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null
}
```

## Epoch-based invalidation system

### Constants

From `/packages/state/src/lib/constants.ts` (lines 1-27):

```typescript
export const GLOBAL_START_EPOCH = -1
```

- Initial epoch value is -1
- Global epoch starts at 0 (GLOBAL_START_EPOCH + 1)
- All derived signals initialized with GLOBAL_START_EPOCH (-1) are considered dirty
- Forces initial computation/execution without special initialization logic

### Global epoch management

From `/packages/state/src/lib/transactions.ts` (lines 70-79):

```typescript
const inst = singleton('transactions', () => ({
	// The current epoch (global to all atoms).
	globalEpoch: GLOBAL_START_EPOCH + 1,
	// Whether any transaction is reacting.
	globalIsReacting: false,
	currentTransaction: null as Transaction | null,
	cleanupReactors: null as null | Set<EffectScheduler<unknown>>,
	reactionEpoch: GLOBAL_START_EPOCH + 1,
}))
```

### Epoch advancement

From `/packages/state/src/lib/transactions.ts` (lines 214-216):

```typescript
export function advanceGlobalEpoch() {
	inst.globalEpoch++
}
```

Called every time an atom's value changes.

### Epoch comparison for staleness checking

From `/packages/state/src/lib/helpers.ts` (lines 33-45):

```typescript
export function haveParentsChanged(child: Child): boolean {
	for (let i = 0, n = child.parents.length; i < n; i++) {
		// Get the parent's value without capturing it.
		child.parents[i].__unsafe__getWithoutCapture(true)

		// If the parent's epoch does not match the child's view of the parent's epoch, then the parent has changed.
		if (child.parents[i].lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}

	return false
}
```

This is the core of epoch-based dirty checking - simple numeric comparison instead of traversing dirty flags.

## Atom implementation

### Core class structure

From `/packages/state/src/lib/Atom.ts` (lines 73-119):

```typescript
class __Atom__<Value, Diff = unknown> implements Atom<Value, Diff> {
	constructor(
		public readonly name: string,
		private current: Value,
		options?: AtomOptions<Value, Diff>
	) {
		this.isEqual = options?.isEqual ?? null

		if (!options) return

		if (options.historyLength) {
			this.historyBuffer = new HistoryBuffer(options.historyLength)
		}

		this.computeDiff = options.computeDiff
	}

	readonly isEqual: null | ((a: any, b: any) => boolean)
	computeDiff?: ComputeDiff<Value, Diff>
	lastChangedEpoch = getGlobalEpoch()
	children = new ArraySet<Child>()
	historyBuffer?: HistoryBuffer<Diff>
```

### Atom.set() implementation

From `/packages/state/src/lib/Atom.ts` (lines 160-190):

```typescript
set(value: Value, diff?: Diff): Value {
	// If the value has not changed, do nothing.
	if (this.isEqual?.(this.current, value) ?? equals(this.current, value)) {
		return this.current
	}

	// Tick forward the global epoch
	advanceGlobalEpoch()

	// Add the diff to the history buffer.
	if (this.historyBuffer) {
		this.historyBuffer.pushEntry(
			this.lastChangedEpoch,
			getGlobalEpoch(),
			diff ??
				this.computeDiff?.(this.current, value, this.lastChangedEpoch, getGlobalEpoch()) ??
				RESET_VALUE
		)
	}

	// Update the atom's record of the epoch when last changed.
	this.lastChangedEpoch = getGlobalEpoch()

	const oldValue = this.current
	this.current = value

	// Notify all children that this atom has changed.
	atomDidChange(this as any, oldValue)

	return value
}
```

Key points:
1. Early exit if value unchanged (using custom or default equality)
2. Advance global epoch
3. Add diff to history buffer if configured
4. Update lastChangedEpoch to current global epoch
5. Notify children via atomDidChange

### Atom.get() implementation

From `/packages/state/src/lib/Atom.ts` (lines 143-146):

```typescript
get() {
	maybeCaptureParent(this)
	return this.current
}
```

Simple: capture parent relationship, then return value.

## Computed implementation

### Core class structure

From `/packages/state/src/lib/Computed.ts` (lines 212-264):

```typescript
class __UNSAFE__Computed<Value, Diff = unknown> implements Computed<Value, Diff> {
	lastChangedEpoch = GLOBAL_START_EPOCH
	lastTraversedEpoch = GLOBAL_START_EPOCH

	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null = null

	/**
	 * The epoch when the reactor was last checked.
	 */
	private lastCheckedEpoch = GLOBAL_START_EPOCH

	parentSet = new ArraySet<Signal<any, any>>()
	parents: Signal<any, any>[] = []
	parentEpochs: number[] = []

	children = new ArraySet<Child>()

	// eslint-disable-next-line no-restricted-syntax
	get isActivelyListening(): boolean {
		return !this.children.isEmpty
	}

	historyBuffer?: HistoryBuffer<Diff>

	// The last-computed value of this signal.
	private state: Value = UNINITIALIZED as unknown as Value
	// If the signal throws an error we stash it so we can rethrow it on the next get()
	private error: null | { thrownValue: any } = null

	private computeDiff?: ComputeDiff<Value, Diff>

	private readonly isEqual: (a: any, b: any) => boolean

	constructor(
		public readonly name: string,
		private readonly derive: (
			previousValue: Value | UNINITIALIZED,
			lastComputedEpoch: number
		) => Value | WithDiff<Value, Diff>,
		options?: ComputedOptions<Value, Diff>
	) {
		this.historyBuffer = options?.historyLength ? new HistoryBuffer(options.historyLength) : undefined
		this.computeDiff = options?.computeDiff
		this.isEqual = options?.isEqual ?? equals
	}
```

### Computed.__unsafe__getWithoutCapture() - the core computation logic

From `/packages/state/src/lib/Computed.ts` (lines 266-332):

```typescript
__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value {
	const isNew = this.lastChangedEpoch === GLOBAL_START_EPOCH

	const globalEpoch = getGlobalEpoch()

	if (
		!isNew &&
		(this.lastCheckedEpoch === globalEpoch ||
			(this.isActivelyListening &&
				getIsReacting() &&
				this.lastTraversedEpoch < getReactionEpoch()) ||
			!haveParentsChanged(this))
	) {
		this.lastCheckedEpoch = globalEpoch
		if (this.error) {
			if (!ignoreErrors) {
				throw this.error.thrownValue
			} else {
				return this.state // will be UNINITIALIZED
			}
		} else {
			return this.state
		}
	}

	try {
		startCapturingParents(this)
		const result = this.derive(this.state, this.lastCheckedEpoch)
		const newState = result instanceof WithDiff ? result.value : result
		const isUninitialized = this.state === UNINITIALIZED
		if (isUninitialized || !this.isEqual(newState, this.state)) {
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
			this.lastChangedEpoch = getGlobalEpoch()
			this.state = newState
		}
		this.error = null
		this.lastCheckedEpoch = getGlobalEpoch()

		return this.state
	} catch (e) {
		// if a derived value throws an error, we reset the state to UNINITIALIZED
		if (this.state !== UNINITIALIZED) {
			this.state = UNINITIALIZED as unknown as Value
			this.lastChangedEpoch = getGlobalEpoch()
		}
		this.lastCheckedEpoch = getGlobalEpoch()
		// we also clear the history buffer if an error was thrown
		if (this.historyBuffer) {
			this.historyBuffer.clear()
		}
		this.error = { thrownValue: e }
		// we don't wish to propagate errors when derefed via haveParentsChanged()
		if (!ignoreErrors) throw e
		return this.state
	} finally {
		stopCapturingParents()
	}
}
```

Key points:
1. Early exit conditions (cache hit):
   - Already checked this epoch
   - Actively listening during reaction and hasn't been traversed yet
   - Parents haven't changed
2. If need to recompute:
   - Start capturing parents
   - Call derive function with previous value
   - Check if result changed using custom equality
   - Update lastChangedEpoch only if value changed
   - Handle errors by resetting to UNINITIALIZED
   - Always stop capturing parents in finally block

### Computed.get() wrapper

From `/packages/state/src/lib/Computed.ts` (lines 334-341):

```typescript
get(): Value {
	try {
		return this.__unsafe__getWithoutCapture()
	} finally {
		// if the deriver throws an error we still need to capture
		maybeCaptureParent(this)
	}
}
```

## Always-on caching implementation

From computed implementation above - note that computed values are NOT discarded when `children.isEmpty` is true. The cache is maintained:

```typescript
// eslint-disable-next-line no-restricted-syntax
get isActivelyListening(): boolean {
	return !this.children.isEmpty
}
```

This property is checked but the cached `state` value is never cleared based on it. The computed value stays cached regardless of whether anyone is listening.

## Dependency capture mechanism

### Capture stack frame

From `/packages/state/src/lib/capture.ts` (lines 5-14):

```typescript
class CaptureStackFrame {
	offset = 0

	maybeRemoved?: Signal<any>[]

	constructor(
		public readonly below: CaptureStackFrame | null,
		public readonly child: Child
	) {}
}
```

### Global capture state

From `/packages/state/src/lib/capture.ts` (line 16):

```typescript
const inst = singleton('capture', () => ({ stack: null as null | CaptureStackFrame }))
```

### Starting parent capture

From `/packages/state/src/lib/capture.ts` (lines 70-81):

```typescript
export function startCapturingParents(child: Child) {
	inst.stack = new CaptureStackFrame(inst.stack, child)
	if (child.__debug_ancestor_epochs__) {
		const previousAncestorEpochs = child.__debug_ancestor_epochs__
		child.__debug_ancestor_epochs__ = null
		for (const p of child.parents) {
			p.__unsafe__getWithoutCapture(true)
		}
		logChangedAncestors(child, previousAncestorEpochs)
	}
	child.parentSet.clear()
}
```

Pushes new frame onto stack and clears parent set to start fresh dependency tracking.

### Capturing a parent during get()

From `/packages/state/src/lib/capture.ts` (lines 150-182):

```typescript
export function maybeCaptureParent(p: Signal<any, any>) {
	if (inst.stack) {
		const wasCapturedAlready = inst.stack.child.parentSet.has(p)
		// if the child didn't deref this parent last time it executed, then idx will be -1
		// if the child did deref this parent last time but in a different order relative to other parents, then idx will be greater than stack.offset
		// if the child did deref this parent last time in the same order, then idx will be the same as stack.offset
		// if the child did deref this parent already during this capture session then 0 <= idx < stack.offset

		if (wasCapturedAlready) {
			return
		}

		inst.stack.child.parentSet.add(p)
		if (inst.stack.child.isActivelyListening) {
			attach(p, inst.stack.child)
		}

		if (inst.stack.offset < inst.stack.child.parents.length) {
			const maybeRemovedParent = inst.stack.child.parents[inst.stack.offset]
			if (maybeRemovedParent !== p) {
				if (!inst.stack.maybeRemoved) {
					inst.stack.maybeRemoved = [maybeRemovedParent]
				} else {
					inst.stack.maybeRemoved.push(maybeRemovedParent)
				}
			}
		}

		inst.stack.child.parents[inst.stack.offset] = p
		inst.stack.child.parentEpochs[inst.stack.offset] = p.lastChangedEpoch
		inst.stack.offset++
	}
}
```

Key optimization: deduplication via parentSet check - if already captured in this session, skip.

### Stopping parent capture

From `/packages/state/src/lib/capture.ts` (lines 100-128):

```typescript
export function stopCapturingParents() {
	const frame = inst.stack!
	inst.stack = frame.below

	if (frame.offset < frame.child.parents.length) {
		for (let i = frame.offset; i < frame.child.parents.length; i++) {
			const maybeRemovedParent = frame.child.parents[i]
			if (!frame.child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, frame.child)
			}
		}

		frame.child.parents.length = frame.offset
		frame.child.parentEpochs.length = frame.offset
	}

	if (frame.maybeRemoved) {
		for (let i = 0; i < frame.maybeRemoved.length; i++) {
			const maybeRemovedParent = frame.maybeRemoved[i]
			if (!frame.child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, frame.child)
			}
		}
	}

	if (frame.child.__debug_ancestor_epochs__) {
		captureAncestorEpochs(frame.child, frame.child.__debug_ancestor_epochs__)
	}
}
```

Cleans up parents that are no longer dependencies and detaches from them.

## ArraySet optimization

From `/packages/state/src/lib/ArraySet.ts`:

### Constants

```typescript
export const ARRAY_SIZE_THRESHOLD = 8
```

### Core implementation

Lines 19-24:
```typescript
export class ArraySet<T> {
	private arraySize = 0
	private array: (T | undefined)[] | null = Array(ARRAY_SIZE_THRESHOLD)
	private set: Set<T> | null = null
```

### Add operation with threshold switch

Lines 57-82:
```typescript
add(elem: T) {
	if (this.array) {
		const idx = this.array.indexOf(elem)

		// Return false if the element is already in the array.
		if (idx !== -1) {
			return false
		}

		if (this.arraySize < ARRAY_SIZE_THRESHOLD) {
			// If the array is below the size threshold, push items into the array.

			// Insert the element into the array's next available slot.
			this.array[this.arraySize] = elem
			this.arraySize++

			return true
		} else {
			// If the array is full, convert it to a set and remove the array.
			this.set = new Set(this.array as any)
			this.array = null
			this.set.add(elem)

			return true
		}
	}
	// ... set case
}
```

Rationale: For ≤8 items, array is faster than Set. For >8 items, Set operations become faster.

## HistoryBuffer implementation

### Core structure

From `/packages/state/src/lib/HistoryBuffer.ts` (lines 28-52):

```typescript
export class HistoryBuffer<Diff> {
	/**
	 * Current write position in the circular buffer.
	 */
	private index = 0

	/**
	 * Circular buffer storing range tuples. Uses undefined to represent empty slots.
	 */
	buffer: Array<RangeTuple<Diff> | undefined>

	/**
	 * Creates a new HistoryBuffer with the specified capacity.
	 */
	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity)
	}
```

### Push operation

Lines 70-85:
```typescript
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

Circular buffer wraps around when full, automatically overwriting oldest entries.

### Get changes since epoch

Lines 124-160 - implements backward search through circular buffer to find all diffs since given epoch. Returns RESET_VALUE if insufficient history.

## Transaction implementation

### Transaction class

From `/packages/state/src/lib/transactions.ts` (lines 7-68):

```typescript
class Transaction {
	asyncProcessCount = 0
	constructor(
		public readonly parent: Transaction | null,
		public readonly isSync: boolean
	) {}

	initialAtomValues = new Map<_Atom, any>()

	get isRoot() {
		return this.parent === null
	}

	commit() {
		if (inst.globalIsReacting) {
			// if we're committing during a reaction we actually need to
			// use the 'cleanup' reactors set to ensure we re-run effects if necessary
			for (const atom of this.initialAtomValues.keys()) {
				traverseAtomForCleanup(atom)
			}
		} else if (this.isRoot) {
			// For root transactions, flush changed atoms
			flushChanges(this.initialAtomValues.keys())
		} else {
			// For transactions with parents, add the transaction's initial values to the parent's.
			this.initialAtomValues.forEach((value, atom) => {
				if (!this.parent!.initialAtomValues.has(atom)) {
					this.parent!.initialAtomValues.set(atom, value)
				}
			})
		}
	}

	abort() {
		inst.globalEpoch++

		// Reset each of the transaction's atoms to its initial value.
		this.initialAtomValues.forEach((value, atom) => {
			atom.set(value)
			atom.historyBuffer?.clear()
		})

		// Commit the changes.
		this.commit()
	}
}
```

Key points:
- Stores initial values for rollback
- Nested transactions merge initial values to parent
- Abort increments epoch, resets atoms, then commits

### atomDidChange handler

From `/packages/state/src/lib/transactions.ts` (lines 183-201):

```typescript
export function atomDidChange(atom: _Atom, previousValue: any) {
	if (inst.currentTransaction) {
		// If we are in a transaction, then all we have to do is preserve
		// the value of the atom at the start of the transaction in case
		// we need to roll back.
		if (!inst.currentTransaction.initialAtomValues.has(atom)) {
			inst.currentTransaction.initialAtomValues.set(atom, previousValue)
		}
	} else if (inst.globalIsReacting) {
		// If the atom changed during the reaction phase of flushChanges
		// (and there are no transactions started inside the reaction phase)
		// then we are past the point where a transaction can be aborted
		// so we don't need to note down the previousValue.
		traverseAtomForCleanup(atom)
	} else {
		// If there is no transaction, flush the changes immediately.
		flushChanges([atom])
	}
}
```

Three modes:
1. During transaction: save initial value
2. During reaction: schedule cleanup
3. Otherwise: flush immediately

### flushChanges implementation

From `/packages/state/src/lib/transactions.ts` (lines 133-173):

```typescript
function flushChanges(atoms: Iterable<_Atom>) {
	if (inst.globalIsReacting) {
		throw new Error('flushChanges cannot be called during a reaction')
	}

	const outerTxn = inst.currentTransaction
	try {
		// clear the transaction stack
		inst.currentTransaction = null
		inst.globalIsReacting = true
		inst.reactionEpoch = inst.globalEpoch

		// Collect all of the visited reactors.
		const reactors = new Set<EffectScheduler<unknown>>()

		for (const atom of atoms) {
			atom.children.visit((child) => traverse(reactors, child))
		}

		// Run each reactor.
		for (const r of reactors) {
			r.maybeScheduleEffect()
		}

		let updateDepth = 0
		while (inst.cleanupReactors?.size) {
			if (updateDepth++ > 1000) {
				throw new Error('Reaction update depth limit exceeded')
			}
			const reactors = inst.cleanupReactors
			inst.cleanupReactors = null
			for (const r of reactors) {
				r.maybeScheduleEffect()
			}
		}
	} finally {
		inst.cleanupReactors = null
		inst.globalIsReacting = false
		inst.currentTransaction = outerTxn
	}
}
```

Key points:
- Traverses dependency graph to find all affected reactors
- Schedules effects for execution
- Handles cleanup reactors (from changes during reactions)
- Safety check: max 1000 update depth to prevent infinite loops

### transact() implementation

From `/packages/state/src/lib/transactions.ts` (lines 354-359):

```typescript
export function transact<T>(fn: () => T): T {
	if (inst.currentTransaction) {
		return fn()
	}
	return transaction(fn)
}
```

Optimization: if already in transaction, just run fn without creating nested transaction.

## Effect scheduler implementation

### Core structure

From `/packages/state/src/lib/EffectScheduler.ts` (lines 43-88):

```typescript
class __EffectScheduler__<Result> implements EffectScheduler<Result> {
	private _isActivelyListening = false
	get isActivelyListening() {
		return this._isActivelyListening
	}
	lastTraversedEpoch = GLOBAL_START_EPOCH

	private lastReactedEpoch = GLOBAL_START_EPOCH

	private _scheduleCount = 0
	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null = null

	get scheduleCount() {
		return this._scheduleCount
	}

	readonly parentSet = new ArraySet<Signal<any, any>>()
	readonly parentEpochs: number[] = []
	readonly parents: Signal<any, any>[] = []
	private readonly _scheduleEffect?: (execute: () => void) => void
	constructor(
		public readonly name: string,
		private readonly runEffect: (lastReactedEpoch: number) => Result,
		options?: EffectSchedulerOptions
	) {
		this._scheduleEffect = options?.scheduleEffect
	}
```

### maybeScheduleEffect logic

Lines 91-104:
```typescript
maybeScheduleEffect() {
	// bail out if we have been cancelled by another effect
	if (!this._isActivelyListening) return
	// bail out if no atoms have changed since the last time we ran this effect
	if (this.lastReactedEpoch === getGlobalEpoch()) return

	// bail out if we have parents and they have not changed since last time
	if (this.parents.length && !haveParentsChanged(this)) {
		this.lastReactedEpoch = getGlobalEpoch()
		return
	}
	// if we don't have parents it's probably the first time this is running.
	this.scheduleEffect()
}
```

Three bailout conditions for efficiency.

### execute implementation

Lines 156-169:
```typescript
execute(): Result {
	try {
		startCapturingParents(this)
		// Important! We have to make a note of the current epoch before running the effect.
		// We allow atoms to be updated during effects, which increments the global epoch,
		// so if we were to wait until after the effect runs, the this.lastReactedEpoch value might get ahead of itself.
		const currentEpoch = getGlobalEpoch()
		const result = this.runEffect(this.lastReactedEpoch)
		this.lastReactedEpoch = currentEpoch
		return result
	} finally {
		stopCapturingParents()
	}
}
```

Critical: save epoch BEFORE running effect, not after, because effect might change atoms.

## React integration

### useValue implementation

From `/packages/state-react/src/lib/useValue.ts` (lines 79-108):

```typescript
export function useValue() {
	const args = arguments
	// deps will be either the computed or the deps array
	const deps = args.length === 3 ? args[2] : [args[0]]
	const name = args.length === 3 ? args[0] : `useValue(${args[0].name})`

	const { $val, subscribe, getSnapshot } = useMemo(() => {
		const $val =
			args.length === 1 ? (args[0] as Signal<any>) : (computed(name, args[1]) as Signal<any>)

		return {
			$val,
			subscribe: (notify: () => void) => {
				return react(`useValue(${name})`, () => {
					try {
						$val.get()
					} catch {
						// Will be rethrown during render if the component doesn't unmount first.
					}
					notify()
				})
			},
			getSnapshot: () => $val.lastChangedEpoch,
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
	return $val.__unsafe__getWithoutCapture()
}
```

Key points:
- Uses React's useSyncExternalStore for efficient subscription
- getSnapshot returns lastChangedEpoch (not the value itself)
- Returns value via __unsafe__getWithoutCapture to avoid capturing in render context
- Subscribe function creates reaction that calls notify when signal changes

### useQuickReactor implementation

From `/packages/state-react/src/lib/useQuickReactor.ts` (lines 44-54):

```typescript
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
```

- Creates EffectScheduler without scheduleEffect option, so executes synchronously
- Attaches and immediately executes
- Returns cleanup function

## Incremental computation

### UNINITIALIZED symbol

From `/packages/state/src/lib/Computed.ts` (lines 29-37):

```typescript
export const UNINITIALIZED = Symbol.for('com.tldraw.state/UNINITIALIZED')
export type UNINITIALIZED = typeof UNINITIALIZED

export function isUninitialized(value: any): value is UNINITIALIZED {
	return value === UNINITIALIZED
}
```

### WithDiff helper

From `/packages/state/src/lib/Computed.ts` (lines 81-133):

```typescript
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

export function withDiff<Value, Diff>(value: Value, diff: Diff): WithDiff<Value, Diff> {
	return new WithDiff(value, diff)
}
```

Allows computed functions to return both value and diff, avoiding recomputation of diff.

## Equality checking

From `/packages/state/src/lib/helpers.ts` (lines 137-141):

```typescript
export function equals(a: any, b: any): boolean {
	const shallowEquals =
		a === b || Object.is(a, b) || Boolean(a && b && typeof a.equals === 'function' && a.equals(b))
	return shallowEquals
}
```

Three-tier equality:
1. Reference equality (`===`)
2. `Object.is()` (handles NaN, -0/+0)
3. Custom `.equals()` method if present

## Performance characteristics

### Memory overhead per signal

Atom:
- name: string
- current: Value
- lastChangedEpoch: number (4-8 bytes)
- children: ArraySet (40 bytes base + 8 * items if array mode, or Set overhead if >8 children)
- historyBuffer?: HistoryBuffer (optional, capacity * 3 * 8 bytes for tuples)
- isEqual?: function reference
- computeDiff?: function reference

Computed (extends Atom):
- All Atom fields plus:
- lastCheckedEpoch: number
- lastTraversedEpoch: number
- parentSet: ArraySet
- parents: Signal[] array
- parentEpochs: number[] array
- state: Value
- error: null | object
- derive: function reference

### Time complexity

Operations and their complexity:

- `atom.set()`: O(1) + O(n) where n = number of children (traversal)
- `atom.get()`: O(1)
- `computed.get()`: O(1) if cached and parents unchanged, O(m) where m = cost of derive function if needs recompute
- `haveParentsChanged()`: O(p) where p = number of parents
- `ArraySet.add()`: O(1) if array mode (<8 items), O(1) average if Set mode
- `HistoryBuffer.getChangesSince()`: O(c) where c = capacity, worst case

### Comparison to other systems

From article and CONTEXT.md:

MobX:
- Uses dirty flags (boolean)
- Push-based reactivity (changes immediately propagate)
- Discards computed caches when unobserved
- Issue: cascading updates in large documents
- Issue: recomputation when subscriptions resume

Solid signals:
- Uses pull-based reactivity
- Similar performance characteristics
- Not designed for tldraw's scale
- Missing: incremental computation with diffs, always-on caching, transactional rollback

Preact signals:
- Lightweight but lacks features
- Missing: history/diff tracking, transaction system, advanced caching

## Store integration

From `/packages/store/src/lib/Store.ts`:

The Store uses signals as foundation:
- Each record stored in atom
- Queries implemented as computed signals
- Change listeners use react()
- All updates go through transaction system
- Diff tracking for sync/undo

Example pattern (conceptual):
```typescript
// Store internally uses:
const recordAtom = atom('record:id', recordValue, {
	historyLength: 100,
	computeDiff: recordDiffComputer
})

const query = computed('query:getAllBooks', (prev) => {
	if (isUninitialized(prev)) {
		return buildFromScratch()
	}
	const changes = getRecordChanges()
	return applyIncrementalUpdate(prev, changes)
})
```

## Constants and configuration

From `/packages/state/src/lib/constants.ts`:
- `GLOBAL_START_EPOCH = -1`

From `/packages/state/src/lib/ArraySet.ts`:
- `ARRAY_SIZE_THRESHOLD = 8`

From `/packages/state/src/lib/transactions.ts`:
- Max update depth: 1000 (hardcoded in flushChanges)

From `/packages/state/src/lib/helpers.ts`:
- `EMPTY_ARRAY` singleton for zero-allocation empty arrays

## Error handling

From Computed implementation:
- Errors during computation reset state to UNINITIALIZED
- Error is cached and rethrown on next get()
- History buffer cleared on error
- ignoreErrors flag for haveParentsChanged to prevent error propagation

From Transaction implementation:
- Exceptions during transaction trigger automatic rollback
- History buffers cleared on abort
- Error boundaries prevent cascading failures

## Debugging tools

From `/packages/state/src/lib/capture.ts` (lines 204-210):

```typescript
export function whyAmIRunning() {
	const child = inst.stack?.child
	if (!child) {
		throw new Error('whyAmIRunning() called outside of a reactive context')
	}
	child.__debug_ancestor_epochs__ = new Map()
}
```

Enables ancestor epoch tracking which logs dependency tree showing what changed.

## Singleton pattern

From `/packages/state/src/lib/helpers.ts` (lines 191-196):

```typescript
export function singleton<T>(key: string, init: () => T): T {
	const symbol = Symbol.for(`com.tldraw.state/${key}`)
	const global = globalThis as any
	global[symbol] ??= init()
	return global[symbol]
}
```

Used throughout for global state:
- Capture stack instance
- Transaction state instance
- Atom/Computed class references
- EMPTY_ARRAY constant
- WithDiff class

Ensures single instance across module boundaries and HMR.

## Related documentation

- Article: `/documentation/nuggets/signals.md`
- Package context: `/packages/state/CONTEXT.md`
- Store docs: `/packages/store/src/lib/Store.ts`
- React integration: `/packages/state-react/src/lib/useValue.ts`, `/packages/state-react/src/lib/useQuickReactor.ts`
