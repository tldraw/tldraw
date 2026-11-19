import { Dialog as RadixDialog } from 'radix-ui'
import { act, type ButtonHTMLAttributes } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	ContainerProvider,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	EditorContext,
	LibraryRecordType,
	TldrawUiContextProvider,
	useDialogs,
	type TLLibraryItemId,
} from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { TLLibraryItemContent } from '../lib/schema'
import { useLibraryItemDrag, type LibraryItemDragOptions } from './use-item-drag'
import { useLibraryItemActions } from './use-library-item-actions'
import { useSaveSelectionToLibrary } from './use-save-selection-to-library'

const shapes = LibraryRecordType.create({ name: 'Shapes' })
const icons = LibraryRecordType.create({ name: 'Icons' })
const pack = LibraryRecordType.create({ name: 'Pack' })

// Copied from the canvas, so the content is what saving a shape would store.
function makeContent(): TLLibraryItemContent {
	const id = createShapeId()
	editor.run(
		() => editor.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }]),
		{ history: 'ignore' }
	)
	const content = editor.getContentFromCurrentPage([id])!
	editor.run(() => editor.deleteShapes([id]), { history: 'ignore' })
	return { formatVersion: 1, content }
}

async function makeSource() {
	const source = new InMemoryLibrarySource({
		id: 'test',
		can: (action, target) => !(target === pack.id && action !== 'deleteItem'),
		initial: { libraries: [shapes, icons, pack], items: [], contents: {} },
	})
	const box = await source.addItem(shapes.id, { name: 'Box', content: makeContent() })
	return { source, box }
}

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	Element.prototype.setPointerCapture ??= () => {}
	Element.prototype.releasePointerCapture ??= () => {}
	URL.createObjectURL ??= () => 'blob:thumbnail'
	URL.revokeObjectURL ??= () => {}
})

beforeEach(() => {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => container,
		initialState: 'select',
	})
})

afterEach(() => {
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

/** Renders `useHook` inside the editor's UI and returns a getter for its latest result. */
function renderHook<T>(useHook: () => T, children?: (value: T) => React.ReactNode) {
	const result: { current?: T } = {}
	function Probe() {
		result.current = useHook()
		return children ? children(result.current) : null
	}
	act(() => {
		root.render(
			<ContainerProvider container={container}>
				<EditorContext.Provider value={editor}>
					<TldrawUiContextProvider>
						<Probe />
					</TldrawUiContextProvider>
				</EditorContext.Provider>
			</ContainerProvider>
		)
	})
	return () => result.current as T
}

function pointer(type: string, x: number, y: number) {
	return new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
}

async function flush() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
}

describe('useLibraryItemDrag', () => {
	function renderTile(source: InMemoryLibrarySource, itemId: TLLibraryItemId, options = {}) {
		renderHook(
			() => useLibraryItemDrag(source, options as LibraryItemDragOptions),
			(getItemProps) => (
				<div className="region">
					<button
						className="tile"
						{...(getItemProps(itemId) as ButtonHTMLAttributes<HTMLButtonElement>)}
					/>
				</div>
			)
		)
		const tile = container.querySelector<HTMLButtonElement>('.tile')!
		const region = container.querySelector<HTMLDivElement>('.region')!
		tile.getBoundingClientRect = () => new DOMRect(0, 0, 50, 50)
		region.getBoundingClientRect = () => new DOMRect(0, 0, 300, 300)
		return tile
	}

	it('places the item in the viewport on a click, selected', async () => {
		const { source, box } = await makeSource()
		const tile = renderTile(source, box.id)
		await act(async () => {
			tile.dispatchEvent(pointer('pointerdown', 10, 10))
			tile.dispatchEvent(pointer('pointerup', 10, 10))
			tile.click()
		})
		await flush()
		const placed = editor.getCurrentPageShapes()
		expect(placed).toHaveLength(1)
		expect(editor.getSelectedShapeIds()).toEqual([placed[0].id])
	})

	it('starts a drag once the pointer leaves the tile, outside a panel', async () => {
		const { source, box } = await makeSource()
		const tile = renderTile(source, box.id)
		await act(async () => tile.dispatchEvent(pointer('pointerdown', 10, 10)))
		await flush()
		await act(async () => tile.dispatchEvent(pointer('pointermove', 100, 100)))
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(editor.isIn('select.translating')).toBe(true)
	})

	it('waits for the pointer to leave the region getDragRegion gives', async () => {
		const { source, box } = await makeSource()
		const tile = renderTile(source, box.id, {
			getDragRegion: (t: HTMLElement) => t.closest('.region'),
		})
		await act(async () => tile.dispatchEvent(pointer('pointerdown', 10, 10)))
		await flush()
		await act(async () => tile.dispatchEvent(pointer('pointermove', 100, 100)))
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		await act(async () => tile.dispatchEvent(pointer('pointermove', 400, 400)))
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(editor.isIn('select.translating')).toBe(true)
	})
})

describe('useSaveSelectionToLibrary', () => {
	beforeEach(() => {
		editor.toImage = async () => ({ blob: new Blob(), width: 1, height: 1 })
	})

	it('saves the selected shapes to a library', async () => {
		const { source } = await makeSource()
		const id = createShapeId()
		editor.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } }])
		editor.select(id)
		const save = renderHook(() => useSaveSelectionToLibrary(source))
		act(() => save().saveSelection(icons.id))
		await flush()
		expect(source.getItems(icons.id)).toHaveLength(1)
	})

	it('does nothing without a selection', async () => {
		const { source } = await makeSource()
		const save = renderHook(() => useSaveSelectionToLibrary(source))
		act(() => save().saveToNewLibrary())
		await flush()
		expect(source.getLibraries()).toHaveLength(3)
	})
})

