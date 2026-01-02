import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { BackToContent } from './BackToContent'
import { ExitPenMode } from './ExitPenMode'
import { StopFollowing } from './StopFollowing'

/** @public @react */
export function DefaultHelperButtonsContent() {
	const collaborationStatus = useCollaborationStatus()
	return (
		<>
			<ExitPenMode />
			<BackToContent />
			<StopFollowing />
			{collaborationStatus === 'offline' && <OfflineIndicator />}
		</>
	)
}
