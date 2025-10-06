import { _Atom } from './Atom'
import { EffectScheduler } from './EffectScheduler'
import { GLOBAL_START_EPOCH } from './constants'
import { singleton } from './helpers'
import { Child, Signal } from './types'

class Transaction {
	asyncProcessCount = 0
	constructor(
		public readonly parent: Transaction | null,
		public readonly isSync: boolean
	) {}

	initialAtomValues = new Map<_Atom, any>()

	/**
	 * Get whether this transaction is a root (no parents).
	 *
	 * @public
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isRoot() {
		return this.parent === null
	}

	/**
	 * Commit the transaction's changes.
	 *
	 * @public
	 */
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

	/**
	 * Abort the transaction.
	 *
	 * @public
	 */
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

const inst = singleton('transactions', () => ({
	// The current epoch (global to all atoms).
	globalEpoch: GLOBAL_START_EPOCH + 1,
	// Whether any transaction is reacting.
	globalIsReacting: false,
	currentTransaction: null as Transaction | null,

	cleanupReactors: null as null | Set<EffectScheduler<unknown>>,
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

function traverse(reactors: Set<EffectScheduler<unknown>>, child: Child) {
	if (child.lastTraversedEpoch === inst.globalEpoch) {
		return
	}

	child.lastTraversedEpoch = inst.globalEpoch

	if (child instanceof EffectScheduler) {
		reactors.add(child)
	} else {
		;(child as any as Signal<any>).children.visit((c) => traverse(reactors, c))
	}
}

/**
 * Collect all of the reactors that need to run for an atom and run them.
 *
 * @param atoms - The atoms to flush changes for.
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
	const rs = (inst.cleanupReactors ??= new Set())
	atom.children.visit((child) => traverse(rs, child))
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

	// Set the current transaction to the transaction
	inst.currentTransaction = txn

	try {
		let result = undefined as T | undefined
		let rollback = false

		try {
			// Run the function.
			result = fn(() => (rollback = true))
		} catch (e) {
			// Abort the transaction if the function throws.
			txn.abort()
			throw e
		}

		if (inst.currentTransaction !== txn) {
			throw new Error('Transaction boundaries overlap')
		}

		if (rollback) {
			// If the rollback was triggered, abort the transaction.
			txn.abort()
		} else {
			txn.commit()
		}

		return result
	} finally {
		// Set the current transaction to the transaction's parent.
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

	let error = undefined as any
	try {
		// Run the function.
		result = await fn()
	} catch (e) {
		// Abort the transaction if the function throws.
		error = e ?? null
	}

	if (--txn.asyncProcessCount > 0) {
		if (typeof error !== 'undefined') {
			// If the rollback was triggered, abort the transaction.
			throw error
		} else {
			return result
		}
	}

	inst.currentTransaction = null

	if (typeof error !== 'undefined') {
		// If the rollback was triggered, abort the transaction.
		txn.abort()
		throw error
	} else {
		txn.commit()
		return result
	}
}
