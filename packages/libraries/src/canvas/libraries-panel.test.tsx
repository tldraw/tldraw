import { librarySchemaRecords } from '@tldraw/tlschema'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	Box,
	createTLSchema,
	createTLStore,
	Editor,
	LibraryRecordType,
	Tldraw,
	useEditor,
} from 'tldraw'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
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
	// jsdom lays nothing out, so the editor would measure a 1px viewport and show the phone sheet.
	act(() => mounted!.updateViewportScreenBounds(new Box(0, 0, 1280, 800)))
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
