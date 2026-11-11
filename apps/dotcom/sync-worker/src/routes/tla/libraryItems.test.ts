import {
	MAX_LIBRARY_ITEMS_PER_REQUEST,
	MAX_LIBRARY_ITEMS_REQUEST_BYTES,
} from '@tldraw/dotcom-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLibraryItemContentKey, STORAGE_CONCURRENCY } from '../../libraryStorage'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { addLibraryItems, getLibraryItemContent } = await import('./libraryItems')

const ME = 'user_aaaa11112222bbbb'
const W = 'group_www11112222www'
const LIBRARY_ID = 'coll_aaaa11112222bbbb'
const ITEM_ID = 'item_1111222233334444'
const OTHER_ID = 'item_5555666677778888'
const CONTENT = { formatVersion: 1, content: { shapes: [], rootShapeIds: [], schema: {} } }
const png = () => new Blob([new Uint8Array([1])], { type: 'image/png' })

// The library and the user's role, no item with the ids, then the inserted rows' ids.
const adding = (access: unknown, ids = [ITEM_ID]) => [[access], [], ids.map((id) => ({ id }))]

function mockPool(resultSets: unknown[][]) {
	const fake = createFakeKysely(resultSets)
	vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
	return fake
}

function makeEnv() {
	return {
		ROOMS: createFakeR2(),
		UPLOADS: createFakeR2(),
		USER_CONTENT_URL: 'https://content.test',
	} as unknown as Environment
}

const uploadNames = async (env: Environment) =>
	(await env.UPLOADS.list()).objects.map((o: { key: string }) => o.key)

interface ItemFields {
	id?: string
	name?: string
	content?: string
	thumbnail?: Blob
	darkThumbnail?: Blob
}

// A request adding the items, each listed by its id and name unless `list` replaces the listing.
function addRequest(items: ItemFields[], list?: unknown) {
	const form = new FormData()
	const listed = items.map(({ id = ITEM_ID, name }) => ({
		id,
		...(name === undefined ? {} : { name }),
	}))
	form.set('items', JSON.stringify(list === undefined ? listed : list))
	for (const { id = ITEM_ID, content, thumbnail, darkThumbnail } of items) {
		if (content !== undefined) form.set(`content:${id}`, content)
		if (thumbnail) form.set(`thumbnail:${id}`, thumbnail)
		if (darkThumbnail) form.set(`darkThumbnail:${id}`, darkThumbnail)
	}
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/libraries/${LIBRARY_ID}/items`, {
			method: 'POST',
			body: form,
		}),
		{ params: { libraryId: LIBRARY_ID } }
	) as any
}

const valid = (id = ITEM_ID): ItemFields => ({ id, content: JSON.stringify(CONTENT) })

function getRequest() {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/library-items/${ITEM_ID}/content`),
		{ params: { itemId: ITEM_ID } }
	) as any
}

const libraryAccess = (owningGroupId: string, role: string | null) => ({
	id: LIBRARY_ID,
	name: 'Shapes',
	owningGroupId,
	meta: {},
	role,
})

const itemAccess = (role: string | null) => ({
	id: ITEM_ID,
	libraryId: LIBRARY_ID,
	name: null,
	thumbnail: 'https://content.test/thumb_1-png',
	createdBy: ME,
	createdAt: 1,
	updatedAt: 1,
	owningGroupId: W,
	role,
})

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
})

afterEach(() => vi.clearAllMocks())

