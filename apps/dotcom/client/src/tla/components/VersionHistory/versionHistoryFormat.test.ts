import { describe, expect, it } from 'vitest'
import { authorInitial, formatChangeSummary } from './versionHistoryFormat'

describe('formatChangeSummary', () => {
	const phrase = (kind: string, count: number) => `${count} ${kind}`
	it('hides zero counts', () => {
		expect(formatChangeSummary({ added: 12, updated: 0, removed: 3 }, phrase)).toBe(
			'12 added · 3 deleted'
		)
		expect(formatChangeSummary({ added: 0, updated: 0, removed: 0 }, phrase)).toBe('')
	})
	it('orders added, edited, deleted', () => {
		expect(formatChangeSummary({ added: 1, updated: 5, removed: 2 }, phrase)).toBe(
			'1 added · 5 edited · 2 deleted'
		)
	})
})

describe('authorInitial', () => {
	it('shows bot marker for agent authors', () => {
		expect(
			authorInitial({ userId: 'u1', agent: 'mcp' }, { u1: { name: 'Mitja', color: '#f00' } })
		).toBe('✦')
	})
	it('uses the first letter of the name', () => {
		expect(authorInitial({ userId: 'u1' }, { u1: { name: 'mitja', color: '#f00' } })).toBe('M')
	})
	it('anonymous author gets a question mark', () => {
		expect(authorInitial({ userId: null }, {})).toBe('?')
	})
})
