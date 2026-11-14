import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react'
import {
	type BoxModel,
	Editor,
	getCursor,
	getPerfectDashProps,
	usePassThroughWheelEvents,
	useValue,
	VecLike,
} from 'tldraw'
import { forwardPointerEventToCanvas, isCanvasPanGesture, startCommentDrag } from './canvas-events'
import { regionDraft } from './state'

/** A region's dashed box. Purely visual — a region moves by its pin and resizes from its corner
 *  handles, so the box itself takes no pointer events. Positioned in viewport space, as a sibling
 *  of the pins in the canvas layer. */
export function RegionBox({ editor, box }: { editor: Editor; box: BoxModel }) {
	const rect = useValue(
		'region rect',
		() => {
			// Position from the page→viewport top-left; screen size scales with zoom, page size doesn't.
			const topLeft = editor.pageToViewport({ x: box.x, y: box.y })
			const zoom = editor.getZoomLevel()
			return { left: topLeft.x, top: topLeft.y, width: box.w * zoom, height: box.h * zoom }
		},
		[editor, box.x, box.y, box.w, box.h]
	)
	const { width: w, height: h } = rect
	// The group outline's dashes: drawn per side with perfect dashes (so every side starts and ends
	// on a dash), at the 1px dash scale and 1.5px stroke the editor's selection outline uses.
	const sides = [
		[0, 0, w, 0],
		[w, 0, w, h],
		[w, h, 0, h],
		[0, h, 0, 0],
	]
	return (
		<div className="tlui-cmt-canvas-region" style={rect}>
			<svg className="tlui-cmt-canvas-region__outline" width={w} height={h} aria-hidden="true">
				{sides.map(([x1, y1, x2, y2], i) => {
					const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
						Math.hypot(x2 - x1, y2 - y1),
						1,
						{ style: 'dashed', lengthRatio: 4 }
					)
					return (
						<line
							key={i}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					)
				})}
			</svg>
		</div>
	)
}

/** The live region being dragged out by the comment tool, or nothing when not dragging. */
export function RegionDraftBox({ editor }: { editor: Editor }) {
	const box = useValue('region draft', () => regionDraft.get(editor), [editor])
	if (!box) return null
	return <RegionBox editor={editor} box={box} />
}

// A corner resize handle: its normalized 0–1 spot on the box, and its cursor.
export interface RegionHandle {
	x: number
	y: number
	cursor: 'nwse-resize' | 'nesw-resize'
}

export const REGION_CORNERS: readonly RegionHandle[] = [
	{ x: 0, y: 0, cursor: 'nwse-resize' },
	{ x: 1, y: 0, cursor: 'nesw-resize' },
	{ x: 0, y: 1, cursor: 'nesw-resize' },
	{ x: 1, y: 1, cursor: 'nwse-resize' },
]

// Screen-space slack around a region's bounds within which its box and handles stay revealed, so
// the handles (which sit on the edge) are comfortably reachable.
export const REGION_HANDLE_MARGIN_PX = 12

/** Resize `box` by dragging corner `handle` to `cursor` (page coords): the box spans from the
 *  opposite corner to the cursor, normalized so dragging past that corner flips it. */
function resizeRegion(box: BoxModel, handle: RegionHandle, cursor: VecLike): BoxModel {
	const fixedX = box.x + (1 - handle.x) * box.w
	const fixedY = box.y + (1 - handle.y) * box.h
	return {
		x: Math.min(fixedX, cursor.x),
		y: Math.min(fixedY, cursor.y),
		w: Math.abs(cursor.x - fixedX),
		h: Math.abs(cursor.y - fixedY),
	}
}

/**
 * The selection's corner-handle sizing (`SelectionForegroundOverlayUtil`), in screen px for a box
 * `w`×`h` px on screen, so a region's corners look and hit exactly like a shape's resize corners.
 * Keep in step with that util: the constants are its, not tuned here.
 */
export function selectionCornerSizing(w: number, h: number, isCoarsePointer: boolean) {
	const handleSize = 8
	const mobileHandleMultiplier = isCoarsePointer ? 1.75 : 1
	const hitTargetSize = 6 * mobileHandleMultiplier
	const isSmallX = w < handleSize * 4
	const isSmallY = h < handleSize * 4
	const hitTargetSizeX =
		(isSmallX ? hitTargetSize / 2 : hitTargetSize) * (mobileHandleMultiplier * 0.75)
	const hitTargetSizeY =
		(isSmallY ? hitTargetSize / 2 : hitTargetSize) * (mobileHandleMultiplier * 0.75)
	const isTinyX = w < handleSize * 2
	const isTinyY = h < handleSize * 2
	return {
		// The corner hit square's full side: the util's `cornerHitHalfSize`, doubled.
		hitSize: Math.max(hitTargetSizeX, hitTargetSizeY) * 1.5 * 2,
		hideAlternateCorners: isTinyX || isTinyY,
		showOnlyOneCorner: isTinyX && isTinyY,
	}
}

