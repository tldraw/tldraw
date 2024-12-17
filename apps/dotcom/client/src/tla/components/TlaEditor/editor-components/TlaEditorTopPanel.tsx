import { OfflineIndicator, useCollaborationStatus } from 'tldraw'
import styles from '../top.module.css'

export function TlaEditorTopPanel() {
	const collaborationStatus = useCollaborationStatus()
	if (collaborationStatus === 'offline') {
		return (
			<div className={styles.offlineIndicatorWrapper}>
				<OfflineIndicator />{' '}
			</div>
		)
	}
	return null
}
