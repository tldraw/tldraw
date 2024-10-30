import { useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { File } from '../../../app/schema'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useRaw } from '../../../hooks/useRaw'
import { useTldrawUser } from '../../../hooks/useUser'
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

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: string }) {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	if (!user) throw Error('should have auth')

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn that they'll be removed from the project until the project is shared again
		app.toggleFileShared(fileId)
	}, [app, fileId])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Share this project')}</TlaMenuControlLabel>
			<TlaMenuControlInfoTooltip
				href={'https://tldraw.notion.site/Sharing-1283e4c324c080a69618ff37eb3fc98f'}
			>
				{raw('Learn more about sharing.')}
			</TlaMenuControlInfoTooltip>
			<TlaSwitch checked={!!isShared} onChange={handleToggleShared} />
		</TlaMenuControl>
	)
}

function TlaSelectSharedLinkType({ isShared, fileId }: { isShared: boolean; fileId: string }) {
	const app = useApp()
	const user = useTldrawUser()
	const raw = useRaw()
	if (!user) throw Error('should have auth')

	const sharedLinkType = useValue(
		'file',
		() => {
			return app.getFile(fileId)?.sharedLinkType
		},
		[app, fileId]
	)

	const handleSelectChange = useCallback(
		(sharedLinkType: File['sharedLinkType'] | 'no-access') => {
			app.setFileSharedLinkType(fileId, sharedLinkType)
		},
		[app, fileId]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Anyone with the link')}</TlaMenuControlLabel>
			<TlaSelect
				label={isShared ? (sharedLinkType === 'edit' ? 'Editor' : 'Viewer') : 'No access'}
				value={sharedLinkType as any}
				disabled={!isShared}
				onChange={handleSelectChange}
			>
				{/* <option value="no-access">No access</option> */}
				<option value="edit">{raw('Editor')}</option>
				<option value="view">{raw('Viewer')}</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function TlaCopyLinkButton({ fileId }: { isShared: boolean; fileId: string }) {
	const raw = useRaw()
	const editor = useEditor()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		// no toasts please
	}, [fileId, editor])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			{raw('Copy link')}
		</TlaShareMenuCopyButton>
	)
}

// function _ShareHelp() {
// 	const raw = useRaw()
// 	return (
// 		<TlaShareMenuHelpItem>
// 			<p>
// 				{raw('Invite someone to collaborate by sending them a ')} <b>{raw('link')}</b>
// 				{raw(' to your project. You can ')}
// 				<b>{raw('turn off')}</b> {raw(' sharing at any time.')}
// 			</p>
// 		</TlaShareMenuHelpItem>
// 	)
// }

// function _SnapshotHelp() {
// 	const raw = useRaw()
// 	return (
// 		<TlaShareMenuHelpItem>
// 			<p>
// 				{raw('A ')} <b>{raw('snapshot')}</b>{' '}
// 				{raw(
// 					'is a read-only copy of your project in its current state. Use snapshots to create backups or to share your work in progress.'
// 				)}
// 			</p>
// 		</TlaShareMenuHelpItem>
// 	)
// }
