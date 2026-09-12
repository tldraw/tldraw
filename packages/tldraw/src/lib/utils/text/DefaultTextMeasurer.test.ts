import { computed, DomTextMeasurer, toRichText } from '@tldraw/editor'
import * as layout from '@tldraw/rich-text-layout'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { allDefaultFontFaces } from '../../shapes/shared/defaultFonts'
import * as adapter from './createTldrawTextMeasurer'
import { createDefaultTextMeasurer } from './DefaultTextMeasurer'

const fake = layout.createFakeMeasureContext({ advance: 0.5, ascent: 0.8, descent: 0.2 })
const opts = {
	fontFamily: "'tldraw_sans', sans-serif",
	fontSize: 20,
	fontWeight: 'normal',
	fontStyle: 'normal',
	lineHeight: 1.35,
	padding: '0px',
	maxWidth: null,
	richText: toRichText('hello'),
}
let editor: TestEditor
let fonts: FontFaceSet
const originalFonts = document.fonts

beforeAll(async () => {
	await layout.installMeasureContext(fake)
})

beforeEach(() => {
	const faces = allDefaultFontFaces.map((font) => ({
		...font,
		weight: font.weight ?? 'normal',
		style: font.style ?? 'normal',
		status: 'loaded',
	}))
	fonts = Object.assign(new EventTarget(), {
		status: 'loaded',
		check: vi.fn(() => true),
		add: vi.fn(),
		delete: vi.fn(),
		[Symbol.iterator]: () => faces[Symbol.iterator](),
	}) as unknown as FontFaceSet
	Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
	vi.spyOn(layout, 'createCanvasMeasureContext').mockReturnValue(fake)
	vi.spyOn(layout, 'installMeasureContext').mockResolvedValue()
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
		new DOMRect(0, 0, 123, 45)
	)
})

afterEach(() => {
	editor?.dispose()
	vi.restoreAllMocks()
	Object.defineProperty(document, 'fonts', { configurable: true, value: originalFonts })
})

function createEditor() {
	editor = new TestEditor({ textMeasurer: createDefaultTextMeasurer })
	vi.spyOn(editor.fonts, 'ensureFontIsLoaded').mockResolvedValue()
	return editor
}

async function waitForNative() {
	await vi.waitFor(() => expect(editor.textMeasure.measureHtml('', opts).w).toBe(50))
}

