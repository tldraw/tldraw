import { memo } from 'react'
import { tldrawConstants } from '../../tldraw-constants'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'

const { PORTRAIT_BREAKPOINT } = tldrawConstants

export const MenuZone = memo(function MenuZone() {
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
