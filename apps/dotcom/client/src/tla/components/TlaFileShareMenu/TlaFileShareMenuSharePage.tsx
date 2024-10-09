import { tx } from '@instantdb/core'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { FileHelpers, useLocalStorageState, useToasts, useValue } from 'tldraw'
import { useDbFile } from '../../hooks/db-hooks'
import { useRaw } from '../../hooks/useRaw'
import { getLocalSessionState } from '../../providers/SessionProvider'
import { copyTextToClipboard } from '../../utils/copy'
import { db } from '../../utils/db'
import { TldrawAppFile } from '../../utils/db-schema'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import { getShareableFileUrl, getSnapshotFileUrl } from '../../utils/urls'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../tla-menu/tla-menu'
import { TlaShareMenuCopyButton, TlaShareMenuHelpItem } from './file-share-menu-primitives'
import styles from './file-share-menu.module.css'

export function TlaShareMenuSharePage({ fileId }: { fileId: string }) {
	const file = useDbFile(fileId)
	if (!file) return null

	const { shared: isShared } = file

	return (
		<TlaTabsPage id="share">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					<TlaSharedToggle file={file} />
					<TlaSelectSharedLinkType file={file} />
				</TlaMenuControlGroup>
				{isShared && <TlaCopyLinkButton file={file} />}
				{isShared && <QrCode file={file} />}
			</TlaMenuSection>
			<TlaMenuSection>
				<TlaCopySnapshotLinkButton file={file} />
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn that they'll be removed from the project until the project is shared again
		db.transact([
			tx.files[file.id].merge({
				shared: !file.shared,
			}),
		])
	}, [file])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Share this project')}</TlaMenuControlLabel>
			<TlaSwitch checked={!!file.shared} onChange={handleToggleShared} />
		</TlaMenuControl>
	)
}

function TlaSelectSharedLinkType({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()

	const handleSelectChange = useCallback(
		(sharedLinkType: TldrawAppFile['sharedLinkType'] | 'no-access') => {
			db.transact([
				tx.files[file.id].merge({
					sharedLinkType,
				}),
			])
		},
		[file.id]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Anyone with the link')}</TlaMenuControlLabel>
			<TlaSelect
				label={file.shared ? (file.sharedLinkType === 'edit' ? 'Editor' : 'Viewer') : 'No access'}
				value={file.sharedLinkType}
				disabled={!file.shared}
				onChange={handleSelectChange}
			>
				{/* <option value="no-access">No access</option> */}
				<option value="edit">{raw('Editor')}</option>
				<option value="view">{raw('Viewer')}</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function TlaCopyLinkButton({ file }: { file: TldrawAppFile }) {
	const { addToast } = useToasts()
	const raw = useRaw()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(file.id)
		copyTextToClipboard(url)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [file.id, addToast])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			{raw('Copy link')}
		</TlaShareMenuCopyButton>
	)
}

function TlaCopySnapshotLinkButton({ file }: { file: TldrawAppFile }) {
	const raw = useRaw()

	const { addToast } = useToasts()

	const handleCopyLinkClick = useCallback(() => {
		// todo: implement snapshot link
		// app.createSnapshotLink(userId, fileId)
		// Copy the snapshot url to clipboard
		const url = getSnapshotFileUrl(file.id)
		copyTextToClipboard(url)

		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [file.id, addToast])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick} type="secondary">
			{raw('Copy snapshot link')}
		</TlaShareMenuCopyButton>
	)
}

function QrCode({ file }: { file: TldrawAppFile }) {
	const ref = useRef<HTMLImageElement>(null)

	// Save the QR codes in local storage
	const [qrCode, setQrCode] = useLocalStorageState<string | null>(file.id + 'qr-code-11', null)

	const theme = useValue('is dark mode', () => getLocalSessionState().theme, [])

	useEffect(() => {
		if (!qrCode) {
			const editor = getCurrentEditor()
			if (!editor) return

			const url = getShareableFileUrl(file.id)
			createQRCodeImageDataString(url).then((svgString) => {
				const blob = new Blob([svgString], { type: 'image/svg+xml' })
				FileHelpers.blobToDataUrl(blob).then(setQrCode)
			})
		}
	}, [file.id, setQrCode, qrCode])

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
