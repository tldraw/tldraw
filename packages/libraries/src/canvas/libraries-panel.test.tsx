import { librarySchemaRecords } from '@tldraw/tlschema'
import { MediaHelpers } from '@tldraw/utils'
import { act, useMemo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	atom,
	Box,
	createLibraryItemContentId,
	createTLSchema,
	createTLStore,
	Editor,
	LibraryItemContentRecordType,
	LibraryRecordType,
	Tldraw,
	useEditor,
	type TLLibraryId,
} from 'tldraw'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { BoardLibrarySource } from '../lib/BoardLibrarySource'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItemRecordType, type TLLibraryItemContent } from '../lib/schema'
import type { LibraryBrowseGroup } from './browse-libraries-dialog'
import { LibrariesPanel } from './libraries-panel'
import { collapsedLibraryIds, librariesPanelOpen, librariesSearchQuery } from './state'

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver
	globalThis.FontFace ??= class {
		load() {
			return Promise.resolve(this)
		}
	} as unknown as typeof FontFace
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: { add() {}, delete() {}, forEach() {}, [Symbol.iterator]: () => [][Symbol.iterator]() },
	})
	Element.prototype.scrollIntoView ??= () => {}
	window.matchMedia ??= (query: string) =>
		({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
		}) as unknown as MediaQueryList
})

let root: Root | null = null
let panelEditor: Editor | undefined
let container: HTMLDivElement | null = null

afterEach(() => {
	act(() => root?.unmount())
	container?.remove()
	root = null
	container = null
})

async function renderPanel(
	source: LibrarySource | ((editor: Editor) => LibrarySource) = new InMemoryLibrarySource(),
	getBrowseGroups?: () => LibraryBrowseGroup[],
	collapsed: TLLibraryId[] = []
) {
	container = document.createElement('div')
	document.body.appendChild(container)
	let mounted: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) })
	const Panel = () => {
		const editor = useEditor()
		const panelSource = useMemo(
			() => (typeof source === 'function' ? source(editor) : source),
			[editor]
		)
		return <LibrariesPanel source={panelSource} getBrowseGroups={getBrowseGroups} />
	}
	root = createRoot(container)
	act(() => {
		root!.render(
			<div style={{ width: 800, height: 600 }}>
				<Tldraw
					store={store}
					onMount={(e) => void (mounted = e)}
					components={{ InFrontOfTheCanvas: Panel }}
				/>
			</div>
		)
	})
	await vi.waitFor(() => expect(mounted).toBeDefined())
	// jsdom lays nothing out, so the editor would measure a 1px viewport and show the phone sheet.
	act(() => mounted!.updateViewportScreenBounds(new Box(0, 0, 1280, 800)))
	panelEditor = mounted
	act(() => collapsedLibraryIds.set(mounted!, collapsed))
	act(() => librariesPanelOpen.set(mounted!, true))
	await vi.waitFor(() => expect(container!.querySelector('.tlui-libraries-panel')).not.toBeNull())
	return container
}

const headerMenuItems = async (container: HTMLElement) => {
	const trigger = container.querySelector<HTMLButtonElement>(
		'.tlui-libraries-panel > header [aria-label="Library options"]'
	)
	if (!trigger) return undefined
	act(() => {
		trigger.dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
		)
	})
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).not.toBeNull())
	return [
		...document.querySelectorAll<HTMLButtonElement>(
			'.tlui-libraries-menu .tlui-libraries-menu__item'
		),
	]
}

it.each([
	['one owner', () => new InMemoryLibrarySource()],
	[
		'a choice of owners',
		() =>
			new InMemoryLibrarySource({
				owners: [
					{ id: 'home', name: 'Home' },
					{ id: 'team', name: 'Team' },
				],
				defaultOwnerId: 'home',
			}),
	],
])(
	"keeps the name of a new library ready to edit once the header's Create library is done, with %s",
	async (_, makeSource) => {
		const container = await renderPanel(makeSource())
		const items = await headerMenuItems(container)
		const create = items!.find((item) => item.textContent === 'Create library')
		if (create) {
			act(() => create.click())
		} else {
			act(() => panelEditor!.menus.addOpenMenu('libraries-panel-menu-create'))
			const owner = await vi.waitFor(() => {
				const el = [
					...document.querySelectorAll<HTMLButtonElement>('.tlui-libraries-menu__item'),
				].find((item) => item.textContent === 'Home')
				expect(el).toBeDefined()
				return el!
			})
			act(() => owner.click())
		}

		const input = await vi.waitFor(() => {
			const el = container.querySelector<HTMLInputElement>('input.tlui-libraries-panel__rename')
			expect(el).not.toBeNull()
			return el!
		})
		// Give the closing menu its chance to hand focus back to its trigger.
		await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
		expect(container.querySelector('input.tlui-libraries-panel__rename')).toBe(input)
		expect(document.activeElement).toBe(input)
	}
)

