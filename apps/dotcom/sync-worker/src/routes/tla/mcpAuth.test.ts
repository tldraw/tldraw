import {
	JWTPayload,
	SignJWT,
	createLocalJWKSet,
	createRemoteJWKSet,
	exportJWK,
	generateKeyPair,
	jwtVerify,
} from 'jose'
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

// `createRemoteJWKSet` is the only thing mocked here, and only because there is no Clerk instance to
// fetch keys from: it is pointed at a local key set built from a generated pair instead. Everything
// jose then does with those keys — signature, `iss`, `typ`, `exp` — runs for real.
//
// It used to be the whole module, and the two tests that looked like verification coverage were
// assertions about what the mock had been *called with*. Nothing showed that an expired token, one
// signed by another key, one from another issuer, or a Clerk *session* JWT was actually refused — and
// "`typ: at+jwt` is the only thing separating an access token from a session token" is the
// load-bearing claim of the file under test. A mocked verifier cannot demonstrate it at all.
//
// `jwtVerify` is still wrapped in a spy so the call-shape assertions below can coexist with the real
// verification; the spy delegates to jose's own implementation.
vi.mock('jose', async (importOriginal) => {
	const actual = await importOriginal<typeof import('jose')>()
	return { ...actual, jwtVerify: vi.fn(actual.jwtVerify), createRemoteJWKSet: vi.fn() }
})
vi.mock('../../utils/featureFlags', () => ({ isFeatureFlagEnabledForUser: vi.fn() }))

const RESOURCE = 'https://www.tldraw.com/api/app/mcp'

// pk_test_<base64 of "clerk.tldraw.com$">, which is the shape Clerk publishable keys take.
const PUBLISHABLE_KEY = `pk_test_${btoa('clerk.tldraw.com$')}`

// The Clerk instance the publishable key above names, which is both the issuer tokens are checked
// against and the origin their signing keys are fetched from.
const ISSUER = 'https://clerk.tldraw.com'

const KEY_ID = 'test-signing-key'

// Inferred rather than named: jose exports no key type of its own, and what generateKeyPair hands
// back differs between the Web Crypto and Node builds.
type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey']

// The instance's signing key, and a second pair that stands for anybody else's.
let signingKey: SigningKey
let foreignKey: SigningKey
let keySet: ReturnType<typeof createLocalJWKSet>

beforeAll(async () => {
	const pair = await generateKeyPair('RS256', { extractable: true })
	signingKey = pair.privateKey
	foreignKey = (await generateKeyPair('RS256', { extractable: true })).privateKey
	keySet = createLocalJWKSet({
		keys: [{ ...(await exportJWK(pair.publicKey)), kid: KEY_ID, alg: 'RS256', use: 'sig' }],
	})
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
	issuer = ISSUER,
	typ = 'at+jwt',
	// `null` omits the claim entirely, which `undefined` could not: it would fall through to the
	// default here and quietly sign a perfectly good token.
	sub = 'user_123' as string | null,
	exp = (Math.floor(Date.now() / 1000) + 300) as number | null,
	claims = {} as JWTPayload,
}: {
	key?: SigningKey
	issuer?: string
	typ?: string
	sub?: string | null
	exp?: number | null
	claims?: JWTPayload
} = {}) {
	let jwt = new SignJWT(claims)
		.setProtectedHeader({ alg: 'RS256', typ, kid: KEY_ID })
		.setIssuer(issuer)
		.setIssuedAt()
	if (sub !== null) jwt = jwt.setSubject(sub)
	if (exp !== null) jwt = jwt.setExpirationTime(exp)
	return jwt.sign(key ?? signingKey)
}

