import {
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	type TLContent,
} from 'tldraw'
import { LibraryRecordType } from 'tldraw'
import { vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { LibraryItemRecordType, type TLLibraryItem } from '../lib/schema'
import { getItemPreviewUrl } from './item-previews'

let editor: Editor
let source: InMemoryLibrarySource
let item: TLLibraryItem

const content: TLContent = {
	shapes: [],
	bindings: [],
	rootShapeIds: [createShapeId('box')],
	assets: [],
	schema: createTLStore({ shapeUtils: defaultShapeUtils }).schema.serialize(),
}

beforeEach(async () => {
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => document.body,
	})
	source = new InMemoryLibrarySource()
	const library = await source.createLibrary('Kit')
	item = await source.addItem(library.id, { content: { formatVersion: 1, content } })
	URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`)
	URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
	if (!editor.isDisposed) editor.dispose()
})

const blob = new Blob(['png'])
const LIGHT = { darkMode: false, themeId: 'default' as const }
const DARK = { darkMode: true, themeId: 'default' as const }

it('renders an item once for each colour mode', async () => {
	const render = vi.fn(
		async (_editor: Editor, _content: TLContent, _options: { darkMode: boolean }) => blob
	)
	const light = await getItemPreviewUrl(editor, source, item, LIGHT, render)
	expect(await getItemPreviewUrl(editor, source, item, LIGHT, render)).toBe(light)
	const dark = await getItemPreviewUrl(editor, source, item, DARK, render)
	expect(dark).not.toBe(light)
	expect(render.mock.calls.map(([, , options]) => options.darkMode)).toEqual([false, true])
})

it('renders one item at a time', async () => {
	let finishFirst!: (blob: Blob) => void
	const render = vi
		.fn()
		.mockImplementationOnce(() => new Promise<Blob>((resolve) => (finishFirst = resolve)))
		.mockResolvedValueOnce(blob)
	const first = getItemPreviewUrl(editor, source, item, LIGHT, render)
	const second = getItemPreviewUrl(editor, source, item, DARK, render)
	await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1))
	await new Promise((resolve) => setTimeout(resolve, 10))
	expect(render).toHaveBeenCalledTimes(1)
	finishFirst(blob)
	await Promise.all([first, second])
	expect(render).toHaveBeenCalledTimes(2)
})

it('gives no preview for an item that fails to render, and tries it again next time', async () => {
	const render = vi.fn().mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce(blob)
	expect(await getItemPreviewUrl(editor, source, item, LIGHT, render)).toBeNull()
	expect(await getItemPreviewUrl(editor, source, item, LIGHT, render)).toMatch(/^blob:/)
})

it('gives no preview for an item with nothing to draw', async () => {
	expect(await getItemPreviewUrl(editor, source, item, LIGHT, async () => null)).toBeNull()
})

it('lets go of its previews when the editor is disposed', async () => {
	const url = await getItemPreviewUrl(editor, source, item, LIGHT, async () => blob)
	editor.dispose()
	await Promise.resolve()
	expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
})

it('renders each source’s own item when two sources use the same item id', async () => {
	const library = LibraryRecordType.create({ name: 'Kit' })
	const shared = LibraryItemRecordType.create({
		id: LibraryItemRecordType.createId('shared'),
		libraryId: library.id,
	})
	const sourceWith = (marker: string) =>
		new InMemoryLibrarySource({
			initial: {
				libraries: [library],
				items: [shared],
				contents: {
					[shared.id]: {
						formatVersion: 1,
						content: { ...content, schema: { ...content.schema, marker } as any },
					},
				},
			},
		})
	const rendered: string[] = []
	const render = vi.fn(async (_editor: Editor, c: TLContent) => {
		rendered.push((c.schema as any).marker)
		return blob
	})
	const a = await getItemPreviewUrl(editor, sourceWith('a'), shared, LIGHT, render)
	const b = await getItemPreviewUrl(editor, sourceWith('b'), shared, LIGHT, render)
	expect(rendered).toEqual(['a', 'b'])
	expect(b).not.toBe(a)
})

it('skips a queued preview once everyone who asked for it has stopped waiting', async () => {
	let finishFirst!: (blob: Blob) => void
	const render = vi
		.fn()
		.mockImplementationOnce(() => new Promise<Blob>((resolve) => (finishFirst = resolve)))
		.mockResolvedValue(blob)
	const first = getItemPreviewUrl(editor, source, item, LIGHT, render)
	const controller = new AbortController()
	const second = getItemPreviewUrl(
		editor,
		source,
		item,
		{ ...DARK, signal: controller.signal },
		render
	)
	await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1))
	controller.abort()
	finishFirst(blob)
	await Promise.all([first, second])
	expect(render).toHaveBeenCalledTimes(1)
	expect(await second).toBeNull()
	expect(await getItemPreviewUrl(editor, source, item, DARK, render)).toMatch(/^blob:/)
})

it('renders again in another theme', async () => {
	const render = vi.fn(async () => blob)
	const plain = await getItemPreviewUrl(editor, source, item, LIGHT, render)
	const ocean = await getItemPreviewUrl(
		editor,
		source,
		item,
		{ darkMode: false, themeId: 'ocean' as any },
		render
	)
	expect(ocean).not.toBe(plain)
	expect(render).toHaveBeenCalledTimes(2)
})
