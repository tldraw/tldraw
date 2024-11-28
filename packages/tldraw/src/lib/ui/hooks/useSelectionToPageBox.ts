import { Box, useEditor, useValue } from '@tldraw/editor'

/**
 * A hook returning a Box of the position and size of the selection on the page.
 *
 * @public
 */
export function useSelectionToPageBox() {
	const editor = useEditor()
	const selectionBounds = useValue(
		'selectionBounds',
		() => editor.getSelectionRotatedPageBounds(),
		[editor]
	)
	const camera = useValue('camera', () => editor.getCamera(), [editor])
	const pageCoordinates = selectionBounds
		? editor.pageToViewport(selectionBounds.point)
		: { x: -1000, y: -1000 }

	return Box.From({
		x: pageCoordinates?.x,
		y: pageCoordinates?.y,
		w: (selectionBounds?.w || 0) * camera.z,
		h: (selectionBounds?.h || 0) * camera.z,
	})
}
