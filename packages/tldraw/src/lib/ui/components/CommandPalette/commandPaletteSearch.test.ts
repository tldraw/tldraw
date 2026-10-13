import { describe, expect, it } from 'vitest'
import { getCommandPaletteMatchScore, rankCommandPaletteEntries } from './commandPaletteSearch'

const score = getCommandPaletteMatchScore

describe('getCommandPaletteMatchScore', () => {
	it('matches nothing with an empty query', () => {
		expect(score('', 'Align left')).toBe(0)
		expect(score('   ', 'Align left')).toBe(0)
	})

	it('ranks an exact label highest', () => {
		expect(score('align left', 'Align left')).toBe(5)
	})

	it('ranks a label prefix next', () => {
		expect(score('align l', 'Align left')).toBe(4)
	})

	it('matches words at word starts in any order', () => {
		expect(score('exp svg', 'Export as SVG')).toBe(3)
		expect(score('left al', 'Align left')).toBe(3)
	})

	it('matches words in the middle of a word', () => {
		expect(score('lign', 'Align left')).toBe(2)
	})

	it('matches words that only appear in the path', () => {
		expect(score('theme dark', 'Dark', ['Preferences', 'Theme'])).toBe(1)
	})

	it('ignores case and accents', () => {
		expect(score('cafe', 'Café')).toBe(5)
		expect(score('CAFÉ', 'cafe')).toBe(5)
	})

	it('requires every word to match', () => {
		expect(score('align banana', 'Align left')).toBe(0)
	})
})

describe('rankCommandPaletteEntries', () => {
	const entry = (id: string, label: string, disabled = false) => ({ id, label, path: [], disabled })

	it('drops non-matches and orders by score', () => {
		const ranked = rankCommandPaletteEntries(
			[entry('mid', 'Realign'), entry('none', 'Zoom in'), entry('exact', 'Align')],
			'align',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['exact', 'mid'])
	})

	it('puts disabled matches after enabled ones', () => {
		const ranked = rankCommandPaletteEntries(
			[entry('a', 'Align', true), entry('b', 'Realign')],
			'align',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['b', 'a'])
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
			disabled: false,
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
	})

	it('matches the full prefixed label', () => {
		const ranked = rankCommandPaletteEntries(
			[{ id: 'dark', label: 'Theme: Dark', name: 'Dark', path: [], disabled: false }],
			'theme dark',
			[]
		)
		expect(ranked.map((e) => e.id)).toEqual(['dark'])
	})
})
