import { ArraySet } from './ArraySet'

/**
 * A unique symbol used to indicate that a signal's value should be reset or that
 * there is insufficient history to compute diffs between epochs.
 *
 * This value is returned by {@link Signal.getDiffSince} when the requested epoch
 * is too far in the past and the diff sequence cannot be reconstructed.
 *
 * @example
 * ```ts
 * import { atom, getGlobalEpoch, RESET_VALUE } from '@tldraw/state'
 *
 * const count = atom('count', 0, { historyLength: 3 })
 * const oldEpoch = getGlobalEpoch()
 *
 * // Make many changes that exceed history length
 * count.set(1)
 * count.set(2)
 * count.set(3)
 * count.set(4)
 *
 * const diffs = count.getDiffSince(oldEpoch)
 * if (diffs === RESET_VALUE) {
 *   console.log('Too many changes, need to reset state')
 * }
 * ```
 *
 * @public
 */
export const RESET_VALUE: unique symbol = Symbol.for('com.tldraw.state/RESET_VALUE')

/**
 * Type representing the the unique symbol RESET_VALUE symbol, used in type annotations
 * to indicate when a signal value should be reset or when diff computation
 * cannot proceed due to insufficient history.
 *
 * @public
 */
export type RESET_VALUE = typeof RESET_VALUE

/**
 * A reactive value container that can change over time and track diffs between sequential values.
 *
 * Signals are the foundation of the \@tldraw/state reactive system. They automatically manage
 * dependencies and trigger updates when their values change. Any computed signal or effect
 * that reads from this signal will be automatically recomputed when the signal's value changes.
 *
 * There are two types of signal:
 * - **Atomic signals** - Created using `atom()`. These are mutable containers that can be
 *   directly updated using `set()` or `update()` methods.
 * - **Computed signals** - Created using `computed()`. These derive their values from other
 *   signals and are automatically recomputed when dependencies change.
 *
 * @example
 * ```ts
 * import { atom, computed } from '@tldraw/state'
 *
 * // Create an atomic signal
 * const count = atom('count', 0)
 *
 * // Create a computed signal that derives from the atom
 * const doubled = computed('doubled', () => count.get() * 2)
 *
 * console.log(doubled.get()) // 0
 * count.set(5)
 * console.log(doubled.get()) // 10
 * ```
 *
 * @public
 */
export interface Signal<Value, Diff = unknown> {
	/**
	 * A human-readable identifier for this signal, used primarily for debugging and performance profiling.
	 *
	 * The name is displayed in debug output from {@link whyAmIRunning} and other diagnostic tools.
	 * It does not need to be globally unique within your application.
	 */
	name: string
	/**
	 * Gets the current value of the signal and establishes a dependency relationship.
	 *
	 * When called from within a computed signal or effect, this signal will be automatically
	 * tracked as a dependency. If this signal's value changes, any dependent computations
	 * or effects will be marked for re-execution.
	 *
	 * @returns The current value stored in the signal
	 */
	get(): Value

	/**
	 * The global epoch number when this signal's value last changed.
	 *
	 * Note that this represents when the value actually changed, not when it was last computed.
	 * A computed signal may recalculate and produce the same value without changing its epoch.
	 * This is used internally for dependency tracking and history management.
	 */
	lastChangedEpoch: number
	/**
	 * Gets the sequence of diffs that occurred between a specific epoch and the current state.
	 *
	 * This method enables incremental synchronization by providing a list of changes that
	 * have occurred since a specific point in time. If the requested epoch is too far in
	 * the past or the signal doesn't have enough history, it returns the unique symbol RESET_VALUE
	 * to indicate that a full state reset is required.
	 *
	 * @param epoch - The epoch timestamp to get diffs since
	 * @returns An array of diff objects representing changes since the epoch, or the unique symbol RESET_VALUE if insufficient history is available
	 */
	getDiffSince(epoch: number): RESET_VALUE | Diff[]
	/**
	 * Gets the current value of the signal without establishing a dependency relationship.
	 *
	 * This method bypasses the automatic dependency tracking system, making it useful for
	 * performance-critical code paths where the overhead of dependency capture would be
	 * problematic. Use with caution as it breaks the reactive guarantees of the system.
	 *
	 * **Warning**: This method should only be used when you're certain that you don't need
	 * the calling context to react to changes in this signal.
	 *
	 * @param ignoreErrors - Whether to suppress errors during value retrieval (optional)
	 * @returns The current value without establishing dependencies
	 */
	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value
	/** @internal */
	children: ArraySet<Child>
}

