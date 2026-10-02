import { useActions } from '../../../context/actions'
import { useActionState } from '../../../hooks/useActionState'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'
import { TldrawUiMenuItem, type TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuActionItemProps = {
	actionId?: string
	/** What to do when the action's `isEnabled` returns false. Defaults to `'disable'`. */
	whenDisabled?: 'hide' | 'disable'
} & Partial<Pick<TLUiMenuItemProps, 'disabled' | 'isSelected' | 'noClose' | 'onSelect'>>

/** @public @react */
export function TldrawUiMenuActionItem({
	actionId = '',
	whenDisabled = 'disable',
	disabled = false,
	...rest
}: TLUiMenuActionItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	const { type: menuType } = useTldrawUiMenuContext()
	const { visible, enabled } = useActionState(action)
	if (!action) return null
	// The shortcuts dialog lists what a key does, even where the menu item wouldn't show.
	if (!visible && menuType !== 'keyboard-shortcuts') return null
	if (!enabled && whenDisabled === 'hide') return null
	return (
		<TldrawUiMenuItem
			{...(action as TLUiMenuItemProps)}
			{...rest}
			disabled={disabled || !enabled}
		/>
	)
}
