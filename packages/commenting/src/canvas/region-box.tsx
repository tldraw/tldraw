import { type PointerEvent as ReactPointerEvent, useRef } from 'react'
import { type BoxModel, Editor, useValue, VecLike } from 'tldraw'
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
	return <div className="tlui-cmt-canvas-region" style={rect} />
}

/** The live region being dragged out by the comment tool, or nothing when not dragging. */
export function RegionDraftBox({ editor }: { editor: Editor }) {
	const box = useValue('region draft', () => regionDraft.get(editor), [editor])
	if (!box) return null
	return <RegionBox editor={editor} box={box} />
}

// A resize handle's normalized 0–1 spot on the box, and its cursor. An axis at 0.5 is *not*
// controlled by that handle — the resize math reads the spot rather than special-casing corners.
export interface RegionHandle {
	x: number
	y: number
	cursor: string
}

// The four corners, each resizing both axes.
export const REGION_CORNERS: readonly RegionHandle[] = [
	{ x: 0, y: 0, cursor: 'nwse-resize' },
	{ x: 1, y: 0, cursor: 'nesw-resize' },
	{ x: 0, y: 1, cursor: 'nesw-resize' },
	{ x: 1, y: 1, cursor: 'nwse-resize' },
]

// Screen-space slack around a region's bounds within which its box and handles stay revealed, so
// the handles (which sit on the edge) are comfortably reachable.
export const REGION_HANDLE_MARGIN_PX = 12

/** Resize `box` by dragging `handle` to `cursor` (page coords). Each controlled axis spans from the
 *  handle's fixed opposite edge to the cursor (normalized, so dragging past it flips); an axis the
 *  handle doesn't control (a midpoint, at 0.5) keeps its original position and size. */
function resizeRegion(box: BoxModel, handle: RegionHandle, cursor: VecLike): BoxModel {
	const controlsX = handle.x !== 0.5
	const controlsY = handle.y !== 0.5
	const fixedX = box.x + (1 - handle.x) * box.w
	const fixedY = box.y + (1 - handle.y) * box.h
	return {
		x: controlsX ? Math.min(fixedX, cursor.x) : box.x,
		y: controlsY ? Math.min(fixedY, cursor.y) : box.y,
		w: controlsX ? Math.abs(cursor.x - fixedX) : box.w,
		h: controlsY ? Math.abs(cursor.y - fixedY) : box.h,
	}
}

/** Draggable handles that resize a region — corners (both axes) or edges (one axis), per the resize
 *  option. Previews live, commits on release. */
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
	const boxRef = useRef<BoxModel | null>(null)
	const points = useValue(
		'region handle points',
		() =>
			handles.map((h) => {
				const p = editor.pageToViewport({ x: box.x + h.x * box.w, y: box.y + h.y * box.h })
				return { ...h, key: `${h.x}-${h.y}`, left: p.x, top: p.y }
			}),
		[editor, box.x, box.y, box.w, box.h, handles]
	)
	const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.stopPropagation()
		boxRef.current = box
		e.currentTarget.setPointerCapture(e.pointerId)
	}
	const resizedTo = (h: RegionHandle, e: ReactPointerEvent<HTMLDivElement>): BoxModel =>
		resizeRegion(boxRef.current!, h, editor.screenToPage({ x: e.clientX, y: e.clientY }))
	const onResize = (h: RegionHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
		if (boxRef.current) onPreview(resizedTo(h, e))
	}
	const endResize = (h: RegionHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
		if (!boxRef.current) return
		const bounds = resizedTo(h, e)
		boxRef.current = null
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId)
		onCommit(bounds)
	}
	return (
		<>
			{points.map((h) => (
				<div
					key={h.key}
					className="tlui-cmt-canvas-region-handle"
					style={{ left: h.left, top: h.top, cursor: h.cursor }}
					onPointerDown={startResize}
					onPointerMove={onResize(h)}
					onPointerUp={endResize(h)}
				/>
			))}
		</>
	)
}