describe('addLibraryItems', () => {
	it("stores a member's item and inserts its row under the id the client picked", async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItems(
			addRequest([
				{
					content: JSON.stringify(CONTENT),
					thumbnail: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
					name: '  Button  ',
				},
			]),
			env
		)

		expect(response.status).toBe(200)
		const {
			items: [{ id, thumbnail }],
		} = (await response.json()) as { items: { id: string; thumbnail: string }[] }
		expect(id).toBe(ITEM_ID)
		expect(await (await env.ROOMS.get(getLibraryItemContentKey(ITEM_ID)))!.json()).toEqual(CONTENT)
		const [objectName] = await uploadNames(env)
		expect(objectName).toMatch(/-webp$/)
		expect(objectName).not.toContain(ITEM_ID)
		expect(thumbnail).toBe(`https://content.test/${objectName}`)
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		expect(insert.parameters).toEqual(
			expect.arrayContaining([ITEM_ID, LIBRARY_ID, 'Button', JSON.stringify(thumbnail), ME])
		)
	})

	it('stores a light and a dark thumbnail', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItems(
			addRequest([
				{
					content: JSON.stringify(CONTENT),
					thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
					darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/webp' }),
				},
			]),
			env
		)

		expect(response.status).toBe(200)
		const {
			items: [{ thumbnail }],
		} = (await response.json()) as { items: { thumbnail: { light: string; dark: string } }[] }
		const names = await uploadNames(env)
		expect(names).toHaveLength(2)
		expect(thumbnail.light).toMatch(/^https:\/\/content\.test\/.+-png$/)
		expect(thumbnail.dark).toMatch(/^https:\/\/content\.test\/.+-webp$/)
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		expect(insert.parameters).toContain(JSON.stringify(thumbnail))
	})

	it("removes what it stored when the row can't be inserted", async () => {
		const fake = mockPool([[libraryAccess(W, 'member')]])
		vi.spyOn(fake.db, 'transaction').mockImplementation(() => {
			throw new Error('the library was deleted')
		})
		const env = makeEnv()
		await expect(
			addLibraryItems(
				addRequest([
					{
						content: JSON.stringify(CONTENT),
						thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
					},
				]),
				env
			)
		).rejects.toThrow('the library was deleted')
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
	})

	it('adds to a library in my home workspace, which may have no group_user row', async () => {
		mockPool(adding(libraryAccess(ME, null)))
		const response = await addLibraryItems(
			addRequest([{ content: JSON.stringify(CONTENT) }]),
			makeEnv()
		)
		expect(response.status).toBe(200)
	})

	it.each([
		['a workspace I am not in', [[libraryAccess(W, null)]]],
		["another user's home workspace", [[libraryAccess('user_cccc11112222dddd', null)]]],
		['a library that does not exist', [[]]],
	])('answers 404 for %s and stores nothing', async (_, resultSets) => {
		const fake = mockPool(resultSets)
		const env = makeEnv()
		const response = await addLibraryItems(addRequest([{ content: JSON.stringify(CONTENT) }]), env)
		expect(response.status).toBe(404)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it.each<[string, ItemFields[], unknown?]>([
		['content that is not JSON', [{ content: '{' }]],
		['JSON that is not item content', [{ content: JSON.stringify({ shapes: [] }) }]],
		['an item without content', [{}]],
		[
			'an SVG thumbnail',
			[{ ...valid(), thumbnail: new Blob(['<svg/>'], { type: 'image/svg+xml' }) }],
		],
		[
			'a dark thumbnail without a light one',
			[{ ...valid(), darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/png' }) }],
		],
		['a request without a list of items', [valid()], null],
		['an empty list of items', [], []],
		['an item without an id', [valid()], [{}]],
		['an id uniqueId would not make', [valid('item_1')]],
		['an id with characters uniqueId does not use', [valid('item/../111222233334444')]],
		['the same id twice', [valid(), valid()]],
		['a bad item after a good one', [valid(), { id: OTHER_ID, content: '{' }]],
	])('refuses %s, storing nothing', async (_, items, list) => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItems(addRequest(items, list), env)
		expect(response.status).toBe(400)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries).toEqual([])
	})

	it.each<[string, ItemFields[]]>([
		[
			'more items than one request may add',
			Array.from({ length: MAX_LIBRARY_ITEMS_PER_REQUEST + 1 }, (_, i) =>
				valid(`item_${String(i).padStart(16, '0')}`)
			),
		],
		[
			'content that is too large',
			[{ content: JSON.stringify({ ...CONTENT, padding: 'x'.repeat(5_000_000) }) }],
		],
		[
			'a thumbnail that is too large',
			[{ ...valid(), thumbnail: new Blob([new Uint8Array(1_000_001)], { type: 'image/png' }) }],
		],
		[
			'items that are too large together',
			Array.from({ length: 3 }, (_, i) => ({
				id: `item_${String(i).padStart(16, '0')}`,
				content: JSON.stringify({ ...CONTENT, padding: 'x'.repeat(4_000_000) }),
			})),
		],
	])('refuses %s with 413, storing nothing', async (_, items) => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItems(addRequest(items), env)
		expect(response.status).toBe(413)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(fake.queries).toEqual([])
	})

	it('refuses a request too large to read, before reading it', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const request = addRequest([valid()])
		request.headers.set('content-length', String(MAX_LIBRARY_ITEMS_REQUEST_BYTES * 2))
		const formData = vi.spyOn(request, 'formData')
		const response = await addLibraryItems(request, makeEnv())
		expect(response.status).toBe(413)
		expect(formData).not.toHaveBeenCalled()
		expect(fake.queries).toEqual([])
	})

	it('refuses an id that names an existing item, before storing anything', async () => {
		const fake = mockPool([[libraryAccess(W, 'member')], [{ id: ITEM_ID }]])
		const env = makeEnv()
		const response = await addLibraryItems(
			addRequest([{ content: JSON.stringify(CONTENT), thumbnail: png() }]),
			env
		)
		expect(response.status).toBe(409)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it("refuses the id of a deleted item whose content hasn't been removed yet", async () => {
		const fake = mockPool([[libraryAccess(W, 'member')], []])
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey(ITEM_ID), JSON.stringify(CONTENT))
		const response = await addLibraryItems(addRequest([{ content: JSON.stringify(CONTENT) }]), env)
		expect(response.status).toBe(409)
		expect(await (await env.ROOMS.get(getLibraryItemContentKey(ITEM_ID)))!.json()).toEqual(CONTENT)
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it('answers 409 when another request inserts an id first, removing the uploads it stored', async () => {
		// no item when it checks, but the insert finds one
		const fake = mockPool([[libraryAccess(W, 'member')], [], []])
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1, 2, 3]))
		const image = {
			id: 'asset:photo',
			typeName: 'asset',
			type: 'image',
			props: { src: 'https://content.test/abc123-png', w: 10, h: 10 },
			meta: {},
		}
		const response = await addLibraryItems(
			addRequest([
				{
					content: JSON.stringify({ ...CONTENT, content: { ...CONTENT.content, assets: [image] } }),
					thumbnail: png(),
				},
			]),
			env
		)
		expect(response.status).toBe(409)
		expect(await env.ROOMS.head(getLibraryItemContentKey(ITEM_ID))).not.toBeNull()
		expect(await uploadNames(env)).toEqual(['abc123-png'])
		expect(fake.queries.some((q) => q.sql.includes('library_item_asset'))).toBe(false)
		expect(fake.queries.at(-1)!.sql).toBe('rollback')
	})

	it('inserts no row when another request takes one of the ids, removing the others', async () => {
		// no item when it checks, but the insert finds the second taken
		const fake = mockPool([[libraryAccess(W, 'member')], [], [{ id: ITEM_ID }]])
		const env = makeEnv()
		const response = await addLibraryItems(addRequest([valid(), valid(OTHER_ID)]), env)
		expect(response.status).toBe(409)
		expect(await env.ROOMS.head(getLibraryItemContentKey(ITEM_ID))).toBeNull()
		expect(await env.ROOMS.head(getLibraryItemContentKey(OTHER_ID))).not.toBeNull()
		expect(fake.queries.at(-1)!.sql).toBe('rollback')
	})

	it('adds several items in one insert, in the order listed, each a step newer', async () => {
		const ids = [OTHER_ID, ITEM_ID, 'item_9999000011112222']
		const fake = mockPool(adding(libraryAccess(W, 'member'), ids))
		const env = makeEnv()
		vi.spyOn(Date, 'now').mockReturnValue(1000)
		const response = await addLibraryItems(
			addRequest([
				{ ...valid(ids[0]), name: 'First', thumbnail: png() },
				{ ...valid(ids[1]), name: 'Second' },
				{ ...valid(ids[2]), name: 'Third', thumbnail: png() },
			]),
			env
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as {
			items: { id: string; createdAt: number; thumbnail: string | null }[]
		}
		expect(body.items.map((item) => [item.id, item.createdAt])).toEqual([
			[ids[0], 1000],
			[ids[1], 1001],
			[ids[2], 1002],
		])
		expect(body.items[0].thumbnail).toMatch(/^https:\/\/content\.test\//)
		expect(body.items[1].thumbnail).toBeNull()
		for (const id of ids) {
			expect(await (await env.ROOMS.get(getLibraryItemContentKey(id)))!.json()).toEqual(CONTENT)
		}
		const inserts = fake.queries.filter((q) => q.sql.startsWith('insert into "library_item"'))
		expect(inserts).toHaveLength(1)
		const parameters = inserts[0].parameters as unknown[]
		const order = ids.map((id) => parameters.indexOf(id))
		expect(order).toEqual([...order].sort((a, b) => a - b))
		expect(parameters).toEqual(expect.arrayContaining(['First', 'Second', 'Third']))
		vi.restoreAllMocks()
	})

	it('stores a few items at a time', async () => {
		const ids = Array.from({ length: 10 }, (_, i) => `item_${String(i).padStart(16, '0')}`)
		mockPool(adding(libraryAccess(W, 'member'), ids))
		const env = makeEnv()
		const put = env.ROOMS.put.bind(env.ROOMS)
		let storing = 0
		let mostAtOnce = 0
		env.ROOMS.put = (async (...args: Parameters<R2Bucket['put']>) => {
			mostAtOnce = Math.max(mostAtOnce, ++storing)
			await new Promise((resolve) => setTimeout(resolve, 5))
			storing--
			return put(...args)
		}) as R2Bucket['put']
		const response = await addLibraryItems(addRequest(ids.map((id) => valid(id))), env)
		expect(response.status).toBe(200)
		expect(mostAtOnce).toBe(STORAGE_CONCURRENCY)
	})

	it('removes everything every item stored when one fails to store', async () => {
		const ids = Array.from({ length: 6 }, (_, i) => `item_${String(i).padStart(16, '0')}`)
		const fake = mockPool(adding(libraryAccess(W, 'member'), ids))
		const env = makeEnv()
		const put = env.UPLOADS.put.bind(env.UPLOADS)
		let thumbnails = 0
		env.UPLOADS.put = (async (...args: Parameters<R2Bucket['put']>) => {
			if (++thumbnails === 3) throw new Error('storage is down')
			return put(...args)
		}) as R2Bucket['put']
		await expect(
			addLibraryItems(addRequest(ids.map((id) => ({ ...valid(id), thumbnail: png() }))), env)
		).rejects.toThrow('storage is down')
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})
})

