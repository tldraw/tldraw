import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { FileHelpers, useLocalStorageState, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useAuth } from '../../hooks/useAuth'
import { copyTextToClipboard } from '../../utils/copy'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import { TldrawAppFile, TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { getShareableFileUrl, getSnapshotFileUrl } from '../../utils/urls'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import {
	TlaShareMenuControl,
	TlaShareMenuControlGroup,
	TlaShareMenuControlLabel,
	TlaShareMenuCopyButton,
	TlaShareMenuHelpItem,
	TlaShareMenuSection,
} from './file-share-menu-primitives'
import styles from './file-share-menu.module.css'

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
		<TlaTabsPage id="share" className={styles.content}>
			<TlaShareMenuSection>
				<TlaShareMenuControlGroup>
					<TlaSharedToggle isShared={isShared} fileId={fileId} />
					<TlaSelectSharedLinkType isShared={isShared} fileId={fileId} />
				</TlaShareMenuControlGroup>
				{isShared && <TlaCopyLinkButton isShared={isShared} fileId={fileId} />}
				<TlaShareMenuHelpItem>
					<p>
						Invite someone to collaborate by sending them a <b>link</b> to your project. You can{' '}
						<b>turn off</b> sharing at any time.
					</p>
				</TlaShareMenuHelpItem>
				{isShared && <QrCode fileId={fileId} />}
			</TlaShareMenuSection>
			<TlaShareMenuSection>
				<TlaCopySnapshotLinkButton fileId={fileId} />
				<TlaShareMenuHelpItem>
					<p>
						A <b>snapshot</b> is a read-only copy of your project in its current state. Use
						snapshots to create backups or to share your work in progress.
					</p>
				</TlaShareMenuHelpItem>
			</TlaShareMenuSection>
		</TlaTabsPage>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn that they'll be removed from the project until the project is shared again
		app.toggleFileShared(userId, fileId)
	}, [app, userId, fileId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Share this project</TlaShareMenuControlLabel>
			<TlaSwitch checked={!!isShared} onChange={handleToggleShared} />
		</TlaShareMenuControl>
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
	const auth = useAuth()
	if (!auth) throw Error('should have auth')
	const { userId } = auth

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
			app.setFileSharedLinkType(userId, fileId, sharedLinkType)
		},
		[app, userId, fileId]
	)

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Anyone with the link</TlaShareMenuControlLabel>
			<TlaSelect
				label={isShared ? (sharedLinkType === 'edit' ? 'Editor' : 'Viewer') : 'No access'}
				value={sharedLinkType}
				onChange={handleSelectChange}
			>
				<option value="no-access">No access</option>
				<option value="edit">Edit</option>
				<option value="view">View</option>
			</TlaSelect>
		</TlaShareMenuControl>
	)
}

function TlaCopyLinkButton({ fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
	}, [fileId])

	return <TlaShareMenuCopyButton onClick={handleCopyLinkClick}>Copy link</TlaShareMenuCopyButton>
}

function TlaCopySnapshotLinkButton({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()

	const handleCopyLinkClick = useCallback(() => {
		const { auth } = app.getSessionState()
		if (!auth) throw Error('should have auth')
		const { userId } = auth

		// todo: implement snapshot link
		app.createSnapshotLink(userId, fileId)
		// Copy the snapshot url to clipboard
		const url = getSnapshotFileUrl(fileId)
		copyTextToClipboard(url)
	}, [app, fileId])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick} type="secondary">
			Copy snapshot link
		</TlaShareMenuCopyButton>
	)
}

function QrCode({ fileId }: { fileId: TldrawAppFileId }) {
	const ref = useRef<HTMLImageElement>(null)

	// Save the QR codes in local storage
	const [qrCode, setQrCode] = useLocalStorageState<string | null>(fileId + 'qr-code-11', null)

	const app = useApp()

	const theme = useValue('is dark mode', () => app.getSessionState().theme, [app])

	useEffect(() => {
		if (!qrCode) {
			const editor = getCurrentEditor()
			if (!editor) return

			const url = getShareableFileUrl(fileId)
			createQRCodeImageDataString(url).then((svgString) => {
				const blob = new Blob([svgString], { type: 'image/svg+xml' })
				FileHelpers.blobToDataUrl(blob).then(setQrCode)
			})
		}
	}, [fileId, setQrCode, qrCode])

	// When qr code is there, set it as src
	useLayoutEffect(() => {
		if (!qrCode) return
		const elm = ref.current
		if (!elm) return
		// We want to use an image element here so that a user can right click and copy / save / drag the qr code
		elm.setAttribute('src', `${qrCode}`)
	}, [qrCode])

	// todo: click qr code to... copy? big modal?

	return (
		<div className={styles.qrCode}>
			<img ref={ref} className={styles.qrCodeInner} data-theme={theme} />
		</div>
	)
}
