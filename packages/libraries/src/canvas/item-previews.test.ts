import {
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	type TLContent,
} from 'tldraw'
import { vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { TLLibraryItem } from '../lib/schema'
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

it('renders an item once for each colour mode', async () => {
	const render = vi.fn(async (_editor: Editor, _content: TLContent, _darkMode: boolean) => blob)
	const light = await getItemPreviewUrl(editor, source, item, false, render)
	expect(await getItemPreviewUrl(editor, source, item, false, render)).toBe(light)
	const dark = await getItemPreviewUrl(editor, source, item, true, render)
	expect(dark).not.toBe(light)
	expect(render.mock.calls.map(([, , darkMode]) => darkMode)).toEqual([false, true])
})

it('renders one item at a time', async () => {
	let finishFirst!: (blob: Blob) => void
	const render = vi
		.fn()
		.mockImplementationOnce(() => new Promise<Blob>((resolve) => (finishFirst = resolve)))
		.mockResolvedValueOnce(blob)
	const first = getItemPreviewUrl(editor, source, item, false, render)
	const second = getItemPreviewUrl(editor, source, item, true, render)
	await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1))
	await new Promise((resolve) => setTimeout(resolve, 10))
	expect(render).toHaveBeenCalledTimes(1)
	finishFirst(blob)
	await Promise.all([first, second])
	expect(render).toHaveBeenCalledTimes(2)
})

it('gives no preview for an item that fails to render, and tries it again next time', async () => {
	const render = vi.fn().mockRejectedValueOnce(new Error('no')).mockResolvedValueOnce(blob)
	expect(await getItemPreviewUrl(editor, source, item, false, render)).toBeNull()
	expect(await getItemPreviewUrl(editor, source, item, false, render)).toMatch(/^blob:/)
})

it('gives no preview for an item with nothing to draw', async () => {
	expect(await getItemPreviewUrl(editor, source, item, false, async () => null)).toBeNull()
})

it('lets go of its previews when the editor is disposed', async () => {
	const url = await getItemPreviewUrl(editor, source, item, false, async () => blob)
	editor.dispose()
	await Promise.resolve()
	expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
})
