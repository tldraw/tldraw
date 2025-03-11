import { ArraySet } from './ArraySet'
import { HistoryBuffer } from './HistoryBuffer'
import { maybeCaptureParent } from './capture'
import { EMPTY_ARRAY, equals, singleton } from './helpers'
import { advanceGlobalEpoch, atomDidChange, getGlobalEpoch } from './transactions'
import { Child, ComputeDiff, RESET_VALUE, Signal } from './types'

/**
 * The options to configure an atom, passed into the {@link atom} function.
 * @public
 */
export interface AtomOptions<Value, Diff> {
	/**
	 * The maximum number of diffs to keep in the history buffer.
	 *
	 * If you don't need to compute diffs, or if you will supply diffs manually via {@link Atom.set}, you can leave this as `undefined` and no history buffer will be created.
	 *
	 * If you expect the value to be part of an active effect subscription all the time, and to not change multiple times inside of a single transaction, you can set this to a relatively low number (e.g. 10).
	 *
	 * Otherwise, set this to a higher number based on your usage pattern and memory constraints.
	 *
	 */
	historyLength?: number
	/**
	 * A method used to compute a diff between the atom's old and new values. If provided, it will not be used unless you also specify {@link AtomOptions.historyLength}.
	 */
	computeDiff?: ComputeDiff<Value, Diff>
	/**
	 * If provided, this will be used to compare the old and new values of the atom to determine if the value has changed.
	 * By default, values are compared using first using strict equality (`===`), then `Object.is`, and finally any `.equals` method present in the object's prototype chain.
	 * @param a - The old value
	 * @param b - The new value
	 * @returns
	 */
	isEqual?(a: any, b: any): boolean
}

/**
 * An Atom is a signal that can be updated directly by calling {@link Atom.set} or {@link Atom.update}.
 *
 * Atoms are created using the {@link atom} function.
 *
 * @example
 * ```ts
 * const name = atom('name', 'John')
 *
 * print(name.get()) // 'John'
 * ```
 *
 * @public
 */
export interface Atom<Value, Diff = unknown> extends Signal<Value, Diff> {
	/**
	 * Sets the value of this atom to the given value. If the value is the same as the current value, this is a no-op.
	 *
	 * @param value - The new value to set.
	 * @param diff - The diff to use for the update. If not provided, the diff will be computed using {@link AtomOptions.computeDiff}.
	 */
	set(value: Value, diff?: Diff): Value
	/**
	 * Updates the value of this atom using the given updater function. If the returned value is the same as the current value, this is a no-op.
	 *
	 * @param updater - A function that takes the current value and returns the new value.
	 */
	update(updater: (value: Value) => Value): Value
}

/**
 * @internal
 */
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

	__unsafe__getWithoutCapture(_ignoreErrors?: boolean): Value {
		return this.current
	}

	get() {
		maybeCaptureParent(this)
		return this.current
	}

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

	update(updater: (value: Value) => Value): Value {
		return this.set(updater(this.current))
	}

	getDiffSince(epoch: number): RESET_VALUE | Diff[] {
		maybeCaptureParent(this)

		// If no changes have occurred since the given epoch, return an empty array.
		if (epoch >= this.lastChangedEpoch) {
			return EMPTY_ARRAY
		}

		return this.historyBuffer?.getChangesSince(epoch) ?? RESET_VALUE
	}
}

export const _Atom = singleton('Atom', () => __Atom__)
export type _Atom = InstanceType<typeof _Atom>

/**
 * Creates a new {@link Atom}.
 *
 * An Atom is a signal that can be updated directly by calling {@link Atom.set} or {@link Atom.update}.
 *
 * @example
 * ```ts
 * const name = atom('name', 'John')
 *
 * name.get() // 'John'
 *
 * name.set('Jane')
 *
 * name.get() // 'Jane'
 * ```
 *
 * @public
 */
export function atom<Value, Diff = unknown>(
	/**
	 * A name for the signal. This is used for debugging and profiling purposes, it does not need to be unique.
	 */
	name: string,
	/**
	 * The initial value of the signal.
	 */
	initialValue: Value,
	/**
	 * The options to configure the atom. See {@link AtomOptions}.
	 */
	options?: AtomOptions<Value, Diff>
): Atom<Value, Diff> {
	return new _Atom(name, initialValue, options)
}

/**
 * Returns true if the given value is an {@link Atom}.
 * @public
 */
export function isAtom(value: unknown): value is Atom<unknown> {
	return value instanceof _Atom
}
