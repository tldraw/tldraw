import { toRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { diffText, getShapePlaintext, mapTextRange } from './text-range-tracking'

/** The range of the first occurrence of `word` in `text`. */
function rangeOf(text: string, word: string) {
	const from = text.indexOf(word)
	return { from, to: from + word.length }
}

describe('getShapePlaintext', () => {
	it('concatenates text nodes without separating blocks', () => {
		expect(getShapePlaintext(toRichText('one\ntwo'))).toBe('onetwo')
	})

	it('handles empty paragraphs and marked text', () => {
		expect(getShapePlaintext(toRichText(''))).toBe('')
		expect(
			getShapePlaintext({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'bold ' },
							{ type: 'text', text: 'and italic', marks: [{ type: 'italic' }] },
						],
					},
				],
			})
		).toBe('bold and italic')
	})
})

describe('diffText', () => {
	it('returns null for identical text', () => {
		expect(diffText('hello', 'hello')).toBe(null)
	})

	it('describes an insertion as a zero-width replacement', () => {
		expect(diffText('ac', 'abc')).toEqual({ start: 1, oldEnd: 1, newEnd: 2 })
	})

	it('describes a deletion as a replacement with nothing', () => {
		expect(diffText('abc', 'ac')).toEqual({ start: 1, oldEnd: 2, newEnd: 1 })
	})

	it('trims a common prefix and suffix around a replacement', () => {
		expect(diffText('the quick fox', 'the slow fox')).toEqual({ start: 4, oldEnd: 9, newEnd: 8 })
	})

	it('attributes an ambiguous insertion to either end on request', () => {
		// Typing "c" before "comment" is indistinguishable from typing it before the second "c".
		expect(diffText('comment', 'ccomment', 'latest')).toEqual({ start: 1, oldEnd: 1, newEnd: 2 })
		expect(diffText('comment', 'ccomment', 'earliest')).toEqual({ start: 0, oldEnd: 0, newEnd: 1 })
	})
})

describe('mapTextRange', () => {
	const text = 'Select a few words and press the comment button in the toolbar.'
	const commented = rangeOf(text, 'comment button')

	/** The text the range covers after the edit that turns `text` into `edited`. */
	function textAfter(edited: string, range = commented) {
		const mapped = mapTextRange(range, text, edited)
		return edited.slice(mapped.from, mapped.to)
	}

	it('leaves a range alone when the edit is after it', () => {
		expect(textAfter(text.replace('the toolbar', 'the rich text toolbar'))).toBe('comment button')
	})

	it('shifts a range when text is inserted before it', () => {
		const edited = 'First! ' + text
		expect(mapTextRange(commented, text, edited)).toEqual({
			from: commented.from + 7,
			to: commented.to + 7,
		})
		expect(textAfter(edited)).toBe('comment button')
	})

	it('shifts a range back when text is deleted before it', () => {
		expect(textAfter(text.replace('Select a few words and press', 'Press'))).toBe('comment button')
	})

	it('grows to include text typed inside the range', () => {
		expect(textAfter(text.replace('comment button', 'comment toolbar button'))).toBe(
			'comment toolbar button'
		)
	})

	it('leaves out text typed at either boundary of the range', () => {
		expect(textAfter(text.replace('the comment button', 'the big comment button'))).toBe(
			'comment button'
		)
		expect(textAfter(text.replace('comment button in', 'comment button bar in'))).toBe(
			'comment button'
		)
	})

	it('leaves out boundary text that matches the range, despite the ambiguity', () => {
		// The diff can't tell which copy of the repeated text is new, so it has to assume the one
		// that keeps the comment off text the author didn't comment on.
		expect(textAfter(text.replace('the comment button', 'the ccomment button'))).toBe(
			'comment button'
		)
		expect(textAfter(text.replace('the comment button', 'the comment comment button'))).toBe(
			'comment button'
		)
		expect(textAfter(text.replace('comment button in', 'comment buttonn in'))).toBe(
			'comment button'
		)
		expect(textAfter(text.replace('comment button in', 'comment button button in'))).toBe(
			'comment button'
		)
	})

	it('shrinks to what survives when part of the range is deleted', () => {
		// The readings disagree over whether " button" or "button " went, so the shared space is left
		// out and the range keeps only the characters that definitely survived.
		expect(textAfter(text.replace('comment button', 'comment'))).toBe('comment')
	})

	it('drops a rewritten word out of the range and keeps the rest', () => {
		expect(textAfter(text.replace('comment button', 'toolbar button'))).toBe(' button')
	})

	it('collapses when the whole range is rewritten', () => {
		const mapped = mapTextRange(commented, text, text.replace('comment button', 'shiny new thing'))
		expect(mapped.from).toBe(mapped.to)
	})

	it('collapses when the whole range is deleted', () => {
		const mapped = mapTextRange(commented, text, text.replace('the comment button ', 'the '))
		expect(mapped.from).toBe(mapped.to)
	})

	it('never grows a range beyond text it already covered', () => {
		// Retyping the whole shape collapses the range, and undoing that must not balloon it back out
		// over the restored text — an anchor that grew on every edit would end up highlighting
		// passages nobody commented on.
		const retyped = 'Something else entirely.'
		const collapsed = mapTextRange(commented, text, retyped)
		expect(collapsed.from).toBe(collapsed.to)

		const undone = mapTextRange(collapsed, retyped, text)
		expect(undone.from).toBe(undone.to)
	})

	it('round-trips a range when an edit is undone', () => {
		const edited = 'First! ' + text
		const mapped = mapTextRange(commented, text, edited)
		expect(mapTextRange(mapped, edited, text)).toEqual(commented)
	})
})

