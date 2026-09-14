import { Editor } from 'tldraw'
import {
	bandZoom,
	handoffZoom,
	type Layout,
	openingZoom,
	type PlacedNode,
	type Rect,
} from './layout'

/**
 * Centre a rect at an exact zoom.
 *
 * `zoomToBounds` cannot do this. Its `targetZoom` is only an upper bound — it
 * takes the smaller of that and the zoom which would fit the box — so asking it
 * for a deep zoom on a large cell quietly gives back the shallow fitting zoom
 * instead, leaving the reader half way through a level change.
 */
export function goToRect(editor: Editor, rect: Rect, zoom: number, durationMs = 600) {
	const screenCentre = editor.getViewportScreenCenter()
	editor.setCamera(
		{
			x: screenCentre.x / zoom - (rect.x + rect.w / 2),
			y: screenCentre.y / zoom - (rect.y + rect.h / 2),
			z: zoom,
		},
		{ animation: durationMs ? { duration: durationMs } : undefined }
	)
}

/** Put a node on screen at the zoom where its own level is the one being read. */
export function goToNode(editor: Editor, layout: Layout, node: PlacedNode, durationMs = 600) {
	goToRect(editor, node.rect, bandZoom(layout.nominals, node.depth), durationMs)
}

/** Open a node: settle at the zoom where its children are the level being read. */
export function openNode(editor: Editor, layout: Layout, node: PlacedNode, durationMs = 600) {
	goToRect(editor, node.rect, bandZoom(layout.nominals, node.depth + 1), durationMs)
}

/** Pull all the way back to the whole work as a single line. */
export function goToWhole(editor: Editor, layout: Layout, durationMs = 600) {
	goToRect(editor, layout.bounds, openingZoom(layout.nominals), durationMs)
}

/**
 * Set an exact zoom, keeping the middle of the screen where it is.
 *
 * Almost. Cells are separated by gutters, and a gutter is empty at every level,
 * so holding a point in one while zooming in walks the camera down a corridor
 * of blank canvas — and the camera starts in exactly such a spot, the middle of
 * the work being the corner of four cells. The held point is first nudged into
 * the nearest cell, which moves it at most half a gutter and is invisible when
 * it is already over text.
 */
export function zoomAtCentre(editor: Editor, layout: Layout, zoom: number) {
	const centre = editor.getViewportPageBounds().center
	const cell = nodesContaining(layout, centre.x, centre.y).at(-1)?.rect
	const x = cell ? Math.min(Math.max(centre.x, cell.x), cell.x + cell.w) : centre.x
	const y = cell ? Math.min(Math.max(centre.y, cell.y), cell.y + cell.h) : centre.y
	goToRect(editor, { x, y, w: 0, h: 0 }, zoom, 0)
}

/**
 * The span a zoom control should cover: from the whole work in one sentence to
 * its deepest text at a comfortable reading size.
 *
 * Deliberately stops a little past where the last level arrives rather than as
 * far as the camera will go. Text only fills about two thirds of its box, so
 * beyond this the viewport is small enough to sit entirely inside the empty
 * part of a paragraph — the slider would end on a blank screen. The wheel still
 * goes further for anyone who wants it.
 */
export function zoomRange(layout: Layout): [min: number, max: number] {
	const deepest = layout.nominals.length - 1
	return [
		openingZoom(layout.nominals),
		handoffZoom(layout.nominals, Math.max(0, deepest - 1)) * 1.6,
	]
}

/**
 * The chain of nodes at a page point, one per level, outermost first.
 *
 * Takes the nearest node at each level rather than testing containment. Cells
 * meet exactly, so a point on a shared edge — which is where the camera starts,
 * the middle of the work being the corner of four cells — lands a rounding
 * error outside every one of them, and a containment test drops whole levels
 * out of the trail.
 */
export function nodesContaining(layout: Layout, x: number, y: number): PlacedNode[] {
	const nearest: PlacedNode[] = []
	const distances: number[] = []

	for (const node of layout.nodes) {
		const { rect } = node
		const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.w))
		const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.h))
		const distance = Math.hypot(dx, dy)
		if (distances[node.depth] === undefined || distance < distances[node.depth]) {
			distances[node.depth] = distance
			nearest[node.depth] = node
		}
	}

	return nearest.filter(Boolean)
}
