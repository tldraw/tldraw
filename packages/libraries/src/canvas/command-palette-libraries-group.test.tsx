import { LibraryRecordType } from '@tldraw/tlschema'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	CommandPaletteShell,
	ContainerProvider,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	deleteFromLocalStorage,
	Editor,
	EditorContext,
	TldrawUiContextProvider,
	type TLUiEventHandler,
} from 'tldraw'
import { vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { CommandPaletteLibrariesGroup } from './command-palette-libraries-group'
import { librariesPanelOpen } from './state'

const enabled = vi.hoisted(() => ({ value: true }))
vi.mock('./license', () => ({ useLibrariesEnabled: () => enabled.value }))

const shapes = LibraryRecordType.create({ name: 'Shapes' })
const icons = LibraryRecordType.create({ name: 'Icons' })

async function makeSource({ readOnly = false } = {}) {
	const shapeId = createShapeId()
	editor.createShape({ id: shapeId, type: 'geo' })
	const content = editor.getContentFromCurrentPage([shapeId])!
	editor.deleteShape(shapeId)
	let seeding = true
	const source = new InMemoryLibrarySource({
		id: 'test',
		can: () => seeding || !readOnly,
		initial: { libraries: [shapes, icons], items: [], contents: {} },
	})
	const add = (libraryId: typeof shapes.id, name: string) =>
		source.addItem(libraryId, { name, content: { formatVersion: 1, content } })
	await add(shapes.id, 'Box')
	await add(shapes.id, 'Big box')
	await add(shapes.id, 'Circle')
	await add(icons.id, 'Star')
	await add(icons.id, 'Heart')
	seeding = false
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
})

