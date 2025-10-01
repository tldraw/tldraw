import { RESET_VALUE } from './types'

/**
 * A tuple representing a range of epochs and the associated diff.
 * Used internally by HistoryBuffer to store change information.
 *
 * @internal
 */
type RangeTuple<Diff> = [fromEpoch: number, toEpoch: number, diff: Diff]

/**
 * A circular buffer that stores diffs between sequential values of an atom or computed signal.
 * This enables efficient change tracking and history retrieval for features like undo/redo.
 *
 * The buffer uses a wrap-around strategy to maintain a fixed-size history of the most recent
 * changes, automatically overwriting older entries when the capacity is exceeded.
 *
 * @example
 * ```ts
 * const buffer = new HistoryBuffer<string>(5)
 * buffer.pushEntry(0, 1, 'first change')
 * buffer.pushEntry(1, 2, 'second change')
 * const changes = buffer.getChangesSince(0) // ['first change', 'second change']
 * ```
 *
 * @internal
 */
export class HistoryBuffer<Diff> {
	/**
	 * Current write position in the circular buffer.
	 * @internal
	 */
	private index = 0

	/**
	 * Circular buffer storing range tuples. Uses undefined to represent empty slots.
	 * @internal
	 */
	buffer: Array<RangeTuple<Diff> | undefined>

	/**
	 * Creates a new HistoryBuffer with the specified capacity.
	 *
	 * capacity - Maximum number of diffs to store in the buffer
	 * @example
	 * ```ts
	 * const buffer = new HistoryBuffer<number>(10) // Store up to 10 diffs
	 * ```
	 */
	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity)
	}

	/**
	 * Adds a diff entry to the history buffer, representing a change between two epochs.
	 *
	 * If the diff is undefined, the operation is ignored. If the diff is RESET_VALUE,
	 * the entire buffer is cleared to indicate that historical tracking should restart.
	 *
	 * @param lastComputedEpoch - The epoch when the previous value was computed
	 * @param currentEpoch - The epoch when the current value was computed
	 * @param diff - The diff representing the change, or RESET_VALUE to clear history
	 * @example
	 * ```ts
	 * const buffer = new HistoryBuffer<string>(5)
	 * buffer.pushEntry(0, 1, 'added text')
	 * buffer.pushEntry(1, 2, RESET_VALUE) // Clears the buffer
	 * ```
	 */
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

	/**
	 * Clears all entries from the history buffer and resets the write position.
	 * This is called when a RESET_VALUE diff is encountered.
	 *
	 * @example
	 * ```ts
	 * const buffer = new HistoryBuffer<string>(5)
	 * buffer.pushEntry(0, 1, 'change')
	 * buffer.clear()
	 * console.log(buffer.getChangesSince(0)) // RESET_VALUE
	 * ```
	 */
	clear() {
		this.index = 0
		this.buffer.fill(undefined)
	}

	/**
	 * Retrieves all diffs that occurred since the specified epoch.
	 *
	 * The method searches backwards through the circular buffer to find changes
	 * that occurred after the given epoch. If insufficient history is available
	 * or the requested epoch is too old, returns RESET_VALUE indicating that
	 * a complete state rebuild is required.
	 *
	 * @param sinceEpoch - The epoch from which to retrieve changes
	 * @returns Array of diffs since the epoch, or RESET_VALUE if history is insufficient
	 * @example
	 * ```ts
	 * const buffer = new HistoryBuffer<string>(5)
	 * buffer.pushEntry(0, 1, 'first')
	 * buffer.pushEntry(1, 2, 'second')
	 * const changes = buffer.getChangesSince(0) // ['first', 'second']
	 * const recentChanges = buffer.getChangesSince(1) // ['second']
	 * const tooOld = buffer.getChangesSince(-100) // RESET_VALUE
	 * ```
	 */
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
}
