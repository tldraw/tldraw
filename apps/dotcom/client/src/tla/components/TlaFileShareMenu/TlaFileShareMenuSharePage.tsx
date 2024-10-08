import { TldrawAppFile, TldrawAppFileId } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileHelpers, useLocalStorageState, useToasts, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { useTldrawUser } from '../../hooks/useUser'
import { copyTextToClipboard } from '../../utils/copy'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import { getShareableFileUrl } from '../../utils/urls'
import { TlaButton } from '../TlaButton/TlaButton'
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
		<TlaTabsPage id="share">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					<TlaSharedToggle isShared={isShared} fileId={fileId} />
					<TlaSelectSharedLinkType isShared={isShared} fileId={fileId} />
				</TlaMenuControlGroup>
				{isShared && <TlaCopyLinkButton isShared={isShared} fileId={fileId} />}
				{isShared && <QrCode fileId={fileId} />}
			</TlaMenuSection>
			<TlaMenuSection>
				<TlaCopySnapshotLinkButton />
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

/* ---------------------- Share --------------------- */

function TlaSharedToggle({ isShared, fileId }: { isShared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	if (!user) throw Error('should have auth')

	const { id: userId } = user

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn that they'll be removed from the project until the project is shared again
		app.toggleFileShared(userId, fileId)
	}, [app, userId, fileId])

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
	const { id: userId } = user

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

function TlaCopySnapshotLinkButton() {
	const app = useApp()
	const { fileSlug } = useParams()
	const [snapshots, setSnapshots] = useState<{ id: string; uploaded: string }[]>([])
	const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)

	const editor = getCurrentEditor()
	const raw = useRaw()

	const { addToast } = useToasts()

	if (!fileSlug) throw Error('no file slug')

	useEffect(() => {
		async function getSnapshots() {
			const result = await fetch(`/api/app/snapshots/${fileSlug}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			if (!result.ok) {
				console.log('error fetching snapshots')
			}
			const data = await result.json()
			if (data && data.snapshots) {
				setSnapshots(data.snapshots)
				setSelectedSnapshot(data.snapshots[0]?.id)
			}
		}
		getSnapshots()
	}, [fileSlug])

	const handleCreateSnapshotClick = useCallback(async () => {
		const { auth } = app.getSessionState()
		if (!auth) throw Error('should have auth')
		const { userId } = auth
		if (!editor) throw Error('no editor')

		const url = await app.createSnapshotLink(editor, userId, fileSlug)
		if (!url) {
			addToast({
				title: 'could not create snapshot',
				severity: 'success',
			})
		} else {
			copyTextToClipboard(url)
			const id = url.split('/').pop()?.split('?')[0]
			if (id) {
				setSnapshots((prev) => [{ id, uploaded: new Date().toUTCString() }, ...prev])
				setSelectedSnapshot(id)
			}

			addToast({
				title: 'copied',
				severity: 'success',
			})
		}
	}, [app, addToast, editor, fileSlug])

	const handleSnapshotCopyClick = useCallback(() => {
		copyTextToClipboard(`${window.location.origin}/q/s/${selectedSnapshot}`)
		addToast({
			title: 'copied',
			severity: 'success',
		})
	}, [addToast, selectedSnapshot])

	const handleSnapshotDeleteClick = useCallback(async () => {
		const result = await fetch(`/api/app/snapshot/${selectedSnapshot}`, {
			method: 'DELETE',
		})
		if (!result.ok) {
			console.log('error deleting snapshot')
		} else {
			const newSnapshots = snapshots.filter((s) => s.id !== selectedSnapshot)
			setSnapshots(newSnapshots)
			setSelectedSnapshot(newSnapshots[0]?.id)
		}
	}, [selectedSnapshot, snapshots])

	return (
		<>
			{snapshots.length > 0 && (
				<>
					<div>{raw('Snapshots:')}</div>
					<div style={{ display: 'flex', gap: '5px' }}>
						<select style={{ flex: 1 }} onChange={(el) => setSelectedSnapshot(el.target.value)}>
							{snapshots.map((snapshot) => (
								<option key={snapshot.id} value={snapshot.id}>
									<div>{new Date(snapshot.uploaded).toDateString()}</div>
								</option>
							))}
						</select>
						<TlaButton variant="secondary" onClick={handleSnapshotCopyClick} icon="copy" />
						<TlaButton variant="secondary" onClick={handleSnapshotDeleteClick} icon="trash" />
					</div>
				</>
			)}
			<TlaShareMenuCopyButton onClick={handleCreateSnapshotClick} type="secondary">
				{raw('Create new snapshot')}
			</TlaShareMenuCopyButton>
		</>
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