it("offers Sort by, Add library and Create library in the header's menu", async () => {
	const shapes = LibraryRecordType.create({ name: 'Shapes' })
	const container = await renderPanel(
		new InMemoryLibrarySource({ initial: { libraries: [shapes], items: [], contents: {} } }),
		() => []
	)
	const items = await headerMenuItems(container)
	const submenus = [
		...document.querySelectorAll('.tlui-libraries-menu .tlui-menu__submenu__trigger'),
	]
	expect(submenus.map((item) => item.textContent)).toEqual(['Sort by'])
	expect(items!.map((item) => item.textContent)).toEqual(['Add library', 'Create library'])
	act(() => items![0].click())
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
})

it('pins Add libraries below the list, with no link to create a library at its end', async () => {
	const container = await renderPanel(new InMemoryLibrarySource(), () => [])
	await vi.waitFor(() =>
		expect(container.querySelector('.tlui-libraries-panel__browse-more')).not.toBeNull()
	)
	const sections = container.querySelector('.tlui-libraries-sections')!
	expect(container.querySelector('.tlui-libraries-panel__create')).toBeNull()
	expect(sections.querySelector('.tlui-libraries-panel__browse-more')).toBeNull()
	expect(sections.nextElementSibling!.classList).toContain('tlui-libraries-panel__browse-more')
	expect(sections.nextElementSibling!.textContent).toBe('Add libraries')
})

it('leaves out the header menu and Add libraries for a source that allows neither', async () => {
	const container = await renderPanel(new InMemoryLibrarySource({ can: () => false }))
	expect(await headerMenuItems(container)).toBeUndefined()
	expect(container.querySelector('.tlui-libraries-panel__browse-more')).toBeNull()
	expect(container.querySelector('.tlui-libraries-panel__create')).toBeNull()
})

const browseRow = (name: string) =>
	[...document.querySelectorAll('.tlui-libraries-browse__row')].find(
		(el) => el.querySelector('.tlui-libraries-browse__name')!.textContent === name
	)!

/** A row's action: its button's label, or the "Added" it shows with no button. */
const actionOf = (row: Element) => {
	const added = row.querySelector('.tlui-libraries-browse__added')
	if (added) return added.textContent
	const button = row.querySelector<HTMLButtonElement>('.tlui-libraries-browse__action')!
	const label = button.querySelector('.tlui-libraries-browse__action-label')!.textContent
	return `${label}${button.getAttribute('aria-disabled') === 'true' ? ' (disabled)' : ''}`
}

const clickAction = (row: Element) =>
	act(() => row.querySelector<HTMLButtonElement>('.tlui-libraries-browse__action')!.click())

it('removes an added library from the file in Browse, where the user may, so it can be added again', async () => {
	const icons = LibraryRecordType.create({ name: 'Icons', ownerId: 'home' })
	const pinned = LibraryRecordType.create({ name: 'Pinned', ownerId: 'home' })
	const source = new InMemoryLibrarySource({
		owners: [{ id: 'home', name: 'Home' }],
		defaultOwnerId: 'home',
		initial: { libraries: [icons, pinned], items: [], contents: {} },
		shownInDocument: [{ libraryId: pinned.id, placement: 'added' }],
		can: (action, target) => !(action === 'removeLibraryFromDocument' && target === pinned.id),
	})
	const container = await renderPanel(source)
	act(() =>
		container.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')!.click()
	)
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
	expect(actionOf(browseRow('Pinned'))).toBe('Added')
	expect(actionOf(browseRow('Icons'))).toBe('Add to file')

	clickAction(browseRow('Icons'))
	await vi.waitFor(() => expect(actionOf(browseRow('Icons'))).toBe('Remove from file'))
	expect(browseRow('Icons').querySelector('.tlui-libraries-browse__action-rest')!.textContent).toBe(
		'Added'
	)

	clickAction(browseRow('Icons'))
	await vi.waitFor(() => expect(actionOf(browseRow('Icons'))).toBe('Add to file'))
	expect(source.getLibraries().map((library) => library.id)).not.toContain(icons.id)
})

