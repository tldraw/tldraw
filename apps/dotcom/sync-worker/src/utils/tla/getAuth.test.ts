import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticateRequest = vi.fn()
const getUser = vi.fn()

vi.mock('@clerk/backend', () => ({
	createClerkClient: () => ({
		authenticateRequest,
		users: { getUser },
	}),
}))
vi.mock('../featureFlags', () => ({ isFeatureFlagEnabledForUser: vi.fn() }))

// Import after the mocks are registered.
import { isFeatureFlagEnabledForUser } from '../featureFlags'
import { getMcpTokenAuth, requireAdminAccessToRequest } from './getAuth'

const env = {
	CLERK_SECRET_KEY: 'sk',
	CLERK_PUBLISHABLE_KEY: 'pk',
} as any

function signedInAs(userId: string | null) {
	authenticateRequest.mockResolvedValue({
		isAuthenticated: !!userId,
		toAuth: () => (userId ? { userId } : null),
	})
}

const request = {
	url: 'https://tldraw.com/',
	clone: () => request,
	headers: new Headers(),
} as any

describe('requireAdminAccessToRequest', () => {
	beforeEach(() => {
		authenticateRequest.mockReset()
		getUser.mockReset()
	})

	it('throws 401 when not signed in', async () => {
		signedInAs(null)
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 401 })
	})

	it('throws 403 for a non-staff email', async () => {
		signedInAs('user_1')
		getUser.mockResolvedValue({
			primaryEmailAddress: { emailAddress: 'jane@gmail.com', verification: { status: 'verified' } },
		})
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 403 })
	})

	it('throws 403 for an unverified @tldraw.com email', async () => {
		signedInAs('user_1')
		getUser.mockResolvedValue({
			primaryEmailAddress: {
				emailAddress: 'jane@tldraw.com',
				verification: { status: 'unverified' },
			},
		})
		await expect(requireAdminAccessToRequest(request, env)).rejects.toMatchObject({ status: 403 })
	})

	it('resolves for a verified @tldraw.com email', async () => {
		signedInAs('user_1')
		const user = {
			primaryEmailAddress: {
				emailAddress: 'jane@tldraw.com',
				verification: { status: 'verified' },
			},
		}
		getUser.mockResolvedValue(user)
		await expect(requireAdminAccessToRequest(request, env)).resolves.toBe(user)
	})
})

describe('getMcpTokenAuth', () => {
	function requestWith(headers: Record<string, string>, query = '') {
		return {
			url: `https://www.tldraw.com/api/app/file/abc/download${query}`,
			headers: new Headers(headers),
		} as any
	}

	beforeEach(() => {
		authenticateRequest.mockReset()
		vi.mocked(isFeatureFlagEnabledForUser).mockReset()
	})

	it('answers no_token when nothing is presented', async () => {
		await expect(getMcpTokenAuth(requestWith({}), env)).resolves.toEqual({
			ok: false,
			reason: 'no_token',
		})
		expect(authenticateRequest).not.toHaveBeenCalled()
	})

	// The whole point of the type: a session token wears `typ: JWT` and the SDK refuses it here, so a
	// tldraw.com website credential cannot drive an agent-facing endpoint.
	it('asks Clerk for an OAuth token specifically, and passes only the token along', async () => {
		signedInAs('user_1')
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)

		await getMcpTokenAuth(requestWith({ authorization: 'bearer  tok ', cookie: 'session=x' }), env)

		const [forwarded, options] = authenticateRequest.mock.calls[0]
		expect(options).toEqual({ acceptsToken: 'oauth_token' })
		expect(forwarded.headers.get('authorization')).toBe('Bearer tok')
		expect(forwarded.headers.get('cookie')).toBeNull()
	})

	it('answers invalid_token when Clerk refuses it', async () => {
		authenticateRequest.mockResolvedValue({
			isAuthenticated: false,
			reason: 'token-type-mismatch',
			message: 'not an oauth token',
		})

		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), env)
		).resolves.toEqual({ ok: false, reason: 'invalid_token' })
	})

	// Our misconfiguration, reported as its own reason so it is visible in telemetry, while callers
	// still answer it exactly as they answer a bad token.
	it('answers unconfigured, not a crash, when there is no Clerk instance to verify against', async () => {
		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), {
				...env,
				CLERK_SECRET_KEY: '',
			})
		).resolves.toEqual({ ok: false, reason: 'unconfigured' })
		expect(authenticateRequest).not.toHaveBeenCalled()
	})

	it('answers not_allowlisted for a verified user the flag does not name', async () => {
		signedInAs('user_1')
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(false)

		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), env)
		).resolves.toEqual({ ok: false, reason: 'not_allowlisted' })
	})

	it('answers with the user when the token verifies and the flag names them', async () => {
		signedInAs('user_1')
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)

		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), env)
		).resolves.toEqual({ ok: true, userId: 'user_1' })
		expect(isFeatureFlagEnabledForUser).toHaveBeenCalledWith(env, 'mcp_server_access', 'user_1')
	})

	// The websocket handshake's only way to present anything, and how the MCP token reaches the file
	// room. Verified exactly as a header token is: the param is a route into the same check, not a
	// weaker one.
	it('takes the token from the accessToken param when the caller opts in', async () => {
		signedInAs('user_1')
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)

		await expect(
			getMcpTokenAuth(requestWith({}, '?accessToken=tok'), env, { allowQueryParamToken: true })
		).resolves.toEqual({ ok: true, userId: 'user_1' })
		expect(authenticateRequest.mock.calls[0][0].headers.get('authorization')).toBe('Bearer tok')
	})

	// Off unless asked for, so the MCP endpoint keeps the header-only promise its discovery metadata
	// makes and no token of ours ends up in an access log that didn't have to hold one.
	it('ignores the accessToken param by default', async () => {
		await expect(getMcpTokenAuth(requestWith({}, '?accessToken=tok'), env)).resolves.toEqual({
			ok: false,
			reason: 'no_token',
		})
		expect(authenticateRequest).not.toHaveBeenCalled()
	})

	it('prefers the header when a request carries both', async () => {
		signedInAs('user_1')
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)

		await getMcpTokenAuth(
			requestWith({ authorization: 'Bearer header-tok' }, '?accessToken=tok'),
			env,
			{
				allowQueryParamToken: true,
			}
		)

		expect(authenticateRequest.mock.calls[0][0].headers.get('authorization')).toBe(
			'Bearer header-tok'
		)
	})
})
