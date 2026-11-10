import { LibraryRecordType } from '@tldraw/tlschema'
import { Tabs } from 'radix-ui'
import { act, type ComponentProps, type ReactNode } from 'react'
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
} from 'tldraw'
import { vi } from 'vitest'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItemRecordType } from '../lib/schema'
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

// Keeps every tab's panel mounted, so a panel that leans on only the open tab being rendered shows it.
vi.mock('radix-ui', async (importOriginal) => {
	const original = await importOriginal<typeof import('radix-ui')>()
	const Content = (props: ComponentProps<typeof Tabs.Content>) => (
		<original.Tabs.Content {...props} forceMount />
	)
	return { ...original, Tabs: { ...original.Tabs, Content } }
})

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	// jsdom has no layout, so the tab strip's measuring and scrolling do nothing.
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
	it('passes the new-library action to the panel-level slots', async () => {
		const panel = await renderPanel(
			{
				LibrariesPanelHeader: null,
				NoLibraries: ({ newLibrary }) => (
					<button data-testid="empty" onClick={newLibrary?.onCreate}>
						{newLibrary?.label}
					</button>
				),
			},
			undefined,
			new InMemoryLibrarySource({ id: 'empty' })
		)
		expect(panel.querySelector('.tlui-libraries-panel__title')).toBeNull()
		expect(panel.querySelector('[data-testid="empty"]')?.textContent).toBe('New library')
	})
})

describe('LibrariesPanel components with a tab per owner', () => {
	it('gives each tab’s NoLibraries its own owner’s new-library action', async () => {
		const source = new CompositeLibrarySource({
			id: 'owners',
			parts: [
				{
					owner: { id: 'packs', name: 'Packs' },
					source: new InMemoryLibrarySource({ id: 'packs', can: () => false }),
				},
				{
					owner: { id: 'board', name: 'Board' },
					source: new InMemoryLibrarySource({ id: 'board' }),
				},
			],
		})
		const panel = await renderPanel(
			{
				LibraryTabLabel: ({ owner, libraries }) => (
					<span data-testid="tab">{`${owner?.id}:${libraries.length}`}</span>
				),
				NoLibraries: ({ owner, newLibrary }) => (
					<p data-testid="empty" data-owner={owner?.id}>
						{newLibrary?.label}
					</p>
				),
			},
			undefined,
			source
		)
		const empties = [...panel.querySelectorAll('[data-testid="empty"]')].map((el) => [
			el.getAttribute('data-owner'),
			el.textContent,
		])
		expect([...panel.querySelectorAll('[data-testid="tab"]')].map((el) => el.textContent)).toEqual([
			'packs:0',
			'board:0',
		])
		expect(empties).toEqual([
			['packs', ''],
			['board', 'New library in Board'],
		])
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
		const menuIn = (selector: string) =>
			panel.querySelector(`${selector} [aria-label="Library options"]`)
		const click = async (selector: string) => {
			await act(async () => {
				panel.querySelector<HTMLButtonElement>(selector)!.click()
			})
		}
		expect(menuIn(':scope > header')).not.toBeNull()

		await click(':scope > header button[aria-label="New library"]')
		expect(panel.querySelector('[data-testid="done"]')).not.toBeNull()
		expect(menuIn(':scope > header')).toBeNull()
		expect(menuIn('[data-testid="header"]')).toBeNull()

		await click('[data-testid="done"]')
		expect(panel.querySelector('[data-testid="name"]')?.textContent).toBe('Mine')
		expect(menuIn(':scope > header')).not.toBeNull()
		expect(menuIn('[data-testid="header"]')).not.toBeNull()
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

	it('leaves the right-click alone when the item has no menu', async () => {
		const panel = await renderPanel(undefined, undefined, makeReadOnlySource())
		expect(panel.querySelector('button[aria-label="Item options"]')).toBeNull()
		const event = await rightClickBox(panel)
		expect(event.defaultPrevented).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
	})

	it('leaves the right-click alone when the ItemMenu slot is null', async () => {
		const panel = await renderPanel({ ItemMenu: null })
		const event = await rightClickBox(panel)
		expect(event.defaultPrevented).toBe(false)
		expect(editor.menus.getOpenMenus()).toEqual([])
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
				'LibraryTabLabel',
			].sort()
		)
	})
})
