import { TLTextShape } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('paste text measurement alignment', () => {
	async function pasteText(text: string, html?: string) {
		const point = editor.getViewportPageBounds().center
		await defaultHandleExternalTextContent(editor, { point, text, html })
		const shapes = editor.getCurrentPageShapes().filter((s) => s.type === 'text') as TLTextShape[]
		expect(shapes.length).toBeGreaterThan(0)
		return shapes[shapes.length - 1]
	}

	it('uses the same measurement html for paste and shape geometry (plain text)', async () => {
		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')
		const shape = await pasteText('Hello world')

		// Collect the html strings passed to measureHtml during paste
		const pasteHtmlCalls = spy.mock.calls.map((c) => c[0])
		spy.mockClear()

		// Now trigger the shape's geometry computation (which also calls measureHtml)
		editor.getShapeGeometry(shape)
		const geometryHtmlCalls = spy.mock.calls.map((c) => c[0])

		// The paste measurement html should match the geometry measurement html
		expect(pasteHtmlCalls[0]).toBe(geometryHtmlCalls[0])
	})

	it('uses the same measurement html for paste and shape geometry (html text)', async () => {
		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')
		const shape = await pasteText('Hello world', '<p>Hello <strong>world</strong></p>')

		const pasteHtmlCalls = spy.mock.calls.map((c) => c[0])
		spy.mockClear()

		editor.getShapeGeometry(shape)
		const geometryHtmlCalls = spy.mock.calls.map((c) => c[0])

		expect(pasteHtmlCalls[0]).toBe(geometryHtmlCalls[0])
	})

	it('uses the same measurement html for paste and shape geometry (multiline text)', async () => {
		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')
		const shape = await pasteText('Line one\nLine two\nLine three')

		const pasteHtmlCalls = spy.mock.calls.map((c) => c[0])
		spy.mockClear()

		editor.getShapeGeometry(shape)
		const geometryHtmlCalls = spy.mock.calls.map((c) => c[0])

		expect(pasteHtmlCalls[0]).toBe(geometryHtmlCalls[0])
	})

	it('uses the same measurement html for paste and shape geometry (multiline html)', async () => {
		const spy = vi.spyOn(editor.textMeasure, 'measureHtml')
		const shape = await pasteText('Line one\nLine two', '<p>Line one</p><p>Line two</p>')

		const pasteHtmlCalls = spy.mock.calls.map((c) => c[0])
		spy.mockClear()

		editor.getShapeGeometry(shape)
		const geometryHtmlCalls = spy.mock.calls.map((c) => c[0])

		expect(pasteHtmlCalls[0]).toBe(geometryHtmlCalls[0])
	})

	it('creates a text shape at the correct position for pasted text', async () => {
		const center = editor.getViewportPageBounds().center
		const shape = await pasteText('Hello')
		const bounds = editor.getShapeGeometry(shape).bounds

		// The shape should be centered on the paste point
		const shapeCenterX = shape.x + bounds.w / 2
		const shapeCenterY = shape.y + bounds.h / 2
		expect(Math.abs(shapeCenterX - center.x)).toBeLessThanOrEqual(1)
		expect(Math.abs(shapeCenterY - center.y)).toBeLessThanOrEqual(1)
	})

	it('detects multiline correctly from rich text content', async () => {
		// Single line should be auto-sized with middle alignment
		const singleLine = await pasteText('Hello world')
		expect(singleLine.props.autoSize).toBe(true)
		expect(singleLine.props.textAlign).toBe('middle')

		// Multi-line should align start
		const multiLine = await pasteText('Line one\nLine two')
		expect(multiLine.props.textAlign).toBe('start')
	})
})
