import { TLBookmarkShape, createShapeId } from '@tldraw/editor'
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
	it('creates a bookmark shape with unfurled metadata', async () => {
		const url = 'https://example.com'
		const center = { x: 100, y: 200 }

		// Mock the asset creation to return a test asset
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

		// Mock the getAssetForExternalContent method
		vi.spyOn(editor, 'getAssetForExternalContent').mockResolvedValue(mockAsset)

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value
		expect(shape.type).toBe('bookmark')
		expect(shape.props.url).toBe(url)
		expect(shape.props.assetId).toBe('asset:test-asset-id')
		expect(shape.props.w).toBe(300)
		expect(shape.props.h).toBe(320)
		expect(shape.x).toBe(center.x - 150) // BOOKMARK_WIDTH / 2
		expect(shape.y).toBe(center.y - 160) // BOOKMARK_HEIGHT / 2

		// Verify the shape was created in the editor
		const createdShape = editor.getShape(result.value.id)
		expect(createdShape).toBeDefined()
		expect(createdShape?.type).toBe('bookmark')

		// Verify the asset was created
		const createdAsset = editor.getAsset('asset:test-asset-id' as any)
		expect(createdAsset).toBeDefined()
		expect(createdAsset?.type).toBe('bookmark')
	})

	it('creates a bookmark shape with default center when no center provided', async () => {
		const url = 'https://example.com'
		const viewportCenter = { x: 500, y: 300 }

		// Mock getViewportPageBounds to return a known center
		vi.spyOn(editor, 'getViewportPageBounds').mockReturnValue({
			x: 0,
			y: 0,
			w: 1000,
			h: 600,
			center: viewportCenter,
		} as any)

		const mockAsset = {
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
		}

		vi.spyOn(editor, 'getAssetForExternalContent').mockResolvedValue(mockAsset)

		const result = await createBookmarkFromUrl(editor, { url })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value
		expect(shape.x).toBe(viewportCenter.x - 150)
		expect(shape.y).toBe(viewportCenter.y - 160)
	})

	it('handles asset creation failure gracefully', async () => {
		const url = 'https://invalid-url.com'
		const center = { x: 100, y: 200 }

		// Mock the asset creation to fail
		vi.spyOn(editor, 'getAssetForExternalContent').mockRejectedValue(new Error('Failed to fetch'))

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(!result.ok, 'Failed to create bookmark')
		expect(result.error).toBe('Failed to fetch')

		// Verify no shape was created
		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(0)
	})

	it('creates bookmark shape even when asset creation returns null', async () => {
		const url = 'https://example.com'
		const center = { x: 100, y: 200 }

		// Mock the asset creation to return null
		vi.spyOn(editor, 'getAssetForExternalContent').mockResolvedValue(null as any)

		const result = await createBookmarkFromUrl(editor, { url, center })

		assert(result.ok, 'Failed to create bookmark')
		const shape = result.value
		expect(shape.type).toBe('bookmark')
		expect(shape.props.url).toBe(url)
		expect(shape.props.assetId).toBe(null)

		// Verify the shape was created
		const createdShape = editor.getShape(result.value.id)
		expect(createdShape).toBeDefined()
	})
})
