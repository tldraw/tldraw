import { HistoryBuffer } from '../HistoryBuffer'
import { RESET_VALUE } from '../types'

describe('HistoryBuffer', () => {
	describe('constructor', () => {
		it('creates a buffer with the specified capacity', () => {
			const buf = new HistoryBuffer<string>(5)
			expect(buf.buffer).toHaveLength(5)
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
		})

		it('creates a buffer with capacity 1', () => {
			const buf = new HistoryBuffer<number>(1)
			expect(buf.buffer).toHaveLength(1)
		})

		it('creates a buffer with large capacity', () => {
			const buf = new HistoryBuffer<string>(1000)
			expect(buf.buffer).toHaveLength(1000)
		})
	})

	describe('pushEntry', () => {
		it('ignores undefined diffs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, undefined as any)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
			expect(buf.buffer[0]).toBeUndefined()
		})

		it('stores a single entry correctly', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'first')
			expect(buf.buffer[0]).toEqual([0, 1, 'first'])
			expect(buf.buffer[1]).toBeUndefined()
			expect(buf.buffer[2]).toBeUndefined()
		})

		it('stores multiple entries in sequence', () => {
			const buf = new HistoryBuffer<string>(5)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			buf.pushEntry(2, 3, 'c')

			expect(buf.buffer[0]).toEqual([0, 1, 'a'])
			expect(buf.buffer[1]).toEqual([1, 2, 'b'])
			expect(buf.buffer[2]).toEqual([2, 3, 'c'])
			expect(buf.buffer[3]).toBeUndefined()
		})

		it('handles different diff types', () => {
			const buf = new HistoryBuffer<any>(3)
			buf.pushEntry(0, 1, 42)
			buf.pushEntry(1, 2, { added: ['item'], removed: [] })
			buf.pushEntry(2, 3, true)

			expect(buf.getChangesSince(0)).toEqual([42, { added: ['item'], removed: [] }, true])
		})

		it('handles zero epochs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 0, 'same-epoch')
			expect(buf.buffer[0]).toEqual([0, 0, 'same-epoch'])
		})

		it('handles negative epochs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(-5, -3, 'negative')
			expect(buf.buffer[0]).toEqual([-5, -3, 'negative'])
		})

		it('clears buffer on RESET_VALUE', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			expect(buf.getChangesSince(0)).toEqual(['a', 'b'])

			buf.pushEntry(2, 3, RESET_VALUE)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
		})
	})

	describe('clear', () => {
		it('clears an empty buffer', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.clear()
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
		})

		it('clears a partially filled buffer', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')

			buf.clear()
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
		})

		it('clears a full buffer', () => {
			const buf = new HistoryBuffer<string>(2)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			expect(buf.getChangesSince(0)).toEqual(['a', 'b'])

			buf.clear()
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
		})

		it('resets internal index to 0', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			buf.pushEntry(2, 3, 'c')

			buf.clear()
			// After clear, next entry should go to index 0
			buf.pushEntry(10, 11, 'new')
			expect(buf.buffer[0]).toEqual([10, 11, 'new'])
			expect(buf.buffer[1]).toBeUndefined()
		})
	})

	describe('getChangesSince', () => {
		it('returns empty array when requesting changes since current epoch', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			expect(buf.getChangesSince(1)).toEqual([])
		})

		it('returns empty array when requesting changes from future epoch', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			expect(buf.getChangesSince(5)).toEqual([])
		})

		it('returns RESET_VALUE for empty buffer', () => {
			const buf = new HistoryBuffer<string>(3)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
			expect(buf.getChangesSince(-1)).toEqual(RESET_VALUE)
		})

		it('returns single change correctly', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'single')
			expect(buf.getChangesSince(0)).toEqual(['single'])
		})

		it('returns multiple changes in order', () => {
			const buf = new HistoryBuffer<string>(5)
			buf.pushEntry(0, 1, 'first')
			buf.pushEntry(1, 2, 'second')
			buf.pushEntry(2, 3, 'third')

			expect(buf.getChangesSince(0)).toEqual(['first', 'second', 'third'])
			expect(buf.getChangesSince(1)).toEqual(['second', 'third'])
			expect(buf.getChangesSince(2)).toEqual(['third'])
		})

		it('handles epoch ranges correctly', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(5, 10, 'span')
			// sinceEpoch within range [5, 10)
			expect(buf.getChangesSince(5)).toEqual(['span'])
			expect(buf.getChangesSince(7)).toEqual(['span'])
			expect(buf.getChangesSince(9)).toEqual(['span'])
			// sinceEpoch outside range
			expect(buf.getChangesSince(10)).toEqual([])
			expect(buf.getChangesSince(4)).toEqual(RESET_VALUE)
		})

		it('handles overlapping ranges', () => {
			const buf = new HistoryBuffer<string>(5)
			buf.pushEntry(0, 5, 'first')
			buf.pushEntry(3, 8, 'overlapping')
			buf.pushEntry(7, 10, 'third')

			// Test various epochs within overlapping ranges
			expect(buf.getChangesSince(0)).toEqual(['first', 'overlapping', 'third'])
			expect(buf.getChangesSince(2)).toEqual(['first', 'overlapping', 'third'])
			expect(buf.getChangesSince(4)).toEqual(['overlapping', 'third'])
			expect(buf.getChangesSince(6)).toEqual(['overlapping', 'third'])
			expect(buf.getChangesSince(8)).toEqual(['third'])
		})

		it('handles non-sequential epochs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(10, 20, 'gap1')
			buf.pushEntry(30, 40, 'gap2')
			buf.pushEntry(50, 60, 'gap3')

			expect(buf.getChangesSince(15)).toEqual(['gap1', 'gap2', 'gap3'])
			expect(buf.getChangesSince(25)).toEqual(RESET_VALUE) // Between ranges
			expect(buf.getChangesSince(35)).toEqual(['gap2', 'gap3'])
		})
	})

	describe('circular buffer behavior', () => {
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

		it('maintains correct order after multiple wraps', () => {
			const buf = new HistoryBuffer<string>(2)
			// Fill buffer
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, 'b')
			// First wrap
			buf.pushEntry(2, 3, 'c')
			buf.pushEntry(3, 4, 'd')
			// Second wrap
			buf.pushEntry(4, 5, 'e')

			expect(buf.getChangesSince(3)).toEqual(['d', 'e'])
			expect(buf.getChangesSince(2)).toEqual(RESET_VALUE)
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

		it('works correctly after RESET_VALUE and new entries', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'before')
			buf.pushEntry(1, 2, RESET_VALUE)
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)

			// Add new entries after reset
			buf.pushEntry(10, 11, 'after1')
			buf.pushEntry(11, 12, 'after2')

			expect(buf.getChangesSince(10)).toEqual(['after1', 'after2'])
			expect(buf.getChangesSince(11)).toEqual(['after2'])
			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE) // Still reset for old epochs
		})

		it('handles multiple RESET_VALUE calls', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'a')
			buf.pushEntry(1, 2, RESET_VALUE)
			buf.pushEntry(2, 3, RESET_VALUE)

			expect(buf.getChangesSince(0)).toEqual(RESET_VALUE)
			expect(buf.getChangesSince(1)).toEqual(RESET_VALUE)
			expect(buf.buffer.every((slot) => slot === undefined)).toBe(true)
		})
	})

	describe('edge cases', () => {
		it('handles very large epoch numbers', () => {
			const buf = new HistoryBuffer<string>(2)
			const largeEpoch = Number.MAX_SAFE_INTEGER - 1
			buf.pushEntry(largeEpoch, largeEpoch + 1, 'large')

			expect(buf.getChangesSince(largeEpoch)).toEqual(['large'])
			expect(buf.getChangesSince(largeEpoch + 1)).toEqual([])
		})

		it('handles exact epoch boundary conditions', () => {
			const buf = new HistoryBuffer<string>(2)
			buf.pushEntry(5, 10, 'boundary')

			// Exactly on fromEpoch
			expect(buf.getChangesSince(5)).toEqual(['boundary'])
			// Just before toEpoch
			expect(buf.getChangesSince(9)).toEqual(['boundary'])
			// Exactly on toEpoch
			expect(buf.getChangesSince(10)).toEqual([])
			// Just before fromEpoch
			expect(buf.getChangesSince(4)).toEqual(RESET_VALUE)
		})

		it('handles equal from and to epochs', () => {
			const buf = new HistoryBuffer<string>(2)
			buf.pushEntry(5, 5, 'same-epoch')

			// Since fromEpoch <= sinceEpoch < toEpoch, sinceEpoch=5 should not match
			expect(buf.getChangesSince(5)).toEqual([])
			expect(buf.getChangesSince(4)).toEqual(RESET_VALUE)
		})

		it('handles string diffs', () => {
			const buf = new HistoryBuffer<string>(3)
			buf.pushEntry(0, 1, 'hello')
			buf.pushEntry(1, 2, 'world')
			buf.pushEntry(2, 3, '!')

			expect(buf.getChangesSince(0)).toEqual(['hello', 'world', '!'])
			expect(buf.getChangesSince(1)).toEqual(['world', '!'])
		})

		it('handles object diffs', () => {
			interface ObjectDiff {
				added: string[]
				removed: string[]
				modified: { [key: string]: any }
			}

			const buf = new HistoryBuffer<ObjectDiff>(3)
			const diff1: ObjectDiff = { added: ['a'], removed: [], modified: {} }
			const diff2: ObjectDiff = { added: ['b'], removed: ['x'], modified: { key: 'value' } }

			buf.pushEntry(0, 1, diff1)
			buf.pushEntry(1, 2, diff2)

			expect(buf.getChangesSince(0)).toEqual([diff1, diff2])
			expect(buf.getChangesSince(1)).toEqual([diff2])
		})

		it('handles null and empty string diffs', () => {
			const buf = new HistoryBuffer<string | null>(3)
			buf.pushEntry(0, 1, '')
			buf.pushEntry(1, 2, null as any) // null is a valid diff

			expect(buf.getChangesSince(0)).toEqual(['', null])
		})
	})

	describe('stress tests', () => {
		it('handles rapid sequential updates', () => {
			const buf = new HistoryBuffer<number>(10)

			for (let i = 0; i < 100; i++) {
				buf.pushEntry(i, i + 1, i)
			}

			// Should only have last 10 entries
			const recent = buf.getChangesSince(90)
			expect(recent).toEqual([90, 91, 92, 93, 94, 95, 96, 97, 98, 99])
			// Older entries should trigger RESET_VALUE
			expect(buf.getChangesSince(80)).toEqual(RESET_VALUE)
		})

		it('maintains performance with large capacity', () => {
			const buf = new HistoryBuffer<string>(1000)

			for (let i = 0; i < 500; i++) {
				buf.pushEntry(i, i + 1, `change-${i}`)
			}

			// Test various access patterns
			const allChanges = buf.getChangesSince(0)
			expect(allChanges).toHaveLength(500)
			expect(allChanges).toEqual(expect.arrayContaining(['change-0', 'change-100', 'change-499']))

			const recentChanges = buf.getChangesSince(400)
			expect(recentChanges).toHaveLength(100) // 400 to 499 inclusive
		})
	})
})
