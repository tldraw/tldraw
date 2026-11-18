import {
	addAppOriginParams,
	getAppOriginParams,
	getDotDevUrl,
	withAppOrigin,
} from './appOriginLinks'

const mocks = vi.hoisted(() => ({
	consent: null as { analytics: boolean } | null,
	personInfo: undefined as unknown,
}))

vi.mock('./analytics', () => ({
	cookieConsent: { get: () => mocks.consent },
	getPosthogInitialPersonInfo: () => mocks.personInfo,
}))

const DOT_DEV_URL = getDotDevUrl('top-left-logo')

const GOOGLE_CPC = {
	r: 'https://www.google.com/search?q=whiteboard',
	u: 'https://www.tldraw.com/?utm_source=google&utm_medium=cpc&utm_campaign=brand',
}

beforeEach(() => {
	mocks.consent = null
	mocks.personInfo = undefined
})

describe('getDotDevUrl', () => {
	it('keeps the exact href the dotcom links have always used', () => {
		expect(getDotDevUrl('sidebar-link')).toBe(
			'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'
		)
	})
})

describe('getAppOriginParams', () => {
	it('reads the landing utm_* tags and the referrer hostname', () => {
		expect(getAppOriginParams(GOOGLE_CPC)).toEqual([
			['tl_os', 'google'],
			['tl_om', 'cpc'],
			['tl_oc', 'brand'],
			['tl_or', 'www.google.com'],
		])
	})

	it('skips a $direct referrer', () => {
		expect(getAppOriginParams({ r: '$direct', u: 'https://www.tldraw.com/?utm_source=x' })).toEqual(
			[['tl_os', 'x']]
		)
	})

	it('skips tldraw.com referrers', () => {
		for (const r of [
			'https://tldraw.com/',
			'https://www.tldraw.com/f/abc',
			'https://TLDRAW.COM/',
		]) {
			expect(getAppOriginParams({ r, u: 'https://www.tldraw.com/' })).toEqual([])
		}
	})

	it('keeps referrers that only look like tldraw.com', () => {
		expect(getAppOriginParams({ r: 'https://nottldraw.com/', u: undefined })).toEqual([
			['tl_or', 'nottldraw.com'],
		])
	})

	it('skips empty and unparseable values', () => {
		expect(getAppOriginParams({ r: '', u: '' })).toEqual([])
		expect(getAppOriginParams({ r: 'not a url', u: 'also not a url' })).toEqual([])
		expect(
			getAppOriginParams({
				r: '$direct',
				u: 'https://www.tldraw.com/?utm_source=&utm_medium=%20%20&utm_campaign=c',
			})
		).toEqual([['tl_oc', 'c']])
	})

	it('ignores anything that is not person info', () => {
		expect(getAppOriginParams(undefined)).toEqual([])
		expect(getAppOriginParams(null)).toEqual([])
		expect(getAppOriginParams('$direct')).toEqual([])
		expect(getAppOriginParams({ r: 42, u: ['x'] })).toEqual([])
	})

	it('trims and caps values at 500 characters', () => {
		const long = 'a'.repeat(600)
		expect(
			getAppOriginParams({ r: '$direct', u: `https://www.tldraw.com/?utm_source=%20${long}` })
		).toEqual([['tl_os', 'a'.repeat(500)]])
	})
})

describe('addAppOriginParams', () => {
	it('adds the params to tldraw.dev links', () => {
		expect(addAppOriginParams(DOT_DEV_URL, GOOGLE_CPC)).toBe(
			'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=top-left-logo' +
				'&tl_os=google&tl_om=cpc&tl_oc=brand&tl_or=www.google.com'
		)
		expect(addAppOriginParams('https://www.tldraw.dev/pricing', GOOGLE_CPC)).toBe(
			'https://www.tldraw.dev/pricing?tl_os=google&tl_om=cpc&tl_oc=brand&tl_or=www.google.com'
		)
	})

	it('never overwrites a param already on the link', () => {
		expect(addAppOriginParams('https://tldraw.dev/?tl_os=keep&tl_or=', GOOGLE_CPC)).toBe(
			'https://tldraw.dev/?tl_os=keep&tl_or=&tl_om=cpc&tl_oc=brand'
		)
	})

	it('returns the url unchanged when there is nothing to add', () => {
		expect(addAppOriginParams(DOT_DEV_URL, { r: '$direct', u: 'https://www.tldraw.com/' })).toBe(
			DOT_DEV_URL
		)
		expect(addAppOriginParams(DOT_DEV_URL, undefined)).toBe(DOT_DEV_URL)
	})

	it('leaves links to other sites untouched', () => {
		for (const url of [
			'https://discord.tldraw.com/?utm_source=dotcom',
			'https://github.com/tldraw/tldraw/issues',
			'https://tldraw.dev.example.com/',
			'https://docs.tldraw.dev/',
			'/tos.html',
			'mailto:hello@tldraw.dev',
		]) {
			expect(addAppOriginParams(url, GOOGLE_CPC)).toBe(url)
		}
	})
})

describe('withAppOrigin', () => {
	it('adds params when analytics consent is granted and PostHog has a first touch', () => {
		mocks.consent = { analytics: true }
		mocks.personInfo = GOOGLE_CPC
		expect(withAppOrigin(DOT_DEV_URL)).toBe(addAppOriginParams(DOT_DEV_URL, GOOGLE_CPC))
		expect(withAppOrigin(DOT_DEV_URL)).not.toBe(DOT_DEV_URL)
	})

	it('adds nothing without analytics consent', () => {
		mocks.personInfo = GOOGLE_CPC
		mocks.consent = null
		expect(withAppOrigin(DOT_DEV_URL)).toBe(DOT_DEV_URL)
		mocks.consent = { analytics: false }
		expect(withAppOrigin(DOT_DEV_URL)).toBe(DOT_DEV_URL)
	})

	it('adds nothing when PostHog has no first touch', () => {
		mocks.consent = { analytics: true }
		mocks.personInfo = undefined
		expect(withAppOrigin(DOT_DEV_URL)).toBe(DOT_DEV_URL)
	})
})
