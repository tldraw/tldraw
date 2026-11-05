import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import type { CollectionPack } from './CollectionPack'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { PackCollectionSource } from './PackCollectionSource'
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

const wireframing = (version = 1): CollectionPack => ({
	id: 'wireframing',
	name: 'Wireframing',
	version,
	items: [
		{ id: 'button', name: 'Button', content: content('button'), thumbnail: 'data:,button' },
		{ id: 'card', content: content('card') },
	],
})

const diagramming: CollectionPack = {
	id: 'diagramming',
	name: 'Diagramming',
	version: 1,
	items: [{ id: 'process', name: 'Process', content: content('process') }],
}

describe('PackCollectionSource', () => {
	it('lists each pack as a read-only collection of its items', () => {
		const source = new PackCollectionSource({ packs: [wireframing(), diagramming] })
		const [first, second] = source.getCollections()
		expect(source.getCollections()).toHaveLength(2)
		expect(first).toMatchObject({ name: 'Wireframing', readOnly: true })
		expect(second).toMatchObject({ name: 'Diagramming', readOnly: true })
		expect(source.getItems(first.id).map((item) => item.name)).toEqual(['Button', undefined])
		expect(source.getItems(first.id)[0].thumbnail).toBe('data:,button')
		expect(source.getItems(first.id)[1]).not.toHaveProperty('thumbnail')
	})

	it('serves each item its pack content', async () => {
		const source = new PackCollectionSource({ packs: [wireframing()] })
		const [collection] = source.getCollections()
		const [button] = source.getItems(collection.id)
		expect(await source.getItemContent(button.id)).toEqual(content('button'))
		const missing = PackCollectionSource.getItemId('wireframing', 'nope')
		await expect(source.getItemContent(missing)).rejects.toThrow(CollectionNotFoundError)
	})

	it('keeps collection and item ids across pack versions', () => {
		const ids = (pack: CollectionPack) => {
			const source = new PackCollectionSource({ packs: [pack] })
			const [collection] = source.getCollections()
			return [collection.id, ...source.getItems(collection.id).map((item) => item.id)]
		}
		expect(ids(wireframing(2))).toEqual(ids(wireframing(1)))
		expect(ids(wireframing())[0]).toBe(PackCollectionSource.getCollectionId('wireframing'))
	})

	it('allows no changes and refuses every write', async () => {
		const source = new PackCollectionSource({ packs: [wireframing()] })
		const [collection] = source.getCollections()
		const [button] = source.getItems(collection.id)
		for (const action of [
			'createCollection',
			'renameCollection',
			'deleteCollection',
			'addItem',
			'renameItem',
			'deleteItem',
		] as const) {
			expect(source.can(action)).toBe(false)
			expect(source.can(action, collection.id)).toBe(false)
		}
		await expect(source.createCollection()).rejects.toThrow(CollectionPermissionError)
		await expect(source.renameCollection(collection.id)).rejects.toThrow(CollectionPermissionError)
		await expect(source.deleteCollection(collection.id)).rejects.toThrow(CollectionPermissionError)
		await expect(source.addItem(collection.id)).rejects.toThrow(CollectionPermissionError)
		await expect(source.renameItem(button.id)).rejects.toThrow(CollectionPermissionError)
		await expect(source.deleteItem(button.id)).rejects.toThrow(CollectionPermissionError)
		expect(source.getItems(collection.id)).toHaveLength(2)
	})

	it('refuses packs with duplicate ids or invalid content', () => {
		expect(() => new PackCollectionSource({ packs: [diagramming, diagramming] })).toThrow()
		const pack = wireframing()
		expect(
			() =>
				new PackCollectionSource({
					packs: [{ ...pack, items: [pack.items[0], pack.items[0]] }],
				})
		).toThrow()
		expect(
			() =>
				new PackCollectionSource({
					packs: [{ ...pack, items: [{ id: 'bad', content: { formatVersion: 1 } as any }] }],
				})
		).toThrow()
	})
})
