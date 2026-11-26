import { useEditor, useValue } from '@tldraw/editor'
import { isToolEnabled, useTools } from '../../../hooks/useTools'
import { TldrawUiMenuItem, TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuToolItemProps = {
	toolId?: string
} & Pick<TLUiMenuItemProps, 'isSelected' | 'disabled'>

/** @public @react */
export function TldrawUiMenuToolItem({ toolId = '', ...rest }: TLUiMenuToolItemProps) {
	const tools = useTools()
	const tool = tools[toolId]
	const editor = useEditor()
	const enabled = useValue('tool enabled', () => !tool || isToolEnabled(editor, tool), [
		editor,
		tool,
	])
	if (!tool) return null
	return <TldrawUiMenuItem {...tool} {...rest} disabled={rest.disabled || !enabled} />
}
