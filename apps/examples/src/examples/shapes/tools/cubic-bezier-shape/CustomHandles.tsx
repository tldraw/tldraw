import { TLHandlesProps, useEditor, useValue } from 'tldraw'

export function CustomHandles({ children }: TLHandlesProps) {
	const editor = useEditor()

	const shouldDisplayDefaultHandles = useValue(
		'shouldDisplayDefaultHandles',
		() => {
			// bezier curve handles
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'bezier-curve')) {
				return editor.isInAny(
					'select.editing_shape',
					'select.pointing_handle',
					'select.dragging_handle'
				)
			}

			// default handle behavior
			if (editor.isInAny('select.idle', 'select.pointing_handle', 'select.pointing_shape')) {
				return true
			}
			if (editor.isInAny('select.editing_shape')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				if (!onlySelectedShape) return false
				return onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'note')
			}
			return false
		},
		[editor]
	)

	if (!shouldDisplayDefaultHandles) return null

	return (
		<svg className="tl-user-handles tl-overlays__item" aria-hidden="true">
			{children}
		</svg>
	)
}
