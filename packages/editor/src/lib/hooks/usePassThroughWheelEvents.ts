import { RefObject, useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useMaybeEditor } from './useEditor'

function hasScrollableElement(target: EventTarget | null, root: HTMLElement) {
	if (!(target instanceof Node)) {
		return root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth
	}

	let elm: Element | null = target instanceof Element ? target : target.parentElement
	while (elm) {
		if (
			elm instanceof HTMLElement &&
			(elm.scrollHeight > elm.clientHeight || elm.scrollWidth > elm.clientWidth)
		) {
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

			// if the element is scrollable, don't redispatch the event
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
