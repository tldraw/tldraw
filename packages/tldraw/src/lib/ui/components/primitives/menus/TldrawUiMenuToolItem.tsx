import { useTools } from '../../../hooks/useTools'
import { TldrawUiMenuItem, TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuToolItemProps = {
	toolId?: string
} & Pick<TLUiMenuItemProps, 'isSelected' | 'disabled'>

/** @public @react */
export function TldrawUiMenuToolItem({ toolId = '', ...rest }: TLUiMenuToolItemProps) {
	const tools = useTools()
	const tool = tools[toolId]
	if (!tool) return null
	return <TldrawUiMenuItem {...tool} {...rest} />
}
