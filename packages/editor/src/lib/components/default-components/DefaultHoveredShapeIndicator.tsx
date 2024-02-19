import { TLShapeId } from '@tldraw/tlschema'
import { useEditorComponents } from '../../hooks/useEditorComponents'

/** @public */
export type TLHoveredShapeIndicatorProps = {
	shapeId: TLShapeId
}

/** @public */
export function DefaultHoveredShapeIndicator({ shapeId }: TLHoveredShapeIndicatorProps) {
	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null
	return <ShapeIndicator className="tl-user-indicator__hovered" shapeId={shapeId} />
}
