import { useSyncExternalStore } from 'react'

const query = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
	const media = window.matchMedia(query)
	media.addEventListener('change', onChange)
	return () => media.removeEventListener('change', onChange)
}

/** Whether the app should use its dark theme. Follows the system color scheme. */
export function useIsDarkMode() {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		// the css defaults to dark, so match it before hydration
		() => true
	)
}
