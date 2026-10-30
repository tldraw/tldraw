import {
	ATTRIBUTION_COOKIE_NAME,
	Attribution,
	AttributionTouch,
	getAttributionTouch,
	getNextAttribution,
	readAttribution,
	recordAttributionPageView,
	removeAttribution,
} from './attribution'

const time = new Date('2026-10-30T12:00:00.000Z')

function visit(url: string) {
	;(globalThis as any).jsdom.reconfigure({ url })
}

function getWrittenAttributionCookies(setCookie: { mock: { calls: unknown[][] } }) {
	return setCookie.mock.calls
		.map(([value]) => value as string)
		.filter((value) => value.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`))
}

beforeEach(() => {
	;(globalThis as any).jsdom.cookieJar.removeAllCookiesSync()
})

afterEach(() => {
	vi.restoreAllMocks()
	visit('http://localhost:3000/')
})

describe('getAttributionTouch', () => {
	test('reads utm_* params and keeps only them in the landing page', () => {
		expect(
			getAttributionTouch({
				url: 'https://tldraw.dev/pricing?ref=nav&utm_source=newsletter&utm_medium=email&utm_campaign=launch&utm_content=hero&utm_term=canvas#plans',
				referrer: '',
				time,
			})
		).toEqual({
			s: 'newsletter',
			m: 'email',
			c: 'launch',
			ct: 'hero',
			l: 'https://tldraw.dev/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=launch&utm_content=hero&utm_term=canvas',
			t: '2026-10-30T12:00:00.000Z',
		})
	})

	test('records an external referrer as origin and path only', () => {
		expect(
			getAttributionTouch({
				url: 'https://tldraw.dev/docs?tab=1',
				referrer: 'https://news.ycombinator.com/item?id=123#comments',
				time,
			})
		).toEqual({
			r: 'https://news.ycombinator.com/item',
			l: 'https://tldraw.dev/docs',
			t: '2026-10-30T12:00:00.000Z',
		})
	})

	test.each([
		'https://tldraw.dev/quick-start',
		'https://www.tldraw.dev/',
		'https://docs.tldraw.dev/',
		'https://tldraw.com/',
		'https://www.tldraw.com/f/abc',
		'https://docs.tldraw.com/',
		'https://tldraw.link/x',
		'https://www.tldraw.link/x',
		'',
		'not a url',
	])('ignores an internal or empty referrer: %s', (referrer) => {
		expect(getAttributionTouch({ url: 'https://tldraw.dev/', referrer, time })).toBeNull()
	})

	test("treats the site's own host as internal wherever the script runs", () => {
		expect(
			getAttributionTouch({
				url: 'https://computer.tldraw.com/',
				referrer: 'https://computer.tldraw.com/projects',
				time,
			})
		).toBeNull()
	})

	test.each([
		'https://computer.tldraw.com/',
		'https://flash.tldraw.com/',
		'https://makereal.tldraw.com/',
		'https://fairies.tldraw.com/',
		'https://offline.tldraw.com/',
		'https://discord.tldraw.com/',
	])('treats product subdomains as external: %s', (referrer) => {
		expect(getAttributionTouch({ url: 'https://tldraw.dev/', referrer, time })).toEqual({
			r: referrer,
			l: 'https://tldraw.dev/',
			t: '2026-10-30T12:00:00.000Z',
		})
	})

	test('ignores empty utm_* params', () => {
		expect(
			getAttributionTouch({
				url: 'https://tldraw.dev/?utm_source=&utm_medium=',
				referrer: '',
				time,
			})
		).toBeNull()
	})

	test('counts any utm_* param, not only the four it stores', () => {
		expect(
			getAttributionTouch({ url: 'https://tldraw.dev/?utm_id=42', referrer: '', time })
		).toEqual({ l: 'https://tldraw.dev/?utm_id=42', t: '2026-10-30T12:00:00.000Z' })
	})
})

describe('getNextAttribution', () => {
	const first: AttributionTouch = { s: 'google', l: 'https://tldraw.dev/', t: 'a' }
	const second: AttributionTouch = { r: 'https://x.com/', l: 'https://tldraw.dev/', t: 'b' }
	const third: AttributionTouch = { s: 'newsletter', l: 'https://tldraw.dev/', t: 'c' }

	test('sets first and last from the first touch', () => {
		expect(getNextAttribution(null, first)).toEqual({ v: 1, first, last: first })
	})

	test('never overwrites first and always replaces last', () => {
		const once = getNextAttribution(null, first)
		const twice = getNextAttribution(once, second)
		expect(twice).toEqual({ v: 1, first, last: second })
		expect(getNextAttribution(twice, third)).toEqual({ v: 1, first, last: third })
	})
})

describe('recordAttributionPageView', () => {
	test('writes the cookie described in the contract', () => {
		visit('https://www.tldraw.dev/pricing?utm_source=google')
		const setCookie = vi.spyOn(document, 'cookie', 'set')

		recordAttributionPageView({ url: window.location.href, referrer: '', time })

		const touch = {
			s: 'google',
			l: 'https://www.tldraw.dev/pricing?utm_source=google',
			t: time.toISOString(),
		}
		const expected: Attribution = { v: 1, first: touch, last: touch }
		expect(getWrittenAttributionCookies(setCookie)).toEqual([
			`tl_attribution=${encodeURIComponent(JSON.stringify(expected))}; Max-Age=15552000; Path=/; Domain=tldraw.dev; SameSite=Lax; Secure`,
		])
		expect(readAttribution()).toEqual(expected)

		// Domain=tldraw.dev makes it readable on the bare domain too.
		visit('https://tldraw.dev/')
		expect(readAttribution()).toEqual(expected)
	})

	test('keeps first and only replaces last on a utm_* param or an external referrer', () => {
		visit('https://tldraw.dev/')
		const landing = { url: 'https://tldraw.dev/?utm_source=google', referrer: '', time }
		recordAttributionPageView(landing)
		const first = readAttribution()!.first

		recordAttributionPageView({
			url: 'https://tldraw.dev/docs',
			referrer: 'https://www.tldraw.com/',
			time: new Date('2026-10-31T00:00:00.000Z'),
		})
		recordAttributionPageView({
			url: 'https://tldraw.dev/docs',
			referrer: '',
			time: new Date('2026-10-31T00:00:00.000Z'),
		})
		expect(readAttribution()).toEqual({ v: 1, first, last: first })

		recordAttributionPageView({
			url: 'https://tldraw.dev/pricing',
			referrer: 'https://github.com/tldraw/tldraw?tab=readme',
			time: new Date('2026-11-01T00:00:00.000Z'),
		})
		const afterReferrer = readAttribution()
		expect(afterReferrer).toEqual({
			v: 1,
			first,
			last: {
				r: 'https://github.com/tldraw/tldraw',
				l: 'https://tldraw.dev/pricing',
				t: '2026-11-01T00:00:00.000Z',
			},
		})

		recordAttributionPageView({
			url: 'https://tldraw.dev/?utm_source=newsletter&utm_campaign=launch',
			referrer: '',
			time: new Date('2026-11-02T00:00:00.000Z'),
		})
		expect(readAttribution()).toEqual({
			v: 1,
			first,
			last: {
				s: 'newsletter',
				c: 'launch',
				l: 'https://tldraw.dev/?utm_source=newsletter&utm_campaign=launch',
				t: '2026-11-02T00:00:00.000Z',
			},
		})
	})

	test('replaces a malformed cookie', () => {
		visit('https://tldraw.dev/')
		document.cookie = `${ATTRIBUTION_COOKIE_NAME}=not-json; Path=/`
		expect(readAttribution()).toBeNull()

		recordAttributionPageView({ url: 'https://tldraw.dev/?utm_source=x', referrer: '', time })
		expect(readAttribution()?.first.s).toBe('x')
	})

	test.each([
		['http://localhost:3000/?utm_source=x', 'Path=/; SameSite=Lax'],
		['http://127.0.0.1:3000/?utm_source=x', 'Path=/; SameSite=Lax'],
		[
			'https://pr-123.vercel.app/?utm_source=x',
			'Path=/; Domain=pr-123.vercel.app; SameSite=Lax; Secure',
		],
	])('falls back to a narrower cookie on %s', (url, attributes) => {
		visit(url)
		const setCookie = vi.spyOn(document, 'cookie', 'set')

		recordAttributionPageView({ url, referrer: '', time })

		const [written] = getWrittenAttributionCookies(setCookie)
		expect(written.endsWith(`; Max-Age=15552000; ${attributes}`)).toBe(true)
		expect(readAttribution()?.first.s).toBe('x')
	})
})

describe('removeAttribution', () => {
	test('removes a cookie set on the registrable domain from a subdomain', () => {
		visit('https://www.tldraw.dev/')
		recordAttributionPageView({ url: 'https://www.tldraw.dev/?utm_source=x', referrer: '', time })
		expect(readAttribution()).not.toBeNull()

		removeAttribution()

		expect(readAttribution()).toBeNull()
		visit('https://tldraw.dev/')
		expect(readAttribution()).toBeNull()
	})
})
