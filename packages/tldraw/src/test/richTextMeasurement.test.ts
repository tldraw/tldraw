import { TLMeasureTextOpts, TLRichText } from '@tldraw/editor'
import { renderHtmlFromRichTextForMeasurement } from '../lib/utils/text/richText'
import { TestEditor } from './TestEditor'

// Pins the agreement between what renderHtmlFromRichTextForMeasurement emits and what the
// injected measurer's html transform understands. Block structures (headings, lists, hard
// breaks, empty paragraphs) must measure as the same number of lines as their plain-text
// equivalent — if the serializer's output shape changes, this breaks loudly instead of
// silently mis-sizing every headless/test measurement.

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor.dispose()
})

const opts: TLMeasureTextOpts = {
	fontStyle: 'normal',
	fontWeight: 'normal',
	fontFamily: 'tldraw_sans',
	fontSize: 24,
	lineHeight: 1.35,
	maxWidth: null,
	padding: '0px',
}

function measureRichText(richText: TLRichText) {
	return editor.textMeasure.measureHtml(
		renderHtmlFromRichTextForMeasurement(editor, richText),
		opts
	)
}

function paragraph(text: string) {
	return { type: 'paragraph', content: text === '' ? [] : [{ type: 'text', text }] }
}

describe('rich text measurement through the real serializer', () => {
	it('measures two paragraphs as two lines', () => {
		const size = measureRichText({ type: 'doc', content: [paragraph('one'), paragraph('two')] })
		expect(size).toEqual(editor.textMeasure.measureText('one\ntwo', opts))
	})

	it('measures a heading and a paragraph as two lines', () => {
		const size = measureRichText({
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
				paragraph('body'),
			],
		})
		expect(size).toEqual(editor.textMeasure.measureText('Title\nbody', opts))
	})

	it('measures bullet list items as separate lines', () => {
		const size = measureRichText({
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [
						{ type: 'listItem', content: [paragraph('first')] },
						{ type: 'listItem', content: [paragraph('second')] },
					],
				},
			],
		})
		expect(size).toEqual(editor.textMeasure.measureText('first\nsecond', opts))
	})

	it('measures a hard break as a line break', () => {
		const size = measureRichText({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'line1' },
						{ type: 'hardBreak' },
						{ type: 'text', text: 'line2' },
					],
				},
			],
		})
		expect(size).toEqual(editor.textMeasure.measureText('line1\nline2', opts))
	})

	it('preserves empty paragraphs as blank lines', () => {
		const size = measureRichText({
			type: 'doc',
			content: [paragraph('a'), paragraph(''), paragraph('b')],
		})
		expect(size).toEqual(editor.textMeasure.measureText('a\n\nb', opts))
	})
})
