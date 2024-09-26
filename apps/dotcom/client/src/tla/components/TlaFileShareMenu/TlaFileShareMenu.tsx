import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import classNames from 'classnames'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import {
	Editor,
	exportAs,
	FileHelpers,
	TldrawUiDropdownMenuTrigger,
	useLocalStorageState,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useAuth } from '../../hooks/useAuth'
import { copyTextToClipboard } from '../../utils/copy'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import { TldrawAppFileId } from '../../utils/schema/TldrawAppFile'
import { TldrawAppSessionState } from '../../utils/schema/TldrawAppSessionState'
import { TldrawAppUser } from '../../utils/schema/TldrawAppUser'
import { getShareableFileUrl, getSnapshotFileUrl } from '../../utils/urls'
import { TlaIcon } from '../TlaIcon'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage, TlaTabsPages, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from '../TlaTabs/TlaTabs'
import styles from './file-share-menu.module.css'

export function TlaFileShareMenu({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()

	const [showingHelp, setShowingHelp] = useState(false)

	const handleHelpClick = useCallback(() => {
		setShowingHelp((v) => !v)
	}, [])

	const shareMenuActiveTab = useValue(
		'share menu active tab',
		() => app.getSessionState().shareMenuActiveTab,
		[app]
	)

	const handleTabChange = useCallback(
		(value: TldrawAppSessionState['shareMenuActiveTab']) => app.setShareMenuActiveTab(value),
		[app]
	)

	return (
		<DropdownPrimitive.Root dir="ltr" modal={false} open>
			<TldrawUiDropdownMenuTrigger>
				<button className={classNames('tla-button', 'tla-button__primary', 'tla-text_ui__medium')}>
					<span>Share</span>
				</button>
			</TldrawUiDropdownMenuTrigger>
			<DropdownPrimitive.Content
				className={classNames('tlui-menu', 'tla-text_ui__medium', styles.shareMenu)}
				data-size="large"
				side="bottom"
				align="end"
				collisionPadding={6}
				alignOffset={-2}
				sideOffset={6}
			>
				<tlaHelpContext.Provider value={showingHelp}>
					<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
						<TlaTabsTabs>
							<TlaTabsTab id="share">Share</TlaTabsTab>
							<TlaTabsTab id="export">Export</TlaTabsTab>
							<button
								className={styles.helpButton}
								onClick={handleHelpClick}
								data-active={showingHelp}
							>
								<TlaIcon icon="question-circle" />
							</button>
						</TlaTabsTabs>
						<TlaTabsPages>
							<SharePage fileId={fileId} />
							<ExportPage />
						</TlaTabsPages>
					</TlaTabsRoot>
				</tlaHelpContext.Provider>
			</DropdownPrimitive.Content>
		</DropdownPrimitive.Root>
	)
}

/* ------------------- Primitives ------------------- */

const tlaHelpContext = createContext<boolean>(false)

// Used to section areas of the menu, ie share links vs snapshots
function TlaShareMenuSection({ children }: { children: ReactNode }) {
	return <div className={styles.section}>{children}</div>
}

// Used to group together adjacent controls, ie switches or selects
function TlaShareMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className={styles.controlGroup}>{children}</div>
}

function TlaShareMenuControl({ children }: { children: ReactNode }) {
	return <div className={styles.control}>{children}</div>
}

function TlaShareMenuControlLabel({ children }: { children: ReactNode }) {
	return <div className="tla-text_ui__medium">{children}</div>
}

function TlaShareMenuHelpItem({ children }: { children: ReactNode }) {
	const showingHelp = useContext(tlaHelpContext)

	if (!showingHelp) return null

	return <div className={styles.helpItem}>{children}</div>
}

function TlaShareMenuCopyButton({
	children,
	type = 'primary',
	onClick,
}: {
	children: ReactNode
	onClick(): void
	type?: string
}) {
	const [copied, setCopied] = useState(false)

	const handleCopyLinkClick = useCallback(() => {
		if (copied) return
		onClick()
		setCopied(true)
		setTimeout(() => setCopied(false), 2500)
		return () => setCopied(false)
	}, [copied, onClick])

	return (
		<button
			className={classNames('tla-button', `tla-button__${type}`, 'tla-text_ui__medium')}
			onClick={handleCopyLinkClick}
		>
			<span>{children}</span>
			<TlaIcon className={styles.copyButtonIcon} icon={copied ? 'check' : 'copy'} />
		</button>
	)
}

/* -------------------------------------------------- */
/*                        Pages                       */
/* -------------------------------------------------- */

