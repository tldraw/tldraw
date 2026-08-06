import { verifyToken } from '@clerk/backend'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'
import {
	MCP_PROTECTED_RESOURCE_METADATA_PATH,
	authenticateMcpRequest,
	getMcpAuthorizationServer,
	getMcpProtectedResourceMetadata,
	getMcpResourceUrl,
} from './mcpAuth'

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }))
vi.mock('../../utils/featureFlags', () => ({ isFeatureFlagEnabledForUser: vi.fn() }))

const RESOURCE = 'https://www.tldraw.com/api/app/mcp'

// pk_test_<base64 of "clerk.tldraw.com$">, which is the shape Clerk publishable keys take.
const PUBLISHABLE_KEY = `pk_test_${btoa('clerk.tldraw.com$')}`

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		CLERK_SECRET_KEY: 'sk_test_secret',
		CLERK_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
		MCP_SERVER_URL: RESOURCE,
		...overrides,
	} as unknown as Environment
}

function makeRequest(headers: Record<string, string> = {}) {
	return new Request('https://sync.tldraw.xyz/app/mcp', { method: 'POST', headers }) as any
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(verifyToken).mockResolvedValue({ sub: 'user_123' } as any)
	vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)
})

describe('getMcpResourceUrl', () => {
	it('uses the configured URL', () => {
		expect(getMcpResourceUrl(makeRequest(), makeEnv())).toBe(RESOURCE)
	})

	// The fallback reads the request's own origin, and therefore the Host header. Deployments configure
	// the var so that a forged Host cannot move either the advertised metadata or the audience an access
	// token is checked against.
	it('falls back to the request origin when unset', () => {
		expect(getMcpResourceUrl(makeRequest(), makeEnv({ MCP_SERVER_URL: undefined }))).toBe(
			'https://sync.tldraw.xyz/api/app/mcp'
		)
	})
})

describe('getMcpAuthorizationServer', () => {
	// Derived from the publishable key rather than configured separately, so the authorization server
	// clients are sent to cannot drift from the instance whose tokens we accept — a mismatch would have
	// every client sign in successfully and then be refused.
	it('derives the Clerk frontend API origin from the publishable key', () => {
		expect(getMcpAuthorizationServer(makeEnv())).toBe('https://clerk.tldraw.com')
	})

	it('prefers an explicit override', () => {
		expect(
			getMcpAuthorizationServer(makeEnv({ MCP_OAUTH_AUTHORIZATION_SERVER: 'https://auth.example' }))
		).toBe('https://auth.example')
	})

	it('returns null for a missing or unparseable key', () => {
		expect(getMcpAuthorizationServer(makeEnv({ CLERK_PUBLISHABLE_KEY: undefined }))).toBe(null)
		expect(getMcpAuthorizationServer(makeEnv({ CLERK_PUBLISHABLE_KEY: 'not-a-key' }))).toBe(null)
	})
})

describe('getMcpProtectedResourceMetadata', () => {
	it('names the resource and its authorization server', async () => {
		const response = getMcpProtectedResourceMetadata(makeRequest(), makeEnv())

		expect(response.status).toBe(200)
		expect(await response.json()).toMatchObject({
			resource: RESOURCE,
			authorization_servers: ['https://clerk.tldraw.com'],
			bearer_methods_supported: ['header'],
		})
	})

	// Advertising a resource with no authorization server would push the failure further along, into
	// the client, where it reads as a broken server rather than an unconfigured one.
	it('refuses to advertise a resource it has no authorization server for', () => {
		expect(
			getMcpProtectedResourceMetadata(makeRequest(), makeEnv({ CLERK_PUBLISHABLE_KEY: undefined }))
				.status
		).toBe(503)
	})
})

describe('authenticateMcpRequest', () => {
	// The pointer is the whole point of the 401: without it a client learns only that it was refused,
	// not where to send the user to sign in.
	it('answers 401 with a pointer to the metadata when there is no token', async () => {
		const result = await authenticateMcpRequest(makeRequest(), makeEnv())

		expect(result.ok).toBe(false)
		const response = (result as { response: Response }).response
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).toBe(
			`Bearer resource_metadata="https://www.tldraw.com${MCP_PROTECTED_RESOURCE_METADATA_PATH}"`
		)
	})

	it('accepts a valid token and returns its subject', async () => {
		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer good-token' }),
			makeEnv()
		)

		expect(result).toEqual({ ok: true, userId: 'user_123' })
	})

	// RFC 8707: the audience is what stops a token the user granted to some other MCP server being
	// replayed against this one, and it has to be the resource identifier rather than our hostname.
	it('requires the token to be minted for this resource', async () => {
		await authenticateMcpRequest(makeRequest({ authorization: 'Bearer good-token' }), makeEnv())

		expect(verifyToken).toHaveBeenCalledWith('good-token', {
			secretKey: 'sk_test_secret',
			audience: RESOURCE,
		})
	})

	it('answers 401 invalid_token when verification fails', async () => {
		vi.mocked(verifyToken).mockRejectedValue(new Error('token expired'))

		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer stale-token' }),
			makeEnv()
		)

		const response = (result as { response: Response }).response
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"')
		// Why it failed is not the caller's business — an expired token and one minted for another
		// resource answer the same — but a client does need to know to re-authenticate rather than stop.
		expect(await response.text()).not.toContain('token expired')
	})

	it('rejects a token with no subject', async () => {
		vi.mocked(verifyToken).mockResolvedValue({} as any)

		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer subjectless' }),
			makeEnv()
		)

		expect((result as { response: Response }).response.status).toBe(401)
	})

	// 403, not 401: the caller did authenticate and still may not in, which retrying the flow cannot
	// fix. A 401 here would have clients loop through sign-in forever.
	it('answers 403 for an authenticated user the flag does not cover', async () => {
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(false)

		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer good-token' }),
			makeEnv()
		)

		expect(result.ok).toBe(false)
		const response = (result as { response: Response }).response
		expect(response.status).toBe(403)
		expect(response.headers.get('WWW-Authenticate')).toBe(null)
		expect(isFeatureFlagEnabledForUser).toHaveBeenCalledWith(
			expect.anything(),
			'mcp_server_access',
			'user_123'
		)
	})

	it('accepts the bearer scheme case-insensitively and ignores surrounding space', async () => {
		expect(
			await authenticateMcpRequest(makeRequest({ authorization: '  bearer   tok  ' }), makeEnv())
		).toEqual({ ok: true, userId: 'user_123' })
		expect(verifyToken).toHaveBeenCalledWith('tok', expect.anything())
	})

	// Anything that is not a bearer token is treated as no token at all, so the client is told where to
	// authenticate rather than that its credential was bad.
	it('treats a non-bearer authorization header as unauthenticated', async () => {
		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Basic dXNlcjpwYXNz' }),
			makeEnv()
		)

		const response = (result as { response: Response }).response
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).not.toContain('error=')
		expect(verifyToken).not.toHaveBeenCalled()
	})
})
