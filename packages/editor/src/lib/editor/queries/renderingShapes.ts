import { TLShapeId } from '@tldraw/tlschema'
import type { Editor, TLRenderingShape } from '../Editor'

/**
 * Walk the shape tree in paint order and give each shape the index, background index and
 * inherited opacity it renders with.
 */
export function getUnorderedRenderingShapes(
	editor: Editor,
	useEditorState: boolean
): TLRenderingShape[] {
	// Here we get the shape as well as any of its children, as well as their
	// opacities. If the shape is being erased, and none of its ancestors are
	// being erased, then we reduce the opacity of the shape and all of its
	// ancestors; but we don't apply this effect more than once among a set
	// of descendants so that it does not compound.

	// This is designed to keep all the shapes in a single list which
	// allows the DOM nodes to be reused even when they become children
	// of other nodes.

	const renderingShapes: TLRenderingShape[] = []

	let nextIndex = editor.options.maxShapesPerPage * 2
	let nextBackgroundIndex = editor.options.maxShapesPerPage

	const erasingShapeIds = new Set(editor.getErasingShapeIds())

	const addShapeById = (id: TLShapeId, opacity: number, isAncestorErasing: boolean) => {
		const shape = editor.getShape(id)
		if (!shape) return

		if (editor.isShapeHidden(shape)) {
			// process children just in case they are overriding the hidden state
			const isErasing = isAncestorErasing || erasingShapeIds.has(id)
			for (const childId of editor.getSortedChildIdsForParent(id)) {
				addShapeById(childId, opacity, isErasing)
			}
			return
		}

		opacity *= shape.opacity
		let isShapeErasing = false
		const util = editor.getShapeUtil(shape)

		if (useEditorState) {
			isShapeErasing = !isAncestorErasing && erasingShapeIds.has(id)
			if (isShapeErasing) {
				opacity *= 0.32
			}
		}

		renderingShapes.push({
			id,
			shape,
			util,
			index: nextIndex,
			backgroundIndex: nextBackgroundIndex,
			opacity,
		})

		nextIndex += 1
		nextBackgroundIndex += 1

		const childIds = editor.getSortedChildIdsForParent(id)
		if (!childIds.length) return

		let backgroundIndexToRestore = null
		if (util.providesBackgroundForChildren(shape)) {
			backgroundIndexToRestore = nextBackgroundIndex
			nextBackgroundIndex = nextIndex
			nextIndex += editor.options.maxShapesPerPage
		}

		for (const childId of childIds) {
			addShapeById(childId, opacity, isAncestorErasing || isShapeErasing)
		}

		if (backgroundIndexToRestore !== null) {
			nextBackgroundIndex = backgroundIndexToRestore
		}
	}

	// If we're using editor state, then we're only interested in on-screen shapes.
	// If we're not using the editor state, then we're interested in ALL shapes, even those from other pages.
	const pages = useEditorState ? [editor.getCurrentPage()] : editor.getPages()
	for (const page of pages) {
		for (const childId of editor.getSortedChildIdsForParent(page.id)) {
			addShapeById(childId, 1, false)
		}
	}

	return renderingShapes
}
