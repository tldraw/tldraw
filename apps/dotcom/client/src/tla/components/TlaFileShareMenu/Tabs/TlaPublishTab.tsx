import { useAuth } from '@clerk/clerk-react'
import { TlaFile } from '@tldraw/dotcom-shared'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { F, FormattedRelativeTime } from '../../../utils/i18n'
import { TlaButton } from '../../TlaButton/TlaButton'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuDetail,
	TlaMenuSection,
	TlaMenuSwitch,
	TlaMenuTabsPage,
} from '../../tla-menu/tla-menu'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

// add errors to zero-polyfill toasts
// const messages = defineMessages({
// 	publishChangesError: { defaultMessage: 'Could not publish changes' },
// 	publishFileError: { defaultMessage: 'Could not publish file' },
// 	deleteError: { defaultMessage: 'Could not delete' },
// })

export function TlaPublishTab({ file }: { file: TlaFile }) {
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { publishedSlug, published } = file
	const isOwner = app.isFileOwner(file.id)
	const auth = useAuth()
	const trackEvent = useTldrawAppUiEvents()
	const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle')

	const publish = useCallback(
		async (isPublishingChanges: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!isOwner) throw Error('not owner')
			const token = await auth.getToken()
			if (!token) throw Error('no token')

			if (isPublishingChanges) {
				setUploadState('success')
			}

			app.publishFile(file.id)

			trackEvent('publish-file', { source: 'file-share-menu' })
		},
		[editor, fileSlug, isOwner, auth, app, file.id, trackEvent]
	)

	const unpublish = useCallback(async () => {
		if (!isOwner) throw Error('not owner')

		const token = await auth.getToken()
		if (!token) throw Error('no token')

		app.unpublishFile(file.id)
		trackEvent('unpublish-file', { source: 'file-share-menu' })
	}, [app, auth, file.id, isOwner, trackEvent])

	const publishShareUrl = publishedSlug ? routes.tlaPublish(publishedSlug, { asUrl: true }) : null

	const secondsSince = Math.min(0, Math.floor((Date.now() - file.lastPublished) / 1000))
	const learnMoreUrl = 'https://tldraw.notion.site/Publishing-1283e4c324c08059a1a1d9ba9833ddc9'
	return (
		<TlaMenuTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel htmlFor="tla-publish-this-file-switch">
								<F defaultMessage="Publish this file" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip
								onClick={() =>
									trackEvent('open-url', {
										destinationUrl: learnMoreUrl,
										source: 'file-share-menu',
									})
								}
								href={learnMoreUrl}
							>
								<F defaultMessage="Learn more about publishing." />
							</TlaMenuControlInfoTooltip>
							<TlaMenuSwitch
								id="tla-publish-this-file-switch"
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
								<F defaultMessage="Publish changes" />
							</TlaButton>
						)}
						{/* todo: make this data actually true based on file.lastPublished */}
						<TlaMenuDetail>
							<F
								defaultMessage="Last published <date></date>"
								description="This is used to show the last time the file was published. An example is 'Last published 5 minutes ago'."
								values={{
									date: () => (
										<FormattedRelativeTime
											value={secondsSince}
											numeric="auto"
											updateIntervalInSeconds={15}
										/>
									),
								}}
							/>
						</TlaMenuDetail>
					</>
				)}
				{/* {published && publishShareUrl && <QrCode url={publishShareUrl} />} */}
			</TlaMenuSection>
		</TlaMenuTabsPage>
	)
}

export function TlaCopyPublishLinkButton({ url }: { url: string }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyPublishLink = useCallback(() => {
		if (!url) return
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		trackEvent('copy-publish-link', { source: 'file-share-menu' })
	}, [url, editor, trackEvent])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyPublishLink}>
			<F defaultMessage="Copy link" />
		</TlaShareMenuCopyButton>
	)
}
