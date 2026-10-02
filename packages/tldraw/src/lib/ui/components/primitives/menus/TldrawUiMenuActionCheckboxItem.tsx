import { useActions } from '../../../context/actions'
import { useIsActionChecked, useIsActionEnabled } from '../../../hooks/useActionState'
import {
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './TldrawUiMenuCheckboxItem'

/** @public */
export type TLUiMenuActionCheckboxItemProps = {
	actionId?: string
	/** What to do when the action's `isEnabled` returns false. Defaults to `'disable'`. */
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
	const isEnabled = useIsActionEnabled(action)
	const isChecked = useIsActionChecked(action)
	if (!action) return null
	if (!isEnabled && whenDisabled === 'hide') return null
	return (
		<TldrawUiMenuCheckboxItem
			{...(action as TLUiMenuCheckboxItemProps)}
			{...rest}
			checked={checked ?? isChecked ?? false}
			disabled={disabled || !isEnabled}
		/>
	)
}
