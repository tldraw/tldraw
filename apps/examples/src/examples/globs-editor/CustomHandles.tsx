import { useEditor, useValue } from 'tldraw'

export function CustomHandles({ children }: { children: React.ReactNode }) {
	const editor = useEditor()

	// todo: maybe display note shape handles here?

	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => {
			if (
				editor.isInAny(
					'select.idle',
					'select.pointing_handle',
					'select.pointing_shape',
					'select.dragging_handle'
				)
			) {
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
