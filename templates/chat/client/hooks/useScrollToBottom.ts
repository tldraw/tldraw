import { useCallback, useRef } from 'react'

/**
 * Scrolls to the bottom of the page with a smooth animation. Typically you'd use the browser's
 * `scrollTo({behavior: 'smooth'})` for this, but that doesn't do well if it's called multiple times
 * in a row before each previous animation has completed (ie in an AI streaming type use-case). This
 * hook keeps scrolling until it reaches the bottom using a physics-based approach for easing,
 * rather than multiple distinct animations.
 */
export function useScrollToBottom() {
	const currentScrollAnimation = useRef<{ nextFrame: number } | null>(null)

	const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
		const scrollingElement = document.scrollingElement
		if (!scrollingElement) return

		if (behavior !== 'smooth') {
			scrollingElement.scrollTo({ top: scrollingElement.scrollHeight, behavior: 'instant' })
			if (currentScrollAnimation.current) {
				cancelAnimationFrame(currentScrollAnimation.current.nextFrame)
				currentScrollAnimation.current = null
			}
			return
		}

		if (currentScrollAnimation.current) {
			return
		}

		let scrollTop = scrollingElement.scrollTop
		let velocity = 0
		let lastT = performance.now()
		const acceleration = 0.02
		const maxVelocity = 5

		const tick = () => {
			const t = performance.now()
			const dt = t - lastT
			lastT = t

			velocity = Math.min(velocity + acceleration * dt, maxVelocity)
			scrollTop += velocity * dt

			scrollingElement.scrollTop = scrollTop
			const maxScrollTop = scrollingElement.scrollHeight - scrollingElement.clientHeight
			if (scrollTop < maxScrollTop) {
				currentScrollAnimation.current = { nextFrame: requestAnimationFrame(tick) }
			} else {
				currentScrollAnimation.current = null
			}
		}

		currentScrollAnimation.current = { nextFrame: requestAnimationFrame(tick) }
	}, [])

	return scrollToBottom
}
