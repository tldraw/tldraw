import { HUBSPOT_SCRIPT_ID, HUBSPOT_SCRIPT_URL } from '../constants'
import { AnalyticsService } from './analytics-service'

class HubspotAnalyticsService extends AnalyticsService {
	override enable() {
		if (this.isInitialized) return
		if (document.getElementById(HUBSPOT_SCRIPT_ID)) return

		const hubspotScriptTag = document.createElement('script')
		hubspotScriptTag.id = HUBSPOT_SCRIPT_ID
		hubspotScriptTag.src = HUBSPOT_SCRIPT_URL
		hubspotScriptTag.defer = true
		document.head.appendChild(hubspotScriptTag)

		this.isInitialized = true
	}
}

export const hubspot = new HubspotAnalyticsService()
