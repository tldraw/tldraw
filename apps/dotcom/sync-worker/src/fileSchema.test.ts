import {
	AssetRecordType,
	LibraryItemContentRecordType,
	LibraryRecordType,
	createLibraryItemContentId,
	createShapeId,
	createTLSchema,
	TLLibraryItemId,
	TLLibraryItemRecord,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { collectAssetAssociationChanges } from './assetAssociation'
import { fileSnapshotSchema, fileSyncSchema } from './fileSchema'
import { validateSnapshot } from './utils/validateSnapshot'

const USER_CONTENT = 'https://tldrawusercontent.com'

// A board whose only image is kept by a library item: no shape on the canvas uses the asset.
function boardWithLibrary() {
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
	const library = LibraryRecordType.create({ name: 'Photos' })
	const item: TLLibraryItemRecord = {
		id: 'library-item:photo' as TLLibraryItemId,
		typeName: 'library-item',
		libraryId: library.id,
		thumbnail: asset.id,
		createdAt: 1,
		version: 1,
		meta: {},
	}
	const shapeId = createShapeId('photo')
	const content = LibraryItemContentRecordType.create({
		id: createLibraryItemContentId(item.id),
		itemId: item.id,
		content: {
			shapes: [{ id: shapeId, type: 'image', props: { assetId: asset.id } } as any],
			bindings: [],
			rootShapeIds: [shapeId],
			schema: createTLSchema().serialize(),
		},
		assetIds: [asset.id],
	})
	return { asset, records: [asset, library, item, content] }
}

describe('the file schemas', () => {
	it('register the library records in the room and in snapshots', () => {
		for (const typeName of ['library', 'library-item', 'library-item-content']) {
			expect(fileSyncSchema.types).toHaveProperty(typeName)
			expect(fileSnapshotSchema.types).toHaveProperty(typeName)
		}
	})

	it('register the comment records in the room only', () => {
		expect(fileSyncSchema.types).toHaveProperty('comment')
		expect(fileSnapshotSchema.types).not.toHaveProperty('comment')
	})
})

describe('a duplicated file with board libraries', () => {
	it('accepts the library records, and copies the asset only a library item uses', () => {
		const { asset, records } = boardWithLibrary()
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
		).toEqual(['asset', 'library', 'library-item', 'library-item-content'])

		const { assetsToReplace } = collectAssetAssociationChanges(Object.values(store), {
			slug: 'duplicate-file',
			userContentUrl: USER_CONTENT,
		})
		expect(assetsToReplace.map((a) => a.assetId)).toEqual([asset.id])
	})
})
