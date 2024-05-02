import {
	TLHoveredShapeIndicatorProps,
	useEditor,
	useEditorComponents,
	useValue,
} from '@tldraw/editor'

/** @public */
export function TldrawHoveredShapeIndicator({ shapeId }: TLHoveredShapeIndicatorProps) {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()
	const showHoveredShapeIndicator = useValue(
		'show hovered',
		() => {
			// When the editor is editing a shape and hovering that shape,
			// don't show its indicator; but DO show other hover indicators
			if (editor.isIn('select.editing_shape')) {
				return editor.getHoveredShapeId() !== editor.getEditingShapeId()
			}

			// Otherise, only show the hovered indicator when the editor
			// is in the idle state
			return editor.isInAny('select.idle')
		},
		[editor]
	)
	if (!ShapeIndicator) return null
	if (!showHoveredShapeIndicator) return null
	return <ShapeIndicator className="tl-user-indicator__hovered" shapeId={shapeId} />
}

//
