import { toRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { diffText, mapTextRange, richTextToPlaintext } from './text-range-tracking'

/** Map a range through the edit that turns `oldText` into `newText`, the way tracking does. */
function remap(oldText: string, newText: string, range: { from: number; to: number }) {
	const edit = diffText(oldText, newText)
	return edit ? mapTextRange(range, edit) : range
}

/** The range of the first occurrence of `word` in `text`. */
function rangeOf(text: string, word: string) {
	const from = text.indexOf(word)
	return { from, to: from + word.length }
}

describe('richTextToPlaintext', () => {
	it('concatenates text nodes without separating blocks', () => {
		expect(richTextToPlaintext(toRichText('one\ntwo'))).toBe('onetwo')
	})

	it('handles empty paragraphs and marked text', () => {
		expect(richTextToPlaintext(toRichText(''))).toBe('')
		expect(
			richTextToPlaintext({
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
})

describe('mapTextRange', () => {
	const text = 'Select a few words and press the comment button in the toolbar.'
	const commented = rangeOf(text, 'comment button')

	it('leaves a range alone when the edit is after it', () => {
		const edited = text.replace('the toolbar', 'the rich text toolbar')
		const mapped = remap(text, edited, commented)
		expect(mapped).toEqual(commented)
		expect(edited.slice(mapped.from, mapped.to)).toBe('comment button')
	})

	it('shifts a range when text is inserted before it', () => {
		const edited = 'First! ' + text
		const mapped = remap(text, edited, commented)
		expect(mapped).toEqual({ from: commented.from + 7, to: commented.to + 7 })
		expect(edited.slice(mapped.from, mapped.to)).toBe('comment button')
	})

	it('shifts a range back when text is deleted before it', () => {
		const edited = text.replace('Select a few words and press', 'Press')
		const mapped = remap(text, edited, commented)
		expect(edited.slice(mapped.from, mapped.to)).toBe('comment button')
	})

	it('grows to include text typed inside the range', () => {
		const edited = text.replace('comment button', 'comment toolbar button')
		const mapped = remap(text, edited, commented)
		expect(edited.slice(mapped.from, mapped.to)).toBe('comment toolbar button')
	})

	it('leaves out text typed at either boundary of the range', () => {
		const before = text.replace('the comment button', 'the big comment button')
		const mappedBefore = remap(text, before, commented)
		expect(before.slice(mappedBefore.from, mappedBefore.to)).toBe('comment button')

		const after = text.replace('comment button in', 'comment button bar in')
		const mappedAfter = remap(text, after, commented)
		expect(after.slice(mappedAfter.from, mappedAfter.to)).toBe('comment button')
	})

	it('shrinks to what survives when part of the range is deleted', () => {
		// Deleting "button" leaves the range over "comment " — the space was inside it all along.
		const edited = text.replace('comment button', 'comment')
		const mapped = remap(text, edited, commented)
		expect(edited.slice(mapped.from, mapped.to)).toBe('comment ')
	})

	it('drops a rewritten word out of the range and keeps the rest', () => {
		// "comment" was replaced, so it leaves the range; " button" survives and stays in it.
		const edited = text.replace('comment button', 'toolbar button')
		const mapped = remap(text, edited, commented)
		expect(edited.slice(mapped.from, mapped.to)).toBe(' button')
	})

	it('collapses when the whole range is rewritten', () => {
		const edited = text.replace('comment button', 'shiny new thing')
		const mapped = remap(text, edited, commented)
		expect(mapped.from).toBe(mapped.to)
	})

	it('never grows a range beyond text it already covered', () => {
		// Retyping the whole shape collapses the range, and undoing that must not balloon it back
		// out over the restored text — an anchor that grew on every edit would end up highlighting
		// passages nobody commented on.
		const retyped = 'Something else entirely.'
		const collapsed = remap(text, retyped, commented)
		expect(collapsed.from).toBe(collapsed.to)

		const undone = remap(retyped, text, collapsed)
		expect(undone.from).toBe(undone.to)
	})

	it('collapses when the whole range is deleted', () => {
		const edited = text.replace('the comment button ', 'the ')
		const mapped = remap(text, edited, commented)
		expect(mapped.from).toBe(mapped.to)
	})

	it('never lets the range end before it starts', () => {
		const edited = 'Nothing in common at all.'
		const mapped = remap(text, edited, commented)
		expect(mapped.to).toBeGreaterThanOrEqual(mapped.from)
	})

	it('round-trips a range when an edit is undone', () => {
		const edited = 'First! ' + text
		const mapped = remap(text, edited, commented)
		expect(remap(edited, text, mapped)).toEqual(commented)
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
		const alphabet = 'abcde '

		for (let i = 0; i < 2000; i++) {
			const oldText = Array.from({ length: random(20) }, () => alphabet[random(6)]).join('')
			const at = random(oldText.length + 1)
			const removed = random(oldText.length - at + 1)
			const inserted = Array.from({ length: random(5) }, () => alphabet[random(6)]).join('')
			const newText = oldText.slice(0, at) + inserted + oldText.slice(at + removed)

			const a = random(oldText.length + 1)
			const b = random(oldText.length + 1)
			const range = { from: Math.min(a, b), to: Math.max(a, b) }

			const edit = diffText(oldText, newText)
			if (!edit) continue
			const mapped = mapTextRange(range, edit)
			const context = JSON.stringify({ oldText, newText, range, edit, mapped })

			// Always a well-formed range inside the new text.
			expect(mapped.from, context).toBeLessThanOrEqual(mapped.to)
			expect(mapped.from, context).toBeGreaterThanOrEqual(0)
			expect(mapped.to, context).toBeLessThanOrEqual(newText.length)

			// A range only ever grows by absorbing an edit that fell inside it. An edit that reaches
			// past either boundary leaves it the same length or shorter — that's what stops repeated
			// edits from creeping a comment out over text nobody commented on.
			const grew = mapped.to - mapped.from > range.to - range.from
			if (grew) {
				expect(edit.start, context).toBeGreaterThanOrEqual(range.from)
				expect(edit.oldEnd, context).toBeLessThanOrEqual(range.to)
			}
		}
	})
})
