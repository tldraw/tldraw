import { TLHandleProps, useEditorComponents, useHandleEvents } from '@tldraw/editor'

/** @public */
export function TldrawHandle({
	children,
	handle,
	shapeId,
	zoom,
	isCoarse,
	customEvents,
}: TLHandleProps) {
	const events = useHandleEvents(shapeId, handle.id)
	const { Handle } = useEditorComponents()

	if (!Handle) return null

	return (
		<g
			aria-label="handle"
			transform={`translate(${handle.x}, ${handle.y})`}
			{...(customEvents ?? events)}
		>
			{children ?? <Handle shapeId={shapeId} handle={handle} zoom={zoom} isCoarse={isCoarse} />}
		</g>
	)
}