describe('addLibraryItems, with uploaded images in the content', () => {
	const image = (src: string, fileId?: string) => ({
		id: 'asset:photo',
		typeName: 'asset',
		type: 'image',
		props: { src, w: 10, h: 10 },
		meta: fileId ? { fileId } : {},
	})
	const withAssets = (assets: unknown[]) =>
		JSON.stringify({ ...CONTENT, content: { ...CONTENT.content, assets } })

	it('copies each uploaded image to an object the item owns and points the content at it', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1, 2, 3]))

		const response = await addLibraryItems(
			addRequest([{ content: withAssets([image('https://content.test/abc123-png', 'file-a')]) }]),
			env
		)

		expect(response.status).toBe(200)
		const uploads = await uploadNames(env)
		const copyName = uploads.find((key: string) => key !== 'abc123-png')!
		expect(copyName).toMatch(/-png$/)
		const stored = await (await env.ROOMS.get(getLibraryItemContentKey(ITEM_ID)))!.json<any>()
		expect(stored.content.assets[0].props.src).toBe(`https://content.test/${copyName}`)
		// so a board it's placed on copies the image for itself
		expect(stored.content.assets[0].meta).toEqual({})
		const ownership = fake.queries.find((q) =>
			q.sql.startsWith('insert into "library_item_asset"')
		)!
		expect(ownership.parameters).toEqual([ITEM_ID, copyName])
	})

	it('leaves an asset whose upload is missing, or that is not an upload, as it was', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const assets = [image('https://content.test/gone-png'), image('data:image/png;base64,AAAA')]
		const response = await addLibraryItems(addRequest([{ content: withAssets(assets) }]), env)

		expect(response.status).toBe(200)
		const stored = await (await env.ROOMS.get(getLibraryItemContentKey(ITEM_ID)))!.json<any>()
		expect(stored.content.assets).toEqual(assets)
		expect(fake.queries.some((q) => q.sql.includes('library_item_asset'))).toBe(false)
	})
})

describe('getLibraryItemContent', () => {
	async function storedEnv() {
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey(ITEM_ID), JSON.stringify(CONTENT))
		return env
	}

	it("serves a member the item's content", async () => {
		const env = await storedEnv()
		mockPool([[itemAccess('member')]])
		const content = await getLibraryItemContent(getRequest(), env)
		expect(content.status).toBe(200)
		expect(await content.json()).toEqual(CONTENT)
	})

	it('answers 404 to someone who is not a member of the workspace', async () => {
		const env = await storedEnv()
		mockPool([[itemAccess(null)]])
		expect((await getLibraryItemContent(getRequest(), env)).status).toBe(404)
	})
})
