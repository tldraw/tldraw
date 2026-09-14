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

/** Set an exact zoom, holding a screen point still. */
export function setZoom(editor: Editor, zoom: number, screenPoint?: { x: number; y: number }) {
	const point = screenPoint ?? editor.getViewportScreenCenter()
	const camera = editor.getCamera()
	editor.setCamera(
		{
			x: camera.x + (point.x / zoom - point.x) - (point.x / camera.z - point.x),
			y: camera.y + (point.y / zoom - point.y) - (point.y / camera.z - point.y),
			z: zoom,
		},
		{ immediate: true }
	)
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

/** The chain of nodes containing a page point, outermost first. */
export function nodesContaining(layout: Layout, x: number, y: number): PlacedNode[] {
	return layout.nodes
		.filter(
			({ rect }) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
		)
		.sort((a, b) => a.depth - b.depth)
}
