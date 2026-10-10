import { AssetRecordType, TLAssetId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

function createImage(index: number, assetId = AssetRecordType.createId(`asset-${index}`)) {
	editor.createAssets([
		{
			type: 'image',
			id: assetId,
			typeName: 'asset',
			props: {
				w: 100,
				h: 100,
				name: `image-${index}.png`,
				isAnimated: false,
				mimeType: 'image/png',
				src: `https://example.com/${index}.png`,
			},
			meta: {},
		},
	])
	const shapeId = createShapeId(`shape-${index}`)
	editor.createShapes([
		{
			id: shapeId,
			type: 'image',
			x: index * 120,
			y: 0,
			props: { w: 100, h: 100, assetId, crop: null, flipX: false, flipY: false },
		},
	])
	return { shapeId, assetId }
}

function createVideo(index: number, assetId = AssetRecordType.createId(`video-${index}`)) {
	editor.createAssets([
		{
			type: 'video',
			id: assetId,
			typeName: 'asset',
			props: {
				w: 100,
				h: 100,
				name: `video-${index}.mp4`,
				isAnimated: true,
				mimeType: 'video/mp4',
				src: `https://example.com/${index}.mp4`,
			},
			meta: {},
		},
	])
	const shapeId = createShapeId(`video-shape-${index}`)
	editor.createShapes([
		{ id: shapeId, type: 'video', x: 0, y: 0, props: { w: 100, h: 100, assetId } },
	])
	return { shapeId, assetId }
}

function createBookmark(index: number, assetId = AssetRecordType.createId(`bookmark-${index}`)) {
	const url = `https://example.com/${index}`
	editor.createAssets([
		{
			type: 'bookmark',
			id: assetId,
			typeName: 'asset',
			props: { title: '', description: '', image: '', favicon: '', src: url },
			meta: {},
		},
	])
	const shapeId = createShapeId(`bookmark-shape-${index}`)
	editor.createShapes([{ id: shapeId, type: 'bookmark', x: 0, y: 0, props: { assetId, url } }])
	return { shapeId, assetId }
}

describe('getUnusedAssetIds', () => {
	it('returns nothing for an empty store', () => {
		expect(editor.getUnusedAssetIds()).toEqual([])
	})

	it('returns nothing when every asset is referenced', () => {
		createImage(0)
		createImage(1)
		expect(editor.getUnusedAssetIds()).toEqual([])
	})

	it('returns assets whose shapes have been deleted', () => {
		const a = createImage(0)
		const b = createImage(1)
		editor.deleteShapes([a.shapeId])

		expect(editor.getUnusedAssetIds()).toEqual([a.assetId])
		// The still-referenced asset is untouched.
		expect(editor.getUnusedAssetIds()).not.toContain(b.assetId)
	})

	it('treats an asset shared by multiple shapes as used until all are gone', () => {
		const shared = AssetRecordType.createId('shared')
		const a = createImage(0, shared)
		const b = createImage(1, shared)

		editor.deleteShapes([a.shapeId])
		expect(editor.getUnusedAssetIds()).toEqual([]) // still used by b

		editor.deleteShapes([b.shapeId])
		expect(editor.getUnusedAssetIds()).toEqual([shared])
	})

	it('detects orphaned video assets', () => {
		const v = createVideo(0)
		expect(editor.getUnusedAssetIds()).toEqual([])
		editor.deleteShapes([v.shapeId])
		expect(editor.getUnusedAssetIds()).toEqual([v.assetId])
	})

	it('detects orphaned bookmark assets', () => {
		const b = createBookmark(0)
		expect(editor.getUnusedAssetIds()).toEqual([])
		editor.deleteShapes([b.shapeId])
		expect(editor.getUnusedAssetIds()).toEqual([b.assetId])
	})

	it('counts shapes on other pages as references', () => {
		createImage(0)
		const page1 = editor.getCurrentPageId()
		editor.createPage({ name: 'Page 2' })
		const page2 = editor.getPages().find((p) => p.id !== page1)!.id
		editor.setCurrentPage(page2)

		// The shape that references the asset lives on page 1, not the current page.
		expect(editor.getUnusedAssetIds()).toEqual([])
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
	})
})

describe('pruneUnusedAssets', () => {
	it('removes orphaned assets and returns their ids', () => {
		const a = createImage(0)
		const b = createImage(1)
		editor.deleteShapes([a.shapeId, b.shapeId])

		// getUnusedAssetIds/pruneUnusedAssets do not guarantee a return order, so
		// compare as a set whenever more than one id is involved.
		const removed = editor.pruneUnusedAssets()
		expect(new Set(removed)).toEqual(new Set([a.assetId, b.assetId]))
		expect(editor.getAssets()).toEqual([])
	})

	it('returns an empty array when nothing is unused', () => {
		createImage(0)
		createImage(1)

		expect(editor.pruneUnusedAssets()).toEqual([])
		expect(editor.getAssets()).toHaveLength(2)
	})

	it('keeps assets that are still referenced', () => {
		const a = createImage(0)
		const b = createImage(1)
		editor.deleteShapes([a.shapeId])

		editor.pruneUnusedAssets()
		expect(editor.getAsset(a.assetId)).toBeUndefined()
		expect(editor.getAsset(b.assetId)).toBeDefined()
	})

	it('calls the asset store remove() so external blobs are freed', () => {
		const removed: TLAssetId[][] = []
		const e = new TestEditor(
			{},
			{
				assets: {
					async upload() {
						return { src: 'https://example.com/x.png' }
					},
					async remove(ids) {
						removed.push(ids)
					},
				},
			}
		)
		const assetId = AssetRecordType.createId('ext')
		e.createAssets([
			{
				type: 'image',
				id: assetId,
				typeName: 'asset',
				props: {
					w: 1,
					h: 1,
					name: '',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/x.png',
				},
				meta: {},
			},
		])
		// No shape references it, so it's an orphan.
		expect(e.pruneUnusedAssets()).toEqual([assetId])
		expect(removed).toEqual([[assetId]])
		e.dispose()
	})

	it('is a no-op in readonly mode', () => {
		const a = createImage(0)
		editor.deleteShapes([a.shapeId])
		editor.updateInstanceState({ isReadonly: true })

		expect(editor.pruneUnusedAssets()).toEqual([])
		expect(editor.getAsset(a.assetId)).toBeDefined()
	})

	it('does not record the prune in the undo stack', () => {
		const a = createImage(0)
		editor.markHistoryStoppingPoint()
		editor.deleteShapes([a.shapeId])
		editor.pruneUnusedAssets()

		// Undo brings the shape back; its asset is gone (documented caveat) — the
		// point here is that the prune itself produced no separate undo step.
		editor.undo()
		expect(editor.getShape(a.shapeId)).toBeDefined()
		expect(editor.getAsset(a.assetId)).toBeUndefined()
	})
})
