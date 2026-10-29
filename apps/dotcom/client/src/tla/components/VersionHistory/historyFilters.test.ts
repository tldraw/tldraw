import { describe, expect, it } from 'vitest'
import { authorListValues, byAuthor, byNamed } from './historyFilters'

const item = (...ids: (string | null)[]) => ({ authors: ids.map((userId) => ({ userId })) })

describe('byAuthor', () => {
	it('keeps entries the user contributed to', () => {
		expect([item('u1'), item('u2'), item('u2', 'u1')].filter(byAuthor('u1'))).toEqual([
			item('u1'),
			item('u2', 'u1'),
		])
	})

	it("counts agent edits made on the user's behalf", () => {
		expect(byAuthor('u1')({ authors: [{ userId: 'u1', agent: 'mcp' }] })).toBe(true)
	})

	it('without a filter keeps everything', () => {
		expect([item('u2'), item(null)].filter(byAuthor(null))).toHaveLength(2)
	})
})

describe('authorListValues', () => {
	it('fills a, b, c and counts the rest', () => {
		expect(authorListValues(['A'])).toEqual({ count: 1, a: 'A', b: '', c: '', others: 0 })
		expect(authorListValues(['A', 'B'])).toMatchObject({ count: 2, a: 'A', b: 'B' })
		expect(authorListValues(['A', 'B', 'C', 'D', 'E'])).toEqual({
			count: 5,
			a: 'A',
			b: 'B',
			c: 'C',
			others: 2,
		})
	})
})

describe('byNamed', () => {
	it('keeps only named versions when on', () => {
		expect([{ name: 'A' }, {}, { name: 'B' }].filter(byNamed(true))).toEqual([
			{ name: 'A' },
			{ name: 'B' },
		])
	})
	it('keeps everything when off', () => {
		expect([{ name: 'A' }, {}].filter(byNamed(false))).toHaveLength(2)
	})
})
