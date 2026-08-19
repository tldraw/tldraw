import { EMPTY_ARRAY } from './helpers'
import { RESET_VALUE } from './types'

type RangeTuple<Diff> = [fromEpoch: number, toEpoch: number, diff: Diff]

/**
 * A ring buffer of the most recent diffs of an atom or computed signal, so that
 * {@link Signal.getDiffSince} can hand incremental consumers the changes since the epoch they
 * last saw instead of forcing them to recompute from the current value.
 *
 * Entries must be contiguous (`entry[k].toEpoch === entry[k+1].fromEpoch`); `getChangesSince`
 * relies on that to find the entry covering an epoch.
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
	private index = 0

	buffer: Array<RangeTuple<Diff> | undefined>

	constructor(private readonly capacity: number) {
		this.buffer = new Array(capacity)
	}

	/**
	 * Records the diff covering `lastComputedEpoch` → `currentEpoch`. `RESET_VALUE` — or an
	 * `undefined` diff, which also means "no diff available" — clears the buffer instead: silently
	 * skipping an entry would leave a gap, and a later `getChangesSince` from before the gap would
	 * return an incomplete diff list rather than `RESET_VALUE`.
	 */
	pushEntry(lastComputedEpoch: number, currentEpoch: number, diff: Diff | RESET_VALUE | undefined) {
		if (diff === RESET_VALUE || diff === undefined) {
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
	 * The diffs since `sinceEpoch`, oldest first, or `RESET_VALUE` if the buffer no longer reaches
	 * back that far (evicted, cleared, or never recorded).
	 *
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

		// Walk backwards from the newest entry looking for the one whose range contains sinceEpoch.
		for (let i = 0; i < capacity; i++) {
			const offset = (index - 1 + capacity - i) % capacity

			const elem = buffer[offset]

			if (!elem) {
				return RESET_VALUE
			}

			const [fromEpoch, toEpoch] = elem

			if (i === 0 && sinceEpoch >= toEpoch) {
				return EMPTY_ARRAY
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
