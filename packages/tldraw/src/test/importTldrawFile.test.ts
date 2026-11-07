import {
	AssetRecordType,
	Box,
	createBindingId,
	createShapeId,
	TLAssetId,
	TLImageShape,
	TldrawOptions,
	TLShape,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultHandleExternalFileContent } from '../lib/defaultExternalContentHandlers'
import { serializeTldrawJson } from '../lib/utils/tldr/file'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let addToast: ReturnType<typeof vi.fn>

function makeOptions() {
	addToast = vi.fn()
	return {
		toasts: { addToast } as any,
		msg: ((key: string, values?: Record<string, unknown>) =>
			values ? `${key} ${JSON.stringify(values)}` : key) as any,
	}
}

function createEditor(options: Partial<TldrawOptions> = {}) {
	editor?.dispose()
	editor = new TestEditor({ options })
	vi.spyOn(editor, 'getAssetForExternalContent').mockImplementation(async (info) => {
		if (info.type !== 'file') return undefined
		return AssetRecordType.create({
			id: info.assetId!,
			type: 'image',
			props: {
				name: info.file.name,
				src: 'https://example.com/uploaded.png',
				w: 100,
				h: 100,
				mimeType: info.file.type,
				isAnimated: false,
			},
		})
	})
}

/** Build a .tldr file from a source editor set up by `setup`. */
async function makeTldrFile(setup: (source: TestEditor) => void) {
	const source = new TestEditor()
	setup(source)
	const json = await serializeTldrawJson(source)
	source.dispose()
	return new File([json], 'test.tldr')
}

async function drop(file: File | File[], point = { x: 500, y: 300 }) {
	const files = Array.isArray(file) ? file : [file]
	await defaultHandleExternalFileContent(editor, { point, files }, makeOptions())
}

function geo(x: number, y: number, w = 100, h = 100): Partial<TLShape> & { type: 'geo' } {
	return { type: 'geo', x, y, props: { w, h } } as any
}

function pageBoundsOf(shapes: TLShape[]) {
	return Box.Common(shapes.map((s) => editor.getShapePageBounds(s)!))
}

beforeEach(() => {
	createEditor()
})

afterEach(() => {
	editor?.dispose()
	vi.restoreAllMocks()
})

describe('dropping a single-page .tldr file', () => {
	it('puts its shapes on the current page, centered on the drop point when that space is free', async () => {
		const file = await makeTldrFile((source) => {
			source.createShapes([geo(0, 0), geo(200, 0)])
		})

		await drop(file, { x: 500, y: 300 })

		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(2)
		expect(editor.getPages()).toHaveLength(1)
		expect([...editor.getSelectedShapeIds()].sort()).toEqual(shapes.map((s) => s.id).sort())
		expect(pageBoundsOf(shapes)).toMatchObject({ x: 350, y: 250, w: 300, h: 100 })
		expect(addToast).not.toHaveBeenCalled()
	})

	it('places its shapes beside existing content when the drop point is occupied', async () => {
		const existingId = createShapeId()
		editor.createShapes([{ ...geo(400, 200, 300, 300), id: existingId }])
		const file = await makeTldrFile((source) => {
			source.createShapes([geo(0, 0)])
		})

		await drop(file, { x: 500, y: 300 })

		const imported = editor.getCurrentPageShapes().filter((s) => s.id !== existingId)
		expect(imported).toHaveLength(1)
		const importedBounds = pageBoundsOf(imported)
		expect(importedBounds.collides(editor.getShapePageBounds(existingId)!)).toBe(false)
		expect(importedBounds).toMatchObject({ x: 800, y: 200 })
	})

	it('moves the camera to show the imported shapes', async () => {
		const file = await makeTldrFile((source) => {
			source.createShapes([geo(0, 0)])
		})
		editor.createShapes([geo(-50, -50, 2000, 2000)])

		await drop(file, { x: 500, y: 300 })
		editor.forceTick(50)

		const imported = editor.getSelectedShapes()
		expect(editor.getViewportPageBounds().contains(pageBoundsOf(imported))).toBe(true)
	})

	it('keeps bindings between the imported shapes', async () => {
		const file = await makeTldrFile((source) => {
			const a = createShapeId('a')
			const b = createShapeId('b')
			const arrow = createShapeId('arrow')
			source.createShapes([
				{ ...geo(0, 0), id: a },
				{ ...geo(300, 0), id: b },
				{ id: arrow, type: 'arrow', x: 100, y: 50 },
			])
			source.createBindings([
				{
					id: createBindingId(),
					type: 'arrow',
					fromId: arrow,
					toId: a,
					props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 } },
				},
				{
					id: createBindingId(),
					type: 'arrow',
					fromId: arrow,
					toId: b,
					props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 } },
				},
			])
		})

		await drop(file)

		const arrow = editor.getCurrentPageShapes().find((s) => s.type === 'arrow')!
		const boundIds = editor
			.getBindingsFromShape(arrow, 'arrow')
			.map((b) => editor.getShape(b.toId)?.type)
		expect(boundIds).toEqual(['geo', 'geo'])
	})

	it('uploads embedded images instead of keeping them as data urls', async () => {
		// The test setup's fetch mock rejects every url it doesn't know, data urls included
		const mockFetch = globalThis.fetch
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) =>
			typeof input === 'string' && input.startsWith('data:')
				? new Response(new Uint8Array([1, 2, 3]))
				: mockFetch(input, init)
		)
		const assetId: TLAssetId = AssetRecordType.createId('img')
		const file = await makeTldrFile((source) => {
			source.createAssets([
				AssetRecordType.create({
					id: assetId,
					type: 'image',
					props: {
						name: 'img.png',
						src: 'data:image/png;base64,iVBORw0KGgo=',
						w: 100,
						h: 100,
						mimeType: 'image/png',
						isAnimated: false,
					},
				}),
			])
			source.createShapes([{ type: 'image', props: { assetId, w: 100, h: 100 } }])
		})

		await drop(file)
		await vi.waitFor(() => {
			expect(editor.getAsset(assetId)?.props.src).toBe('https://example.com/uploaded.png')
		})

		const image = editor.getCurrentPageShapes()[0] as TLImageShape
		expect(image.props.assetId).toBe(assetId)
		expect(editor.getAssetForExternalContent).toHaveBeenCalledTimes(1)
	})

	it('adds the file as a new page when it would go over the shape limit', async () => {
		createEditor({ maxShapesPerPage: 3 })
		editor.createShapes([geo(0, 0), geo(200, 0)])
		const originalPageId = editor.getCurrentPageId()
		const file = await makeTldrFile((source) => {
			source.createShapes([geo(0, 0), geo(200, 0)])
		})

		await drop(file)

		expect(editor.getCurrentPageId()).toBe(originalPageId)
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		const newPage = editor.getPages()[1]
		expect(editor.getPageShapeIds(newPage.id).size).toBe(2)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.imported-pages {"count":1}',
			severity: 'success',
		})
	})
})

