import {
	CollectionItemContentRecordType,
	CollectionItemRecordType,
	CollectionRecordType,
	getCollectionItemContentId,
} from '@tldraw/collections/schema'
import { AssetRecordType, createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { collectAssetAssociationChanges } from './assetAssociation'
import { validateSnapshot } from './utils/validateSnapshot'

const USER_CONTENT = 'https://tldrawusercontent.com'

// A board whose only image is kept by a collection item: no shape on the canvas uses the asset.
function boardWithCollection() {
	const asset = AssetRecordType.create({
		id: AssetRecordType.createId('photo'),
		type: 'image',
		props: {
			name: 'photo.png',
			src: `${USER_CONTENT}/abc123-png`,
			w: 10,
			h: 10,
			mimeType: 'image/png',
			isAnimated: false,
		},
		meta: { fileId: 'source-file' },
	})
	const collection = CollectionRecordType.create({ name: 'Photos' })
	const item = CollectionItemRecordType.create({ collectionId: collection.id, createdAt: 1 })
	const shapeId = createShapeId('photo')
	const content = CollectionItemContentRecordType.create({
		id: getCollectionItemContentId(item.id),
		itemId: item.id,
		content: {
			shapes: [{ id: shapeId, type: 'image', props: { assetId: asset.id } } as any],
			bindings: [],
			rootShapeIds: [shapeId],
			schema: createTLSchema().serialize(),
		},
		assetIds: [asset.id],
	})
	return { asset, records: [asset, collection, item, content] }
}

describe('a duplicated file with board collections', () => {
	it('accepts the collection records, and copies the asset only a collection item uses', () => {
		const { asset, records } = boardWithCollection()
		const result = validateSnapshot({
			schema: createTLSchema().serialize(),
			snapshot: Object.fromEntries(records.map((r) => [r.id, r])) as any,
		})
		expect(result.ok).toBe(true)
		const store = result.ok ? result.value : {}
		expect(
			Object.values(store)
				.map((r) => r.typeName)
				.sort()
		).toEqual(['asset', 'collection', 'collection-item', 'collection-item-content'])

		const { assetsToReplace } = collectAssetAssociationChanges(Object.values(store), {
			slug: 'duplicate-file',
			userContentUrl: USER_CONTENT,
		})
		expect(assetsToReplace.map((a) => a.assetId)).toEqual([asset.id])
	})
})