describe('useLibraryItemActions', () => {
	it('lists the other libraries the user may add to as targets', async () => {
		const { source } = await makeSource()
		const actions = renderHook(() => useLibraryItemActions(source, shapes.id))
		expect(actions().copyTargets.map((t) => t.name)).toEqual(['Icons'])
		expect(actions().moveTargets.map((t) => t.name)).toEqual(['Icons'])
	})

	it('renames with a trimmed name and ignores a blank one', async () => {
		const { source, box } = await makeSource()
		const actions = renderHook(() => useLibraryItemActions(source, shapes.id))
		act(() => actions().rename(box.id, '   '))
		await flush()
		expect(source.getItems(shapes.id)[0].name).toBe('Box')
		act(() => actions().rename(box.id, '  Square '))
		await flush()
		expect(source.getItems(shapes.id)[0].name).toBe('Square')
	})

	it('moves and copies items', async () => {
		const { source, box } = await makeSource()
		const actions = renderHook(() => useLibraryItemActions(source, shapes.id))
		act(() => actions().copy(box.id, icons.id))
		await flush()
		expect(source.getItems(icons.id).map((i) => i.name)).toEqual(['Box'])
		act(() => actions().move(box.id, icons.id))
		await flush()
		expect(source.getItems(shapes.id)).toEqual([])
		expect(source.getItems(icons.id)).toHaveLength(2)
	})

	it('deletes only once the dialog is confirmed', async () => {
		const { source, box } = await makeSource()
		const actions = renderHook(() => ({
			dialogs: useDialogs().dialogs,
			...useLibraryItemActions(source, shapes.id),
		}))
		act(() => actions().requestDelete(box.id))
		const dialogs = actions().dialogs.get()
		expect(dialogs).toHaveLength(1)
		expect(source.getItems(shapes.id)).toHaveLength(1)
		const Dialog = dialogs[0].component
		renderHook(
			() => null,
			() => (
				<RadixDialog.Root open>
					<Dialog onClose={() => {}} />
				</RadixDialog.Root>
			)
		)
		const confirm = [...container.querySelectorAll('button')].find(
			(b) => b.textContent === 'Delete'
		)!
		await act(async () => confirm.click())
		await flush()
		expect(source.getItems(shapes.id)).toEqual([])
	})
})
