import { atom } from '@tldraw/state'
import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CollectionPack } from './CollectionPack'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { PackCollectionSource, type PackCollectionSourceOptions } from './PackCollectionSource'
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
		{ id: 'button', name: 'Button', content: content('button'), thumbnailUrl: 'data:,button' },
		{ id: 'card', content: content('card') },
	],
})

const diagramming: CollectionPack = {
	id: 'diagramming',
	name: 'Diagramming',
	version: 1,
	items: [{ id: 'process', name: 'Process', content: content('process') }],
}

const addedIds = (ids: string[] = []) => atom<readonly string[]>('added pack ids', ids)

// Every pack added, so the listing tests see them all.
const create = (packs: CollectionPack[], options: Partial<PackCollectionSourceOptions> = {}) =>
	new PackCollectionSource({
		packs,
		addedPackIds: addedIds(packs.map((pack) => pack.id)),
		...options,
	})

describe('PackCollectionSource', () => {
	it('lists each pack as a read-only collection of its items', () => {
		const source = create([wireframing(), diagramming])
		const [first, second] = source.getCollections()
		expect(source.getCollections()).toHaveLength(2)
		expect(first).toMatchObject({ name: 'Wireframing', readOnly: true })
		expect(second).toMatchObject({ name: 'Diagramming', readOnly: true })
		expect(source.getItems(first.id).map((item) => item.name)).toEqual(['Button', undefined])
		expect(source.getItems(first.id)[0].thumbnailUrl).toBe('data:,button')
		expect(source.getItems(first.id)[1]).not.toHaveProperty('thumbnailUrl')
	})

	it('serves each item its pack content', async () => {
		const source = create([wireframing()])
		const [collection] = source.getCollections()
		const [button] = source.getItems(collection.id)
		expect(await source.getItemContent(button.id)).toEqual(content('button'))
		const missing = PackCollectionSource.getItemId('wireframing', 'nope')
		await expect(source.getItemContent(missing)).rejects.toThrow(CollectionNotFoundError)
	})

	it('keeps collection and item ids across pack versions', () => {
		const ids = (pack: CollectionPack) => {
			const source = create([pack])
			const [collection] = source.getCollections()
			return [collection.id, ...source.getItems(collection.id).map((item) => item.id)]
		}
		expect(ids(wireframing(2))).toEqual(ids(wireframing(1)))
		expect(ids(wireframing())[0]).toBe(PackCollectionSource.getCollectionId('wireframing'))
	})

	it('allows no changes and refuses every write', async () => {
		const source = create([wireframing()])
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
		expect(() => create([diagramming, diagramming])).toThrow()
		const pack = wireframing()
		expect(() => create([{ ...pack, items: [pack.items[0], pack.items[0]] }])).toThrow()
		expect(() =>
			create([{ ...pack, items: [{ id: 'bad', content: { formatVersion: 1 } as any }] }])
		).toThrow()
	})

	it('lists no packs until they are added', () => {
		const source = new PackCollectionSource({
			packs: [wireframing(), diagramming],
			addedPackIds: addedIds(),
		})
		expect(source.getCollections()).toEqual([])
		expect(source.getItems(PackCollectionSource.getCollectionId('wireframing'))).toEqual([])
		expect(source.getPacks().map((pack) => pack.id)).toEqual(['wireframing', 'diagramming'])
	})

	it('lists a pack once added and hides it once removed, in the packs order', () => {
		const added = addedIds()
		const source = new PackCollectionSource({
			packs: [wireframing(), diagramming],
			addedPackIds: added,
		})
		source.addPack('diagramming')
		source.addPack('wireframing')
		source.addPack('wireframing')
		expect(added.get()).toEqual(['diagramming', 'wireframing'])
		expect(source.getCollections().map((c) => c.name)).toEqual(['Wireframing', 'Diagramming'])
		expect(source.isPackAdded('wireframing')).toBe(true)
		const wireframingId = PackCollectionSource.getCollectionId('wireframing')
		expect(source.getItems(wireframingId)).toHaveLength(2)
		expect(source.getPackId(wireframingId)).toBe('wireframing')

		source.removePack('wireframing')
		expect(source.getCollections().map((c) => c.name)).toEqual(['Diagramming'])
		expect(source.getItems(wireframingId)).toEqual([])
		expect(source.isPackAdded('wireframing')).toBe(false)
	})

	it('ignores ids of packs it does not have', () => {
		const added = addedIds(['retired', 'diagramming'])
		const source = new PackCollectionSource({ packs: [diagramming], addedPackIds: added })
		expect(source.getCollections().map((c) => c.name)).toEqual(['Diagramming'])
		source.addPack('nope')
		expect(added.get()).toEqual(['retired', 'diagramming'])
		expect(source.getPackId(PackCollectionSource.getCollectionId('nope'))).toBeUndefined()
	})

	describe('without addedPackIds', () => {
		const storage = new Map<string, string>()
		afterEach(() => {
			storage.clear()
			vi.unstubAllGlobals()
		})
		const stubLocalStorage = () =>
			vi.stubGlobal('localStorage', {
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => storage.set(key, value),
				removeItem: (key: string) => storage.delete(key),
			})

		it('keeps added packs in localStorage per source id', () => {
			stubLocalStorage()
			const source = new PackCollectionSource({
				id: 'starter',
				packs: [wireframing(), diagramming],
			})
			expect(source.getCollections()).toEqual([])
			source.addPack('diagramming')
			expect(storage.get('tldraw-collections-added-packs:starter')).toBe('["diagramming"]')

			const reloaded = new PackCollectionSource({
				id: 'starter',
				packs: [wireframing(), diagramming],
			})
			expect(reloaded.getCollections().map((c) => c.name)).toEqual(['Diagramming'])
			const other = new PackCollectionSource({ id: 'other', packs: [diagramming] })
			expect(other.getCollections()).toEqual([])
		})

		it('adds nothing from a corrupt entry', () => {
			stubLocalStorage()
			storage.set('tldraw-collections-added-packs:packs', '{not json')
			expect(new PackCollectionSource({ packs: [diagramming] }).getCollections()).toEqual([])
			storage.set('tldraw-collections-added-packs:packs', '["diagramming", 3]')
			expect(new PackCollectionSource({ packs: [diagramming] }).getCollections()).toHaveLength(1)
		})

		it('works without localStorage', () => {
			vi.stubGlobal('localStorage', undefined)
			const source = new PackCollectionSource({ packs: [diagramming] })
			source.addPack('diagramming')
			expect(source.getCollections()).toHaveLength(1)
		})
	})
})
