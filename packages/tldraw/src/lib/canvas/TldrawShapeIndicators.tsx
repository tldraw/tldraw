import { useEditor, useValue, WebGLShapeIndicators } from '@tldraw/editor'

/** @public @react */
export function TldrawShapeIndicators() {
	const editor = useEditor()

	const isInSelectState = useValue(
		'is in a valid select state',
		() => {
			return editor.isInAny(
				'select.idle',
				'select.brushing',
				'select.scribble_brushing',
				'select.editing_shape',
				'select.pointing_shape',
				'select.pointing_selection',
				'select.pointing_handle'
			)
		},
		[editor]
	)

	return <WebGLShapeIndicators hideAll={!isInSelectState} />
}
