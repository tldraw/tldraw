import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLibraryItemContentKey } from '../../libraryStorage'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
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

const keysOf = async (bucket: R2Bucket) =>
	(await bucket.list()).objects.map((o: { key: string }) => o.key)

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
})

afterEach(() => vi.clearAllMocks())

describe('copyLibrary', () => {
	it("copies the rows, each item's content, and its thumbnail to new public uploads", async () => {
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), '{"formatVersion":1}')
		await env.UPLOADS.put('thumb_a-png', new Uint8Array([1]))
		await env.ROOMS.put(getLibraryItemContentKey('item_b'), '{"formatVersion":1}')
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			// item_c's content is missing, so it is left out
			[item('item_a', url('thumb_a-png')), item('item_b', null), item('item_c', null)],
		])

		const response = await copyLibrary(request(V), env)

		expect(response.status).toBe(200)
		const { id } = (await response.json()) as { id: string }
		const keys = await keysOf(env.ROOMS)
		expect(keys).toHaveLength(2 + 2)
		const libraryInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library"'))!
		expect(libraryInsert.parameters).toEqual(
			expect.arrayContaining([id, 'Shapes', V, ME, { packId: 'icons', packVersion: 1 }])
		)
		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		const newItemIds = itemInsert.parameters.filter(
			(p) => typeof p === 'string' && keys.includes(getLibraryItemContentKey(p))
		)
		expect(newItemIds).toHaveLength(2)
		expect(newItemIds).not.toContain('item_a')
		const uploads = await keysOf(env.UPLOADS)
		expect(uploads).toHaveLength(2)
		const copied = uploads.find((name) => name !== 'thumb_a-png')!
		expect(copied).toMatch(/-png$/)
		expect(itemInsert.parameters).toContain(JSON.stringify(url(copied)))
	})

	it('copies both of a light and dark pair, and a light one alone without its dark one', async () => {
		const env = makeEnv()
		for (const id of ['item_a', 'item_b', 'item_c']) {
			await env.ROOMS.put(getLibraryItemContentKey(id), '{"formatVersion":1}')
		}
		await env.UPLOADS.put('light_a-png', new Uint8Array([1]))
		await env.UPLOADS.put('dark_a-png', new Uint8Array([2]))
		await env.UPLOADS.put('light_b-png', new Uint8Array([1]))
		await env.UPLOADS.put('dark_c-png', new Uint8Array([2]))
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[
				item('item_a', { light: url('light_a-png'), dark: url('dark_a-png') }),
				// item_b's dark image is missing, so its light one is kept alone
				item('item_b', { light: url('light_b-png'), dark: url('dark_b-png') }),
				// item_c's light image is missing, so its dark one is left behind too
				item('item_c', { light: url('light_c-png'), dark: url('dark_c-png') }),
			],
		])

		expect((await copyLibrary(request(V), env)).status).toBe(200)
		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		expect(await keysOf(env.UPLOADS)).toHaveLength(4 + 3)
		const [pair, single, ...rest] = itemInsert.parameters
			.filter((p): p is string => typeof p === 'string' && p.includes('content.test'))
			.map((p) => JSON.parse(p))
		expect(rest).toEqual([])
		expect(pair).toEqual({ light: expect.any(String), dark: expect.any(String) })
		expect(pair.light).not.toBe(url('light_a-png'))
		expect(single).toEqual(expect.stringMatching(/^https:\/\/content\.test\/.+-png$/))
	})

	it('removes the copies it made when the rows cannot be inserted', async () => {
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), '{"formatVersion":1}')
		await env.UPLOADS.put('thumb_a-png', new Uint8Array([1]))
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', url('thumb_a-png'))],
		])
		vi.spyOn(fake.db, 'transaction').mockImplementation(() => {
			throw new Error('insert failed')
		})

		await expect(copyLibrary(request(V), env)).rejects.toThrow('insert failed')
		expect(await keysOf(env.ROOMS)).toEqual([getLibraryItemContentKey('item_a')])
		expect(await keysOf(env.UPLOADS)).toEqual(['thumb_a-png'])
	})

	it("answers 404 when I'm not a member of the library's workspace", async () => {
		mockPool([[access(null)]])
		const env = makeEnv()
		expect((await copyLibrary(request(V), env)).status).toBe(404)
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
