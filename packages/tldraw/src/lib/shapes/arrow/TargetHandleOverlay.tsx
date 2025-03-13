import { ArrowShapeKindStyle, TLArrowShape, track, useEditor } from '@tldraw/editor'

export const TargetHandleOverlay = track(function TargetHandleOverlay({
	shape,
}: {
	shape: TLArrowShape
}) {
	const editor = useEditor()
	const arrowKind = shape ? shape.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)
	if (arrowKind !== 'elbow') return null

	return <rect x={0} y={0} width={100} height={100} fill="red" />
})
