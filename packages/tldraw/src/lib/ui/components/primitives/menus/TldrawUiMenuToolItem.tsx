import { useMaybeEditor, useValue } from '@tldraw/editor'
import { isToolAvailable } from '../../../context/action-state'
import { useTools } from '../../../hooks/useTools'
import { TldrawUiMenuItem, TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuToolItemProps = {
	toolId?: string
} & Pick<TLUiMenuItemProps, 'isSelected' | 'disabled'>

/** @public @react */
export function TldrawUiMenuToolItem({ toolId = '', ...rest }: TLUiMenuToolItemProps) {
	const editor = useMaybeEditor()
	const tools = useTools()
	const tool = tools[toolId]
	const isAvailable = useValue(
		'tool available',
		() => !editor || !tool || isToolAvailable(editor, tool),
		[editor, tool]
	)
	if (!tool || !isAvailable) return null
	return <TldrawUiMenuItem {...tool} {...rest} />
}
