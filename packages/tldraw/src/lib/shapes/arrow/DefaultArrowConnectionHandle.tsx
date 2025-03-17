import { track, useEditor } from '@tldraw/editor'

export interface ArrowConnectionHandleProps {
	x: number
	y: number
}

export const DefaultArrowConnectionHandle = track(function DefaultArrowConnectionHandle({
	x,
	y,
}: ArrowConnectionHandleProps) {
	const editor = useEditor()
	const zoom = editor.getZoomLevel()
	const fr = 4 / Math.max(zoom, 0.25)
	return (
		<g className="tl-handle tl-handle__arrow-connection" transform={`translate(${x}, ${y})`}>
			<circle className="tl-handle__fg" r={fr} />
		</g>
	)
})
