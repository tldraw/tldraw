import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
import { PUBLISH_ENDPOINT } from '../../../app/TldrawApp'
import { useApp } from '../../../hooks/useAppState'
import { useRaw } from '../../../hooks/useRaw'
import { copyTextToClipboard } from '../../../utils/copy'
import { getShareablePublishUrl } from '../../../utils/urls'
import { TlaButton } from '../../TlaButton/TlaButton'
import { TlaSwitch } from '../../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../../TlaTabs/TlaTabs'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../../tla-menu/tla-menu'
import { QrCode } from '../QrCode'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

export function TlaPublishTab({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()
	const { publishedSlug, published } = file
	const isOwner = app.isFileOwner(file.id)
	const [uploading, setUploading] = useState(false)
	const auth = useAuth()

	const publish = useCallback(
		async (update: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!publishedSlug) throw Error('no published slug')
			if (!isOwner) throw Error('not owner')
			const token = await auth.getToken()
			if (!token) throw Error('no token')

			setUploading(true)
			if (!published) {
				app.setFilePublished(file.id, true)
			}
			const result = await app.createSnapshotLink(editor, fileSlug, publishedSlug, token)
			setUploading(false)
			if (result.ok) {
				addToast({
					title: update ? 'updated' : 'published',
					severity: 'success',
				})
			} else {
				// We should only revert when creating a file, update failure should not revert the published status
				if (!update) {
					app.setFilePublished(file.id, false)
				}
				addToast({
					title: update ? 'could not update' : 'could not publish',
					severity: 'error',
				})
			}
		},
		[editor, fileSlug, publishedSlug, isOwner, auth, app, addToast, file.id]
	)

	const unpublish = useCallback(async () => {
		if (!isOwner) throw Error('not owner')
		if (!publishedSlug) throw Error('no published slug')
		const token = await auth.getToken()
		if (!token) throw Error('no token')

		app.setFilePublished(file.id, false)
		const result = await fetch(`${PUBLISH_ENDPOINT}/${publishedSlug}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})
		if (!result.ok) {
			app.setFilePublished(file.id, true)
			addToast({
				title: 'could not delete',
				severity: 'error',
			})
		}
	}, [addToast, app, auth, file.id, isOwner, publishedSlug])

	const publishShareUrl = publishedSlug ? getShareablePublishUrl(publishedSlug) : null

	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel>{raw('Publish this project')}</TlaMenuControlLabel>
							<TlaSwitch
								checked={published}
								onChange={() => (published ? unpublish() : publish(false))}
							/>
						</TlaMenuControl>
					)}
					{published && (
						<TlaMenuControlGroup>
							{publishShareUrl && <TlaCopyPublishLinkButton url={publishShareUrl} />}
							{isOwner && (
								<TlaButton
									iconRight="update"
									isLoading={uploading}
									variant="secondary"
									onClick={() => publish(true)}
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

export function TlaCopyPublishLinkButton({ url }: { url: string }) {
	const raw = useRaw()
	const { addToast } = useToasts()

	const handleCopyPublishLink = useCallback(() => {
		if (!url) return
		copyTextToClipboard(url)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [url, addToast])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyPublishLink}>
			{raw('Copy link')}
		</TlaShareMenuCopyButton>
	)
}
