import {
	ShapeIndicator,
	TLHoveredShapeIndicatorComponent,
	useEditor,
	useValue,
} from '@tldraw/editor'

export const TldrawHoveredShapeIndicator: TLHoveredShapeIndicatorComponent = ({ shapeId }) => {
	const editor = useEditor()
	const hideHoveredShapeIndicator = useValue(
		'hide hovered',
		() => !editor.isInAny('select.idle', 'select.editing_shape'),
		[editor]
	)
	if (hideHoveredShapeIndicator) return null
	return <ShapeIndicator className="tl-user-indicator__hovered" id={shapeId} />
}

//
