import { MAX_NUMBER_OF_LIBRARY_ITEMS, ZErrorCode } from '@tldraw/dotcom-shared'
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
const { addLibraryItem, getLibraryItemContent } = await import('./libraryItems')
const { processLibraryItemObjectEffect } = await import('../../libraryEffects')

const ME = 'user_aaaa11112222bbbb'
const W = 'group_www11112222www'
const LIBRARY_ID = 'coll_aaaa11112222bbbb'
const ITEM_ID = 'item_1111222233334444'
const CONTENT = { formatVersion: 1, content: { shapes: [], rootShapeIds: [], schema: {} } }
const CONTENT_KEY = 'library-items/content_1111222233334444/content.json'
const png = () => new Blob([new Uint8Array([1])], { type: 'image/png' })

// The library and the user's role, its item count, no item with the id, the queued deletes, the
// library's lock and its count again, then the inserted row's id.
const adding = (access: unknown) => [[access], [], [], [], [], [], [{ id: ITEM_ID }]]

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

type FakeKysely = ReturnType<typeof mockPool>
interface QueuedObject {
	bucket: 'rooms' | 'uploads'
	objectName: string
}

// The objects queued for deletion, from the effect_outbox insert.
function queuedObjects(fake: FakeKysely): QueuedObject[] {
	const insert = fake.queries.find((q) => q.sql.startsWith('INSERT INTO effect_outbox'))
	const parameters = (insert?.parameters ?? []) as string[]
	return parameters.filter((_, i) => i % 2 === 1).map((payload) => JSON.parse(payload))
}

// The objects the library_item_object insert names.
function namedObjects(fake: FakeKysely): QueuedObject[] {
	const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item_object"'))
	const parameters = (insert?.parameters ?? []) as string[]
	return Array.from({ length: parameters.length / 3 }, (_, i) => ({
		bucket: parameters[i * 3 + 1] as QueuedObject['bucket'],
		objectName: parameters[i * 3 + 2],
	}))
}

// Records each object put to either bucket from here on.
function recordPuts(env: Environment): QueuedObject[] {
	const written: QueuedObject[] = []
	for (const [bucket, r2] of [
		['rooms', env.ROOMS],
		['uploads', env.UPLOADS],
	] as const) {
		const put = r2.put.bind(r2)
		r2.put = (async (...args: Parameters<R2Bucket['put']>) => {
			written.push({ bucket, objectName: args[0] })
			return put(...args)
		}) as R2Bucket['put']
	}
	return written
}

const objectKey = (object: QueuedObject) => `${object.bucket}/${object.objectName}`
const byKey = (objects: QueuedObject[]) => objects.map(objectKey).sort()

// Drains the queued deletes as the effect processor would once their grace period is over, with
// the objects in `named` still named by rows.
async function drainQueued(env: Environment, queued: QueuedObject[], named: QueuedObject[]) {
	const key = (object: QueuedObject) => `${object.bucket}/${object.objectName}`
	const used = new Set(named.map(key))
	for (const object of queued) {
		await processLibraryItemObjectEffect(
			{
				isObjectUsed: async (o) => used.has(key(o)),
				deleteObject: async (o) => {
					await (o.bucket === 'rooms' ? env.ROOMS : env.UPLOADS).delete(o.objectName)
				},
			},
			{ command: 'delete', payload: object } as any
		)
	}
}

// The key of the one item content stored, and the content.
async function storedContent(env: Environment) {
	const [{ key }] = (await env.ROOMS.list()).objects
	return { key, content: await (await env.ROOMS.get(key))!.json<any>() }
}

function addRequest(fields: Record<string, string | Blob | undefined>) {
	const form = new FormData()
	for (const [key, value] of Object.entries({ id: ITEM_ID, ...fields })) {
		if (value !== undefined) form.set(key, value)
	}
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
	contentKey: CONTENT_KEY,
	createdBy: ME,
	createdAt: 1,
	updatedAt: 1,
	owningGroupId: W,
	role,
})

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
	vi.mocked(canUseLibraries).mockResolvedValue(true)
})

afterEach(() => vi.clearAllMocks())

