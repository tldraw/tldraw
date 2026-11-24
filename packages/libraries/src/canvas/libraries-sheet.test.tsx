import { librarySchemaRecords } from '@tldraw/tlschema'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	Box,
	createShapeId,
	createTLSchema,
	createTLStore,
	Editor,
	LibraryRecordType,
	Tldraw,
	useEditor,
} from 'tldraw'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { getItemMenuId } from '../ui/item-menu'
import { LibrariesPanel } from './libraries-panel'
import { librariesPanelOpen } from './state'

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
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
	Element.prototype.setPointerCapture ??= () => {}
	Element.prototype.releasePointerCapture ??= () => {}
	Element.prototype.hasPointerCapture ??= () => false
	URL.createObjectURL ??= () => 'blob:thumbnail'
	URL.revokeObjectURL ??= () => {}
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

const shapes = LibraryRecordType.create({ name: 'Shapes' })
const icons = LibraryRecordType.create({ name: 'Icons' })

async function renderPanel({
	forceMobile,
	browsable = false,
	twoLibraries = false,
}: {
	forceMobile: boolean
	/** Gives the source a library to add, so the panel offers Browse. */
	browsable?: boolean
	/** Shows a second library, so an item can be moved to it, and owners to copy a library to. */
	twoLibraries?: boolean
}) {
	container = document.createElement('div')
	document.body.appendChild(container)
	const source = new InMemoryLibrarySource({
		owners: twoLibraries
			? [
					{ id: 'home', name: 'Personal' },
					{ id: 'acme', name: 'Acme' },
				]
			: undefined,
		initial: {
			libraries: browsable || twoLibraries ? [shapes, icons] : [shapes],
			items: [],
			contents: {},
		},
		shownInDocument: browsable ? [{ libraryId: shapes.id, placement: 'added' }] : undefined,
	})
	let editor: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) })
	const Panel = () => {
		useEditor()
		return <LibrariesPanel source={source} />
	}
	root = createRoot(container)
	act(() => {
		root!.render(
			<div style={{ width: 390, height: 844 }}>
				<button className="opener">Open</button>
				<Tldraw
					store={store}
					forceMobile={forceMobile}
					onMount={(e) => void (editor = e)}
					components={{ InFrontOfTheCanvas: Panel }}
				/>
			</div>
		)
	})
	await vi.waitFor(() => expect(editor).toBeDefined())
	const ed = editor!
	ed.user.updateUserPreferences({ animationSpeed: 0 })
	// jsdom lays nothing out, so the editor would measure a 1px viewport: a phone.
	act(() => ed.updateViewportScreenBounds(new Box(0, 0, forceMobile ? 390 : 1280, 800)))

	const id = createShapeId()
	ed.run(() => ed.createShapes([{ id, type: 'geo', props: { w: 100, h: 100 } }]), {
		history: 'ignore',
	})
	const content = ed.getContentFromCurrentPage([id])!
	ed.run(() => ed.deleteShapes([id]), { history: 'ignore' })
	const box = await source.addItem(shapes.id, {
		name: 'Box',
		content: { formatVersion: 1, content },
	})

	const opener = container.querySelector<HTMLButtonElement>('.opener')!
	opener.focus()
	act(() => librariesPanelOpen.set(ed, true))
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-panel')).not.toBeNull())
	return { editor: ed, box, opener }
}

const sheet = () => document.querySelector<HTMLElement>('.tlui-libraries-sheet')
const tile = () => document.querySelector<HTMLButtonElement>('.tlui-libraries-tile__button')!

function touch(type: string, target: Element, x = 10, y = 10) {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })
	Object.defineProperty(event, 'pointerType', { value: 'touch' })
	Object.defineProperty(event, 'pointerId', { value: 1 })
	act(() => void target.dispatchEvent(event))
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

it('floats as a panel on a wider screen', async () => {
	await renderPanel({ forceMobile: false })
	expect(sheet()).toBeNull()
	expect(document.querySelector('section.tlui-libraries-panel')!.getAttribute('aria-label')).toBe(
		'Libraries'
	)
})

it('opens as a modal dialog named Libraries on a phone', async () => {
	await renderPanel({ forceMobile: true })
	const dialog = sheet()!
	expect(dialog.getAttribute('role')).toBe('dialog')
	expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe(
		'Libraries'
	)
	expect(document.querySelector('.tlui-libraries-sheet__overlay')).not.toBeNull()
})

