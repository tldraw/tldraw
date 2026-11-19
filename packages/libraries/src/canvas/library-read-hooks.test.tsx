import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
	atom,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	EditorContext,
	LibraryRecordType,
	setInLocalStorage,
	type TLLibraryId,
} from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItemRecordType, type TLLibraryItem, type TLLibraryItemContent } from '../lib/schema'
import { collapsedLibraryIds } from './state'
import { useLibraries } from './use-libraries'
import { useLibraryCan } from './use-library-can'
import { useLibraryCollapsed } from './use-library-collapsed'
import { useLibraryItemOrder } from './use-library-item-order'
import { useLibraryItems } from './use-library-items'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'

const library = LibraryRecordType.create({ name: 'Shapes' })
const content: TLLibraryItemContent = {
	formatVersion: 1,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

function makeItem(name: string, createdAt: number, partial: Partial<TLLibraryItem> = {}) {
	return LibraryItemRecordType.create({ libraryId: library.id, name, createdAt, ...partial })
}

function makeSource(items: TLLibraryItem[], options: { can?(): boolean; id?: string } = {}) {
	return new InMemoryLibrarySource({
		id: options.id ?? 'test',
		can: options.can,
		initial: {
			libraries: [library],
			items,
			contents: Object.fromEntries(items.map((item) => [item.id, content])),
		},
	})
}

let container: HTMLDivElement
let root: Root
let editor: Editor

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver
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
})

afterEach(() => {
	act(() => root.unmount())
	editor.dispose()
	container.remove()
})

/** Renders `useHook` inside an editor and returns a getter for its latest result. */
function renderHook<T>(useHook: () => T) {
	const result: { current?: T } = {}
	function Probe() {
		result.current = useHook()
		return null
	}
	act(() => {
		root.render(
			<EditorContext.Provider value={editor}>
				<Probe />
			</EditorContext.Provider>
		)
	})
	return () => result.current as T
}

describe('useLibraries', () => {
	it('lists the source’s libraries and follows changes', async () => {
		const source = makeSource([])
		const libraries = renderHook(() => useLibraries(source))
		expect(libraries().map((l) => l.name)).toEqual(['Shapes'])
		await act(() => source.createLibrary('Icons'))
		expect(libraries().map((l) => l.name)).toEqual(['Shapes', 'Icons'])
	})
})

describe('useLibraryItems', () => {
	const items = [makeItem('Box', 1), makeItem('Arrow', 3), makeItem('Circle', 2)]

	it('keeps the source’s order by default', () => {
		const source = makeSource(items)
		const result = renderHook(() => useLibraryItems(source, library.id))
		expect(result().map((i) => i.name)).toEqual(['Box', 'Arrow', 'Circle'])
	})

	it('orders by name or date, reversed if asked', () => {
		const source = makeSource(items)
		const byName = renderHook(() => useLibraryItems(source, library.id, { ordering: 'name' }))
		expect(byName().map((i) => i.name)).toEqual(['Arrow', 'Box', 'Circle'])
		const newest = renderHook(() =>
			useLibraryItems(source, library.id, { ordering: 'newest', reversed: true })
		)
		expect(newest().map((i) => i.name)).toEqual(['Box', 'Circle', 'Arrow'])
	})

	it('follows items being added', async () => {
		const source = makeSource([])
		const result = renderHook(() => useLibraryItems(source, library.id))
		expect(result()).toEqual([])
		await act(() => source.addItem(library.id, { name: 'Box', content }))
		expect(result().map((i) => i.name)).toEqual(['Box'])
	})
})

describe('useLibraryItemOrder', () => {
	it('defaults to the source’s order and shares a choice between callers', () => {
		const source = makeSource([], { id: 'shared' })
		const result = renderHook(() => ({
			a: useLibraryItemOrder(source, library.id),
			b: useLibraryItemOrder(source, library.id),
		}))
		expect(result().a).toMatchObject({ ordering: 'source', reversed: false })
		act(() => result().a.setOrdering('name'))
		act(() => result().a.setReversed(true))
		expect(result().b).toMatchObject({ ordering: 'name', reversed: true })
	})

	it('reads a stale stored ordering as the default', () => {
		const source = makeSource([], { id: 'stale' })
		setInLocalStorage(
			`tldraw-libraries-item-order:stale:${library.id}`,
			JSON.stringify({ orderingId: 'gone', reversed: false })
		)
		const result = renderHook(() => useLibraryItemOrder(source, library.id))
		expect(result().ordering).toBe('source')
	})
})

