import {
	copyPack,
	InMemoryLibrarySource,
	LibraryRecordType,
	type InMemoryLibrarySourceOptions,
	whenItemsStored,
	type LibraryPackItem,
	type LibrarySource,
} from '@tldraw/libraries'
import { createTLSchema, type SerializedStore, type TLRecord } from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
import {
	getStarterPackBrowseGroup,
	getStarterPackOwnerId,
	getStarterPackSummaries,
	loadStarterPack,
	loadStarterPackSummaries,
	STARTER_PACK_LOADERS,
	STARTER_PACK_PREVIEW_COUNT,
	type StarterPackSummary,
} from './starterPacks'

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
		'%s has items, each with a light and a dark thumbnail',
		(_, p) => {
			expect(p.items.length).toBeGreaterThan(0)
			expect(new Set(p.items.map((item) => item.id)).size).toBe(p.items.length)
			const dataUrl = expect.stringMatching(/^data:image\//)
			for (const item of p.items) {
				expect(item.thumbnail, item.id).toEqual({ light: dataUrl, dark: dataUrl })
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

describe('starter packs in tldraw.com workspaces', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it("stores each item's category and tags with its copy", async () => {
		const backend = createFakeLibrariesBackend()
		vi.stubGlobal('fetch', backend.fetch)
		vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:local')
		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
		const source = new TldrawAppLibrariesSource(backend.app, backend.getToken)
		const math = await loadStarterPack('math')

		const copy = await copyPack(source, math)
		await whenItemsStored(source.getItems(copy.id).map((item) => item.id))

		const rows = backend.rows.get().find((row) => row.id === copy.id.split(':')[1])!.items
		expect(rows.map((row) => row.meta)).toEqual(math.items.map((item) => item.meta))
		expect(rows[0].meta).toEqual({
			category: 'Operators and relations',
			tags: ['Plus', 'plus', 'Operators and relations'],
			source: 'tldraw',
		})
	})
})

const doodles: StarterPackSummary = {
	id: 'doodles',
	name: 'Doodles',
	version: 2,
	itemCount: 3,
	previews: [],
}

// A file in Acme: it shows the user's default, and offers Acme and home for new libraries.
function setUpFile({
	libraries = [],
	can,
}: {
	libraries?: ReturnType<typeof LibraryRecordType.create>[]
	can?: InMemoryLibrarySourceOptions['can']
} = {}) {
	const mine = LibraryRecordType.create({ name: 'My stuff', ownerId: 'home' })
	const source: LibrarySource = Object.assign(
		new InMemoryLibrarySource({
			owners,
			defaultOwnerId: 'home',
			initial: { libraries: [mine, ...libraries], items: [], contents: {} },
			shownInDocument: [{ libraryId: mine.id, placement: 'default' }],
			can,
		}),
		{ getNewLibraryOwnerIds: () => ['acme', 'home'] }
	)
	return source
}

const doodlesCopy = (ownerId: string) =>
	LibraryRecordType.create({
		name: 'Doodles',
		ownerId,
		meta: { packId: 'doodles', packVersion: 2 },
	})

describe('starter packs to browse', () => {
	it("copies a pack to the file's workspace, or home where the user can't create there", () => {
		expect(getStarterPackOwnerId(setUpFile())).toBe('acme')
		const notInAcme = setUpFile({
			can: (_, target) => typeof target !== 'object' || target.ownerId !== 'acme',
		})
		expect(getStarterPackOwnerId(notInAcme)).toBe('home')
		expect(
			getStarterPackOwnerId(new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' }))
		).toBe('home')
	})

	it('adds a copy the user already has rather than copying the pack again', async () => {
		const copy = doodlesCopy('home')
		const source = setUpFile({ libraries: [copy] })
		const [entry] = getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries
		expect(entry).toMatchObject({ id: 'doodles', added: false, canAdd: true, itemCount: 3 })

		expect(await entry.add()).toBe(copy.id)
		expect(source.getLibraryPlacement!(copy.id)).toBe('added')
		expect(source.getLibraries()).toHaveLength(2)
		expect(getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries[0].added).toBe(
			true
		)
	})

	it('removes the copy the file shows from the file, and keeps the copy to add again', async () => {
		const copy = doodlesCopy('home')
		const source = setUpFile({ libraries: [copy] })
		const entryOf = () =>
			getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries[0]
		expect(entryOf().remove).toBeUndefined()

		await entryOf().add()
		const added = entryOf()
		expect(added).toMatchObject({ added: true, libraryId: copy.id })
		await added.remove!()

		expect(source.getLibraries().map((l) => l.id)).not.toContain(copy.id)
		expect(source.getAvailableLibraries!().map((l) => l.id)).toContain(copy.id)
		expect(entryOf()).toMatchObject({ added: false, canAdd: true, remove: undefined })
	})

	it("can't remove a pack's copy the user may not remove from the file", async () => {
		const copy = doodlesCopy('home')
		const source = setUpFile({
			libraries: [copy],
			can: (action) => action !== 'removeLibraryFromDocument',
		})
		await getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries[0].add()
		const [entry] = getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries
		expect(entry.added).toBe(true)
		expect(entry.remove).toBeUndefined()
	})

	it("loads a pack's items for viewing before it's added", async () => {
		const [entry] = getStarterPackBrowseGroup(setUpFile(), [doodles], 'Public', () => {}).entries
		const pack = await loadStarterPack('doodles')
		expect(await entry.getItems!()).toEqual(
			pack.items.map(({ id, name, thumbnail }) => ({ id, name, thumbnail }))
		)
	})

	it("can't add a pack the user can neither copy nor has a copy of", () => {
		const source = setUpFile({ can: (action) => action !== 'createLibrary' })
		expect(getStarterPackBrowseGroup(source, [doodles], 'Public', () => {}).entries[0].canAdd).toBe(
			false
		)
		const withCopy = setUpFile({
			libraries: [doodlesCopy('acme')],
			can: (action) => action !== 'createLibrary',
		})
		expect(
			getStarterPackBrowseGroup(withCopy, [doodles], 'Public', () => {}).entries[0].canAdd
		).toBe(true)
	})
})
