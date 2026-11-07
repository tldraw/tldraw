import { routes } from './routeDefs'

describe('routes', () => {
	it('prefixes the origin for asUrl, with or without route params', () => {
		const origin = window.location.origin
		expect(routes.tlaSsoCallback({ asUrl: true })).toBe(`${origin}/sso-callback`)
		expect(routes.tlaRoot({ asUrl: true, searchParams: { a: '1' } })).toBe(`${origin}/?a=1`)
		expect(routes.tlaFile('abc', { asUrl: true })).toBe(`${origin}/f/abc`)
	})

	it('returns a path without asUrl', () => {
		expect(routes.tlaSsoCallback()).toBe('/sso-callback')
		expect(routes.tlaFile('abc', { searchParams: { a: '1' } })).toBe('/f/abc?a=1')
	})
})
