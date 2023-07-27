import {
	ANIMATION_MEDIUM_MS,
	Box2d,
	TLPointerEventInfo,
	TLShapeId,
	Vec2d,
	getPointerInfo,
	intersectPolygonPolygon,
	normalizeWheel,
	setPointerCapture,
	useComputed,
	useEditor,
	useIsDarkMode,
	useQuickReactor,
} from '@tldraw/editor'
import * as React from 'react'
import { MinimapManager } from './MinimapManager'

export interface MinimapProps {
	shapeFill: string
	selectFill: string
	viewportFill: string
}

export function Minimap({ shapeFill, selectFill, viewportFill }: MinimapProps) {
	const editor = useEditor()

	const rCanvas = React.useRef<HTMLCanvasElement>(null!)
	const rPointing = React.useRef(false)

	const isDarkMode = useIsDarkMode()
	const devicePixelRatio = useComputed('dpr', () => editor.instanceState.devicePixelRatio, [editor])
	const presences = React.useMemo(() => editor.store.query.records('instance_presence'), [editor])

	const minimap = React.useMemo(() => new MinimapManager(editor), [editor])

	React.useEffect(() => {
		// Must check after render
		const raf = requestAnimationFrame(() => {
			const style = getComputedStyle(editor.getContainer())

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
	}, [editor, selectFill, shapeFill, viewportFill, minimap, isDarkMode])

	const onDoubleClick = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!editor.shapeIdsOnCurrentPage.size) return

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
			setPointerCapture(e.currentTarget, e)
			if (!editor.shapeIdsOnCurrentPage.size) return

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
				...getPointerInfo(e, editor.getContainer()),
				point: screenPoint,
				isPen: editor.instanceState.isPenMode,
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
		'update when dpr changes',
		() => {
			const dpr = devicePixelRatio.value
			minimap.setDpr(dpr)

			const canvas = rCanvas.current as HTMLCanvasElement
			const rect = canvas.getBoundingClientRect()
			const width = rect.width * dpr
			const height = rect.height * dpr

			// These must happen in order
			canvas.width = width
			canvas.height = height
			minimap.canvasScreenBounds.set(rect.x, rect.y, width, height)

			minimap.cvs = rCanvas.current
		},
		[devicePixelRatio, minimap]
	)

	useQuickReactor(
		'minimap render when pagebounds or collaborators changes',
		() => {
			const {
				shapeIdsOnCurrentPage,
				viewportPageBounds,
				commonBoundsOfAllShapesOnCurrentPage: allShapesCommonBounds,
			} = editor

			const _dpr = devicePixelRatio.value

			minimap.contentPageBounds = allShapesCommonBounds
				? Box2d.Expand(allShapesCommonBounds, viewportPageBounds)
				: viewportPageBounds

			minimap.updateContentScreenBounds()

			// All shape bounds

			const allShapeBounds = [] as (Box2d & { id: TLShapeId })[]

			shapeIdsOnCurrentPage.forEach((id) => {
				let pageBounds = editor.getPageBounds(id) as Box2d & { id: TLShapeId }
				if (!pageBounds) return

				const pageMask = editor.getPageMask(id)

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
}
