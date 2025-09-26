import { HistoryBuffer } from '../HistoryBuffer'
import { RESET_VALUE } from '../types'

describe('HistoryBuffer', () => {
	describe('pushEntry', () => {
		it('ignores undefined diffs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, undefined as any)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		})

		it('stores entries and retrieves them correctly', () => {
			const buf = new HistoryBuffer<string>(5)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			buf.pushEntry(2, 3, 'c')

			expect(buf.getChangesSince(0)).toEqual(['a', 'b', 'c'])
			expect(buf.getChangesSince(1)).toEqual(['b', 'c'])
			expect(buf.getChangesSince(2)).toEqual(['c'])
		})

		it('clears buffer on RESET_VALUE', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			expect(buf.getChangesSince(0)).toEqual(['a', 'b'])

			buf.pushEntry(2, 3, RESET_VALUE)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		})
	})

	describe('clear', () => {
		it('clears buffer and resets state', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			expect(buf.getChangesSince(0)).toEqual(['a', 'b'])

			buf.clear()
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)

			// After clear, new entries work correctly
			buf.pushEntry(10, 11, 'new')
			expect(buf.getChangesSince(10)).toEqual(['new'])
		})
	})

	describe('getChangesSince', () => {
		it('returns empty array when no changes since epoch', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			expect(buf.getChangesSince(1)).toEqual([])
			expect(buf.getChangesSince(5)).toEqual([])
		})

		it('returns RESET_VALUE for empty buffer', () => {
			const buf = new HistoryBuffer<string>(3)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		})

		it('returns changes in correct order', () => {
			const buf = new HistoryBuffer<string>(5)
			buf.pushEntry(0, 1, 'first')
			buf.pushEntry(1, 2, 'second')
			buf.pushEntry(2, 3, 'third')

			expect(buf.getChangesSince(0)).toEqual(['first', 'second', 'third'])
			expect(buf.getChangesSince(1)).toEqual(['second', 'third'])
			expect(buf.getChangesSince(2)).toEqual(['third'])
		})

		it('handles epoch range boundaries correctly', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(5, 10, 'span')
			// Within range [5, 10)
			expect(buf.getChangesSince(5)).toEqual(['span'])
			expect(buf.getChangesSince(9)).toEqual(['span'])
			// Outside range
			expect(buf.getChangesSince(10)).toEqual([])
			expect(buf.getChangesSince(4)).toEqual(RESET_VALUE)
		})

		it('returns RESET_VALUE when epoch is too old', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(10, 20, 'gap1')
			buf.pushEntry(30, 40, 'gap2')

			expect(buf.getChangesSince(15)).toEqual(['gap1', 'gap2'])
			expect(buf.getChangesSince(25)).toEqual(RESET_VALUE) // Gap between ranges
		})
	})

	describe('circular buffer behavior', () => {
		it('wraps around when capacity is exceeded', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			buf.pushEntry(2, 3, 'c')
			expect(buf.getChangesSince(0)).toEqual(['a', 'b', 'c'])

			// Add fourth entry, should overwrite first
			buf.pushEntry(3, 4, 'd')
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE) // 'a' is gone
			expect(buf.getChangesSince(1)).toEqual(['b', 'c', 'd'])

			// Add fifth entry, should overwrite second
			buf.pushEntry(4, 5, 'e')
			expect(buf.getChangesSince(1)).toEqual(RESET_VALUE) // 'b' is gone
			expect(buf.getChangesSince(2)).toEqual(['c', 'd', 'e'])
		})

		it('handles single-item buffer wrapping', () => {
			const buf = new HistoryBuffer<string>(1)
			buf.pushEntry(0, 1, 'first')
			expect(buf.getChangesSince(0)).toEqual(['first'])

			buf.pushEntry(1, 2, 'second')
			expect(buf.getChangesSince(1)).toEqual(['second'])
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		})
	})

	describe('RESET_VALUE behavior', () => {
		it('clears buffer when RESET_VALUE is pushed', () => {
			const buf = new HistoryBuffer<string>(10)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			buf.pushEntry(2, 3, RESET_VALUE)

			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
			expect(buf.getChangesSince(1)).toEqual(RESET_VALUE)
		})

		it('works correctly after RESET_VALUE', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'before')
			buf.pushEntry(1, 2, RESET_VALUE)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)

			// Add new entries after reset
			buf.pushEntry(10, 11, 'after1')
			buf.pushEntry(11, 12, 'after2')

			expect(buf.getChangesSince(10)).toEqual(['after1', 'after2'])
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE) // Still reset for old epochs
		})
	})
})
