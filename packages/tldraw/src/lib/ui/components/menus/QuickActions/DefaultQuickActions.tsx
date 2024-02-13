import { memo } from 'react'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'
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
	if (!content) return null

	return (
		<TldrawUiMenuContextProvider type="actions" sourceId="quick-actions">
			{content}
		</TldrawUiMenuContextProvider>
	)
})