it("offers Remove from file for a host's added entry only where it gives a way to remove it", async () => {
	const remove = vi.fn(async () => {})
	const entry = (name: string, removable: boolean) => ({
		id: name,
		name,
		itemCount: 0,
		previews: [],
		added: true,
		canAdd: true,
		add: async () => LibraryRecordType.createId(name),
		remove: removable ? remove : undefined,
	})
	const groups = [
		{ id: 'packs', label: 'Packs', entries: [entry('Kept', false), entry('Doodles', true)] },
	]
	const container = await renderPanel(new InMemoryLibrarySource(), () => groups)
	act(() =>
		container.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')!.click()
	)
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
	expect(actionOf(browseRow('Kept'))).toBe('Added')
	expect(actionOf(browseRow('Doodles'))).toBe('Remove from file')
	clickAction(browseRow('Doodles'))
	expect(remove).toHaveBeenCalledOnce()
})

it("lists the host's groups under their labels, each row with up to five tiles or a note that it's empty", async () => {
	const entry = (name: string, itemCount: number) => ({
		id: name,
		name,
		itemCount,
		previews: [],
		added: false,
		canAdd: true,
		add: async () => LibraryRecordType.createId(name),
	})
	const groups = [
		{
			id: 'public',
			label: 'Public libraries',
			entries: [entry('Big', 36), entry('Small', 3), entry('Bare', 0)],
		},
	]
	const container = await renderPanel(new InMemoryLibrarySource(), () => groups)
	act(() =>
		container.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')!.click()
	)
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
	const group = document.querySelector('.tlui-libraries-browse__group')!
	expect(group.querySelector('h3')!.textContent).toBe('Public libraries')
	const tiles = (name: string) =>
		[...browseRow(name).querySelectorAll('.tlui-libraries-tile__thumbnail')].map(
			(tile) => tile.textContent
		)
	expect(tiles('Big')).toEqual(['', '', '', '', '+ 32'])
	expect(tiles('Small')).toEqual(['', '', ''])
	expect(tiles('Bare')).toEqual([])
	expect(browseRow('Bare').textContent).toContain('This library is empty.')
})

