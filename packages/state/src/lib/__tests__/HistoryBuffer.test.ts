import { HistoryBuffer } from '../HistoryBuffer'
import { RESET_VALUE } from '../types'

describe('HistoryBuffer', () => {
	it('should wrap around', () => {
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

	it('will clear if you push RESET_VALUE', () => {
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
