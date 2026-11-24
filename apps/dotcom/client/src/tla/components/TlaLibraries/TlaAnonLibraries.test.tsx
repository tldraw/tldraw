import { BoardLibrarySource, librariesPanelOpen } from '@tldraw/libraries'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	Box,
	createShapeId,
	createTLSchema,
	createTLStore,
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	Tldraw,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { loadStarterPackIndex } from './starterPacks'
import {
	TlaAnonAddToLibraryMenuItem,
	TlaAnonLibrariesPanel,
	TlaAnonLibrariesProvider,
} from './TlaAnonLibraries'
import { useAnonLibrariesOffered } from './useAnonLibrariesOffered'

const state = vi.hoisted(() => ({
	app: null as object | null,
	flags: { libraries_anonymous: { enabled: false } } as Record<string, { enabled: boolean }>,
	trackEvent: vi.fn(),
}))

vi.mock('../../hooks/useAppState', () => ({ useMaybeApp: () => state.app }))
vi.mock('../../utils/featureFlags', () => ({
	getCurrentFlags: () => state.flags,
	getFeatureFlags: async () => state.flags,
}))
vi.mock('../../utils/app-ui-events', () => ({ useTldrawAppUiEvents: () => state.trackEvent }))
vi.mock('../dialogs/TlaSignInDialog', () => ({
	TlaSignInDialog: () => <div data-testid="sign-in-dialog" />,
}))
vi.mock('./starterPacks', async (importOriginal) => {
	const original = await importOriginal<typeof import('./starterPacks')>()
	return {
		...original,
		STARTER_PACK_IDS: ['diagramming', 'math'],
		loadStarterPackIndex: vi.fn(original.loadStarterPackIndex),
	}
})

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	HTMLImageElement.prototype.decode ??= () => Promise.resolve()
	Element.prototype.setPointerCapture ??= () => {}
	Element.prototype.releasePointerCapture ??= () => {}
	Element.prototype.hasPointerCapture ??= () => false
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

beforeEach(() => {
	state.app = null
	state.flags = { libraries_anonymous: { enabled: false } }
	state.trackEvent.mockClear()
	vi.mocked(loadStarterPackIndex).mockClear()
})

afterEach(() => {
	act(() => root?.unmount())
	container?.remove()
	root = null
	container = null
})

let offered: boolean | undefined

function OfferedProbe() {
	offered = useAnonLibrariesOffered()
	return null
}

async function renderEditor({
	provider = true,
	records = fileSchemaRecords,
}: { provider?: boolean; records?: typeof fileSchemaRecords | Record<string, never> } = {}) {
	container = document.createElement('div')
	document.body.appendChild(container)
	let mounted: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records }) })
	const editor = (
		<div style={{ width: 800, height: 600 }}>
			<Tldraw
				store={store}
				onMount={(e) => void (mounted = e)}
				components={{
					InFrontOfTheCanvas: () => (
						<>
							<OfferedProbe />
							<TlaAnonLibrariesPanel />
						</>
					),
					ContextMenu: (props) => (
						<DefaultContextMenu {...props}>
							<TlaAnonAddToLibraryMenuItem />
							<DefaultContextMenuContent />
						</DefaultContextMenu>
					),
				}}
			/>
		</div>
	)
	const wrapped: ReactNode = provider ? (
		<TlaAnonLibrariesProvider>{editor}</TlaAnonLibrariesProvider>
	) : (
		editor
	)
	root = createRoot(container)
	act(() => root!.render(wrapped))
	await vi.waitFor(() => expect(mounted).toBeDefined())
	act(() => mounted!.updateViewportScreenBounds(new Box(0, 0, 1280, 800)))
	// The flag resolves after mount, as the real fetch does.
	await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
	return mounted!
}

