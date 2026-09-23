import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticateRequest = vi.fn()
const getUser = vi.fn()
const verifyToken = vi.fn()

vi.mock('@clerk/backend', () => ({
	createClerkClient: () => ({
		authenticateRequest,
		users: { getUser },
	}),
	// Called through, not referenced: the factory is hoisted above the `const`.
	verifyToken: (...args: unknown[]) => verifyToken(...args),
}))
vi.mock('../featureFlags', () => ({ canUseMcpServer: vi.fn() }))

// Import after the mocks are registered.
import { canUseMcpServer } from '../featureFlags'
import {
	getMcpTokenAuth,
	getZeroAuth,
	isOAuthAccessToken,
	requireAdminAccessToRequest,
} from './getAuth'

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
		vi.mocked(canUseMcpServer).mockReset()
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
		vi.mocked(canUseMcpServer).mockResolvedValue(true)

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

	it('answers not_allowlisted for a verified user canUseMcpServer refuses', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(false)

		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), env)
		).resolves.toEqual({ ok: false, reason: 'not_allowlisted' })
	})

	it('answers with the user when the token verifies and canUseMcpServer admits them', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(true)

		await expect(
			getMcpTokenAuth(requestWith({ authorization: 'Bearer tok' }), env)
		).resolves.toEqual({ ok: true, userId: 'user_1' })
		expect(canUseMcpServer).toHaveBeenCalledWith(env, 'user_1')
	})

	// The one header a browser lets a client set on a handshake, and how the MCP token reaches the
	// file room. Verified exactly as an `Authorization` token is: the subprotocol is a route into the
	// same check, not a weaker one.
	it('takes the token from the subprotocol when the caller opts in', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(true)

		await expect(
			getMcpTokenAuth(requestWith({ 'sec-websocket-protocol': 'tldraw.bearer, tok' }), env, {
				allowSubprotocolToken: true,
			})
		).resolves.toEqual({ ok: true, userId: 'user_1' })
		expect(authenticateRequest.mock.calls[0][0].headers.get('authorization')).toBe('Bearer tok')
	})

	// Off unless asked for, so the MCP endpoint keeps the header-only promise its discovery metadata
	// makes.
	it('ignores the subprotocol by default', async () => {
		await expect(
			getMcpTokenAuth(requestWith({ 'sec-websocket-protocol': 'tldraw.bearer, tok' }), env)
		).resolves.toEqual({
			ok: false,
			reason: 'no_token',
		})
		expect(authenticateRequest).not.toHaveBeenCalled()
	})

	// A client naming some other subprotocol is not making a failed attempt at ours, so it reads as
	// no token rather than a bad one — which is the difference between a 401 that says "sign in" and
	// one that says "your token is broken".
	it('ignores a subprotocol that is not ours', async () => {
		await expect(
			getMcpTokenAuth(requestWith({ 'sec-websocket-protocol': 'graphql-ws' }), env, {
				allowSubprotocolToken: true,
			})
		).resolves.toEqual({ ok: false, reason: 'no_token' })
		expect(authenticateRequest).not.toHaveBeenCalled()
	})

	// The token must survive the field unencoded: a JWT's characters are all legal in it, dots and
	// dashes included, and nothing here should be mangling them.
	it('keeps a JWT intact through the subprotocol', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(true)
		const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.sig-with_chars'

		await getMcpTokenAuth(requestWith({ 'sec-websocket-protocol': `tldraw.bearer, ${jwt}` }), env, {
			allowSubprotocolToken: true,
		})

		expect(authenticateRequest.mock.calls[0][0].headers.get('authorization')).toBe(`Bearer ${jwt}`)
	})

	it('prefers the authorization header when a request carries both', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(true)

		await getMcpTokenAuth(
			requestWith({
				authorization: 'Bearer header-tok',
				'sec-websocket-protocol': 'tldraw.bearer, tok',
			}),
			env,
			{ allowSubprotocolToken: true }
		)

		expect(authenticateRequest.mock.calls[0][0].headers.get('authorization')).toBe(
			'Bearer header-tok'
		)
	})
})

/** A JWT with the given header, unsigned: only the header is read before verification. */
function jwtWithHeader(header: object) {
	const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
	return `${b64(header)}.${b64({ sub: 'user_1' })}.sig`
}

describe('isOAuthAccessToken', () => {
	it('reads at+jwt off the header, case-insensitively', () => {
		expect(isOAuthAccessToken(jwtWithHeader({ alg: 'RS256', typ: 'at+jwt' }))).toBe(true)
		expect(isOAuthAccessToken(jwtWithHeader({ alg: 'RS256', typ: 'AT+JWT' }))).toBe(true)
		expect(isOAuthAccessToken(jwtWithHeader({ alg: 'RS256', typ: 'JWT' }))).toBe(false)
		expect(isOAuthAccessToken(jwtWithHeader({ alg: 'RS256' }))).toBe(false)
	})

	it('reads garbage as not one', () => {
		expect(isOAuthAccessToken('')).toBe(false)
		expect(isOAuthAccessToken('not.a.jwt')).toBe(false)
		expect(isOAuthAccessToken('%%%.x.y')).toBe(false)
	})
})

describe('getZeroAuth', () => {
	const request = (token: string) =>
		({
			url: 'https://www.tldraw.com/api/app/zero/query',
			headers: new Headers({ authorization: `Bearer ${token}` }),
		}) as any
	const accessToken = jwtWithHeader({ alg: 'RS256', typ: 'at+jwt' })
	const templateToken = jwtWithHeader({ alg: 'RS256', typ: 'JWT' })

	beforeEach(() => {
		authenticateRequest.mockReset()
		verifyToken.mockReset()
		vi.mocked(canUseMcpServer).mockReset()
	})

	// The plugin's user: an agent's software holding an OAuth token, for whom the template token
	// never existed. Verified the way every other MCP-token route verifies it, flag check included.
	it('admits an OAuth access token through the MCP check, and says so', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(true)

		await expect(getZeroAuth(request(accessToken), env)).resolves.toEqual({
			userId: 'user_1',
			mcp: true,
		})
		expect(authenticateRequest.mock.calls[0][1]).toEqual({ acceptsToken: 'oauth_token' })
		expect(verifyToken).not.toHaveBeenCalled()
	})

	it('refuses an OAuth access token the flag does not admit, with no session fallback', async () => {
		signedInAs('user_1')
		vi.mocked(canUseMcpServer).mockResolvedValue(false)

		await expect(getZeroAuth(request(accessToken), env)).resolves.toBeNull()
		// Only the OAuth check ran: getAuth would have been a second authenticateRequest.
		expect(authenticateRequest).toHaveBeenCalledTimes(1)
	})

	it('still takes a zero-template token the way it always has', async () => {
		verifyToken.mockResolvedValue({ purpose: 'zero', sub: 'user_2' })

		await expect(getZeroAuth(request(templateToken), env)).resolves.toEqual({ userId: 'user_2' })
		expect(authenticateRequest).not.toHaveBeenCalled()
	})
})
