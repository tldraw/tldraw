import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from '../../collectionStorage'
import { createFakeKysely } from '../../test/fakeKysely'
import { createFakeR2 } from '../../test/fakeR2'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { addCollectionItem, getCollectionItemContent, getCollectionItemThumbnail } =
	await import('./collectionItems')

const ME = 'user_aaaa11112222bbbb'
const W = 'group_www11112222www'
const COLLECTION_ID = 'coll_aaaa11112222bbbb'
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

function addRequest(fields: Record<string, string | Blob>) {
	const form = new FormData()
	for (const [key, value] of Object.entries(fields)) form.set(key, value)
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/collections/${COLLECTION_ID}/items`, {
			method: 'POST',
			body: form,
		}),
		{ params: { collectionId: COLLECTION_ID } }
	) as any
}

function getRequest(part: 'content' | 'thumbnail') {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/collection-items/${ITEM_ID}/${part}`),
		{ params: { itemId: ITEM_ID } }
	) as any
}

const collectionAccess = (owningGroupId: string, role: string | null) => ({
	id: COLLECTION_ID,
	name: 'Shapes',
	owningGroupId,
	meta: {},
	role,
})

const itemAccess = (role: string | null, thumbnailType: string | null = 'image/png') => ({
	id: ITEM_ID,
	collectionId: COLLECTION_ID,
	name: null,
	thumbnailType,
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

describe('addCollectionItem', () => {
	it("stores a member's item and inserts its row under an id the worker picks", async () => {
		const fake = mockPool([[collectionAccess(W, 'member')]])
		const env = makeEnv()
		const response = await addCollectionItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
				name: '  Button  ',
			}),
			env
		)

		expect(response.status).toBe(200)
		const { id } = (await response.json()) as { id: string }
		expect(id).not.toBe(ITEM_ID)
		expect(await (await env.ROOMS.get(getCollectionItemContentKey(id)))!.json()).toEqual(CONTENT)
		expect(await env.ROOMS.get(getCollectionItemThumbnailKey(id))).not.toBeNull()
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "collection_item"'))!
		expect(insert.parameters).toEqual(
			expect.arrayContaining([id, COLLECTION_ID, 'Button', 'image/webp', ME])
		)
	})

	it('adds to a collection in my home workspace, which may have no group_user row', async () => {
		mockPool([[collectionAccess(ME, null)]])
		const response = await addCollectionItem(
			addRequest({ content: JSON.stringify(CONTENT) }),
			makeEnv()
		)
		expect(response.status).toBe(200)
	})

	it.each([
		['a workspace I am not in', [[collectionAccess(W, null)]]],
		["another user's home workspace", [[collectionAccess('user_cccc11112222dddd', null)]]],
		['a collection that does not exist', [[]]],
	])('answers 404 for %s and stores nothing', async (_, resultSets) => {
		const fake = mockPool(resultSets)
		const env = makeEnv()
		const response = await addCollectionItem(addRequest({ content: JSON.stringify(CONTENT) }), env)
		expect(response.status).toBe(404)
		expect((await env.ROOMS.list()).objects).toEqual([])
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
	])('refuses %s', async (_, fields) => {
		mockPool([[collectionAccess(W, 'member')]])
		const response = await addCollectionItem(addRequest(fields), makeEnv())
		expect(response.status).toBe(400)
	})
})

describe('addCollectionItem, with uploaded images in the content', () => {
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
		const fake = mockPool([[collectionAccess(W, 'member')]])
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1, 2, 3]))

		const response = await addCollectionItem(
			addRequest({ content: withAssets([image('https://content.test/abc123-png', 'file-a')]) }),
			env
		)

		const { id } = (await response.json()) as { id: string }
		const uploads = (await env.UPLOADS.list()).objects.map((o: { key: string }) => o.key)
		const copyName = uploads.find((key: string) => key !== 'abc123-png')!
		expect(copyName).toMatch(/-png$/)
		const stored = await (await env.ROOMS.get(getCollectionItemContentKey(id)))!.json<any>()
		expect(stored.content.assets[0].props.src).toBe(`https://content.test/${copyName}`)
		// so a board it's placed on copies the image for itself
		expect(stored.content.assets[0].meta).toEqual({})
		const ownership = fake.queries.find((q) =>
			q.sql.startsWith('insert into "collection_item_asset"')
		)!
		expect(ownership.parameters).toEqual([id, copyName])
	})

	it('leaves an asset whose upload is missing, or that is not an upload, as it was', async () => {
		const fake = mockPool([[collectionAccess(W, 'member')]])
		const env = makeEnv()
		const assets = [image('https://content.test/gone-png'), image('data:image/png;base64,AAAA')]
		const response = await addCollectionItem(addRequest({ content: withAssets(assets) }), env)

		const { id } = (await response.json()) as { id: string }
		const stored = await (await env.ROOMS.get(getCollectionItemContentKey(id)))!.json<any>()
		expect(stored.content.assets).toEqual(assets)
		expect(fake.queries.some((q) => q.sql.includes('collection_item_asset'))).toBe(false)
	})
})

describe('getCollectionItemContent / getCollectionItemThumbnail', () => {
	async function storedEnv() {
		const env = makeEnv()
		await env.ROOMS.put(getCollectionItemContentKey(ITEM_ID), JSON.stringify(CONTENT))
		await env.ROOMS.put(getCollectionItemThumbnailKey(ITEM_ID), new Uint8Array([1, 2, 3]))
		return env
	}

	it("serves a member the item's content and thumbnail", async () => {
		const env = await storedEnv()
		mockPool([[itemAccess('member')]])
		const content = await getCollectionItemContent(getRequest('content'), env)
		expect(content.status).toBe(200)
		expect(await content.json()).toEqual(CONTENT)

		mockPool([[itemAccess('member', 'image/png')]])
		const thumbnail = await getCollectionItemThumbnail(getRequest('thumbnail'), env)
		expect(thumbnail.status).toBe(200)
		expect(thumbnail.headers.get('content-type')).toBe('image/png')
	})

	it('answers 404 to someone who is not a member of the workspace', async () => {
		const env = await storedEnv()
		mockPool([[itemAccess(null)]])
		expect((await getCollectionItemContent(getRequest('content'), env)).status).toBe(404)
		mockPool([[itemAccess(null)]])
		expect((await getCollectionItemThumbnail(getRequest('thumbnail'), env)).status).toBe(404)
	})

	it('answers 404 for the thumbnail of an item that has none', async () => {
		mockPool([[itemAccess('member', null)]])
		const response = await getCollectionItemThumbnail(getRequest('thumbnail'), await storedEnv())
		expect(response.status).toBe(404)
	})
})
