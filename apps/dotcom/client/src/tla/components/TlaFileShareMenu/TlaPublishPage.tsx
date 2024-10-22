import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
import { PUBLISH_ENDPOINT } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { copyTextToClipboard } from '../../utils/copy'
import { getShareablePublishUrl } from '../../utils/urls'
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

export function TlaPublishPage({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()
	const { publishedSlug, published } = file
	const isOwner = app.isFileOwner(file.id)
	const [uploading, setUploading] = useState(false)
	const auth = useAuth()

	const handleUpdate = useCallback(
		async (update: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!publishedSlug) throw Error('no published slug')
			if (!isOwner) return
			const token = await auth.getToken()
			if (!token) return

			setUploading(true)
			const result = await app.createSnapshotLink(editor, fileSlug, publishedSlug, token)
			setUploading(false)
			if (result.ok) {
				if (!published) {
					app.toggleFilePublished(file.id)
				}
				addToast({
					title: update ? 'updated' : 'published',
					severity: 'success',
				})
			} else {
				addToast({
					title: update ? 'could not update' : 'could not publish',
					severity: 'error',
				})
			}
		},
		[editor, fileSlug, publishedSlug, isOwner, auth, app, published, addToast, file.id]
	)

	const unpublish = useCallback(async () => {
		if (!isOwner) return
		if (!publishedSlug) return
		const token = await auth.getToken()

		const result = await fetch(`${PUBLISH_ENDPOINT}/${publishedSlug}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})
		if (result.ok) {
			app.toggleFilePublished(file.id)
		} else {
			addToast({
				title: 'could not delete',
				severity: 'error',
			})
		}
	}, [addToast, app, auth, file.id, isOwner, publishedSlug])

	const publishShareUrl = publishedSlug ? getShareablePublishUrl(publishedSlug) : null

	const handleCopyPublishLink = useCallback(() => {
		if (!publishShareUrl) return
		copyTextToClipboard(publishShareUrl)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [publishShareUrl, addToast])

	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel>{raw('Publish this project')}</TlaMenuControlLabel>
							<TlaSwitch
								checked={published}
								onChange={() => (published ? unpublish() : handleUpdate(false))}
							/>
						</TlaMenuControl>
					)}
					{published && (
						<TlaMenuControlGroup>
							<TlaShareMenuCopyButton onClick={handleCopyPublishLink}>
								{raw('Copy link')}
							</TlaShareMenuCopyButton>
							{isOwner && (
								<TlaButton
									isLoading={uploading}
									variant="secondary"
									onClick={() => handleUpdate(true)}
								>
									{raw('Update')}
								</TlaButton>
							)}
						</TlaMenuControlGroup>
					)}
				</TlaMenuControlGroup>
				{published && publishShareUrl && <QrCode url={publishShareUrl} />}
			</TlaMenuSection>
		</TlaTabsPage>
	)
}
