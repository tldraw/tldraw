import { LibraryRecordType } from '@tldraw/tlschema'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	ContainerProvider,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	EditorContext,
	TldrawUiContextProvider,
	useToasts,
} from 'tldraw'
import { vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItemContentTooNewError, LibraryItemRecordType } from '../lib/schema'
import { ItemMenu } from '../ui/item-menu'
import { MenuItem } from '../ui/menu-items'
import { type LibrariesComponents, LibrariesComponentsProvider } from './libraries-components'
import { LibrariesPanel } from './libraries-panel'
import { librariesPanelOpen } from './state'
import { useLibrariesComponents } from './use-libraries-components'

const library = LibraryRecordType.create({ name: 'Shapes' })
const shapeId = createShapeId()

function makeReadOnlySource() {
	const item = LibraryItemRecordType.create({ libraryId: library.id, name: 'Box' })
	return new InMemoryLibrarySource({
		id: 'read-only',
		can: () => false,
		initial: {
			libraries: [library],
			items: [item],
			contents: {
				[item.id]: {
					formatVersion: 1,
					content: {
						shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
						bindings: [],
						rootShapeIds: [shapeId],
						assets: [],
						schema: createTLSchema().serialize(),
					},
				},
			},
		},
	})
}

async function makeSource() {
	const source = new InMemoryLibrarySource({
		id: 'test',
		initial: { libraries: [library], items: [], contents: {} },
	})
	await source.addItem(library.id, {
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
	})
	return source
}

vi.mock('tldraw', async (importOriginal) => ({
	...(await importOriginal<typeof import('tldraw')>()),
	EditorPortal: ({ children }: { children: ReactNode }) => children,
}))

// Libraries are licensed here; license.test.tsx covers the gate.
vi.mock('./license', () => ({ useLibrariesEnabled: () => true }))

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	// jsdom has no layout, so thumbnail measuring and scrolling into view do nothing.
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Element.prototype.scrollTo ??= () => {}
	Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => container,
	})
	librariesPanelOpen.set(editor, true)
})

