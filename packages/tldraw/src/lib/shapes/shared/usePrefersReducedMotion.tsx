import { useMaybeEditor, useValue } from '@tldraw/editor'
import { useEffect, useState } from 'react'

/** @public */
export function usePrefersReducedMotion() {
	const editor = useMaybeEditor()
	const animationSpeed = useValue('animationSpeed', () => editor?.user.getAnimationSpeed(), [
		editor,
	])
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

	useEffect(() => {
		if (animationSpeed !== undefined) {
			setPrefersReducedMotion(animationSpeed === 0 ? true : false)
			return
		}

		const win = editor?.getContainerWindow() ?? window
		if (!('matchMedia' in win)) return
		const mql = win.matchMedia('(prefers-reduced-motion: reduce)')
		const handler = () => {
			setPrefersReducedMotion(mql.matches)
		}
		handler()
		mql.addEventListener('change', handler)
		return () => mql.removeEventListener('change', handler)
	}, [animationSpeed, editor])

	return prefersReducedMotion
}
