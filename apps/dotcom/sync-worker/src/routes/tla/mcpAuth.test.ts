import { signJwt } from '@clerk/backend/jwt'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'
import {
	MCP_PROTECTED_RESOURCE_METADATA_PATH,
	McpAuthResult,
	authenticateMcpRequest,
	getMcpAuthorizationServer,
	getMcpProtectedResourceMetadata,
	getMcpResourceUrl,
	mcpCorsPreflight,
	withMcpCors,
} from './mcpAuth'

// Nothing in @clerk/backend is mocked. The one thing stubbed is global `fetch`, and only because
// there is no Clerk instance to fetch signing keys from: the SDK's JWKS request is answered with a key
// set built from a generated pair. Everything the SDK then does with those keys — signature, `typ`,
// `exp`, `sub` — runs for real.
//
// That matters because "`typ: at+jwt` is the only thing separating an access token from a session
// token" is the load-bearing claim of the file under test, and a mocked verifier cannot demonstrate
// it at all: an earlier version of this file mocked the whole verifier and its two "verification"
// tests were assertions about what the mock had been *called with*.
vi.mock('../../utils/featureFlags', () => ({ isFeatureFlagEnabledForUser: vi.fn() }))

const RESOURCE = 'https://www.tldraw.com/api/app/mcp'

// pk_test_<base64 of "clerk.tldraw.com$">, which is the shape Clerk publishable keys take.
const PUBLISHABLE_KEY = `pk_test_${btoa('clerk.tldraw.com$')}`

// The Clerk instance the publishable key above names, and so the `iss` a real token carries.
const ISSUER = 'https://clerk.tldraw.com'

const KEY_ID = 'test-signing-key'

// The instance's signing key, a second pair that stands for anybody else's, and the JWKS document the
// stubbed fetch hands the SDK.
let signingKey: JsonWebKey
let foreignKey: JsonWebKey
let jwks: { keys: (JsonWebKey & { kid: string })[] }

async function generateRsaPair() {
	const pair = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		},
		true,
		['sign', 'verify']
	)
	return {
		privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
		publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
	}
}

beforeAll(async () => {
	const instance = await generateRsaPair()
	signingKey = instance.privateJwk
	foreignKey = (await generateRsaPair()).privateJwk
	jwks = { keys: [{ ...instance.publicJwk, kid: KEY_ID, alg: 'RS256', use: 'sig' }] }
})

/**
 * A real, signed token. Every default is what Clerk actually issues — RFC 9068's `at+jwt`, the
 * instance as `iss`, a subject, a live `exp` — so each test overrides exactly the one thing it is
 * about, and no test can pass because two things were wrong at once.
 *
 * No `aud`: Clerk stamps none, so its absence here is the shape of a real token rather than an
 * omission. See authenticateMcpRequest for what stands in for that binding.
 */
async function signToken({
	key,
	typ = 'at+jwt',
	// `null` omits the claim entirely, which `undefined` could not: it would fall through to the
	// default here and quietly sign a perfectly good token.
	sub = 'user_123' as string | null,
	exp = (Math.floor(Date.now() / 1000) + 300) as number | null,
	claims = {} as Record<string, unknown>,
}: {
	key?: JsonWebKey
	typ?: string
	sub?: string | null
	exp?: number | null
	claims?: Record<string, unknown>
} = {}) {
	const payload: Record<string, unknown> = { iss: ISSUER, ...claims }
	if (sub !== null) payload.sub = sub
	if (exp !== null) payload.exp = exp
	return await signJwt(payload, key ?? signingKey, {
		algorithm: 'RS256',
		header: { typ, kid: KEY_ID },
	})
}

// The SDK caches a fetched key set per secret key for five minutes at module scope, which outlives
// `clearAllMocks`. A test that counts JWKS fetches needs a secret key nothing else has warmed.
let secretKeyCounter = 0

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

const bearer = (token: string) => makeRequest({ authorization: `Bearer ${token}` })

// Typed through the failure arm rather than a structural cast, so renaming `response` there breaks
// here at compile time instead of as an undefined read in every assertion.
function responseOf(result: McpAuthResult) {
	return (result as Extract<McpAuthResult, { ok: false }>).response
}

