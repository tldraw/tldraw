import {
	TLExternalContent,
	TLFilesExternalContent,
	TLGeoShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import {
	handlePasteFromClipboardApi,
	handlePasteFromEventClipboardData,
} from '../../lib/ui/hooks/useClipboardEvents'
import { TLDRAW_CUSTOM_PNG_MIME_TYPE } from '../../lib/utils/clipboard'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	// The paste pipeline reads blobs with FileReader, which needs real timers.
	vi.useRealTimers()
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

/**
 * Build a fake ClipboardItem, as returned by navigator.clipboard.read().
 * An Error value makes getType reject for that type, like a failing browser read.
 */
function makeClipboardItem(entries: Record<string, string | Blob | Error>): ClipboardItem {
	return {
		types: Object.keys(entries),
		getType: async (type: string) => {
			const value = entries[type]
			if (value instanceof Error) throw value
			return value instanceof Blob ? value : new Blob([value], { type })
		},
	} as unknown as ClipboardItem
}

/** Build a fake DataTransfer, as found on a native paste event. */
function makeDataTransfer(
	items: Array<
		{ kind: 'file'; type: string; file: File } | { kind: 'string'; type: string; data: string }
	>
): DataTransfer {
	return {
		items: items.map((item) =>
			item.kind === 'file'
				? { kind: 'file', type: item.type, getAsFile: () => item.file }
				: {
						kind: 'string',
						type: item.type,
						getAsString: (callback: (data: string) => void) => callback(item.data),
					}
		),
	} as unknown as DataTransfer
}

function mockPutExternalContent() {
	return vi.spyOn(editor, 'putExternalContent').mockResolvedValue()
}

const pngBlob = () => new Blob(['fake-png-bytes'], { type: 'image/png' })
const pngFile = () => new File(['fake-png-bytes'], 'image.png', { type: 'image/png' })

const TLDRAW_V2_HTML = `<div data-tldraw>${JSON.stringify({
	type: 'application/tldraw',
	kind: 'content',
	version: 2,
	data: { shapes: [], rootShapeIds: [], assets: [], schema: {} },
})}</div>`

describe('pasting files from the clipboard API', () => {
	it('passes html and text sources along with pasted files', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'image/png': pngBlob(),
					'text/html': '<b>hello</b>',
					'text/plain': 'hello',
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.files).toHaveLength(1)
		expect(content.files[0].type).toBe('image/png')
		expect(content.sources).toEqual([
			{ type: 'text', data: '<b>hello</b>', subtype: 'html' },
			{ type: 'text', data: 'hello', subtype: 'text' },
		])
	})

	it('passes text sources along with multiple pasted files', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({ 'image/png': pngBlob() }),
				makeClipboardItem({ 'image/png': pngBlob(), 'text/plain': 'hello' }),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.files).toHaveLength(2)
		expect(content.sources).toEqual([{ type: 'text', data: 'hello', subtype: 'text' }])
	})

	it('passes the paste point through with the files', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'image/png': pngBlob() })],
			point: { x: 100, y: 200 },
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'files', point: { x: 100, y: 200 } })
	})

	it('passes empty sources when only an image is on the clipboard', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'image/png': pngBlob() })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'files', sources: [] })
	})

	it('still prioritizes files over tldraw content, but includes it as a source', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'image/png': pngBlob(),
					'text/html': TLDRAW_V2_HTML,
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.sources).toMatchObject([{ type: 'tldraw' }])
	})

	it('prefers the tldraw custom png format over plain png', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					[TLDRAW_CUSTOM_PNG_MIME_TYPE]: new Blob(['tldraw-png-bytes'], {
						type: TLDRAW_CUSTOM_PNG_MIME_TYPE,
					}),
					'image/png': pngBlob(),
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.files).toHaveLength(1)
		// the custom format blob is rewritten to a canonical png mime type
		expect(content.files[0].type).toBe('image/png')
		expect(await content.files[0].text()).toBe('tldraw-png-bytes')
	})

	it('falls back to the next image format when a blob comes back empty', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					[TLDRAW_CUSTOM_PNG_MIME_TYPE]: new Blob([], { type: TLDRAW_CUSTOM_PNG_MIME_TYPE }),
					'image/png': pngBlob(),
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.files).toHaveLength(1)
		expect(await content.files[0].text()).toBe('fake-png-bytes')
	})

	it('uses fallback files when the clipboard API only returns text for them', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/plain': 'image.png' })],
			fallbackFiles: [pngFile()],
			clipboardPasteSource: 'native-event',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.files[0].name).toBe('image.png')
		// the text thing was just the file name, so it is not kept as a source
		expect(content.sources).toEqual([])
	})

	it('uses fallback files when the clipboard API returns nothing for them', async () => {
		// Files pasted in Safari from the file system have no clipboard item types at all
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({})],
			fallbackFiles: [pngFile()],
			clipboardPasteSource: 'native-event',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.files[0].name).toBe('image.png')
	})

	it('still pastes files when reading another clipboard type fails', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'image/png': pngBlob(),
					'text/html': new Error('boom'),
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.sources).toMatchObject([{ type: 'error' }])
	})

	it('throws when pasting more files than maxFilesAtOnce', async () => {
		editor.dispose()
		editor = new TestEditor({ options: { maxFilesAtOnce: 2 } })
		const spy = mockPutExternalContent()

		await expect(
			handlePasteFromClipboardApi({
				editor,
				clipboardItems: [
					makeClipboardItem({ 'image/png': pngBlob() }),
					makeClipboardItem({ 'image/png': pngBlob() }),
					makeClipboardItem({ 'image/png': pngBlob() }),
				],
				clipboardPasteSource: 'clipboard-read',
			})
		).rejects.toThrow('Too many files')

		expect(spy).not.toHaveBeenCalled()
	})
})

