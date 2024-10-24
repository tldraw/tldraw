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
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuDetail,
	TlaMenuSection,
} from '../../tla-menu/tla-menu'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

export function TlaPublishTab({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()
	const { publishedSlug, published } = file
	const isOwner = app.isFileOwner(file.id)
	const auth = useAuth()
	const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle')

	const publish = useCallback(
		async (updating: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!publishedSlug) throw Error('no published slug')
			if (!isOwner) throw Error('not owner')
			const token = await auth.getToken()
			if (!token) throw Error('no token')

			setUploadState('uploading')
			if (!published) {
				app.setFilePublished(file.id, true)
			} else {
				app.updateFileLastPublished(file.id)
			}
			const result = await app.createSnapshotLink(editor, fileSlug, publishedSlug, token)
			if (result.ok) {
				// no toasts please
				await new Promise((r) => setTimeout(r, 1000))
				setUploadState('success')
				editor.timers.setTimeout(() => {
					setUploadState('idle')
				}, 2000)
			} else {
				setUploadState('idle')
				// We should only revert when creating a file, update failure should not revert the published status
				if (!updating) {
					app.setFilePublished(file.id, false)
				}
				addToast({
					title: updating ? 'Could not update' : 'Could not publish',
					severity: 'error',
				})
			}
		},
		[editor, fileSlug, published, publishedSlug, isOwner, auth, app, addToast, file.id]
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
				title: 'Could not delete',
				severity: 'error',
			})
		}
	}, [addToast, app, auth, file.id, isOwner, publishedSlug])

	const publishShareUrl = publishedSlug ? getShareablePublishUrl(publishedSlug) : null

	const daysSince = Math.floor((Date.now() - file.lastPublished) / (60 * 1000 * 60 * 24))

	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel>{raw('Publish this project')}</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip
								href={'https://tldraw.notion.site/Publishing-1283e4c324c08059a1a1d9ba9833ddc9'}
							>
								{raw('Learn more about publishing.')}
							</TlaMenuControlInfoTooltip>
							<TlaSwitch
								checked={published}
								onChange={() => (published ? unpublish() : publish(false))}
							/>
						</TlaMenuControl>
					)}
				</TlaMenuControlGroup>
				{published && (
					<>
						{publishShareUrl && <TlaCopyPublishLinkButton url={publishShareUrl} />}
						{isOwner && (
							<TlaButton
								iconRight={uploadState === 'success' ? 'check' : 'update'}
								isLoading={uploadState === 'uploading'}
								variant="secondary"
								onClick={() => publish(true)}
							>
								{raw('Publish changes')}
							</TlaButton>
						)}
						{/* todo: make this data actually true based on file.lastPublished */}
						<TlaMenuDetail>
							{raw(
								daysSince
									? `Last published ${daysSince} day${daysSince > 1 ? 's' : ''} ago`
									: `Last published today.`
							)}
						</TlaMenuDetail>
					</>
				)}
				{/* {published && publishShareUrl && <QrCode url={publishShareUrl} />} */}
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

export function TlaCopyPublishLinkButton({ url }: { url: string }) {
	const raw = useRaw()
	const editor = useEditor()

	const handleCopyPublishLink = useCallback(() => {
		if (!url) return
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
	}, [url, editor])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyPublishLink}>
			{raw('Copy link')}
		</TlaShareMenuCopyButton>
	)
}
