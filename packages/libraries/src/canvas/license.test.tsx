import { librarySchemaRecords } from '@tldraw/tlschema'
import { act, useMemo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	LicenseManager,
	Tldraw,
	useEditor,
} from 'tldraw'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { BoardLibrarySource } from '../lib/BoardLibrarySource'
import { CURRENT_ITEM_CONTENT_FORMAT_VERSION } from '../lib/schema'
import { MenuItem } from '../ui/menu-items'
import { LibrariesPanel, type LibrariesPanelProps } from './libraries-panel'
import { LibrariesPanelButton } from './libraries-panel-button'
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
let editors: Editor[] = []

afterEach(() => {
	act(() => root?.unmount())
	container?.remove()
	root = null
	container = null
	for (const editor of editors) editor.dispose()
	editors = []
})

async function settled(licenseManager: LicenseManager) {
	await vi.waitFor(() => expect(licenseManager.state.get()).not.toBe('pending'))
}

function setLibrariesLicensed(licenseManager: LicenseManager, licensed: boolean) {
	licenseManager.featureFlags.set({ ...licenseManager.featureFlags.get(), libraries: licensed })
}

async function renderWithLibraries(panelProps?: Partial<LibrariesPanelProps>) {
	container = document.createElement('div')
	document.body.appendChild(container)
	let mounted: Editor | undefined
	const store = createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) })
	const Libraries = () => {
		const editor = useEditor()
		const source = useMemo(() => new BoardLibrarySource(editor), [editor])
		return (
			<>
				<LibrariesPanel source={source} {...panelProps} />
				<div className="libraries-button-slot">
					<LibrariesPanelButton />
				</div>
			</>
		)
	}
	root = createRoot(container)
	act(() => {
		root!.render(
			<div style={{ width: 800, height: 600 }}>
				<Tldraw
					store={store}
					onMount={(editor) => {
						mounted = editor
					}}
					components={{ InFrontOfTheCanvas: Libraries }}
				/>
			</div>
		)
	})
	await vi.waitFor(() => expect(mounted).toBeDefined())
	const editor = mounted!
	const licenseManager = editor.licenseManager!
	await settled(licenseManager)
	return { editor, licenseManager, container }
}

describe('libraries UI', () => {
	it('renders when libraries are licensed and nothing when they are not', async () => {
		const { editor, licenseManager, container } = await renderWithLibraries()
		const panel = () => container.querySelector('.tlui-libraries-panel')
		const button = () => container.querySelector('.libraries-button-slot button')
		librariesPanelOpen.set(editor, true)

		await vi.waitFor(() => expect(panel()).not.toBeNull())
		expect(button()).not.toBeNull()

		setLibrariesLicensed(licenseManager, false)
		await vi.waitFor(() => expect(panel()).toBeNull())
		expect(button()).toBeNull()

		setLibrariesLicensed(licenseManager, true)
		await vi.waitFor(() => expect(panel()).not.toBeNull())
		expect(button()).not.toBeNull()
	})
})

describe('host items in a library menu', () => {
	it("adds the host's items to the libraries it returns them for", async () => {
		const onRemove = vi.fn()
		const { editor, container } = await renderWithLibraries({
			libraryMenuItems: (library) =>
				library.name === 'Pack' ? <MenuItem label="Remove" onClick={onRemove} /> : null,
		})
		const source = new BoardLibrarySource(editor)
		await act(async () => {
			await source.createLibrary('Pack')
			await source.createLibrary('Mine')
		})
		librariesPanelOpen.set(editor, true)

		const openMenu = async (name: string) => {
			const section = [...container.querySelectorAll('.tlui-libraries-section')].find(
				(s) => s.querySelector('.tlui-libraries-panel__name')?.textContent === name
			)!
			const trigger = section.querySelector('.tlui-libraries-panel__header-actions button')!
			act(() => {
				trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
			})
			await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).not.toBeNull())
			return [...document.querySelectorAll('.tlui-libraries-menu__item')]
		}
		const findRemove = (items: Element[]) => items.find((i) => i.textContent === 'Remove')

		await vi.waitFor(() =>
			expect(container.querySelectorAll('.tlui-libraries-section')).toHaveLength(2)
		)
		const packItems = await openMenu('Pack')
		act(() => (findRemove(packItems) as HTMLElement).click())
		expect(onRemove).toHaveBeenCalledTimes(1)

		await vi.waitFor(() => expect(document.querySelector('.tlui-libraries-menu')).toBeNull())
		expect(findRemove(await openMenu('Mine'))).toBeUndefined()
	})
})

describe('library records without the libraries license', () => {
	function makeUnlicensedEditor() {
		const editor = new Editor({
			store: createTLStore({ schema: createTLSchema({ records: librarySchemaRecords }) }),
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.body,
		})
		editors.push(editor)
		return editor
	}

	it('still load, save and place', async () => {
		const editor = makeUnlicensedEditor()
		const licenseManager = new LicenseManager(undefined)
		await settled(licenseManager)
		setLibrariesLicensed(licenseManager, false)
		editor.licenseManager = licenseManager
		expect(licenseManager.isFeatureEnabled('libraries')).toBe(false)

		const source = new BoardLibrarySource(editor)
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0 })
		const library = await source.createLibrary('Kit')
		const item = await source.addItem(library.id, {
			content: {
				formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION,
				content: editor.getContentFromCurrentPage([shapeId])!,
			},
		})

		const reloaded = makeUnlicensedEditor()
		reloaded.loadSnapshot(editor.getSnapshot())
		const reloadedSource = new BoardLibrarySource(reloaded)
		expect(reloadedSource.getLibraries()).toEqual([library])
		expect(reloadedSource.getItems(library.id)).toEqual([item])
		const { content } = await reloadedSource.getItemContent(item.id)
		reloaded.putContentOntoCurrentPage(content)
		expect(reloaded.getCurrentPageShapes().filter((s) => s.type === 'geo')).toHaveLength(2)
		licenseManager.dispose()
	})
})
