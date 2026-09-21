import { StatusError } from 'itty-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRoutes } from './adminRoutes'
import { Environment } from './types'

// The admin feature-flag routes, which are now the only way onto the `mcp_server_access` allowlist —
// the bespoke KV list this PR deleted was the other one. adminRoutes.ts had no test file at all, so
// nothing covered the path that decides who may drive the MCP server.
//
// Postgres and Clerk are mocked; the flag store is a real in-memory KV stand-in, so what a save
// actually writes is what the assertions read back.
vi.mock('./postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('./utils/tla/getAuth', () => ({
	requireAuth: vi.fn(async () => ({ userId: 'user_admin' })),
	requireAdminAccess: vi.fn(async () => {}),
	getClerkClient: vi.fn(),
}))

const { createPostgresConnectionPool } = await import('./postgres')

let kv: Map<string, string>

/** Stands in for the `user` table lookups both the save and the admin GET make. */
function mockUsers(rows: Array<{ id: string; email: string }>) {
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: () => ({
			select: () => ({ where: () => ({ execute: async () => rows }) }),
		}),
		destroy: async () => {},
	} as any)
}

function makeEnv() {
	kv = new Map()
	return {
		FEATURE_FLAGS: {
			get: async (key: string) => kv.get(key) ?? null,
			put: async (key: string, value: string) => void kv.set(key, value),
		},
	} as unknown as Environment
}

/**
 * The router throws `StatusError` and the worker's `handleApiRequest` turns it into a response, so a
 * test driving the router directly has to do the same or every refusal reads as an unhandled throw.
 */
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

async function post(env: Environment, body: unknown) {
	return fetchAdmin(
		new Request('https://sync.tldraw.xyz/app/admin/feature-flags', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		}),
		env
	)
}

function storedFlag(key: string) {
	return JSON.parse(kv.get(key)!)
}

beforeEach(() => {
	vi.clearAllMocks()
	mockUsers([])
})

describe('POST /app/admin/feature-flags', () => {
	it('resolves emails to user ids and stores the pair', async () => {
		const env = makeEnv()
		mockUsers([{ id: 'user_1', email: 'One@tldraw.com' }])

		const response = await post(env, {
			flag: 'mcp_server_access',
			emails: 'one@tldraw.com',
		})

		expect(response.status).toBe(200)
		// The address as the database has it, not as the admin typed it, so the panel shows the real one.
		expect(storedFlag('mcp_server_access').users).toEqual([
			{ userId: 'user_1', email: 'One@tldraw.com' },
		])
	})

	// The server's parser, not the client's: a comma-separated paste is one line and several people.
	// The admin panel used to count these differently from the worker and report "1 user" for five.
	it('accepts a comma-separated paste as several addresses', async () => {
		const env = makeEnv()
		mockUsers([
			{ id: 'user_1', email: 'one@tldraw.com' },
			{ id: 'user_2', email: 'two@tldraw.com' },
		])

		await post(env, { flag: 'mcp_server_access', emails: 'one@tldraw.com, two@tldraw.com' })

		expect(storedFlag('mcp_server_access').users).toHaveLength(2)
	})

	// An address with no account would be stored as an entry that looks like a grant and matches
	// nobody, so it fails the save instead — at the point someone can still fix the typo.
	it('refuses an email with no tldraw account', async () => {
		const env = makeEnv()
		mockUsers([])

		const response = await post(env, { flag: 'mcp_server_access', emails: 'ghost@tldraw.com' })

		expect(response.status).toBe(400)
		expect(await response.text()).toContain('ghost@tldraw.com')
		expect(kv.has('mcp_server_access')).toBe(false)
	})

	it('refuses input that is not an email address at all', async () => {
		const env = makeEnv()

		const response = await post(env, { flag: 'mcp_server_access', emails: 'tldraw.com' })

		expect(response.status).toBe(400)
		expect(kv.has('mcp_server_access')).toBe(false)
	})

	// The field means nothing for a percentage flag. It used to be dropped in silence while the
	// response still answered `{success: true, users: […]}`, so an admin could be told a save had
	// landed that stored nothing anywhere.
	it('refuses emails sent for a flag that has no allowlist', async () => {
		const env = makeEnv()

		const response = await post(env, { flag: 'rum_enabled', emails: 'one@tldraw.com' })

		expect(response.status).toBe(400)
		expect(await response.text()).toContain('emails do not apply')
		expect(kv.has('rum_enabled')).toBe(false)
	})

	it('refuses a percentage sent for an allowlist flag', async () => {
		const env = makeEnv()

		const response = await post(env, { flag: 'mcp_server_access', percentage: 50 })

		expect(response.status).toBe(400)
		expect(kv.has('mcp_server_access')).toBe(false)
	})

	it('refuses an unknown flag', async () => {
		const env = makeEnv()

		expect((await post(env, { flag: 'not_a_flag', enabled: true })).status).toBe(400)
	})

	// A save replaces the list rather than merging into it, so removing someone is an ordinary save.
	it('replaces the list wholesale', async () => {
		const env = makeEnv()
		mockUsers([
			{ id: 'user_1', email: 'one@tldraw.com' },
			{ id: 'user_2', email: 'two@tldraw.com' },
		])
		await post(env, { flag: 'mcp_server_access', emails: 'one@tldraw.com\ntwo@tldraw.com' })

		mockUsers([{ id: 'user_2', email: 'two@tldraw.com' }])
		await post(env, { flag: 'mcp_server_access', emails: 'two@tldraw.com' })

		expect(storedFlag('mcp_server_access').users).toEqual([
			{ userId: 'user_2', email: 'two@tldraw.com' },
		])
	})

	// The list lives in one KV value that every evaluation reads, so a pasted address book is worth
	// refusing rather than storing.
	it('refuses a list past the cap', async () => {
		const env = makeEnv()
		const emails = Array.from({ length: 201 }, (_, i) => `user${i}@tldraw.com`).join('\n')

		const response = await post(env, { flag: 'mcp_server_access', emails })

		expect(response.status).toBe(400)
		expect(kv.has('mcp_server_access')).toBe(false)
	})

	it('toggles the master switch without touching the list', async () => {
		const env = makeEnv()
		mockUsers([{ id: 'user_1', email: 'one@tldraw.com' }])
		await post(env, { flag: 'mcp_server_access', emails: 'one@tldraw.com' })

		await post(env, { flag: 'mcp_server_access', enabled: true })

		expect(storedFlag('mcp_server_access')).toMatchObject({
			enabled: true,
			users: [{ userId: 'user_1', email: 'one@tldraw.com' }],
		})
	})
})

