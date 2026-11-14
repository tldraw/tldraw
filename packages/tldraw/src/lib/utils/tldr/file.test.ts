import { AssetRecordType, createShapeId, T, type TLRecord } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { parseTldrawJsonFile, serializeTldrawJson } from './file'

const records = {
	stash: {
		scope: 'document' as const,
		validator: T.object({
			id: T.string,
			typeName: T.literal('stash'),
			assetIds: T.arrayOf(T.string),
			thumbnail: T.object({ light: T.string }),
		}),
	},
}

const asset = (key: string) =>
	AssetRecordType.create({
		id: AssetRecordType.createId(key),
		type: 'image',
		props: { name: key, src: null, w: 1, h: 1, mimeType: 'image/png', isAnimated: false },
	})

function setup() {
	const editor = new TestEditor({}, { records })
	const byShape = asset('by-shape')
	const inArray = asset('in-array')
	const inObject = asset('in-object')
	const unused = asset('unused')
	editor.createAssets([byShape, inArray, inObject, unused])
	editor.createShape({
		id: createShapeId('image'),
		type: 'image',
		props: { assetId: byShape.id, w: 1, h: 1 },
	})
	editor.store.put([
		{
			id: 'stash:1',
			typeName: 'stash',
			assetIds: [inArray.id],
			thumbnail: { light: inObject.id },
		} as unknown as TLRecord,
	])
	return { editor, kept: [byShape.id, inArray.id, inObject.id].sort() }
}

const assetIds = (records: TLRecord[]) =>
	records
		.filter((r) => r.typeName === 'asset')
		.map((r) => r.id)
		.sort()

describe('.tldr files', () => {
	it('save the assets that a shape or any other record names, and drop the rest', async () => {
		const { editor, kept } = setup()
		const json = await serializeTldrawJson(editor)
		expect(assetIds(JSON.parse(json).records)).toEqual(kept)
	})

	it('open with the assets that a shape or any other record names, and drop the rest', () => {
		const { editor, kept } = setup()
		const json = JSON.stringify({
			tldrawFileFormatVersion: 1,
			schema: editor.store.schema.serialize(),
			records: editor.store.allRecords(),
		})
		const result = parseTldrawJsonFile({ schema: editor.store.schema, json })
		if (!result.ok) throw new Error(JSON.stringify(result.error))
		expect(assetIds(result.value.allRecords())).toEqual(kept)
	})
})
