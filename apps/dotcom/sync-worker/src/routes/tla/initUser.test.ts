import { ClerkAPIResponseError } from '@clerk/backend/errors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureUser, handleInitUser } from './initUser'

const getUser = vi.fn()
vi.mock('../../utils/tla/getAuth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../utils/tla/getAuth')>()),
	getClerkClient: () => ({ users: { getUser } }),
	getMcpTokenAuth: vi.fn(),
	requireAuth: vi.fn(),
}))
vi.mock('./mcpServer', () => ({ writeMcpAuthRefusalTelemetry: vi.fn() }))
vi.mock('../../utils/analytics', () => ({ writeDataPoint: vi.fn() }))
const pool = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('../../postgres', () => ({ createPostgresConnectionPool: () => pool.current }))

const { getMcpTokenAuth, requireAuth } = await import('../../utils/tla/getAuth')
const { writeMcpAuthRefusalTelemetry } = await import('./mcpServer')

function makeDb(existingEmail?: string, { hasHomeGroup = true } = {}) {
	const inserted: { table: string; row: Record<string, unknown> }[] = []
	const db = {
		selectFrom: () => ({
			leftJoin: () => ({
				where: () => ({
					select: () => ({
						executeTakeFirst: async () =>
							existingEmail === undefined
								? undefined
								: {
										email: existingEmail,
										name: 'Someone',
										homeGroupId: hasHomeGroup ? 'user-1' : null,
									},
					}),
				}),
			}),
		}),
		transaction: () => ({
			execute: async (fn: (tx: unknown) => Promise<void>) =>
				fn({
					insertInto: (table: string) => ({
						values: (row: Record<string, unknown>) => {
							inserted.push({ table, row })
							return { onConflict: () => ({ execute: async () => {} }) }
						},
					}),
				}),
		}),
	}
	return { db: db as any, inserted }
}

function makeEnv(rateLimited = false) {
	return { RATE_LIMITER: { limit: async () => ({ success: !rateLimited }) } } as any
}

const clerkUser = (email?: string) => ({
	fullName: 'Someone',
	imageUrl: '',
	primaryEmailAddress: email ? { emailAddress: email } : null,
	emailAddresses: email ? [{ emailAddress: email }] : [],
})

describe('ensureUser', () => {
	beforeEach(() => {
		getUser.mockReset()
	})

	it("returns an existing row's email without asking Clerk", async () => {
		const { db, inserted } = makeDb('someone@tldraw.com')
		expect(await ensureUser(makeEnv(), db, 'user-1')).toEqual({
			outcome: 'existing',
			email: 'someone@tldraw.com',
		})
		expect(getUser).not.toHaveBeenCalled()
		expect(inserted).toEqual([])
	})

	it("creates the rows and returns Clerk's email", async () => {
		getUser.mockResolvedValue(clerkUser('someone@tldraw.com'))
		const { db, inserted } = makeDb()
		expect(await ensureUser(makeEnv(), db, 'user-1')).toEqual({
			outcome: 'created',
			email: 'someone@tldraw.com',
		})
		expect(inserted.map((i) => i.table)).toEqual(['user', 'group', 'group_user'])
	})

	// A user row without its home group leaves the account with no workspace at all.
	it('creates the home workspace for a user row that lacks one', async () => {
		const { db, inserted } = makeDb('someone@tldraw.com', { hasHomeGroup: false })
		expect(await ensureUser(makeEnv(true), db, 'user-1')).toEqual({
			outcome: 'repaired',
			email: 'someone@tldraw.com',
		})
		expect(getUser).not.toHaveBeenCalled()
		expect(inserted.map((i) => i.table)).toEqual(['group', 'group_user'])
		expect(inserted[1].row).toMatchObject({ userId: 'user-1', groupId: 'user-1', role: 'owner' })
	})

	// A user deleted in Clerk since their token was issued is refused, not turned into a 500.
	it('reports a user Clerk no longer has', async () => {
		getUser.mockRejectedValue(new ClerkAPIResponseError('Not Found', { data: [], status: 404 }))
		const { db, inserted } = makeDb()
		expect(await ensureUser(makeEnv(), db, 'user-1')).toEqual({ outcome: 'no_clerk_user' })
		expect(inserted).toEqual([])
	})

	// Only a 404 means the user is gone; anything else is Clerk failing and must not read as that.
	it('rethrows any other Clerk error', async () => {
		getUser.mockRejectedValue(new ClerkAPIResponseError('Server Error', { data: [], status: 500 }))
		const { db } = makeDb()
		await expect(ensureUser(makeEnv(), db, 'user-1')).rejects.toThrow()
	})

	it('reports a Clerk user without an email', async () => {
		getUser.mockResolvedValue(clerkUser())
		const { db, inserted } = makeDb()
		expect(await ensureUser(makeEnv(), db, 'user-1')).toEqual({ outcome: 'no_email' })
		expect(inserted).toEqual([])
	})

	it('creates nothing when rate limited', async () => {
		const { db, inserted } = makeDb()
		expect(await ensureUser(makeEnv(true), db, 'user-1')).toEqual({ outcome: 'rate_limited' })
		expect(getUser).not.toHaveBeenCalled()
		expect(inserted).toEqual([])
	})
})

