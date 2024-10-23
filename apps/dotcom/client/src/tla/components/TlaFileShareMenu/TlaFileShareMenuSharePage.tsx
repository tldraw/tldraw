import { TldrawAppFile, TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useToasts, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { useTldrawUser } from '../../hooks/useUser'
import { copyTextToClipboard } from '../../utils/copy'
import { getShareableFileUrl } from '../../utils/urls'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../tla-menu/tla-menu'
import { QrCode } from './QrCode'
import { TlaShareMenuCopyButton, TlaShareMenuHelpItem } from './file-share-menu-primitives'

export function TlaShareMenuSharePage({ fileId }: { fileId: TldrawAppFileId }) {
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

	return (
		<>
			<TlaMenuSection>
				<TlaMenuControlGroup>
					<TlaSharedToggle isShared={isShared} fileId={fileId} />
					<TlaSelectSharedLinkType isShared={isShared} fileId={fileId} />
				</TlaMenuControlGroup>
				{isShared && <TlaCopyLinkButton isShared={isShared} fileId={fileId} />}
				{isShared && <QrCode url={getShareableFileUrl(fileId)} />}
			</TlaMenuSection>
		</>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
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
	const raw = useRaw()
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
		},
		[app, fileId]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Anyone with the link')}</TlaMenuControlLabel>
			<TlaSelect
				label={isShared ? (sharedLinkType === 'edit' ? 'Editor' : 'Viewer') : 'No access'}
				value={sharedLinkType}
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

function TlaCopyLinkButton({ fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const { addToast } = useToasts()
	const raw = useRaw()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)

		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [fileId, addToast])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			{raw('Copy link')}
		</TlaShareMenuCopyButton>
	)
}

function _ShareHelp() {
	const raw = useRaw()
	return (
		<TlaShareMenuHelpItem>
			<p>
				{raw('Invite someone to collaborate by sending them a ')} <b>{raw('link')}</b>
				{raw(' to your project. You can ')}
				<b>{raw('turn off')}</b> {raw(' sharing at any time.')}
			</p>
		</TlaShareMenuHelpItem>
	)
}

function _SnapshotHelp() {
	const raw = useRaw()
	return (
		<TlaShareMenuHelpItem>
			<p>
				{raw('A ')} <b>{raw('snapshot')}</b>{' '}
				{raw(
					'is a read-only copy of your project in its current state. Use snapshots to create backups or to share your work in progress.'
				)}
			</p>
		</TlaShareMenuHelpItem>
	)
}