describe('useLibraryThumbnailUrls', () => {
	it('gives each item its own thumbnail for the colour mode, undefined for none', () => {
		const withThumb = makeItem('Box', 1, {
			thumbnail: { light: 'https://x/light.png', dark: 'https://x/dark.png' },
		})
		const without = makeItem('Bare', 2)
		const source = makeSource([withThumb, without])
		const urls = renderHook(() => useLibraryThumbnailUrls(source, [withThumb, without]))
		expect(urls()).toEqual({ [withThumb.id]: 'https://x/light.png', [without.id]: undefined })
		act(() => editor.user.updateUserPreferences({ colorScheme: 'dark' }))
		expect(urls()[withThumb.id]).toBe('https://x/dark.png')
	})

	function makeResolvingSource() {
		const a = makeItem('A', 1)
		const b = makeItem('B', 2)
		const widths: number[] = []
		const source: LibrarySource = Object.assign(makeSource([a, b]), {
			resolveThumbnail: (item: TLLibraryItem, context: { width: number }) => {
				widths.push(context.width)
				return item.id === a.id ? `https://x/${context.width}.png` : null
			},
		})
		return { source, a, b, widths }
	}

	it('asks the source for URLs sized to the container’s tiles, giving undefined for null', () => {
		const { source, a, b, widths } = makeResolvingSource()
		const tiles = document.createElement('div')
		const thumbnail = document.createElement('div')
		thumbnail.className = 'tlui-libraries-tile__thumbnail'
		Object.defineProperty(thumbnail, 'offsetWidth', { value: 200 })
		tiles.appendChild(thumbnail)
		const urls = renderHook(() => useLibraryThumbnailUrls(source, [a, b], { container: tiles }))
		expect(urls()).toEqual({ [a.id]: 'https://x/256.png', [b.id]: undefined })
		expect(widths.at(-1)).toBe(256)
	})

	it('sizes URLs for a width it is given, rounded up to a power of two', () => {
		const { source, a, b, widths } = makeResolvingSource()
		const urls = renderHook(() => useLibraryThumbnailUrls(source, [a, b], { width: 300 }))
		expect(urls()[a.id]).toBe('https://x/512.png')
		expect(widths).toEqual([512, 512])
	})

	it('sizes URLs for the panel’s tiles when there is no tile to measure', () => {
		const { source, a, b, widths } = makeResolvingSource()
		const urls = renderHook(() =>
			useLibraryThumbnailUrls(source, [a, b], { container: document.createElement('div') })
		)
		expect(urls()[a.id]).toBe('https://x/128.png')
		expect(widths).toEqual([128, 128])
	})
})

describe('useLibraryCan', () => {
	it('answers as the source does and follows its answer', () => {
		const allowed = atom('allowed', false)
		const source = makeSource([], { can: () => allowed.get() })
		const can = renderHook(() => useLibraryCan(source, 'addItem', library.id))
		expect(can()).toBe(false)
		act(() => allowed.set(true))
		expect(can()).toBe(true)
		const missing = renderHook(() =>
			useLibraryCan(source, 'addItem', 'library:missing' as TLLibraryId)
		)
		expect(missing()).toBe(false)
	})
})

describe('useLibraryCollapsed', () => {
	it('reads and sets the editor’s collapsed libraries', () => {
		const result = renderHook(() => useLibraryCollapsed(library.id))
		expect(result()[0]).toBe(false)
		act(() => result()[1](true))
		expect(result()[0]).toBe(true)
		expect(collapsedLibraryIds.get(editor)).toEqual([library.id])
		act(() => result()[1](false))
		expect(collapsedLibraryIds.get(editor)).toEqual([])
	})
})
