import { memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../constants'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'

/** @public */
export const DefaultMenuPanel = memo(function MenuPanel() {
	const breakpoint = useBreakpoint()

	const { MainMenu, QuickActions, ActionsMenu, PageMenu } = useTldrawUiComponents()

	if (!MainMenu && !PageMenu && breakpoint < PORTRAIT_BREAKPOINT.TABLET) return null

	return (
		<div className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				{MainMenu && <MainMenu />}
				{PageMenu && <PageMenu />}
				{breakpoint < PORTRAIT_BREAKPOINT.TABLET ? null : (
					<>
						{QuickActions && <QuickActions />}
						{ActionsMenu && <ActionsMenu />}
					</>
				)}
			</div>
		</div>
	)
})
