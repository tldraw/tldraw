import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
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
		async (isPublishingChanges: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!isOwner) throw Error('not owner')
			const token = await auth.getToken()
			if (!token) throw Error('no token')

			const fileBefore = app.store.get(file.id)!

			// optimistic update, we will revert if the request fails
			if (!published) app.setFilePublished(file.id, true)
			app.updateFileLastPublished(file.id)

			const startTime = Date.now()

			if (isPublishingChanges) {
				setUploadState('uploading')
			}

			const result = await app.publishFile(editor, fileSlug, token)

			if (result.ok) {
				const elapsed = Date.now() - startTime
				// uploading should always take at least 1 second
				if (elapsed < 1000) {
					await new Promise((r) => setTimeout(r, 1000 - elapsed))
				}

				// Show the check and then hide it again after 2s
				if (isPublishingChanges) {
					setUploadState('success')
					editor.timers.setTimeout(() => {
						setUploadState('idle')
					}, 2000)
				}
			} else {
				if (isPublishingChanges) {
					setUploadState('idle')
				}

				addToast({
					title: isPublishingChanges ? 'Could not publish changes' : 'Could not publish file',
					severity: 'error',
				})

				// Get the fresh file from the store
				const currentFile = app.store.get(file.id)!
				if (!currentFile) return // oh it's gone

				// revert optimistic updates by putting back properties from the file before the optimistic updates
				const { published, lastPublished } = fileBefore
				app.store.put([
					{
						...currentFile,
						published,
						lastPublished,
					},
				])
			}
		},
		[editor, fileSlug, published, isOwner, auth, app, addToast, file.id]
	)

	const unpublish = useCallback(async () => {
		if (!isOwner) throw Error('not owner')
		if (!published) throw Error('not published')
		if (!fileSlug) throw Error('no file slug')

		const token = await auth.getToken()
		if (!token) throw Error('no token')

		// optimistic update
		app.setFilePublished(file.id, false)

		// request to unpublish on the server
		const result = await app.unpublishFile(fileSlug, token)

		if (result.ok) {
			// noop, all good
		} else {
			// revert optimistic update
			app.setFilePublished(file.id, true)

			// show error toast
			addToast({
				title: 'Could not delete',
				severity: 'error',
			})
		}
	}, [addToast, app, auth, file.id, isOwner, published, fileSlug])

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
