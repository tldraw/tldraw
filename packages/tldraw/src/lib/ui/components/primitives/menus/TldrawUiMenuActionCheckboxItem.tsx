import { useActions } from '../../../context/actions'
import { useActionDisabledReason, useActionState } from '../../../hooks/useActionState'
import {
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './TldrawUiMenuCheckboxItem'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export type TLUiMenuActionCheckboxItemProps = {
	actionId?: string
	/** What to do when the item is disabled, by `disabled` or the action's `isEnabled`. Defaults to `'disable'`. */
	whenDisabled?: 'hide' | 'disable'
} & Pick<TLUiMenuCheckboxItemProps, 'disabled' | 'disabledReason' | 'checked' | 'toggle'>

/** @public @react */
export function TldrawUiMenuActionCheckboxItem({
	actionId = '',
	whenDisabled = 'disable',
	disabled = false,
	disabledReason,
	checked,
	...rest
}: TLUiMenuActionCheckboxItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	const { type: menuType } = useTldrawUiMenuContext()
	const { visible, enabled, checked: isChecked } = useActionState(action)
	const isDisabled = disabled || !enabled
	// The palette has one rule instead of whenDisabled: a disabled row shows only with a reason.
	const inPalette = menuType === 'command-palette'
	const actionReason = useActionDisabledReason(action, inPalette && isDisabled && !disabledReason)
	if (!action || !visible) return null
	if (isDisabled && whenDisabled === 'hide' && !inPalette) return null
	return (
		<TldrawUiMenuCheckboxItem
			{...(action as TLUiMenuCheckboxItemProps)}
			{...rest}
			checked={checked ?? isChecked ?? false}
			disabled={isDisabled}
			disabledReason={disabledReason ?? actionReason}
		/>
	)
}
