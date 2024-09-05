import { memo } from 'react'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'

/** @public @react */
export const DefaultMenuPanel = memo(function MenuPanel() {
	const breakpoint = useBreakpoint()

	const { MainMenu, QuickActions, ActionsMenu, DocumentName } = useTldrawUiComponents()

	if (!MainMenu && !DocumentName && breakpoint < 6) return null

	return (
		<div className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				{MainMenu && <MainMenu />}
				{DocumentName && <DocumentName />}
				{breakpoint < 6 ? null : (
					<>
						{QuickActions && <QuickActions />}
						{ActionsMenu && <ActionsMenu />}
					</>
				)}
			</div>
		</div>
	)
})
