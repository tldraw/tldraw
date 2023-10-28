import { RESET_VALUE } from './types'

type RangeTuple<Diff> = [fromEpoch: number, toEpoch: number, diff: Diff]

/**
 * A structure that stores diffs between values of an atom.
 *
 * @internal
 */
export class HistoryBuffer<Diff> {
	private index = 0

	// use a wrap around buffer to store the last N values
	buffer: Array<RangeTuple<Diff> | undefined>

	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity)
	}

	/**
	 * Add a diff to the history buffer.
	 *
	 * @param lastComputedEpoch - The epoch when the diff was computed.
	 * @param currentEpoch - The current epoch.
	 * @param diff - The diff to add, or else a reset value.
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
	 * Clear the history buffer.
	 */
	clear() {
		this.index = 0
		this.buffer.fill(undefined)
	}

	/**
	 * Get the diffs since the given epoch.
	 *
	 * @param epoch - The epoch to get diffs since.
	 * @returns An array of diffs or a flag to reset the history buffer.
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
