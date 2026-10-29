import type { WhatsNewResponse, WhatsNewStore } from '@tldraw/dotcom-shared'
import { StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRoutes } from './adminRoutes'
import { Environment } from './types'
import { getWhatsNew } from './whatsNew'

vi.mock('./postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('./utils/tla/getAuth', () => ({
	requireAuth: vi.fn(async () => ({ userId: 'user_admin' })),
	requireAdminAccess: vi.fn(async () => {}),
	getAuth: vi.fn(async () => ({ userId: 'user_admin' })),
	getClerkClient: vi.fn(),
}))

const { requireAdminAccess, getAuth } = await import('./utils/tla/getAuth')

let kv: Map<string, string>

let uploads: Map<string, { contentType?: string; size: number }>

function makeEnv() {
	kv = new Map()
	uploads = new Map()
	return {
		UPLOADS: {
			put: async (key: string, value: ArrayBuffer, opts?: any) =>
				void uploads.set(key, {
					contentType: opts?.httpMetadata?.contentType,
					size: value.byteLength,
				}),
		},
		WHATS_NEW: {
			get: async (key: string) => kv.get(key) ?? null,
			put: async (key: string, value: string) => void kv.set(key, value),
		},
	} as unknown as Environment
}

async function fetchAdmin(request: Request, env: Environment) {
	try {
		return await adminRoutes.fetch(request, env)
	} catch (error: any) {
		if (error instanceof StatusError) {
			return Response.json({ error: error.message }, { status: error.status })
		}
		throw error
	}
}

async function adminPost(env: Environment, path: string, body: unknown) {
	return fetchAdmin(
		new Request(`https://sync.tldraw.xyz/app/admin/whats-new${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		}),
		env
	)
}

async function publicGet(env: Environment, query = '') {
	try {
		return await getWhatsNew(
			new Request(`https://sync.tldraw.xyz/app/whats-new${query}`) as any,
			env
		)
	} catch (error: any) {
		if (error instanceof StatusError) {
			return Response.json({ error: error.message }, { status: error.status })
		}
		throw error
	}
}

function stored(): WhatsNewStore {
	return JSON.parse(kv.get('updates')!)
}

async function create(env: Environment, title: string, body = 'body'): Promise<WhatsNewStore> {
	const res = await adminPost(env, '', { version: currentVersion(), title, body })
	expect(res.status).toBe(200)
	return res.json()
}

function currentVersion() {
	return kv.has('updates') ? stored().version : 0
}

function idOf(store: WhatsNewStore, title: string) {
	return store.updates.find((u) => u.title === title)!.id
}

async function publish(env: Environment, id: string) {
	return adminPost(env, `/${id}/publish`, { version: currentVersion() })
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.useFakeTimers()
	vi.setSystemTime(1000)
})

afterEach(() => {
	vi.useRealTimers()
})

describe('GET /app/whats-new', () => {
	it('returns only published updates, newest first, without reading auth', async () => {
		const env = makeEnv()
		const first = idOf(await create(env, 'first'), 'first')
		await publish(env, first)
		vi.setSystemTime(2000)
		const second = idOf(await create(env, 'second'), 'second')
		await publish(env, second)
		await create(env, 'draft')

		const res = await publicGet(env)
		const body: WhatsNewResponse = await res.json()

		expect(getAuth).not.toHaveBeenCalled()
		expect(body.updates.map((u) => u.title)).toEqual(['second', 'first'])
	})

	it('returns an empty list when nothing has been written', async () => {
		const res = await publicGet(makeEnv())
		expect(await res.json()).toEqual({ updates: [] })
	})

	it('drafts=1 returns drafts first then published for admins', async () => {
		const env = makeEnv()
		const pub = idOf(await create(env, 'published'), 'published')
		await publish(env, pub)
		await create(env, 'draft')

		const res = await publicGet(env, '?drafts=1')
		const body: WhatsNewResponse = await res.json()

		expect(body.updates.map((u) => u.title)).toEqual(['draft', 'published'])
	})

	it('drafts=1 is refused for non-admins', async () => {
		const env = makeEnv()
		vi.mocked(requireAdminAccess).mockRejectedValueOnce(new StatusError(403, 'Unauthorized'))

		const res = await publicGet(env, '?drafts=1')

		expect(res.status).toBe(403)
	})
})

