import { AssetRecordType, TLAssetId, TLImageAsset, assetIdValidator } from '@tldraw/tlschema'
import { vi } from 'vitest'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLContent,
	TLShape,
	createShapeId,
} from '../..'
import { TestEditor } from '../test/TestEditor'

const BOX_TYPE = 'my-custom-shape'
const IMAGE_TYPE = 'ct-image'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
		[IMAGE_TYPE]: { w: number; h: number; assetId: TLAssetId | null }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>
type IImageShape = TLShape<typeof IMAGE_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class ImageShapeUtil extends ShapeUtil<IImageShape> {
	static override type = IMAGE_TYPE
	static override props: RecordProps<IImageShape> = {
		w: T.number,
		h: T.number,
		assetId: assetIdValidator.nullable(),
	}
	getDefaultProps(): IImageShape['props'] {
		return { w: 100, h: 100, assetId: null }
	}
	getGeometry(shape: IImageShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

vi.useFakeTimers()

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	parent: createShapeId('parent'),
	child: createShapeId('child'),
	image1: createShapeId('image1'),
	image2: createShapeId('image2'),
	asset: AssetRecordType.createId('asset'),
	missingAsset: AssetRecordType.createId('missing'),
}

function createImageAsset(id: TLAssetId, src: string | null): TLImageAsset {
	return AssetRecordType.create({
		id,
		type: 'image',
		props: { w: 10, h: 10, name: 'image', isAnimated: false, mimeType: 'image/png', src },
		meta: {},
	}) as TLImageAsset
}

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [BoxShapeUtil, ImageShapeUtil] })
})

afterEach(() => {
	editor.dispose()
	vi.unstubAllGlobals()
})

describe('getContentFromCurrentPage', () => {
	it('returns undefined for an empty list', () => {
		expect(editor.getContentFromCurrentPage([])).toBeUndefined()
	})

	it('includes the shapes, their root ids, and the store schema', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 10, y: 20 },
			{ id: ids.b, type: BOX_TYPE, x: 30, y: 40 },
		])
		const content = editor.getContentFromCurrentPage([ids.a, ids.b])!
		expect(content.schema).toEqual(editor.store.schema.serialize())
		expect(content.rootShapeIds).toEqual([ids.a, ids.b])
		expect(content.shapes).toEqual([editor.getShape(ids.a), editor.getShape(ids.b)])
		expect(content.bindings).toEqual([])
		expect(content.assets).toEqual([])
		expect(content.users).toEqual([])
	})

	it('accepts shape records and skips unknown ids', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		const content = editor.getContentFromCurrentPage([editor.getShape(ids.a)!])!
		expect(content.rootShapeIds).toEqual([ids.a])
		expect(editor.getContentFromCurrentPage([createShapeId('missing')])!.shapes).toEqual([])
	})

	it('includes descendants, keeping their local positions', () => {
		editor.createShapes([
			{ id: ids.parent, type: BOX_TYPE, x: 100, y: 100 },
			{ id: ids.child, type: BOX_TYPE, parentId: ids.parent, x: 10, y: 10 },
		])
		const content = editor.getContentFromCurrentPage([ids.parent])!
		expect(content.rootShapeIds).toEqual([ids.parent])
		expect(content.shapes.map((s) => ({ id: s.id, parentId: s.parentId, x: s.x, y: s.y }))).toEqual(
			[
				{ id: ids.parent, parentId: editor.getCurrentPageId(), x: 100, y: 100 },
				{ id: ids.child, parentId: ids.parent, x: 10, y: 10 },
			]
		)
	})

	it('lifts a nested root shape into page space', () => {
		editor.createShapes([
			{ id: ids.parent, type: BOX_TYPE, x: 100, y: 100, rotation: Math.PI / 2 },
			{ id: ids.child, type: BOX_TYPE, parentId: ids.parent, x: 10, y: 0, rotation: 0.5 },
		])
		const content = editor.getContentFromCurrentPage([ids.child])!
		expect(content.rootShapeIds).toEqual([ids.child])
		const [shape] = content.shapes
		expect(shape.parentId).toBe(editor.getCurrentPageId())
		expect(shape.x).toBeCloseTo(100)
		expect(shape.y).toBeCloseTo(110)
		expect(shape.rotation).toBeCloseTo(Math.PI / 2 + 0.5)
		// the shape in the store is untouched
		expect(editor.getShape(ids.child)).toMatchObject({ parentId: ids.parent, x: 10, y: 0 })
	})

	it('includes each referenced asset once and skips missing ones', () => {
		editor.createAssets([createImageAsset(ids.asset, 'http://example.com/a.png')])
		editor.createShapes([
			{ id: ids.image1, type: IMAGE_TYPE, props: { assetId: ids.asset } },
			{ id: ids.image2, type: IMAGE_TYPE, props: { assetId: ids.asset } },
			{ id: ids.a, type: IMAGE_TYPE, props: { assetId: ids.missingAsset } },
			{ id: ids.b, type: IMAGE_TYPE, props: { assetId: null } },
		])
		const content = editor.getContentFromCurrentPage([ids.image1, ids.image2, ids.a, ids.b])!
		expect(content.assets).toEqual([editor.getAsset(ids.asset)])
	})
})

