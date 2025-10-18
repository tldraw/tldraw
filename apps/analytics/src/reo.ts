import { HUBSPOT_SCRIPT_ID, REO_CLIENT_ID, REO_SCRIPT_ID } from './types'

export function loadHubspotScript() {
	if (document.getElementById(HUBSPOT_SCRIPT_ID)) return

	const hubspotScriptTag = document.createElement('script')
	hubspotScriptTag.id = HUBSPOT_SCRIPT_ID
	hubspotScriptTag.src = `https://js-eu1.hs-scripts.com/145620695.js`
	hubspotScriptTag.defer = true
	document.head.appendChild(hubspotScriptTag)
}

export function loadReoScript() {
	if (document.getElementById(REO_SCRIPT_ID)) return

	const reoScriptTag = document.createElement('script')
	reoScriptTag.id = REO_SCRIPT_ID
	reoScriptTag.src = `https://static.reo.dev/${REO_CLIENT_ID}/reo.js`
	reoScriptTag.defer = true
	reoScriptTag.onload = () => window.Reo?.init?.({ clientID: REO_CLIENT_ID })
	document.head.appendChild(reoScriptTag)
}

export function identifyReo(userId: string, properties?: { [key: string]: any }) {
	window.Reo?.identify?.({
		...properties,
		userId,
		firstname: properties?.name || '',
		username: properties?.email || '',
		type: 'email',
	})
}

export function resetReo() {
	window.Reo?.reset?.()
}
