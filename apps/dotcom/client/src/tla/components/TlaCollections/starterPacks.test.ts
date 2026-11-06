import { type CollectionPack, copyPack, InMemoryCollectionSource } from '@tldraw/collections'
import { describe, expect, it } from 'vitest'
import { addStarterPack, getStarterPackId, isStarterPackAdded } from './starterPacks'

const pack: CollectionPack = { id: 'doodles', name: 'Doodles', version: 2, items: [] }

const owners = [
	{ id: 'home', name: 'Private to you', private: true },
	{ id: 'acme', name: 'Acme' },
]

describe('starter packs', () => {
	it('records the pack and its version on the copy', async () => {
		const source = new InMemoryCollectionSource({ owners })
		const copy = await addStarterPack(source, pack, 'home')
		expect(copy).toMatchObject({ ownerId: 'home', meta: { packId: 'doodles', packVersion: 2 } })
		expect(getStarterPackId(copy)).toBe('doodles')
	})

	it('names no pack for a collection made any other way', async () => {
		const source = new InMemoryCollectionSource({ owners })
		expect(getStarterPackId(await source.createCollection('Kit'))).toBeUndefined()
		expect(getStarterPackId(await copyPack(source, pack))).toBeUndefined()
	})

	it('counts a pack as added while the owner holds a copy of it', async () => {
		const source = new InMemoryCollectionSource({ owners })
		expect(isStarterPackAdded(source, 'doodles', 'home')).toBe(false)
		const copy = await addStarterPack(source, pack, 'home')
		expect(isStarterPackAdded(source, 'doodles', 'home')).toBe(true)
		expect(isStarterPackAdded(source, 'doodles', 'acme')).toBe(false)
		await source.deleteCollection(copy.id)
		expect(isStarterPackAdded(source, 'doodles', 'home')).toBe(false)
	})

	it("doesn't count a copy that has moved to another owner", async () => {
		const source = new InMemoryCollectionSource({ owners })
		const copy = await addStarterPack(source, pack, 'home')
		await source.moveCollection(copy.id, 'acme')
		expect(isStarterPackAdded(source, 'doodles', 'home')).toBe(false)
	})
})
