import {
	defaultHandleExternalTldrawContent,
	Editor,
	Tldraw,
	TLFrameShape,
	TLTldrawExternalContent,
} from 'tldraw'

// this example adds special behavior when pasting a single frame shape, matching the behavior of figma
export default function CustomPasteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// on mount, override the default tldraw handler
					editor.registerExternalContentHandler('tldraw', (content) =>
						handleCustomTldrawPaste(editor, content)
					)
				}}
			/>
		</div>
	)
}

const SPACING_BETWEEN_FRAMES = 50

function handleCustomTldrawPaste(editor: Editor, { content, point }: TLTldrawExternalContent) {
	// find the only shape in the pasted content
	const onlyCopiedShape =
		content.rootShapeIds.length === 1
			? content.shapes.find((shape) => shape.id === content.rootShapeIds[0])
			: null

	// make sure that the shape is a frame. if it is, retrieve the current version of that frame
	// from the document.
	const onlyCopiedFrame =
		onlyCopiedShape?.type === 'frame' ? (onlyCopiedShape as TLFrameShape) : null

	// we only want to use our special behavior if the frame (current & pasted) will be a direct
	// descendant of the current page.
	const willPasteOnCurrentPage = onlyCopiedFrame
		? !editor.getShape(onlyCopiedFrame.parentId)
		: false

	// if the paste is happening at a specific point, or we didn't copy a single frame that belongs
	// to this page, fall back to the default paste behavior
	if (point || !onlyCopiedFrame || !willPasteOnCurrentPage) {
		defaultHandleExternalTldrawContent(editor, { content, point })
		return
	}

	// if we are pasting a single frame, and that frame is still in the document, we want to find a
	// free space to the right of the frame to put this one.
	editor.putContentOntoCurrentPage(content, { select: true })
	const newlyPastedFrame = editor.getOnlySelectedShape()
	if (!newlyPastedFrame || !editor.isShapeOfType<TLFrameShape>(newlyPastedFrame, 'frame')) return

	const siblingIds = editor.getSortedChildIdsForParent(newlyPastedFrame.parentId)
	const pastedBounds = editor.getShapePageBounds(newlyPastedFrame.id)!
	let targetPosition = pastedBounds.minX

	const siblingBounds = siblingIds
		.map((id) => ({ id, bounds: editor.getShapePageBounds(id)! }))
		.sort((a, b) => a.bounds.minX - b.bounds.minX)

	for (const sibling of siblingBounds) {
		if (sibling.id === newlyPastedFrame.id) continue

		// if this sibling is above or below the copied frame, we don't need to take it into account
		if (sibling.bounds.minY > pastedBounds.maxY || sibling.bounds.maxY < pastedBounds.minY) continue

		// if the sibling is to the left of the copied frame, we don't need to take it into account
		if (sibling.bounds.maxX < targetPosition) continue

		// if the sibling is to the right of where the pasted frame would end up, we don't care about it
		if (sibling.bounds.minX > targetPosition + pastedBounds.w) continue

		// otherwise, we need to shift our target right edge to the right of this sibling
		targetPosition = sibling.bounds.maxX + SPACING_BETWEEN_FRAMES
	}

	// translate the pasted frame into position:
	editor.nudgeShapes([newlyPastedFrame.id], {
		x: targetPosition - pastedBounds.minX,
		y: 0,
	})
}