const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
	const url = input instanceof Request ? input.url : String(input)
	if (url.endsWith('/jwks')) return Response.json(jwks)
	throw new Error(`unexpected fetch during MCP auth: ${url}`)
})

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal('fetch', fetchMock)
	vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)
	// The refusal cases below are the expected way to see these logged, and a test run that prints them
	// reads like a failure. Tests that care which branch refused a token assert on the spy.
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('getMcpResourceUrl', () => {
	it('uses the configured URL', () => {
		expect(getMcpResourceUrl(makeRequest(), makeEnv())).toBe(RESOURCE)
	})

	// The fallback reads the request's own origin, and therefore the Host header. Deployments configure
	// the var so that a forged Host cannot move the advertised metadata or the challenge pointer to a
	// host of the caller's choosing.
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
			scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
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

// The endpoint and its metadata are deliberately outside the worker's origin allowlist, which exists
// to protect *cookie*-authenticated routes. A browser-context MCP client — the Inspector on
// localhost:6274, a web connector — is on no allowlist and never will be.
describe('MCP CORS', () => {
	it('allows any origin and exposes the challenge header', () => {
		const response = withMcpCors(new Response('ok'))

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		// Without this a browser client can see that it was refused but not the resource_metadata
		// pointer telling it where to sign in — so it cannot start the flow the 401 is inviting.
		expect(response.headers.get('Access-Control-Expose-Headers')).toContain('WWW-Authenticate')
	})

	it('keeps the body and status of the response it wraps', async () => {
		const response = withMcpCors(Response.json({ error: 'nope' }, { status: 401 }))

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: 'nope' })
	})

	it('answers a preflight with the same headers', () => {
		const response = mcpCorsPreflight()

		expect(response.status).toBe(204)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
	})
})

