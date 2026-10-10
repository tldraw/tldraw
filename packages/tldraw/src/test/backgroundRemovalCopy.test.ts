import { AssetRecordType, TLAssetId, TLImageAsset, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const originalId = AssetRecordType.createId('original')
const cutoutId = AssetRecordType.createId('cutout')
const shapeId = createShapeId('image')

function imageAsset(id: TLAssetId, name: string): TLImageAsset {
	return {
		id,
		typeName: 'asset',
		type: 'image',
		meta: {},
		props: {
			w: 100,
			h: 100,
			name,
			isAnimated: false,
			mimeType: 'image/png',
			src: `https://tldrawusercontent.com/${name}`,
		},
	}
}

describe('copying an image with a background-removal pair', () => {
	it('includes both the original and the cutout asset', () => {
		const editor = new TestEditor()
		editor.createAssets([
			imageAsset(originalId, 'photo.png'),
			imageAsset(cutoutId, 'photo-cutout.png'),
		])
		editor.createShape({
			id: shapeId,
			type: 'image',
			x: 0,
			y: 0,
			props: { assetId: cutoutId, w: 100, h: 100 },
			meta: { bgOriginalAssetId: originalId, bgRemovedAssetId: cutoutId },
		})

		const content = editor.getContentFromCurrentPage([shapeId])!

		expect(content.assets.map((asset) => asset.id).sort()).toEqual([cutoutId, originalId].sort())
		editor.dispose()
	})
})
