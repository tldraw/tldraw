import { describe, expect, it } from 'vitest'
import { blockUnknownOrigins, isAllowedOrigin } from './origins'

const env = { IS_LOCAL: undefined }

function request(headers: Record<string, string>, url = 'https://www.tldraw.com/api/app/admin/x') {
	return new Request(url, { headers })
}

describe('isAllowedOrigin', () => {
	it.each([
		'https://tldraw.com',
		'https://www.tldraw.com',
		'https://tldraw.dev',
		'https://tldrawusercontent.com',
		'http://localhost:3000',
	])('allows %s', (origin) => {
		expect(isAllowedOrigin(origin)).toBe(origin)
	})

	it.each(['https://evil.com', 'https://tldraw.com.evil.com', ''])('rejects %s', (origin) => {
		expect(isAllowedOrigin(origin)).toBeUndefined()
	})
})

describe('blockUnknownOrigins', () => {
	it('allows a same-origin request', async () => {
		expect(
			await blockUnknownOrigins(request({ 'sec-fetch-site': 'same-origin' }), env)
		).toBeUndefined()
	})

	it('allows a request from an allowed origin', async () => {
		expect(
			await blockUnknownOrigins(
				request({ origin: 'https://tldraw.com', 'sec-fetch-site': 'cross-site' }),
				env
			)
		).toBeUndefined()
	})

	it('blocks a request from an unknown origin', async () => {
		const response = await blockUnknownOrigins(request({ origin: 'https://evil.com' }), env)
		expect(response?.status).toBe(403)
	})

	// Browsers omit Origin on a top-level GET navigation, so a link followed from another site
	// arrives with no Origin but with the user's cookies. Sec-Fetch-Site is what distinguishes it
	// from a request the user started themselves.
	it('blocks a cross-site navigation that carries no origin', async () => {
		const response = await blockUnknownOrigins(request({ 'sec-fetch-site': 'cross-site' }), env)
		expect(response?.status).toBe(403)
	})

	it.each(['none', 'same-site'])(
		'allows a %s request that carries no origin',
		async (secFetchSite) => {
			expect(
				await blockUnknownOrigins(request({ 'sec-fetch-site': secFetchSite }), env)
			).toBeUndefined()
		}
	)

	// Non-browser callers send neither header, and have no ambient session to borrow.
	it('allows a request with neither origin nor sec-fetch-site', async () => {
		expect(await blockUnknownOrigins(request({}), env)).toBeUndefined()
	})

	it('allows the auth callback regardless of origin', async () => {
		expect(
			await blockUnknownOrigins(
				request({ origin: 'https://evil.com' }, 'https://www.tldraw.com/auth/callback'),
				env
			)
		).toBeUndefined()
	})

	it('allows anything when running locally', async () => {
		expect(
			await blockUnknownOrigins(request({ 'sec-fetch-site': 'cross-site' }), { IS_LOCAL: 'true' })
		).toBeUndefined()
	})
})
