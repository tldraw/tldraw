import { useActions } from '../../../context/actions'
import {
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './TldrawUiMenuCheckboxItem'

/** @public */
export type TLUiMenuActionCheckboxItemProps = {
	actionId?: string
} & Pick

/** @public @react */
export function TldrawUiMenuActionCheckboxItem(
	{ actionId = '', ...rest }: TLUiMenuActionCheckboxItemProps
) {
	const actions = useActions()
	const action = actions[actionId]
	if (!action) return null
	return <TldrawUiMenuCheckboxItem {...action} {...rest} />
}