function SharePage({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()
	const shared = useValue(
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
					<TlaSharedToggle shared={shared} fileId={fileId} />
					<TlaSelectSharedLinkType fileId={fileId} />
				</TlaShareMenuControlGroup>
				<TlaCopyLinkButton shared={shared} fileId={fileId} />
				<TlaShareMenuHelpItem>
					<p>
						Invite someone to collaborate by sending them a <b>link</b> to your project. You can{' '}
						<b>turn off</b> sharing at any time.
					</p>
				</TlaShareMenuHelpItem>
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

function TlaSharedToggle({ shared, fileId }: { shared: boolean; fileId: TldrawAppFileId }) {
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
			<TlaSwitch checked={!!shared} onChange={handleToggleShared} />
		</TlaShareMenuControl>
	)
}

function TlaSelectSharedLinkType({ fileId }: { fileId: TldrawAppFileId }) {
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

	const handleSelectChange = useCallback(() => {
		app.toggleFileShareLinkType(userId, fileId)
	}, [app, userId, fileId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Anyone with the link can...</TlaShareMenuControlLabel>
			<TlaSelect
				label={sharedLinkType === 'edit' ? 'Edit' : 'View'}
				value={sharedLinkType}
				onChange={handleSelectChange}
			>
				<option value="edit">Edit</option>
				<option value="view">View</option>
			</TlaSelect>
		</TlaShareMenuControl>
	)
}

function TlaCopyLinkButton({ shared, fileId }: { shared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()

	const handleCopyLinkClick = useCallback(() => {
		const { auth } = app.getSessionState()
		if (!auth) throw Error('should have auth')
		const { userId } = auth

		// Share the file if it isn't shared already
		if (!shared) app.toggleFileShared(userId, fileId)
		// Copy the file URL to clipboard
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
	}, [app, fileId, shared])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			{shared ? 'Copy link' : 'Copy link and share'}
		</TlaShareMenuCopyButton>
	)
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

/* --------------------- Export --------------------- */

function ExportPage() {
	return (
		<TlaTabsPage id="export" className={styles.content}>
			<TlaShareMenuSection>
				<TlaShareMenuControlGroup>
					<ExportBackgroundToggle />
					<ExportPaddingToggle />
					<TlaSelectExportFormat />
				</TlaShareMenuControlGroup>
				<TlaExportImageButton />
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

function ExportBackgroundToggle() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

	const exportPadding = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportPadding
		},
		[app, userId]
	)

	const handleToggleShared = useCallback(() => {
		const user = app.getUser(userId)
		if (!user) throw Error('no user')
		app.setUserExportPadding(userId, !user.exportPadding)
	}, [app, userId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Padding</TlaShareMenuControlLabel>
			<TlaSwitch checked={exportPadding} onChange={handleToggleShared} />
		</TlaShareMenuControl>
	)
}

function ExportPaddingToggle() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

	const exportBackground = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportBackground
		},
		[app, userId]
	)

	const handleToggleShared = useCallback(() => {
		const user = app.getUser(userId)
		if (!user) throw Error('no user')
		app.setUserExportBackground(userId, !user.exportBackground)
	}, [app, userId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Background</TlaShareMenuControlLabel>
			<TlaSwitch checked={exportBackground} onChange={handleToggleShared} />
		</TlaShareMenuControl>
	)
}

function TlaSelectExportFormat() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')
	const { userId } = auth

	const exportFormat = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportFormat
		},
		[app, userId]
	)

	const handleSelectChange = useCallback(
		(value: TldrawAppUser['exportFormat']) => {
			app.setUserExportFormat(userId, value)
		},
		[app, userId]
	)

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Export as...</TlaShareMenuControlLabel>
			<TlaSelect
				value={exportFormat}
				label={exportFormat === 'svg' ? 'SVG' : 'PNG'}
				onChange={handleSelectChange}
			>
				<option value="svg">SVG</option>
				<option value="png">PNG</option>
			</TlaSelect>
		</TlaShareMenuControl>
	)
}

function TlaExportImageButton() {
	const app = useApp()

	const [exported, setExported] = useState(false)

	const handleExportLinkClick = useCallback(() => {
		if (exported) {
			return
		}

		// todo: export the editor image
		const editor = (window as any).editor as Editor
		if (editor) {
			const sessionState = app.getSessionState()
			const { auth } = sessionState
			if (!auth) throw Error('expected auth')
			const user = app.getUser(auth.userId)
			if (!user) throw Error('expected user')
			const ids = editor.getSelectedShapeIds()
			exportAs(editor, ids, user.exportFormat, 'file', {
				padding: user.exportPadding ? 32 : 0,
				background: user.exportBackground,
			})
		}

		setExported(true)
		setTimeout(() => setExported(false), 2500)

		return () => {
			setExported(false)
		}
	}, [exported, app])

	return (
		<button
			className="tla-button tla-button__primary tla-text_ui__medium tla-share-menu__copy-button"
			onClick={handleExportLinkClick}
		>
			<span>Export image</span>
			<TlaIcon icon="export" />
		</button>
	)
}

function _TlaQrCodeToggle({ fileId }: { fileId: TldrawAppFileId }) {
	const [qrCode, setQrCode] = useLocalStorageState<string | null>(fileId + 'qr-code-10', null)
	const [showQrCode, setShowQrCode] = useLocalStorageState('show qr code', false)

	const auth = useAuth()
	if (!auth) throw Error('expected auth')

	const handleClick = useCallback(() => {
		setShowQrCode((v) => !v)
	}, [setShowQrCode])

	useEffect(() => {
		if (showQrCode && !qrCode) {
			const url = getShareableFileUrl(fileId)
			createQRCodeImageDataString(url).then((svgString) => {
				if (svgString) {
					FileHelpers.blobToDataUrl(new Blob([svgString], { type: 'image/svg+xml' })).then(
						(svgUrl) => {
							setQrCode(svgUrl)
						}
					)
				}
			})
		}
	}, [showQrCode, fileId, setQrCode, qrCode])

	return (
		<>
			<div className="tla-share-menu__control">
				<button className="tla-share-menu__control-button" onClick={handleClick}>
					<div className="tla-text_ui__medium">{showQrCode ? 'QR code' : 'QR code'}</div>
					<div className="tla-share-menu__control-container">
						<TlaIcon icon={showQrCode ? 'chevron-up' : 'chevron-down'} />
					</div>
				</button>
			</div>
			{showQrCode && <TlaQrCode src={qrCode} />}
		</>
	)
}

function TlaQrCode({ src }: { src: string | null }) {
	return (
		<div className="tla-share-menu__qr-code">
			<div
				className="tla-share-menu__qr-code-inner"
				style={{ backgroundImage: src ? `url(${src})` : '' }}
			/>
		</div>
	)
}
