import { useActions } from '../../../context/actions'
import { useIsActionEnabled } from '../../../hooks/useActionState'
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
	const isEnabled = useIsActionEnabled(action)
	if (!action) return null
	if (!isEnabled && whenDisabled === 'hide') return null
	return (
		<TldrawUiMenuItem
			{...(action as TLUiMenuItemProps)}
			{...rest}
			disabled={disabled || !isEnabled}
		/>
	)
}
