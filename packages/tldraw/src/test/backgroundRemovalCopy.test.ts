import { AssetRecordType, TLAssetId, TLImageAsset, createShapeId } from '@tldraw/editor'
import { parseTldrawJsonFile } from '../lib/utils/tldr/file'
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

	it('keeps both assets when the .tldr file is opened', () => {
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

		const parsed = parseTldrawJsonFile({
			schema: editor.store.schema,
			json: JSON.stringify({
				tldrawFileFormatVersion: 1,
				schema: editor.store.schema.serialize(),
				records: editor.store.allRecords(),
			}),
		})

		expect(parsed.ok).toBe(true)
		if (parsed.ok) {
			expect(parsed.value.get(originalId)?.id).toBe(originalId)
			expect(parsed.value.get(cutoutId)?.id).toBe(cutoutId)
		}
		editor.dispose()
	})
})