describe('pasting non-file content from the clipboard API', () => {
	it('pastes tldraw content over html and text', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/html': TLDRAW_V2_HTML, 'text/plain': 'hello' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({
			type: 'tldraw',
			content: { shapes: [] },
		})
	})

	it('pastes excalidraw content found in plain text', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'text/plain': JSON.stringify({ type: 'excalidraw/clipboard', elements: [] }),
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({
			type: 'excalidraw',
			content: { type: 'excalidraw/clipboard' },
		})
	})

	it('pastes html alongside plain text as a text shape with html', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/html': '<b>hello</b>', 'text/plain': 'hello' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({
			type: 'text',
			text: 'hello',
			html: '<b>hello</b>',
		})
	})

	it('pastes html on its own as stripped text', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/html': '<b>hello</b>' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'text', text: 'hello' })
	})

	it('pastes html containing a single link as a url', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({ 'text/html': '<a href="https://example.com/">Example</a>' }),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'url', url: 'https://example.com/' })
	})

	it('pastes a uri-list as a url', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/uri-list': 'https://example.com/' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'url', url: 'https://example.com/' })
	})

	it('pastes a plain text url as a url', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/plain': 'https://example.com/' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'url', url: 'https://example.com/' })
	})

	it('pastes svg text as svg', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({ 'text/plain': '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'svg-text' })
	})

	it('pastes plain text as text', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/plain': 'hello' })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'text', text: 'hello' })
	})
})

describe('pasting from native event clipboard data', () => {
	it('passes html and text sources along with pasted files', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromEventClipboardData(
			editor,
			makeDataTransfer([
				{ kind: 'file', type: 'image/png', file: pngFile() },
				{ kind: 'string', type: 'text/html', data: '<b>hello</b>' },
				{ kind: 'string', type: 'text/plain', data: 'hello' },
			])
		)

		expect(spy).toHaveBeenCalledTimes(1)
		const content = spy.mock.calls[0][0] as TLFilesExternalContent
		expect(content.type).toBe('files')
		expect(content.files[0].name).toBe('image.png')
		expect(content.sources).toEqual([
			{ type: 'text', data: '<b>hello</b>', subtype: 'html' },
			{ type: 'text', data: 'hello', subtype: 'text' },
		])
	})

	it('pastes plain text as text', async () => {
		const spy = mockPutExternalContent()

		await handlePasteFromEventClipboardData(
			editor,
			makeDataTransfer([{ kind: 'string', type: 'text/plain', data: 'hello' }])
		)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'text', text: 'hello' })
	})

	it('does nothing while editing a shape', async () => {
		const spy = mockPutExternalContent()
		const editingSpy = vi
			.spyOn(editor, 'getEditingShapeId')
			.mockReturnValue(editor.testShapeID('editing'))

		await handlePasteFromEventClipboardData(
			editor,
			makeDataTransfer([{ kind: 'string', type: 'text/plain', data: 'hello' }])
		)

		expect(spy).not.toHaveBeenCalled()
		editingSpy.mockRestore()
	})
})

