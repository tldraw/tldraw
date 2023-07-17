import { useEffect, useState } from 'react'

/** @public */
export function usePrefersReducedMotion() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

	useEffect(() => {
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
		const handler = () => {
			setPrefersReducedMotion(mql.matches)
		}
		handler()
		mql.addEventListener('change', handler)
		return () => mql.removeEventListener('change', handler)
	}, [])

	return prefersReducedMotion
}