describe('addLibraryItem', () => {
	it("stores a member's item and inserts its row under an id the worker picks", async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
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
		expect(id).toBe(ITEM_ID)
		const stored = await storedContent(env)
		expect(stored.content).toEqual(CONTENT)
		expect(stored.key).not.toContain(id)
		const [objectName] = await uploadNames(env)
		expect(objectName).toMatch(/-webp$/)
		expect(objectName).not.toContain(id)
		expect(thumbnail).toBe(`https://content.test/${objectName}`)
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item" '))!
		expect(insert.parameters).toEqual(
			expect.arrayContaining([id, LIBRARY_ID, 'Button', JSON.stringify(thumbnail), stored.key, ME])
		)
		const objects = fake.queries.find((q) => q.sql.startsWith('insert into "library_item_object"'))!
		expect(objects.parameters).toEqual([id, 'rooms', stored.key, id, 'uploads', objectName])
	})

	it('stores a light and a dark thumbnail', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
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
		const insert = fake.queries.find((q) => q.sql.startsWith('insert into "library_item" '))!
		expect(insert.parameters).toContain(JSON.stringify(thumbnail))
		const objects = fake.queries.find((q) => q.sql.startsWith('insert into "library_item_object"'))!
		expect(objects.parameters).toEqual(expect.arrayContaining(names))
	})

	it('stores an SVG thumbnail as an SVG upload', async () => {
		mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob(['<svg/>'], { type: 'image/svg+xml' }),
			}),
			env
		)

		expect(response.status).toBe(200)
		const [objectName] = await uploadNames(env)
		expect(objectName).toMatch(/-svg$/)
	})

	it('queues every object it stores for deletion before storing any', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1, 2, 3]))
		const queuedAtEachPut: number[] = []
		for (const bucket of [env.ROOMS, env.UPLOADS]) {
			const put = bucket.put.bind(bucket)
			bucket.put = (async (...args: Parameters<R2Bucket['put']>) => {
				queuedAtEachPut.push(queuedObjects(fake).length)
				return put(...args)
			}) as R2Bucket['put']
		}
		const image = {
			id: 'asset:photo',
			typeName: 'asset',
			type: 'image',
			props: { src: 'https://content.test/abc123-png', w: 10, h: 10 },
			meta: {},
		}
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify({ ...CONTENT, content: { ...CONTENT.content, assets: [image] } }),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
				darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/png' }),
			}),
			env
		)

		expect(response.status).toBe(200)
		expect(queuedAtEachPut).toEqual([4, 4, 4, 4])
		expect(queuedObjects(fake)).toEqual(expect.arrayContaining(namedObjects(fake)))
		expect(namedObjects(fake)).toHaveLength(4)
	})

	it('leaves nothing behind once its queued deletes drain, when the row is never inserted', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		vi.spyOn(fake.db, 'transaction').mockImplementation(() => {
			throw new Error('the worker was stopped')
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
		).rejects.toThrow('the worker was stopped')
		// what it stored stays until the processor drains the queued deletes
		expect((await env.ROOMS.list()).objects).toHaveLength(1)
		expect(await uploadNames(env)).toHaveLength(1)

		await drainQueued(env, queuedObjects(fake), [])
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
	})

	it('keeps what an added item names when its queued deletes drain', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
			}),
			env
		)
		expect(response.status).toBe(200)

		await drainQueued(env, queuedObjects(fake), namedObjects(fake))
		expect((await env.ROOMS.list()).objects).toHaveLength(1)
		expect(await uploadNames(env)).toHaveLength(1)
	})

	it('answers 409 without storing or queueing anything when the library is full', async () => {
		const fake = mockPool([
			[libraryAccess(W, 'member')],
			[{ count: String(MAX_NUMBER_OF_LIBRARY_ITEMS) }],
		])
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
			}),
			env
		)

		expect(response.status).toBe(409)
		expect(await response.json()).toEqual({ error: ZErrorCode.max_library_items_reached })
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => /^insert/i.test(q.sql))).toBe(false)
	})

	it('inserts no row, and leaves nothing once drained, when another add fills the library first', async () => {
		const fake = mockPool([
			[libraryAccess(W, 'member')],
			[{ count: String(MAX_NUMBER_OF_LIBRARY_ITEMS - 1) }],
			[],
			[],
			[],
			[{ count: String(MAX_NUMBER_OF_LIBRARY_ITEMS) }],
		])
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/png' }),
			}),
			env
		)

		expect(response.status).toBe(409)
		const sqls = fake.queries.map((q) => q.sql)
		expect(sqls.some((sql) => sql.startsWith('insert into "library_item'))).toBe(false)
		expect(sqls.some((sql) => sql.endsWith('for no key update'))).toBe(true)
		await drainQueued(env, queuedObjects(fake), [])
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
	})

	it("stores each request's content under a key of its own", async () => {
		const env = makeEnv()
		const keys: string[] = []
		for (let i = 0; i < 2; i++) {
			const fake = mockPool(adding(libraryAccess(W, 'member')))
			await addLibraryItem(addRequest({ content: JSON.stringify(CONTENT) }), env)
			keys.push(namedObjects(fake).find((o) => o.bucket === 'rooms')!.objectName)
		}
		expect(keys[0]).not.toBe(keys[1])
		expect((await env.ROOMS.list()).objects).toHaveLength(2)
	})

	it('answers 404 without storing anything when the libraries flag is off for me', async () => {
		vi.mocked(canUseLibraries).mockResolvedValue(false)
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
			}),
			env
		)
		expect(response.status).toBe(404)
		expect(canUseLibraries).toHaveBeenCalledWith(env, ME)
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
	})

	it('adds to a library in my home workspace, which may have no group_user row', async () => {
		mockPool(adding(libraryAccess(ME, null)))
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
			'item content with an asset that is not an object',
			{ content: JSON.stringify({ formatVersion: 1, content: { assets: [null] } }) },
		],
		[
			'a GIF thumbnail',
			{
				content: JSON.stringify(CONTENT),
				thumbnail: new Blob([new Uint8Array([1])], { type: 'image/gif' }),
			},
		],
		[
			'a dark thumbnail without a light one',
			{
				content: JSON.stringify(CONTENT),
				darkThumbnail: new Blob([new Uint8Array([2])], { type: 'image/png' }),
			},
		],
		['a request without an id', { id: undefined, content: JSON.stringify(CONTENT) }],
		['an id uniqueId would not make', { id: 'item_1', content: JSON.stringify(CONTENT) }],
		[
			'an id with characters uniqueId does not use',
			{ id: 'item/../111222233334444', content: JSON.stringify(CONTENT) },
		],
	])('refuses %s', async (_, fields) => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const response = await addLibraryItem(addRequest(fields), env)
		expect(response.status).toBe(400)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(fake.queries.some((q) => /^insert/i.test(q.sql))).toBe(false)
	})

	it('refuses an id that names an existing item, before queueing or storing anything', async () => {
		const fake = mockPool([[libraryAccess(W, 'member')], [], [{ id: ITEM_ID }]])
		const env = makeEnv()
		const response = await addLibraryItem(
			addRequest({ content: JSON.stringify(CONTENT), thumbnail: png() }),
			env
		)
		expect(response.status).toBe(409)
		expect((await env.ROOMS.list()).objects).toEqual([])
		expect(await uploadNames(env)).toEqual([])
		expect(fake.queries.some((q) => /^insert/i.test(q.sql))).toBe(false)
	})

	it("answers 409 when another request inserts the id first; its queued deletes remove what it stored, and not the other's", async () => {
		const env = makeEnv()
		// the request that inserted the id first, and what it stored
		const winner = mockPool(adding(libraryAccess(W, 'member')))
		expect(
			(
				await addLibraryItem(
					addRequest({ content: JSON.stringify(CONTENT), thumbnail: png() }),
					env
				)
			).status
		).toBe(200)
		const winnerObjects = namedObjects(winner)
		const stored = async () => [
			...(await env.ROOMS.list()).objects.map((o: { key: string }) => o.key),
			...(await uploadNames(env)),
		]
		const winnerStored = await stored()

		// no item when it checks, but the insert finds one
		const loser = mockPool([[libraryAccess(W, 'member')], [], [], [], [], [], []])
		const response = await addLibraryItem(
			addRequest({ content: JSON.stringify(CONTENT), thumbnail: png() }),
			env
		)
		expect(response.status).toBe(409)
		expect(namedObjects(loser)).toEqual([])
		expect(loser.queries.at(-1)!.sql).toBe('commit')
		const loserQueued = queuedObjects(loser)
		expect(loserQueued.filter((o) => winnerStored.includes(o.objectName))).toEqual([])

		await drainQueued(env, [...queuedObjects(winner), ...loserQueued], winnerObjects)
		expect((await stored()).sort()).toEqual(winnerStored.sort())
	})
})

