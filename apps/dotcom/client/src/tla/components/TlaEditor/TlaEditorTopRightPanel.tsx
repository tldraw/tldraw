import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'
import { PeopleMenu } from 'tldraw'
import { useRaw } from '../../hooks/useRaw'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import styles from './top-panel.module.css'

export function TlaEditorTopRightPanel() {
	const raw = useRaw()

	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')
	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	return (
		<div className={styles.sharePanel}>
			<PeopleMenu />
			<TlaFileShareMenu fileId={fileId} source="file-header">
				<TlaButton className={styles.shareButton}>
					<span>{raw('Share')}</span>
				</TlaButton>
			</TlaFileShareMenu>
		</div>
	)
}