beforeEach(() => {
	enabled.value = true
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
	deleteFromLocalStorage('tldraw-command-palette-recents')
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

async function renderPalette(children: ReactNode) {
	await act(async () => {
		root.render(
			<ContainerProvider container={container}>
				<EditorContext.Provider value={editor}>
					<TldrawUiContextProvider onUiEvent={onUiEvent}>
						<CommandPaletteShell onClose={() => {}}>{children}</CommandPaletteShell>
					</TldrawUiContextProvider>
				</EditorContext.Provider>
			</ContainerProvider>
		)
	})
}

async function type(query: string) {
	const input = container.querySelector<HTMLInputElement>('[data-testid="command-palette.input"]')!
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
	await act(async () => {
		setValue.call(input, query)
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
	// Item results register a render after the query changes.
	await act(async () => {})
}

function rowLabels() {
	return [...container.querySelectorAll('[role="option"]')].map((row) => row.textContent)
}

function submenuLabels() {
	return [...container.querySelectorAll('[data-testid^="command-palette.submenu."]')].map((row) =>
		row.getAttribute('data-testid')!.replace('command-palette.submenu.', '')
	)
}

function rowIds() {
	return [...container.querySelectorAll('[data-testid^="command-palette.item."]')].map((row) =>
		row.getAttribute('data-testid')!.replace('command-palette.item.', '')
	)
}

function selectShape() {
	const id = createShapeId()
	editor.createShape({ id, type: 'geo' })
	editor.select(id)
}

describe('CommandPaletteLibrariesGroup', () => {
	it('lists its commands while libraries are enabled, and nothing otherwise', async () => {
		const source = await makeSource()
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)
		expect(rowIds()).toEqual(['toggle-libraries-panel'])

		enabled.value = false
		await renderPalette(<CommandPaletteLibrariesGroup source={source} key="off" />)
		expect(rowIds()).toEqual([])
	})

	it('toggles the panel and reports it from the palette', async () => {
		await renderPalette(<CommandPaletteLibrariesGroup source={await makeSource()} />)
		const row = container.querySelector<HTMLElement>(
			'[data-testid="command-palette.item.toggle-libraries-panel"]'
		)!
		await act(async () => row.click())
		expect(librariesPanelOpen.get(editor)).toBe(true)
		expect(onUiEvent).toHaveBeenCalledWith('toggle-libraries-panel', {
			source: 'command-palette',
			open: true,
		})
	})

	it('offers adding the selection to each library, and a new one', async () => {
		const source = await makeSource()
		act(() => selectShape())
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)
		await type('add to')
		expect(rowLabels()).toEqual(['Add to library'])
		const submenu = container.querySelector<HTMLElement>(
			'[data-testid="command-palette.submenu.Add to library"]'
		)!
		await act(async () => submenu.click())
		expect(rowIds()).toEqual([
			`add-to-library:${shapes.id}`,
			`add-to-library:${icons.id}`,
			'add-to-new-library',
		])
	})

	it('hides adding without a selection, in a read-only editor, or with nowhere to add', async () => {
		const source = await makeSource()
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)
		expect(rowIds()).not.toContain('add-to-new-library')

		act(() => selectShape())
		await act(async () => {})
		expect(
			container.querySelector('[data-testid="command-palette.submenu.Add to library"]')
		).not.toBeNull()

		act(() => editor.updateInstanceState({ isReadonly: true }))
		await act(async () => {})
		expect(
			container.querySelector('[data-testid="command-palette.submenu.Add to library"]')
		).toBeNull()
		expect(rowIds()).toEqual(['toggle-libraries-panel'])

		act(() => editor.updateInstanceState({ isReadonly: false }))
		await renderPalette(
			<CommandPaletteLibrariesGroup source={await makeSource({ readOnly: true })} key="read-only" />
		)
		expect(rowIds()).toEqual(['toggle-libraries-panel'])
	})

	it('lists a submenu for each library with named items, and no items without a query', async () => {
		await renderPalette(<CommandPaletteLibrariesGroup source={await makeSource()} />)
		expect(submenuLabels()).toEqual(
			expect.arrayContaining(['Insert from Shapes', 'Insert from Icons'])
		)
		expect(rowIds().some((id) => id.startsWith('library-item:'))).toBe(false)
	})

	it('lists the items matching the query, and a library matching it as its submenu', async () => {
		const source = await makeSource()
		const [box, bigBox, circle] = source.getItems(shapes.id)
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)

		await type('box')
		expect(rowIds()).toEqual(
			expect.arrayContaining([`library-item:${box.id}`, `library-item:${bigBox.id}`])
		)
		expect(rowIds()).not.toContain(`library-item:${circle.id}`)

		await type('icons')
		expect(submenuLabels()).toContain('Insert from Icons')
	})

	it('leaves out unnamed items, and a library holding only those', async () => {
		const source = await makeSource()
		const unnamed = LibraryRecordType.create({ name: 'Scraps' })
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'geo' })
		const content = editor.getContentFromCurrentPage([shapeId])!
		editor.deleteShape(shapeId)
		await source.createLibrary(unnamed.name)
		const scraps = source.getLibraries().find((library) => library.name === 'Scraps')!
		const item = await source.addItem(scraps.id, { content: { formatVersion: 1, content } })
		await source.addItem(shapes.id, { content: { formatVersion: 1, content } })
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)

		expect(submenuLabels()).not.toContain('Insert from Scraps')
		await type('scraps')
		expect(rowIds()).not.toContain(`library-item:${item.id}`)
		expect(rowLabels().some((label) => label?.includes('Unnamed'))).toBe(false)
	})

	it('places a picked item like clicking its tile, and reports it from the palette', async () => {
		const source = await makeSource()
		const star = source.getItems(icons.id)[0]
		await renderPalette(<CommandPaletteLibrariesGroup source={source} />)
		await type('star')
		const row = container.querySelector<HTMLElement>(
			`[data-testid="command-palette.item.library-item:${star.id}"]`
		)!
		await act(async () => row.click())

		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(editor.getSelectedShapeIds()).toHaveLength(1)
		expect(onUiEvent).toHaveBeenCalledWith('place-library-item', {
			source: 'command-palette',
			method: 'click',
		})
	})

	it('hides items in a read-only editor', async () => {
		await renderPalette(<CommandPaletteLibrariesGroup source={await makeSource()} />)
		act(() => editor.updateInstanceState({ isReadonly: true }))
		await type('box')
		expect(rowLabels()).toEqual([])
	})
})