describe('mapTextRange invariants', () => {
	// A deterministic PRNG, so a failure here is reproducible rather than a one-off flake.
	function makeRandom(seed: number) {
		let state = seed
		return (n: number) => {
			state = (state * 1103515245 + 12345) & 0x7fffffff
			return state % n
		}
	}

	it('holds over random edits and ranges', () => {
		const random = makeRandom(1)
		// A tiny alphabet so edits frequently insert text matching their surroundings — that overlap is
		// what makes an edit ambiguous, and the ambiguous cases are the ones that have had bugs.
		const alphabet = 'abc '

		for (let i = 0; i < 5000; i++) {
			const oldText = Array.from({ length: random(20) }, () => alphabet[random(4)]).join('')
			const at = random(oldText.length + 1)
			const removed = random(oldText.length - at + 1)
			const inserted = Array.from({ length: random(5) }, () => alphabet[random(4)]).join('')
			const newText = oldText.slice(0, at) + inserted + oldText.slice(at + removed)
			if (oldText === newText) continue

			const a = random(oldText.length + 1)
			const b = random(oldText.length + 1)
			const range = { from: Math.min(a, b), to: Math.max(a, b) }

			const mapped = mapTextRange(range, oldText, newText)
			const context = JSON.stringify({ oldText, newText, at, removed, inserted, range, mapped })

			// Always a well-formed range inside the new text.
			expect(mapped.from, context).toBeLessThanOrEqual(mapped.to)
			expect(mapped.from, context).toBeGreaterThanOrEqual(0)
			expect(mapped.to, context).toBeLessThanOrEqual(newText.length)

			// A range only ever grows by absorbing an edit that happened inside it. This is asserted
			// against the edit actually applied above, not the one the diff infers — an ambiguous edit
			// can be misattributed, and checking against the inferred edit would make this vacuous.
			const grew = mapped.to - mapped.from > range.to - range.from
			if (grew) {
				expect(at, context).toBeGreaterThanOrEqual(range.from)
				expect(at + removed, context).toBeLessThanOrEqual(range.to)
			}
		}
	})
})
