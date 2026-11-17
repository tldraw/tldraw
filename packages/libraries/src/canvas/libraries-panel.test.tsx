import { createShapeId, librarySchemaRecords } from '@tldraw/tlschema'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTLSchema, createTLStore, Editor, LibraryRecordType, Tldraw, useEditor } from 'tldraw'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { TLLibraryItemContent } from '../lib/schema'
import type { LibraryBrowseGroup } from './browse-libraries-dialog'
import { LibrariesPanel } from './libraries-panel'
import { librariesPanelOpen } from './state'

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
let container: HTMLDivElement | null = null

afterEach(() => {
	act(() => root?.unmount())
	container?.remove()
	root = null
	container = null
})

async function renderPanel(
	source = new InMemoryLibrarySource(),
	getBrowseGroups?: () => LibraryBrowseGroup[]
) {
	container = document.createElement('div')
	document.body.appendChild(container)
	let mounted: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) })
	const Panel = () => {
		useEditor()
		return <LibrariesPanel source={source} getBrowseGroups={getBrowseGroups} />
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
	act(() => librariesPanelOpen.set(mounted!, true))
	await vi.waitFor(() => expect(container!.querySelector('.tlui-libraries-panel')).not.toBeNull())
	return container
}

const press = (element: Element, key: string) =>
	act(() => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
	})

it('keeps the name of a new library ready to edit once the header button is done', async () => {
	const container = await renderPanel()
	const newLibrary = container.querySelector<HTMLButtonElement>(
		'.tlui-libraries-panel__header button[aria-label="New library"]'
	)!
	newLibrary.focus()
	press(newLibrary, 'Enter')
	act(() => newLibrary.click())
	const owner = document.querySelector<HTMLButtonElement>('.tlui-libraries-menu__item')
	if (owner) act(() => owner.click())

	const input = await vi.waitFor(() => {
		const el = container.querySelector<HTMLInputElement>('input.tlui-libraries-panel__rename')
		expect(el).not.toBeNull()
		return el!
	})
	// Give the closing menu its chance to hand focus back to its trigger.
	await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
	expect(container.querySelector('input.tlui-libraries-panel__rename')).toBe(input)
	expect(document.activeElement).toBe(input)
})

function content(name: string): TLLibraryItemContent {
	const id = createShapeId(name)
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [id],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

const typeInto = (input: HTMLInputElement, value: string) =>
	act(() => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})

const resultGroups = (container: Element) =>
	[
		...container.querySelectorAll('.tlui-libraries-sections .tlui-libraries-panel__group-label'),
	].map((el) => el.textContent)

it("scopes the search to a library from its menu, until the scope's chip is removed", async () => {
	const source = new InMemoryLibrarySource()
	const shapes = await source.createLibrary('Shapes')
	const wireframes = await source.createLibrary('Wireframes')
	await source.addItem(shapes.id, { name: 'Start', content: content('start') })
	await source.addItem(wireframes.id, { name: 'Start button', content: content('button') })
	const container = await renderPanel(source)

	const header = [...container.querySelectorAll('.tlui-libraries-section')].find((el) =>
		el.textContent!.includes('Wireframes')
	)!
	const trigger = header.querySelector<HTMLButtonElement>('[aria-label="Library options"]')!
	trigger.focus()
	press(trigger, 'Enter')
	const searchIn = await vi.waitFor(() => {
		const item = [...document.querySelectorAll('.tlui-libraries-menu__item')].find(
			(el) => el.textContent === 'Search in Wireframes'
		)
		expect(item).toBeDefined()
		return item as HTMLButtonElement
	})
	act(() => searchIn.click())

	const input = await vi.waitFor(() => {
		const el = container.querySelector<HTMLInputElement>('input[aria-label="Search in Wireframes"]')
		expect(el).not.toBeNull()
		return el!
	})
	expect(container.querySelector('.tlui-libraries-search__scope')!.textContent).toBe('Wireframes')

	typeInto(input, 'start')
	await vi.waitFor(() => expect(resultGroups(container)).toEqual(['Wireframes']))

	act(() =>
		container.querySelector<HTMLButtonElement>('[aria-label="Search all libraries"]')!.click()
	)
	await vi.waitFor(() => expect(resultGroups(container)).toEqual(['Shapes', 'Wireframes']))
	expect(container.querySelector('.tlui-libraries-search__scope')).toBeNull()
})

const browseCard = (name: string) =>
	[...document.querySelectorAll('.tlui-libraries-browse__card')].find(
		(el) => el.querySelector('.tlui-libraries-browse__name')!.textContent === name
	)!

const buttonsOf = (card: Element) =>
	[...card.querySelectorAll<HTMLButtonElement>('.tlui-libraries-browse__footer button')].map(
		(button) => `${button.textContent}${button.disabled ? ' (disabled)' : ''}`
	)

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
	act(() => container.querySelector<HTMLButtonElement>('.tlui-libraries-panel__add-more')!.click())
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
	expect(buttonsOf(browseCard('Pinned'))).toEqual(['Added (disabled)'])
	expect(buttonsOf(browseCard('Icons'))).toEqual(['Add to file'])

	act(() =>
		browseCard('Icons')
			.querySelector<HTMLButtonElement>('.tlui-libraries-browse__footer button')!
			.click()
	)
	await vi.waitFor(() => expect(buttonsOf(browseCard('Icons'))).toEqual(['Remove']))
	expect(browseCard('Icons').querySelector('.tlui-libraries-browse__added')!.textContent).toBe(
		'Added'
	)

	act(() =>
		browseCard('Icons')
			.querySelector<HTMLButtonElement>('.tlui-libraries-browse__footer button')!
			.click()
	)
	await vi.waitFor(() => expect(buttonsOf(browseCard('Icons'))).toEqual(['Add to file']))
	expect(source.getLibraries().map((library) => library.id)).not.toContain(icons.id)
})

it("offers Remove for a host's added entry only where it gives a way to remove it", async () => {
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
	act(() => container.querySelector<HTMLButtonElement>('.tlui-libraries-panel__add-more')!.click())
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-browse')).not.toBeNull())
	expect(buttonsOf(browseCard('Kept'))).toEqual(['Added (disabled)'])
	expect(buttonsOf(browseCard('Doodles'))).toEqual(['Remove'])
	act(() =>
		browseCard('Doodles')
			.querySelector<HTMLButtonElement>('.tlui-libraries-browse__footer button')!
			.click()
	)
	expect(remove).toHaveBeenCalledOnce()
})
