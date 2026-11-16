import {
	MAX_NUMBER_OF_LIBRARIES,
	MAX_NUMBER_OF_LIBRARY_ITEMS,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))
vi.mock('../../utils/featureFlags', () => ({ canUseLibraries: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { canUseLibraries } = await import('../../utils/featureFlags')
const { copyLibrary } = await import('./copyLibrary')

const ME = 'user_aaaa11112222bbbb'
const W = 'group_www11112222www'
const V = 'group_vvv11112222vvv'
const LIBRARY_ID = 'coll_aaaa11112222bbbb'
const NEW_ID = 'coll_new_111122223333'
const newItemId = (n: number) => `copy_${String(n).padStart(16, '0')}`

const access = (role: string | null) => ({
	id: LIBRARY_ID,
	name: 'Shapes',
	owningGroupId: W,
	meta: { packId: 'icons', packVersion: 1 },
	role,
})
const contentKey = (id: string) => `library-items/content_${id}/content.json`
const item = (id: string, thumbnail: string | { light: string; dark: string } | null) => ({
	id,
	libraryId: LIBRARY_ID,
	name: `Button ${id}`,
	thumbnail,
	contentKey: contentKey(id),
	createdBy: 'user_cccc11112222dddd',
	createdAt: 1,
	updatedAt: 1,
})
type Item = ReturnType<typeof item>
interface ObjectRow {
	itemId: string
	bucket: string
	objectName: string
}

const url = (objectName: string) => `https://content.test/${objectName}`

function makeEnv() {
	return {
		ROOMS: createFakeR2(),
		UPLOADS: createFakeR2(),
		USER_CONTENT_URL: 'https://content.test',
	} as unknown as Environment
}

function mockPool(resultSets: unknown[][]) {
	const fake = createFakeKysely(resultSets)
	vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
	return fake
}

// The destination's lock and its library count, read in the transaction before the source's items.
const destination = (libraries = 0) => [[], [{ count: String(libraries) }]]

// The library and my role in it, my role in the destination, the destination's lock and count, the
// source's items, the inserted library's id, the inserted items' ids, then the source items'
// objects.
function copying(
	items: Item[],
	copied = items.map((_, i) => newItemId(i)),
	objects: ObjectRow[] = []
) {
	return [
		[access('member')],
		[{ role: 'member' }],
		...destination(),
		items,
		[{ id: NEW_ID }],
		copied.map((id) => ({ id })),
		objects,
	]
}

const itemIdsFor = (ids: string[]) => Object.fromEntries(ids.map((id, i) => [id, newItemId(i)]))

function request(owningGroupId: string, body: Record<string, unknown> = {}) {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/libraries/${LIBRARY_ID}/copy`, {
			method: 'POST',
			body: JSON.stringify({ owningGroupId, id: NEW_ID, itemIds: {}, ...body }),
		}),
		{ params: { libraryId: LIBRARY_ID } }
	) as any
}

const insertOf = (fake: ReturnType<typeof mockPool>, table: string) =>
	fake.queries.find((q) => q.sql.startsWith(`insert into "${table}" `))

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
	vi.mocked(canUseLibraries).mockResolvedValue(true)
})

afterEach(() => vi.clearAllMocks())

describe('copyLibrary', () => {
	it("inserts the rows under the ids I picked, each naming its source's content and thumbnail", async () => {
		const pair = { light: url('light_b-png'), dark: url('dark_b-png') }
		const items = [item('item_a', url('thumb_a-png')), item('item_b', pair), item('item_c', null)]
		const fake = mockPool(copying(items))

		const response = await copyLibrary(
			request(V, { itemIds: itemIdsFor(['item_a', 'item_b', 'item_c']) }),
			makeEnv()
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ id: NEW_ID })
		expect(insertOf(fake, 'library')!.parameters).toEqual(
			expect.arrayContaining([NEW_ID, 'Shapes', V, ME, { packId: 'icons', packVersion: 1 }])
		)
		const params = insertOf(fake, 'library_item')!.parameters
		expect(params).toEqual(
			expect.arrayContaining([
				newItemId(0),
				newItemId(1),
				newItemId(2),
				NEW_ID,
				contentKey('item_a'),
				contentKey('item_b'),
				contentKey('item_c'),
				JSON.stringify(url('thumb_a-png')),
				JSON.stringify(pair),
			])
		)
		for (const source of ['item_a', 'item_b', 'item_c']) expect(params).not.toContain(source)
	})

	it('copies only the items I named, and leaves out ones the library no longer has', async () => {
		const fake = mockPool(copying([item('item_a', null), item('item_b', null)], [newItemId(0)]))

		const response = await copyLibrary(
			request(V, { itemIds: { item_a: newItemId(0), item_gone: newItemId(1) } }),
			makeEnv()
		)

		expect(response.status).toBe(200)
		const params = insertOf(fake, 'library_item')!.parameters
		expect(params).toContain(newItemId(0))
		expect(params).not.toContain(newItemId(1))
		expect(params).not.toContain(contentKey('item_b'))
	})

	it('gives the copies increasing createdAt values, in the library order', async () => {
		const fake = mockPool(copying([item('item_a', null), item('item_b', null)]))
		await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a', 'item_b']) }), makeEnv())
		const params = insertOf(fake, 'library_item')!.parameters
		// createdAt, then updatedAt, for each row
		const [firstCreatedAt, , secondCreatedAt] = params.filter(
			(p): p is number => typeof p === 'number'
		)
		expect(secondCreatedAt).toBe(firstCreatedAt + 1)
	})

	it("names the source items' objects for each copy, in one transaction", async () => {
		const objects = [
			{ itemId: 'item_a', bucket: 'rooms', objectName: contentKey('item_a') },
			{ itemId: 'item_a', bucket: 'uploads', objectName: 'thumb_a-png' },
			{ itemId: 'item_a', bucket: 'uploads', objectName: 'owned_a-png' },
		]
		const fake = mockPool(copying([item('item_a', url('thumb_a-png'))], undefined, objects))

		expect(
			(await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), makeEnv())).status
		).toBe(200)

		const sqls = fake.queries.map((q) => q.sql)
		const begin = sqls.indexOf('begin')
		const lock = sqls.findIndex((q) => q.startsWith('select') && q.endsWith('for key share'))
		const objectsInsert = sqls.findIndex((q) => q.startsWith('insert into "library_item_object"'))
		expect(begin).toBeGreaterThan(-1)
		expect(lock).toBeGreaterThan(begin)
		expect(objectsInsert).toBeGreaterThan(lock)
		expect(sqls.indexOf('commit')).toBeGreaterThan(objectsInsert)
		const copy = newItemId(0)
		expect(fake.queries[objectsInsert].parameters).toEqual([
			copy,
			'rooms',
			contentKey('item_a'),
			copy,
			'uploads',
			'thumb_a-png',
			copy,
			'uploads',
			'owned_a-png',
		])
	})

	it('reads and writes nothing in R2', async () => {
		const env = makeEnv()
		const spies = [env.ROOMS, env.UPLOADS].flatMap((bucket) =>
			(['get', 'head', 'put', 'delete'] as const).map((method) => vi.spyOn(bucket, method))
		)
		mockPool(
			copying([item('item_a', url('thumb_a-png'))], undefined, [
				{ itemId: 'item_a', bucket: 'uploads', objectName: 'thumb_a-png' },
			])
		)

		expect((await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)).status).toBe(
			200
		)
		for (const spy of spies) expect(spy).not.toHaveBeenCalled()
	})

	it("names the copy as I asked, trimmed and clamped, keeping its items' names", async () => {
		const fake = mockPool(copying([item('item_a', null)]))
		const long = `${'x'.repeat(120)} (Copy)`
		const response = await copyLibrary(
			request(V, { name: `  ${long}  `, itemIds: itemIdsFor(['item_a']) }),
			makeEnv()
		)
		expect(response.status).toBe(200)
		const params = insertOf(fake, 'library')!.parameters
		expect(params).toContain(long.slice(0, 100))
		expect(params).not.toContain('Shapes')
		expect(insertOf(fake, 'library_item')!.parameters).toContain('Button item_a')
	})

	it('copies a library whose items I named none of as the library row alone', async () => {
		const fake = mockPool(copying([item('item_a', null)], []))
		expect((await copyLibrary(request(V), makeEnv())).status).toBe(200)
		const inserts = fake.queries.filter((q) => q.sql.startsWith('insert'))
		expect(inserts.map((q) => q.sql.split(' (')[0])).toEqual(['insert into "library"'])
	})

	it.each([
		['no library id', { id: undefined }],
		['a library id uniqueId would not make', { id: 'coll_1' }],
		['item ids that are not a map', { itemIds: [newItemId(0)] }],
		['an item id uniqueId would not make', { itemIds: { item_a: 'copy/../1' } }],
		['the same item id twice', { itemIds: { item_a: newItemId(0), item_b: newItemId(0) } }],
		['a name that is blank', { name: '   ' }],
		['a name that is not a string', { name: 7 }],
	])('refuses %s', async (_, body) => {
		const fake = mockPool(copying([item('item_a', null)]))
		expect((await copyLibrary(request(V, body), makeEnv())).status).toBe(400)
		expect(fake.queries).toEqual([])
	})

	it.each([
		['the library id', [[]]],
		['an item id', [[{ id: NEW_ID }], [{ id: newItemId(1) }]]],
	])('answers 409 and rolls back when another request has %s', async (_, insertResults) => {
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			...destination(),
			[item('item_a', null), item('item_b', null)],
			...insertResults,
		])
		const response = await copyLibrary(
			request(V, { itemIds: itemIdsFor(['item_a', 'item_b']) }),
			makeEnv()
		)
		expect(response.status).toBe(409)
		expect(fake.queries.at(-1)!.sql).toBe('rollback')
		expect(insertOf(fake, 'library_item_object')).toBeUndefined()
	})

	it('answers 409 and writes nothing when the destination has the most libraries it can', async () => {
		const env = makeEnv()
		const put = vi.spyOn(env.UPLOADS, 'put')
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			...destination(MAX_NUMBER_OF_LIBRARIES),
			[item('item_a', null)],
		])

		const response = await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)

		expect(response.status).toBe(409)
		expect(await response.json()).toEqual({ error: ZErrorCode.max_libraries_reached })
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
		expect(put).not.toHaveBeenCalled()
	})

	it('answers 409 without reading anything when the copy would have more items than a library can', async () => {
		const ids = Array.from({ length: MAX_NUMBER_OF_LIBRARY_ITEMS + 1 }, (_, i) => `item_${i}`)
		const fake = mockPool(copying([]))

		const response = await copyLibrary(request(V, { itemIds: itemIdsFor(ids) }), makeEnv())

		expect(response.status).toBe(409)
		expect(await response.json()).toEqual({ error: ZErrorCode.max_library_items_reached })
		expect(fake.queries).toEqual([])
	})

	it("answers 404 when I'm not a member of the library's workspace", async () => {
		mockPool([[access(null)]])
		expect((await copyLibrary(request(V), makeEnv())).status).toBe(404)
	})

	it('answers 404 without reading anything when the libraries flag is off for me', async () => {
		vi.mocked(canUseLibraries).mockResolvedValue(false)
		const env = makeEnv()
		expect((await copyLibrary(request(V), env)).status).toBe(404)
		expect(canUseLibraries).toHaveBeenCalledWith(env, ME)
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
	})

	it("answers 403 when I'm not a member of the destination", async () => {
		const fake = mockPool([[access('member')], []])
		expect((await copyLibrary(request(V), makeEnv())).status).toBe(403)
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it('copies into my home workspace, which may have no group_user row', async () => {
		mockPool([[access('member')], [], ...destination(), [], [{ id: NEW_ID }]])
		expect((await copyLibrary(request(ME), makeEnv())).status).toBe(200)
	})
})
