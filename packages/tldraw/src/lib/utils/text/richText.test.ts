import { TLRichText, toRichText } from '@tldraw/editor'
import { isEmptyRichText } from './richText'

describe('isEmptyRichText', () => {
	it('treats a paragraph with no content key as empty (interactive editor output)', () => {
		expect(isEmptyRichText(toRichText(''))).toBe(true)
	})

	it('treats a paragraph with an empty content array as empty (programmatic authoring)', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [{ type: 'paragraph', attrs: { dir: 'auto' }, content: [] }],
		}
		expect(isEmptyRichText(richText)).toBe(true)
	})

	it('treats a paragraph with text as non-empty', () => {
		expect(isEmptyRichText(toRichText('Hello'))).toBe(false)
	})

	it('treats multiple paragraphs as non-empty', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [] },
				{ type: 'paragraph', content: [] },
			],
		}
		expect(isEmptyRichText(richText)).toBe(false)
	})
})
