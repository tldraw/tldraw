import {
	ANIMATION_MEDIUM_MS,
	Box2d,
	TLPointerEventInfo,
	TLShapeId,
	Vec2d,
	getPointerInfo,
	intersectPolygonPolygon,
	normalizeWheel,
	releasePointerCapture,
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
	const devicePixelRatio = useComputed('dpr', () => editor.getInstanceState().devicePixelRatio, [
		editor,
	])
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
			if (!editor.getCurrentPageShapeIds().size) return

			const point = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, false)

			const clampedPoint = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, true)

			minimap.originPagePoint.setTo(clampedPoint)
			minimap.originPageCenter.setTo(editor.getViewportPageBounds().center)

			editor.centerOnPoint(point, { duration: ANIMATION_MEDIUM_MS })
		},
		[editor, minimap]
	)

	const onPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const elm = e.currentTarget
			setPointerCapture(elm, e)
			if (!editor.getCurrentPageShapeIds().size) return

			rPointing.current = true

			minimap.isInViewport = false

			const point = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, false)

			const clampedPoint = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, false, true)

			const _vpPageBounds = editor.getViewportPageBounds()

			minimap.isInViewport = _vpPageBounds.containsPoint(clampedPoint)

			if (minimap.isInViewport) {
				minimap.originPagePoint.setTo(clampedPoint)
				minimap.originPageCenter.setTo(_vpPageBounds.center)
			} else {
				const delta = Vec2d.Sub(_vpPageBounds.center, _vpPageBounds.point)
				const pagePoint = Vec2d.Add(point, delta)
				minimap.originPagePoint.setTo(pagePoint)
				minimap.originPageCenter.setTo(point)
				editor.centerOnPoint(point, { duration: ANIMATION_MEDIUM_MS })
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
		[editor, minimap]
	)

	const onPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const point = minimap.minimapScreenPointToPagePoint(e.clientX, e.clientY, e.shiftKey, true)

			if (rPointing.current) {
				if (minimap.isInViewport) {
					const delta = minimap.originPagePoint.clone().sub(minimap.originPageCenter)
					editor.centerOnPoint(Vec2d.Sub(point, delta))
					return
				}

				editor.centerOnPoint(point)
			}

			const pagePoint = minimap.getPagePoint(e.clientX, e.clientY)

			const screenPoint = editor.pageToScreen(pagePoint)

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(e),
				point: screenPoint,
				isPen: editor.getInstanceState().isPenMode,
			}

			editor.dispatch(info)
		},
		[editor, minimap]
	)

	const onWheel = React.useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			const offset = normalizeWheel(e)

			editor.dispatch({
				type: 'wheel',
				name: 'wheel',
				delta: offset,
				point: new Vec2d(e.clientX, e.clientY),
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
			const dpr = devicePixelRatio.get()
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
			const shapeIdsOnCurrentPage = editor.getCurrentPageShapeIds()
			const commonBoundsOfAllShapesOnCurrentPage = editor.getCurrentPageBounds()
			const viewportPageBounds = editor.getViewportPageBounds()

			const _dpr = devicePixelRatio.get() // dereference

			minimap.contentPageBounds = commonBoundsOfAllShapesOnCurrentPage
				? Box2d.Expand(commonBoundsOfAllShapesOnCurrentPage, viewportPageBounds)
				: viewportPageBounds

			minimap.updateContentScreenBounds()

			// All shape bounds

			const allShapeBounds = [] as (Box2d & { id: TLShapeId })[]

			shapeIdsOnCurrentPage.forEach((id) => {
				let pageBounds = editor.getShapePageBounds(id) as Box2d & { id: TLShapeId }
				if (!pageBounds) return

				const pageMask = editor.getShapeMask(id)

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
			minimap.collaborators = presences.get()
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
				onWheel={onWheel}
			/>
		</div>
	)
}
