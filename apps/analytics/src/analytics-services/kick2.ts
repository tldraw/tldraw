import { KICK2_SCRIPT_ID, KICK2_SCRIPT_URL } from '../constants'
import { AnalyticsService } from './analytics-service'

class Kick2Service extends AnalyticsService {
	override enable() {
		if (this.isEnabled) return
		if (document.getElementById(KICK2_SCRIPT_ID)) return
		const kick2ScriptTag = document.createElement('script')
		kick2ScriptTag.id = KICK2_SCRIPT_ID
		kick2ScriptTag.src = KICK2_SCRIPT_URL
		kick2ScriptTag.async = true
		document.head.appendChild(kick2ScriptTag)
		this.isEnabled = true
	}

	override disable() {
		if (!this.isEnabled) return
		this.isEnabled = false
	}

	override dispose() {
		const kick2ScriptTag = document.getElementById(KICK2_SCRIPT_ID)
		if (kick2ScriptTag) kick2ScriptTag.remove()
		this.isEnabled = false
	}
}

export const kick2Service = new Kick2Service()
