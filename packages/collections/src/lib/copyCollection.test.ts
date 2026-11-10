import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CollectionNotFoundError } from './CollectionSource'
import { copyCollection } from './copyCollection'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import {
	CollectionItemRecordType,
	CollectionRecordType,
	type TLCollectionItemContent,
} from './schema'

const shapeId = createShapeId('box')
const owners = [
	{ id: 'home', name: 'Personal' },
	{ id: 'acme', name: 'Acme workspace' },
]

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

function stubFetch(ok: (url: string) => boolean) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) =>
			ok(url)
				? new Response(new Blob(['png'], { type: 'image/png' }))
				: new Response(null, { status: 404 })
		)
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('copyCollection', () => {
	it('copies a collection and its items to another owner, leaving the original', async () => {
		stubFetch(() => true)
		const source = new InMemoryCollectionSource({ owners })
		const original = await source.createCollection('Wireframes')
		const named = await source.addItem(original.id, {
			name: 'Card',
			content: content(),
			thumbnail: new Blob(['png']),
		})
		await source.addItem(original.id, { content: content() })

		const copy = await copyCollection(source, original.id, 'acme')

		expect(copy).toMatchObject({ name: 'Wireframes', ownerId: 'acme' })
		expect(copy.id).not.toBe(original.id)
		const items = source.getItems(copy.id)
		expect(items).toHaveLength(2)
		const card = items.find((i) => i.name === 'Card')!
		const unnamed = items.find((i) => i.name === undefined)!
		expect(card.id).not.toBe(named.id)
		expect(card.thumbnail).toMatch(/^blob:/)
		expect(unnamed.thumbnail).toBeUndefined()
		expect(await source.getItemContent(card.id)).toEqual(content())
		expect(source.getCollections().find((c) => c.id === original.id)?.ownerId).toBe('home')
		expect(source.getItems(original.id)).toHaveLength(2)
	})

	it('copies a read-only collection', async () => {
		const pack = CollectionRecordType.create({ name: 'Prefabs', readOnly: true, ownerId: 'home' })
		const item = CollectionItemRecordType.create({ collectionId: pack.id, name: 'Card' })
		const source = new InMemoryCollectionSource({
			owners,
			initial: { collections: [pack], items: [item], contents: { [item.id]: content() } },
		})
		const copy = await copyCollection(source, pack.id, 'acme')
		expect(copy.readOnly).toBeUndefined()
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Card'])
	})

	it('leaves out a thumbnail that cannot be fetched', async () => {
		stubFetch(() => false)
		const source = new InMemoryCollectionSource({ owners })
		const original = await source.createCollection('Wireframes')
		await source.addItem(original.id, {
			content: content(),
			thumbnail: { light: new Blob(['l']), dark: new Blob(['d']) },
		})
		const copy = await copyCollection(source, original.id, 'acme')
		expect(source.getItems(copy.id)[0].thumbnail).toBeUndefined()
	})

	it('deletes the partial copy when an item cannot be copied', async () => {
		const source = new InMemoryCollectionSource({ owners })
		const original = await source.createCollection('Wireframes')
		await source.addItem(original.id, { content: content() })
		vi.spyOn(source, 'getItemContent').mockRejectedValue(new Error('offline'))
		await expect(copyCollection(source, original.id, 'acme')).rejects.toThrow('offline')
		expect(source.getCollections().map((c) => c.id)).toEqual([original.id])
	})

	it('refuses a missing collection or owner', async () => {
		const source = new InMemoryCollectionSource({ owners })
		const original = await source.createCollection('Wireframes')
		await expect(
			copyCollection(source, CollectionRecordType.createId('nope'), 'acme')
		).rejects.toThrow(CollectionNotFoundError)
		await expect(copyCollection(source, original.id, 'nobody')).rejects.toThrow(
			CollectionNotFoundError
		)
		expect(source.getCollections()).toHaveLength(1)
	})
})
