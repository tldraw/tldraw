import { RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { PORTRAIT_BREAKPOINT, useBreakpoint, useContainer } from 'tldraw'
import { getVisibleViewport } from '../ui/visual-viewport'

/**
 * Mobile mode for the commenting surfaces — the same breakpoint gate as tldraw's mobile toolbar and
 * style panel (which also honors `forceMobile` on `<Tldraw>`). The commenting layer can mount
 * without tldraw's default UI (`hideUi`, custom UI), where the breakpoint provider is absent and
 * `useBreakpoint` throws; fall back to desktop there, matching the pre-mobile rendering those hosts
 * always had.
 */
export function useIsMobileCommenting(): boolean {
	let breakpoint: number
	try {
		// The call is unconditional — the try only guards the provider's absence, not hook order.
		// oxlint-disable-next-line react-hooks/rules-of-hooks
		breakpoint = useBreakpoint()
	} catch {
		return false
	}
	return breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
}

const VIEWPORT_MARGIN = 8

/**
 * Keep a canvas-anchored panel — the pending composer or an open thread popover — within the
 * visible viewport on mobile. The software keyboard shrinks the *visual* viewport while leaving the
 * layout viewport (and CSS `dvh`) untouched, so a panel placed at a fixed offset from its pin can
 * end up behind the keyboard. On mobile this clamps the panel's top-left into the visible box so it
 * stays on-screen above the keyboard. Desktop is untouched: when `enabled` is false the base point
 * is returned unchanged, tracking the camera exactly as before.
 *
 * `base` is the panel's desired top-left in container-relative viewport coordinates (what the call
 * site would otherwise write straight into `left`/`top`).
 */
export function useMobilePlacement(
	ref: RefObject<HTMLElement | null>,
	base: { x: number; y: number },
	enabled: boolean
): { left: number; top: number } {
	const container = useContainer()
	// Destructured so the effects below depend on the two numbers rather than the object, which the
	// call sites build fresh on every render.
	const { x: baseX, y: baseY } = base
	const [placed, setPlaced] = useState<{ left: number; top: number }>(() => ({
		left: baseX,
		top: baseY,
	}))
	// The camera moves `base` every frame while panning. Reading it from a ref keeps `update` stable
	// across those frames, so the observers below are set up once per panel rather than being torn
	// down and rebuilt each frame.
	const baseRef = useRef({ x: baseX, y: baseY })

	const update = useCallback(() => {
		if (!enabled) return
		const el = ref.current
		if (!el) return
		const win = container.ownerDocument.defaultView ?? window
		const { x, y } = baseRef.current

		// Panel coordinates are container-relative; the visual viewport is window-relative.
		const cRect = container.getBoundingClientRect()
		const vp = getVisibleViewport(win)
		const top = vp.top - cRect.top + VIEWPORT_MARGIN
		const bottom = vp.bottom - cRect.top - VIEWPORT_MARGIN
		const left = vp.left - cRect.left + VIEWPORT_MARGIN
		const right = vp.right - cRect.left - VIEWPORT_MARGIN

		const w = el.offsetWidth
		const h = el.offsetHeight

		const nextLeft = Math.max(left, Math.min(x, right - w))
		// The keyboard only ever covers space from the bottom, so it can pull the panel up (when its
		// bottom would be hidden) but must never push it down below its natural spot. `y` is the
		// floor: any spurious rise in `top` (e.g. iOS scrolling the page to reveal a focused input)
		// is capped here, so a panel that already clears the keyboard doesn't move at all.
		const nextTop = Math.min(y, Math.max(top, bottom - h))
		setPlaced((prev) =>
			prev.left === nextLeft && prev.top === nextTop ? prev : { left: nextLeft, top: nextTop }
		)
	}, [container, ref, enabled])

	// Re-place as the camera moves the panel's base point.
	useLayoutEffect(() => {
		baseRef.current = { x: baseX, y: baseY }
		update()
	}, [baseX, baseY, update])

	// Re-place when the panel grows (replies, edits), when the visual viewport changes (keyboard,
	// pinch-zoom), or when the window resizes.
	useLayoutEffect(() => {
		if (!enabled) return
		const el = ref.current
		if (!el) return
		const win = container.ownerDocument.defaultView ?? window
		const ro = new ResizeObserver(update)
		ro.observe(el)
		const vv = win.visualViewport
		vv?.addEventListener('resize', update)
		vv?.addEventListener('scroll', update)
		win.addEventListener('resize', update)
		return () => {
			ro.disconnect()
			vv?.removeEventListener('resize', update)
			vv?.removeEventListener('scroll', update)
			win.removeEventListener('resize', update)
		}
	}, [container, ref, enabled, update])

	// Desktop keeps its fixed placement, recomputed each render so it tracks the pin as the camera
	// moves.
	if (!enabled) return { left: baseX, top: baseY }
	return placed
}
