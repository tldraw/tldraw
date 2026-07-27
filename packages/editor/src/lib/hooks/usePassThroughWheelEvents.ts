import { RefObject, useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useMaybeEditor } from './useEditor'

function isScrollableOverflow(overflow: string) {
	return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

// An element only consumes a wheel event when it's a real scroll container: its content overflows
// AND its computed overflow is scrollable. Checking scrollHeight/scrollWidth alone is not enough —
// an `overflow: visible` element whose content merely overflows (e.g. a comment pin whose hover
// `transform: scale()` inflates scrollHeight past clientHeight) never scrolls, so the wheel must
// still pass through to the canvas.
function isScrollable(elm: HTMLElement) {
	const style = getComputedStyle(elm)
	return (
		(elm.scrollHeight > elm.clientHeight && isScrollableOverflow(style.overflowY)) ||
		(elm.scrollWidth > elm.clientWidth && isScrollableOverflow(style.overflowX))
	)
}

// Walk from the wheeled element up to (and including) the pass-through root, looking for a scroll
// container. If one is found, the wheel belongs to it — don't redispatch it to the canvas.
function hasScrollableElement(target: EventTarget | null, root: HTMLElement) {
	if (!(target instanceof Node)) {
		return isScrollable(root)
	}

	let elm: Element | null = target instanceof Element ? target : target.parentElement
	while (elm) {
		if (elm instanceof HTMLElement && isScrollable(elm)) {
			return true
		}
		if (elm === root) return false
		elm = elm.parentElement
	}

	return false
}

/** @public */
export function usePassThroughWheelEvents(ref: RefObject<HTMLElement | null>) {
	if (!ref) throw Error('usePassThroughWheelEvents must be passed a ref')
	const container = useContainer()
	const editor = useMaybeEditor()

	useEffect(() => {
		function onWheel(e: WheelEvent) {
			// Only pass through wheel events if the editor is focused
			if (!editor?.getInstanceState().isFocused) return

			if ((e as any).isSpecialRedispatchedEvent) return

			// If the wheel is over a scrollable element, let it scroll instead of redispatching.
			const elm = ref.current
			if (elm && hasScrollableElement(e.target, elm)) {
				return
			}

			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			if (!cvs) return
			const newEvent = new WheelEvent('wheel', e as any)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		}

		const elm = ref.current
		if (!elm) return

		elm.addEventListener('wheel', onWheel, { passive: false })
		return () => {
			elm.removeEventListener('wheel', onWheel)
		}
	}, [container, editor, ref])
}