// The selection hides the top-right and bottom-left corners on a tiny box, and the bottom-right too
// when it's tiny both ways (top-left always shows).
function isHiddenCorner(
	h: RegionHandle,
	sizing: ReturnType<typeof selectionCornerSizing>
): boolean {
	if (h.x === 0 && h.y === 0) return false
	if (h.x === 1 && h.y === 1) return sizing.showOnlyOneCorner
	return sizing.hideAlternateCorners
}

/** Draggable corner handles that resize a region. Previews live, commits on release. */
export function RegionResizeHandles({
	editor,
	box,
	handles,
	onPreview,
	onCommit,
}: {
	editor: Editor
	box: BoxModel
	handles: readonly RegionHandle[]
	onPreview(bounds: BoxModel | null): void
	onCommit(bounds: BoxModel): void
}) {
	// The box at pointer-down, captured so the box prop reflowing under the live preview doesn't move
	// the fixed edges mid-drag.
	const dragRef = useRef<{
		box: BoxModel
		handle: RegionHandle
		clientX: number
		clientY: number
		endDrag(): void
	} | null>(null)
	const wheelRef = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(wheelRef)
	// Unmounting mid-resize gets no pointer up to end the drag.
	useEffect(() => () => dragRef.current?.endDrag(), [])
	const layout = useValue(
		'region handle layout',
		() => {
			const zoom = editor.getZoomLevel()
			const sizing = selectionCornerSizing(
				box.w * zoom,
				box.h * zoom,
				editor.getInstanceState().isCoarsePointer
			)
			const dragged = dragRef.current?.handle
			const points = handles
				// The corner being dragged stays, even as the box shrinks to a size that hides it:
				// unmounting it would drop its pointer capture and strand the resize.
				.filter((h) => (h.x === dragged?.x && h.y === dragged?.y) || !isHiddenCorner(h, sizing))
				.map((h) => {
					const p = editor.pageToViewport({ x: box.x + h.x * box.w, y: box.y + h.y * box.h })
					return { ...h, key: `${h.x}-${h.y}`, left: p.x, top: p.y }
				})
			// tldraw's own resize cursors (the editor's, in the theme's cursor colour), not the
			// browser's native ones.
			const { cursor: cursorColor } = editor.getCurrentTheme().colors[editor.getColorMode()]
			const cursors = {
				'nwse-resize': getCursor('nwse-resize', 0, cursorColor),
				'nesw-resize': getCursor('nesw-resize', 0, cursorColor),
			}
			return { points, hitSize: sizing.hitSize, cursors }
		},
		[editor, box.x, box.y, box.w, box.h, handles]
	)
	const { points, hitSize, cursors } = layout
	const resized = () => {
		const drag = dragRef.current!
		return resizeRegion(
			drag.box,
			drag.handle,
			editor.screenToPage({ x: drag.clientX, y: drag.clientY })
		)
	}
	const startResize = (h: RegionHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
		// A middle/right-button or space-held press is a camera pan, not a resize.
		if (isCanvasPanGesture(editor, e)) {
			forwardPointerEventToCanvas(editor.getContainer(), e)
			return
		}
		e.stopPropagation()
		dragRef.current?.endDrag()
		dragRef.current = {
			box,
			handle: h,
			clientX: e.clientX,
			clientY: e.clientY,
			endDrag: startCommentDrag(editor, {
				cursor: h.cursor,
				onCameraMove: () => {
					if (dragRef.current) onPreview(resized())
				},
			}),
		}
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const onResize = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag) return
		drag.clientX = e.clientX
		drag.clientY = e.clientY
		onPreview(resized())
	}
	const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag) return
		drag.clientX = e.clientX
		drag.clientY = e.clientY
		const bounds = resized()
		dragRef.current = null
		drag.endDrag()
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId)
		onCommit(bounds)
	}
	// A cancelled pointer abandons the resize: the region snaps back to its stored bounds.
	const cancelResize = () => {
		const drag = dragRef.current
		if (!drag) return
		dragRef.current = null
		drag.endDrag()
		onPreview(null)
	}
	return (
		// A wheel over a handle (even mid-resize) scrolls the canvas, like everywhere else on it.
		<div ref={wheelRef} className="tlui-cmt-canvas-region-handles">
			{points.map((h) => (
				<div
					key={h.key}
					className="tlui-cmt-canvas-region-handle"
					style={{
						left: h.left,
						top: h.top,
						width: hitSize,
						height: hitSize,
						cursor: cursors[h.cursor],
					}}
					onPointerDown={startResize(h)}
					onPointerMove={onResize}
					onPointerUp={endResize}
					onPointerCancel={cancelResize}
					onLostPointerCapture={cancelResize}
				/>
			))}
		</div>
	)
}
