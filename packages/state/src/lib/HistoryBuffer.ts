import { RESET_VALUE } from './types'

type RangeTuple<Diff> = [fromEpoch: number, toEpoch: number, diff: Diff]

/**
 * A fixed-capacity circular buffer of diffs between sequential values of an atom or computed
 * signal. Older entries are overwritten once the capacity is exceeded, at which point
 * {@link HistoryBuffer.getChangesSince} for an epoch older than the buffer reports RESET_VALUE.
 *
 * @internal
 */
export class HistoryBuffer<Diff> {
	private index = 0

	/** Circular storage; `undefined` marks a slot that has never been written (or was cleared). */
	buffer: Array<RangeTuple<Diff> | undefined>

	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity)
	}

	/**
	 * Records the diff between two epochs. `undefined` diffs are ignored; RESET_VALUE clears the
	 * buffer since history before a reset can no longer be replayed.
	 */
	pushEntry(lastComputedEpoch: number, currentEpoch: number, diff: Diff | RESET_VALUE) {
		if (diff === undefined) {
			return
		}

		if (diff === RESET_VALUE) {
			this.clear()
			return
		}

		this.buffer[this.index] = [lastComputedEpoch, currentEpoch, diff]
		this.index = (this.index + 1) % this.capacity
	}

	clear() {
		this.index = 0
		this.buffer.fill(undefined)
	}

	/**
	 * Returns the diffs recorded since `sinceEpoch`, oldest first, or RESET_VALUE if the buffer
	 * doesn't reach back that far.
	 */
	getChangesSince(sinceEpoch: number): RESET_VALUE | Diff[] {
		const { index, capacity, buffer } = this

		// Walk backwards from the most recent entry.
		for (let i = 0; i < capacity; i++) {
			const offset = (index - 1 + capacity - i) % capacity

			const elem = buffer[offset]
			if (!elem) {
				return RESET_VALUE
			}

			const [fromEpoch, toEpoch] = elem

			// Nothing has changed since the most recent entry.
			if (i === 0 && sinceEpoch >= toEpoch) {
				return []
			}

			if (fromEpoch <= sinceEpoch && sinceEpoch < toEpoch) {
				const len = i + 1
				const result = new Array(len)

				for (let j = 0; j < len; j++) {
					result[j] = buffer[(offset + j) % capacity]![2]
				}

				return result
			}
		}

		return RESET_VALUE
	}
}
