import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import {
	copyPack,
	InMemoryLibrarySource,
	placeLibraryItem,
	whenItemsStored,
	type LibraryPack,
	type LibraryPackItem,
} from '@tldraw/libraries'
import {
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type SerializedStore,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
import {
	addStarterPack,
	canAddStarterPack,
	getStarterPackId,
	getStarterPackSummaries,
	isStarterPackAdded,
	loadStarterPack,
	loadStarterPackSummaries,
	STARTER_PACK_IDS,
	STARTER_PACK_PREVIEW_COUNT,
} from './starterPacks'

const pack: LibraryPack = { id: 'doodles', name: 'Doodles', version: 2, items: [] }

const owners = [
	{ id: 'acme', name: 'Acme' },
	{ id: 'home', name: 'Home' },
]

const fullPacks = await Promise.all(STARTER_PACK_IDS.map(loadStarterPack))

const DATA_DIR = join(__dirname, 'starterPackData')

interface IndexFile {
	id: string
	name: string
	version: number
	items: { id: string; name?: string; thumbnail?: string | { light: string; dark: string } }[]
}

// The index as written, its thumbnails named by file rather than resolved to URLs.
const readIndexFile = (packId: string): IndexFile =>
	JSON.parse(readFileSync(join(DATA_DIR, packId, 'index.json'), 'utf8'))

const thumbnailFiles = (thumbnail: IndexFile['items'][number]['thumbnail']) =>
	thumbnail === undefined
		? []
		: typeof thumbnail === 'string'
			? [thumbnail]
			: [thumbnail.light, thumbnail.dark]

describe('starter pack data', () => {
	it('summarises the packs in starterPackManifest.json', async () => {
		const summaries = STARTER_PACK_IDS.map((id) => {
			const index = readIndexFile(id)
			return {
				id: index.id,
				name: index.name,
				version: index.version,
				itemCount: index.items.length,
				itemNames: index.items.flatMap((item) => (item.name === undefined ? [] : [item.name])),
				previews: index.items
					.slice(0, STARTER_PACK_PREVIEW_COUNT)
					.map((item) => ({ id: item.id, thumbnail: item.thumbnail })),
			}
		})
		await expect(JSON.stringify(summaries, null, '\t') + '\n').toMatchFileSnapshot(
			'./starterPackManifest.json'
		)
	})

	it.each(STARTER_PACK_IDS)(
		"%s's folder holds exactly its index, each item's content and its thumbnails",
		(id) => {
			const index = readIndexFile(id)
			expect(index.id).toBe(id)
			expect(readdirSync(join(DATA_DIR, id)).sort()).toEqual([
				'content',
				'index.json',
				'thumbnails',
			])
			expect(readdirSync(join(DATA_DIR, id, 'content')).sort()).toEqual(
				index.items.map((item) => `${item.id}.json`).sort()
			)
			expect(readdirSync(join(DATA_DIR, id, 'thumbnails')).sort()).toEqual(
				index.items
					.flatMap((item) => thumbnailFiles(item.thumbnail))
					.map((file) => file.replace(/^thumbnails\//, ''))
					.sort()
			)
		}
	)

	it.each(STARTER_PACK_IDS)("%s's thumbnails carry no colour profile or metadata", (id) => {
		const dir = join(DATA_DIR, id, 'thumbnails')
		for (const file of readdirSync(dir)) {
			const webp = readFileSync(join(dir, file))
			const chunks: string[] = []
			for (let offset = 12; offset < webp.length; ) {
				const size = webp.readUInt32LE(offset + 4)
				chunks.push(webp.toString('ascii', offset, offset + 4))
				offset += 8 + size + (size & 1)
			}
			expect(chunks, file).not.toContain('ICCP')
			expect(chunks, file).not.toContain('EXIF')
			expect(chunks, file).not.toContain('XMP ')
		}
	})

	it('lists every pack in its folder', () => {
		expect(readdirSync(DATA_DIR).sort()).toEqual([...STARTER_PACK_IDS].sort())
	})

	it('loads the summaries once and keeps them for the dialog', async () => {
		expect(getStarterPackSummaries()).toBeUndefined()
		const loading = loadStarterPackSummaries()
		expect(loadStarterPackSummaries()).toBe(loading)
		const summaries = await loading
		expect(summaries.map((p) => p.id)).toEqual(STARTER_PACK_IDS)
		expect(getStarterPackSummaries()).toBe(summaries)
	})

	it('loads each pack under its own id', () => {
		expect(fullPacks.map((p) => p.id)).toEqual(STARTER_PACK_IDS)
	})

	it("can't load a pack that doesn't exist", async () => {
		await expect(loadStarterPack('nope')).rejects.toThrow()
	})

	it.each(fullPacks.map((p) => [p.id, p] as const))(
		'%s has items, each with a light and a dark thumbnail',
		(_, p) => {
			expect(p.items.length).toBeGreaterThan(0)
			expect(new Set(p.items.map((item) => item.id)).size).toBe(p.items.length)
			const webp = expect.stringMatching(/\.webp$/)
			for (const item of p.items) {
				expect(item.thumbnail, item.id).toEqual({ light: webp, dark: webp })
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

describe('starter pack items', () => {
	it.each(fullPacks.map((p) => [p.id, p] as const))(
		"%s's items each have one top-level shape",
		(_, p) => {
			for (const item of p.items) {
				const { shapes, rootShapeIds } = item.content.content
				const roots = shapes.filter((shape) => !shapes.some((s) => s.id === shape.parentId))
				expect(rootShapeIds, item.id).toHaveLength(1)
				expect(
					roots.map((shape) => shape.id),
					item.id
				).toEqual(rootShapeIds)
			}
		}
	)

	it('groups the items drawn from several shapes', () => {
		const doodles = fullPacks.find((p) => p.id === 'doodles')!
		const step = fullPacks
			.find((p) => p.id === 'diagramming')!
			.items.find((item) => item.id === 'step')!
		for (const item of [...doodles.items, step]) {
			const { shapes, rootShapeIds } = item.content.content
			const root = shapes.find((shape) => shape.id === rootShapeIds[0])!
			expect(root.type, item.id).toBe('group')
			expect(shapes.filter((shape) => shape.parentId === root.id).length, item.id).toBeGreaterThan(
				1
			)
		}
	})

	it('places a doodle as one group, selected', async () => {
		const doodles = fullPacks.find((p) => p.id === 'doodles')!
		const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' })
		const copy = await copyPack(source, {
			...doodles,
			items: doodles.items.map(({ thumbnail: _, ...item }) => item),
		})
		const editor = new Editor({
			store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.body,
		})
		try {
			for (const item of source.getItems(copy.id)) {
				editor.selectNone()
				await placeLibraryItem(editor, source, item.id)
				const placed = editor.getSelectedShapeIds()
				expect(placed, item.name).toHaveLength(1)
				expect(editor.getShape(placed[0])!.type, item.name).toBe('group')
			}
		} finally {
			editor.dispose()
		}
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

		const copy = await addStarterPack(source, math)
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

	it("doesn't count a copy in another owner", async () => {
		const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' })
		await source.createLibrary('Doodles', {
			ownerId: 'acme',
			meta: { packId: 'doodles', packVersion: 2 },
		})
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
