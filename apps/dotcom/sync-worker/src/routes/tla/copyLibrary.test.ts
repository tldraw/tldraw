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
const STORED = JSON.stringify({ formatVersion: 1, content: { shapes: [], assets: [] } })
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
const item = (id: string, thumbnail: string | { light: string; dark: string } | null) => ({
	id,
	libraryId: LIBRARY_ID,
	name: `Button ${id}`,
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

// The library and my role in it, my role in the destination, the source's items, no library
// or items with the new ids, then the inserted rows' ids.
function copying(items: ReturnType<typeof item>[], copied = items.map((_, i) => newItemId(i))) {
	return [
		[access('member')],
		[{ role: 'member' }],
		items,
		[],
		...(copied.length > 0 ? [[]] : []),
		[{ id: NEW_ID }],
		copied.map((id) => ({ id })),
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
	fake.queries.find((q) => q.sql.startsWith(`insert into "${table}"`))

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
})

afterEach(() => vi.clearAllMocks())

describe('copyLibrary', () => {
	it("copies the rows under the ids I picked, each item's content, and its thumbnail", async () => {
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		await env.UPLOADS.put('thumb_a-png', new Uint8Array([1]))
		await env.ROOMS.put(getLibraryItemContentKey('item_b'), STORED)
		// item_c's content is missing, so it is left out
		const items = [item('item_a', url('thumb_a-png')), item('item_b', null), item('item_c', null)]
		const fake = mockPool(copying(items, [newItemId(0), newItemId(1)]))

		const response = await copyLibrary(
			request(V, { itemIds: itemIdsFor(['item_a', 'item_b', 'item_c']) }),
			env
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ id: NEW_ID })
		expect(await keysOf(env.ROOMS)).toEqual(
			expect.arrayContaining([
				getLibraryItemContentKey(newItemId(0)),
				getLibraryItemContentKey(newItemId(1)),
			])
		)
		expect(await keysOf(env.ROOMS)).toHaveLength(2 + 2)
		expect(insertOf(fake, 'library')!.parameters).toEqual(
			expect.arrayContaining([NEW_ID, 'Shapes', V, ME, { packId: 'icons', packVersion: 1 }])
		)
		const itemInsert = insertOf(fake, 'library_item')!
		expect(itemInsert.parameters).toEqual(
			expect.arrayContaining([newItemId(0), newItemId(1), NEW_ID])
		)
		expect(itemInsert.parameters).not.toContain(newItemId(2))
		const uploads = await keysOf(env.UPLOADS)
		expect(uploads).toHaveLength(2)
		const copied = uploads.find((name) => name !== 'thumb_a-png')!
		expect(copied).toMatch(/-png$/)
		expect(itemInsert.parameters).toContain(JSON.stringify(url(copied)))
	})

	it('copies only the items I named, and leaves out ones the library no longer has', async () => {
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		await env.ROOMS.put(getLibraryItemContentKey('item_b'), STORED)
		const fake = mockPool(copying([item('item_a', null), item('item_b', null)], [newItemId(0)]))

		const response = await copyLibrary(
			request(V, { itemIds: { item_a: newItemId(0), item_gone: newItemId(1) } }),
			env
		)

		expect(response.status).toBe(200)
		const itemInsert = insertOf(fake, 'library_item')!
		expect(itemInsert.parameters).toContain(newItemId(0))
		expect(itemInsert.parameters).not.toContain(newItemId(1))
		expect(itemInsert.parameters).not.toContain('Button item_b')
	})

	it('copies items a few at a time and keeps their order', async () => {
		const env = makeEnv()
		const ids = Array.from({ length: 10 }, (_, i) => `item_${i}`)
		for (const id of ids) await env.ROOMS.put(getLibraryItemContentKey(id), STORED)
		let running = 0
		let mostAtOnce = 0
		const get = env.ROOMS.get.bind(env.ROOMS)
		vi.spyOn(env.ROOMS, 'get').mockImplementation(async (key: string) => {
			running++
			mostAtOnce = Math.max(mostAtOnce, running)
			// later items finish first
			const index = ids.findIndex((id) => key === getLibraryItemContentKey(id))
			await new Promise((resolve) => setTimeout(resolve, (ids.length - index) * 2))
			running--
			return get(key)
		})
		const fake = mockPool(copying(ids.map((id) => item(id, null))))

		expect((await copyLibrary(request(V, { itemIds: itemIdsFor(ids) }), env)).status).toBe(200)

		expect(mostAtOnce).toBeGreaterThan(1)
		expect(mostAtOnce).toBeLessThanOrEqual(4)
		const parameters = insertOf(fake, 'library_item')!.parameters
		const insertedIds = parameters.filter(
			(p): p is string => typeof p === 'string' && p.startsWith('copy_')
		)
		expect(insertedIds).toEqual(ids.map((_, i) => newItemId(i)))
		const createdAts = parameters.filter((p): p is number => typeof p === 'number')
		const [first] = createdAts
		expect(createdAts.filter((_, i) => i % 2 === 0)).toEqual(ids.map((_, i) => first + i))
	})

	it('copies both of a light and dark pair, and a light one alone without its dark one', async () => {
		const env = makeEnv()
		const ids = ['item_a', 'item_b', 'item_c']
		for (const id of ids) await env.ROOMS.put(getLibraryItemContentKey(id), STORED)
		await env.UPLOADS.put('light_a-png', new Uint8Array([1]))
		await env.UPLOADS.put('dark_a-png', new Uint8Array([2]))
		await env.UPLOADS.put('light_b-png', new Uint8Array([1]))
		await env.UPLOADS.put('dark_c-png', new Uint8Array([2]))
		const fake = mockPool(
			copying([
				item('item_a', { light: url('light_a-png'), dark: url('dark_a-png') }),
				// item_b's dark image is missing, so its light one is kept alone
				item('item_b', { light: url('light_b-png'), dark: url('dark_b-png') }),
				// item_c's light image is missing, so its dark one is left behind too
				item('item_c', { light: url('light_c-png'), dark: url('dark_c-png') }),
			])
		)

		expect((await copyLibrary(request(V, { itemIds: itemIdsFor(ids) }), env)).status).toBe(200)
		const itemInsert = insertOf(fake, 'library_item')!
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
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		await env.UPLOADS.put('thumb_a-png', new Uint8Array([1]))
		const fake = mockPool(copying([item('item_a', url('thumb_a-png'))]))
		vi.spyOn(fake.db, 'transaction').mockImplementation(() => {
			throw new Error('insert failed')
		})

		await expect(copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)).rejects.toThrow(
			'insert failed'
		)
		expect(await keysOf(env.ROOMS)).toEqual([getLibraryItemContentKey('item_a')])
		expect(await keysOf(env.UPLOADS)).toEqual(['thumb_a-png'])
	})

	it('removes every copy, once those under way finish, when copying an item fails', async () => {
		const env = makeEnv()
		const ids = Array.from({ length: 8 }, (_, i) => `item_${i}`)
		for (const id of ids) {
			await env.ROOMS.put(getLibraryItemContentKey(id), STORED)
			await env.UPLOADS.put(`thumb_${id}-png`, new Uint8Array([1]))
		}
		const get = env.ROOMS.get.bind(env.ROOMS)
		vi.spyOn(env.ROOMS, 'get').mockImplementation(async (key: string) => {
			if (key === getLibraryItemContentKey('item_2')) throw new Error('R2 is down')
			await new Promise((resolve) => setTimeout(resolve, 10))
			return get(key)
		})
		const fake = mockPool(copying(ids.map((id) => item(id, url(`thumb_${id}-png`)))))

		await expect(copyLibrary(request(V, { itemIds: itemIdsFor(ids) }), env)).rejects.toThrow(
			'R2 is down'
		)
		await new Promise((resolve) => setTimeout(resolve, 50))
		expect((await keysOf(env.ROOMS)).sort()).toEqual(
			ids.map((id) => getLibraryItemContentKey(id)).sort()
		)
		expect((await keysOf(env.UPLOADS)).sort()).toEqual(ids.map((id) => `thumb_${id}-png`).sort())
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it.each([
		['no library id', { id: undefined }],
		['a library id uniqueId would not make', { id: 'coll_1' }],
		['item ids that are not a map', { itemIds: [newItemId(0)] }],
		['an item id uniqueId would not make', { itemIds: { item_a: 'copy/../1' } }],
		['the same item id twice', { itemIds: { item_a: newItemId(0), item_b: newItemId(0) } }],
	])('refuses %s', async (_, body) => {
		const fake = mockPool(copying([item('item_a', null)]))
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		expect((await copyLibrary(request(V, body), env)).status).toBe(400)
		expect(fake.queries).toEqual([])
		expect(await keysOf(env.ROOMS)).toEqual([getLibraryItemContentKey('item_a')])
	})

	it.each([
		['a library id that names an existing library', [[{ id: NEW_ID }]]],
		['an item id that names an existing item', [[], [{ id: newItemId(0) }]]],
	])('refuses %s, before storing anything', async (_, taken) => {
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', null)],
			...taken,
		])
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		const response = await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)
		expect(response.status).toBe(409)
		expect(await keysOf(env.ROOMS)).toEqual([getLibraryItemContentKey('item_a')])
		expect(await keysOf(env.UPLOADS)).toEqual([])
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it("refuses the id of a deleted item whose content hasn't been removed yet", async () => {
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			[item('item_a', null)],
			[],
			[],
		])
		const env = makeEnv()
		await env.ROOMS.put(getLibraryItemContentKey('item_a'), STORED)
		await env.ROOMS.put(getLibraryItemContentKey(newItemId(0)), 'theirs')
		const response = await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)
		expect(response.status).toBe(409)
		expect(await (await env.ROOMS.get(getLibraryItemContentKey(newItemId(0))))!.text()).toBe(
			'theirs'
		)
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it.each([
		['the library id', [[]], []],
		// the content stored under the item id the other request took is that request's
		['an item id', [[{ id: NEW_ID }], [{ id: newItemId(0) }]], [newItemId(1)]],
	])(
		'answers 409 when another request inserts %s first, removing what it stored',
		async (_, inserts, theirs) => {
			const env = makeEnv()
			const ids = ['item_a', 'item_b']
			for (const id of ids) await env.ROOMS.put(getLibraryItemContentKey(id), STORED)
			await env.UPLOADS.put('thumb_a-png', new Uint8Array([1]))
			const items = [item('item_a', url('thumb_a-png')), item('item_b', null)]
			const fake = mockPool([[access('member')], [{ role: 'member' }], items, [], [], ...inserts])

			const response = await copyLibrary(request(V, { itemIds: itemIdsFor(ids) }), env)

			expect(response.status).toBe(409)
			expect(fake.queries.at(-1)!.sql).toBe('rollback')
			expect(fake.queries.some((q) => q.sql.includes('library_item_asset'))).toBe(false)
			expect(await keysOf(env.UPLOADS)).toEqual(['thumb_a-png'])
			expect((await keysOf(env.ROOMS)).sort()).toEqual(
				[...ids, ...theirs].map((id) => getLibraryItemContentKey(id)).sort()
			)
		}
	)

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
		mockPool([[access('member')], [], [], [], [{ id: NEW_ID }]])
		const env = makeEnv()
		expect((await copyLibrary(request(ME), env)).status).toBe(200)
	})
})

