import {
	ANIMATION_MEDIUM_MS,
	TLPointerEventInfo,
	TLShapeId,
	normalizeWheel,
	useContainer,
	useEditor,
	useQuickReactor,
} from '@tldraw/editor'
import { Box2d, Vec2d, intersectPolygonPolygon } from '@tldraw/primitives'
import { track } from '@tldraw/state'
import * as React from 'react'
import { MinimapManager } from './MinimapManager'

export interface MinimapProps {
	shapeFill: string
	selectFill: string
	viewportFill: string
}

export const Minimap = track(function Minimap({
	shapeFill,
	selectFill,
	viewportFill,
}: MinimapProps) {
	const editor = useEditor()

	const rCanvas = React.useRef<HTMLCanvasElement>(null!)

	const container = useContainer()

	const rPointing = React.useRef(false)

	const minimap = React.useMemo(() => new MinimapManager(editor, editor.devicePixelRatio), [editor])

	const isDarkMode = editor.isDarkMode

	React.useEffect(() => {
		// Must check after render
		const raf = requestAnimationFrame(() => {
			const style = getComputedStyle(container)

			minimap.colors = {
				shapeFill: style.getPropertyValue(shapeFill).trim(),
				selectFill: style.getPropertyValue(selectFill).trim(),
				viewportFill: style.getPropertyValue(viewportFill).trim(),
			}

			minimap.render()
		})
		return () => {
			cancelAnimationFrame(raf)
		}
	}, [container, selectFill, shapeFill, viewportFill, minimap, isDarkMode])

	const onDoubleClick = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!editor.currentPageShapeIds.size) return

			const { x, y } = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, false)

			const clampedPoint = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, true)

			minimap.originPagePoint.setTo(clampedPoint)
			minimap.originPageCenter.setTo(editor.viewportPageBounds.center)

			editor.centerOnPoint(x, y, { duration: ANIMATION_MEDIUM_MS })
		},
		[editor, minimap]
	)

	const onPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			e.currentTarget.setPointerCapture(e.pointerId)
			if (!editor.currentPageShapeIds.size) return

			rPointing.current = true

			minimap.isInViewport = false

			const { x, y } = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, false)

			const clampedPoint = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, true)

			const _vpPageBounds = editor.viewportPageBounds

			minimap.originPagePoint.setTo(clampedPoint)
			minimap.originPageCenter.setTo(_vpPageBounds.center)

			minimap.isInViewport = _vpPageBounds.containsPoint(clampedPoint)

			if (!minimap.isInViewport) {
				editor.centerOnPoint(x, y, { duration: ANIMATION_MEDIUM_MS })
			}
		},
		[editor, minimap]
	)

	const onPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (rPointing.current) {
				const { x, y } = minimap.minimapScreenPointToPagePoint(
					e.clientX,
					e.clientY,
					e.shiftKey,
					true
				)

				if (minimap.isInViewport) {
					const delta = Vec2d.Sub({ x, y }, minimap.originPagePoint)
					const center = Vec2d.Add(minimap.originPageCenter, delta)
					editor.centerOnPoint(center.x, center.y)
					return
				}

				editor.centerOnPoint(x, y)
			}

			const pagePoint = minimap.getPagePoint(e.clientX, e.clientY)

			const screenPoint = editor.pageToScreen(pagePoint.x, pagePoint.y)

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(e),
				point: screenPoint,
				isPen: editor.isPenMode,
			}

			editor.dispatch(info)
		},
		[editor, minimap]
	)

	const onPointerUp = React.useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
		rPointing.current = false
	}, [])

	const onWheel = React.useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			const offset = normalizeWheel(e)

			editor.dispatch({
				type: 'wheel',
				name: 'wheel',
				delta: offset,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
			})
		},
		[editor]
	)

	// Update the minimap's dpr when the dpr changes
	useQuickReactor(
		'update dpr',
		() => {
			const { devicePixelRatio } = editor
			minimap.setDpr(devicePixelRatio)

			const canvas = rCanvas.current as HTMLCanvasElement
			const rect = canvas.getBoundingClientRect()
			const width = rect.width * devicePixelRatio
			const height = rect.height * devicePixelRatio

			// These must happen in order
			canvas.width = width
			canvas.height = height
			minimap.canvasScreenBounds.set(rect.x, rect.y, width, height)

			minimap.cvs = rCanvas.current
		},
		[editor, minimap]
	)

	const presences = React.useMemo(() => {
		return editor.store.query.records('instance_presence')
	}, [editor])

	useQuickReactor(
		'minimap render when pagebounds or collaborators changes',
		() => {
			const { devicePixelRatio, viewportPageBounds, allShapesCommonBounds } = editor

			devicePixelRatio // dereference dpr so that it renders then, too

			minimap.contentPageBounds = allShapesCommonBounds
				? Box2d.Expand(allShapesCommonBounds, viewportPageBounds)
				: viewportPageBounds

			minimap.updateContentScreenBounds()

			// All shape bounds

			const allShapeBounds = [] as (Box2d & { id: TLShapeId })[]

			editor.currentPageShapeIds.forEach((id) => {
				let pageBounds = editor.getPageBoundsById(id)! as Box2d & { id: TLShapeId }

				const pageMask = editor.getPageMaskById(id)

				if (pageMask) {
					const intersection = intersectPolygonPolygon(pageMask, pageBounds.corners)
					if (!intersection) {
						return
					}
					pageBounds = Box2d.FromPoints(intersection) as Box2d & { id: TLShapeId }
				}

				if (pageBounds) {
					pageBounds.id = id // kinda dirty but we want to include the id here
					allShapeBounds.push(pageBounds)
				}
			})

			minimap.pageBounds = allShapeBounds

			// Collaborators

			minimap.collaborators = presences.value

			minimap.render()
		},
		[editor, minimap]
	)

	return (
		<div className="tlui-minimap">
			<canvas
				ref={rCanvas}
				className="tlui-minimap__canvas"
				onDoubleClick={onDoubleClick}
				onPointerMove={onPointerMove}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
				onWheel={onWheel}
			/>
		</div>
	)
})

function getPointerInfo(e: React.PointerEvent | PointerEvent) {
	;(e as any).isKilled = true

	return {
		point: {
			x: e.clientX,
			y: e.clientY,
			z: e.pressure,
		},
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		ctrlKey: e.metaKey || e.ctrlKey,
		pointerId: e.pointerId,
		button: e.button,
		isPen: e.pointerType === 'pen',
	}
}
