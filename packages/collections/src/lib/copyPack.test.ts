import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import type { CollectionPack } from './CollectionPack'
import { copyPack } from './copyPack'
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
	it('copies a pack as an ordinary collection, with the meta it is given', async () => {
		const source = new InMemoryCollectionSource({ owners })
		const meta = { from: 'wireframing' }
		const copy = await copyPack(source, pack, { ownerId: 'acme', meta })
		expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'acme', meta })
		const items = source.getItems(copy.id)
		expect(items.map((item) => item.name)).toEqual(['Button', undefined])
		expect(await source.getItemContent(items[0].id)).toEqual(content('button'))
		expect(source.can('renameCollection', copy.id)).toBe(true)
		expect(source.can('addItem', copy.id)).toBe(true)
	})

	it("uses the source's default owner and no meta unless told otherwise", async () => {
		const source = new InMemoryCollectionSource({ owners, defaultOwnerId: 'home' })
		const copy = await copyPack(source, pack)
		expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'home', meta: {} })
	})

	it("numbers the copy's name when the source already has one by the pack's name", async () => {
		const source = new InMemoryCollectionSource({ owners })
		await source.createCollection('Wireframing')
		const copy = await copyPack(source, pack)
		expect(copy.name).toBe('Wireframing 1')
	})
})
