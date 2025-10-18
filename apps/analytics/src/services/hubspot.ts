import { HUBSPOT_SCRIPT_ID, HUBSPOT_SCRIPT_URL } from '../constants'
import { AnalyticsService } from './analytics-service'

class HubspotAnalyticsService extends AnalyticsService {
	// Does not need to be initialized
	override isInitialized = true
	override enable() {
		if (this.isEnabled) return

		if (!document.getElementById(HUBSPOT_SCRIPT_ID)) {
			const hubspotScriptTag = document.createElement('script')
			hubspotScriptTag.id = HUBSPOT_SCRIPT_ID
			hubspotScriptTag.src = HUBSPOT_SCRIPT_URL
			hubspotScriptTag.defer = true
			document.head.appendChild(hubspotScriptTag)
		}

		this.isEnabled = true
	}
}

export const hubspot = new HubspotAnalyticsService()