describe('resolveAssetsInContent', () => {
	it('returns undefined for undefined content', async () => {
		expect(await editor.resolveAssetsInContent(undefined)).toBeUndefined()
	})

	it('leaves http and data url assets alone', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const http = createImageAsset(ids.asset, 'http://example.com/a.png')
		const data = createImageAsset(ids.missingAsset, 'data:image/png;base64,AAAA')
		const content = { assets: [http, data] } as TLContent
		const resolved = await editor.resolveAssetsInContent(content)
		expect(resolved).toBe(content)
		expect(resolved!.assets).toEqual([http, data])
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('resolves other image assets through the asset store and inlines them as data urls', async () => {
		const fetchMock = vi.fn(async (_url: string) => ({ blob: async () => new Blob(['hello']) }))
		vi.stubGlobal('fetch', fetchMock)
		const resolveSpy = vi
			.spyOn(editor.store.props.assets, 'resolve')
			.mockResolvedValue('blob:resolved')

		const asset = createImageAsset(ids.asset, 'asset:local')
		const content = { assets: [asset] } as TLContent
		const resolved = await editor.resolveAssetsInContent(content)

		expect(resolveSpy).toHaveBeenCalledWith(asset, {
			screenScale: 1,
			steppedScreenScale: 1,
			dpr: 1,
			networkEffectiveType: null,
			shouldResolveToOriginal: true,
		})
		expect(fetchMock.mock.calls[0][0]).toBe('blob:resolved')
		expect(resolved!.assets).toEqual([
			{
				...asset,
				props: { ...asset.props, src: `data:application/octet-stream;base64,${btoa('hello')}` },
			},
		])
		// the original asset is not mutated
		expect(asset.props.src).toBe('asset:local')
		resolveSpy.mockRestore()
	})
})

describe('temporary asset previews', () => {
	beforeEach(() => {
		let count = 0
		vi.stubGlobal('URL', {
			...URL,
			createObjectURL: vi.fn(() => `blob:preview-${++count}`),
			revokeObjectURL: vi.fn(),
		})
	})

	it('creates an object url for the file and returns it until it expires', () => {
		const file = new File(['x'], 'x.png', { type: 'image/png' })
		expect(editor.getTemporaryAssetPreview(ids.asset)).toBeUndefined()
		const url = editor.createTemporaryAssetPreview(ids.asset, file)
		expect(url).toBe('blob:preview-1')
		expect(URL.createObjectURL).toHaveBeenCalledWith(file)
		expect(editor.getTemporaryAssetPreview(ids.asset)).toBe('blob:preview-1')

		vi.advanceTimersByTime(editor.options.temporaryAssetPreviewLifetimeMs - 1)
		expect(editor.getTemporaryAssetPreview(ids.asset)).toBe('blob:preview-1')

		vi.advanceTimersByTime(1)
		expect(editor.getTemporaryAssetPreview(ids.asset)).toBeUndefined()
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
	})

	it('reuses the existing preview for the same asset', () => {
		const file = new File(['x'], 'x.png', { type: 'image/png' })
		editor.createTemporaryAssetPreview(ids.asset, file)
		expect(editor.createTemporaryAssetPreview(ids.asset, file)).toBe('blob:preview-1')
		expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
		expect(editor.createTemporaryAssetPreview(ids.missingAsset, file)).toBe('blob:preview-2')
	})
})

describe('external asset handlers', () => {
	it('has no handlers by default', async () => {
		expect(editor.hasExternalAssetHandler('file')).toBe(false)
		expect(editor.hasExternalAssetHandler('url')).toBe(false)
		expect(
			await editor.getAssetForExternalContent({ type: 'url', url: 'http://example.com' })
		).toBeUndefined()
	})

	it('calls the registered handler for the content type', async () => {
		const asset = createImageAsset(ids.asset, 'http://example.com/a.png')
		const urlHandler = vi.fn(async () => asset)
		expect(editor.registerExternalAssetHandler('url', urlHandler)).toBe(editor)
		expect(editor.hasExternalAssetHandler('url')).toBe(true)
		expect(editor.hasExternalAssetHandler('file')).toBe(false)

		const info = { type: 'url' as const, url: 'http://example.com' }
		expect(await editor.getAssetForExternalContent(info)).toBe(asset)
		expect(urlHandler).toHaveBeenCalledWith(info)

		const file = new File(['x'], 'x.png', { type: 'image/png' })
		expect(await editor.getAssetForExternalContent({ type: 'file', file })).toBeUndefined()
	})

	it('can unregister a handler', () => {
		editor.registerExternalAssetHandler('file', async () =>
			createImageAsset(ids.asset, 'http://example.com/a.png')
		)
		expect(editor.hasExternalAssetHandler('file')).toBe(true)
		editor.registerExternalAssetHandler('file', null)
		expect(editor.hasExternalAssetHandler('file')).toBe(false)
	})
})

describe('getSnapshot', () => {
	it('captures the document and session state', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 5, y: 6 })
		editor.select(ids.a)
		const snapshot = editor.getSnapshot()
		expect(snapshot.document.schema).toEqual(editor.store.schema.serialize())
		expect(snapshot.document.store[ids.a]).toEqual(editor.getShape(ids.a))
		expect(snapshot.session).toMatchObject({
			currentPageId: editor.getCurrentPageId(),
			pageStates: [{ pageId: editor.getCurrentPageId(), selectedShapeIds: [ids.a] }],
		})
	})

	it('can be loaded into another editor', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 5, y: 6 })
		editor.select(ids.a)
		const snapshot = editor.getSnapshot()

		const other = new TestEditor({ shapeUtils: [BoxShapeUtil, ImageShapeUtil] })
		try {
			other.loadSnapshot(snapshot)
			expect(other.getShape(ids.a)).toEqual(editor.getShape(ids.a))
			expect(other.getSelectedShapeIds()).toEqual([ids.a])
		} finally {
			other.dispose()
		}
	})
})
