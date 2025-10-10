import { TLHandlesProps, useEditor, useValue } from 'tldraw'

export function ControlHandles({ children }: TLHandlesProps) {
	const editor = useEditor()

	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => {
			if (editor.isInAny('select.editing_shape', 'select.dragging_handle')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				return onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'bezier-curve')
			}

			if (editor.isInAny('select.idle', 'select.pointing_shape')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				return !(onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'bezier-curve'))
			}

			if (editor.isInAny('select.idle', 'select.pointing_handle', 'select.pointing_shape')) {
				return true
			}
			if (editor.isInAny('select.editing_shape')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				return onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'note')
			}
			return false
		},
		[editor]
	)

	if (!shouldDisplayHandles) return null

	return (
		<svg className="tl-user-handles tl-overlays__item" aria-hidden="true">
			{children}
		</svg>
	)
}
