import { useMaybeEditor, useValue } from '@tldraw/editor'
import { useTools } from '../../../hooks/useTools'
import { TldrawUiMenuItem, TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuToolItemProps = {
	toolId?: string
} & Pick<TLUiMenuItemProps, 'isSelected' | 'disabled'>

/** @public @react */
export function TldrawUiMenuToolItem({ toolId = '', disabled, ...rest }: TLUiMenuToolItemProps) {
	const editor = useMaybeEditor()
	const tools = useTools()
	const tool = tools[toolId]
	const isEnabled = useValue(
		'tool is enabled',
		() => !editor || !tool?.isEnabled || tool.isEnabled(editor),
		[editor, tool]
	)
	if (!tool) return null
	const { isEnabled: _isEnabled, ...item } = tool
	return <TldrawUiMenuItem {...item} {...rest} disabled={disabled || !isEnabled} />
}
