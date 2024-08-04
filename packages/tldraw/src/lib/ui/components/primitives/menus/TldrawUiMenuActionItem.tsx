import { useActions } from '../../../context/actions'
import { TldrawUiMenuItem, type TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuActionItemProps = {
	action?: string
} & Partial<Pick<TLUiMenuItemProps, 'disabled' | 'isSelected' | 'noClose' | 'onSelect'>>

/** @public @react */
export function TldrawUiMenuActionItem({
	action: actionId = '',
	...rest
}: TLUiMenuActionItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	if (!action) return null
	return <TldrawUiMenuItem {...action} {...rest} />
}
