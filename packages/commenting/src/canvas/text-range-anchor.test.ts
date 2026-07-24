import { structuredClone } from '@tldraw/utils'
import { createShapeId, toRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import {
	createTextRangeAnchor,
	getShapePlaintext,
	resolveTextRangeAnchor,
} from './text-range-anchor'

function rangeOf(text: string, word: string) {
	const from = text.indexOf(word)
	return { from, to: from + word.length }
}

describe('text-range anchors', () => {
	const shapeId = createShapeId('text-range-anchor')
	const text = 'Select a few words and press the comment button in the toolbar.'
	const sourceRichText = toRichText(text)
	const sourceRange = rangeOf(text, 'comment button')
	const anchor = createTextRangeAnchor(shapeId, sourceRichText, sourceRange)

	function resolveText(currentText: string) {
		const resolved = resolveTextRangeAnchor(anchor, toRichText(currentText))
		return {
			...resolved,
			text: currentText.slice(resolved.from, resolved.to),
		}
	}

	it('captures the source rich text and offsets', () => {
		expect(anchor).toEqual({
			type: 'text-range',
			shapeId,
			source: {
				richText: sourceRichText,
				...sourceRange,
			},
		})
	})

	it('rejects invalid source ranges', () => {
		expect(() =>
			createTextRangeAnchor(shapeId, sourceRichText, { from: -1, to: sourceRange.to })
		).toThrow(RangeError)
		expect(() =>
			createTextRangeAnchor(shapeId, sourceRichText, { from: sourceRange.to, to: sourceRange.from })
		).toThrow(RangeError)
		expect(() =>
			createTextRangeAnchor(shapeId, sourceRichText, {
				from: sourceRange.from,
				to: sourceRange.from,
			})
		).toThrow(RangeError)
		expect(() =>
			createTextRangeAnchor(shapeId, sourceRichText, {
				from: sourceRange.from,
				to: text.length + 1,
			})
		).toThrow(RangeError)
	})

	it('resolves the unchanged source range directly', () => {
		expect(resolveText(text)).toEqual({
			...sourceRange,
			status: 'attached',
			text: 'comment button',
		})
	})

	it('resolves through edits before and inside the range', () => {
		expect(resolveText(`First! ${text}`).text).toBe('comment button')
		expect(resolveText(text.replace('comment button', 'comment toolbar button')).text).toBe(
			'comment toolbar button'
		)
	})

	it('resolves an untouched range through multiple disjoint edits', () => {
		expect(resolveText(`First! ${text} Last!`)).toMatchObject({
			status: 'attached',
			text: 'comment button',
		})
	})

	it('resolves ambiguous boundary edits conservatively', () => {
		expect(resolveText(text.replace('the comment button', 'the ccomment button'))).toMatchObject({
			status: 'ambiguous',
			text: 'comment button',
		})
	})

	it('collapses while the source range is absent', () => {
		const resolved = resolveText('Something else entirely.')
		expect(resolved.from).toBe(resolved.to)
		expect(resolved.status).toBe('collapsed')
	})

	it('recovers exactly when the source text returns', () => {
		const rewritten = resolveText('Something else entirely.')
		expect(rewritten.status).toBe('collapsed')

		expect(resolveText(text)).toEqual({
			...sourceRange,
			status: 'attached',
			text: 'comment button',
		})
	})

	it('never mutates the anchor while resolving different document states', () => {
		const before = structuredClone(anchor)
		resolveText(`First! ${text}`)
		resolveText('Something else entirely.')
		resolveText(text)
		expect(anchor).toEqual(before)
	})

	it('captures the source snapshot by value', () => {
		const mutableRichText = toRichText(text)
		const captured = createTextRangeAnchor(shapeId, mutableRichText, sourceRange)
		mutableRichText.content = []

		expect(getShapePlaintext(captured.source.richText)).toBe(text)
	})
})

describe('getShapePlaintext', () => {
	it('matches the plaintext coordinate space used by the example', () => {
		expect(getShapePlaintext(toRichText('one\ntwo'))).toBe('onetwo')
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
