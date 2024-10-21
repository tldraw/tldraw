import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { copyTextToClipboard } from '../../utils/copy'
import { getLocalSessionState } from '../../utils/local-session-state'
import { getShareableSnapshotFileUrl } from '../../utils/urls'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../tla-menu/tla-menu'
import { QrCode } from './QrCode'
import { TlaShareMenuCopyButton } from './file-share-menu-primitives'

export function TlaPublishPage({
	snapshotSlug,
	setSnapshotSlug,
}: {
	snapshotSlug: string | null
	setSnapshotSlug(slug: string | null): void
}) {
	const raw = useRaw()
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()
	const fileId = TldrawAppFileRecordType.createId(fileSlug)
	const isOwner = app.isFileOwner(fileId)

	const uploadSnapshot = useCallback(
		async (update: boolean) => {
			const { auth } = getLocalSessionState()
			if (!auth) throw Error('should have auth')
			const { userId } = auth
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')

			return await app.createSnapshotLink(editor, userId, fileSlug, update ? snapshotSlug : null)
		},
		[editor, app, snapshotSlug, fileSlug]
	)

	const createSnapshot = useCallback(async () => {
		if (!isOwner) return
		const snapshotSlug = await uploadSnapshot(false)
		if (!snapshotSlug) {
			addToast({
				title: 'could not create snapshot',
				severity: 'error',
			})
		} else {
			setSnapshotSlug(snapshotSlug)
		}
	}, [isOwner, uploadSnapshot, addToast, setSnapshotSlug])

	const handleUpdate = useCallback(async () => {
		if (!isOwner) return
		const snapshotSlug = await uploadSnapshot(true)
		if (snapshotSlug) {
			addToast({
				title: 'updated',
				severity: 'success',
			})
		} else {
			addToast({
				title: 'could not update',
				severity: 'error',
			})
		}
	}, [isOwner, uploadSnapshot, addToast])

	const deleteSnapshot = useCallback(async () => {
		if (!isOwner) return

		const result = await fetch(`/api/app/snapshot/${snapshotSlug}`, {
			method: 'DELETE',
		})
		if (!result.ok) {
			console.log('error deleting snapshot')
		} else {
			setSnapshotSlug(null)
		}
	}, [isOwner, setSnapshotSlug, snapshotSlug])

	const snapshotShareUrl = snapshotSlug ? getShareableSnapshotFileUrl(snapshotSlug) : null

	const handleSnapshotCopyClick = useCallback(() => {
		if (!snapshotShareUrl) return
		copyTextToClipboard(snapshotShareUrl)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [snapshotShareUrl, addToast])

	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel>{raw('Publish this project')}</TlaMenuControlLabel>
							<TlaSwitch
								checked={!!snapshotSlug}
								onChange={() => (snapshotSlug ? deleteSnapshot() : createSnapshot())}
							/>
						</TlaMenuControl>
					)}
					{snapshotSlug && (
						<TlaMenuControlGroup>
							{snapshotSlug && (
								<TlaShareMenuCopyButton onClick={handleSnapshotCopyClick}>
									{raw('Copy link')}
								</TlaShareMenuCopyButton>
							)}
							{isOwner && (
								<TlaButton variant="secondary" onClick={handleUpdate}>
									{raw('Update')}
								</TlaButton>
							)}
						</TlaMenuControlGroup>
					)}
				</TlaMenuControlGroup>
				{snapshotShareUrl && <QrCode url={snapshotShareUrl} />}
			</TlaMenuSection>
		</TlaTabsPage>
	)
}
