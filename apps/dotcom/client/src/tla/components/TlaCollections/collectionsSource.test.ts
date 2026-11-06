import { copyCollection, type TLCollectionItemContent } from '@tldraw/collections'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TldrawAppCollectionsSource } from './collectionsSource'
import { createFakeCollectionsBackend } from './fakeCollectionsBackend'
import { addStarterPack, STARTER_PACKS } from './starterPacks'

const content: TLCollectionItemContent = {
	formatVersion: 1,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

let sources: TldrawAppCollectionsSource[] = []

function setUp() {
	const backend = createFakeCollectionsBackend()
	vi.stubGlobal('fetch', backend.fetch)
	const source = new TldrawAppCollectionsSource(backend.app, backend.getToken)
	sources.push(source)
	return { backend, source }
}

beforeEach(() => {
	let n = 0
	vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:thumbnail-${++n}`)
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	for (const source of sources) source.dispose()
	sources = []
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('TldrawAppCollectionsSource', () => {
	it("lists the user's workspaces as owners, home first, and creates new collections there", async () => {
		const { source } = setUp()
		expect(source.getCollectionOwners()).toEqual([
			{ id: 'user_me', name: 'Private to you', private: true },
			{ id: 'acme', name: 'Acme' },
		])
		expect(source.getDefaultOwnerId()).toBe('user_me')
		const collection = await source.createCollection('Kit')
		expect(collection.ownerId).toBe('user_me')
		expect(source.getCollections()).toMatchObject([{ id: collection.id, name: 'Kit' }])
	})

	it('lists collections from the synced rows, with their workspace as owner', async () => {
		const { source } = setUp()
		const kit = await source.createCollection('Team kit', { ownerId: 'acme' })
		await source.moveCollection(kit.id, 'user_me')
		expect(source.getCollections().map((c) => [c.name, c.ownerId])).toEqual([
			['Team kit', 'user_me'],
		])
	})

	it("refuses to create in a workspace the user isn't in", async () => {
		const { source } = setUp()
		expect(source.can('createCollection')).toBe(true)
		await expect(source.createCollection('Kit', { ownerId: 'elsewhere' })).rejects.toThrow()
	})

	it('reports a mutation the server rejects', async () => {
		const { source } = setUp()
		const kit = await source.createCollection('Kit')
		await expect(source.moveCollection(kit.id, 'elsewhere')).rejects.toThrow('rejected')
	})

	it("adds an item through the worker, with the user's token, and loads its content back", async () => {
		const { backend, source } = setUp()
		const kit = await source.createCollection('Kit')
		const item = await source.addItem(kit.id, {
			name: 'Star',
			content,
			thumbnail: new Blob(['png'], { type: 'image/png' }),
		})
		const [, init] = backend.fetch.mock.calls[0]
		expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer token')
		expect(source.getItems(kit.id)).toMatchObject([
			{ id: item.id, name: 'Star', thumbnailUrl: item.thumbnailUrl },
		])
		expect(item.thumbnailUrl).toMatch(/^blob:/)
		expect(await source.getItemContent(item.id)).toEqual(content)
	})

	it('loads thumbnails for items it did not add', async () => {
		const { backend, source } = setUp()
		const kit = await source.createCollection('Kit')
		await source.addItem(kit.id, { content, thumbnail: new Blob(['png'], { type: 'image/png' }) })
		// another client of the same account, which sees the row arrive through Zero
		const second = new TldrawAppCollectionsSource(backend.app, backend.getToken)
		sources.push(second)
		await vi.waitFor(() => expect(second.getItems(kit.id)[0]?.thumbnailUrl).toMatch(/^blob:/))
	})

	it('copies a collection in the worker rather than item by item', async () => {
		const { backend, source } = setUp()
		const kit = await source.createCollection('Kit')
		await source.addItem(kit.id, { name: 'Star', content })
		const copy = await copyCollection(source, kit.id, 'acme')
		expect(copy).toMatchObject({ name: 'Kit', ownerId: 'acme' })
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Star'])
		const urls = backend.fetch.mock.calls.map(([url]) => String(url))
		expect(urls.filter((url) => url.endsWith('/content'))).toEqual([])
	})

	it('copies a starter pack into the home workspace and remembers which pack it was', async () => {
		const { source } = setUp()
		const doodles = STARTER_PACKS.find((pack) => pack.id === 'doodles')!
		const copy = await addStarterPack(source, doodles, 'user_me')
		expect(copy).toMatchObject({ name: doodles.name, ownerId: 'user_me' })
		expect(source.getItems(copy.id)).toHaveLength(doodles.items.length)
		expect(source.getCollections()[0].meta).toEqual({
			packId: 'doodles',
			packVersion: doodles.version,
		})
	})

	it('renames, moves and deletes items through the mutators', async () => {
		const { source } = setUp()
		const kit = await source.createCollection('Kit')
		const other = await source.createCollection('Other', { ownerId: 'acme' })
		const item = await source.addItem(kit.id, { content })
		await source.renameItem(item.id, 'Star')
		await source.moveItem(item.id, other.id)
		expect(source.getItems(other.id).map((i) => i.name)).toEqual(['Star'])
		await source.deleteItem(item.id)
		expect(source.getItems(other.id)).toEqual([])
	})
})
