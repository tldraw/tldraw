import { decorateDotDevHref, getAppOriginParams, listenForDotDevLinks } from './app-origin-link'
import { Attribution, AttributionTouch } from './attribution'

const DOTCOM_LINK =
	'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=top-left-logo'

function attributionWithFirst(first: Omit<AttributionTouch, 'l' | 't'>): Attribution {
	const touch = { l: 'https://www.tldraw.com/', t: '2026-10-30T12:00:00.000Z' }
	return { v: 1, first: { ...touch, ...first }, last: touch }
}

const attribution = attributionWithFirst({
	s: 'google',
	m: 'cpc',
	c: 'brand',
	ct: 'hero',
	r: 'https://www.google.com/search',
})

describe('getAppOriginParams', () => {
	test("maps the first touch's source, medium, campaign and referrer hostname", () => {
		expect(getAppOriginParams(attribution)).toEqual([
			['tl_os', 'google'],
			['tl_om', 'cpc'],
			['tl_oc', 'brand'],
			['tl_or', 'www.google.com'],
		])
	})

	test('ignores the last touch', () => {
		expect(
			getAppOriginParams({
				...attributionWithFirst({ s: 'google' }),
				last: { s: 'newsletter', m: 'email', l: 'https://www.tldraw.com/', t: 'b' },
			})
		).toEqual([['tl_os', 'google']])
	})

	test('leaves out missing, empty and unparseable values', () => {
		expect(
			getAppOriginParams(attributionWithFirst({ s: ' ', c: 'launch', r: 'not a url' }))
		).toEqual([['tl_oc', 'launch']])
		expect(getAppOriginParams(attributionWithFirst({}))).toEqual([])
	})
})

describe('decorateDotDevHref', () => {
	test('adds the first touch to a tldraw.dev link and keeps its own params', () => {
		const decorated = new URL(decorateDotDevHref(DOTCOM_LINK, 'www.tldraw.com', attribution))
		expect(Object.fromEntries(decorated.searchParams)).toEqual({
			utm_source: 'dotcom',
			utm_medium: 'organic',
			utm_campaign: 'top-left-logo',
			tl_os: 'google',
			tl_om: 'cpc',
			tl_oc: 'brand',
			tl_or: 'www.google.com',
		})
	})

	test.each(['https://www.tldraw.dev/pricing#plans', 'http://tldraw.dev/', 'https://TLDRAW.dev/'])(
		'decorates %s',
		(href) => {
			const decorated = new URL(decorateDotDevHref(href, 'flash.tldraw.com', attribution))
			expect(decorated.searchParams.get('tl_os')).toBe('google')
			expect(decorated.hash).toBe(new URL(href).hash)
		}
	)

	test('adds nothing without a cookie', () => {
		expect(decorateDotDevHref(DOTCOM_LINK, 'www.tldraw.com', null)).toBe(DOTCOM_LINK)
	})

	test('never overwrites a param already on the link', () => {
		const href = `${DOTCOM_LINK}&tl_os=partner&tl_or=`
		const decorated = new URL(decorateDotDevHref(href, 'www.tldraw.com', attribution))
		expect(decorated.searchParams.getAll('tl_os')).toEqual(['partner'])
		expect(decorated.searchParams.getAll('tl_or')).toEqual([''])
		expect(decorated.searchParams.get('tl_om')).toBe('cpc')
	})

	test('returns the href unchanged when there is nothing to add', () => {
		expect(decorateDotDevHref(DOTCOM_LINK, 'www.tldraw.com', attributionWithFirst({}))).toBe(
			DOTCOM_LINK
		)
	})

	test.each([
		'https://tldraw.com/',
		'https://docs.tldraw.dev/',
		'https://tldraw.dev.example.com/',
		'https://discord.tldraw.com/?utm_source=dotcom',
		'mailto:hello@tldraw.dev',
		'/pricing',
		'not a url',
	])('ignores other links: %s', (href) => {
		expect(decorateDotDevHref(href, 'www.tldraw.com', attribution)).toBe(href)
	})

	test.each(['tldraw.dev', 'www.tldraw.dev', 'staging.tldraw.dev'])(
		'adds nothing on a tldraw.dev page (%s), whose cookie is its own',
		(pageHostname) => {
			expect(decorateDotDevHref(DOTCOM_LINK, pageHostname, attribution)).toBe(DOTCOM_LINK)
		}
	)
})

describe('listenForDotDevLinks', () => {
	let stop: (() => void) | undefined
	let current: Attribution | null

	function follow(href: string, eventType: 'click' | 'auxclick' = 'click') {
		const link = document.createElement('a')
		link.href = href
		const icon = document.createElement('span')
		link.appendChild(icon)
		document.body.appendChild(link)
		// jsdom can't navigate; stop it trying once our capture listener has run.
		link.addEventListener(eventType, (event) => event.preventDefault())
		icon.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, button: 1 }))
		link.remove()
		return link.href
	}

	beforeEach(() => {
		;(globalThis as any).jsdom.reconfigure({ url: 'https://www.tldraw.com/f/abc' })
		current = attribution
		stop = listenForDotDevLinks(() => current)
	})

	afterEach(() => {
		stop?.()
		;(globalThis as any).jsdom.reconfigure({ url: 'http://localhost:3000/' })
	})

	test.each(['click', 'auxclick'] as const)('rewrites a followed link on %s', (eventType) => {
		expect(new URL(follow(DOTCOM_LINK, eventType)).searchParams.get('tl_os')).toBe('google')
	})

	test('leaves links alone without a cookie', () => {
		current = null
		expect(follow(DOTCOM_LINK)).toBe(DOTCOM_LINK)
	})

	test('leaves other links alone', () => {
		expect(follow('https://discord.tldraw.com/')).toBe('https://discord.tldraw.com/')
	})

	test('stops when removed', () => {
		stop!()
		stop = undefined
		expect(follow(DOTCOM_LINK)).toBe(DOTCOM_LINK)
	})
})
