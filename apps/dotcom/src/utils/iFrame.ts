export const isInIframe = () => {
	return typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
}

export function getTopLevelOrigin() {
	let origin: string
	if (isInIframe()) {
		const ancestorOrigins = window.location.ancestorOrigins
		// ancestorOrigins is not supported in Firefox
		if (ancestorOrigins && ancestorOrigins.length > 0) {
			origin = ancestorOrigins[ancestorOrigins.length - 1]
		} else {
			origin = document.referrer
		}
	} else {
		origin = document.location.origin
	}

	return origin
}
