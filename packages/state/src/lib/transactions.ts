import { _Atom } from './Atom'
import { GLOBAL_START_EPOCH } from './constants'
import { singleton } from './helpers'
import { Child, Signal } from './types'

interface Reactor {
	maybeScheduleEffect(): void
	lastTraversedEpoch: number
}

class Transaction {
	asyncProcessCount = 0
	constructor(
		public readonly parent: Transaction | null,
		public readonly isSync: boolean
	) {}

	initialAtomValues = new Map<_Atom, any>()

	// eslint-disable-next-line tldraw/no-setter-getter
	get isRoot() {
		return this.parent === null
	}

	commit() {
		if (this.isRoot) {
			// For root transactions, flush changed atoms
			flushChanges(this.initialAtomValues.keys())
			return
		}
		// For transactions with parents, add the transaction's initial values to the parent's, so
		// an outer rollback can still undo them (T7). This must come before any "are we reacting?" special case: a nested
		// transaction committed by an effect during the reaction phase used to skip this fold and
		// its changes survived the outer rollback.
		// A parent that has recorded nothing yet adopts the map outright: this transaction is
		// finished with it, and the common nested case is a single inner transaction doing all
		// the writes.
		const parentValues = this.parent!.initialAtomValues
		if (parentValues.size === 0) {
			this.parent!.initialAtomValues = this.initialAtomValues
			return
		}
		this.initialAtomValues.forEach((value, atom) => {
			if (!parentValues.has(atom)) {
				parentValues.set(atom, value)
			}
		})
	}

	/**
	 * Abort the transaction. Restores every atom changed in this transaction to its initial
	 * value, then commits. Must be called while this is still `inst.currentTransaction`, so that
	 * the restoring sets are recorded against it instead of each flushing effects on their own.
	 *
	 * @public
	 */
	abort() {
		inst.globalEpoch++

		this.initialAtomValues.forEach((value, atom) => {
			atom.set(value)
			atom.historyBuffer?.clear()
		})

		this.commit()
	}
}

const inst = singleton('transactions', () => ({
	// The current epoch (global to all atoms).
	globalEpoch: GLOBAL_START_EPOCH + 1,
	// Whether any transaction is reacting.
	globalIsReacting: false,
	currentTransaction: null as Transaction | null,

	cleanupReactors: null as null | Set<Reactor>,
}))

/**
 * Gets the current global epoch, which is incremented every time any atom changes.
 * This is used to track changes across the entire reactive system.
 *
 * @returns The current global epoch number
 * @public
 */
export function getGlobalEpoch() {
	return inst.globalEpoch
}

/**
 * Whether a transaction (sync or async) is currently open. While one is, atom changes are
 * recorded but their children are not traversed until it commits.
 *
 * @internal
 */
export function getIsInTransaction() {
	return inst.currentTransaction !== null
}

// The set `traverseChild` collects reactors into. Module-level rather than a closure so that a
// flush over thousands of atoms doesn't allocate a visitor per atom; traversal never runs user
// code, so nothing can re-enter and swap it mid-walk.
let traverseReactors: Set<Reactor>

function traverseChild(child: Child) {
	if (child.lastTraversedEpoch === inst.globalEpoch) {
		return
	}

	child.lastTraversedEpoch = inst.globalEpoch

	if ('__isEffectScheduler' in child) {
		traverseReactors.add(child as unknown as Reactor)
	} else {
		;(child as any as Signal<any>).children.visit(traverseChild)
	}
}

/**
 * Collect all of the reactors that need to run for an atom and run them. During the reaction
 * phase the affected effects are instead queued for the cleanup pass, so a change made by an
 * effect never interrupts the pass that is running (P4).
 *
 * @param atoms - The atoms to flush changes for.
 */
