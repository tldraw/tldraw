export const isInIframe = () => {
	return typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
}

export function getParentOrigin() {
	if (isInIframe()) {
		const ancestorOrigins = window.location.ancestorOrigins
		// ancestorOrigins is not supported in Firefox
		if (ancestorOrigins && ancestorOrigins.length > 0) {
			return ancestorOrigins[0]
		} else {
			return document.referrer
		}
	}
	return document.location.origin
}
