import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from '../../collectionStorage'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { copyCollection } = await import('./copyCollection')

const ME = 'user_aaaa11112222bbbb'
const STORED = JSON.stringify({ formatVersion: 1, content: { shapes: [], assets: [] } })
const W = 'group_www11112222www'
const V = 'group_vvv11112222vvv'
const COLLECTION_ID = 'coll_aaaa11112222bbbb'

const access = (role: string | null) => ({
	id: COLLECTION_ID,
	name: 'Shapes',
	owningGroupId: W,
	meta: { packId: 'icons', packVersion: 1 },
	role,
})
const item = (id: string, thumbnailType: string | null) => ({
	id,
	collectionId: COLLECTION_ID,
	name: 'Button',
	thumbnailType,
	createdBy: 'user_cccc11112222dddd',
	createdAt: 1,
	updatedAt: 1,
})

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
		new Request(`https://sync.tldraw.xyz/app/collections/${COLLECTION_ID}/copy`, {
			method: 'POST',
			body: JSON.stringify({ owningGroupId }),
		}),
		{ params: { collectionId: COLLECTION_ID } }
	) as any
}

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
})

afterEach(() => vi.clearAllMocks())

describe('copyCollection', () => {
	it("copies the rows and each item's stored objects to new ids", async () => {
		const env = makeEnv()
		await env.ROOMS.put(getCollectionItemContentKey('item_a'), STORED)
		await env.ROOMS.put(getCollectionItemThumbnailKey('item_a'), new Uint8Array([1]))
		await env.ROOMS.put(getCollectionItemContentKey('item_b'), STORED)
		const fake = mockPool([
			[access('member')],
			[{ role: 'member' }],
			// item_c's content is missing, so it is left out
			[item('item_a', 'image/png'), item('item_b', null), item('item_c', null)],
		])

		const response = await copyCollection(request(V), env)

		expect(response.status).toBe(200)
		const { id } = (await response.json()) as { id: string }
		const keys = (await env.ROOMS.list()).objects.map((o: { key: string }) => o.key)
		expect(keys).toHaveLength(3 + 3)
		const collectionInsert = fake.queries.find((q) => q.sql.startsWith('insert into "collection"'))!
		expect(collectionInsert.parameters).toEqual(
			expect.arrayContaining([id, 'Shapes', V, ME, { packId: 'icons', packVersion: 1 }])
		)
		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "collection_item"'))!
		const newItemIds = itemInsert.parameters.filter(
			(p) => typeof p === 'string' && keys.includes(getCollectionItemContentKey(p))
		)
		expect(newItemIds).toHaveLength(2)
		expect(newItemIds).not.toContain('item_a')
		expect(keys).toContain(getCollectionItemThumbnailKey(newItemIds[0] as string))
	})

	it("answers 404 when I'm not a member of the collection's workspace", async () => {
		mockPool([[access(null)]])
		const env = makeEnv()
		expect((await copyCollection(request(V), env)).status).toBe(404)
	})

	it("answers 403 when I'm not a member of the destination", async () => {
		const fake = mockPool([[access('member')], []])
		const env = makeEnv()
		expect((await copyCollection(request(V), env)).status).toBe(403)
		expect(fake.queries.some((q) => q.sql.startsWith('insert'))).toBe(false)
	})

	it('copies into my home workspace, which may have no group_user row', async () => {
		mockPool([[access('member')], [], []])
		const env = makeEnv()
		expect((await copyCollection(request(ME), env)).status).toBe(200)
	})
})

describe('copyCollection, with uploads the items own', () => {
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
			getCollectionItemContentKey('item_a'),
			JSON.stringify({ formatVersion: 1, content: { shapes: [], assets: [asset] } })
		)
		const fake = mockPool([[access('member')], [{ role: 'member' }], [item('item_a', null)]])

		expect((await copyCollection(request(V), env)).status).toBe(200)

		const uploads = (await env.UPLOADS.list()).objects.map((o: { key: string }) => o.key)
		expect(uploads).toHaveLength(2)
		const copyName = uploads.find((key: string) => key !== 'owned1-png')!
		expect(copyName).toMatch(/-png$/)
		const ownership = fake.queries.find((q) =>
			q.sql.startsWith('insert into "collection_item_asset"')
		)!
		expect(ownership.parameters).toContain(copyName)
		const itemInsert = fake.queries.find((q) => q.sql.startsWith('insert into "collection_item"'))!
		const newItemId = itemInsert.parameters[0] as string
		const copied = await (await env.ROOMS.get(getCollectionItemContentKey(newItemId)))!.json<any>()
		expect(copied.content.assets[0].props.src).toBe(`https://content.test/${copyName}`)
	})
})
