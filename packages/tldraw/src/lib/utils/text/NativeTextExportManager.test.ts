import { Mark } from '@tiptap/core'
import { createShapeId } from '@tldraw/editor'
import * as layout from '@tldraw/rich-text-layout'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { createTldrawTextMeasurer } from './createTldrawTextMeasurer'
import { getExportTextMeasurer, setNativeTextExportMeasurer } from './NativeTextExportManager'
import { tipTapDefaultExtensions } from './richText'

let editor: TestEditor
const originalFonts = document.fonts
let fonts: EventTarget
beforeEach(async () => {
	vi.useRealTimers()
	fonts = new EventTarget()
	Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
	await layout.installMeasureContext(layout.createFakeMeasureContext())
	vi.spyOn(layout, 'createCanvasMeasureContext').mockImplementation(() =>
		layout.createFakeMeasureContext()
	)
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
		{} as CanvasRenderingContext2D
	)
	editor = new TestEditor()
})
afterEach(() => {
	editor.dispose()
	vi.restoreAllMocks()
	Object.defineProperty(document, 'fonts', { configurable: true, value: originalFonts })
})

it('uses an explicit layout provider independently of shape measurement', async () => {
	const provider = createTldrawTextMeasurer({ measureContext: layout.createFakeMeasureContext() })
	const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
	const before = editor.textMeasure.measureText('hello', {
		fontFamily: 'sans-serif',
		fontSize: 20,
		fontStyle: 'normal',
		fontWeight: 'normal',
		lineHeight: 1.35,
		padding: '0px',
		maxWidth: null,
	})
	const remove = setNativeTextExportMeasurer(editor, provider)
	expect(await getExportTextMeasurer(editor)).toBe(provider)
	expect(canvas).not.toHaveBeenCalled()
	expect(
		editor.textMeasure.measureText('hello', {
			fontFamily: 'sans-serif',
			fontSize: 20,
			fontStyle: 'normal',
			fontWeight: 'normal',
			lineHeight: 1.35,
			padding: '0px',
			maxWidth: null,
		})
	).toEqual(before)
	remove()
	await expect(getExportTextMeasurer(editor)).rejects.toThrow('explicit layout provider')
})

it('invalidates browser export contexts when fonts load and releases them on disposal', async () => {
	const release = vi.spyOn(layout, 'releaseMeasureContext')
	const first = await getExportTextMeasurer(editor)
	expect(await getExportTextMeasurer(editor)).toBe(first)
	fonts.dispatchEvent(new Event('loadingdone'))
	expect(release).toHaveBeenCalledTimes(1)
	const second = await getExportTextMeasurer(editor)
	expect(second).not.toBe(first)
	editor.dispose()
	expect(release).toHaveBeenCalledTimes(2)
})

it('does not let removal of an older registration remove its replacement', async () => {
	const provider = { layoutRichText: vi.fn() }
	const replacement = { layoutRichText: vi.fn() }
	const remove = setNativeTextExportMeasurer(editor, provider)
	setNativeTextExportMeasurer(editor, replacement)
	remove()
	expect(await getExportTextMeasurer(editor)).toBe(replacement)
})

it('uses HTML export for custom marks without initializing native layout', async () => {
	const customMark = Mark.create({
		name: 'customMark',
		renderHTML: () => ['span', { 'data-custom-mark': 'true', style: 'font-size: 30px' }, 0],
	})
	vi.spyOn(editor, 'getTextOptions').mockReturnValue({
		...editor.getTextOptions(),
		tipTapConfig: { extensions: [...tipTapDefaultExtensions, customMark] },
	})
	const richText = {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text: 'Custom text', marks: [{ type: 'customMark' }] }],
			},
		],
	}
	const id = createShapeId()
	editor.createShape({ id, type: 'text', props: { richText } })
	const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
	canvas.mockClear()
	expect(await getExportTextMeasurer(editor)).toBeNull()
	vi.spyOn(editor.fonts, 'loadRequiredFontsForCurrentPage').mockResolvedValue()
	vi.spyOn(editor.fonts, 'toEmbeddedCssDeclaration').mockResolvedValue('')
	const result = await editor.getSvgString([id], { text: 'native' })
	expect(result?.svg).toContain('<foreignObject')
	expect(result?.svg).toContain('data-custom-mark="true"')
	expect(result?.svg).not.toContain('data-native-text')
	expect(canvas).not.toHaveBeenCalled()
})

it('allows an explicit provider for custom extensions and restores fallback when removed', async () => {
	vi.spyOn(editor, 'getTextOptions').mockReturnValue({
		...editor.getTextOptions(),
		tipTapConfig: { extensions: [...tipTapDefaultExtensions] },
	})
	const provider = { layoutRichText: vi.fn() }
	const remove = setNativeTextExportMeasurer(editor, provider)
	expect(await getExportTextMeasurer(editor)).toBe(provider)
	remove()
	expect(await getExportTextMeasurer(editor)).toBeNull()
})
