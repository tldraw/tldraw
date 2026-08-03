import { useLayoutEffect, useState, type RefObject } from 'react'
import { clamp, useContainer, useViewportHeight } from 'tldraw'

/** How close a floating comment surface may come to the edge of the visible viewport. */
const VIEWPORT_MARGIN = 8

/** Never cap a surface below this, however little room is left: a sliver is no more usable than an
 *  overflowing panel, and it keeps the height a sane number in the degenerate cases (a container
 *  scrolled off screen entirely, a keyboard covering all of a very short window). */
const MIN_HEIGHT = 120

/** What a surface's placement depends on besides the anchor: measured in the DOM, then held still
 *  so that moving the camera is arithmetic rather than a layout read. */
interface Metrics {
	width: number
	height: number
	/** Where the painted box sits relative to the positioned one — see `measure` below. */
	shiftX: number
	shiftY: number
	containerTop: number
	containerWidth: number
}

function sameMetrics(a: Metrics, b: Metrics) {
	return (
		a.width === b.width &&
		a.height === b.height &&
		a.shiftX === b.shiftX &&
		a.shiftY === b.shiftY &&
		a.containerTop === b.containerTop &&
		a.containerWidth === b.containerWidth
	)
}

/**
 * Keep a floating comment surface — an open thread, a coincident stack, the placement composer —
 * inside the part of the screen the reader can actually see.
 *
 * These surfaces are placed at their pin, which on a phone puts them off the bottom or the right
 * of the screen often enough, and under the software keyboard almost always. The keyboard is the
 * hard half: it doesn't shrink the layout viewport, so neither `dvh` nor `window.innerHeight` can
 * see it. {@link useViewportHeight} can — it tracks `visualViewport`, whose bottom edge rises with
 * the keyboard — and that one number is the whole basis for this hook.
 *
 * Given the bottom edge the rest is arithmetic: slide the surface back inside the visible box, and
 * cap its height so a long thread scrolls its comment list (see `canvas.css`) rather than running
 * off the screen. Both are no-ops wherever the surface already fits, which is why there's no
 * mobile/desktop split here — desktop placement is unchanged because desktop has the room, and a
 * cramped desktop window gets the same treatment a phone does.
 *
 * @param ref - The surface being placed.
 * @param left - Where it wants to sit, in container coordinates.
 * @param top - Where it wants to sit, in container coordinates.
 * @returns `left` and `top` to position it at, and a `maxHeight` for surfaces that can scroll.
 */
export function useViewportFit(ref: RefObject<HTMLElement | null>, left: number, top: number) {
	const container = useContainer()
	const viewportBottom = useViewportHeight()
	const [metrics, setMetrics] = useState<Metrics | null>(null)

	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return

		const measure = () => {
			const containerRect = container.getBoundingClientRect()
			const rect = el.getBoundingClientRect()
			const next: Metrics = {
				width: rect.width,
				height: rect.height,
				// A surface can hang off its anchor with a CSS transform (the composer does, to put
				// its draft pin on the click point), so the box that has to stay on screen isn't
				// the one `left`/`top` position. Measure the gap between the two and correct by it.
				// `offsetLeft`/`offsetTop` are relative to `.tl-container`, which is the offset
				// parent: the editor's portal host is `display: contents`.
				shiftX: rect.left - containerRect.left - el.offsetLeft,
				shiftY: rect.top - containerRect.top - el.offsetTop,
				containerTop: containerRect.top,
				containerWidth: containerRect.width,
			}
			setMetrics((prev) => (prev && sameMetrics(prev, next) ? prev : next))
		}

		measure()
		// Re-measure when the surface grows (a reply lands, a draft wraps onto a second line) or
		// when the editor is resized. Keyboard and pinch-zoom changes arrive via
		// `useViewportHeight` instead, which re-runs the render-time maths below.
		const observer = new ResizeObserver(measure)
		observer.observe(el)
		observer.observe(container)
		return () => observer.disconnect()
	}, [ref, container])

	// Pure arithmetic on measurements already taken, so panning the camera — which moves
	// `left`/`top` every frame — costs no DOM reads and re-runs no effects.
	if (!metrics) return { left, top, maxHeight: undefined }
	return fitInViewport(metrics, viewportBottom, left, top)
}

/**
 * The placement maths behind {@link useViewportFit}, split out so it can be exercised without a
 * layout engine.
 *
 * @internal
 */
export function fitInViewport(metrics: Metrics, viewportBottom: number, left: number, top: number) {
	// The viewport bound is in client coordinates; these surfaces are positioned in the container's.
	const bottom = viewportBottom - metrics.containerTop - VIEWPORT_MARGIN
	const maxHeight = Math.max(MIN_HEIGHT, bottom - VIEWPORT_MARGIN)
	// How tall the surface will be once the cap applies — the height that has to stay on screen.
	const height = Math.min(metrics.height, maxHeight)
	// Clamping in painted-box terms, then handing back a positioned-box `left`/`top`: hence the
	// shift on both ends. `clamp` lets the minimum win when the two cross, which is what a surface
	// wider or taller than the space it has should do — overflow off the far edge, not the near one,
	// so its leading edge stays reachable.
	return {
		left: clamp(
			left,
			VIEWPORT_MARGIN - metrics.shiftX,
			metrics.containerWidth - metrics.width - VIEWPORT_MARGIN - metrics.shiftX
		),
		top: clamp(top, VIEWPORT_MARGIN - metrics.shiftY, bottom - height - metrics.shiftY),
		maxHeight,
	}
}
