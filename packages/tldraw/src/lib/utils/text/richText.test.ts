import { TLRichText, toRichText } from '@tldraw/editor'
import { richTextHasMarkEverywhere, setMarkOnRichText } from './richText'

function textWithMarks(text: string, marks: string[]): TLRichText {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text, marks: marks.map((type) => ({ type })) }],
			},
		],
	}
}

describe('richTextHasMarkEverywhere', () => {
	it('returns false when there are no text nodes', () => {
		expect(richTextHasMarkEverywhere({ type: 'doc', content: [] }, 'bold')).toBe(false)
		expect(richTextHasMarkEverywhere(toRichText(''), 'bold')).toBe(false)
	})

	it('returns false when no text node has the mark', () => {
		expect(richTextHasMarkEverywhere(toRichText('hello'), 'bold')).toBe(false)
	})

	it('returns true when every text node has the mark', () => {
		expect(richTextHasMarkEverywhere(textWithMarks('hello', ['bold']), 'bold')).toBe(true)
	})

	it('returns false when only some text nodes have the mark', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'plain' },
					],
				},
			],
		}
		expect(richTextHasMarkEverywhere(richText, 'bold')).toBe(false)
	})

	it('checks across multiple paragraphs', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'italic' }] }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'b', marks: [{ type: 'italic' }] }] },
			],
		}
		expect(richTextHasMarkEverywhere(richText, 'italic')).toBe(true)
		expect(richTextHasMarkEverywhere(richText, 'bold')).toBe(false)
	})
})

describe('setMarkOnRichText', () => {
	it('adds the mark to every text node when enabled', () => {
		const result = setMarkOnRichText(toRichText('hello'), 'bold', true)
		expect(richTextHasMarkEverywhere(result, 'bold')).toBe(true)
	})

	it('removes the mark from every text node when disabled', () => {
		const result = setMarkOnRichText(textWithMarks('hello', ['bold']), 'bold', false)
		expect(richTextHasMarkEverywhere(result, 'bold')).toBe(false)
	})

	it('does not duplicate an existing mark', () => {
		const result = setMarkOnRichText(textWithMarks('hello', ['bold']), 'bold', true)
		const node = (result.content[0] as any).content[0]
		expect(node.marks.filter((m: any) => m.type === 'bold')).toHaveLength(1)
	})

	it('preserves other marks when toggling', () => {
		const result = setMarkOnRichText(textWithMarks('hello', ['bold', 'italic']), 'bold', false)
		const node = (result.content[0] as any).content[0]
		expect(node.marks).toEqual([{ type: 'italic' }])
	})

	it('does not mutate the input', () => {
		const input = toRichText('hello')
		const snapshot = JSON.stringify(input)
		setMarkOnRichText(input, 'bold', true)
		expect(JSON.stringify(input)).toBe(snapshot)
	})

	it('is a no-op for an empty document', () => {
		const input: TLRichText = { type: 'doc', content: [] }
		expect(setMarkOnRichText(input, 'bold', true)).toEqual(input)
	})
})
