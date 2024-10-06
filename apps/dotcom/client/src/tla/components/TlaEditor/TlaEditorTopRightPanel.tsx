import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useRaw } from '../../hooks/useRaw'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import styles from './top.module.css'

export function TlaEditorTopRightPanel() {
	const raw = useRaw()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')
	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	return (
		<div ref={ref} className={styles.sharePanel}>
			<PeopleMenu />
			<TlaFileShareMenu fileId={fileId} source="file-header">
				<TlaButton className={styles.shareButton}>
					<span>{raw('Share')}</span>
				</TlaButton>
			</TlaFileShareMenu>
		</div>
	)
}