describe('copyLibrary, with uploads the items own', () => {
	it("gives each copied item its own copies of the source item's uploads", async () => {
		const env = makeEnv()
		const asset = {
			id: 'asset:photo',
			typeName: 'asset',
			type: 'image',
			props: { src: 'https://content.test/owned1-png' },
			meta: {},
		}
		await env.UPLOADS.put('owned1-png', new Uint8Array([7]))
		await env.ROOMS.put(
			getLibraryItemContentKey('item_a'),
			JSON.stringify({ formatVersion: 1, content: { shapes: [], assets: [asset] } })
		)
		const fake = mockPool(copying([item('item_a', null)]))

		expect((await copyLibrary(request(V, { itemIds: itemIdsFor(['item_a']) }), env)).status).toBe(
			200
		)

		const uploads = await keysOf(env.UPLOADS)
		expect(uploads).toHaveLength(2)
		const copyName = uploads.find((key: string) => key !== 'owned1-png')!
		expect(copyName).toMatch(/-png$/)
		expect(insertOf(fake, 'library_item_asset')!.parameters).toEqual([newItemId(0), copyName])
		const copied = await (await env.ROOMS.get(getLibraryItemContentKey(newItemId(0))))!.json<any>()
		expect(copied.content.assets[0].props.src).toBe(`https://content.test/${copyName}`)
	})
})
