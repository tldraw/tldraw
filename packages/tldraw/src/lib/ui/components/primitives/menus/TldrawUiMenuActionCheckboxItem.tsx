import { useActions } from '../../../context/actions'
import { useActionState } from '../../../hooks/useActionState'
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
} & Pick<TLUiMenuCheckboxItemProps, 'disabled' | 'checked' | 'toggle'>

/** @public @react */
export function TldrawUiMenuActionCheckboxItem({
	actionId = '',
	whenDisabled = 'disable',
	disabled = false,
	checked,
	...rest
}: TLUiMenuActionCheckboxItemProps) {
	const actions = useActions()
	const action = actions[actionId]
	const { type: menuType } = useTldrawUiMenuContext()
	const { available, enabled, checked: isChecked } = useActionState(action)
	if (!action || !available) return null
	// Collectors get disabled items anyway, marked disabled, and decide for themselves.
	if ((disabled || !enabled) && whenDisabled === 'hide' && menuType !== 'collector') return null
	return (
		<TldrawUiMenuCheckboxItem
			{...(action as TLUiMenuCheckboxItemProps)}
			{...rest}
			checked={checked ?? isChecked ?? false}
			disabled={disabled || !enabled}
		/>
	)
}
