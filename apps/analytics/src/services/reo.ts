import { REO_CLIENT_ID, REO_SCRIPT_ID, REO_SCRIPT_URL } from '../constants'
import { AnalyticsService } from './analytics-service'

class ReoAnalyticsService extends AnalyticsService {
	// Does not need to be initialized
	override isInitialized = true
	override enable() {
		if (this.isEnabled) return
		if (!document.getElementById(REO_SCRIPT_ID)) {
			const reoScriptTag = document.createElement('script')
			reoScriptTag.id = REO_SCRIPT_ID
			reoScriptTag.src = REO_SCRIPT_URL
			reoScriptTag.defer = true
			reoScriptTag.onload = () => window.Reo?.init?.({ clientID: REO_CLIENT_ID })
			document.head.appendChild(reoScriptTag)
		}
		this.isEnabled = true
	}
	override disable() {
		if (!this.isEnabled) return
		window.Reo?.reset?.()
		this.isEnabled = false
	}
	override identify(userId: string, properties?: { [key: string]: any }) {
		window.Reo?.identify?.({
			...properties,
			userId,
			firstname: properties?.name || '',
			username: properties?.email || '',
			type: 'email',
		})
	}
}

export const reo = new ReoAnalyticsService()