describe('sources in external content handlers and callbacks', () => {
	it('provides sources to a registered files handler', async () => {
		const handled: TLExternalContent<unknown>[] = []
		editor.registerExternalContentHandler('files', async (content) => {
			handled.push(content)
		})

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'image/png': pngBlob(),
					'text/html': '<span data-custom="true">hello</span>',
					'text/plain': 'hello',
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(handled).toHaveLength(1)
		const content = handled[0] as TLFilesExternalContent
		const htmlSource = content.sources?.find((s) => s.type === 'text' && s.subtype === 'html')
		expect(htmlSource).toEqual({
			type: 'text',
			data: '<span data-custom="true">hello</span>',
			subtype: 'html',
		})
	})

	it('provides sources to onBeforePasteFromClipboard for file pastes', async () => {
		const hookFn = vi.fn(() => undefined)
		editor.dispose()
		editor = new TestEditor({ options: { onBeforePasteFromClipboard: hookFn } })
		mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [
				makeClipboardItem({
					'image/png': pngBlob(),
					'text/html': '<b>hello</b>',
					'text/plain': 'hello',
				}),
			],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(hookFn).toHaveBeenCalledWith(
			expect.objectContaining({
				editor,
				source: 'clipboard-read',
				content: expect.objectContaining({
					type: 'files',
					sources: [
						{ type: 'text', data: '<b>hello</b>', subtype: 'html' },
						{ type: 'text', data: 'hello', subtype: 'text' },
					],
				}),
			})
		)
	})

	it('cancels a file paste when onBeforePasteFromClipboard returns false', async () => {
		editor.dispose()
		editor = new TestEditor({ options: { onBeforePasteFromClipboard: () => false } })
		const spy = mockPutExternalContent()

		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'image/png': pngBlob() })],
			clipboardPasteSource: 'clipboard-read',
		})

		expect(spy).not.toHaveBeenCalled()
	})
})

describe('pasting a link over a shape', () => {
	const URL = 'https://example.com/'

	function createGeo(id: TLShapeId, isLocked = false) {
		editor.createShape<TLGeoShape>({
			id,
			type: 'geo',
			x: 100,
			y: 100,
			isLocked,
			props: { w: 200, h: 200, fill: 'solid' },
		})
	}

	async function pasteText(text: string) {
		await handlePasteFromClipboardApi({
			editor,
			clipboardItems: [makeClipboardItem({ 'text/plain': text })],
			clipboardPasteSource: 'clipboard-read',
		})
	}

	it('sets the link on the shape under the pointer instead of creating a bookmark', async () => {
		const spy = mockPutExternalContent()
		const id = createShapeId()
		createGeo(id)
		editor.pointerMove(200, 200)

		await pasteText(URL)

		expect(spy).not.toHaveBeenCalled()
		expect(editor.getShape<TLGeoShape>(id)!.props.url).toBe(URL)
	})

	it('replaces a link the shape already has', async () => {
		mockPutExternalContent()
		const id = createShapeId()
		createGeo(id)
		editor.updateShape<TLGeoShape>({ id, type: 'geo', props: { url: 'https://tldraw.dev/' } })
		editor.pointerMove(200, 200)

		await pasteText(URL)

		expect(editor.getShape<TLGeoShape>(id)!.props.url).toBe(URL)
	})

	it('creates a bookmark when the pointer is not over a shape', async () => {
		const spy = mockPutExternalContent()
		createGeo(createShapeId())
		editor.pointerMove(500, 500)

		await pasteText(URL)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][0]).toMatchObject({ type: 'url', url: URL })
	})

	it('creates a bookmark when the shape under the pointer is locked', async () => {
		const spy = mockPutExternalContent()
		const id = createShapeId()
		createGeo(id, true)
		editor.pointerMove(200, 200)

		await pasteText(URL)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(editor.getShape<TLGeoShape>(id)!.props.url).toBe('')
	})

	it('creates a bookmark when the shape under the pointer is an embed', async () => {
		const spy = mockPutExternalContent()
		const id = createShapeId()
		const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
		editor.createShape({
			id,
			type: 'embed',
			x: 100,
			y: 100,
			props: { w: 200, h: 200, url: embedUrl },
		})
		editor.pointerMove(200, 200)

		await pasteText(URL)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(editor.getShape(id)!.props).toMatchObject({ url: embedUrl })
	})

	it('creates bookmarks when several links are pasted at once', async () => {
		const spy = mockPutExternalContent()
		const id = createShapeId()
		createGeo(id)
		editor.pointerMove(200, 200)

		await pasteText(`${URL} https://tldraw.dev/`)

		expect(spy).toHaveBeenCalledTimes(2)
		expect(editor.getShape<TLGeoShape>(id)!.props.url).toBe('')
	})
})