function flushChanges(atoms: Iterable<_Atom>) {
	if (inst.globalIsReacting) {
		for (const atom of atoms) {
			traverseAtomForCleanup(atom)
		}
		return
	}

	const outerTxn = inst.currentTransaction
	try {
		// clear the transaction stack. Transactions started by effects must be roots: the committing
		// transaction (if any) has already handed its changes to this flush.
		inst.currentTransaction = null
		inst.globalIsReacting = true

		const reactors = new Set<Reactor>()
		traverseReactors = reactors
		for (const atom of atoms) {
			atom.children.visit(traverseChild)
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
		traverseReactors = undefined! // free memory
	}
}

/** @internal */
export function atomDidChange(atom: _Atom, previousValue: any) {
	if (inst.currentTransaction) {
		// If we are in a transaction, then all we have to do is preserve
		// the value of the atom at the start of the transaction in case
		// we need to roll back. Children are not traversed until the
		// transaction commits, which is why `Computed` must not trust its
		// traversal-based cache shortcut while a transaction is open.
		if (!inst.currentTransaction.initialAtomValues.has(atom)) {
			inst.currentTransaction.initialAtomValues.set(atom, previousValue)
		}
	} else {
		// If there is no transaction, flush the changes immediately.
		flushChanges([atom])
	}
}

function traverseAtomForCleanup(atom: _Atom) {
	traverseReactors = inst.cleanupReactors ??= new Set()
	atom.children.visit(traverseChild)
}

/** @internal */
export function advanceGlobalEpoch() {
	inst.globalEpoch++
}

/**
 * Batches state updates, deferring side effects until after the transaction completes.
 * Unlike {@link transact}, this function always creates a new transaction, allowing for nested transactions.
 *
 * @example
 * ```ts
 * const firstName = atom('firstName', 'John')
 * const lastName = atom('lastName', 'Doe')
 *
 * react('greet', () => {
 *   console.log(`Hello, ${firstName.get()} ${lastName.get()}!`)
 * })
 *
 * // Logs "Hello, John Doe!"
 *
 * transaction(() => {
 *  firstName.set('Jane')
 *  lastName.set('Smith')
 * })
 *
 * // Logs "Hello, Jane Smith!"
 * ```
 *
 * If the function throws, the transaction is aborted and any signals that were updated during the transaction revert to their state before the transaction began. An aborted transaction still flushes effects: effects whose parents went through a change-and-restore round trip are checked again and, if a parent's value differs from what they last saw (an atom they read directly always will), run once more with the restored values.
 *
 * @example
 * ```ts
 * const firstName = atom('firstName', 'John')
 * const lastName = atom('lastName', 'Doe')
 *
 * react('greet', () => {
 *   console.log(`Hello, ${firstName.get()} ${lastName.get()}!`)
 * })
 *
 * // Logs "Hello, John Doe!"
 *
 * transaction(() => {
 *  firstName.set('Jane')
 *  throw new Error('oops')
 * })
 *
 * // firstName.get() === 'John'
 * // Logs "Hello, John Doe!" again: effects whose parents were changed and restored still run,
 * // and observe the restored values.
 * ```
 *
 * A `rollback` callback is passed into the function.
 * Calling this will prevent the transaction from committing and will revert any signals that were updated during the transaction to their state before the transaction began.
 *
 * @example
 * ```ts
 * const firstName = atom('firstName', 'John')
 * const lastName = atom('lastName', 'Doe')
 *
 * react('greet', () => {
 *   console.log(`Hello, ${firstName.get()} ${lastName.get()}!`)
 * })
 *
 * // Logs "Hello, John Doe!"
 *
 * transaction((rollback) => {
 *  firstName.set('Jane')
 *  lastName.set('Smith')
 *  rollback()
 * })
 *
 * // firstName.get() === 'John'
 * // lastName.get() === 'Doe'
 * // Logs "Hello, John Doe!" again, as above.
 * ```
 *
 * @param fn - The function to run in a transaction, called with a function to roll back the change.
 * @returns The return value of the function
 * @public
 */
export function transaction<T>(fn: (rollback: () => void) => T) {
	const txn = new Transaction(inst.currentTransaction, true)

	inst.currentTransaction = txn

	try {
		let result = undefined as T | undefined
		let rollback = false

		try {
			result = fn(() => (rollback = true))
		} catch (e) {
			txn.abort()
			throw e
		}

		if (inst.currentTransaction !== txn) {
			throw new Error('Transaction boundaries overlap')
		}

		if (rollback) {
			txn.abort()
		} else {
			txn.commit()
		}

		return result
	} finally {
		inst.currentTransaction = txn.parent
	}
}

/**
 * Like {@link transaction}, but does not create a new transaction if there is already one in progress.
 * This is the preferred way to batch state updates when you don't need the rollback functionality.
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const doubled = atom('doubled', 0)
 *
 * react('update doubled', () => {
 *   console.log(`Count: ${count.get()}, Doubled: ${doubled.get()}`)
 * })
 *
 * // This batches both updates into a single reaction
 * transact(() => {
 *   count.set(5)
 *   doubled.set(count.get() * 2)
 * })
 * // Logs: "Count: 5, Doubled: 10"
 * ```
 *
 * @param fn - The function to run in a transaction
 * @returns The return value of the function
 * @public
 */
export function transact<T>(fn: () => T): T {
	if (inst.currentTransaction) {
		return fn()
	}
	return transaction(fn)
}

/**
 * Defers the execution of asynchronous effects until they can be properly handled.
 * This function creates an asynchronous transaction context that batches state updates
 * across async operations while preventing conflicts with synchronous transactions.
 *
 * @example
 * ```ts
 * const data = atom('data', null)
 * const loading = atom('loading', false)
 *
 * await deferAsyncEffects(async () => {
 *   loading.set(true)
 *   const result = await fetch('/api/data')
 *   const json = await result.json()
 *   data.set(json)
 *   loading.set(false)
 * })
 * ```
 *
 * @param fn - The async function to execute within the deferred context
 * @returns A promise that resolves to the return value of the function
 * @throws Will throw if called during a synchronous transaction
 * @internal
 */
export async function deferAsyncEffects<T>(fn: () => Promise<T>) {
	// Can't kick off async transactions during a sync transaction because
	// the async transaction won't finish until after the sync transaction
	// is done.
	if (inst.currentTransaction?.isSync) {
		throw new Error('deferAsyncEffects cannot be called during a sync transaction')
	}

	// Can't kick off async transactions during a reaction phase at the moment,
	// because the transaction stack is cleared after the reaction phase.
	// So wait until the path ahead is clear
	while (inst.globalIsReacting) {
		await new Promise((r) => queueMicrotask(() => r(null)))
	}

	const txn = inst.currentTransaction ?? new Transaction(null, false)

	// don't think this can happen, but just in case
	if (txn.isSync) throw new Error('deferAsyncEffects cannot be called during a sync transaction')

	inst.currentTransaction = txn
	txn.asyncProcessCount++

	let result = undefined as T | undefined

	// `undefined` means "did not throw"; a thrown `undefined` is stored as `null` so it still counts.
	let error = undefined as any
	try {
		// Run the function.
		result = await fn()
	} catch (e) {
		// Abort the transaction if the function throws.
		error = e ?? null
	}

	if (--txn.asyncProcessCount > 0) {
		// Other processes still share this transaction; it settles when the last one finishes.
		if (typeof error !== 'undefined') {
			// If the rollback was triggered, abort the transaction.
			throw error
		} else {
			return result
		}
	}

	// Settle while this is still the current transaction (see `Transaction.abort`): clearing it
	// first made every restoring set inside `abort()` flush effects on its own, so effects
	// observed half-restored state.
	try {
		if (typeof error !== 'undefined') {
			// If the rollback was triggered, abort the transaction.
			txn.abort()
			throw error
		} else {
			txn.commit()
			return result
		}
	} finally {
		inst.currentTransaction = null
	}
}
