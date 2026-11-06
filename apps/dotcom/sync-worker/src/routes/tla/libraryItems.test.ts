import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLibraryItemContentKey } from '../../libraryStorage'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { addLibraryItem, getLibraryItemContent } = await import('./libraryItems')

const ME = 'user_aaaa11112222bbbb'
const W = 'group_www11112222www'
const LIBRARY_ID = 'coll_aaaa11112222bbbb'
const ITEM_ID = 'item_1111222233334444'
const CONTENT = { formatVersion: 1, content: { shapes: [], rootShapeIds: [], schema: {} } }

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

function addRequest(fields: Record<string, string | Blob>) {
	const form = new FormData()
	for (const [key, value] of Object.entries(fields)) form.set(key, value)
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/libraries/${LIBRARY_ID}/items`, {
			method: 'POST',
			body: form,
		}),
		{ params: { libraryId: LIBRARY_ID } }
	) as any
}

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

describe('addLibraryItem', () => {
	it("stores a member's item and inserts its row under an id the worker picks", async () => {
		const fake = mockPool([[libraryAccess(W, 'member')]])
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
				name: '  Button  ',
			}),
			env
		)

		expect(response.status).toBe(200)
		const { id, thumbnail } = (await response.json()) as { id: string; thumbnail: string }
		expect(id).not.toBe(ITEM_ID)
		expect(await (await env.ROOMS.get(getLibraryItemContentKey(id)))!.json()).toEqual(CONTENT)
		const [objectName] = await uploadNames(env)
		expect(objectName).toMatch(/-webp$/)
		expect(objectName).not.toContain(id)
		expect(thumbnail).toBe(`https://content.test/${objectName}`)
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		expect(insert.parameters).toEqual(
			expect.arrayContaining([id, LIBRARY_ID, 'Button', JSON.stringify(thumbnail), ME])
		)
	})

	it('stores a light and a dark thumbnail', async () => {
		const fake = mockPool([[libraryAccess(W, 'member')]])
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
				darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/webp' }),
			}),
			env
		)

		expect(response.status).toBe(200)
		const { thumbnail } = (await response.json()) as {
			thumbnail: { light: string; dark: string }
		}
		const names = await uploadNames(env)
		expect(names).toHaveLength(2)
		expect(thumbnail.light).toMatch(/^https:\/\/content\.test\/.+-png$/)
		expect(thumbnail.dark).toMatch(/^https:\/\/content\.test\/.+-webp$/)
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item"'))!
		expect(insert.parameters).toContain(JSON.stringify(thumbnail))
	})

	it("removes what it stored when the row can't be inserted", async () => {
		const fake = mockPool([[libraryAccess(W, 'member')]])
		vi.spyOn(fake.db, 'insertInto').mockImplementation(() => {
			throw new Error('the library was deleted')
		})
		const env = makeEnv()
		await expect(
			addLibraryItem(
				addRequest({
					content: JSON.stringify(CONTENT),
					thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
				}),
				env
			)
		).rejects.toThrow('the library was deleted')
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
	})

	it('adds to a library in my home workspace, which may have no group_user row', async () => {
		mockPool([[libraryAccess(ME, null)]])
		const response = await addLibraryItem(
			addRequest({ content: JSON.stringify(CONTENT) }),
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
		const response = await addLibraryItem(addRequest({ content: JSON.stringify(CONTENT) }), env)
		expect(response.status).toBe(404)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it.each([
		['content that is not JSON', { content: '{' }],
		['JSON that is not item content', { content: JSON.stringify({ shapes: [] }) }],
		[
			'an SVG thumbnail',
			{
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob(['<svg/>'], { type: 'image/svg+xml' }),
			},
		],
		[
			'a dark thumbnail without a light one',
			{
				content: JSON.stringify(CONTENT),
				darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/png' }),
			},
		],
	])('refuses %s', async (_, fields) => {
		mockPool([[libraryAccess(W, 'member')]])
		const response = await addLibraryItem(addRequest(fields), makeEnv())
		expect(response.status).toBe(400)
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
