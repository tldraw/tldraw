import { createRemoteJWKSet, jwtVerify } from 'jose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'
import {
	MCP_PROTECTED_RESOURCE_METADATA_PATH,
	McpAuthResult,
	authenticateMcpRequest,
	getMcpAuthorizationServer,
	getMcpProtectedResourceMetadata,
	getMcpResourceUrl,
} from './mcpAuth'

const REMOTE_KEY_SET = Symbol('remote key set')
vi.mock('jose', () => ({
	jwtVerify: vi.fn(),
	createRemoteJWKSet: vi.fn(() => REMOTE_KEY_SET),
}))
vi.mock('../../utils/featureFlags', () => ({ isFeatureFlagEnabledForUser: vi.fn() }))

const RESOURCE = 'https://www.tldraw.com/api/app/mcp'

// pk_test_<base64 of "clerk.tldraw.com$">, which is the shape Clerk publishable keys take.
const PUBLISHABLE_KEY = `pk_test_${btoa('clerk.tldraw.com$')}`

// The Clerk instance the publishable key above names, which is both the issuer tokens are checked
// against and the origin their signing keys are fetched from.
const ISSUER = 'https://clerk.tldraw.com'

// jose resolves to `{ payload }` rather than the payload itself.
function mockVerifiedPayload(payload: Record<string, unknown>) {
	vi.mocked(jwtVerify).mockResolvedValue({ payload } as any)
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

// Typed through the failure arm rather than a structural cast, so renaming `response` there breaks
// here at compile time instead of as an undefined read in every assertion.
function responseOf(result: McpAuthResult) {
	return (result as Extract<McpAuthResult, { ok: false }>).response
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifiedPayload({ sub: 'user_123', aud: RESOURCE })
	vi.mocked(isFeatureFlagEnabledForUser).mockResolvedValue(true)
	// The audience cases below are the expected way to see these logged, and a test run that prints
	// them reads like a failure. Tests that care which branch refused a token assert on the spies.
	vi.spyOn(console, 'error').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
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
		const response = responseOf(result)
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

	// Verification is asked about the signature, the issuer, the lifetime and the token type, and
	// nothing else. The audience is deliberately not delegated to jose's `audience` option: it throws
	// inside verification for a missing `aud` as well as a wrong one, upstream of the escape hatch and
	// the diagnostic log, so `namesResource` owns that decision instead.
	it('verifies against the issuer without delegating the audience check', async () => {
		await authenticateMcpRequest(makeRequest({ authorization: 'Bearer good-token' }), makeEnv())

		expect(jwtVerify).toHaveBeenCalledWith('good-token', REMOTE_KEY_SET, {
			issuer: ISSUER,
			typ: 'at+jwt',
			clockTolerance: 5,
		})
	})

	// Clerk stamps no `aud` on an OAuth access token, so the audience check cannot tell one apart from
	// a Clerk *session* JWT. The token type is what does: sessions carry `typ: JWT`, and accepting one
	// would make a tldraw.com website credential a bearer token here.
	it('requires the RFC 9068 access token type', async () => {
		await authenticateMcpRequest(makeRequest({ authorization: 'Bearer good-token' }), makeEnv())

		expect(vi.mocked(jwtVerify).mock.calls[0][2]).toMatchObject({ typ: 'at+jwt' })
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

		await authenticateMcpRequest(makeRequest({ authorization: 'Bearer tok' }), env)
		await authenticateMcpRequest(makeRequest({ authorization: 'Bearer tok' }), env)

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
			makeRequest({ authorization: 'Bearer good-token' }),
			makeEnv({ CLERK_PUBLISHABLE_KEY: undefined })
		)

		expect(responseOf(result).status).toBe(401)
		expect(jwtVerify).not.toHaveBeenCalled()
		expect(console.error).toHaveBeenCalledWith(
			'MCP token verification is unconfigured: no authorization server to verify against'
		)
	})

	// RFC 8707: the audience is what stops a token the user granted to some other MCP server being
	// replayed against this one. It is checked against the payload's `aud` — see above for why the
	// check is not the verifier's.
	describe('audience', () => {
		async function authenticateWithAudience(
			aud: unknown,
			envOverrides: Partial<Record<string, unknown>> = {}
		) {
			mockVerifiedPayload({ sub: 'user_123', aud })
			return authenticateMcpRequest(
				makeRequest({ authorization: 'Bearer tok' }),
				makeEnv(envOverrides)
			)
		}

		// The shape a Clerk *session* JWT takes. Accepting it would make a tldraw.com website credential
		// a bearer token here, and the agent's consent step decoration.
		it('refuses a token that carries no audience', async () => {
			const result = await authenticateWithAudience(undefined)

			expect(result.ok).toBe(false)
			const response = responseOf(result)
			expect(response.status).toBe(401)
			expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"')
		})

		it('refuses a token minted for another resource', async () => {
			const result = await authenticateWithAudience('https://example.com/api/app/mcp')

			expect(result.ok).toBe(false)
			expect(responseOf(result).status).toBe(401)
		})

		// A rejected audience and a missing subject answer exactly as an expired token does — the caller
		// can act on none of the differences, and naming one would tell someone guessing which guess was
		// closest.
		it('says no more about an audience mismatch or a missing subject than about any other bad token', async () => {
			const mismatched = await authenticateWithAudience('https://example.com/api/app/mcp')
			mockVerifiedPayload({ aud: RESOURCE })
			const subjectless = await authenticateMcpRequest(
				makeRequest({ authorization: 'Bearer tok' }),
				makeEnv()
			)
			vi.mocked(jwtVerify).mockRejectedValue(new Error('token expired'))
			const expired = await authenticateMcpRequest(
				makeRequest({ authorization: 'Bearer tok' }),
				makeEnv()
			)

			const expiredBody = await responseOf(expired).text()
			expect(await responseOf(mismatched).text()).toBe(expiredBody)
			expect(await responseOf(subjectless).text()).toBe(expiredBody)
		})

		it('accepts a token whose audience names this resource', async () => {
			expect(await authenticateWithAudience(RESOURCE)).toEqual({ ok: true, userId: 'user_123' })
		})

		// `aud` is an array as often as a string, and a token may legitimately name several resources.
		it('accepts an audience array that includes this resource', async () => {
			expect(await authenticateWithAudience(['https://example.com/api/app/mcp', RESOURCE])).toEqual(
				{ ok: true, userId: 'user_123' }
			)
		})

		it('refuses an audience array that does not', async () => {
			const result = await authenticateWithAudience(['https://example.com/api/app/mcp'])

			expect(responseOf(result).status).toBe(401)
		})

		// Compared on normalized URLs. Every non-production environment ships with the hatch open, so
		// the enforcing comparison first runs for real in production — where a cosmetic difference
		// between what Clerk stamps and MCP_SERVER_URL must not refuse every token with no runtime
		// lever.
		it.each([
			'https://www.tldraw.com/api/app/mcp/',
			'HTTPS://WWW.TLDRAW.COM/api/app/mcp',
			'https://www.tldraw.com:443/api/app/mcp',
		])('accepts %s as naming this resource', async (aud) => {
			expect(await authenticateWithAudience(aud)).toEqual({ ok: true, userId: 'user_123' })
		})

		it('normalizes the configured resource the same way', async () => {
			expect(await authenticateWithAudience(RESOURCE, { MCP_SERVER_URL: `${RESOURCE}/` })).toEqual({
				ok: true,
				userId: 'user_123',
			})
		})

		it('refuses an audience that is not a URL at all', async () => {
			expect(responseOf(await authenticateWithAudience('not a resource url')).status).toBe(401)
		})

		// Nothing is checked before the flag gate that the flag gate would have caught anyway: a token
		// for the wrong resource must not reach a KV read keyed on the subject it claims.
		it('refuses before consulting the access flag', async () => {
			await authenticateWithAudience(undefined)

			expect(isFeatureFlagEnabledForUser).not.toHaveBeenCalled()
		})

		// The escape hatch exists so staging and preview can exercise the flow before the Clerk instance
		// is known to stamp the resource indicator. Everything here is about it not becoming the way
		// this ships.
		describe('MCP_REQUIRE_TOKEN_AUDIENCE', () => {
			it('accepts a mismatched audience when explicitly turned off', async () => {
				expect(
					await authenticateWithAudience('https://example.com/api/app/mcp', {
						MCP_REQUIRE_TOKEN_AUDIENCE: 'false',
					})
				).toEqual({ ok: true, userId: 'user_123' })
			})

			// The shape the hatch actually exists for: a Clerk instance that stamps no `aud` at all.
			it('accepts a token with no audience when explicitly turned off', async () => {
				expect(
					await authenticateWithAudience(undefined, { MCP_REQUIRE_TOKEN_AUDIENCE: 'false' })
				).toEqual({ ok: true, userId: 'user_123' })
			})

			// Still refused on the way past the hatch — turning the check off must not turn off the
			// things that do not depend on it.
			it('still refuses a token with no subject while turned off', async () => {
				mockVerifiedPayload({ aud: RESOURCE })

				const result = await authenticateMcpRequest(
					makeRequest({ authorization: 'Bearer tok' }),
					makeEnv({ MCP_REQUIRE_TOKEN_AUDIENCE: 'false' })
				)

				expect(responseOf(result).status).toBe(401)
			})

			// The whole reason the hatch is survivable: an environment running without the check still
			// reports what it would have refused, so the Clerk side can be settled from staging's logs
			// rather than from production's failures. One constant message with a structured payload, at
			// warn — with the hatch open this line is the steady state of every call, not an incident.
			it('reports the audience it would have refused', async () => {
				await authenticateWithAudience('https://example.com/api/app/mcp', {
					MCP_REQUIRE_TOKEN_AUDIENCE: 'false',
				})

				expect(console.warn).toHaveBeenCalledWith(
					'MCP token audience does not name this resource',
					{
						aud: 'https://example.com/api/app/mcp',
						expected: RESOURCE,
						enforced: false,
					}
				)
			})

			// Unset is the state a new environment, a dropped var and a typo all land in, so it has to be
			// the strict one. Only the exact word opts out; "no" and "0" do not.
			it.each([undefined, '', 'true', 'no', '0', 'flase'])(
				'enforces when the var is %o',
				async (value) => {
					const result = await authenticateWithAudience(undefined, {
						MCP_REQUIRE_TOKEN_AUDIENCE: value,
					})

					expect(responseOf(result).status).toBe(401)
				}
			)

			// Case and surrounding space are normalized, matching MCP_SCREENSHOT_ENABLED. Nobody writes
			// "FALSE" meaning "enforce", so tolerating it costs nothing a typo would have found.
			it('opts out for the word in any case', async () => {
				expect(
					await authenticateWithAudience(undefined, { MCP_REQUIRE_TOKEN_AUDIENCE: '  FALSE ' })
				).toEqual({ ok: true, userId: 'user_123' })
			})

			// Production is the one environment where the binding is load-bearing, so the hatch is not
			// consulted there at all.
			it('is ignored in production', async () => {
				const result = await authenticateWithAudience(undefined, {
					MCP_REQUIRE_TOKEN_AUDIENCE: 'false',
					TLDRAW_ENV: 'production',
				})

				expect(result.ok).toBe(false)
				expect(responseOf(result).status).toBe(401)
			})
		})
	})

	it('answers 401 invalid_token when verification fails', async () => {
		vi.mocked(jwtVerify).mockRejectedValue(new Error('token expired'))

		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer stale-token' }),
			makeEnv()
		)

		const response = responseOf(result)
		expect(response.status).toBe(401)
		expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"')
		// Why it failed is not the caller's business — an expired token and one minted for another
		// resource answer the same — but a client does need to know to re-authenticate rather than stop.
		expect(await response.text()).not.toContain('token expired')
		// The verification branch, not the audience one: the two refusals log differently even though
		// they answer identically.
		expect(console.error).toHaveBeenCalledWith('MCP token verification failed:', expect.any(Error))
		expect(console.warn).not.toHaveBeenCalled()
	})

	it('rejects a token with no subject', async () => {
		mockVerifiedPayload({})

		const result = await authenticateMcpRequest(
			makeRequest({ authorization: 'Bearer subjectless' }),
			makeEnv()
		)

		expect(responseOf(result).status).toBe(401)
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
		const response = responseOf(result)
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
		expect(jwtVerify).toHaveBeenCalledWith('tok', expect.anything(), expect.anything())
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
