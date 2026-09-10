import {
	defaultHandleExternalTldrawContent,
	Editor,
	Tldraw,
	TLFrameShape,
	TLTldrawExternalContent,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CustomPasteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [1]
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
	// [2]
	const onlyCopiedShape =
		content.rootShapeIds.length === 1
			? content.shapes.find((shape) => shape.id === content.rootShapeIds[0])
			: null

	const onlyCopiedFrame =
		onlyCopiedShape?.type === 'frame' ? (onlyCopiedShape as TLFrameShape) : null

	// only use the special behavior if the frame will be a direct child of the page (its
	// parentId isn't a shape in the document)
	const willPasteOnCurrentPage = onlyCopiedFrame
		? !editor.getShape(onlyCopiedFrame.parentId)
		: false

	// [3]
	if (point || !onlyCopiedFrame || !willPasteOnCurrentPage) {
		defaultHandleExternalTldrawContent(editor, { content, point })
		return
	}

	// [4]
	editor.putContentOntoCurrentPage(content, { select: true })
	const newlyPastedFrame = editor.getOnlySelectedShape()
	if (!newlyPastedFrame || !editor.isShapeOfType(newlyPastedFrame, 'frame')) return

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

	editor.nudgeShapes([newlyPastedFrame.id], {
		x: targetPosition - pastedBounds.minX,
		y: 0,
	})
}

/*
When you copy and paste a frame in Figma, the copy lands in free space to the right of
the original instead of on top of it. This example adds that behavior to tldraw.

[1]
`registerExternalContentHandler` replaces the handler for a content type. `'tldraw'` is
the type used for content copied from tldraw itself, so this intercepts every internal
paste. `defaultHandleExternalTldrawContent` is the built-in handler, which we fall back
to for anything we don't want to special-case.

[2]
Work out whether the clipboard holds exactly one root shape and that shape is a frame.

[3]
If the paste has an explicit `point` (for example, a paste from the context menu, which
lands at the pointer), or it isn't a lone page-level frame, use the default behavior.

[4]
Paste with the default handler first, then walk the frame's siblings from left to right
and slide the new frame past any that overlap it vertically, leaving a gap.
*/
