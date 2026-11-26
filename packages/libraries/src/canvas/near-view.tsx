import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

const NEAR_MARGIN = '400px'

interface NearView {
	/** Calls `onNear` once `element` comes near the view, then stops watching it. */
	watch(element: Element, onNear: () => void): () => void
}

// Undefined outside a provider; null inside one whose scroll container hasn't mounted yet.
const NearViewContext = createContext<NearView | null | undefined>(undefined)

function createNearView(root: Element): NearView & { dispose(): void } {
	const waiting = new Map<Element, () => void>()
	let observer: IntersectionObserver | undefined
	const getObserver = () => {
		observer ??= new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue
					const onNear = waiting.get(entry.target)
					if (!onNear) continue
					waiting.delete(entry.target)
					getObserver().unobserve(entry.target)
					onNear()
				}
			},
			{ root, rootMargin: NEAR_MARGIN }
		)
		return observer
	}
	return {
		watch(element, onNear) {
			waiting.set(element, onNear)
			getObserver().observe(element)
			return () => {
				waiting.delete(element)
				getObserver().unobserve(element)
			}
		},
		dispose() {
			if (observer) observer.disconnect()
			waiting.clear()
		},
	}
}

/**
 * Tells the sections inside `root`, a scroll container, when they come within {@link NEAR_MARGIN} of
 * its view, with one `IntersectionObserver` for all of them.
 */
export function NearViewProvider({
	root,
	children,
}: {
	root: Element | null
	children: ReactNode
}) {
	const nearView = useMemo(
		() => (root && typeof IntersectionObserver !== 'undefined' ? createNearView(root) : null),
		[root]
	)
	useEffect(() => {
		if (!nearView) return
		return () => nearView.dispose()
	}, [nearView])
	return <NearViewContext.Provider value={nearView}>{children}</NearViewContext.Provider>
}

/**
 * Whether `element` has come near its {@link NearViewProvider}'s view, and stays true once it has.
 * True at once outside a provider, or where `IntersectionObserver` isn't available.
 */
export function useHasBeenNearView(element: HTMLElement | null) {
	const nearView = useContext(NearViewContext)
	const watched = nearView !== undefined && typeof IntersectionObserver !== 'undefined'
	const [near, setNear] = useState(!watched)
	useEffect(() => {
		if (near || !element || !nearView) return
		return nearView.watch(element, () => setNear(true))
	}, [element, near, nearView])
	return near
}
