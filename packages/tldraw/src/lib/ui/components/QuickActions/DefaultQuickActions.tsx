import { memo } from 'react'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultQuickActionsContent } from './DefaultQuickActionsContent'

/** @public */
export type TLUiQuickActionsProps = {
	children?: any
}

/** @public */
export const DefaultQuickActions = memo(function DefaultQuickActions({
	children,
}: TLUiQuickActionsProps) {
	const content = children ?? <DefaultQuickActionsContent />

	return (
		<TldrawUiMenuContextProvider type="small-icons" sourceId="quick-actions">
			{content}
		</TldrawUiMenuContextProvider>
	)
})
