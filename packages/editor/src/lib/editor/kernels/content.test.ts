import { TLAsset, TLAssetId, TLBinding, TLShape } from '@tldraw/tlschema'
import {
	createContentIdMaps,
	partitionContentRecords,
	remapContentBindings,
	triageContentAssets,
} from './content'

function imageAsset(id: string, src: string | null): TLAsset {
	return {
		id: id as TLAssetId,
		typeName: 'asset',
		type: 'image',
		props: { w: 1, h: 1, name: 'x', isAnimated: false, mimeType: 'image/png', src },
		meta: {},
	} as TLAsset
}

const shapes = [
	{ id: 'shape:a', typeName: 'shape' },
	{ id: 'shape:b', typeName: 'shape' },
] as TLShape[]

const bindings = [
	{ id: 'binding:1', typeName: 'binding', fromId: 'shape:a', toId: 'shape:b' },
] as TLBinding[]

describe('partitionContentRecords', () => {
	it('sorts records by type and ignores the rest', () => {
		const records = [
			shapes[0],
			bindings[0],
			imageAsset('asset:1', null),
			{ id: 'user:1', typeName: 'user' },
			{ id: 'page:1', typeName: 'page' },
		] as any[]
		expect(partitionContentRecords(records)).toEqual({
			assets: [imageAsset('asset:1', null)],
			shapes: [shapes[0]],
			bindings: [bindings[0]],
			users: [{ id: 'user:1', typeName: 'user' }],
		})
	})
})

describe('createContentIdMaps', () => {
	it('maps each id to itself when preserving ids', () => {
		const { shapeIdMap, bindingIdMap } = createContentIdMaps(shapes, bindings, true)
		expect([...shapeIdMap]).toEqual([
			['shape:a', 'shape:a'],
			['shape:b', 'shape:b'],
		])
		expect([...bindingIdMap]).toEqual([['binding:1', 'binding:1']])
	})

	it('maps each id to a fresh one otherwise', () => {
		const { shapeIdMap, bindingIdMap } = createContentIdMaps(shapes, bindings, false)
		expect(shapeIdMap.get('shape:a')).not.toBe('shape:a')
		expect(new Set(shapeIdMap.values()).size).toBe(2)
		expect(bindingIdMap.get('binding:1')).not.toBe('binding:1')
	})
})

describe('remapContentBindings', () => {
	it('points bindings at the new shape and binding ids', () => {
		const { shapeIdMap, bindingIdMap } = createContentIdMaps(shapes, bindings, false)
		expect(remapContentBindings(bindings, shapeIdMap, bindingIdMap)[0]).toEqual({
			...bindings[0],
			id: bindingIdMap.get('binding:1'),
			fromId: shapeIdMap.get('shape:a'),
			toId: shapeIdMap.get('shape:b'),
		})
	})

	it('throws when a binding points outside the content', () => {
		expect(() => remapContentBindings(bindings, new Map(), new Map())).toThrow()
	})
})

describe('triageContentAssets', () => {
	it('skips assets the store already has', () => {
		const asset = imageAsset('asset:1', 'https://example.com/x.png')
		expect(triageContentAssets([asset], new Set([asset.id]))).toEqual({
			assetsToCreate: [],
			assetsToUpdate: [],
		})
	})

	it('creates hosted assets as they are', () => {
		const asset = imageAsset('asset:1', 'https://example.com/x.png')
		expect(triageContentAssets([asset], new Set())).toEqual({
			assetsToCreate: [asset],
			assetsToUpdate: [],
		})
	})

	it('copies a data-url asset without its src, keeping the original for upload', () => {
		const asset = imageAsset('asset:1', 'data:image/png;base64,AAAA')
		const { assetsToCreate, assetsToUpdate } = triageContentAssets([asset], new Set())
		expect(assetsToUpdate).toEqual([asset])
		// the original keeps its src so the upload can still read it
		expect(asset.props.src).toBe('data:image/png;base64,AAAA')
		expect((assetsToCreate[0] as any).props.src).toBe(null)
		expect(assetsToCreate[0]).not.toBe(asset)
	})
})
