import { useActions } from '../../../context/actions'
import { TldrawUiMenuItem, type TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuActionItemProps = {
	actionId?: string
} & Partial<Pick<TLUiMenuItemProps, 'disabled' | 'isSelected' | 'noClose' | 'onSelect'>>

/** @public @react */
export function TldrawUiMenuActionItem({ actionId = '', ...rest }: TLUiMenuActionItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	if (!action) return null
	return <TldrawUiMenuItem {...action} {...rest} />
}
