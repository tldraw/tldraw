import { useIntl } from 'react-intl'
import { useParams } from 'react-router-dom'
import { F, useValue } from 'tldraw'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp, useMaybeApp } from '../../../hooks/useAppState'
import styles from '../top.module.css'

export function TlaEditorTopPanel() {
	// These components are also used by the local and legacy editors, which have no app.
	const app = useMaybeApp()
	const fileSlug = useParams<{ fileSlug: string }>().fileSlug
	if (!app?.isUiV3Enabled || !fileSlug) return null
	return <TlaArchivedPill fileId={fileSlug} />
}

function TlaArchivedPill({ fileId }: { fileId: string }) {
	const app = useApp()
	const intl = useIntl()
	const workspaceId = useActiveWorkspaceId()
	const archivedAt = useValue(
		'archivedAt',
		() => app.getWorkspaceGroupFile(fileId, workspaceId)?.archivedAt ?? null,
		[app, fileId, workspaceId]
	)
	if (archivedAt == null) return null
	return (
		<div className={styles.archivedPill} data-testid="tla-archived-pill">
			<F
				defaultMessage="Archived on {date}"
				values={{ date: intl.formatDate(archivedAt, { dateStyle: 'medium' }) }}
			/>
		</div>
	)
}
