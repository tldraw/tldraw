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

async function renderPanel({ forceMobile }: { forceMobile: boolean }) {
	container = document.createElement('div')
	document.body.appendChild(container)
	const source = new InMemoryLibrarySource({
		initial: { libraries: [shapes], items: [], contents: {} },
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
