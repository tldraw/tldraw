import { _Atom } from './Atom'
import { GLOBAL_START_EPOCH } from './constants'
import { EffectScheduler } from './EffectScheduler'
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
			// For root transactions, flush changes to each of the atom's initial values.
			const atoms = this.initialAtomValues
			this.initialAtomValues = new Map()
			flushChanges(atoms.keys())
		} else {
			// For transaction's with parents, add the transaction's initial values to the parent's.
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
}))

export function getGlobalEpoch() {
	return inst.globalEpoch
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

		// Collect all of the visited reactors.
		const reactors = new Set<EffectScheduler<unknown>>()

		// Visit each descendant of the atom, collecting reactors.
		const traverse = (node: Child) => {
			if (node.lastTraversedEpoch === inst.globalEpoch) {
				return
			}

			node.lastTraversedEpoch = inst.globalEpoch

			if (node instanceof EffectScheduler) {
				reactors.add(node)
			} else {
				;(node as any as Signal<any>).children.visit(traverse)
			}
		}

		for (const atom of atoms) {
			atom.children.visit(traverse)
		}

		// Run each reactor.
		for (const r of reactors) {
			r.maybeScheduleEffect()
		}
	} finally {
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
	if (!inst.currentTransaction) {
		flushChanges([atom])
	} else if (!inst.currentTransaction.initialAtomValues.has(atom)) {
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
		let rollback = false

		// Run the function.
		const result = fn(() => (rollback = true))

		if (rollback) {
			// If the rollback was triggered, abort the transaction.
			txn.abort()
		} else {
			// Otherwise, commit the transaction.
			txn.commit()
		}

		return result
	} catch (e) {
		// Abort the transaction if the function throws.
		txn.abort()
		throw e
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
