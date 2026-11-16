import {
	Attribution,
	PageView,
	readAttribution,
	recordAttributionPageView,
	removeAttribution,
} from '../utils/attribution'
import { AnalyticsService } from './analytics-service'

// Host sites don't share a router, so client-side navigations are found by watching the URL, as
// the Common Room tracker does.
const NAVIGATION_POLL_INTERVAL_MS = 1000

function getPageKey(url: string) {
	const { origin, pathname, search } = new URL(url)
	return `${origin}${pathname}${search}`
}

class AttributionService extends AnalyticsService {
	private landing: PageView | undefined
	private lastPageKey: string | undefined
	private navigationPoll: ReturnType<typeof setInterval> | undefined

	override initialize() {
		// Kept in memory so the source survives client-side navigation while the consent banner is
		// still open. Nothing is written until enable().
		this.landing = { url: window.location.href, referrer: document.referrer, time: new Date() }
	}

	override enable() {
		if (this.isEnabled) return
		this.isEnabled = true
		if (this.landing) {
			recordAttributionPageView(this.landing)
			this.lastPageKey = getPageKey(this.landing.url)
		}
		this.trackPageview()
		this.navigationPoll = setInterval(() => this.trackPageview(), NAVIGATION_POLL_INTERVAL_MS)
	}

	override disable() {
		clearInterval(this.navigationPoll)
		this.navigationPoll = undefined
		this.isEnabled = false
		removeAttribution()
	}

	override trackPageview() {
		if (!this.isEnabled) return
		const url = window.location.href
		const pageKey = getPageKey(url)
		if (pageKey === this.lastPageKey) return
		this.lastPageKey = pageKey
		// document.referrer still names the landing page's referrer after a client-side navigation,
		// so only the new URL's utm_* params can make this a new touch.
		recordAttributionPageView({ url, referrer: '', time: new Date() })
	}

	getAttribution(): Attribution | null {
		return this.isEnabled ? readAttribution() : null
	}
}

export const attributionService = new AttributionService()