const emptyContent: TLLibraryItemContent = {
	formatVersion: 1,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

function makeLibrary(name: string, itemNames: string[]) {
	const library = LibraryRecordType.create({ name })
	const items = itemNames.map((itemName) =>
		LibraryItemRecordType.create({ libraryId: library.id, name: itemName })
	)
	return { library, items }
}

/** Lists a library's items only once `loadItems` has been asked for them and `finish` is called. */
class LazySource extends InMemoryLibrarySource {
	private readonly loaded = atom<ReadonlySet<TLLibraryId>>('loaded', new Set())
	requested: TLLibraryId[] = []
	override getItems(libraryId: TLLibraryId) {
		return this.loaded.get().has(libraryId) ? super.getItems(libraryId) : []
	}
	loadItems(libraryId: TLLibraryId) {
		if (!this.requested.includes(libraryId)) this.requested.push(libraryId)
	}
	isLoadingItems(libraryId: TLLibraryId) {
		return !this.loaded.get().has(libraryId)
	}
	finish(libraryId: TLLibraryId) {
		this.loaded.update((ids) => new Set(ids).add(libraryId))
	}
}

function makeSource<S extends InMemoryLibrarySource>(
	Source: new (options: ConstructorParameters<typeof InMemoryLibrarySource>[0]) => S,
	libraries: ReturnType<typeof makeLibrary>[],
	can?: () => boolean
) {
	const items = libraries.flatMap((l) => l.items)
	return new Source({
		can,
		initial: {
			libraries: libraries.map((l) => l.library),
			items,
			contents: Object.fromEntries(items.map((item) => [item.id, emptyContent])),
		},
	})
}

const tileLabels = (container: Element) =>
	[
		...container.querySelectorAll(
			'.tlui-libraries-tile:not(.tlui-libraries-add-tile) .tlui-libraries-tile__button'
		),
	].map((el) => el.getAttribute('aria-label'))

const toggles = (container: Element) =>
	[...container.querySelectorAll('.tlui-libraries-panel__toggle')].map(
		(el) => `${el.textContent}:${el.getAttribute('aria-expanded')}`
	)

it('searches a folded library, and leaves it folded once the search is cleared', async () => {
	const shapes = makeLibrary('Shapes', ['Box', 'Circle'])
	const container = await renderPanel(makeSource(InMemoryLibrarySource, [shapes]), undefined, [
		shapes.library.id,
	])
	expect(tileLabels(container)).toEqual([])

	act(() => librariesSearchQuery.set(panelEditor!, 'box'))
	await vi.waitFor(() => expect(tileLabels(container)).toEqual(['Box']))

	act(() => librariesSearchQuery.set(panelEditor!, ''))
	await vi.waitFor(() => expect(toggles(container)).toEqual(['Shapes:false']))
	expect(tileLabels(container)).toEqual([])
})

it('asks a source to load the items of unfolded libraries only, and shows none while they load', async () => {
	const open = makeLibrary('Open', ['Box'])
	const folded = makeLibrary('Folded', ['Star'])
	const source = makeSource(LazySource, [open, folded], () => false)
	const container = await renderPanel(source, undefined, [folded.library.id])

	await vi.waitFor(() => expect(source.requested).toEqual([open.library.id]))
	expect(container.textContent).not.toContain('No items yet.')

	act(() => source.finish(open.library.id))
	await vi.waitFor(() => expect(tileLabels(container)).toEqual(['Box']))
	expect(source.requested).toEqual([open.library.id])
})

it('loads every library for a search, and says it is still searching until a match arrives', async () => {
	const open = makeLibrary('Open', ['Box'])
	const folded = makeLibrary('Folded', ['Star'])
	const source = makeSource(LazySource, [open, folded], () => false)
	const container = await renderPanel(source, undefined, [folded.library.id])
	act(() => source.finish(open.library.id))

	act(() => librariesSearchQuery.set(panelEditor!, 'star'))
	await vi.waitFor(() => expect(source.requested).toContain(folded.library.id))
	expect(container.textContent).toContain('Searching…')
	expect(container.textContent).not.toContain('No items found')

	act(() => source.finish(folded.library.id))
	await vi.waitFor(() => expect(tileLabels(container)).toEqual(['Star']))

	act(() => librariesSearchQuery.set(panelEditor!, 'nothing'))
	await vi.waitFor(() => expect(container.textContent).toContain('No items found'))

	act(() => librariesSearchQuery.set(panelEditor!, ''))
	await vi.waitFor(() => expect(toggles(container)).toEqual(['Open:true', 'Folded:false']))
})

/** Says which libraries may match from a list of item names it has without loading them. */
class IndexedLazySource extends LazySource {
	names = new Map<TLLibraryId, string[]>()
	mayHaveItemsMatching(libraryId: TLLibraryId, query: string) {
		return (this.names.get(libraryId) ?? []).some((name) => name.toLowerCase().includes(query))
	}
}

it('searches only the libraries the source says may match, and says at once when none do', async () => {
	const shapes = makeLibrary('Shapes', ['Box'])
	const stars = makeLibrary('Stars', ['Star'])
	const source = makeSource(IndexedLazySource, [shapes, stars], () => false)
	source.names.set(shapes.library.id, ['Box'])
	source.names.set(stars.library.id, ['Star'])
	const container = await renderPanel(source, undefined, [shapes.library.id, stars.library.id])
	expect(source.requested).toEqual([])

	act(() => librariesSearchQuery.set(panelEditor!, 'sta'))
	await vi.waitFor(() => expect(source.requested).toEqual([stars.library.id]))
	act(() => source.finish(stars.library.id))
	await vi.waitFor(() => expect(tileLabels(container)).toEqual(['Star']))

	act(() => librariesSearchQuery.set(panelEditor!, 'circle'))
	await vi.waitFor(() => expect(container.textContent).toContain('No items found'))
	expect(container.textContent).not.toContain('Searching…')
	expect(source.requested).toEqual([stars.library.id])

	act(() => librariesSearchQuery.set(panelEditor!, 'shapes'))
	await vi.waitFor(() => expect(source.requested).toEqual([stars.library.id, shapes.library.id]))
})

describe('a board with a library of its own', () => {
	const boardSource = (editor: Editor) =>
		new BoardLibrarySource(editor, { documentLibrary: { name: 'This file' } })
	const addTile = (container: Element) =>
		container.querySelector<HTMLButtonElement>('.tlui-libraries-add-tile button')
	const offer = (id: string) => ({
		id,
		name: id,
		itemCount: 1,
		previews: [],
		added: false,
		canAdd: true,
		add: async () => LibraryRecordType.createId(id),
	})

	it('shows "This file" as a library with the + tile, then the suggestions', async () => {
		const groups = [{ id: 'packs', label: 'Packs', entries: [offer('Doodles')] }]
		const container = await renderPanel(boardSource, () => groups)
		await vi.waitFor(() => expect(toggles(container)).toEqual(['This file:true']))
		expect(addTile(container)).not.toBeNull()
		expect(container.querySelector('.tlui-libraries-panel__group-label')).toBeNull()
		expect(container.textContent).not.toContain('No libraries added yet.')
		expect(container.querySelector('.tlui-libraries-offers')!.textContent).toContain('Doodles')
	})

	it('saves the selection into the document with the + tile, and shows its tile', async () => {
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 1, h: 1, pixelRatio: 1 })
		const container = await renderPanel(boardSource)
		const editor = panelEditor!
		editor.toImage = async () => ({
			blob: new Blob(['png'], { type: 'image/png' }),
			width: 1,
			height: 1,
		})
		act(() => {
			editor.createShapes([{ type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } }])
			editor.selectAll()
		})
		await vi.waitFor(() => expect(addTile(container)).not.toBeNull())
		act(() => addTile(container)!.click())
		await vi.waitFor(() => expect(tileLabels(container)).toHaveLength(1))
		const typeNames = editor.store.allRecords().map((record) => record.typeName as string)
		expect(typeNames).toContain('library')
		expect(typeNames).toContain('library-item')
		vi.restoreAllMocks()
	})

	it('shows its items without the + tile while the board is read-only', async () => {
		const container = await renderPanel((editor) => {
			const source = boardSource(editor)
			const [own] = source.getLibraries()
			const item = LibraryItemRecordType.create({ libraryId: own.id, name: 'Box' })
			editor.store.put([
				{ ...own, typeName: 'library' },
				item,
				LibraryItemContentRecordType.create({
					id: createLibraryItemContentId(item.id),
					itemId: item.id,
					content: { shapes: [], rootShapeIds: [], schema: emptyContent.content.schema },
					assetIds: [],
				}),
			] as any)
			editor.updateInstanceState({ isReadonly: true })
			return source
		})
		await vi.waitFor(() => expect(tileLabels(container)).toEqual(['Box']))
		expect(toggles(container)).toEqual(['This file:true'])
		expect(addTile(container)).toBeNull()
	})
})

