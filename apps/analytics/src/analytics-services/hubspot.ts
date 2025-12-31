import { HUBSPOT_SCRIPT_ID, HUBSPOT_SCRIPT_URL } from '../constants'
import { AnalyticsService } from './analytics-service'

class HubspotAnalyticsService extends AnalyticsService {
	// Does not need to be initialized
	override enable() {
		if (this.isEnabled) return
		const hubspotScriptTag = document.createElement('script')
		hubspotScriptTag.id = HUBSPOT_SCRIPT_ID
		hubspotScriptTag.src = HUBSPOT_SCRIPT_URL
		hubspotScriptTag.defer = true
		document.head.appendChild(hubspotScriptTag)
		this.isEnabled = true
	}

	override dispose() {
		const hubspotScriptTag = document.getElementById(HUBSPOT_SCRIPT_ID)
		if (hubspotScriptTag) hubspotScriptTag.remove()
		this.isEnabled = false
	}
}

export const hubspotService = new HubspotAnalyticsService()
