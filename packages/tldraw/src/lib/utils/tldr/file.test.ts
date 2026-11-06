import { AssetRecordType, createShapeId, createTLSchema, T } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { parseTldrawJsonFile } from './file'

const schema = createTLSchema({
	records: {
		stash: {
			scope: 'document',
			validator: T.object({
				id: T.string,
				typeName: T.literal('stash'),
				assetIds: T.arrayOf(T.string),
			}),
		},
	},
})

const asset = (key: string) =>
	AssetRecordType.create({
		id: AssetRecordType.createId(key),
		type: 'image',
		props: { name: key, src: null, w: 1, h: 1, mimeType: 'image/png', isAnimated: false },
	})

function parse(records: unknown[]) {
	const result = parseTldrawJsonFile({
		schema,
		json: JSON.stringify({ tldrawFileFormatVersion: 1, schema: schema.serialize(), records }),
	})
	if (!result.ok) throw new Error(JSON.stringify(result.error))
	return result.value
		.allRecords()
		.filter((r) => r.typeName === 'asset')
		.map((r) => r.id)
}

describe('parseTldrawJsonFile', () => {
	it('drops assets that no record names, and keeps those any record does', () => {
		const byShape = asset('by-shape')
		const byRecord = asset('by-record')
		const unused = asset('unused')
		const image = {
			id: createShapeId('image'),
			typeName: 'shape',
			type: 'image',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1',
			parentId: 'page:page',
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				assetId: byShape.id,
				w: 1,
				h: 1,
				playing: true,
				url: '',
				crop: null,
				flipX: false,
				flipY: false,
				altText: '',
			},
		}
		const stash = { id: 'stash:1', typeName: 'stash', assetIds: [byRecord.id] }
		const page = { id: 'page:page', typeName: 'page', name: 'Page', index: 'a1', meta: {} }

		expect(parse([page, image, stash, byShape, byRecord, unused]).sort()).toEqual(
			[byRecord.id, byShape.id].sort()
		)
	})
})
