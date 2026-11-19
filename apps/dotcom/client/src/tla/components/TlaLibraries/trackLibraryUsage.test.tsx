import {
	CompositeLibrarySource,
	copyLibrary,
	InMemoryLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	type LibrarySource,
	type TLNewLibraryItem,
} from '@tldraw/libraries'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	ContainerProvider,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	EditorContext,
	TldrawUiContextProvider,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventsContext } from '../../utils/app-ui-events'
import { TlaTrackedItemTile } from './TlaTrackedItemTile'
import { getUntrackedLibrarySource, trackLibrarySource } from './trackLibrarySource'

vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	// The panel is gated on a license feature, and portals into the editor's DOM.
	useLicenseFeatureFlag: () => true,
	EditorPortal: ({ children }: { children: ReactNode }) => children,
}))

const shapeId = createShapeId()
const newItem: TLNewLibraryItem = {
	name: 'Box',
	content: {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	},
}

// Like the editor's source on tldraw.com: a composite, which copies libraries itself.
function makeTrackedSource() {
	const inner = new CompositeLibrarySource({
		id: 'test',
		parts: [
			{
				source: new InMemoryLibrarySource({
					owners: [
						{ id: 'home', name: 'Home' },
						{ id: 'team', name: 'Team' },
					],
				}),
			},
		],
	})
	const trackEvent = vi.fn()
	return { inner, source: trackLibrarySource(inner, trackEvent), trackEvent }
}

describe('trackLibrarySource', () => {
	it('reports each library change once it succeeds', async () => {
		const { source, trackEvent } = makeTrackedSource()
		const library = await source.createLibrary('Shapes', { ownerId: 'home' })
		const other = await source.createLibrary('Other', { ownerId: 'home' })
		const item = await source.addItem(library.id, newItem)
		await source.moveItem!(item.id, other.id)
		await source.addItems!(library.id, [newItem])
		await copyLibrary(source, library.id, 'team')
		await source.moveLibrary!(other.id, 'team')
		await source.deleteLibrary(library.id)
		expect(trackEvent.mock.calls).toEqual([
			['create-library', { source: 'libraries', method: 'new' }],
			['create-library', { source: 'libraries', method: 'new' }],
			['add-to-library', { source: 'libraries' }],
			['move-library-item', { source: 'libraries' }],
			['add-to-library', { source: 'libraries' }],
			['create-library', { source: 'libraries', method: 'copy' }],
			['move-library', { source: 'libraries' }],
			['delete-library', { source: 'libraries' }],
		])
	})

	it('reports nothing for a change that fails', async () => {
		const { source, trackEvent } = makeTrackedSource()
		await expect(async () => source.deleteLibrary('library:missing' as any)).rejects.toThrow()
		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('leaves out the optional methods its source leaves out', () => {
		const inner = new InMemoryLibrarySource()
		const source = trackLibrarySource(inner, vi.fn())
		expect(source.copyLibrary).toBeUndefined()
		expect(source.moveItem).toBeDefined()
	})

	it('gives back the source it wraps, for changes reported another way', async () => {
		const { inner, source, trackEvent } = makeTrackedSource()
		expect(getUntrackedLibrarySource(source)).toBe(inner)
		expect(getUntrackedLibrarySource(inner)).toBe(inner)
		await getUntrackedLibrarySource(source).createLibrary('Pack', { ownerId: 'home' })
		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('wraps a source once, so the panel and the context menu share it', () => {
		const { inner, source } = makeTrackedSource()
		expect(trackLibrarySource(inner, vi.fn())).toBe(source)
	})
})

describe('TlaTrackedItemTile', () => {
	let container: HTMLDivElement
	let root: Root
	let editor: Editor

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
		// The UI preloads its icons, and jsdom's images can't decode.
		HTMLImageElement.prototype.decode ??= () => Promise.resolve()
	})

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		editor = new Editor({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: defaultTools,
			store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
			getContainer: () => container,
		})
		editor.setCurrentTool('select')
		librariesPanelOpen.set(editor, true)
	})

	afterEach(() => {
		act(() => root.unmount())
		editor.dispose()
		container.remove()
	})

	async function renderPanel(source: LibrarySource) {
		const trackEvent = vi.fn()
		await act(async () => {
			root.render(
				<ContainerProvider container={container}>
					<EditorContext.Provider value={editor}>
						<TldrawUiContextProvider>
							<EventsContext.Provider value={trackEvent}>
								<LibrariesPanel source={source} components={{ ItemTile: TlaTrackedItemTile }} />
							</EventsContext.Provider>
						</TldrawUiContextProvider>
					</EditorContext.Provider>
				</ContainerProvider>
			)
		})
		const tile = container.querySelector<HTMLButtonElement>('button[aria-label="Box"]')!
		return { trackEvent, tile }
	}

	async function makeSourceWithItem() {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Shapes')
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x: 0, y: 0 })
		const content = editor.getContentFromCurrentPage([id])!
		editor.deleteShape(id)
		await source.addItem(library.id, { name: 'Box', content: { formatVersion: 1, content } })
		return source
	}

	function pointer(tile: HTMLElement, type: string, x: number, y: number) {
		tile.dispatchEvent(
			new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y })
		)
	}

	async function dragTileOut(tile: HTMLElement) {
		await act(async () => pointer(tile, 'pointerdown', 0, 0))
		// Let the tile's content load, which a drag needs before it can start.
		await act(async () => {})
		await act(async () => pointer(tile, 'pointermove', 400, 400))
		expect(editor.isIn('select.translating')).toBe(true)
	}

	it('reports an item placed by a click', async () => {
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await act(async () => tile.click())
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(trackEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'click' }],
		])
	})

	it('reports nothing for a click in a read-only editor, where nothing is placed', async () => {
		editor.updateInstanceState({ isReadonly: true })
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await act(async () => tile.click())
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('reports nothing when the item fails to load', async () => {
		const source = await makeSourceWithItem()
		vi.spyOn(source, 'getItemContent').mockRejectedValue(new Error('offline'))
		const { trackEvent, tile } = await renderPanel(source)
		await act(async () => tile.click())
		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('reports an item dragged out and dropped', async () => {
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await dragTileOut(tile)
		expect(trackEvent).not.toHaveBeenCalled()
		await act(async () => {
			pointer(tile, 'pointerup', 400, 400)
			tile.click()
		})
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(trackEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'drag' }],
		])
	})

	it('reports nothing for a drag that is cancelled', async () => {
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await dragTileOut(tile)
		await act(async () => pointer(tile, 'pointercancel', 400, 400))
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('counts each of several clicks made while the item loads', async () => {
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await act(async () => {
			tile.click()
			tile.click()
		})
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		expect(trackEvent).toHaveBeenCalledTimes(2)
	})

	it('reports a keyboard click on a tile that was dragged before', async () => {
		const { trackEvent, tile } = await renderPanel(await makeSourceWithItem())
		await dragTileOut(tile)
		await act(async () => {
			pointer(tile, 'pointerup', 400, 400)
			tile.click()
		})
		// Enter and Space click without a pointer down.
		await act(async () => tile.click())
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		expect(trackEvent.mock.calls).toEqual([
			['place-library-item', { source: 'libraries', method: 'drag' }],
			['place-library-item', { source: 'libraries', method: 'click' }],
		])
	})
})
