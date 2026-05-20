import { AssetRecordType, TLBookmarkShape, createShapeId, getHashForString } from '@tldraw/editor'
import { vi } from 'vitest'
import { createBookmarkFromUrl, getHumanReadableAddress } from '../lib/shapes/bookmark/bookmarks'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe('The URL formatter', () => {
	it('Formats URLs as human-readable', () => {
		const ids = {
			a: createShapeId(),
			b: createShapeId(),
			c: createShapeId(),
			d: createShapeId(),
			e: createShapeId(),
			f: createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.a,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com',
				},
			},
			{
				id: ids.b,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/',
				},
			},
			{
				id: ids.c,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond',
				},
			},
			{
				id: ids.d,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond/',
				},
			},
			{
				id: ids.e,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com//',
				},
			},
			{
				id: ids.f,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond/DreamBerd//',
				},
			},
		])

		const a = editor.getShape<TLBookmarkShape>(ids.a)!
		const b = editor.getShape<TLBookmarkShape>(ids.b)!
		const c = editor.getShape<TLBookmarkShape>(ids.c)!
		const d = editor.getShape<TLBookmarkShape>(ids.d)!
		const e = editor.getShape<TLBookmarkShape>(ids.e)!
		const f = editor.getShape<TLBookmarkShape>(ids.f)!

		expect(getHumanReadableAddress(a.props.url)).toBe('github.com')
		expect(getHumanReadableAddress(b.props.url)).toBe('github.com')
		expect(getHumanReadableAddress(c.props.url)).toBe('github.com')
		expect(getHumanReadableAddress(d.props.url)).toBe('github.com')
		expect(getHumanReadableAddress(e.props.url)).toBe('github.com')
		expect(getHumanReadableAddress(f.props.url)).toBe('github.com')
	})

	it("Doesn't resize bookmarks", () => {
		const ids = {
			bookmark: createShapeId(),
			boxA: createShapeId(),
			boxB: createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.bookmark,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond',
				},
			},
			{
				type: 'geo',
				id: ids.boxA,
				x: 0,
				y: 0,
				props: {
					w: 10,
					h: 10,
				},
			},
			{
				type: 'geo',
				id: ids.boxB,
				x: 20,
				y: 20,
				props: {
					w: 10,
					h: 10,
				},
			},
		])

		const oldBookmark = editor.getShape(ids.bookmark) as TLBookmarkShape
		expect(oldBookmark.props.w).toBe(300)
		expect(oldBookmark.props.h).toBe(320)

		editor.select(ids.bookmark, ids.boxA, ids.boxB)
		editor.pointerDown(20, 20, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(30, 30)

		const newBookmark = editor.getShape(ids.bookmark) as TLBookmarkShape
		expect(newBookmark.props.w).toBe(300)
		expect(newBookmark.props.h).toBe(320)
	})
})

