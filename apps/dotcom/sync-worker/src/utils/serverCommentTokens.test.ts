import { describe, expect, it } from 'vitest'
import { Environment } from '../types'
import {
	ServerCommentGrant,
	getBearerToken,
	mintServerCommentToken,
	verifyServerCommentToken,
} from './serverCommentTokens'

const env = { SERVER_COMMENT_TOKEN_SECRET: 'test-secret' } as Environment

function makeGrant(overrides: Partial<ServerCommentGrant> = {}): ServerCommentGrant {
	return {
		v: 1,
		fileId: 'file-1',
		authorId: 'user_1',
		exp: Date.now() + 60_000,
		...overrides,
	}
}

describe('server comment tokens', () => {
	it('round-trips a grant', async () => {
		const grant = makeGrant()
		const verified = await verifyServerCommentToken(env, await mintServerCommentToken(env, grant))
		expect(verified).toEqual(grant)
	})

	it('rejects a token signed with a different secret', async () => {
		const token = await mintServerCommentToken(
			{ SERVER_COMMENT_TOKEN_SECRET: 'other-secret' } as Environment,
			makeGrant()
		)
		expect(await verifyServerCommentToken(env, token)).toBe(null)
	})

	it('rejects a tampered payload', async () => {
		const token = await mintServerCommentToken(env, makeGrant({ authorId: 'user_1' }))
		const [, signature] = token.split('.')
		const forged = Buffer.from(JSON.stringify(makeGrant({ authorId: 'user_2' })), 'utf8')
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')
		expect(await verifyServerCommentToken(env, `${forged}.${signature}`)).toBe(null)
	})

	it('rejects an expired grant', async () => {
		const token = await mintServerCommentToken(env, makeGrant({ exp: Date.now() - 1 }))
		expect(await verifyServerCommentToken(env, token)).toBe(null)
	})

	it('fails closed when no secret is configured', async () => {
		const token = await mintServerCommentToken(env, makeGrant())
		expect(await verifyServerCommentToken({} as Environment, token)).toBe(null)
	})

	it.each([['not-a-token'], ['a.b.c'], ['.'], ['']])(
		'rejects malformed token %j',
		async (token) => {
			expect(await verifyServerCommentToken(env, token)).toBe(null)
		}
	)

	it('reads a bearer token from the authorization header', () => {
		const req = new Request('https://example.com', { headers: { authorization: 'Bearer abc.def' } })
		expect(getBearerToken(req)).toBe('abc.def')
	})

	it.each([[{ authorization: 'abc.def' }], [{ authorization: 'Basic abc.def' }], [{}]])(
		'returns null for header %j',
		(headers) => {
			expect(getBearerToken(new Request('https://example.com', { headers }))).toBe(null)
		}
	)
})
