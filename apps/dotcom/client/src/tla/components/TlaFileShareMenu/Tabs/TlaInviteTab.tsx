import { TlaFile } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useEditorDeepLink } from '../../../hooks/useDeepLink'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useTldrawUser } from '../../../hooks/useUser'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuSection,
	TlaMenuSelect,
	TlaMenuSwitch,
} from '../../tla-menu/tla-menu'
import { QrCode } from '../QrCode'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

const messages = defineMessages({
	editor: { defaultMessage: 'Editor' },
	viewer: { defaultMessage: 'Viewer' },
	noAccess: { defaultMessage: 'No access' },
})

export function TlaInviteTab({ fileId }: { fileId: string }) {
	const app = useApp()
	const isShared = useValue(
		'file',
		() => {
			return app.requireFile(fileId).shared
		},
		[app, fileId]
	)

	const isOwner = useIsFileOwner(fileId)
	const url = useEditorDeepLink()

	return (
		<>
			<TlaMenuSection>
				{isOwner && (
					<TlaMenuControlGroup>
						<TlaSharedToggle isShared={isShared} fileId={fileId} />
						{isShared && <TlaSelectSharedLinkType fileId={fileId} />}
					</TlaMenuControlGroup>
				)}
				{isShared && <TlaCopyLinkButton isShared={isShared} fileId={fileId} />}
				{isShared && <QrCode url={url ?? ''} />}
			</TlaMenuSection>
		</>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: string }) {
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
			<TlaMenuControlLabel htmlFor="tla-shared-link-shared-switch">
				<F defaultMessage="Share this file" />
			</TlaMenuControlLabel>
			<TlaMenuControlInfoTooltip
				onClick={() =>
					trackEvent('open-url', { destinationUrl: learnMoreUrl, source: 'file-share-menu' })
				}
				href={learnMoreUrl}
			>
				<F defaultMessage="Learn more about sharing." />
			</TlaMenuControlInfoTooltip>
			<TlaMenuSwitch
				id="tla-shared-link-shared-switch"
				data-testid="shared-link-shared-switch"
				checked={!!isShared}
				onChange={handleToggleShared}
			/>
		</TlaMenuControl>
	)
}

function TlaSelectSharedLinkType({ fileId }: { fileId: string }) {
	const app = useApp()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')

	const sharedLinkType = useValue(
		'file',
		() => {
			return app.getFile(fileId)?.sharedLinkType
		},
		[app, fileId]
	)

	const handleSelectChange = useCallback(
		(sharedLinkType: TlaFile['sharedLinkType'] | 'no-access') => {
			app.setFileSharedLinkType(fileId, sharedLinkType)
			trackEvent('set-shared-link-type', { type: sharedLinkType, source: 'file-share-menu' })
		},
		[app, fileId, trackEvent]
	)

	const label = useMsg(sharedLinkType === 'edit' ? messages.editor : messages.viewer)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-shared-link-type-select">
				<F defaultMessage="Anyone with the link" />
			</TlaMenuControlLabel>
			<TlaMenuSelect
				id="tla-shared-link-type-select"
				data-testid="shared-link-type-select"
				label={label}
				value={sharedLinkType!}
				onChange={handleSelectChange}
				options={[
					{ value: 'edit', label: <F defaultMessage="Editor" /> },
					{ value: 'view', label: <F defaultMessage="Viewer" /> },
				]}
			/>
		</TlaMenuControl>
	)
}

function TlaCopyLinkButton({ fileId }: { isShared: boolean; fileId: string }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyLinkClick = useCallback(() => {
		const url = routes.tlaFile(fileId, { asUrl: true })
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