/**
 * Internal interface representing a child node in the signal dependency graph.
 *
 * This interface is used internally by the reactive system to manage dependencies
 * between signals, computed values, and effects. Each child tracks its parent
 * signals and maintains state needed for efficient dependency graph traversal
 * and change propagation.
 *
 * @internal
 */
export interface Child {
	/**
	 * The epoch when this child was last traversed during dependency graph updates.
	 * Used to prevent redundant traversals during change propagation.
	 */
	lastTraversedEpoch: number

	/**
	 * Set of parent signals that this child depends on.
	 * Used for efficient lookup and cleanup operations.
	 */
	readonly parentSet: ArraySet<Signal<any, any>>

	/**
	 * Array of parent signals that this child depends on.
	 * Maintained in parallel with parentSet for ordered access.
	 */
	readonly parents: Signal<any, any>[]

	/**
	 * Array of epochs corresponding to each parent signal.
	 * Used to detect which parents have changed since last computation.
	 */
	readonly parentEpochs: number[]

	/**
	 * Human-readable name for this child, used in debugging output.
	 */
	readonly name: string

	/**
	 * Whether this child is currently subscribed to change notifications.
	 * Used to optimize resource usage by unsubscribing inactive dependencies.
	 */
	isActivelyListening: boolean

	/**
	 * Debug information tracking ancestor epochs in the dependency graph.
	 * Only populated in debug builds for diagnostic purposes.
	 */
	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null
}

/**
 * A function type that computes the difference between two values of a signal.
 *
 * This function is used to generate incremental diffs that can be applied to
 * reconstruct state changes over time. It's particularly useful for features
 * like undo/redo, synchronization, and change tracking.
 *
 * The function should analyze the previous and current values and return a
 * diff object that represents the change. If the diff cannot be computed
 * (e.g., the values are too different or incompatible), it should return
 * the unique symbol RESET_VALUE to indicate that a full state reset is required.
 *
 * @param previousValue - The previous value of the signal
 * @param currentValue - The current value of the signal
 * @param lastComputedEpoch - The epoch when the previous value was set
 * @param currentEpoch - The epoch when the current value was set
 * @returns A diff object representing the change, or the unique symbol RESET_VALUE if no diff can be computed
 *
 * @example
 * ```ts
 * import { atom, RESET_VALUE } from '@tldraw/state'
 *
 * // Simple numeric diff
 * const numberDiff: ComputeDiff<number, number> = (prev, curr) => curr - prev
 *
 * // Array diff with reset fallback
 * const arrayDiff: ComputeDiff<string[], { added: string[], removed: string[] }> = (prev, curr) => {
 *   if (prev.length > 1000 || curr.length > 1000) {
 *     return RESET_VALUE // Too complex, force reset
 *   }
 *   return {
 *     added: curr.filter(item => !prev.includes(item)),
 *     removed: prev.filter(item => !curr.includes(item))
 *   }
 * }
 *
 * const count = atom('count', 0, { computeDiff: numberDiff })
 * ```
 *
 * @public
 */
export type ComputeDiff<Value, Diff> = (
	previousValue: Value,
	currentValue: Value,
	lastComputedEpoch: number,
	currentEpoch: number
) => Diff | RESET_VALUE