describe('dropping a multi-page .tldr file', () => {
	it('adds each page to the document and confirms with a toast', async () => {
		const file = await makeTldrFile((source) => {
			source.updatePage({ id: source.getCurrentPageId(), name: 'First' })
			source.createShapes([geo(0, 0)])
			source.createPage({ name: 'Second' })
			source.setCurrentPage(source.getPages()[1].id)
			source.createShapes([geo(0, 0), geo(200, 0)])
		})
		const originalPageId = editor.getCurrentPageId()

		await drop(file)

		expect(editor.getCurrentPageId()).toBe(originalPageId)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		const pages = editor.getPages()
		expect(pages.map((p) => p.name)).toEqual(['Page 1', 'First', 'Second'])
		expect(editor.getPageShapeIds(pages[1].id).size).toBe(1)
		expect(editor.getPageShapeIds(pages[2].id).size).toBe(2)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.imported-pages {"count":2}',
			severity: 'success',
		})
	})

	it('imports nothing and shows an error when it would go over the page limit', async () => {
		createEditor({ maxPages: 2 })
		const file = await makeTldrFile((source) => {
			source.createShapes([geo(0, 0)])
			source.createPage({ name: 'Second' })
		})

		await drop(file)

		expect(editor.getPages()).toHaveLength(1)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.import-error.title',
			description: 'file-system.import-error.too-many-pages {"max":2}',
			severity: 'error',
		})
	})
})

it('shows an error for a .tldr file that is not a tldraw file', async () => {
	await drop(new File(['nope'], 'broken.tldr'))

	expect(editor.getCurrentPageShapes()).toHaveLength(0)
	expect(addToast).toHaveBeenCalledWith({
		title: 'file-system.import-error.title',
		description: 'file-system.file-open-error.not-a-tldraw-file',
		severity: 'error',
	})
})

describe('dropping several .tldr files at once', () => {
	const onePage = () =>
		makeTldrFile((source) => {
			source.createShapes([geo(0, 0)])
		})
	const twoPages = () =>
		makeTldrFile((source) => {
			source.createShapes([geo(0, 0)])
			source.createPage({ name: 'Second' })
			source.setCurrentPage(source.getPages()[1].id)
			source.createShapes([geo(0, 0)])
		})

	it('places single-page files side by side, selected, in one undo step', async () => {
		editor.markHistoryStoppingPoint('before')

		await drop([await onePage(), await onePage()])

		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(2)
		expect([...editor.getSelectedShapeIds()].sort()).toEqual(shapes.map((s) => s.id).sort())
		const [a, b] = shapes.map((s) => editor.getShapePageBounds(s)!)
		expect(a.collides(b)).toBe(false)

		editor.undo()
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})

	it('adds pages from multi-page files and confirms the total with one toast', async () => {
		await drop([await onePage(), await twoPages(), await twoPages()])

		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(editor.getPages()).toHaveLength(5)
		expect(addToast).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.imported-pages {"count":4}',
			severity: 'success',
		})
	})

	it('imports nothing when the files together would go over the page limit', async () => {
		createEditor({ maxPages: 4 })

		await drop([await onePage(), await twoPages(), await twoPages()])

		expect(editor.getPages()).toHaveLength(1)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.import-error.title',
			description: 'file-system.import-error.too-many-pages {"max":4}',
			severity: 'error',
		})
	})

	it('still imports the good files when one cannot be parsed', async () => {
		await drop([new File(['nope'], 'broken.tldr'), await onePage()])

		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(addToast).toHaveBeenCalledWith({
			title: 'file-system.import-error.title',
			description: 'file-system.file-open-error.not-a-tldraw-file',
			severity: 'error',
		})
	})
})