describe('admin whats-new routes', () => {
	it('create starts a draft with null publishedAt', async () => {
		const env = makeEnv()
		const store = await create(env, 'hello', 'world')

		expect(store.version).toBe(1)
		expect(store.updates).toEqual([
			{
				id: expect.any(String),
				title: 'hello',
				body: 'world',
				status: 'draft',
				publishedAt: null,
				createdAt: 1000,
				updatedAt: 1000,
			},
		])
	})

	it('publish sets publishedAt once; unpublish and republish keep it', async () => {
		const env = makeEnv()
		const id = idOf(await create(env, 'u'), 'u')
		await publish(env, id)
		vi.setSystemTime(3000)
		await adminPost(env, `/${id}/unpublish`, { version: currentVersion() })
		expect(stored().updates[0]).toMatchObject({ status: 'draft', publishedAt: 1000 })
		vi.setSystemTime(5000)
		await publish(env, id)

		expect(stored().updates[0]).toMatchObject({ status: 'published', publishedAt: 1000 })
	})

	it('editing a published update keeps publishedAt and status', async () => {
		const env = makeEnv()
		const id = idOf(await create(env, 'u'), 'u')
		await publish(env, id)
		vi.setSystemTime(4000)

		const res = await adminPost(env, `/${id}`, {
			version: currentVersion(),
			title: 'u2',
			body: 'fixed',
		})

		expect(res.status).toBe(200)
		expect(stored().updates[0]).toMatchObject({
			title: 'u2',
			body: 'fixed',
			status: 'published',
			publishedAt: 1000,
			updatedAt: 4000,
		})
	})

	it('a stale version is rejected with 409 and leaves the store unchanged', async () => {
		const env = makeEnv()
		const id = idOf(await create(env, 'u'), 'u')
		const version = currentVersion()

		const ok = await adminPost(env, `/${id}`, { version, title: 'mine', body: 'b' })
		const stale = await adminPost(env, `/${id}`, { version, title: 'theirs', body: 'b' })

		expect(ok.status).toBe(200)
		expect(stale.status).toBe(409)
		expect(stored().updates[0].title).toBe('mine')
		expect(stored().version).toBe(version + 1)
	})

	it('delete removes any update, published or draft', async () => {
		const env = makeEnv()
		const pub = idOf(await create(env, 'pub'), 'pub')
		await publish(env, pub)
		const draft = idOf(await create(env, 'draft'), 'draft')
		await create(env, 'kept')

		const delPub = await adminPost(env, `/${pub}/delete`, { version: currentVersion() })
		const delDraft = await adminPost(env, `/${draft}/delete`, { version: currentVersion() })

		expect([delPub.status, delDraft.status]).toEqual([200, 200])
		expect(stored().updates.map((u) => u.title)).toEqual(['kept'])
	})

	it('an unknown id is a 404', async () => {
		const env = makeEnv()
		await create(env, 'u')

		const res = await adminPost(env, '/nope/publish', { version: currentVersion() })

		expect(res.status).toBe(404)
	})

	it('invalid title or body is rejected with 400', async () => {
		const env = makeEnv()

		const empty = await adminPost(env, '', { version: 0, title: '   ', body: 'b' })
		const long = await adminPost(env, '', { version: 0, title: 'x'.repeat(201), body: 'b' })
		const noBody = await adminPost(env, '', { version: 0, title: 't' })
		const hugeBody = await adminPost(env, '', { version: 0, title: 't', body: 'x'.repeat(50_001) })

		expect([empty.status, long.status, noBody.status, hugeBody.status]).toEqual([
			400, 400, 400, 400,
		])
		expect(kv.has('updates')).toBe(false)
	})

	it('GET returns the whole store, sorted', async () => {
		const env = makeEnv()
		const pub = idOf(await create(env, 'pub'), 'pub')
		await publish(env, pub)
		await create(env, 'draft')

		const res = await fetchAdmin(new Request('https://sync.tldraw.xyz/app/admin/whats-new'), env)
		const body: WhatsNewStore = await res.json()

		expect(body.version).toBe(3)
		expect(body.updates.map((u) => u.title)).toEqual(['draft', 'pub'])
	})

	it('admin routes refuse non-admins', async () => {
		const env = makeEnv()
		vi.mocked(requireAdminAccess).mockRejectedValue(new StatusError(403, 'Unauthorized'))

		const responses = await Promise.all([
			fetchAdmin(new Request('https://sync.tldraw.xyz/app/admin/whats-new'), env),
			adminPost(env, '', { version: 0, title: 't', body: 'b' }),
			adminPost(env, '/x', { version: 0, title: 't', body: 'b' }),
			adminPost(env, '/x/publish', { version: 0 }),
			adminPost(env, '/x/unpublish', { version: 0 }),
			adminPost(env, '/x/delete', { version: 0 }),
		])

		expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403])
		expect(kv.has('updates')).toBe(false)
		vi.mocked(requireAdminAccess).mockReset()
	})
})

describe('POST /app/admin/whats-new/media', () => {
	async function upload(env: Environment, contentType: string, bytes: number) {
		return fetchAdmin(
			new Request('https://sync.tldraw.xyz/app/admin/whats-new/media', {
				method: 'POST',
				headers: { 'content-type': contentType },
				body: new Uint8Array(bytes),
			}),
			env
		)
	}

	it('stores the file under the whats-new- prefix', async () => {
		const env = makeEnv()

		const res = await upload(env, 'image/png', 10)
		const { objectName } = await res.json()

		expect(res.status).toBe(200)
		expect(objectName).toMatch(/^whats-new-[^/]+\.png$/)
		expect(uploads.get(objectName)).toEqual({ contentType: 'image/png', size: 10 })
	})

	it('rejects disallowed types with 415', async () => {
		const env = makeEnv()

		const res = await upload(env, 'text/html', 10)

		expect(res.status).toBe(415)
		expect(uploads.size).toBe(0)
	})

	it('rejects files over 20 MB with 413', async () => {
		const env = makeEnv()

		const res = await upload(env, 'video/mp4', 20 * 1024 * 1024 + 1)

		expect(res.status).toBe(413)
		expect(uploads.size).toBe(0)
	})
})