async function openPanel(editor: Editor) {
	act(() => librariesPanelOpen.set(editor, true))
	await vi.waitFor(() => expect(sectionNames()).toContain('Diagramming'), { timeout: 5000 })
	return container!.querySelector('.tlui-libraries-panel')!
}

const sectionNames = () =>
	[...container!.querySelectorAll('.tlui-libraries-panel__name')].map((el) => el.textContent)

const tiles = () => container!.querySelectorAll<HTMLButtonElement>('.tlui-libraries-tile__button')

const tileLabels = () => [...tiles()].map((el) => el.getAttribute('aria-label'))

function search(query: string) {
	const input = container!.querySelector<HTMLInputElement>(
		'.tlui-libraries-search__input input, input.tlui-libraries-search__input'
	)!
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
	act(() => {
		setValue.call(input, query)
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

async function unfold(name: string) {
	const toggle = [
		...container!.querySelectorAll<HTMLElement>('.tlui-libraries-panel__toggle'),
	].find((el) => el.textContent === name)!
	act(() => toggle.click())
	await vi.waitFor(() => expect(tiles().length).toBeGreaterThan(0))
}

function openContextMenu(editor: Editor) {
	const id = createShapeId()
	act(() => {
		editor.createShape({ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })
		editor.select(id)
	})
	const canvas = container!.querySelector('.tl-canvas')!
	act(() => {
		canvas.dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 150 })
		)
	})
}

const addToLibraryItem = () =>
	[...document.querySelectorAll('[role="menuitem"]')].find(
		(el) => el.textContent === 'Add to library'
	) as HTMLElement | undefined

describe('with libraries_anonymous off', () => {
	it('offers no libraries to a signed-out visitor', async () => {
		const editor = await renderEditor()
		expect(offered).toBe(false)
		act(() => librariesPanelOpen.set(editor, true))
		expect(container!.querySelector('.tlui-libraries-panel')).toBeNull()
		openContextMenu(editor)
		expect(addToLibraryItem()).toBeUndefined()
	})
})

