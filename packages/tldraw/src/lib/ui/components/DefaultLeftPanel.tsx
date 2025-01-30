import { memo } from 'react'
import { useTldrawUiComponents } from '../context/components'

export const DefaultLeftPanel = memo(function DefaultLeftPanel() {
	const { MenuPanel, HelperButtons } = useTldrawUiComponents()
	return (
		<>
			{MenuPanel && <MenuPanel />}
			{HelperButtons && <HelperButtons />}
		</>
	)
})
