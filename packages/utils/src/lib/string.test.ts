import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFirstCharacter, iterateGraphemes } from './string'

describe('getFirstCharacter', () => {
	it('returns the first character of a plain string', () => {
		expect(getFirstCharacter('hello')).toBe('h')
	})

	it('returns an empty string for an empty input', () => {
		expect(getFirstCharacter('')).toBe('')
	})

	it('keeps a leading emoji whole instead of splitting a surrogate pair', () => {
		expect(getFirstCharacter('😀 hello')).toBe('😀')
	})

	it('keeps a multi-code-point emoji cluster whole', () => {
		expect(getFirstCharacter('👨‍👩‍👧 family')).toBe('👨‍👩‍👧')
	})

	it('handles a leading whitespace character', () => {
		expect(getFirstCharacter(' hi')).toBe(' ')
	})
})

describe('iterateGraphemes', () => {
	it('yields each grapheme cluster in order', () => {
		expect([...iterateGraphemes('a😀b')]).toEqual(['a', '😀', 'b'])
	})

	it('keeps a multi-code-point cluster whole', () => {
		expect([...iterateGraphemes('👨‍👩‍👧!')]).toEqual(['👨‍👩‍👧', '!'])
	})

	it('yields nothing for an empty string', () => {
		expect([...iterateGraphemes('')]).toEqual([])
	})
})

// On browsers without `Intl.Segmenter` (e.g. Firefox before 125) the module must not throw and must
// still iterate; it falls back to code-point iteration. The segmenter is probed lazily on first
// use, so `Intl.Segmenter` has to be absent at call time — reset the module and remove the global
// for the duration of each call.
describe('grapheme iteration without Intl.Segmenter', () => {
	afterEach(() => {
		vi.resetModules()
	})

	async function withoutSegmenter<T>(fn: (mod: typeof import('./string')) => T): Promise<T> {
		vi.resetModules()
		// `Intl.Segmenter` is typed read-only; take a mutable view so we can remove and restore it.
		const mutableIntl = Intl as { Segmenter?: typeof Intl.Segmenter }
		const original = mutableIntl.Segmenter
		delete mutableIntl.Segmenter
		expect('Segmenter' in Intl).toBe(false)
		try {
			return fn(await import('./string'))
		} finally {
			mutableIntl.Segmenter = original
		}
	}

	it('iterateGraphemes falls back to code-point iteration', async () => {
		await withoutSegmenter(({ iterateGraphemes }) => {
			expect([...iterateGraphemes('ab😀')]).toEqual(['a', 'b', '😀'])
		})
	})

	it('getFirstCharacter keeps a surrogate pair whole', async () => {
		await withoutSegmenter(({ getFirstCharacter }) => {
			expect(getFirstCharacter('😀 hello')).toBe('😀')
		})
	})

	it('getFirstCharacter splits a ZWJ cluster to its first code point rather than throwing', async () => {
		await withoutSegmenter(({ getFirstCharacter }) => {
			expect(getFirstCharacter('👨‍👩‍👧 family')).toBe('👨')
		})
	})
})
