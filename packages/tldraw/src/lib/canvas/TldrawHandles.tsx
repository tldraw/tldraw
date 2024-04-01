import { TLHandlesProps, useEditor, useValue } from '@tldraw/editor'

/** @public */
export function TldrawHandles({ children }: TLHandlesProps) {
	const editor = useEditor()

	// todo: maybe display note shape handles here?

	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => editor.isInAny('select.idle', 'select.pointing_handle'),
		[editor]
	)

	if (!shouldDisplayHandles) return null

	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
