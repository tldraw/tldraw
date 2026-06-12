import { HistoryBuffer } from '../HistoryBuffer'
import { RESET_VALUE } from '../types'

// Tests for SPEC.md §17 (HistoryBuffer, internal).
// Rule IDs like [HB2] in test names refer to that document.

describe('HistoryBuffer', () => {
	it('[HB2][HB3] should wrap around', () => {
		const buf = new HistoryBuffer<string>(3)
		buf.pushEntry(0, 1, 'a')
		expect(buf.getChangesSince(0)).toEqual(['a'])
		expect(buf.getChangesSince(1)).toEqual([])

		buf.pushEntry(1, 2, 'b')

		expect(buf.getChangesSince(0)).toEqual(['a', 'b'])
		expect(buf.getChangesSince(1)).toEqual(['b'])
		expect(buf.getChangesSince(2)).toEqual([])

		buf.pushEntry(2, 3, 'c')

		expect(buf.getChangesSince(0)).toEqual(['a', 'b', 'c'])
		expect(buf.getChangesSince(1)).toEqual(['b', 'c'])
		expect(buf.getChangesSince(2)).toEqual(['c'])
		expect(buf.getChangesSince(3)).toEqual([])

		buf.pushEntry(3, 4, 'd')

		expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(1)).toEqual(['b', 'c', 'd'])
		expect(buf.getChangesSince(2)).toEqual(['c', 'd'])
		expect(buf.getChangesSince(3)).toEqual(['d'])
		expect(buf.getChangesSince(4)).toEqual([])

		buf.pushEntry(4, 5, 'e')

		expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(1)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(2)).toEqual(['c', 'd', 'e'])
		expect(buf.getChangesSince(3)).toEqual(['d', 'e'])
		expect(buf.getChangesSince(4)).toEqual(['e'])
		expect(buf.getChangesSince(5)).toEqual([])
	})

	it('[HB2] returns RESET_VALUE when the buffer is empty', () => {
		const buf = new HistoryBuffer<string>(3)
		expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
	})

	it('[HB1] ignores undefined diffs', () => {
		const buf = new HistoryBuffer<string>(3)
		buf.pushEntry(0, 1, 'a')
		buf.pushEntry(1, 2, undefined as any)

		expect(buf.getChangesSince(0)).toEqual(['a'])
		expect(buf.getChangesSince(1)).toEqual([])
	})

	it('[HB1] will clear if you push RESET_VALUE', () => {
		const buf = new HistoryBuffer<string>(10)
		buf.pushEntry(0, 1, 'a')
		buf.pushEntry(1, 2, 'b')
		buf.pushEntry(2, 3, 'c')
		buf.pushEntry(3, 4, 'd')
		buf.pushEntry(4, 5, RESET_VALUE)
		expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(1)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(2)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(3)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(4)).toEqual(RESET_VALUE)
		expect(buf.getChangesSince(5)).toEqual(RESET_VALUE)
	})
})