it('places a tapped item and closes the sheet', async () => {
	const { editor } = await renderPanel({ forceMobile: true })
	await vi.waitFor(() => expect(tile()).toBeDefined())
	act(() => tile().click())
	await vi.waitFor(() => expect(editor.getCurrentPageShapes()).toHaveLength(1))
	expect(editor.getSelectedShapeIds()).toEqual([editor.getCurrentPageShapes()[0].id])
	expect(librariesPanelOpen.get(editor)).toBe(false)
	await vi.waitFor(() => expect(sheet()).toBeNull())
})

it('closes on Escape and hands focus back to what had it', async () => {
	const { editor, opener } = await renderPanel({ forceMobile: true })
	expect(document.activeElement).toBe(sheet())
	act(() => {
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
		)
	})
	expect(librariesPanelOpen.get(editor)).toBe(false)
	await vi.waitFor(() => expect(sheet()).toBeNull())
	await vi.waitFor(() => expect(document.activeElement).toBe(opener))
})

it('opens an item’s menu on a long press, without placing it', async () => {
	const { editor, box } = await renderPanel({ forceMobile: true })
	await vi.waitFor(() => expect(tile()).toBeDefined())
	touch('pointerdown', tile())
	await wait(600)
	expect(editor.menus.isMenuOpen(getItemMenuId(box.id))).toBe(true)
	await wait(200)
	expect(editor.menus.isMenuOpen(`context menu-${editor.contextId}`)).toBe(false)
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).not.toBeNull())
	touch('pointerup', tile())
	act(() => tile().click())
	await wait(20)
	expect(editor.getCurrentPageShapes()).toHaveLength(0)
	expect(librariesPanelOpen.get(editor)).toBe(true)
})

it('opens a library’s menu on a long press on its header', async () => {
	const { editor } = await renderPanel({ forceMobile: true })
	const toggle = await vi.waitFor(() => {
		const el = document.querySelector<HTMLButtonElement>('.tlui-libraries-panel__toggle')
		expect(el).not.toBeNull()
		return el!
	})
	touch('pointerdown', toggle)
	await wait(600)
	expect(editor.menus.isMenuOpen(`libraries-library-menu-${shapes.id}`)).toBe(true)
	touch('pointerup', toggle)
	act(() => toggle.click())
	expect(toggle.getAttribute('aria-expanded')).toBe('true')
})

it('offers moving an item to another library, but not moving a library', async () => {
	const { editor, box } = await renderPanel({ forceMobile: true, twoLibraries: true })
	await vi.waitFor(() => expect(tile()).toBeDefined())
	const menuLabels = () =>
		[...document.querySelectorAll('.tlui-libraries-menu [role^="menuitem"]')].map(
			(item) => item.textContent
		)
	touch('pointerdown', tile())
	await wait(600)
	expect(editor.menus.isMenuOpen(getItemMenuId(box.id))).toBe(true)
	await vi.waitFor(() => expect(menuLabels()).toContain('Move to'))
	touch('pointerup', tile())
	act(() => editor.menus.clearOpenMenus())
	await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).toBeNull())

	const toggle = document.querySelector<HTMLButtonElement>('.tlui-libraries-panel__toggle')!
	touch('pointerdown', toggle)
	await wait(600)
	expect(editor.menus.isMenuOpen(`libraries-library-menu-${shapes.id}`)).toBe(true)
	await vi.waitFor(() => expect(menuLabels()).toContain('Rename library'))
	expect(menuLabels()).toContain('Copy to')
	expect(menuLabels()).not.toContain('Move to')
	touch('pointerup', toggle)
})

it('moves between its heights with the handle, by tap or arrow key', async () => {
	await renderPanel({ forceMobile: true })
	const handle = document.querySelector<HTMLButtonElement>('button[aria-label="Resize libraries"]')!
	expect(sheet()!.dataset.detent).toBe('half')
	act(() => handle.click())
	expect(sheet()!.dataset.detent).toBe('full')
	expect(handle.getAttribute('aria-expanded')).toBe('true')
	act(() => {
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
	})
	expect(sheet()!.dataset.detent).toBe('half')
})

