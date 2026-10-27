import { react } from '@tldraw/state'
import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import type { TLCollectionItemContent } from './schema'

const shapeId = createShapeId('box')

function content(): TLCollectionItemContent {
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

describe('InMemoryCollectionSource', () => {
	it('creates and renames collections', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		expect(source.getCollections()).toEqual([collection])

		await source.renameCollection(collection.id, 'Icons')
		expect(source.getCollections()).toEqual([{ ...collection, name: 'Icons' }])
	})

	it('rejects blank collection names', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		await expect(source.renameCollection(collection.id, ' ')).rejects.toThrow()
		await expect(source.createCollection('')).rejects.toThrow()
		expect(source.getCollections()).toEqual([collection])
	})

	it('adds items and serves their content separately from the listing', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, {
			name: 'Card',
			content: content(),
		})

		expect(source.getItems(collection.id)).toEqual([
			{ id: item.id, collectionId: collection.id, name: 'Card', version: 1 },
		])
		expect(await source.getItemContent(item.id)).toEqual(content())
	})

	it('adds an item without a name', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, { content: content() })
		expect(item).toStrictEqual({
			id: item.id,
			collectionId: collection.id,
			version: 1,
		})
	})

	it('gives thumbnails a url', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, {
			name: 'Card',
			content: content(),
			thumbnail: new Blob(['png'], { type: 'image/png' }),
		})
		expect(item.thumbnailUrl).toMatch(/^blob:/)
	})

	it('renames items and rejects blank names', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, { name: 'Card', content: content() })

		await source.renameItem(item.id, 'Header')
		expect(source.getItems(collection.id)).toEqual([{ ...item, name: 'Header' }])
		await expect(source.renameItem(item.id, '  ')).rejects.toThrow()
		expect(source.getItems(collection.id)).toEqual([{ ...item, name: 'Header' }])
	})

	it('reports a missing item as not found, not as forbidden', async () => {
		const source = new InMemoryCollectionSource({ readOnly: true })
		await expect(source.renameItem('nope', 'Name')).rejects.toThrow(CollectionNotFoundError)
		await expect(source.deleteItem('nope')).rejects.toThrow(CollectionNotFoundError)
	})

	describe('thumbnail urls', () => {
		afterEach(() => vi.restoreAllMocks())

		it('releases the url when its item is deleted', async () => {
			const revoke = vi.spyOn(URL, 'revokeObjectURL')
			const source = new InMemoryCollectionSource()
			const collection = await source.createCollection('Wireframes')
			const item = await source.addItem(collection.id, {
				content: content(),
				thumbnail: new Blob(['png'], { type: 'image/png' }),
			})
			await source.deleteItem(item.id)
			expect(revoke).toHaveBeenCalledWith(item.thumbnailUrl)
		})

		it('creates no url for an item that fails validation', async () => {
			const create = vi.spyOn(URL, 'createObjectURL')
			const source = new InMemoryCollectionSource()
			const collection = await source.createCollection('Wireframes')
			await expect(
				source.addItem(collection.id, {
					name: ' ',
					content: content(),
					thumbnail: new Blob(['png']),
				})
			).rejects.toThrow()
			expect(create).not.toHaveBeenCalled()
		})
	})

	it('deletes items and their content', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, {
			name: 'Card',
			content: content(),
		})

		await source.deleteItem(item.id)
		expect(source.getItems(collection.id)).toEqual([])
		await expect(source.getItemContent(item.id)).rejects.toThrow(CollectionNotFoundError)
	})

	it('deleting a collection deletes its items', async () => {
		const source = new InMemoryCollectionSource()
		const keep = await source.createCollection('Keep')
		const drop = await source.createCollection('Drop')
		const kept = await source.addItem(keep.id, { name: 'A', content: content() })
		const dropped = await source.addItem(drop.id, {
			name: 'B',
			content: content(),
		})

		await source.deleteCollection(drop.id)
		expect(source.getCollections()).toEqual([keep])
		expect(source.getItems(keep.id)).toEqual([kept])
		await expect(source.getItemContent(dropped.id)).rejects.toThrow(CollectionNotFoundError)
	})

	it('reports a missing collection as not found, not as forbidden', async () => {
		const source = new InMemoryCollectionSource()
		await expect(source.renameCollection('nope', 'Name')).rejects.toThrow(CollectionNotFoundError)
		await expect(source.addItem('nope', { name: 'A', content: content() })).rejects.toThrow(
			CollectionNotFoundError
		)
	})

	it('answers no for a collection that does not exist', () => {
		const source = new InMemoryCollectionSource()
		expect(source.can('addItem', 'nope')).toBe(false)
	})

	it('refuses every write when read-only, but items stay usable', async () => {
		const source = new InMemoryCollectionSource({
			readOnly: true,
			initial: {
				collections: [{ id: 'pack', name: 'Prefabs', readOnly: true }],
				items: [{ id: 'card', collectionId: 'pack', name: 'Card', version: 1 }],
				contents: { card: content() },
			},
		})
		expect(source.can('createCollection')).toBe(false)
		expect(source.can('addItem', 'pack')).toBe(false)
		await expect(source.createCollection('New')).rejects.toThrow(CollectionPermissionError)
		await expect(source.deleteItem('card')).rejects.toThrow(CollectionPermissionError)
		await expect(source.renameItem('card', 'New')).rejects.toThrow(CollectionPermissionError)
		await expect(source.deleteCollection('pack')).rejects.toThrow(CollectionPermissionError)
		expect(await source.getItemContent('card')).toEqual(content())
	})

	it('refuses writes to a read-only collection in a writable source', async () => {
		const source = new InMemoryCollectionSource({
			initial: {
				collections: [{ id: 'pack', name: 'Prefabs', readOnly: true }],
				items: [],
				contents: {},
			},
		})
		expect(source.can('createCollection')).toBe(true)
		expect(source.can('addItem', 'pack')).toBe(false)
		await expect(source.addItem('pack', { name: 'A', content: content() })).rejects.toThrow(
			CollectionPermissionError
		)
	})

	it('rejects starting data with items that have no collection or no content', () => {
		const item = { id: 'card', collectionId: 'pack', version: 1 }
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: { collections: [], items: [item], contents: { card: content() } },
				})
		).toThrow(/missing collection/)
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: { collections: [{ id: 'pack', name: 'Prefabs' }], items: [item], contents: {} },
				})
		).toThrow(/no content/)
	})

	it('validates starting data', () => {
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: {
						collections: [{ id: 'x', name: '', readOnly: false }],
						items: [],
						contents: {},
					},
				})
		).toThrow()
	})

	it('updates reactive readers when collections change', async () => {
		const source = new InMemoryCollectionSource()
		const seen: string[][] = []
		const stop = react('names', () => {
			seen.push(source.getCollections().map((c) => c.name))
		})

		const collection = await source.createCollection('Wireframes')
		await source.renameCollection(collection.id, 'Icons')
		stop()

		expect(seen).toEqual([[], ['Wireframes'], ['Icons']])
	})
	it('only re-runs a listing when its own collection changes', async () => {
		const source = new InMemoryCollectionSource()
		const a = await source.createCollection('A')
		const b = await source.createCollection('B')
		let runs = 0
		const stop = react('listing a', () => {
			source.getItems(a.id)
			runs++
		})

		await source.addItem(b.id, { name: 'In B', content: content() })
		expect(runs).toBe(1)
		await source.addItem(a.id, { name: 'In A', content: content() })
		expect(runs).toBe(2)
		stop()
	})

	it('rejects starting data with content no item lists, or duplicate ids', () => {
		const collection = { id: 'pack', name: 'Prefabs' }
		const item = { id: 'card', collectionId: 'pack', version: 1 }
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: {
						collections: [collection],
						items: [item],
						contents: { card: content(), orphan: content() },
					},
				})
		).toThrow(/orphan has no item/)
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: { collections: [collection, collection], items: [], contents: {} },
				})
		).toThrow(/Duplicate collection ids/)
		expect(
			() =>
				new InMemoryCollectionSource({
					initial: {
						collections: [collection],
						items: [item, item],
						contents: { card: content() },
					},
				})
		).toThrow(/Duplicate item ids/)
	})

	it('keeps its own copy of item content', async () => {
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const passed = content()
		const item = await source.addItem(collection.id, { content: passed })

		passed.content.rootShapeIds.length = 0
		const loaded = await source.getItemContent(item.id)
		loaded.content.shapes.length = 0

		expect(await source.getItemContent(item.id)).toEqual(content())
	})

	it('releases every thumbnail url on dispose', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL')
		const source = new InMemoryCollectionSource()
		const collection = await source.createCollection('Wireframes')
		const item = await source.addItem(collection.id, {
			content: content(),
			thumbnail: new Blob(['png']),
		})
		source.dispose()
		expect(revoke).toHaveBeenCalledWith(item.thumbnailUrl)
		revoke.mockRestore()
	})
})
