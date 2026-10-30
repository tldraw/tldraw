import { CONSENT_COOKIE_NAME } from './constants'
import { readAttribution } from './utils/attribution'

vi.mock('posthog-js', () => ({
	default: {
		init: vi.fn(),
		opt_in_capturing: vi.fn(),
		opt_out_capturing: vi.fn(),
		setPersonProperties: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
		capture: vi.fn(),
	},
}))

async function loadAnalytics({ requiresConsent }: { requiresConsent: boolean }) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({ ok: true, json: async () => ({ requires_consent: requiresConsent }) }))
	)
	await import('./index')
}

function clickBannerButton(action: 'accept' | 'opt-out') {
	document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click()
}

beforeEach(() => {
	// Fake timers so each test's navigation poll is dropped with it.
	vi.useFakeTimers()
	vi.resetModules()
	;(globalThis as any).jsdom.cookieJar.removeAllCookiesSync()
	;(globalThis as any).jsdom.reconfigure({ url: 'https://computer.tldraw.com/?utm_source=google' })
	document.head.innerHTML = ''
	document.body.innerHTML = ''
})

afterEach(() => {
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.unstubAllGlobals()
	;(globalThis as any).jsdom.reconfigure({ url: 'http://localhost:3000/' })
})

describe('tl_attribution consent gate', () => {
	test('writes nothing while the visitor has not chosen, or after they opt out', async () => {
		await loadAnalytics({ requiresConsent: true })
		await vi.waitFor(() => expect(document.querySelector('[data-action="accept"]')).not.toBeNull())
		expect(readAttribution()).toBeNull()
		expect(window.tlanalytics.getAttribution()).toBeNull()

		clickBannerButton('opt-out')
		expect(readAttribution()).toBeNull()
	})

	test('writes the cookie once the visitor accepts', async () => {
		await loadAnalytics({ requiresConsent: true })
		await vi.waitFor(() => expect(document.querySelector('[data-action="accept"]')).not.toBeNull())

		clickBannerButton('accept')

		expect(readAttribution()?.first).toEqual({
			s: 'google',
			l: 'https://computer.tldraw.com/?utm_source=google',
			t: expect.any(String),
		})
		expect(window.tlanalytics.getAttribution()).toEqual(readAttribution())
	})

	test('removes an existing cookie for a visitor who opted out earlier', async () => {
		document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify({ consent: 'opted-in', optInType: 'manual' })}; Path=/`
		await loadAnalytics({ requiresConsent: true })
		await vi.waitFor(() => expect(readAttribution()).not.toBeNull())

		vi.resetModules()
		document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify({ consent: 'opted-out', optInType: 'manual' })}; Path=/`
		await loadAnalytics({ requiresConsent: true })
		await vi.waitFor(() => expect(readAttribution()).toBeNull())
	})
})
