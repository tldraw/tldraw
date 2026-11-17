import { usePassThroughWheelEvents } from '@tldraw/editor'
import { useRef, useState } from 'react'

/**
 * Wheel pass-through for a radix content element, returned as a ref callback to spread onto it.
 *
 * Menus, popovers and context menus portal into the container, so they sit outside the canvas and
 * outside every pass-through root: without this a wheel over one reaches nothing, and a pan stops
 * the moment the pointer crosses it.
 *
 * A plain ref object is not enough. Opening one of these does not re-render the component that owns
 * the content — radix mounts it from context, and `children` keeps its identity so React bails out
 * — so `usePassThroughWheelEvents` would re-check its ref and still read null. Routing the node
 * through state re-renders the owner at the moment the node appears.
 *
 * Content long enough to scroll still scrolls: the hook defers to real scroll containers.
 */
export function useMenuWheelPassThrough() {
	const [content, setContent] = useState<HTMLDivElement | null>(null)
	const rContent = useRef<HTMLDivElement | null>(null)
	rContent.current = content
	usePassThroughWheelEvents(rContent)
	return setContent
}
