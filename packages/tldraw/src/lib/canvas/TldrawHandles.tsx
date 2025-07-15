import { TLHandlesProps, useEditor, useValue } from '@tldraw/editor'

/** @public @react */
export function TldrawHandles({ children }: TLHandlesProps) {
	const editor = useEditor()

	// todo: maybe display note shape handles here?

	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => {
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
