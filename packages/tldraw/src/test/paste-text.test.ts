import { TLTextShape, toRichText } from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../lib/shapes/shared/default-shape-constants'
import {
	renderHtmlFromRichTextForMeasurement,
	renderRichTextFromHTML,
} from '../lib/utils/text/richText'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

function getCreatedTextShape(): TLTextShape {
	const shapes = editor.getCurrentPageShapes().filter((s) => s.type === 'text') as TLTextShape[]
	expect(shapes.length).toBe(1)
	return shapes[0]
}

describe('Pasting text content', () => {
	it('creates text whose rendered bounds match text geometry (plain text)', async () => {
		await defaultHandleExternalTextContent(editor, { text: 'Hello world' })

		const shape = getCreatedTextShape()
		const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)
		const measurement = editor.textMeasure.measureHtml(html, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: FONT_SIZES[shape.props.size],
			maxWidth: null,
		})

		expect(shape.props.autoSize).toBe(true)
		expect(shape.props.textAlign).toBe('middle')
		expect(editor.getShapePageBounds(shape.id)!.w).toBe(Math.max(16, measurement.w + 1))
	})

	it('creates text whose rendered bounds match text geometry (multi-line)', async () => {
		await defaultHandleExternalTextContent(editor, { text: 'Hello\nworld' })

		const shape = getCreatedTextShape()
		const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)
		const measurement = editor.textMeasure.measureHtml(html, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: FONT_SIZES[shape.props.size],
			maxWidth: null,
		})

		expect(shape.props.autoSize).toBe(true)
		expect(shape.props.textAlign).toBe('start')
		expect(editor.getShapePageBounds(shape.id)!.w).toBe(Math.max(16, measurement.w + 1))
	})

	it('plain text and HTML paste produce the same shape dimensions', async () => {
		await defaultHandleExternalTextContent(editor, { text: 'Hello world' })
		const plainShape = getCreatedTextShape()
		const plainBounds = editor.getShapePageBounds(plainShape.id)!

		editor.deleteShapes([plainShape.id])

		await defaultHandleExternalTextContent(editor, {
			text: 'Hello world',
			html: '<p>Hello world</p>',
		})
		const richShape = getCreatedTextShape()
		const richBounds = editor.getShapePageBounds(richShape.id)!

		expect(richBounds.w).toBe(plainBounds.w)
		expect(richBounds.h).toBe(plainBounds.h)
	})

	it('measures pasted HTML using renderHtmlFromRichTextForMeasurement', async () => {
		const html = '<p><strong>Hello</strong> world</p>'
		const defaultProps = editor.getShapeUtil<TLTextShape>('text').getDefaultProps()
		const expectedRichText = renderRichTextFromHTML(editor, html)
		const expectedHtml = renderHtmlFromRichTextForMeasurement(editor, expectedRichText)

		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')

		await defaultHandleExternalTextContent(editor, { text: 'Hello world', html })

		expect(
			spy.mock.calls.some(
				([actualHtml, opts]) =>
					actualHtml === expectedHtml &&
					opts.fontFamily === FONT_FAMILIES[defaultProps.font] &&
					opts.fontSize === FONT_SIZES[defaultProps.size] &&
					opts.maxWidth === null
			)
		).toBe(true)
	})

	it('re-measures long pasted text with a constrained maxWidth', async () => {
		const viewportWidth = editor.getViewportPageBounds().width
		const minWidth = Math.min(920, Math.max(200, viewportWidth * 0.9))

		const text = 'Hello world '.repeat(80).trim()
		const expectedHtml = renderHtmlFromRichTextForMeasurement(editor, toRichText(text))

		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')

		await defaultHandleExternalTextContent(editor, { text })

		const shape = getCreatedTextShape()
		const calls = spy.mock.calls.filter(([html]) => html === expectedHtml)

		expect(calls.length).toBe(2)
		expect(calls[0][1]).toMatchObject({ maxWidth: null })
		expect(calls[1][1]).toMatchObject({ maxWidth: minWidth })

		expect(shape.props.autoSize).toBe(false)
		expect(shape.props.textAlign).toBe('start')
	})
})