const openMenu = (trigger: Element) =>
	act(() => {
		trigger.dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
		)
	})
const choose = async (label: string) => {
	const item = await vi.waitFor(() => {
		const el = [...document.querySelectorAll<HTMLButtonElement>('.tlui-libraries-menu__item')].find(
			(e) => e.textContent === label
		)
		expect(el).toBeDefined()
		return el!
	})
	await act(async () => item.click())
}
const findInput = (within: Element) =>
	vi.waitFor(() => {
		const el = within.querySelector<HTMLInputElement>('input')
		expect(el).not.toBeNull()
		return el!
	})
// Long enough for a closing menu to hand focus back to its trigger.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))
const press = (input: HTMLInputElement, key: string) =>
	act(() => {
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
	})
const makeShapesSource = (placement?: 'added') => {
	const { library, items } = makeLibrary('Shapes', ['Box'])
	return new InMemoryLibrarySource({
		initial: {
			libraries: [library],
			items,
			contents: Object.fromEntries(items.map((item) => [item.id, emptyContent])),
		},
		shownInDocument: placement ? [{ libraryId: library.id, placement }] : undefined,
	})
}

describe('renaming from a ⋮', () => {
	it.each([
		['Enter', 'Mine'],
		['Escape', 'Shapes'],
	])(
		"keeps a library's ⋮ and the name input's focus, and %s ends it on the name",
		async (key, name) => {
			const container = await renderPanel(makeShapesSource())
			const section = container.querySelector('.tlui-libraries-section')!
			openMenu(section.querySelector('[aria-label="Library options"]')!)
			await choose('Rename')
			const input = await findInput(section)
			await settle()
			expect(document.activeElement).toBe(input)
			expect(section.querySelector('[aria-label="Library options"]')).not.toBeNull()
			expect(
				container.querySelector('.tlui-libraries-panel > header [aria-label="Library options"]')
			).not.toBeNull()

			input.value = 'Mine'
			await press(input, key)
			const toggle = section.querySelector<HTMLButtonElement>('.tlui-libraries-panel__toggle')!
			expect(toggle.textContent).toBe(name)
			expect(document.activeElement).toBe(toggle)
		}
	)

	it("keeps an item's ⋮ in Details while its name is edited", async () => {
		const container = await renderPanel(makeShapesSource())
		const tile = await vi.waitFor(() => {
			const el = container.querySelector('button[aria-label="Box"]')
			expect(el).not.toBeNull()
			return el!
		})
		await act(async () => {
			tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
		})
		await choose('Details')
		const header = await vi.waitFor(() => {
			const el = document.querySelector('.tlui-libraries-details__header')
			expect(el).not.toBeNull()
			return el!
		})
		openMenu(header.querySelector('[aria-label="Item options"]')!)
		await choose('Rename')
		const input = await findInput(document.querySelector('.tlui-libraries-details')!)
		await settle()
		expect(document.activeElement).toBe(input)
		expect(header.querySelector('[aria-label="Item options"]')).not.toBeNull()

		input.value = 'Crate'
		await press(input, 'Enter')
		const name = document.querySelector<HTMLButtonElement>('.tlui-libraries-details__name')!
		expect(name.textContent).toBe('Crate')
		expect(document.activeElement).toBe(name)
	})

	it("keeps a library's ⋮ in Browse's library view while its name is edited", async () => {
		const container = await renderPanel(makeShapesSource('added'), () => [])
		act(() =>
			container
				.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')!
				.click()
		)
		await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
		const view = await vi.waitFor(() => {
			const el = [
				...document.querySelectorAll<HTMLButtonElement>('.tlui-libraries-browse__view'),
			].find((button) => button.textContent === 'Shapes')
			expect(el).toBeDefined()
			return el!
		})
		act(() => view.click())
		const header = await vi.waitFor(() => {
			const el = document.querySelector('.tlui-libraries-browse__header')
			expect(el!.querySelector('.tlui-libraries-browse__title-rename')).not.toBeNull()
			return el!
		})
		openMenu(header.querySelector('[aria-label="Library options"]')!)
		await choose('Rename')
		const input = await findInput(header)
		await settle()
		expect(document.activeElement).toBe(input)
		expect(header.querySelector('[aria-label="Library options"]')).not.toBeNull()

		await press(input, 'Escape')
		const title = header.querySelector<HTMLButtonElement>('.tlui-libraries-browse__title-rename')!
		expect(title.textContent).toBe('Shapes')
		expect(document.activeElement).toBe(title)
	})
})

