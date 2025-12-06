import {
	Box,
	TLPointerEventInfo,
	Vec,
	getPointerInfo,
	isAccelKey,
	normalizeWheel,
	releasePointerCapture,
	setPointerCapture,
	useContainer,
	useEditor,
	useIsDarkMode,
} from '@tldraw/editor'
import * as React from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { MinimapManager } from './MinimapManager'

/** @public @react */
export function DefaultMinimap() {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()

	const rCanvas = React.useRef<HTMLCanvasElement>(null!)
	const rPointing = React.useRef(false)

	const minimapRef = React.useRef<MinimapManager>()

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
		}
	}, [editor, container])

	const onDoubleClick = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!editor.getCurrentPageShapeIds().size) return
			if (!minimapRef.current) return

			const point = minimapRef.current.minimapScreenPointToPagePoint(
				e.clientX,
				e.clientY,
				false,
				false
			)

			const clampedPoint = minimapRef.current.minimapScreenPointToPagePoint(
				e.clientX,
				e.clientY,
				false,
				true
			)

			minimapRef.current.originPagePoint.setTo(clampedPoint)
			minimapRef.current.originPageCenter.setTo(editor.getViewportPageBounds().center)

			editor.centerOnPoint(point, { animation: { duration: editor.options.animationMediumMs } })
		},
		[editor]
	)

	const onPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!minimapRef.current) return
			const elm = e.currentTarget
			setPointerCapture(elm, e)
			if (!editor.getCurrentPageShapeIds().size) return

			rPointing.current = true

			minimapRef.current.isInViewport = false

			const point = minimapRef.current.minimapScreenPointToPagePoint(
				e.clientX,
				e.clientY,
				false,
				false
			)

			const _vpPageBounds = editor.getViewportPageBounds()
			const commonBounds = minimapRef.current.getContentPageBounds()
			const allowedBounds = new Box(
				commonBounds.x - _vpPageBounds.width / 2,
				commonBounds.y - _vpPageBounds.height / 2,
				commonBounds.width + _vpPageBounds.width,
				commonBounds.height + _vpPageBounds.height
			)

			// If we clicked inside of the allowed area, but outside of the viewport
			if (allowedBounds.containsPoint(point) && !_vpPageBounds.containsPoint(point)) {
				minimapRef.current.isInViewport = _vpPageBounds.containsPoint(point)
				const delta = Vec.Sub(_vpPageBounds.center, _vpPageBounds.point)
				const pagePoint = Vec.Add(point, delta)
				minimapRef.current.originPagePoint.setTo(pagePoint)
				minimapRef.current.originPageCenter.setTo(point)
				editor.centerOnPoint(point, { animation: { duration: editor.options.animationMediumMs } })
			} else {
				const clampedPoint = minimapRef.current.minimapScreenPointToPagePoint(
					e.clientX,
					e.clientY,
					false,
					true
				)
				minimapRef.current.isInViewport = _vpPageBounds.containsPoint(clampedPoint)
				minimapRef.current.originPagePoint.setTo(clampedPoint)
				minimapRef.current.originPageCenter.setTo(_vpPageBounds.center)
			}

			function release(e: PointerEvent) {
				if (elm) {
					releasePointerCapture(elm, e)
				}
				rPointing.current = false
				document.body.removeEventListener('pointerup', release)
			}

			document.body.addEventListener('pointerup', release)
		},
		[editor]
	)

	const onPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!minimapRef.current) return
			const point = minimapRef.current.minimapScreenPointToPagePoint(
				e.clientX,
				e.clientY,
				e.shiftKey,
				true
			)

			if (rPointing.current) {
				if (minimapRef.current.isInViewport) {
					const delta = minimapRef.current.originPagePoint
						.clone()
						.sub(minimapRef.current.originPageCenter)
					editor.centerOnPoint(Vec.Sub(point, delta))
					return
				}

				editor.centerOnPoint(point)
			}

			const pagePoint = minimapRef.current.getMinimapPagePoint(e.clientX, e.clientY)

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

	const isDarkMode = useIsDarkMode()

	React.useEffect(() => {
		// need to wait a tick for next theme css to be applied
		// otherwise the minimap will render with the wrong colors
		editor.timers.setTimeout(() => {
			minimapRef.current?.updateColors()
			minimapRef.current?.render()
		})
	}, [isDarkMode, editor])

	return (
		<div className="tlui-minimap">
			<canvas
				role="img"
				aria-label={msg('navigation-zone.minimap')}
				data-testid="minimap.canvas"
				ref={rCanvas}
				className="tlui-minimap__canvas"
				onDoubleClick={onDoubleClick}
				onPointerMove={onPointerMove}
				onPointerDown={onPointerDown}
				onWheelCapture={onWheel}
			/>
		</div>
	)
}