describe('authenticateMcpRequest', () => {
	// The pointer is the whole point of the 401: without it a client learns only that it was refused,
	// not where to send the user to sign in.
	it('answers 401 with a pointer to the metadata when there is no token', async () => {
		const result = await authenticateMcpRequest(makeRequest(), makeEnv())

		expect(result.ok).toBe(false)
		const response = responseOf(result)
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).toBe(
			`Bearer resource_metadata="https://www.tldraw.com${MCP_PROTECTED_RESOURCE_METADATA_PATH}", ` +
				`scope="openid profile email offline_access"`
		)
	})

	// The scope list is what stops a client guessing. Claude's hosted connectors request every scope
	// the authorization server advertises when the challenge names none, and Clerk advertises scopes
	// it grants each client only a subset of — so an unnamed list is refused with `invalid_scope` at
	// the authorization server, before consent and before any request reaches this worker.
	it('names the scopes a client should ask for', async () => {
		const result = await authenticateMcpRequest(makeRequest(), makeEnv())

		expect(responseOf(result).headers.get('WWW-Authenticate')).toContain(
			'scope="openid profile email offline_access"'
		)
	})

	// Two places state the scopes and a client may read either, so they cannot be allowed to drift:
	// a client that asks for what the metadata advertises and a client that asks for what the
	// challenge names have to end up asking for the same thing.
	it('names the same scopes in the challenge and the metadata', async () => {
		const result = await authenticateMcpRequest(makeRequest(), makeEnv())
		const challenge = responseOf(result).headers.get('WWW-Authenticate') ?? ''
		const metadata = (await getMcpProtectedResourceMetadata(makeRequest(), makeEnv()).json()) as {
			scopes_supported: string[]
		}

		expect(challenge).toContain(`scope="${metadata.scopes_supported.join(' ')}"`)
	})

	it('accepts a valid token and returns its subject', async () => {
		const result = await authenticateMcpRequest(bearer(await signToken()), makeEnv())

		expect(result).toEqual({ ok: true, userId: 'user_123' })
	})

	// The signing keys are the accepting instance's own, fetched from Clerk's Backend API with the
	// secret key — which is what binds a token to that instance without an `iss` check, and what keeps
	// the advertised authorization server (derived from the same instance's publishable key) and the
	// accepted issuer from drifting apart. Fetched once and reused: rebuilt per request it would put a
	// round trip to Clerk in front of every MCP call, so the second request here must not fetch again.
	it('fetches the signing keys from the Backend API once and reuses them', async () => {
		const secretKey = `sk_test_jwks_${secretKeyCounter++}`
		const env = makeEnv({ CLERK_SECRET_KEY: secretKey })

		await authenticateMcpRequest(bearer(await signToken()), env)
		await authenticateMcpRequest(bearer(await signToken()), env)

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0]
		expect(String(url)).toBe('https://api.clerk.com/v1/jwks')
		expect(init?.headers).toMatchObject({ Authorization: `Bearer ${secretKey}` })
	})

	// Without a secret key there is nothing to verify against, and without a derivable authorization
	// server no client could have been sent anywhere to get a token. Either is our misconfiguration
	// rather than a bad token, so it is logged as one — but answered like every other refusal, since
	// naming the difference would describe the deployment to someone guessing at it.
	it.each([
		['no secret key', { CLERK_SECRET_KEY: undefined }],
		['no derivable authorization server', { CLERK_PUBLISHABLE_KEY: undefined }],
	])('refuses as unconfigured with %s', async (_name, overrides) => {
		const result = await authenticateMcpRequest(bearer(await signToken()), makeEnv(overrides))

		expect(result).toMatchObject({ ok: false, reason: 'unconfigured' })
		expect(responseOf(result).status).toBe(401)
		expect(fetchMock).not.toHaveBeenCalled()
		expect(console.error).toHaveBeenCalledWith(
			'MCP token verification is unconfigured: no Clerk instance to verify against'
		)
	})

	// The ways a token can be wrong, each signed for real and each refused by the SDK's verifier rather
	// than by a mock returning what the test wanted. `typ` is the one that matters most: Clerk stamps
	// no `aud` on either kind of token, so the token type is the *only* thing separating an OAuth
	// access token from an ordinary tldraw.com session JWT. Accepting a session token would make a
	// website credential enough to drive this server, and the consent step an agent walks a user
	// through decoration.
	//
	// "Another issuer" is not a case of its own any more: with no `iss` check, what refuses a token
	// from another Clerk instance is that it is signed with a key that is not in our instance's key
	// set, which is the foreign-key case.
	describe.each([
		['a Clerk session JWT rather than an access token', () => signToken({ typ: 'JWT' })],
		[
			"a token signed with a key that is not in the instance's key set",
			() => signToken({ key: foreignKey }),
		],
		['an expired token', () => signToken({ exp: Math.floor(Date.now() / 1000) - 3600 })],
		// A token minted without `exp` would otherwise never expire; the SDK requires the claim.
		['a token with no expiry at all', () => signToken({ exp: null })],
		['a token with no subject', () => signToken({ sub: null })],
	])('refuses %s', (_name, makeToken) => {
		it('with a 401 that says invalid_token and no detail', async () => {
			const result = await authenticateMcpRequest(bearer(await makeToken()), makeEnv())

			expect(result).toMatchObject({ ok: false, reason: 'invalid_token' })
			const response = responseOf(result)
			expect(response.status).toBe(401)
			expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"')
			// Why it failed is not the caller's business — an expired token and one minted for another
			// resource answer the same — but a client does need to know to re-authenticate rather than
			// stop. One message covers all of them.
			expect(await response.json()).toEqual({
				error: 'invalid_token',
				error_description: 'The access token is expired, revoked, or issued for another resource',
			})
		})
	})

	it('accepts a token whose expiry is inside the clock tolerance', async () => {
		// Two seconds past, which a worker whose clock runs slightly fast would produce. Inside the 5s
		// skew @clerk/backend allows by default.
		const result = await authenticateMcpRequest(
			bearer(await signToken({ exp: Math.floor(Date.now() / 1000) - 2 })),
			makeEnv()
		)

		expect(result).toEqual({ ok: true, userId: 'user_123' })
	})

	// Only the SDK's reason and message are logged. The token itself, or a decoded payload, would put
	// `sub`, `client_id`, `scope` and `jti` — every one of the things the response refuses to disclose —
	// into a log with a wider audience than the caller.
	it('logs why verification failed without logging the token or its claims', async () => {
		const token = await signToken({
			typ: 'JWT',
			claims: { client_id: 'client_secretive', scope: 'profile email', jti: 'jti_secretive' },
		})

		await authenticateMcpRequest(bearer(token), makeEnv())

		const logged = vi.mocked(console.error).mock.calls.flat().join(' ')
		expect(logged).toContain('MCP token verification failed:')
		expect(logged).toContain('token-type-mismatch')
		expect(logged).not.toContain('client_secretive')
		expect(logged).not.toContain('jti_secretive')
		expect(logged).not.toContain(token)
	})

	// 403, not 401: the caller did authenticate and still may not in, which retrying the flow cannot
	// fix. A 401 here would have clients loop through sign-in forever.
	it('answers 403 for an authenticated user the flag does not cover', async () => {
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(false)

		const result = await authenticateMcpRequest(bearer(await signToken()), makeEnv())

		expect(result).toMatchObject({ ok: false, reason: 'not_allowlisted' })
		const response = responseOf(result)
		expect(response.status).toBe(403)
		expect(response.headers.get('WWW-Authenticate')).toBe(null)
		expect(isFeatureFlagEnabledForUser).toHaveBeenCalledWith(
			expect.anything(),
			'mcp_server_access',
			'user_123'
		)
	})

	// The reason rides on the refusal so the route can put it on a datapoint: during a flag-gated
	// rollout, "not signed in" and "signed in and not on the list" are the two numbers worth watching
	// and they call for entirely different responses.
	it('names no_token distinctly from the other refusals', async () => {
		const noToken = await authenticateMcpRequest(makeRequest(), makeEnv())

		expect(noToken).toMatchObject({ ok: false, reason: 'no_token' })
	})

	// The SDK only strips an exact `Bearer ` prefix, so the token is parsed here first and handed to it
	// re-wrapped; a client sending a lowercase or padded scheme must not be told its credential is bad.
	it('accepts the bearer scheme case-insensitively and ignores surrounding space', async () => {
		const token = await signToken()

		expect(
			await authenticateMcpRequest(
				makeRequest({ authorization: `  bearer   ${token}  ` }),
				makeEnv()
			)
		).toEqual({ ok: true, userId: 'user_123' })
	})

	// Anything that is not a bearer token is treated as no token at all, so the client is told where to
	// authenticate rather than that its credential was bad.
	it('treats a non-bearer authorization header as unauthenticated', async () => {
		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Basic dXNlcjpwYXNz' }),
			makeEnv()
		)

		const response = responseOf(result)
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).not.toContain('error=')
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
