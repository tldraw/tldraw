import { useTldrawUiComponents } from '../../context/components'
import { useIsMultiplayer, useMultiplayerStatus } from '../../hooks/useIsMultiplayer'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { CenteredTopPanelContainer } from './CenteredTopPanelContainer'

/** @public @react */
export function DefaultTopPanel() {
	const isMultiplayer = useIsMultiplayer()
	const isOffline = useMultiplayerStatus() === 'offline'
	const { PageMenu } = useTldrawUiComponents()

	return (
		<CenteredTopPanelContainer>
			{isMultiplayer && isOffline && <OfflineIndicator />}
			{PageMenu && <PageMenu />}
		</CenteredTopPanelContainer>
	)
}