afterEach(() => {
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

async function renderPanel(
	components?: LibrariesComponents,
	outer?: LibrariesComponents,
	source?: LibrarySource,
	menuItems?: ReactNode
) {
	source ??= await makeSource()
	const panel = <LibrariesPanel source={source} components={components} menuItems={menuItems} />
	await act(async () => {
		root.render(
			<ContainerProvider container={container}>
				<EditorContext.Provider value={editor}>
					<TldrawUiContextProvider>
						{outer ? (
							<LibrariesComponentsProvider components={outer}>{panel}</LibrariesComponentsProvider>
						) : (
							panel
						)}
					</TldrawUiContextProvider>
				</EditorContext.Provider>
			</ContainerProvider>
		)
	})
	return container.querySelector('.tlui-libraries-panel')!
}

describe('LibrariesPanel components', () => {
	it('renders the defaults for unset slots', async () => {
		const panel = await renderPanel()
		expect(panel.querySelector('button[aria-label="Box"]')).not.toBeNull()
		expect(panel.querySelector('.tlui-libraries-add-tile')).not.toBeNull()
		expect(panel.querySelector('.tlui-libraries-panel__name')?.textContent).toBe('Shapes')
	})

	it('replaces a slot with its override, passing the record', async () => {
		const panel = await renderPanel({
			ItemTile: ({ item, buttonProps }) => (
				<button data-testid="tile" {...buttonProps}>
					{item.name}
				</button>
			),
		})
		expect(panel.querySelector('button[aria-label="Box"]')).toBeNull()
		expect(panel.querySelector('[data-testid="tile"]')?.textContent).toBe('Box')
		expect(panel.querySelector('.tlui-libraries-add-tile')).not.toBeNull()
	})

	it('hides a slot set to null', async () => {
		const panel = await renderPanel({ AddSelectionTile: null, LibrarySectionHeader: null })
		expect(panel.querySelector('.tlui-libraries-add-tile')).toBeNull()
		expect(panel.querySelector('.tlui-libraries-panel__name')).toBeNull()
		expect(panel.querySelector('button[aria-label="Box"]')).not.toBeNull()
	})

	it('replaces an outer provider’s overrides with the panel’s own', async () => {
		const panel = await renderPanel(
			{ ItemTile: () => <span data-testid="inner" /> },
			{ AddSelectionTile: null, ItemTile: () => <span data-testid="outer" /> }
		)
		expect(panel.querySelector('[data-testid="inner"]')).not.toBeNull()
		expect(panel.querySelector('[data-testid="outer"]')).toBeNull()
		expect(panel.querySelector('.tlui-libraries-add-tile')).not.toBeNull()
	})
})

describe('LibrariesPanel components with no libraries', () => {
	it('renders the panel-level slots', async () => {
		const panel = await renderPanel(
			{
				LibrariesPanelHeader: null,
				NoLibraries: () => <p data-testid="empty" />,
			},
			undefined,
			new InMemoryLibrarySource({ id: 'empty' })
		)
		expect(panel.querySelector('.tlui-libraries-panel__title')).toBeNull()
		expect(panel.querySelector('[data-testid="empty"]')).not.toBeNull()
	})
})

describe('LibrariesPanel components with a custom library header', () => {
	it('lets the header end the rename that New library starts', async () => {
		const panel = await renderPanel(
			{
				LibrarySectionHeader: ({ library, menu, isRenaming, onRenameComplete }) => (
					<header data-testid="header">
						{isRenaming ? (
							<button data-testid="done" onClick={() => onRenameComplete('Mine')} />
						) : (
							<span data-testid="name">{library.name}</span>
						)}
						{menu}
					</header>
				),
			},
			undefined,
			new InMemoryLibrarySource({ id: 'rename' }),
			<MenuItem label="Host item" onClick={() => {}} />
		)
		const panelMenu = () => panel.querySelector(':scope > header [aria-label="Library options"]')
		const sectionMenu = () =>
			panel.querySelector('[data-testid="header"] [aria-label="Library options"]')
		expect(panelMenu()).not.toBeNull()

		act(() => {
			panelMenu()!.dispatchEvent(
				new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
			)
		})
		const create = await vi.waitFor(() => {
			const item = [
				...document.querySelectorAll<HTMLButtonElement>('.tlui-libraries-menu__item'),
			].find((el) => el.textContent === 'Create library')
			expect(item).toBeDefined()
			return item!
		})
		await act(async () => create.click())
		await vi.waitFor(() => expect(panel.querySelector('[data-testid="done"]')).not.toBeNull())
		expect(panelMenu()).not.toBeNull()
		expect(
			panel.querySelectorAll('[data-testid="header"] [aria-label="Library options"]')
		).toHaveLength(panel.querySelectorAll('[data-testid="header"]').length)

		await act(async () => {
			panel.querySelector<HTMLButtonElement>('[data-testid="done"]')!.click()
		})
		expect(
			[...panel.querySelectorAll('[data-testid="name"]')].map((el) => el.textContent)
		).toContain('Mine')
		expect(panelMenu()).not.toBeNull()
		expect(sectionMenu()).not.toBeNull()
	})
})

describe('LibrariesPanel item menus on right-click', () => {
	const rightClickBox = async (panel: Element) => {
		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
		await act(async () => {
			panel.querySelector('button[aria-label="Box"]')!.dispatchEvent(event)
		})
		return event
	}

	afterEach(() => editor.menus.clearOpenMenus())

	it('opens a menu whose only entries are the host’s', async () => {
		const panel = await renderPanel(
			{
				ItemMenu: (props) => (
					<ItemMenu {...props}>
						<MenuItem label="Host action" onClick={() => {}} />
					</ItemMenu>
				),
			},
			undefined,
			makeReadOnlySource()
		)
		await rightClickBox(panel)
		expect(editor.menus.getOpenMenus()).toHaveLength(1)
		expect(document.body.textContent).toContain('Host action')
	})

	it('opens Details for an item the source doesn’t let me change', async () => {
		const panel = await renderPanel(undefined, undefined, makeReadOnlySource())
		await rightClickBox(panel)
		expect(editor.menus.getOpenMenus()).toHaveLength(1)
		expect(document.body.textContent).toContain('Details')
	})

	it('closes the open menu when the panel scrolls', async () => {
		const panel = await renderPanel()
		await rightClickBox(panel)
		expect(editor.menus.getOpenMenus()).toHaveLength(1)
		await act(async () => {
			panel.querySelector('.tlui-libraries-sections')!.dispatchEvent(new Event('scroll'))
		})
		expect(editor.menus.getOpenMenus()).toEqual([])
	})

	it('opens with Insert first and Delete last, and no button of its own on the tile', async () => {
		const panel = await renderPanel()
		expect(panel.querySelector('.tlui-libraries-tile [aria-label="Item options"]')).toBeNull()
		await rightClickBox(panel)
		const labels = await vi.waitFor(() => {
			const items = [...document.querySelectorAll('.tlui-libraries-menu [role^="menuitem"]')]
			expect(items.length).toBeGreaterThan(0)
			return items.map((item) => item.textContent)
		})
		expect(labels[0]).toBe('Insert')
		expect(labels[1]).toBe('Details')
		expect(labels).not.toContain('Rename')
		expect(labels[labels.length - 1]).toBe('Delete')
	})

	it.each(['ContextMenu', 'F10'])(
		'opens from the keyboard with %s on a focused tile',
		async (key) => {
			const panel = await renderPanel()
			const tile = panel.querySelector<HTMLButtonElement>('button[aria-label="Box"]')!
			await act(async () => {
				tile.focus()
				tile.dispatchEvent(
					new KeyboardEvent('keydown', { key, shiftKey: key === 'F10', bubbles: true })
				)
			})
			expect(editor.menus.getOpenMenus()).toHaveLength(1)
		}
	)

	it('opens the library menu on a right-click on its name, as well as from its ⋯', async () => {
		const panel = await renderPanel()
		expect(
			panel.querySelector('.tlui-libraries-section [aria-label="Library options"]')
		).not.toBeNull()
		await act(async () => {
			panel
				.querySelector('.tlui-libraries-panel__toggle')!
				.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
		})
		expect(editor.menus.isMenuOpen(`libraries-library-menu-${library.id}`)).toBe(true)
	})

	it('leaves the right-click alone when the ItemMenu slot is null', async () => {
		const panel = await renderPanel({ ItemMenu: null })
		const event = await rightClickBox(panel)
		expect(event.defaultPrevented).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
	})
})

describe('LibrariesPanel placing an item', () => {
	async function clickBoxAndGetToasts(error: Error) {
		const source = await makeSource()
		vi.spyOn(source, 'getItemContent').mockRejectedValue(error)
		let toasts: ReturnType<typeof useToasts> | undefined
		const ToastsProbe = () => {
			toasts = useToasts()
			return null
		}
		await act(async () => {
			root.render(
				<ContainerProvider container={container}>
					<EditorContext.Provider value={editor}>
						<TldrawUiContextProvider>
							<LibrariesPanel source={source} />
							<ToastsProbe />
						</TldrawUiContextProvider>
					</EditorContext.Provider>
				</ContainerProvider>
			)
		})
		await act(async () => {
			container.querySelector<HTMLButtonElement>('button[aria-label="Box"]')!.click()
		})
		return toasts!.toasts.get()
	}

	it('says an item made with a newer version of tldraw needs a reload', async () => {
		const toasts = await clickBoxAndGetToasts(
			new LibraryItemContentTooNewError({ message: 'newer shapes' })
		)
		expect(toasts).toMatchObject([
			{
				title: 'Made with a newer version of tldraw',
				description: 'Reload tldraw to use this item.',
				severity: 'error',
			},
		])
	})

	it('keeps the general error for other failures', async () => {
		const toasts = await clickBoxAndGetToasts(new Error('offline'))
		expect(toasts).toMatchObject([{ title: "Couldn't place item", severity: 'error' }])
	})
})

describe('useLibrariesComponents', () => {
	it('gives every default outside a provider', () => {
		let components: ReturnType<typeof useLibrariesComponents> | undefined
		function Probe() {
			components = useLibrariesComponents()
			return null
		}
		act(() => root.render(<Probe />))
		expect(Object.values(components!).every((slot) => typeof slot === 'function')).toBe(true)
		expect(Object.keys(components!).sort()).toEqual(
			[
				'AddSelectionTile',
				'EmptyLibrary',
				'ItemMenu',
				'ItemTile',
				'LibrarySectionHeader',
				'LibraryMenu',
				'NoLibraries',
				'LibrariesPanelHeader',
			].sort()
		)
	})
})
