import { describe, expect, it } from 'vitest'
import { getCommandPaletteMatchScore, rankCommandPaletteEntries } from './commandPaletteSearch'

describe('getCommandPaletteMatchScore', () => {
	it.each<[string, string, string[], number]>([
		['', 'Align left', [], 0],
		['   ', 'Align left', [], 0],
		['align left', 'Align left', [], 5],
		['align l', 'Align left', [], 4],
		['exp svg', 'Export as SVG', [], 3],
		['left al', 'Align left', [], 3],
		['lign', 'Align left', [], 2],
		['theme dark', 'Dark', ['Preferences', 'Theme'], 1],
		['cafe', 'Café', [], 5],
		['CAFÉ', 'cafe', [], 5],
		['align banana', 'Align left', [], 0],
	])('scores %j against %j (path %j) as %i', (query, label, path, expected) => {
		expect(getCommandPaletteMatchScore(query, label, path)).toBe(expected)
	})
})

describe('rankCommandPaletteEntries', () => {
	const entry = (id: string, label: string) => ({ id, label, path: [] })

	it('drops non-matches and orders by score', () => {
		const ranked = rankCommandPaletteEntries(
			[entry('mid', 'Realign'), entry('none', 'Zoom in'), entry('exact', 'Align')],
			'align',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['exact', 'mid'])
	})

	it('breaks ties toward labels with fewer words the query misses', () => {
		const ranked = rankCommandPaletteEntries(
			[entry('light-red', 'Color: Light red'), entry('red', 'Color: Red')],
			'color red',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['red', 'light-red'])
	})

	it('breaks ties by recency, then by original order', () => {
		const entries = [
			entry('one', 'Align one'),
			entry('two', 'Align two'),
			entry('three', 'Align three'),
		]
		expect(rankCommandPaletteEntries(entries, 'align', ['three']).map((e) => e.id)).toEqual([
			'three',
			'one',
			'two',
		])
	})

	it('ranks an exact bare name above a word-start match inside a prefixed label', () => {
		const prefixed = (id: string, label: string, name: string) => ({
			id,
			label,
			name,
			path: [],
		})
		const ranked = rankCommandPaletteEntries(
			[
				prefixed('mode', 'Theme: Dark mode', 'Dark mode'),
				prefixed('dark', 'Theme: Dark', 'Dark'),
				prefixed('other', 'Other: A dark one', 'A dark one'),
			],
			'dark',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['dark', 'mode', 'other'])
		expect(
			rankCommandPaletteEntries([prefixed('dark', 'Theme: Dark', 'Dark')], 'theme dark', []).map(
				(e) => e.id
			)
		).toEqual(['dark'])
	})
})