describe('item Details after Move to', () => {
	const openDetails = async (container: HTMLElement, itemName: string) => {
		const tile = await vi.waitFor(() => {
			const el = container.querySelector(`button[aria-label="${itemName}"]`)
			expect(el).not.toBeNull()
			return el!
		})
		await act(async () => {
			tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
		})
		await choose('Details')
		return vi.waitFor(() => {
			const el = document.querySelector<HTMLElement>(
				'.tlui-dialog__content:has(.tlui-libraries-details)'
			)
			expect(el).not.toBeNull()
			return el!
		})
	}
	const fact = (dialog: Element, label: string) => {
		const dt = [...dialog.querySelectorAll('dt')].find((el) => el.textContent === label)!
		return dt.nextElementSibling!.textContent
	}
	const openDetailsMenu = (dialog: Element) =>
		openMenu(dialog.querySelector('[aria-label="Item options"]')!)
	const moveTargetsIn = async () => {
		const trigger = await vi.waitFor(() => {
			const el = [
				...document.querySelectorAll<HTMLElement>(
					'.tlui-libraries-menu .tlui-menu__submenu__trigger'
				),
			].find((e) => e.textContent!.startsWith('Move to'))
			expect(el).toBeDefined()
			return el!
		})
		await act(async () => {
			trigger.dispatchEvent(
				new MouseEvent('pointermove', { bubbles: true, pointerType: 'mouse' } as any)
			)
			trigger.click()
		})
		return vi.waitFor(() => {
			const items = [
				...document.querySelectorAll('.tlui-libraries-menu__submenu .tlui-libraries-menu__item'),
			]
			expect(items.length).toBeGreaterThan(0)
			return items.map((item) => item.textContent)
		})
	}
	const twoLibraries = () => {
		const shapes = makeLibrary('Shapes', ['Box'])
		const icons = makeLibrary('Icons', [])
		return { shapes, icons }
	}

	it('stays open on the item in the library it moved to, within a source', async () => {
		const { shapes, icons } = twoLibraries()
		const source = new InMemoryLibrarySource({
			initial: {
				libraries: [shapes.library, icons.library],
				items: shapes.items,
				contents: Object.fromEntries(shapes.items.map((item) => [item.id, emptyContent])),
			},
		})
		const container = await renderPanel(source)
		const dialog = await openDetails(container, 'Box')
		expect(fact(dialog, 'Library')).toBe('Shapes')
		openDetailsMenu(dialog)
		expect(await moveTargetsIn()).toEqual(['Icons'])
		await choose('Icons')

		await vi.waitFor(() => expect(fact(dialog, 'Library')).toBe('Icons'))
		expect(dialog.isConnected).toBe(true)
		expect(fact(dialog, 'Name')).toBe('Box')
		act(() => panelEditor!.menus.clearOpenMenus())
		openDetailsMenu(dialog)
		expect(await moveTargetsIn()).toEqual(['Shapes'])
	})

	it('follows an item a source moves by copying it, as between the parts of a composite', async () => {
		const { shapes, icons } = twoLibraries()
		const mine = new InMemoryLibrarySource({
			id: 'mine',
			initial: {
				libraries: [shapes.library],
				items: shapes.items,
				contents: Object.fromEntries(shapes.items.map((item) => [item.id, emptyContent])),
			},
		})
		const team = new InMemoryLibrarySource({
			id: 'team',
			initial: { libraries: [icons.library], items: [], contents: {} },
		})
		const source = new CompositeLibrarySource({
			parts: [
				{ owner: { id: 'me', name: 'Me' }, source: mine },
				{ owner: { id: 'team', name: 'Team' }, source: team },
			],
		})
		const container = await renderPanel(source)
		const dialog = await openDetails(container, 'Box')
		openDetailsMenu(dialog)
		await moveTargetsIn()
		await choose('Icons')

		await vi.waitFor(() => expect(fact(dialog, 'Library')).toBe('Icons'))
		await vi.waitFor(() => expect(mine.getItems(shapes.library.id)).toEqual([]))
		expect(dialog.isConnected).toBe(true)
		expect(fact(dialog, 'Name')).toBe('Box')
		const [moved] = team.getItems(icons.library.id)
		expect(moved.id).not.toBe(shapes.items[0].id)
		expect(dialog.querySelector('[aria-label="Item options"]')).not.toBeNull()
	})

	it('closes once the item is deleted', async () => {
		const { shapes } = twoLibraries()
		const source = new InMemoryLibrarySource({
			initial: {
				libraries: [shapes.library],
				items: shapes.items,
				contents: Object.fromEntries(shapes.items.map((item) => [item.id, emptyContent])),
			},
		})
		const container = await renderPanel(source)
		const dialog = await openDetails(container, 'Box')
		openDetailsMenu(dialog)
		await choose('Delete')
		const confirm = await vi.waitFor(() => {
			const el = [
				...document.querySelectorAll<HTMLButtonElement>('.tlui-dialog__footer button'),
			].find((b) => b.textContent === 'Delete')
			expect(el).toBeDefined()
			return el!
		})
		await act(async () => confirm.click())
		await vi.waitFor(() => expect(dialog.isConnected).toBe(false))
		expect(source.getItems(shapes.library.id)).toEqual([])
	})
})
