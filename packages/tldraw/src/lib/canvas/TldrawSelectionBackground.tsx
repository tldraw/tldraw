import {
	DefaultSelectionBackground,
	TLSelectionBackgroundProps,
	useEditor,
	useValue,
} from '@tldraw/editor'

/** @public @react */
export const TldrawSelectionBackground = ({ bounds, rotation }: TLSelectionBackgroundProps) => {
	const editor = useEditor()

	const shouldDisplay = useValue(
		'should display',
		() =>
			editor.isInAny(
				'select.idle',
				'select.brushing',
				'select.scribble_brushing',
				'select.pointing_shape',
				'select.pointing_selection',
				'text.resizing'
			),
		[editor]
	)

	if (!shouldDisplay) return null

	return <DefaultSelectionBackground bounds={bounds} rotation={rotation} />
}
