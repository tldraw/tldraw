import { useValue } from '@tldraw/state'
import { ComponentType } from 'react'
import { useEditor } from '../../hooks/useEditor'

export type TLHandlesComponent = ComponentType<{
	className?: string
	children: any
}>

export const DefaultHandles: TLHandlesComponent = ({ children }) => {
	const editor = useEditor()
	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => editor.isInAny('select.idle', 'select.pointing_handle'),
		[editor]
	)

	if (!shouldDisplayHandles) return null

	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
