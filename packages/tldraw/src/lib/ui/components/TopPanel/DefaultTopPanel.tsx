import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { CenteredTopPanelContainer } from './CenteredTopPanelContainer'

/** @public @react */
export function DefaultTopPanel() {
	const isOffline = useCollaborationStatus() === 'offline'

	return <CenteredTopPanelContainer>{isOffline && <OfflineIndicator />}</CenteredTopPanelContainer>
}