describe('with libraries_anonymous on', () => {
	beforeEach(() => {
		state.flags = { libraries_anonymous: { enabled: true } }
	})

	it('lists the starter packs read-only, without controls that change them', async () => {
		const editor = await renderEditor()
		expect(offered).toBe(true)
		const panel = await openPanel(editor)

		expect(sectionNames()).toEqual(['Diagramming', 'Math'])
		await unfold('Diagramming')
		expect(panel.querySelector('.tlui-libraries-panel__create')).toBeNull()
		expect(panel.querySelector('.tlui-libraries-panel__browse-more')).toBeNull()
		const headerMenu = panel.querySelector(':scope > header [aria-label="Library options"]')!
		act(() => {
			headerMenu.dispatchEvent(
				new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
			)
		})
		await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).not.toBeNull())
		expect(
			[...document.querySelectorAll('.tlui-libraries-menu [role^="menuitem"]')].map(
				(item) => item.textContent
			)
		).toEqual(['Sort by'])
		expect(panel.querySelector('.tlui-libraries-add-tile')).toBeNull()
		expect(panel.textContent).not.toContain('This file')
		expect(panel.textContent).not.toContain('Browse libraries')
	})

	it('lists the packs folded shut, and fetches a pack only once it is unfolded', async () => {
		const editor = await renderEditor()
		await openPanel(editor)
		await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
		expect(tiles()).toHaveLength(0)
		expect(loadStarterPackIndex).not.toHaveBeenCalled()

		await unfold('Diagramming')

		expect(loadStarterPackIndex).toHaveBeenCalledTimes(1)
		expect(loadStarterPackIndex).toHaveBeenCalledWith('diagramming')
	})

	it("unfolds a folded pack's matches for a search, and folds it again once cleared", async () => {
		const editor = await renderEditor()
		await openPanel(editor)
		expect(loadStarterPackIndex).not.toHaveBeenCalled()

		search('process')
		await vi.waitFor(() => expect(tileLabels()).toEqual(['Process']))
		expect(loadStarterPackIndex).toHaveBeenCalledTimes(1)
		expect(loadStarterPackIndex).toHaveBeenCalledWith('diagramming')

		search('')
		await vi.waitFor(() => expect(sectionNames()).toEqual(['Diagramming', 'Math']))
		expect(
			[...container!.querySelectorAll('.tlui-libraries-panel__toggle')].map((el) =>
				el.getAttribute('aria-expanded')
			)
		).toEqual(['false', 'false'])
		expect(tiles()).toHaveLength(0)
	})

	it('says nothing matched straight away, without fetching any pack, for a search that misses', async () => {
		const editor = await renderEditor()
		const panel = await openPanel(editor)

		search('zzzz')

		expect(panel.textContent).toContain('No items found')
		expect(panel.textContent).not.toContain('Searching…')
		await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
		expect(loadStarterPackIndex).not.toHaveBeenCalled()
	})

	it('places an item on the canvas', async () => {
		const editor = await renderEditor()
		await openPanel(editor)
		await unfold('Diagramming')
		const tile = tiles()[0]

		act(() => tile.click())

		await vi.waitFor(() => expect(editor.getCurrentPageShapeIds().size).toBeGreaterThan(0))
	})

	it("lists the board's own libraries before the packs, read-only too", async () => {
		const editor = await renderEditor()
		await act(() => new BoardLibrarySource(editor).createLibrary('Our shapes'))
		const panel = await openPanel(editor)

		expect(sectionNames()).toEqual(['Our shapes', 'Diagramming', 'Math'])
		expect(
			[...panel.querySelectorAll('.tlui-libraries-panel__toggle')].map((el) =>
				el.getAttribute('aria-expanded')
			)
		).toEqual(['true', 'false', 'false'])
		expect(panel.textContent).toContain('No items yet.')
		expect(panel.querySelector('.tlui-libraries-add-tile')).toBeNull()
	})

	it('lists "This file" once someone has saved to it, with its items, read-only', async () => {
		const editor = await renderEditor()
		const board = new BoardLibrarySource(editor, { documentLibrary: { name: 'This file' } })
		const [own] = board.getLibraries()
		const id = createShapeId()
		act(() => editor.createShape({ id, type: 'geo' }))
		await act(() =>
			board.addItem(own.id, {
				name: 'Box',
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		)
		const panel = await openPanel(editor)

		expect(sectionNames()).toEqual(['This file', 'Diagramming', 'Math'])
		expect(tileLabels()).toEqual(['Box'])
		expect(panel.querySelector('.tlui-libraries-add-tile')).toBeNull()
	})

	it('lists only the starter packs on a board whose document holds no libraries', async () => {
		const editor = await renderEditor({ records: {} })
		await openPanel(editor)
		expect(sectionNames()).toEqual(['Diagramming', 'Math'])
	})

	it('turns "Add to library" into a sign-in prompt', async () => {
		const editor = await renderEditor()
		openContextMenu(editor)
		const item = await vi.waitFor(() => {
			const el = addToLibraryItem()
			expect(el).toBeDefined()
			return el!
		})

		act(() => item.click())

		expect(state.trackEvent).toHaveBeenCalledWith('sign-up-clicked', {
			source: 'libraries',
			ctaMessage: 'Add to library',
		})
		await vi.waitFor(() =>
			expect(document.querySelector('[data-testid="sign-in-dialog"]')).not.toBeNull()
		)
	})

	it('offers nothing to an editor that does not mount the panel', async () => {
		await renderEditor({ provider: false })
		expect(offered).toBe(false)
	})

	it('leaves signed-in users to their own libraries', async () => {
		state.app = {}
		const editor = await renderEditor()
		expect(offered).toBe(false)
		act(() => librariesPanelOpen.set(editor, true))
		expect(container!.querySelector('.tlui-libraries-panel')).toBeNull()
	})
})