/**
 * The window as iOS Safari reports it: the layout viewport keeps its height when the keyboard
 * opens, the visual viewport shrinks, and the page scrolls to bring the focused field up, which
 * shows as `scrollY` and `visualViewport.offsetTop`, with `innerHeight` following the visual
 * viewport.
 */
function mockIosWindow(layoutHeight: number) {
	const vv = Object.assign(new EventTarget(), { height: layoutHeight, offsetTop: 0 })
	let scrollY = 0
	let innerHeight = layoutHeight
	const windowProps = {
		visualViewport: () => vv,
		scrollY: () => scrollY,
		innerHeight: () => innerHeight,
	}
	const descriptors = Object.keys(windowProps).map(
		(key) => [key, Object.getOwnPropertyDescriptor(window, key)] as const
	)
	for (const [key, get] of Object.entries(windowProps)) {
		Object.defineProperty(window, key, { configurable: true, get })
	}
	const restore = [
		vi
			.spyOn(document.documentElement, 'clientHeight', 'get')
			.mockImplementation(() => layoutHeight),
		vi
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockImplementation(function (this: HTMLElement) {
				const top = this.classList.contains('tl-container') ? -scrollY : 0
				const height = this.classList.contains('tl-container') ? layoutHeight : 0
				return new DOMRect(0, top, 390, height)
			}),
	]
	const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(((x: number, y: number) => {
		scrollY = y
		vv.offsetTop = y
		innerHeight = y === 0 ? layoutHeight : vv.height
	}) as typeof window.scrollTo)
	const scrollPage = (y: number) => {
		scrollY = y
		vv.offsetTop = y
		innerHeight = vv.height
		act(() => {
			window.dispatchEvent(new Event('scroll'))
			vv.dispatchEvent(new Event('scroll'))
		})
	}
	return {
		scrollTo,
		openKeyboard(height: number) {
			act(() => {
				vv.height = layoutHeight - height
				innerHeight = vv.height
				vv.dispatchEvent(new Event('resize'))
			})
		},
		closeKeyboard() {
			act(() => {
				vv.height = layoutHeight
				innerHeight = layoutHeight
				vv.dispatchEvent(new Event('resize'))
			})
		},
		scrollPage,
		restore() {
			for (const spy of [...restore, scrollTo]) spy.mockRestore()
			for (const [key, descriptor] of descriptors) {
				if (descriptor) Object.defineProperty(window, key, descriptor)
				else delete (window as any)[key]
			}
		},
	}
}

it('reaches up to the top bar above the keyboard, keeping the page from scrolling', async () => {
	const ios = mockIosWindow(714)
	try {
		await renderPanel({ forceMobile: true })
		expect(sheet()!.style.height).toBe('357px')
		expect(sheet()!.style.top).toBe('357px')

		ios.openKeyboard(250)
		ios.scrollPage(250)
		expect(ios.scrollTo).toHaveBeenLastCalledWith(0, 0)
		expect(window.scrollY).toBe(0)
		expect(sheet()!.style.height).toBe('416px')
		expect(sheet()!.style.top).toBe('48px')
		expect(sheet()!.dataset.detent).toBe('half')

		ios.closeKeyboard()
		expect(sheet()!.style.height).toBe('357px')
		expect(sheet()!.style.top).toBe('357px')
	} finally {
		ios.restore()
	}
})

const browse = () =>
	document.querySelector<HTMLElement>('.tlui-libraries-sheet .tlui-libraries-browse')
const sheetName = () =>
	document.getElementById(sheet()!.getAttribute('aria-labelledby')!)!.textContent
const backButton = () => sheet()!.querySelector<HTMLButtonElement>('.tlui-libraries-browse__back')!

async function openBrowse() {
	const addMore = await vi.waitFor(() => {
		const el = document.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')
		expect(el).not.toBeNull()
		return el!
	})
	act(() => addMore.click())
	await vi.waitFor(() => expect(browse()).not.toBeNull())
}

it('opens Browse in a centred dialog on a wider screen', async () => {
	await renderPanel({ forceMobile: false, browsable: true })
	act(() =>
		document.querySelector<HTMLButtonElement>('button.tlui-libraries-panel__browse-more')!.click()
	)
	await vi.waitFor(() =>
		expect(document.querySelector('.tlui-dialog__content .tlui-libraries-browse')).not.toBeNull()
	)
	expect(document.querySelector('[data-testid="dialog.close"]')).not.toBeNull()
})

