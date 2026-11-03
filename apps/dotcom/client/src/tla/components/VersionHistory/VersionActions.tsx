import { formatFileVersionSource } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { uniqueId, useDialogs, useToasts } from 'tldraw'
import { routes } from '../../../routeDefs'
import { trackEvent } from '../../../utils/analytics'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { restoreVersion } from '../../utils/versionHistoryApi'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { TlaButton } from '../TlaButton/TlaButton'
import { useFileSyncStore } from '../TlaEditor/TlaFileSyncHost'
import { versionHistoryMessages as messages } from './version-history-messages'
import { formatVersionTime } from './versionHistoryFormat'

const ageHours = (ts: string) => Math.round((Date.now() - Date.parse(ts)) / 3600_000)

export function VersionActions({ fileId, ts }: { fileId: string; ts: string }) {
	const intl = useIntl()
	const app = useApp()
	const navigate = useNavigate()
	const sync = useFileSyncStore()
	const activeWorkspaceId = useActiveWorkspaceId()
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()

	const restore = useCallback(() => {
		const records = sync.status === 'synced-remote' ? sync.store.allRecords() : []
		const threads = records.filter(
			(r: any) => r.typeName === 'comment-thread' && !r.isDeleted
		).length
		const othersOnline = records.some((r) => r.typeName === 'instance_presence')
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={intl.formatMessage(messages.restoreTitle)}
					description={
						<>
							<p>{intl.formatMessage(messages.restoreDescription)}</p>
							{threads > 0 && (
								<p>{intl.formatMessage(messages.restoreComments, { count: threads })}</p>
							)}
							{othersOnline && <p>{intl.formatMessage(messages.othersEditing)}</p>}
						</>
					}
					confirmLabel={intl.formatMessage(messages.restoreConfirm)}
					cancelLabel={intl.formatMessage(messages.cancel)}
					confirmType="danger"
					onClose={onClose}
					onConfirm={async () => {
						try {
							await restoreVersion(fileId, { timestamp: ts })
							trackEvent('restore-version', {
								ageHours: ageHours(ts),
								othersOnline,
								threadsRemoved: threads,
							})
							navigate(routes.tlaFile(fileId))
						} catch {
							addToast({
								id: 'restore-failed',
								title: intl.formatMessage(messages.restoreFailed),
								severity: 'error',
							})
						}
					}}
				/>
			),
		})
	}, [sync, addDialog, addToast, intl, fileId, ts, navigate])

	const duplicate = useCallback(async () => {
		const file = app.getFile(fileId)
		if (!file || !activeWorkspaceId) return
		const newFileId = uniqueId()
		trackEvent('duplicate-version', { ageHours: ageHours(ts) })
		const res = await app.createFile({
			fileId: newFileId,
			workspaceId: activeWorkspaceId,
			name: intl.formatMessage(messages.duplicateName, {
				name: app.getFileName(file),
				time: formatVersionTime(ts).time,
			}),
			createSource: formatFileVersionSource(fileId, ts),
		})
		if (res.ok) navigate(routes.tlaFile(newFileId))
	}, [app, fileId, ts, activeWorkspaceId, intl, navigate])

	return (
		<>
			<TlaButton variant="primary" onClick={restore}>
				{intl.formatMessage(messages.restore)}
			</TlaButton>
			<TlaButton variant="secondary" onClick={duplicate}>
				{intl.formatMessage(messages.duplicate)}
			</TlaButton>
		</>
	)
}
