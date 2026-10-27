import { CollectionRecordType, type TLCollectionItemContent } from '@tldraw/collections'
import { createTLSchema } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { getCollectionsSource } from './collectionsSource'

const icons = CollectionRecordType.createId('sample-icons')

describe('getCollectionsSource', () => {
	it('gives nothing when the flag is off', () => {
		expect(getCollectionsSource(false)).toBeNull()
	})

	it('starts with the sample collections', () => {
		expect(
			getCollectionsSource(true)
				?.getCollections()
				.map((c) => c.name)
		).toEqual(['Wireframes', 'Icons'])
	})

	it('shares one source across editors, so items survive opening another file', async () => {
		const first = getCollectionsSource(true)!
		await first.addItem(icons, { name: 'Star', content: emptyContent() })
		expect(getCollectionsSource(true)).toBe(first)
		expect(
			getCollectionsSource(true)
				?.getItems(icons)
				.map((i) => i.name)
		).toEqual(['Star'])
	})
})

function emptyContent(): TLCollectionItemContent {
	return {
		formatVersion: 1,
		content: {
			shapes: [],
			bindings: [],
			rootShapeIds: [],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}