it('shows Browse in place of the libraries on a phone, with Back in place of a ✕', async () => {
	await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
	expect(document.querySelector('.tlui-dialog__content')).toBeNull()
	expect(sheet()!.querySelector('.tlui-libraries-sections')).toBeNull()
	expect(sheetName()).toBe('Browse libraries')
	expect(sheet()!.querySelector('[data-testid="dialog.close"]')).toBeNull()
	expect(document.activeElement).toBe(backButton())
})

it('goes back from Browse to the libraries, focusing Add more libraries', async () => {
	const { editor } = await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	act(() => backButton().click())
	await vi.waitFor(() => expect(browse()).toBeNull())
	expect(sheetName()).toBe('Libraries')
	expect(librariesPanelOpen.get(editor)).toBe(true)
	expect(document.activeElement).toBe(
		document.querySelector('button.tlui-libraries-panel__browse-more')
	)
})

it('goes back from Browse on a tap whose click iOS drops at the screen’s edge', async () => {
	await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	const scrolled = new Event('touchend', { bubbles: true, cancelable: false })
	act(() => void backButton().dispatchEvent(scrolled))
	expect(browse()).not.toBeNull()
	const tapped = new Event('touchend', { bubbles: true, cancelable: true })
	act(() => void backButton().dispatchEvent(tapped))
	expect(tapped.defaultPrevented).toBe(true)
	await vi.waitFor(() => expect(browse()).toBeNull())
	expect(sheetName()).toBe('Libraries')
})

it('adds a library from Browse in place, keeping its card, the scroll and the focus', async () => {
	await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	const body = browse()!
	body.scrollTop = 40
	const card = [...body.querySelectorAll('.tlui-libraries-browse__card')].find((c) =>
		c.textContent!.includes('Icons')
	)!
	const group = card.closest('section')
	const add = [...card.querySelectorAll('button')].find((b) => b.textContent === 'Add to file')!
	add.focus()
	act(() => add.click())
	await vi.waitFor(() => expect(card.textContent).toContain('Remove'))
	expect(card.isConnected).toBe(true)
	expect(card.closest('section')).toBe(group)
	expect(document.activeElement).toBe(
		[...card.querySelectorAll('button')].find((b) => b.textContent === 'Remove')
	)
	expect(body.scrollTop).toBe(40)
})

it('opens a library from Browse one level deeper, with its own Back to Browse', async () => {
	await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	act(() => sheet()!.querySelector<HTMLButtonElement>('.tlui-libraries-browse__view')!.click())
	await vi.waitFor(() => expect(sheetName()).toBe('Shapes'))
	expect(document.activeElement).toBe(backButton())
	act(() => backButton().click())
	await vi.waitFor(() => expect(sheetName()).toBe('Browse libraries'))
	expect(browse()).not.toBeNull()
})

it('closes the whole sheet from Browse on Escape', async () => {
	const { editor } = await renderPanel({ forceMobile: true, browsable: true })
	await openBrowse()
	act(() => {
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
		)
	})
	expect(librariesPanelOpen.get(editor)).toBe(false)
	await vi.waitFor(() => expect(sheet()).toBeNull())
	act(() => librariesPanelOpen.set(editor, true))
	await vi.waitFor(() => expect(sheet()).not.toBeNull())
	expect(browse()).toBeNull()
	expect(sheetName()).toBe('Libraries')
})

it('has a close button for screen readers', async () => {
	const { editor } = await renderPanel({ forceMobile: true })
	const close = [...sheet()!.querySelectorAll('button')].find(
		(button) => button.textContent === 'Close libraries'
	)!
	act(() => close.click())
	expect(librariesPanelOpen.get(editor)).toBe(false)
})

it('closes on one tap on the scrim after a tap inside it', async () => {
	const { editor } = await renderPanel({ forceMobile: true })
	await wait(10)
	const header = sheet()!.querySelector('.tlui-libraries-panel__header')!
	touch('pointerdown', header)
	touch('pointerup', header)
	touch('click', header)
	expect(librariesPanelOpen.get(editor)).toBe(true)
	const scrim = document.querySelector('.tlui-libraries-sheet__overlay')!
	touch('pointerdown', scrim)
	touch('pointerup', scrim)
	touch('click', scrim)
	expect(librariesPanelOpen.get(editor)).toBe(false)
})
