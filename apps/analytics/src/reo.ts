import { REO_CLIENT_ID, REO_SCRIPT_ID, REO_SCRIPT_URL } from './constants'
import { AnalyticsService } from './types'

export const reo: AnalyticsService = {
	_isInitialized: false,
	initialize() {
		// not implemented? This service seems to only load the script once when consent is granted in enable()
	},
	enable() {
		if (document.getElementById(REO_SCRIPT_ID)) return

		const reoScriptTag = document.createElement('script')
		reoScriptTag.id = REO_SCRIPT_ID
		reoScriptTag.src = REO_SCRIPT_URL
		reoScriptTag.defer = true
		reoScriptTag.onload = () => window.Reo?.init?.({ clientID: REO_CLIENT_ID })
		document.head.appendChild(reoScriptTag)
	},
	disable() {
		window.Reo?.reset?.()
	},
	identify(userId: string, properties?: { [key: string]: any }) {
		window.Reo?.identify?.({
			...properties,
			userId,
			firstname: properties?.name || '',
			username: properties?.email || '',
			type: 'email',
		})
	},
	trackEvent() {
		// not implemented
	},
	trackPageview() {
		// not implemented
	},
}
