import { librarySchemaRecords } from '@tldraw/tlschema'
import { act, useMemo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTLSchema, createTLStore, Editor, Tldraw, useEditor } from 'tldraw'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
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

async function renderPanel() {
	container = document.createElement('div')
	document.body.appendChild(container)
	let mounted: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) })
	const Panel = () => {
		const source = useMemo(() => new InMemoryLibrarySource(), [])
		useEditor()
		return <LibrariesPanel source={source} />
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