describe('createBookmarkFromUrl', () => {
	it('creates a placeholder bookmark shape immediately and patches the asset once metadata resolves', async () => {
		const url = 'https://example.com'
		const center = { x: 100, y: 200 }

		// Use a deferred promise so we can observe state before the asset resolves.
		let resolveAsset: (asset: any) => void = () => {}
		const assetPromise = new Promise<any>((resolve) => {
			resolveAsset = resolve
		})

		const mockAsset = {
			id: 'asset:test-asset-id' as any,
			typeName: 'asset' as const,
			type: 'bookmark' as const,
			props: {
				src: url,
				title: 'Example Site',
				description: 'An example website',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			},
			meta: {},
		}

		vi.spyOn(editor, 'getAssetForExternalContent').mockReturnValue(assetPromise)

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value

		// Placeholder should exist before the asset resolves.
		expect(shape.type).toBe('bookmark')
		expect(shape.props.url).toBe(url)
		expect(shape.props.assetId).toBe(null)
		expect(shape.props.w).toBe(300)
		expect(shape.props.h).toBe(320)
		expect(shape.x).toBe(center.x - 150)
		expect(shape.y).toBe(center.y - 160)

		const placeholderInStore = editor.getShape<TLBookmarkShape>(shape.id)
		expect(placeholderInStore?.props.assetId).toBe(null)
		expect(editor.getAsset('asset:test-asset-id' as any)).toBeUndefined()

		// Resolve the asset and let the microtask queue flush.
		resolveAsset(mockAsset)
		await assetPromise

		const hydrated = editor.getShape<TLBookmarkShape>(shape.id)
		expect(hydrated?.props.assetId).toBe('asset:test-asset-id')
		const createdAsset = editor.getAsset('asset:test-asset-id' as any)
		expect(createdAsset).toBeDefined()
		expect(createdAsset?.type).toBe('bookmark')
	})

	it('creates a bookmark shape with default center when no center provided', async () => {
		const url = 'https://example.com'
		const viewportCenter = { x: 500, y: 300 }

		vi.spyOn(editor, 'getViewportPageBounds').mockReturnValue({
			x: 0,
			y: 0,
			w: 1000,
			h: 600,
			center: viewportCenter,
		} as any)

		vi.spyOn(editor, 'getAssetForExternalContent').mockResolvedValue({
			id: 'asset:test-asset-id' as any,
			typeName: 'asset' as const,
			type: 'bookmark' as const,
			props: {
				src: url,
				title: 'Example Site',
				description: 'An example website',
				image: '',
				favicon: '',
			},
			meta: {},
		})

		const result = await createBookmarkFromUrl(editor, { url })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value
		expect(shape.x).toBe(viewportCenter.x - 150)
		expect(shape.y).toBe(viewportCenter.y - 160)
	})

	it('keeps the placeholder bookmark when the asset fetch rejects', async () => {
		const url = 'https://invalid-url.com'
		const center = { x: 100, y: 200 }
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		vi.spyOn(editor, 'getAssetForExternalContent').mockRejectedValue(new Error('Failed to fetch'))

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(result.ok, 'Expected placeholder bookmark to be created even when fetch fails')
		const shape = result.value
		expect(shape.type).toBe('bookmark')
		expect(shape.props.url).toBe(url)
		expect(shape.props.assetId).toBe(null)

		// Wait for the rejected promise to be observed.
		await Promise.resolve()
		await Promise.resolve()

		const stillPlaceholder = editor.getShape<TLBookmarkShape>(shape.id)
		expect(stillPlaceholder?.props.assetId).toBe(null)

		consoleSpy.mockRestore()
	})

	it('creates bookmark shape even when asset creation returns null', async () => {
		const url = 'https://example.com'
		const center = { x: 100, y: 200 }

		vi.spyOn(editor, 'getAssetForExternalContent').mockResolvedValue(null as any)

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value
		expect(shape.type).toBe('bookmark')
		expect(shape.props.url).toBe(url)
		expect(shape.props.assetId).toBe(null)

		const createdShape = editor.getShape(result.value.id)
		expect(createdShape).toBeDefined()
	})

	it('reuses an existing bookmark asset for the same URL without re-fetching', async () => {
		const url = 'https://example.com'
		const center = { x: 100, y: 200 }

		let resolveFirst: (asset: any) => void = () => {}
		const firstPromise = new Promise<any>((resolve) => {
			resolveFirst = resolve
		})

		const fetchSpy = vi.spyOn(editor, 'getAssetForExternalContent')
		fetchSpy.mockReturnValueOnce(firstPromise)

		const first = await createBookmarkFromUrl(editor, { url, center })
		assert(first.ok)

		resolveFirst({
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				title: 'Example Site',
				description: 'desc',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			},
			meta: {},
		})
		await firstPromise
		// Yield once more so the hydrate continuation runs after the resolver.
		await Promise.resolve()

		const hydrated = editor.getShape<TLBookmarkShape>(first.value.id)
		expect(hydrated?.props.assetId).not.toBeNull()
		expect(fetchSpy).toHaveBeenCalledTimes(1)

		// Second creation for the same URL should reuse the asset and not fetch again.
		const second = await createBookmarkFromUrl(editor, { url, center: { x: 400, y: 500 } })
		assert(second.ok)
		expect(second.value.props.assetId).not.toBeNull()
		expect(fetchSpy).toHaveBeenCalledTimes(1)
	})
})