describe('addLibraryItem, with uploaded images in the content', () => {
	const image = (src: string, fileId?: string, id = 'asset:photo') => ({
		id,
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

		const response = await addLibraryItem(
			addRequest({ content: withAssets([image('https://content.test/abc123-png', 'file-a')]) }),
			env
		)

		expect(response.status).toBe(200)
		const id = ITEM_ID
		const uploads = await uploadNames(env)
		const copyName = uploads.find((key: string) => key !== 'abc123-png')!
		expect(copyName).toMatch(/-png$/)
		const { key, content: stored } = await storedContent(env)
		expect(stored.content.assets[0].props.src).toBe(`https://content.test/${copyName}`)
		// so a board it's placed on copies the image for itself
		expect(stored.content.assets[0].meta).toEqual({})
		const objects = fake.queries.find((q) => q.sql.startsWith('insert into "library_item_object"'))!
		expect(objects.parameters).toEqual([id, 'rooms', key, id, 'uploads', copyName])
	})

	it('names exactly the objects it writes: its content, its copies and both thumbnails', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1]))
		await env.UPLOADS.put('def456-png', new Uint8Array([2]))
		const written = recordPuts(env)

		const response = await addLibraryItem(
			addRequest({
				content: withAssets([
					image('https://content.test/abc123-png', undefined, 'asset:a'),
					image('https://content.test/def456-png', undefined, 'asset:b'),
				]),
				thumbnail: new Blob([new Uint8Array([3])], { type: 'image/png' }),
				darkThumbnail: new Blob([new Uint8Array([4])], { type: 'image/webp' }),
			}),
			env
		)

		expect(response.status).toBe(200)
		expect(written).toHaveLength(5)
		expect(byKey(namedObjects(fake))).toEqual(byKey(written))
		expect(byKey(queuedObjects(fake))).toEqual(byKey(written))
	})

	it("neither names nor stores the copy of an upload that's missing", async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		await env.UPLOADS.put('abc123-png', new Uint8Array([1]))
		const written = recordPuts(env)

		const response = await addLibraryItem(
			addRequest({
				content: withAssets([
					image('https://content.test/abc123-png', undefined, 'asset:a'),
					image('https://content.test/gone-png', undefined, 'asset:b'),
				]),
				thumbnail: new Blob([new Uint8Array([3])], { type: 'image/png' }),
			}),
			env
		)

		expect(response.status).toBe(200)
		const named = namedObjects(fake)
		expect(byKey(named)).toEqual(byKey(written))
		// the missing upload's copy was queued, but nothing was stored under its name
		const writtenKeys = byKey(written)
		const notStored = queuedObjects(fake).filter(
			(queued) => !writtenKeys.includes(objectKey(queued))
		)
		expect(notStored).toHaveLength(1)
		expect(notStored[0].bucket).toBe('uploads')
		expect(await env.UPLOADS.head(notStored[0].objectName)).toBeNull()

		await drainQueued(env, queuedObjects(fake), named)
		for (const object of named) {
			const r2 = object.bucket === 'rooms' ? env.ROOMS : env.UPLOADS
			expect(await r2.head(object.objectName)).not.toBeNull()
		}
	})

	it('leaves an asset whose upload is missing, or that is not an upload, as it was', async () => {
		const fake = mockPool(adding(libraryAccess(W, 'member')))
		const env = makeEnv()
		const assets = [image('https://content.test/gone-png'), image('data:image/png;base64,AAAA')]
		const response = await addLibraryItem(addRequest({ content: withAssets(assets) }), env)

		expect(response.status).toBe(200)
		const id = ITEM_ID
		const { key, content: stored } = await storedContent(env)
		expect(stored.content.assets).toEqual(assets)
		const objects = fake.queries.find((q) => q.sql.startsWith('insert into "library_item_object"'))!
		expect(objects.parameters).toEqual([id, 'rooms', key])
	})
})

describe('getLibraryItemContent', () => {
	async function storedEnv() {
		const env = makeEnv()
		await env.ROOMS.put(CONTENT_KEY, JSON.stringify(CONTENT))
		return env
	}

	it("serves a member the item's content", async () => {
		const env = await storedEnv()
		mockPool([[itemAccess('member')]])
		const content = await getLibraryItemContent(getRequest(), env)
		expect(content.status).toBe(200)
		expect(await content.json()).toEqual(CONTENT)
	})

	it('answers 404 without reading anything when the libraries flag is off for me', async () => {
		vi.mocked(canUseLibraries).mockResolvedValue(false)
		const env = await storedEnv()
		expect((await getLibraryItemContent(getRequest(), env)).status).toBe(404)
		expect(canUseLibraries).toHaveBeenCalledWith(env, ME)
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
	})

	it('answers 404 to someone who is not a member of the workspace', async () => {
		const env = await storedEnv()
		mockPool([[itemAccess(null)]])
		expect((await getLibraryItemContent(getRequest(), env)).status).toBe(404)
	})
})
