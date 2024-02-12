import { Editor, TLArrowShape, useEditor, useValue } from '@tldraw/editor'

function shapesWithUnboundArrows(editor: Editor) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const selectedShapes = selectedShapeIds.map((id) => {
		return editor.getShape(id)
	})

	return selectedShapes.filter((shape) => {
		if (!shape) return false
		if (
			editor.isShapeOfType<TLArrowShape>(shape, 'arrow') &&
			shape.props.start.type === 'binding'
		) {
			return false
		}
		if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow') && shape.props.end.type === 'binding') {
			return false
		}
		return true
	})
}

/** @internal */
export const useThreeStackableItems = () => {
	const editor = useEditor()
	return useValue('threeStackableItems', () => shapesWithUnboundArrows(editor).length > 2, [editor])
}

/** @internal */
export const useAllowGroup = () => {
	const editor = useEditor()
	return useValue(
		'allow group',
		() => {
			// We can't group arrows that are bound to shapes that aren't selected
			// if more than one shape has an arrow bound to it, allow group
			const selectedShapes = editor.getSelectedShapes()

			if (selectedShapes.length < 2) return false

			for (const shape of selectedShapes) {
				if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
					const { start, end } = shape.props
					if (start.type === 'binding') {
						// if the other shape is not among the selected shapes...
						if (!selectedShapes.some((s) => s.id === start.boundShapeId)) {
							return false
						}
					}
					if (end.type === 'binding') {
						// if the other shape is not among the selected shapes...
						if (!selectedShapes.some((s) => s.id === end.boundShapeId)) {
							return false
						}
					}
				}
			}
			return true
		},
		[editor]
	)

	// return useValue('allowGroup', () => shapesWithArrowsBoundToThem(editor).length > 1, [editor])
}

/** @internal */
export const useAllowUngroup = () => {
	const editor = useEditor()
	return useValue(
		'allowUngroup',
		() => editor.getSelectedShapeIds().some((id) => editor.getShape(id)?.type === 'group'),
		[editor]
	)
}

export const showMenuPaste =
	typeof window !== 'undefined' &&
	'navigator' in window &&
	Boolean(navigator.clipboard) &&
	Boolean(navigator.clipboard.read)
