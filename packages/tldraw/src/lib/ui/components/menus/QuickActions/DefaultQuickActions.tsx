import { useTldrawUiComponents } from '../../../hooks/useTldrawUiComponents'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'

/** @public */
export function DefaultQuickActions() {
	const { QuickActionsContent } = useTldrawUiComponents()
	if (!QuickActionsContent) return null

	return (
		<TldrawUiMenuContextProvider type="actions" sourceId="quick-actions">
			<QuickActionsContent />
		</TldrawUiMenuContextProvider>
	)
}
