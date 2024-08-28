import { useTldrawUiComponents } from '../../context/components'
import { useCollaborationStatus, useShowCollaborationUi } from '../../hooks/useIsMultiplayer'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { CenteredTopPanelContainer } from './CenteredTopPanelContainer'

/** @public @react */
export function DefaultTopPanel() {
	const showCollaborationUi = useShowCollaborationUi()
	const isOffline = useCollaborationStatus() === 'offline'
	const { PageMenu } = useTldrawUiComponents()

	return (
		<CenteredTopPanelContainer>
			{showCollaborationUi && isOffline && <OfflineIndicator />}
			{PageMenu && <PageMenu />}
		</CenteredTopPanelContainer>
	)
}
