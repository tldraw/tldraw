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

const access = (role: string | null) => ({
	id: LIBRARY_ID,
	name: 'Shapes',
	owningGroupId: W,
	meta: { packId: 'icons', packVersion: 1 },
	role,
})
const item = (id: string, thumbnail: string | { light: string; dark: string } | null) => ({
	id,
	libraryId: LIBRARY_ID,
	name: 'Button',
	thumbnail,
	contentKey: `library-items/content_${id}/content.json`,
	createdBy: 'user_cccc11112222dddd',
	createdAt: 1,
	updatedAt: 1,
})

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

function request(owningGroupId: string) {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/libraries/${LIBRARY_ID}/copy`, {
			method: 'POST',
			body: JSON.stringify({ owningGroupId }),
		}),
		{ params: { libraryId: LIBRARY_ID } }
	) as any
}

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
	vi.mocked(canUseLibraries).mockResolvedValue(true)
})

afterEach(() => vi.clearAllMocks())

describe('copyLibrary', () => {
	it("inserts the rows, each copied item naming its source's content and thumbnail", async () => {
		const env = makeEnv()
		const pair = { light: url('light_b-png'), dark: url('dark_b-png') }
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', url('thumb_a-png')), item('item_b', pair), item('item_c', null)],
		])

		const response = await copyLibrary(request(V), env)

		expect(response.status).toBe(200)
		const { id } = (await response.json()) as { id: string }
		const libraryInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library"'))!
		expect(libraryInsert.parameters).toEqual(
			expect.arrayContaining([id, 'Shapes', V, ME, { packId: 'icons', packVersion: 1 }])
		)
		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		const params = itemInsert.parameters
		for (const source of ['item_a', 'item_b', 'item_c']) {
			expect(params).toContain(`library-items/content_${source}/content.json`)
			expect(params).not.toContain(source)
		}
		expect(params).toContain(JSON.stringify(url('thumb_a-png')))
		expect(params).toContain(JSON.stringify(pair))
	})

	it("names the source items' objects for each copied item, in one transaction", async () => {
		const env = makeEnv()
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', url('thumb_a-png'))],
			[],
			[],
			[
				{
					itemId: 'item_a',
					bucket: 'rooms',
					objectName: 'library-items/content_item_a/content.json',
				},
				{ itemId: 'item_a', bucket: 'uploads', objectName: 'thumb_a-png' },
				{ itemId: 'item_a', bucket: 'uploads', objectName: 'owned_a-png' },
			],
		])

		expect((await copyLibrary(request(V), env)).status).toBe(200)

		const sqls = fake.queries.map((q) => q.sql)
		const begin = sqls.indexOf('begin')
		const lock = sqls.findIndex((q) => q.startsWith('select') && q.endsWith('for key share'))
		const objectsInsert = sqls.findIndex((q) => q.startsWith('insert into "library_item_object"'))
		expect(begin).toBeGreaterThan(-1)
		expect(lock).toBeGreaterThan(begin)
		expect(objectsInsert).toBeGreaterThan(lock)
		expect(sqls.indexOf('commit')).toBeGreaterThan(objectsInsert)

		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		const newItemId = itemInsert.parameters[0]
		expect(fake.queries[objectsInsert].parameters).toEqual([
			newItemId,
			'rooms',
			'library-items/content_item_a/content.json',
			newItemId,
			'uploads',
			'thumb_a-png',
			newItemId,
			'uploads',
			'owned_a-png',
		])
	})

	it('reads and writes nothing in R2', async () => {
		const env = makeEnv()
		const buckets = [env.ROOMS, env.UPLOADS]
		const spies = buckets.flatMap((bucket) =>
			(['get', 'head', 'put', 'delete'] as const).map((method) => vi.spyOn(bucket, method))
		)
		mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', url('thumb_a-png'))],
			[],
			[],
			[{ itemId: 'item_a', bucket: 'uploads', objectName: 'thumb_a-png' }],
		])

		expect((await copyLibrary(request(V), env)).status).toBe(200)
		for (const spy of spies) expect(spy).not.toHaveBeenCalled()
	})

	it('copies an empty library as the library row alone', async () => {
		const fake = mockPool([[access('member')], [{ role: 'member' }], []])
		expect((await copyLibrary(request(V), makeEnv())).status).toBe(200)
		const inserts = fake.queries.filter((q) => q.sql.startsWith('insert'))
		expect(inserts.map((q) => q.sql.split(' (')[0])).toEqual(['insert into "library"'])
	})

	it('inserts nothing when the transaction fails', async () => {
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', url('thumb_a-png'))],
		])
		vi.spyOn(fake.db, 'transaction').mockImplementation(() => {
			throw new Error('insert failed')
		})

		await expect(copyLibrary(request(V), makeEnv())).rejects.toThrow('insert failed')
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it("answers 404 when I'm not a member of the library's workspace", async () => {
		mockPool([[access(null)]])
		const env = makeEnv()
		expect((await copyLibrary(request(V), env)).status).toBe(404)
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
		const env = makeEnv()
		expect((await copyLibrary(request(V), env)).status).toBe(403)
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it('copies into my home workspace, which may have no group_user row', async () => {
		mockPool([[access('member')], [], []])
		const env = makeEnv()
		expect((await copyLibrary(request(ME), env)).status).toBe(200)
	})
})
