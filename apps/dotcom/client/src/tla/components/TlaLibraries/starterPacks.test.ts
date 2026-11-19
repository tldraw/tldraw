import { type LibraryPack, type LibraryPackItem, InMemoryLibrarySource } from '@tldraw/libraries'
import { createTLSchema, type SerializedStore, type TLRecord } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import {
	addStarterPack,
	canAddStarterPack,
	getStarterPackId,
	getStarterPackSummaries,
	isStarterPackAdded,
	loadStarterPack,
	loadStarterPackSummaries,
	STARTER_PACK_LOADERS,
	STARTER_PACK_PREVIEW_COUNT,
	type StarterPackSummary,
} from './starterPacks'

const pack: LibraryPack = { id: 'doodles', name: 'Doodles', version: 2, items: [] }

const owners = [
	{ id: 'acme', name: 'Acme' },
	{ id: 'home', name: 'Home' },
]

const fullPacks = await Promise.all(Object.keys(STARTER_PACK_LOADERS).map(loadStarterPack))

describe('starter pack data', () => {
	it('summarises the packs in starterPackManifest.json', async () => {
		const summaries: StarterPackSummary[] = fullPacks.map((p) => ({
			id: p.id,
			name: p.name,
			version: p.version,
			itemCount: p.items.length,
			previews: p.items
				.slice(0, STARTER_PACK_PREVIEW_COUNT)
				.map((item) => ({ id: item.id, thumbnail: item.thumbnail })),
		}))
		await expect(JSON.stringify(summaries, null, '\t') + '\n').toMatchFileSnapshot(
			'./starterPackManifest.json'
		)
	})

	it('loads the summaries once and keeps them for the dialog', async () => {
		expect(getStarterPackSummaries()).toBeUndefined()
		const loading = loadStarterPackSummaries()
		expect(loadStarterPackSummaries()).toBe(loading)
		const summaries = await loading
		expect(summaries.map((p) => p.id)).toEqual(Object.keys(STARTER_PACK_LOADERS))
		expect(getStarterPackSummaries()).toBe(summaries)
	})

	it('loads each pack under its own id', () => {
		expect(fullPacks.map((p) => p.id)).toEqual(Object.keys(STARTER_PACK_LOADERS))
	})

	it("can't load a pack that doesn't exist", async () => {
		await expect(loadStarterPack('nope')).rejects.toThrow()
	})

	it.each(fullPacks.map((p) => [p.id, p] as const))(
		'%s has items, each with a thumbnail',
		(_, p) => {
			expect(p.items.length).toBeGreaterThan(0)
			expect(new Set(p.items.map((item) => item.id)).size).toBe(p.items.length)
			for (const item of p.items) {
				expect(item.thumbnail, item.id).toEqual(expect.stringMatching(/^data:image\//))
			}
		}
	)
})

describe('starter pack content', () => {
	// tldraw.com's board schema, which the content is placed into
	const schema = createTLSchema({ records: fileSchemaRecords })

	// Migrates an item's records to the current schema and validates them, throwing if either fails.
	function migrateAndValidate({ content }: LibraryPackItem['content']) {
		const records = [...content.shapes, ...(content.bindings ?? []), ...content.assets]
		const store = Object.fromEntries(
			records.map((record) => [record.id, record])
		) as SerializedStore<TLRecord>
		const migrated = schema.migrateStoreSnapshot({ store, schema: content.schema })
		if (migrated.type !== 'success') throw new Error(`Migration failed: ${migrated.reason}`)
		for (const record of Object.values(migrated.value)) {
			schema.validateRecord(null!, record, 'tests', null)
		}
	}

	it.each(fullPacks.map((p) => [p.id, p] as const))(
		"%s's items migrate to and validate against the current schema",
		(_, p) => {
			for (const item of p.items) {
				expect(() => migrateAndValidate(item.content), item.id).not.toThrow()
			}
		}
	)

	it('fails an item with a record the schema refuses', () => {
		const { content } = fullPacks[0].items[0]
		const [shape, ...shapes] = content.content.shapes
		const broken = {
			...content,
			content: { ...content.content, shapes: [{ ...shape, x: 'left' } as any, ...shapes] },
		}
		expect(() => migrateAndValidate(broken)).toThrow()
	})
})

describe('starter packs in a source without owners', () => {
	it('copies the pack as a new library', async () => {
		const source = new InMemoryLibrarySource()
		const copy = await addStarterPack(source, pack)
		expect(copy).toMatchObject({ name: 'Doodles', meta: { packId: 'doodles', packVersion: 2 } })
		expect(copy.ownerId).toBeUndefined()
		expect(getStarterPackId(copy)).toBe('doodles')
	})

	it('names no pack for a library made any other way', async () => {
		const source = new InMemoryLibrarySource()
		expect(getStarterPackId(await source.createLibrary('Kit'))).toBeUndefined()
	})

	it('counts a pack as added while the source holds a copy of it', async () => {
		const source = new InMemoryLibrarySource()
		expect(isStarterPackAdded(source, 'doodles')).toBe(false)
		const copy = await addStarterPack(source, pack)
		expect(isStarterPackAdded(source, 'doodles')).toBe(true)
		expect(isStarterPackAdded(source, 'wireframing')).toBe(false)
		await source.deleteLibrary(copy.id)
		expect(isStarterPackAdded(source, 'doodles')).toBe(false)
	})

	it("can't add a pack when the source refuses new libraries", () => {
		expect(canAddStarterPack(new InMemoryLibrarySource())).toBe(true)
		expect(canAddStarterPack(new InMemoryLibrarySource({ can: () => false }))).toBe(false)
	})
})

describe('starter packs in a source with owners', () => {
	it('copies the pack into the default owner', async () => {
		const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' })
		const copy = await addStarterPack(source, pack)
		expect(copy).toMatchObject({ ownerId: 'home', meta: { packId: 'doodles', packVersion: 2 } })
	})

	it("doesn't count a copy that has moved to another owner", async () => {
		const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' })
		const copy = await addStarterPack(source, pack)
		expect(isStarterPackAdded(source, 'doodles')).toBe(true)
		await source.moveLibrary(copy.id, 'acme')
		expect(isStarterPackAdded(source, 'doodles')).toBe(false)
	})

	it('asks whether the default owner may have new libraries', () => {
		const source = new InMemoryLibrarySource({
			owners,
			defaultOwnerId: 'home',
			can: (_, target) => typeof target !== 'object' || target.ownerId !== 'home',
		})
		expect(canAddStarterPack(source)).toBe(false)
	})
})
