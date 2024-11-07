import { TldrawAppFile, TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { F, defineMessages, useIntl } from '../../../app/i18n'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useTldrawUser } from '../../../hooks/useUser'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { getShareableFileUrl } from '../../../utils/urls'
import { TlaSelect } from '../../TlaSelect/TlaSelect'
import { TlaSwitch } from '../../TlaSwitch/TlaSwitch'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../../tla-menu/tla-menu'
import { QrCode } from '../QrCode'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

const messages = defineMessages({
	editor: { defaultMessage: 'Editor' },
	viewer: { defaultMessage: 'Viewer' },
	noAccess: { defaultMessage: 'No access' },
})

export function TlaInviteTab({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()
	const isShared = useValue(
		'file',
		() => {
			const file = app.store.get(fileId)
			if (!file) throw Error('no file')
			return file.shared
		},
		[app, fileId]
	)

	const isOwner = useIsFileOwner(fileId)

	return (
		<>
			<TlaMenuSection>
				{isOwner && (
					<TlaMenuControlGroup>
						<TlaSharedToggle isShared={isShared} fileId={fileId} />
						<TlaSelectSharedLinkType isShared={isShared} fileId={fileId} />
					</TlaMenuControlGroup>
				)}
				{isShared && <TlaCopyLinkButton isShared={isShared} fileId={fileId} />}
				{isShared && <QrCode url={getShareableFileUrl(fileId)} />}
			</TlaMenuSection>
		</>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn that they'll be removed from the project until the project is shared again
		app.toggleFileShared(fileId)
		trackEvent('toggle-shared', { shared: !isShared, source: 'file-share-menu' })
	}, [app, fileId, trackEvent, isShared])
	const learnMoreUrl = 'https://tldraw.notion.site/Sharing-1283e4c324c080a69618ff37eb3fc98f'
	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>
				<F defaultMessage="Share this project" />
			</TlaMenuControlLabel>
			<TlaMenuControlInfoTooltip
				onClick={() => trackEvent('open-url', { url: learnMoreUrl, source: 'file-share-menu' })}
				href={learnMoreUrl}
			>
				<F defaultMessage="Learn more about sharing." />
			</TlaMenuControlInfoTooltip>
			<TlaSwitch checked={!!isShared} onChange={handleToggleShared} />
		</TlaMenuControl>
	)
}

function TlaSelectSharedLinkType({
	isShared,
	fileId,
}: {
	isShared: boolean
	fileId: TldrawAppFileId
}) {
	const app = useApp()
	const user = useTldrawUser()
	const intl = useIntl()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')

	const sharedLinkType = useValue(
		'file',
		() => {
			const file = app.store.get(fileId)
			if (!file) throw Error('could not get that file')
			return file.sharedLinkType
		},
		[app, fileId]
	)

	const handleSelectChange = useCallback(
		(sharedLinkType: TldrawAppFile['sharedLinkType'] | 'no-access') => {
			app.setFileSharedLinkType(fileId, sharedLinkType)
			trackEvent('set-shared-link-type', { type: sharedLinkType, source: 'file-share-menu' })
		},
		[app, fileId, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>
				<F defaultMessage="Anyone with the link" />
			</TlaMenuControlLabel>
			<TlaSelect
				label={
					isShared
						? sharedLinkType === 'edit'
							? intl.formatMessage(messages.editor)
							: intl.formatMessage(messages.viewer)
						: intl.formatMessage(messages.noAccess)
				}
				value={sharedLinkType}
				disabled={!isShared}
				onChange={handleSelectChange}
			>
				{/* <option value="no-access">No access</option> */}
				<option value="edit">
					<F defaultMessage="Editor" />
				</option>
				<option value="view">
					<F defaultMessage="Viewer" />
				</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function TlaCopyLinkButton({ fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		// no toasts please
		trackEvent('copy-share-link', { source: 'file-share-menu' })
	}, [fileId, editor, trackEvent])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			<F defaultMessage="Copy link" />
		</TlaShareMenuCopyButton>
	)
}