describe('handleInitUser', () => {
	// Unsigned: the route only reads `typ` to pick a verifier, and the verifiers themselves are mocked.
	function jwtWithTyp(typ: string) {
		const part = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
		return `${part({ alg: 'RS256', typ })}.${part({ sub: 'user-1' })}.sig`
	}
	const OAUTH_TOKEN = jwtWithTyp('at+jwt')
	const SESSION_TOKEN = jwtWithTyp('JWT')

	function makeRequest(token: string, userId = 'user-1') {
		return Object.assign(
			new Request(`https://sync.tldraw.xyz/app/${userId}/init`, {
				method: 'POST',
				headers: { authorization: `Bearer ${token}` },
			}),
			{ params: { userId } }
		) as any
	}

	beforeEach(() => {
		vi.clearAllMocks()
		const { db } = makeDb('someone@example.com')
		pool.current = Object.assign(db, { destroy: async () => {} })
	})

	it('accepts an OAuth access token for the user it names', async () => {
		vi.mocked(getMcpTokenAuth).mockResolvedValue({ ok: true, userId: 'user-1' })
		const response = await handleInitUser(makeRequest(OAUTH_TOKEN), makeEnv())
		expect(response.status).toBe(200)
		expect(requireAuth).not.toHaveBeenCalled()
	})

	it('answers 403 for a valid access token outside mcp_server_access', async () => {
		vi.mocked(getMcpTokenAuth).mockResolvedValue({ ok: false, reason: 'not_allowlisted' })
		const response = await handleInitUser(makeRequest(OAUTH_TOKEN), makeEnv())
		expect(response.status).toBe(403)
		expect(writeMcpAuthRefusalTelemetry).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'not_allowlisted',
			'init'
		)
	})

	it('answers 401 for an access token that does not verify', async () => {
		vi.mocked(getMcpTokenAuth).mockResolvedValue({ ok: false, reason: 'invalid_token' })
		const response = await handleInitUser(makeRequest(OAUTH_TOKEN), makeEnv())
		expect(response.status).toBe(401)
	})

	it('answers 404 for an access token whose user is not the one in the path', async () => {
		vi.mocked(getMcpTokenAuth).mockResolvedValue({ ok: true, userId: 'user-2' })
		const response = await handleInitUser(makeRequest(OAUTH_TOKEN), makeEnv())
		expect(response.status).toBe(404)
	})

	it('sends a session token to requireAuth, never the access token verifier', async () => {
		vi.mocked(requireAuth).mockResolvedValue({ userId: 'user-1' } as any)
		const response = await handleInitUser(makeRequest(SESSION_TOKEN), makeEnv())
		expect(response.status).toBe(200)
		expect(getMcpTokenAuth).not.toHaveBeenCalled()
	})
})
