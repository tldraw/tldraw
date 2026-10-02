import { useActions } from '../../../context/actions'
import { useActionDisabledReason, useActionState } from '../../../hooks/useActionState'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'
import { TldrawUiMenuItem, type TLUiMenuItemProps } from './TldrawUiMenuItem'

/** @public */
export type TLUiMenuActionItemProps = {
	actionId?: string
	/** What to do when the item is disabled, by `disabled` or the action's `isEnabled`. Defaults to `'disable'`. */
	whenDisabled?: 'hide' | 'disable'
} & Partial<
	Pick<TLUiMenuItemProps, 'disabled' | 'disabledReason' | 'isSelected' | 'noClose' | 'onSelect'>
>

/** @public @react */
export function TldrawUiMenuActionItem({
	actionId = '',
	whenDisabled = 'disable',
	disabled = false,
	disabledReason,
	...rest
}: TLUiMenuActionItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	const { type: menuType } = useTldrawUiMenuContext()
	const { visible, enabled } = useActionState(action)
	const isDisabled = disabled || !enabled
	// The palette has one rule instead of whenDisabled: a disabled row shows only with a reason.
	const inPalette = menuType === 'command-palette'
	const actionReason = useActionDisabledReason(action, inPalette && isDisabled && !disabledReason)
	if (!action) return null
	if (!visible) {
		// The shortcuts dialog lists what a key does, even where the menu item wouldn't show.
		if (menuType !== 'keyboard-shortcuts') return null
	} else if (isDisabled && whenDisabled === 'hide' && !inPalette) {
		return null
	}
	return (
		<TldrawUiMenuItem
			{...(action as TLUiMenuItemProps)}
			{...rest}
			disabled={isDisabled}
			disabledReason={disabledReason ?? actionReason}
		/>
	)
}
