import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import type { CollectionPack } from './CollectionPack'
import { copyPack, getPackCopyMeta } from './copyPack'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import type { TLCollectionItemContent } from './schema'

function content(name: string): TLCollectionItemContent {
	const id = createShapeId(name)
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [id],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

const pack: CollectionPack = {
	id: 'wireframing',
	name: 'Wireframing',
	version: 3,
	items: [
		{ id: 'button', name: 'Button', content: content('button') },
		{ id: 'card', content: content('card') },
	],
}

const owners = [
	{ id: 'home', name: 'Personal' },
	{ id: 'acme', name: 'Acme' },
]

describe('copyPack', () => {
	it('copies a pack as an ordinary collection that names the pack it came from', async () => {
		const source = new InMemoryCollectionSource({ owners })
		const copy = await copyPack(source, pack, { ownerId: 'acme', name: 'Wireframing 2' })
		expect(copy).toMatchObject({ name: 'Wireframing 2', ownerId: 'acme' })
		expect(getPackCopyMeta(copy)).toEqual({ packId: 'wireframing', packVersion: 3 })
		const items = source.getItems(copy.id)
		expect(items.map((item) => item.name)).toEqual(['Button', undefined])
		expect(await source.getItemContent(items[0].id)).toEqual(content('button'))
		expect(source.can('renameCollection', copy.id)).toBe(true)
		expect(source.can('addItem', copy.id)).toBe(true)
	})

	it("uses the pack's name and the source's default owner unless told otherwise", async () => {
		const source = new InMemoryCollectionSource({ owners, defaultOwnerId: 'home' })
		const copy = await copyPack(source, pack)
		expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'home' })
	})

	it('names no pack for a collection made any other way', async () => {
		const source = new InMemoryCollectionSource()
		expect(getPackCopyMeta(await source.createCollection('Kit'))).toBeUndefined()
	})
})
