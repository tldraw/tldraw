import { RefObject, useEffect, useRef } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useMaybeEditor } from './useEditor'
import { useEvent } from './useEvent'

function isScrollableOverflow(overflow: string) {
	return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

// An element only consumes a wheel event when it's a real scroll container: its content overflows
// AND its computed overflow is scrollable. Checking scrollHeight/scrollWidth alone is not enough —
// an `overflow: visible` element whose content merely overflows (e.g. a comment pin whose hover
// `transform: scale()` inflates scrollHeight past clientHeight) never scrolls, so the wheel must
// still pass through to the canvas.
function isScrollable(elm: HTMLElement) {
	// Cheap first: if nothing overflows, it can't scroll — skip the getComputedStyle read. This runs
	// per ancestor on every wheel event, so avoid resolving styles for the common (non-overflowing) case.
	const overflowsY = elm.scrollHeight > elm.clientHeight
	const overflowsX = elm.scrollWidth > elm.clientWidth
	if (!overflowsY && !overflowsX) return false

	const style = getComputedStyle(elm)
	return (
		(overflowsY && isScrollableOverflow(style.overflowY)) ||
		(overflowsX && isScrollableOverflow(style.overflowX))
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

	const onWheel = useEvent((e: WheelEvent) => {
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
		// Flag the original too: it keeps bubbling, and an enclosing pass-through root (the
		// navigation panel around the minimap) would otherwise redispatch it a second time.
		;(e as any).isSpecialRedispatchedEvent = true
	})

	// The element the listener is currently on, which isn't necessarily `ref.current`: a `RefObject`
	// gives no notification when its element changes.
	const attached = useRef<HTMLElement | null>(null)

	// Deliberately no dependency array — this re-checks the ref after every render of the component
	// that owns it, and re-attaches when the element has been swapped. A component that keeps the
	// hook mounted while unmounting and remounting the element it points at (a comment pin culled
	// while its anchor is off screen, say) would otherwise leave the listener on the discarded node
	// and silently lose pass-through once the element comes back.
	useEffect(() => {
		const elm = ref.current
		if (elm === attached.current) return
		attached.current?.removeEventListener('wheel', onWheel)
		attached.current = elm
		elm?.addEventListener('wheel', onWheel, { passive: false })
	})

	// Teardown is its own effect so the re-attach check above can skip returning a cleanup that
	// would tear the listener down and rebuild it on every render.
	useEffect(() => {
		return () => {
			attached.current?.removeEventListener('wheel', onWheel)
			attached.current = null
		}
	}, [onWheel])
}
