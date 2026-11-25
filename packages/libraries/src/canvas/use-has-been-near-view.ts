import { useEffect, useState } from 'react'

const NEAR_MARGIN = '400px'

/**
 * Whether `element` has come within {@link NEAR_MARGIN} of the panel's scrolled view, and stays true
 * once it has. True at once where `IntersectionObserver` isn't available.
 */
export function useHasBeenNearView(element: HTMLElement | null) {
	const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
	useEffect(() => {
		if (near || !element) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) setNear(true)
			},
			{ root: element.closest('.tlui-libraries-sections'), rootMargin: NEAR_MARGIN }
		)
		observer.observe(element)
		return () => observer.disconnect()
	}, [element, near])
	return near
}
