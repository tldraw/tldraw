import { _Atom } from './Atom'
import { EffectScheduler } from './EffectScheduler'
import { GLOBAL_START_EPOCH } from './constants'
import { singleton } from './helpers'
import { Child, Signal } from './types'

class Transaction {
	constructor(public readonly parent: Transaction | null) {}
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
		if (this.isRoot) {
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

export function getReactionEpoch() {
	return inst.reactionEpoch
}

export function getGlobalEpoch() {
	return inst.globalEpoch
}

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
 * @param atom The atom to flush changes for.
 */
function flushChanges(atoms: Iterable<_Atom>) {
	if (inst.globalIsReacting) {
		throw new Error('cannot change atoms during reaction cycle')
	}

	try {
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
	if (inst.globalIsReacting) {
		// If the atom changed during the reaction phase of flushChanges
		// then we are past the point where a transaction can be aborted
		// so we don't need to note down the previousValue.
		const rs = (inst.cleanupReactors ??= new Set())
		atom.children.visit((child) => traverse(rs, child))
	} else if (!inst.currentTransaction) {
		// If there is no transaction, flush the changes immediately.
		flushChanges([atom])
	} else if (!inst.currentTransaction.initialAtomValues.has(atom)) {
		// If we are in a transaction, then all we have to do is preserve
		// the value of the atom at the start of the transaction in case
		// we need to roll back.
		inst.currentTransaction.initialAtomValues.set(atom, previousValue)
	}
}

export function advanceGlobalEpoch() {
	inst.globalEpoch++
}

/**
 * Batches state updates, deferring side effects until after the transaction completes.
 *
 * @example
 * ```ts
 * const firstName = atom('John')
 * const lastName = atom('Doe')
 *
 * react('greet', () => {
 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
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
 * const firstName = atom('John')
 * const lastName = atom('Doe')
 *
 * react('greet', () => {
 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
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
 *  * @example
 * ```ts
 * const firstName = atom('John')
 * const lastName = atom('Doe')
 *
 * react('greet', () => {
 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
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
 * @public
 */
export function transaction<T>(fn: (rollback: () => void) => T) {
	const txn = new Transaction(inst.currentTransaction)

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

		if (rollback) {
			// If the rollback was triggered, abort the transaction.
			txn.abort()
		} else {
			txn.commit()
		}

		return result
	} finally {
		// Set the current transaction to the transaction's parent.
		inst.currentTransaction = inst.currentTransaction.parent
	}
}

/**
 * Like [transaction](#transaction), but does not create a new transaction if there is already one in progress.
 *
 * @param fn - The function to run in a transaction.
 * @public
 */
export function transact<T>(fn: () => T): T {
	if (inst.currentTransaction) {
		return fn()
	}
	return transaction(fn)
}