describe('default text measurement', () => {
	it('uses DOM during initialization, then invalidates cached measurements without replacing the editor', async () => {
		createEditor()
		const size = computed('text size', () => editor.textMeasure.measureHtml('<p>hello</p>', opts))
		expect(size.get().w).toBe(123)
		await waitForNative()
		expect(size.get()).toEqual({ x: 0, y: 0, w: 50, h: 27, scrollWidth: 0 })
		expect(editor.isDisposed).toBe(false)
	})

	it('keeps DOM available if pretext initialization fails', async () => {
		vi.mocked(layout.installMeasureContext).mockRejectedValue(new Error('Unavailable'))
		createEditor()
		await vi.waitFor(() => expect(layout.installMeasureContext).toHaveBeenCalled())
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
	})

	it('falls back when canvas is unavailable', async () => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null)
		createEditor()
		await Promise.resolve()
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
		expect(layout.installMeasureContext).not.toHaveBeenCalled()
	})

	it('preserves request order and batches unsupported HTML and scripts through the DOM', async () => {
		createEditor()
		await waitForNative()
		const requests = [
			{ html: '<p>hello</p>', opts },
			{ html: '<table><tr><td>custom</td></tr></table>', opts: { ...opts, richText: undefined } },
			{ html: '<p>你好</p>', opts: { ...opts, richText: toRichText('你好') } },
			{ html: '<p>hello</p>', opts },
		]
		const batch = vi.spyOn(DomTextMeasurer.prototype, 'measureHtmlBatch')
		expect(editor.textMeasure.measureHtmlBatch(requests).map((size) => size.w)).toEqual([
			50, 123, 123, 50,
		])
		expect(batch).toHaveBeenLastCalledWith([requests[1], requests[2]])
	})

	it('uses DOM for custom styles, extensions, and unsupported rich text', async () => {
		createEditor()
		await waitForNative()
		expect(
			editor.textMeasure.measureHtml('', { ...opts, otherStyles: { 'font-size': '40px' } }).w
		).toBe(123)
		expect(
			editor.textMeasure.measureHtml('', {
				...opts,
				richText: { type: 'doc', content: [{ type: 'mention', attrs: { label: 'Ada' } }] },
			}).w
		).toBe(123)
		expect(editor.textMeasure.measureText('مرحبا', opts).w).toBe(123)
		vi.spyOn(editor, 'getTextOptions').mockReturnValue({ tipTapConfig: { extensions: [] } })
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
	})

	it('does not cache fallback widths for a missing font or a failed bundled font', async () => {
		createEditor()
		await waitForNative()
		expect(
			editor.textMeasure.measureHtml('<p>hello</p>', { ...opts, fontFamily: 'MissingFont' }).w
		).toBe(123)
		const firstFont = [...fonts][0]
		Object.defineProperty(firstFont, 'status', { value: 'error' })
		fonts.dispatchEvent(new Event('loadingerror'))
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
	})

	it('invalidates native font caches when fonts load and falls back during loading', async () => {
		const create = vi.spyOn(adapter, 'createTldrawTextMeasurer')
		createEditor()
		await waitForNative()
		const size = computed('text size', () => editor.textMeasure.measureHtml('', opts))
		expect(size.get().w).toBe(50)
		Object.defineProperty(fonts, 'status', { configurable: true, value: 'loading' })
		fonts.dispatchEvent(new Event('loading'))
		expect(size.get().w).toBe(123)
		const callsBeforeReload = create.mock.calls.length
		Object.defineProperty(fonts, 'status', { configurable: true, value: 'loaded' })
		fonts.dispatchEvent(new Event('loadingdone'))
		expect(size.get().w).toBe(50)
		expect(create).toHaveBeenCalledTimes(callsBeforeReload + 1)
	})

	it('falls back for a failing request without disabling subsequent native measurements', async () => {
		createEditor()
		await waitForNative()
		vi.mocked(layout.createCanvasMeasureContext).mockImplementationOnce(() => {
			throw new Error('Bad font')
		})
		fonts.dispatchEvent(new Event('loadingdone'))
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(50)
	})

	it('does not initialize a disposed editor and removes font listeners', async () => {
		const remove = vi.spyOn(fonts, 'removeEventListener')
		createEditor()
		editor.dispose()
		await Promise.resolve()
		expect(layout.installMeasureContext).not.toHaveBeenCalled()
		expect(remove.mock.calls.map(([event]) => event)).toEqual([
			'loading',
			'loadingdone',
			'loadingerror',
		])
	})

	it('supports explicit DOM measurement', () => {
		editor = new TestEditor({ textMeasurer: 'dom' })
		expect(editor.textMeasure.injected).toBeNull()
		expect(editor.textMeasure.measureHtml('<p>hello</p>', opts).w).toBe(123)
	})
})

it('serializes HTML only for unsupported rich text and preserves mixed batch order', async () => {
	createEditor()
	await waitForNative()
	const latinHtml = vi.fn(() => '<p>hello</p>')
	const fallbackHtml = vi.fn(() => '<p>你好</p>')
	const latin = { richText: toRichText('hello'), html: latinHtml }
	const fallback = { richText: toRichText('你好'), html: fallbackHtml }
	expect(editor.textMeasure.measureRichText(latin, opts).w).toBe(50)
	const batch = vi.spyOn(DomTextMeasurer.prototype, 'measureHtmlBatch')
	expect(
		editor.textMeasure
			.measureRichTextBatch([
				{ request: latin, opts },
				{ request: fallback, opts },
				{ request: latin, opts },
			])
			.map(({ w }) => w)
	).toEqual([50, 123, 50])
	expect(latinHtml).not.toHaveBeenCalled()
	expect(fallbackHtml).toHaveBeenCalledTimes(1)
	expect(batch).toHaveBeenCalledTimes(1)
	expect(batch.mock.calls[0][0]).toHaveLength(1)
})

it('releases owned measurement contexts after font changes and disposal', async () => {
	const release = vi.spyOn(layout, 'releaseMeasureContext')
	createEditor()
	await waitForNative()
	fonts.dispatchEvent(new Event('loadingdone'))
	expect(release).toHaveBeenCalledTimes(1)
	editor.textMeasure.measureHtml('', opts)
	editor.dispose()
	expect(release).toHaveBeenCalledTimes(3)
})
