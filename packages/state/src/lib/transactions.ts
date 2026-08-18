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

	commit() {
		if (inst.globalIsReacting) {
			// Committing during a reaction: route through the cleanup reactors set so effects
			// that depend on these atoms re-run in the current reaction pass.
			for (const atom of this.initialAtomValues.keys()) {
				traverseAtomForCleanup(atom)
			}
		} else if (this.parent === null) {
			flushChanges(this.initialAtomValues.keys())
		} else {
			// Fold this transaction's initial values into the parent so a parent abort can still
			// roll them back.
			const parentValues = this.parent.initialAtomValues
			this.initialAtomValues.forEach((value, atom) => {
				if (!parentValues.has(atom)) {
					parentValues.set(atom, value)
				}
			})
		}
	}

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
	reactionEpoch: GLOBAL_START_EPOCH + 1,
}))

/**
 * Gets the current reaction epoch, which is used to track when reactions are running.
 * The reaction epoch is updated at the start of each reaction cycle.
 *
 * @returns The current reaction epoch number
 * @public
 */
export function getReactionEpoch() {
	return inst.reactionEpoch
}

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
 * Checks whether any reactions are currently executing.
 * When true, the system is in the middle of processing effects and side effects.
 *
 * @returns True if reactions are currently running, false otherwise
 * @public
 */
export function getIsReacting() {
	return inst.globalIsReacting
}

// Module-level target for traverseChild so the recursive walk doesn't allocate a closure per
// atom. Traversals never nest, so a single slot is enough.
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

function collectReactors(reactors: Set<Reactor>, atom: _Atom) {
	traverseReactors = reactors
	atom.children.visit(traverseChild)
}

/**
 * Collect all of the reactors that need to run for the given atoms and run them.
 */
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

		const reactors = new Set<Reactor>()
		for (const atom of atoms) {
			collectReactors(reactors, atom)
		}

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

/**
 * Handle a change to an atom.
 *
 * @param atom The atom that changed.
 * @param previousValue The atom's previous value.
 *
 * @internal
 */
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

function traverseAtomForCleanup(atom: _Atom) {
	collectReactors((inst.cleanupReactors ??= new Set()), atom)
}

/**
 * Advances the global epoch counter by one.
 * This is used internally to track when changes occur across the reactive system.
 *
 * @internal
 */
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
 * If the function throws, the transaction is aborted and any signals that were updated during the transaction revert to their state before the transaction began.
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
 * // Does not log
 * // firstName.get() === 'John'
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
 * // Does not log
 * // firstName.get() === 'John'
 * // lastName.get() === 'Doe'
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
	// Thrown `undefined`/`null` is normalized to `null` so `undefined` reliably means "no error".
	let error = undefined as any
	try {
		result = await fn()
	} catch (e) {
		error = e ?? null
	}

	if (--txn.asyncProcessCount > 0) {
		if (error !== undefined) throw error
		return result
	}

	inst.currentTransaction = null

	if (error !== undefined) {
		txn.abort()
		throw error
	}
	txn.commit()
	return result
}
