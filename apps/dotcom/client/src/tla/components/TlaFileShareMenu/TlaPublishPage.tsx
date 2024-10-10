import { fetch } from '@tldraw/utils'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { copyTextToClipboard } from '../../utils/copy'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import { TlaMenuControlGroup, TlaMenuSection } from '../tla-menu/tla-menu'
import { TlaShareMenuCopyButton } from './file-share-menu-primitives'

export function TlaPublishPage() {
	const raw = useRaw()
	const [snapshot, setSnapshot] = useState<string | null>(null)
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()

	const uploadSnapshot = useCallback(
		async (update: boolean) => {
			const { auth } = app.getSessionState()
			if (!auth) throw Error('should have auth')
			const { userId } = auth
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')

			return await app.createSnapshotLink(editor, userId, fileSlug, update ? snapshot : null)
		},
		[editor, app, snapshot, fileSlug]
	)

	const handleCreate = useCallback(async () => {
		const url = await uploadSnapshot(false)
		if (!url) {
			addToast({
				title: 'could not create snapshot',
				severity: 'success',
			})
		} else {
			const id = url.split('/').pop()?.split('?')[0]
			if (id) {
				setSnapshot(id)
			}

			addToast({
				title: 'copied',
				severity: 'success',
			})
		}
	}, [uploadSnapshot, addToast])

	const handleUpdate = useCallback(async () => {
		const url = await uploadSnapshot(true)
		if (url) {
			addToast({
				title: 'updated',
				severity: 'success',
			})
		} else {
			addToast({
				title: 'could not update',
				severity: 'success',
			})
		}
	}, [uploadSnapshot, addToast])

	useEffect(() => {
		async function getSnapshots() {
			const result = await fetch(`/api/app/snapshots/${fileSlug}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			if (!result.ok) {
				console.log('error fetching snapshots')
			}
			const data = await result.json()
			if (data && data.snapshots?.length) {
				setSnapshot(data.snapshots[0].id)
			}
		}
		getSnapshots()
	}, [fileSlug])

	const handleSnapshotDeleteClick = useCallback(async () => {
		const result = await fetch(`/api/app/snapshot/${snapshot}`, {
			method: 'DELETE',
		})
		if (!result.ok) {
			console.log('error deleting snapshot')
		} else {
			setSnapshot(null)
		}
	}, [snapshot])

	const handleSnapshotOpenClick = useCallback(() => {
		if (!snapshot) return
		const url = `${window.location.origin}/q/s/${snapshot}`
		window.open(url, '_blank')
	}, [snapshot])

	const handleSnapshotCopyClick = useCallback(() => {
		copyTextToClipboard(`${window.location.origin}/q/s/${snapshot}`)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [snapshot, addToast])

	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{snapshot ? (
						<TlaMenuControlGroup>
							<div>{raw('This project is published. You can find a link to it below.')}</div>
							<div
								style={{ display: 'flex', gap: '4px', justifyContent: 'end', marginBottom: '12px' }}
							>
								<TlaButton variant="secondary" onClick={handleSnapshotOpenClick} icon="link" />
								<TlaButton variant="secondary" onClick={handleSnapshotCopyClick} icon="copy" />
								<TlaButton variant="secondary" onClick={handleSnapshotDeleteClick} icon="trash" />
							</div>
							<TlaButton variant="secondary" onClick={handleUpdate}>
								{raw('Update')}
							</TlaButton>
						</TlaMenuControlGroup>
					) : (
						<>
							<div>
								{raw('This project is not published. Click the button below to publish it.')}
							</div>
							<TlaShareMenuCopyButton onClick={handleCreate} type="secondary">
								{raw('Publish')}
							</TlaShareMenuCopyButton>
						</>
					)}
				</TlaMenuControlGroup>
			</TlaMenuSection>
		</TlaTabsPage>
	)
}