describe('GET /app/admin/feature-flags', () => {
	async function get(env: Environment) {
		const response = await fetchAdmin(
			new Request('https://sync.tldraw.xyz/app/admin/feature-flags'),
			env
		)
		return (await response.json()) as any
	}

	// The stored email is written once at save time and never updated, so it rots. Re-resolving on read
	// costs the admin panel one query and keeps the list re-saveable.
	it('refreshes the email labels from the database', async () => {
		const env = makeEnv()
		kv.set(
			'mcp_server_access',
			JSON.stringify({
				type: 'allowlist',
				enabled: true,
				users: [{ userId: 'user_1', email: 'old-address@tldraw.com' }],
			})
		)
		mockUsers([{ id: 'user_1', email: 'new-address@tldraw.com' }])

		const flags = await get(env)

		expect(flags.mcp_server_access.users).toEqual([
			{ userId: 'user_1', email: 'new-address@tldraw.com' },
		])
	})

	// A deleted account leaves an entry that still looks like a live grant and matches nobody, and
	// re-saving the list as displayed would 400 on a line the admin cannot pick out from the rest.
	it('marks an entry whose user id no longer resolves', async () => {
		const env = makeEnv()
		kv.set(
			'mcp_server_access',
			JSON.stringify({
				type: 'allowlist',
				enabled: true,
				users: [{ userId: 'user_gone', email: 'gone@tldraw.com' }],
			})
		)
		mockUsers([])

		const flags = await get(env)

		expect(flags.mcp_server_access.users).toEqual([
			{ userId: 'user_gone', email: 'gone@tldraw.com', missing: true },
		])
	})

	// The defaults table is the schema; KV holds only state. A hand-edited value with a typo'd type
	// must not reach the panel — or the request path — as a shape neither of them recognises.
	it('reports the type from the defaults, not from KV', async () => {
		const env = makeEnv()
		kv.set('mcp_server_access', JSON.stringify({ type: 'allowList', enabled: true }))

		const flags = await get(env)

		expect(flags.mcp_server_access.type).toBe('allowlist')
	})
})
