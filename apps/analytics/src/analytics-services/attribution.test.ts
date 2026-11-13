import { readAttribution } from '../utils/attribution'
import { attributionService } from './attribution'

function visit(url: string, referrer = '') {
	;(globalThis as any).jsdom.reconfigure({ url })
	vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer)
}

beforeEach(() => {
	vi.useFakeTimers()
	;(globalThis as any).jsdom.cookieJar.removeAllCookiesSync()
})

afterEach(() => {
	attributionService.disable()
	vi.useRealTimers()
	vi.restoreAllMocks()
	;(globalThis as any).jsdom.reconfigure({ url: 'http://localhost:3000/' })
})

describe('attributionService', () => {
	test('writes nothing before consent', () => {
		visit('https://tldraw.dev/?utm_source=google', 'https://www.google.com/')
		attributionService.initialize()

		attributionService.trackPageview()
		window.history.pushState(null, '', '/pricing?utm_source=newsletter')
		vi.advanceTimersByTime(5000)
		attributionService.trackPageview()

		expect(document.cookie).not.toContain('tl_attribution')
		expect(attributionService.getAttribution()).toBeNull()
	})

	test('records the landing page once consent is granted', () => {
		visit('https://tldraw.dev/?utm_source=google', 'https://www.google.com/search?q=tldraw')
		attributionService.initialize()

		attributionService.enable()

		const touch = {
			s: 'google',
			r: 'https://www.google.com/search',
			l: 'https://tldraw.dev/?utm_source=google',
			t: expect.any(String),
		}
		expect(readAttribution()).toEqual({ v: 1, first: touch, last: touch })
		expect(attributionService.getAttribution()).toEqual(readAttribution())
	})

	test('keeps the landing source when the visitor navigates before consenting', () => {
		visit('https://tldraw.dev/?utm_source=google')
		attributionService.initialize()
		window.history.pushState(null, '', '/pricing')

		attributionService.enable()

		expect(readAttribution()?.first.l).toBe('https://tldraw.dev/?utm_source=google')
	})

	test('client-side navigations count only when they carry utm_* params', () => {
		visit('https://tldraw.dev/', 'https://news.ycombinator.com/')
		attributionService.initialize()
		attributionService.enable()
		const landing = readAttribution()

		// document.referrer is still external here, but it belongs to the landing page.
		window.history.pushState(null, '', '/docs')
		vi.advanceTimersByTime(1000)
		expect(readAttribution()).toEqual(landing)

		window.history.pushState(null, '', '/pricing?utm_source=banner')
		vi.advanceTimersByTime(1000)
		expect(readAttribution()).toEqual({
			v: 1,
			first: landing!.first,
			last: {
				s: 'banner',
				l: 'https://tldraw.dev/pricing?utm_source=banner',
				t: expect.any(String),
			},
		})
	})

	test('removes the cookie and stops writing when consent is withdrawn', () => {
		visit('https://tldraw.dev/?utm_source=google')
		attributionService.initialize()
		attributionService.enable()
		expect(readAttribution()).not.toBeNull()

		attributionService.disable()
		expect(readAttribution()).toBeNull()
		expect(attributionService.getAttribution()).toBeNull()

		window.history.pushState(null, '', '/pricing?utm_source=newsletter')
		vi.advanceTimersByTime(5000)
		attributionService.trackPageview()
		expect(document.cookie).not.toContain('tl_attribution')
	})
})
