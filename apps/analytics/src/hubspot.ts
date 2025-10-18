import { HUBSPOT_SCRIPT_ID, HUBSPOT_SCRIPT_URL } from './constants'
import { AnalyticsService } from './types'

export const hubspot: AnalyticsService = {
	_isInitialized: false,
	initialize() {
		// not implemented? This service seems to only load the script once when consent is granted in enable()
	},
	enable() {
		if (this._isInitialized) return
		if (document.getElementById(HUBSPOT_SCRIPT_ID)) return

		const hubspotScriptTag = document.createElement('script')
		hubspotScriptTag.id = HUBSPOT_SCRIPT_ID
		hubspotScriptTag.src = HUBSPOT_SCRIPT_URL
		hubspotScriptTag.defer = true
		document.head.appendChild(hubspotScriptTag)

		this._isInitialized = true
	},
	disable() {
		// not implemented?
	},
	identify() {
		// not implemented?
	},
	trackEvent() {
		// not implemented?
	},
	trackPageview() {
		// not implemented?
	},
}
