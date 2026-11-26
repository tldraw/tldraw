import { LibraryRecordType } from '@tldraw/tlschema'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	ContainerProvider,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	EditorContext,
	TldrawUiContextProvider,
	type TLUiEventHandler,
} from 'tldraw'
import { vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { LibrariesPanel } from './libraries-panel'
import { LibrariesPanelButton } from './libraries-panel-button'
import { defaultPlaceLibraryItem, type LibraryItemPlacer } from './place-item'
import { librariesPanelOpen } from './state'

vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	EditorPortal: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('./license', () => ({ useLibrariesEnabled: () => true }))

const library = LibraryRecordType.create({ name: 'Shapes' })

async function makeSource() {
	const shapeId = createShapeId()
	editor.createShape({ id: shapeId, type: 'geo' })
	const content = editor.getContentFromCurrentPage([shapeId])!
	editor.deleteShape(shapeId)
	const source = new InMemoryLibrarySource({
		id: 'test',
		initial: { libraries: [library], items: [], contents: {} },
	})
	await source.addItem(library.id, { name: 'Box', content: { formatVersion: 1, content } })
	return source
}

let container: HTMLDivElement
let root: Root
let editor: Editor
let onUiEvent: ReturnType<typeof vi.fn<TLUiEventHandler>>

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Element.prototype.scrollTo ??= () => {}
	Element.prototype.scrollIntoView ??= () => {}
	Element.prototype.setPointerCapture ??= () => {}
	Element.prototype.releasePointerCapture ??= () => {}
})

beforeEach(() => {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		initialState: 'select',
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => container,
	})
	onUiEvent = vi.fn<TLUiEventHandler>()
})

afterEach(() => {
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

async function render(children: ReactNode) {
	await act(async () => {
		root.render(
			<ContainerProvider container={container}>
				<EditorContext.Provider value={editor}>
					<TldrawUiContextProvider onUiEvent={onUiEvent}>{children}</TldrawUiContextProvider>
				</EditorContext.Provider>
			</ContainerProvider>
		)
	})
}

function pointer(target: Element, type: string, init: MouseEventInit = {}) {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init }))
}

describe('libraries UI events', () => {
	it('reports toggling the panel from its button', async () => {
		await render(<LibrariesPanelButton />)
		const button = container.querySelector('button')!

		await act(async () => button.click())
		await act(async () => button.click())

		expect(onUiEvent.mock.calls).toEqual([
			['toggle-libraries-panel', { source: 'libraries', open: true }],
			['toggle-libraries-panel', { source: 'libraries', open: false }],
		])
	})

	it('reports placing an item by clicking its tile', async () => {
		librariesPanelOpen.set(editor, true)
		await render(<LibrariesPanel source={await makeSource()} />)
		const tile = container.querySelector('button[aria-label="Box"]')!

		await act(async () => {
			pointer(tile, 'pointerdown')
			pointer(tile, 'pointerup')
			pointer(tile, 'click')
		})

		expect(onUiEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'click' }],
		])
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
	})

	it('reports placing an item by dragging it out of the panel', async () => {
		librariesPanelOpen.set(editor, true)
		await render(<LibrariesPanel source={await makeSource()} />)
		const tile = container.querySelector('button[aria-label="Box"]')!

		await act(async () => pointer(tile, 'pointerdown', { clientX: 0, clientY: 0 }))
		await act(async () => pointer(tile, 'pointermove', { clientX: 300, clientY: 300 }))
		expect(editor.isIn('select.translating')).toBe(true)
		expect(onUiEvent).not.toHaveBeenCalled()

		await act(async () => {
			pointer(tile, 'pointerup', { clientX: 300, clientY: 300 })
			editor.emit('tick', 16)
		})

		expect(onUiEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'drag' }],
		])
	})

	it.each([
		['the pointer is cancelled', (tile: Element) => pointer(tile, 'pointercancel')],
		['Escape is pressed', () => editor.cancel()],
	])('reports nothing for a drag cancelled because %s', async (_, cancel) => {
		librariesPanelOpen.set(editor, true)
		await render(<LibrariesPanel source={await makeSource()} />)
		const tile = container.querySelector('button[aria-label="Box"]')!

		await act(async () => pointer(tile, 'pointerdown', { clientX: 0, clientY: 0 }))
		await act(async () => pointer(tile, 'pointermove', { clientX: 300, clientY: 300 }))
		expect(editor.isIn('select.translating')).toBe(true)

		await act(async () => cancel(tile))

		expect(editor.isIn('select.translating')).toBe(false)
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(onUiEvent).not.toHaveBeenCalled()
	})

	it('reports a placement once when the panel has its own placer', async () => {
		librariesPanelOpen.set(editor, true)
		const placeItem = vi.fn<LibraryItemPlacer>((e, placement) =>
			defaultPlaceLibraryItem(e, { ...placement, select: false })
		)
		await render(<LibrariesPanel source={await makeSource()} placeItem={placeItem} />)
		const tile = container.querySelector('button[aria-label="Box"]')!

		await act(async () => pointer(tile, 'click'))

		expect(placeItem).toHaveBeenCalledTimes(1)
		expect(onUiEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'click' }],
		])
	})

	it('reports an item that could not be placed, and not a placement', async () => {
		librariesPanelOpen.set(editor, true)
		const source = await makeSource()
		vi.spyOn(source, 'getItemContent').mockRejectedValue(new Error('offline'))
		await render(<LibrariesPanel source={source} />)
		const tile = container.querySelector('button[aria-label="Box"]')!

		await act(async () => pointer(tile, 'click'))

		expect(onUiEvent.mock.calls).toEqual([
			['library-error', { source: 'libraries', action: 'place-library-item', reason: 'failed' }],
		])
	})
})
