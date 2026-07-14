import {
	Box,
	TLPointerEventInfo,
	Vec,
	getPointerInfo,
	isAccelKey,
	normalizeWheel,
	setPointerCapture,
	useContainer,
	useColorMode,
	useEditor,
	useValue,
} from '@tldraw/editor'
import * as React from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { MinimapManager } from './MinimapManager'

// Squared distance (in screen pixels) the pointer can move after pointer down before
// it counts as a drag. Sub-pixel jitter that accompanies a click stays below this, so
// it doesn't recenter the camera instantly and cut off the easing animation.
const CLICK_JITTER_THRESHOLD_SQ = 4

/** @public @react */
export function DefaultMinimap() {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()

	const rCanvas = React.useRef<HTMLCanvasElement>(null!)
	const rPointing = React.useRef(false)
	const rActivePointerId = React.useRef<number | null>(null)
	const rOriginScreenPoint = React.useRef(new Vec())

	const minimapRef = React.useRef<MinimapManager | undefined>(undefined)

	React.useEffect(() => {
		try {
			const minimap = new MinimapManager(editor, rCanvas.current, container)
			minimapRef.current = minimap
			return minimapRef.current.close
		} catch (e) {
			editor.annotateError(e, {
				origin: 'minimap',
				willCrashApp: false,
			})
			editor.timers.setTimeout(() => {
				throw e
			})
			return undefined
		}
	}, [editor, container])

	const onDoubleClick = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!editor.getCurrentPageShapeIds().size) return
			const minimap = minimapRef.current
			if (!minimap) return

			const { clientX: x, clientY: y } = e

			// Stash the clamped point / clamped viewport page center
			const clampedPoint = minimap.minimapScreenPointToPagePoint(x, y, false, true)
			minimap.originPagePoint.setTo(clampedPoint)
			minimap.originPageCenter.setTo(editor.getViewportPageBounds().center)

			// Then center on the unclamped point
			const point = minimap.minimapScreenPointToPagePoint(x, y, false, false)
			editor.centerOnPoint(point, { animation: { duration: editor.options.animationMediumMs } })
		},
		[editor]
	)

	const onPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const minimap = minimapRef.current
			if (!minimap) return
			if (e.button !== 0) return

			const elm = e.currentTarget
			setPointerCapture(elm, e)
			if (!editor.getCurrentPageShapeIds().size) return

			const { clientX: x, clientY: y } = e

			rPointing.current = true
			rActivePointerId.current = e.pointerId
			rOriginScreenPoint.current = new Vec(x, y)

			minimap.isInViewport = false

			const point = minimap.minimapScreenPointToPagePoint(x, y, false, false)

			const vpPageBounds = editor.getViewportPageBounds()
			const commonBounds = minimap.getContentPageBounds()
			const allowedBounds = new Box(
				commonBounds.x - vpPageBounds.width / 2,
				commonBounds.y - vpPageBounds.height / 2,
				commonBounds.width + vpPageBounds.width,
				commonBounds.height + vpPageBounds.height
			)

			// If we clicked inside of the allowed area, but outside of the viewport
			if (allowedBounds.containsPoint(point) && !vpPageBounds.containsPoint(point)) {
				const delta = Vec.Sub(vpPageBounds.center, vpPageBounds.point)
				const pagePoint = Vec.Add(point, delta)
				minimap.originPagePoint.setTo(pagePoint)
				minimap.originPageCenter.setTo(point)
				editor.centerOnPoint(point, { animation: { duration: editor.options.animationMediumMs } })
			} else {
				const clampedPoint = minimap.minimapScreenPointToPagePoint(x, y, false, true)
				minimap.isInViewport = vpPageBounds.containsPoint(clampedPoint)
				minimap.originPagePoint.setTo(clampedPoint)
				minimap.originPageCenter.setTo(vpPageBounds.center)
			}

			const body = editor.getContainerDocument().body

			function endDrag() {
				if (rActivePointerId.current !== null && elm.hasPointerCapture(rActivePointerId.current)) {
					elm.releasePointerCapture(rActivePointerId.current)
				}

				rPointing.current = false
				rActivePointerId.current = null
				body.removeEventListener('pointerup', endDrag)
				body.removeEventListener('pointercancel', endDrag)
				body.removeEventListener('contextmenu', endDrag, true)
			}

			body.addEventListener('pointerup', endDrag)
			body.addEventListener('pointercancel', endDrag)
			body.addEventListener('contextmenu', endDrag, true)
		},
		[editor]
	)

	const onPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const minimap = minimapRef.current
			if (!minimap) return

			const { clientX: x, clientY: y } = e

			const point = minimap.minimapScreenPointToPagePoint(x, y, e.shiftKey, true)

			if (rPointing.current) {
				// Ignore the sub-pixel pointer jitter that accompanies a click, so it doesn't
				// cut off the easing animation started on pointer down.
				if (Vec.Dist2(rOriginScreenPoint.current, new Vec(x, y)) <= CLICK_JITTER_THRESHOLD_SQ) {
					return
				}

				if (minimap.isInViewport) {
					const delta = minimap.originPagePoint.clone().sub(minimap.originPageCenter)
					editor.centerOnPoint(Vec.Sub(point, delta))
					return
				}

				editor.centerOnPoint(point)
			}

			const pagePoint = minimap.getMinimapPagePoint(x, y)

			const screenPoint = editor.pageToScreen(pagePoint)

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(editor, e),
				point: screenPoint,
				isPen: editor.getInstanceState().isPenMode,
			}

			editor.dispatch(info)
		},
		[editor]
	)

	const onWheel = React.useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			const offset = normalizeWheel(e)

			editor.dispatch({
				type: 'wheel',
				name: 'wheel',
				delta: offset,
				point: new Vec(e.clientX, e.clientY),
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
				metaKey: e.metaKey,
				accelKey: isAccelKey(e),
			})
		},
		[editor]
	)

	const colorMode = useColorMode()
	const currentThemeId = useValue('current theme id', () => editor.getCurrentThemeId(), [editor])

	React.useEffect(() => {
		// need to wait a tick for next theme css to be applied
		// otherwise the minimap will render with the wrong colors
		editor.timers.setTimeout(() => {
			minimapRef.current?.updateColors()
			minimapRef.current?.render()
		})
	}, [colorMode, currentThemeId, editor])

	return (
		<div className="tlui-minimap">
			<canvas
				ref={rCanvas}
				role="img"
				aria-label={msg('navigation-zone.minimap')}
				data-testid="minimap.canvas"
				className="tlui-minimap__canvas"
				onDoubleClick={onDoubleClick}
				onPointerMove={onPointerMove}
				onPointerDown={onPointerDown}
				onWheelCapture={onWheel}
			/>
		</div>
	)
}
