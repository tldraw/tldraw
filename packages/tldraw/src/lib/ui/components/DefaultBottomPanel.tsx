import { memo } from 'react'
import { useTldrawUiComponents } from '../context/components'

export const DefaultBottomPanel = memo(function DefaultBottomPanel() {
	const { NavigationPanel, Toolbar, HelpMenu } = useTldrawUiComponents()

	return (
		<>
			{NavigationPanel && <NavigationPanel />}
			{Toolbar && <Toolbar />}
			{HelpMenu && <HelpMenu />}
		</>
	)
})