// Hands the key-set test an issuer nothing else has cached. See its comment.
let jwksTestCounter = 0

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

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(createRemoteJWKSet).mockReturnValue(keySet as any)
	vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)
	// The refusal cases below are the expected way to see these logged, and a test run that prints them
	// reads like a failure. Tests that care which branch refused a token assert on the spy.
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
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
			`Bearer resource_metadata="https://www.tldraw.com${MCP_PROTECTED_RESOURCE_METADATA_PATH}"`
		)
	})

	it('accepts a valid token and returns its subject', async () => {
		const result = await authenticateMcpRequest(bearer(await signToken()), makeEnv())

		expect(result).toEqual({ ok: true, userId: 'user_123' })
	})

	// Verification is asked about the signature, the issuer, the lifetime and the token type, and
	// nothing else. No `audience` option in particular: Clerk stamps no `aud`, so requiring one would
	// refuse every token it issues — see authenticateMcpRequest for what stands in for that binding.
	it('verifies against the issuer without requiring an audience', async () => {
		const token = await signToken()

		await authenticateMcpRequest(bearer(token), makeEnv())

		expect(jwtVerify).toHaveBeenCalledWith(token, keySet, {
			issuer: ISSUER,
			typ: 'at+jwt',
			requiredClaims: ['exp'],
			clockTolerance: 5,
		})
	})

	// The signing keys come from the same Clerk instance the publishable key names, so the authorization
	// server clients are sent to and the keys their tokens are checked against cannot drift apart. Held
	// per issuer at module scope: rebuilt per request it would fetch JWKS in front of every MCP call,
	// so the second request here must reuse the first one's key set.
	//
	// Its own issuer, because that module-scope cache outlives `clearAllMocks` — a shared one would
	// make this pass or fail on whether another test happened to warm it first.
	it('fetches signing keys from the issuer once and reuses them', async () => {
		const host = `clerk.jwks-${jwksTestCounter++}.example`
		const env = makeEnv({ CLERK_PUBLISHABLE_KEY: `pk_test_${btoa(`${host}$`)}` })

		await authenticateMcpRequest(bearer(await signToken({ issuer: `https://${host}` })), env)
		await authenticateMcpRequest(bearer(await signToken({ issuer: `https://${host}` })), env)

		expect(createRemoteJWKSet).toHaveBeenCalledTimes(1)
		expect(createRemoteJWKSet).toHaveBeenCalledWith(
			new URL(`https://${host}/.well-known/jwks.json`)
		)
	})

	// Without a derivable authorization server there is nothing to verify against. That is our
	// misconfiguration rather than a bad token, so it is logged as one — but answered like every other
	// refusal, since naming the difference would describe the deployment to someone guessing at it.
	it('refuses when no authorization server can be derived', async () => {
		const result = await authenticateMcpRequest(
			bearer(await signToken()),
			makeEnv({ CLERK_PUBLISHABLE_KEY: undefined })
		)

		expect(responseOf(result).status).toBe(401)
		expect(jwtVerify).not.toHaveBeenCalled()
		expect(console.error).toHaveBeenCalledWith(
			'MCP token verification is unconfigured: no authorization server to verify against'
		)
	})

	// The four ways a token can be wrong, each signed for real and each refused by jose rather than by
	// a mock returning what the test wanted. `typ` is the one that matters most: Clerk stamps no `aud`
	// on either kind of token, so the token type is the *only* thing separating an OAuth access token
	// from an ordinary tldraw.com session JWT. Accepting a session token would make a website
	// credential enough to drive this server, and the consent step an agent walks a user through
	// decoration.
	describe.each([
		['a Clerk session JWT rather than an access token', () => signToken({ typ: 'JWT' })],
		['a token signed by another key', () => signToken({ key: foreignKey })],
		['a token from another issuer', () => signToken({ issuer: 'https://clerk.evil.example' })],
		['an expired token', () => signToken({ exp: Math.floor(Date.now() / 1000) - 3600 })],
		// jose requires only the claims it is told to require, so without `requiredClaims: ['exp']` a
		// token minted without one would verify here and then never expire.
		['a token with no expiry at all', () => signToken({ exp: null })],
		['a token with no subject', () => signToken({ sub: null })],
	])('refuses %s', (_name, makeToken) => {
		it('with a 401 that says invalid_token and no detail', async () => {
			const result = await authenticateMcpRequest(bearer(await makeToken()), makeEnv())

			expect(result.ok).toBe(false)
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
		// tolerance @clerk/backend allowed by default, kept so swapping the verifier changed nothing.
		const result = await authenticateMcpRequest(
			bearer(await signToken({ exp: Math.floor(Date.now() / 1000) - 2 })),
			makeEnv()
		)

		expect(result).toEqual({ ok: true, userId: 'user_123' })
	})

	// jose hangs the decoded payload off its errors, so logging the error object would write `sub`,
	// `client_id`, `scope` and `jti` — every one of the things the response above refuses to disclose —
	// into a log with a wider audience than the caller.
	it('logs why verification failed without logging the token payload', async () => {
		const token = await signToken({
			typ: 'JWT',
			claims: { client_id: 'client_secretive', scope: 'profile email', jti: 'jti_secretive' },
		})

		await authenticateMcpRequest(bearer(token), makeEnv())

		const logged = vi.mocked(console.error).mock.calls.flat().join(' ')
		expect(logged).toContain('MCP token verification failed:')
		expect(logged).not.toContain('client_secretive')
		expect(logged).not.toContain('jti_secretive')
		expect(logged).not.toContain(token)
	})

	// 403, not 401: the caller did authenticate and still may not in, which retrying the flow cannot
	// fix. A 401 here would have clients loop through sign-in forever.
	it('answers 403 for an authenticated user the flag does not cover', async () => {
		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(false)

		const result = await authenticateMcpRequest(bearer(await signToken()), makeEnv())

		expect(result.ok).toBe(false)
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
	it('names why it refused, distinctly per reason', async () => {
		const noToken = await authenticateMcpRequest(makeRequest(), makeEnv())
		expect(noToken).toMatchObject({ ok: false, reason: 'no_token' })

		const bad = await authenticateMcpRequest(bearer(await signToken({ typ: 'JWT' })), makeEnv())
		expect(bad).toMatchObject({ ok: false, reason: 'invalid_token' })

		const unconfigured = await authenticateMcpRequest(
			bearer(await signToken()),
			makeEnv({ CLERK_PUBLISHABLE_KEY: undefined })
		)
		expect(unconfigured).toMatchObject({ ok: false, reason: 'unconfigured' })

		vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(false)
		const refused = await authenticateMcpRequest(bearer(await signToken()), makeEnv())
		expect(refused).toMatchObject({ ok: false, reason: 'not_allowlisted' })
	})

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
		expect(jwtVerify).not.toHaveBeenCalled()
	})
})
