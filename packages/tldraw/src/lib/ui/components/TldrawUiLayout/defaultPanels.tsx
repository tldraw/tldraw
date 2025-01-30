import { memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'
import { useCollaborationStatus } from '../../hooks/useIsMultiplayer'
import { useReadonly } from '../../hooks/useReadonly'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'

export const DefaultBottomLeftPanel = memo(function DefaultBottomLeftPanel() {
	const { NavigationPanel } = useTldrawUiComponents()

	return <>{NavigationPanel && <NavigationPanel />}</>
})

export const DefaultBottomCenterPanel = memo(function DefaultBottomPanel() {
	const { Toolbar } = useTldrawUiComponents()

	return <>{Toolbar && <Toolbar />}</>
})

export const DefaultBottomRightPanel = memo(function DefaultBottomRightPanel() {
	const { HelpMenu } = useTldrawUiComponents()

	return <>{HelpMenu && <HelpMenu />}</>
})

export const DefaultTopLeftPanel = memo(function DefaultTopLeftPanel() {
	const { MenuPanel, HelperButtons } = useTldrawUiComponents()
	return (
		<>
			{MenuPanel && <MenuPanel />}
			{HelperButtons && <HelperButtons />}
		</>
	)
})

export const DefaultTopCenterPanel = memo(function DefaultTopCenterPanel() {
	const isOffline = useCollaborationStatus() === 'offline'

	if (!isOffline) return null

	return <OfflineIndicator />
})

export const DefaultTopRightPanel = memo(function DefaultTopRightPanel() {
	const { SharePanel, StylePanel } = useTldrawUiComponents()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()

	return (
		<>
			{SharePanel && <SharePanel />}
			{StylePanel && breakpoint >= PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
				<StylePanel />
			)}
		</>
	)
})
