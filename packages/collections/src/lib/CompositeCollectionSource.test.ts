import { react } from '@tldraw/state'
import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { CompositeCollectionSource } from './CompositeCollectionSource'
import { copyCollection } from './copyCollection'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import {
	CollectionItemRecordType,
	CollectionRecordType,
	type TLCollectionItemContent,
} from './schema'

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

const tldraw = { id: 'tldraw', name: 'tldraw' }
const personal = { id: 'home', name: 'Personal' }
const acme = { id: 'acme', name: 'Acme workspace' }

const wireframing = CollectionRecordType.createId('wireframing')

// A read-only part, as a host's shared kits might be.
const shared = () => {
	const button = CollectionItemRecordType.create({ collectionId: wireframing, name: 'Button' })
	const card = CollectionItemRecordType.create({ collectionId: wireframing, name: 'Card' })
	return new InMemoryCollectionSource({
		readOnly: true,
		initial: {
			collections: [CollectionRecordType.create({ id: wireframing, name: 'Wireframing' })],
			items: [button, card],
			contents: { [button.id]: content('button'), [card.id]: content('card') },
		},
	})
}

function setUp() {
	const mine = new InMemoryCollectionSource({ id: 'mine' })
	const team = new InMemoryCollectionSource({ id: 'team' })
	const kits = shared()
	const source = new CompositeCollectionSource({
		parts: [
			{ owner: personal, source: mine },
			{ owner: acme, source: team },
			{ owner: tldraw, source: kits },
		],
	})
	return { source, mine, team, kits }
}

