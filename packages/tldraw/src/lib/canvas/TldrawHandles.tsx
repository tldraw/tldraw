import { useValue } from '@tldraw/state'
import { TLHandlesComponent, useEditor } from '../editor'

export const TldrawHandles: TLHandlesComponent = ({ children }) => {
	const editor = useEditor()
	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => editor.isInAny('select.idle', 'select.pointing_handle'),
		[editor]
	)

	if (!shouldDisplayHandles) return null

	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