describe('CompositeCollectionSource', () => {
	it('lists one owner per part', () => {
		const { source } = setUp()
		expect(source.getCollectionOwners()).toEqual([personal, acme, tldraw])
	})

	it("lists every part's collections, each owned by its part, without changing the parts'", async () => {
		const { source, mine } = setUp()
		const kit = await mine.createCollection('Kit')
		expect(source.getCollections().map((c) => [c.name, c.ownerId])).toEqual([
			['Kit', 'home'],
			['Wireframing', 'tldraw'],
		])
		expect(mine.getCollections()).toEqual([kit])
		expect(kit).not.toHaveProperty('ownerId')
	})

	it('updates its listing when a part changes', async () => {
		const { source, team } = setUp()
		const seen: string[][] = []
		const stop = react('names', () => {
			seen.push(source.getCollections().map((c) => c.name))
		})
		await team.createCollection('Team kit')
		stop()
		expect(seen.at(-1)).toEqual(['Team kit', 'Wireframing'])
	})

	it('routes reads and writes to the part holding the collection or item', async () => {
		const { source, team } = setUp()
		const kit = await source.createCollection('Kit', { ownerId: 'acme' })
		expect(team.getCollections().map((c) => c.id)).toEqual([kit.id])
		const item = await source.addItem(kit.id, { name: 'Star', content: content('star') })
		expect(source.getItems(kit.id)).toEqual(team.getItems(kit.id))
		expect(await source.getItemContent(item.id)).toEqual(content('star'))
		await source.renameItem(item.id, 'Heart')
		expect(team.getItems(kit.id)[0].name).toBe('Heart')
		await source.renameCollection(kit.id, 'Icons')
		expect(team.getCollections()[0].name).toBe('Icons')
		await source.deleteItem(item.id)
		await source.deleteCollection(kit.id)
		expect(team.getCollections()).toEqual([])

		const [button] = source.getItems(wireframing)
		expect(await source.getItemContent(button.id)).toEqual(content('button'))
	})

	it('delegates permissions to the part', () => {
		const { source } = setUp()
		expect(source.can('createCollection')).toBe(true)
		expect(source.can('renameCollection', wireframing)).toBe(false)
		expect(source.can('addItem', wireframing)).toBe(false)
	})

	it('creates collections in the default part, or the part of the owner they name', async () => {
		const { source, mine, team } = setUp()
		expect(source.getDefaultOwnerId()).toBe('home')
		const kit = await source.createCollection('Kit')
		expect(kit.ownerId).toBe('home')
		expect(mine.getCollections()).toHaveLength(1)
		await source.createCollection('Team kit', { ownerId: 'acme' })
		expect(team.getCollections()).toHaveLength(1)
		await expect(source.createCollection('Nope', { ownerId: 'nobody' })).rejects.toThrow(
			CollectionNotFoundError
		)
		await expect(source.createCollection('Nope', { ownerId: 'tldraw' })).rejects.toThrow(
			CollectionPermissionError
		)
	})

	it('keeps the meta it is given, in parts with or without their own owners', async () => {
		const { source } = setUp()
		const kit = await source.createCollection('Kit', { meta: { packId: 'p' } })
		expect(source.getCollections().find((c) => c.id === kit.id)?.meta).toEqual({ packId: 'p' })
		const teamKit = await source.createCollection('Team kit', {
			ownerId: 'acme',
			meta: { packId: 'q' },
		})
		expect(source.getCollections().find((c) => c.id === teamKit.id)?.meta).toEqual({ packId: 'q' })
	})

	it('takes a default owner from the options', async () => {
		const mine = new InMemoryCollectionSource()
		const team = new InMemoryCollectionSource()
		const source = new CompositeCollectionSource({
			parts: [
				{ owner: personal, source: mine },
				{ owner: acme, source: team },
			],
			defaultOwnerId: 'acme',
		})
		expect((await source.createCollection('Kit')).ownerId).toBe('acme')
		expect(team.getCollections()).toHaveLength(1)
	})

	it("won't move a collection out of a read-only part, and copies nothing", async () => {
		const { source, mine, kits } = setUp()
		await expect(source.moveCollection(wireframing, 'home')).rejects.toThrow(
			CollectionPermissionError
		)
		expect(mine.getCollections()).toEqual([])
		expect(kits.getCollections()).toHaveLength(1)
	})

	it("copies a read-only part's collection into a writable part, leaving the original", async () => {
		const { source, mine, kits } = setUp()
		await copyCollection(source, wireframing, 'home')
		const [copy] = mine.getCollections()
		expect(copy.name).toBe('Wireframing')
		expect(mine.getItems(copy.id).map((item) => item.name)).toEqual(['Button', 'Card'])
		const [button] = mine.getItems(copy.id)
		expect(await mine.getItemContent(button.id)).toEqual(content('button'))
		expect(kits.getCollections()).toHaveLength(1)
		expect(kits.getItems(wireframing)).toHaveLength(2)
		expect(source.getCollections().map((c) => [c.name, c.ownerId])).toEqual([
			['Wireframing', 'home'],
			['Wireframing', 'tldraw'],
		])
	})

	it('moves a collection between writable parts', async () => {
		const { source, mine, team } = setUp()
		const kit = await source.createCollection('Kit', { ownerId: 'home' })
		await source.addItem(kit.id, { name: 'Star', content: content('star') })
		await source.moveCollection(kit.id, 'acme')
		expect(mine.getCollections()).toEqual([])
		const [moved] = team.getCollections()
		expect(moved.name).toBe('Kit')
		expect(team.getItems(moved.id).map((item) => item.name)).toEqual(['Star'])
	})

	it('moves an item between parts by copying it and deleting the original', async () => {
		const { source, mine, team } = setUp()
		const from = await source.createCollection('Kit', { ownerId: 'home' })
		const to = await source.createCollection('Team kit', { ownerId: 'acme' })
		const item = await source.addItem(from.id, { name: 'Star', content: content('star') })
		await source.moveItem!(item.id, to.id)
		expect(mine.getItems(from.id)).toEqual([])
		expect(team.getItems(to.id).map((i) => i.name)).toEqual(['Star'])
	})

	describe('a part that lists its own owners', () => {
		function setUpOwned() {
			const mine = new InMemoryCollectionSource({
				owners: [personal, acme],
				defaultOwnerId: 'acme',
			})
			const source = new CompositeCollectionSource({
				parts: [{ source: mine }, { owner: tldraw, source: shared() }],
			})
			return { source, mine }
		}

		it("lists the part's owners and keeps its collections' owners", async () => {
			const { source, mine } = setUpOwned()
			await mine.createCollection('Kit', { ownerId: 'home' })
			expect(source.getCollectionOwners().map((owner) => owner.id)).toEqual([
				'home',
				'acme',
				'tldraw',
			])
			expect(source.getCollections().map((c) => c.ownerId)).toEqual(['home', 'tldraw'])
		})

		it("uses the part's default owner and routes its owners to it", async () => {
			const { source, mine } = setUpOwned()
			expect(source.getDefaultOwnerId()).toBe('acme')
			const kit = await source.createCollection('Kit')
			expect(kit.ownerId).toBe('acme')
			await source.moveCollection(kit.id, 'home')
			expect(mine.getCollections()[0]).toMatchObject({ id: kit.id, ownerId: 'home' })
		})

		it("won't move a read-only part's collection to one of its owners", async () => {
			const { source, mine } = setUpOwned()
			await expect(source.moveCollection(wireframing, 'home')).rejects.toThrow(
				CollectionPermissionError
			)
			expect(mine.getCollections()).toEqual([])
		})

		it("copies a read-only part's collection to one of its owners", async () => {
			const { source, mine } = setUpOwned()
			await copyCollection(source, wireframing, 'home')
			expect(mine.getCollections()).toMatchObject([{ name: 'Wireframing', ownerId: 'home' }])
		})
	})

	it('offers moving items only when a part can', () => {
		const withMoving = setUp().source
		expect(withMoving.moveItem).toBeDefined()
		const unmovable = Object.assign(shared(), { moveItem: undefined })
		const withoutMoving = new CompositeCollectionSource({
			parts: [{ owner: tldraw, source: unmovable }],
		})
		expect(withoutMoving.moveItem).toBeUndefined()
	})
})
