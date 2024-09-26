import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import {
	Editor,
	FileHelpers,
	TldrawUiDropdownMenuTrigger,
	exportAs,
	useLocalStorageState,
	useValue,
} from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useAuth } from '../hooks/useAuth'
import { copyTextToClipboard } from '../utils/copy'
import { createQRCodeImageDataString } from '../utils/qrcode'
import { TldrawAppFileId } from '../utils/schema/TldrawAppFile'
import { TldrawAppSessionState } from '../utils/schema/TldrawAppSessionState'
import { TldrawAppUser } from '../utils/schema/TldrawAppUser'
import { getShareableFileUrl } from '../utils/urls'
import { TlaIcon } from './TlaIcon'
import { TlaTabsPage, TlaTabsPages, TlaTabsRoot, TlaTabsTab, TlaTabsTabs } from './TlaTabs/TlaTabs'

export function TlaFileShareMenu({ fileId }: { fileId: TldrawAppFileId }) {
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
				<button className={`tla-button tla-button__primary tla-text_ui__medium`}>
					<span>Share</span>
				</button>
			</TldrawUiDropdownMenuTrigger>
			<DropdownPrimitive.Content
				className="tla-share-menu tlui-menu tla-text_ui__medium"
				data-size="large"
				side="bottom"
				align="end"
				collisionPadding={6}
				alignOffset={-2}
				sideOffset={6}
			>
				<TlaTabsRoot activeTab={shareMenuActiveTab} onTabChange={handleTabChange}>
					<TlaTabsTabs>
						<TlaTabsTab id="share">Share</TlaTabsTab>
						<TlaTabsTab id="export">Export</TlaTabsTab>
					</TlaTabsTabs>
					<TlaTabsPages>
						<TlaTabsPage id="share">
							<TlaToggleShared shared={shared} fileId={fileId} />
							<TlaSelectSharedLinkType fileId={fileId} />
							<TlaCopyLinkButton shared={shared} fileId={fileId} />
							<TlaQrCodeToggle fileId={fileId} />
						</TlaTabsPage>
						<TlaTabsPage id="export">
							<TlaSelectExportFormat />
							<TlaExportImageButton />
						</TlaTabsPage>
					</TlaTabsPages>
				</TlaTabsRoot>
			</DropdownPrimitive.Content>
		</DropdownPrimitive.Root>
	)
}

function TlaToggleShared({ shared, fileId }: { shared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

	const handleToggleShared = useCallback(() => {
		// todo: if there are other users connected to the project, warn
		// that they'll be removed from the project until the project is shared again

		// copy file url
		app.toggleFileShared(userId, fileId)
	}, [app, userId, fileId])

	return (
		<div className="tla-share-menu__control">
			<div className="tla-text_ui__medium">Share this project</div>
			<div className="tla-share-menu__control-container">
				<div className="tla-switch" data-checked={!!shared} />
				<input name="shared" type="checkbox" checked={!!shared} onChange={handleToggleShared} />
			</div>
		</div>
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
		<div className="tla-share-menu__control">
			<div className="tla-text_ui__medium">Anyone with the link can...</div>
			<div className="tla-share-menu__control-container">
				<div className="tla-share-menu__select__label">
					<span>{sharedLinkType === 'edit' ? 'Edit' : 'View'}</span>
					<TlaIcon icon="chevron-down" />
				</div>
				<select value={sharedLinkType} onChange={handleSelectChange}>
					<option value="edit">Edit</option>
					<option value="view">View</option>
				</select>
			</div>
		</div>
	)
}

function TlaCopyLinkButton({ shared, fileId }: { shared: boolean; fileId: TldrawAppFileId }) {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')
	const { userId } = auth

	const [copied, setCopied] = useState(false)

	const handleCopyLinkClick = useCallback(() => {
		if (copied) {
			return
		}

		if (!shared) {
			app.toggleFileShared(userId, fileId)
		}

		const fileUrl = getShareableFileUrl(fileId)
		copyTextToClipboard(fileUrl)

		setCopied(true)
		setTimeout(() => setCopied(false), 2500)

		return () => {
			setCopied(false)
		}
	}, [app, userId, fileId, shared, copied])

	return (
		<div className="tla-share-menu__copy-link">
			<button
				className="tla-button tla-button__primary tla-text_ui__medium tla-share-menu__copy-button"
				onClick={handleCopyLinkClick}
			>
				<span>{shared ? 'Copy link' : 'Copy link and share'}</span>
				<TlaIcon icon={copied ? 'check' : 'copy'} />
			</button>
		</div>
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
		(e: ChangeEvent<HTMLSelectElement>) => {
			const { value } = e.currentTarget
			app.setUserExportFormat(userId, value as TldrawAppUser['exportFormat'])
		},
		[app, userId]
	)

	return (
		<div className="tla-share-menu__control">
			<div className="tla-text_ui__medium">Export as...</div>
			<div className="tla-share-menu__control-container">
				<div className="tla-share-menu__select__label">
					<span>{exportFormat === 'svg' ? 'SVG' : 'PNG'}</span>
					<TlaIcon icon="chevron-down" />
				</div>
				<select value={exportFormat} onChange={handleSelectChange}>
					<option value="svg">SVG</option>
					<option value="png">PNG</option>
				</select>
			</div>
		</div>
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
			exportAs(editor, ids, user?.exportFormat, 'file')
		}

		setExported(true)
		setTimeout(() => setExported(false), 2500)

		return () => {
			setExported(false)
		}
	}, [exported, app])

	return (
		<div className="tla-share-menu__copy-link">
			<button
				className="tla-button tla-button__secondary tla-text_ui__medium tla-share-menu__copy-button"
				onClick={handleExportLinkClick}
			>
				<span>Export image</span>
				<TlaIcon icon="export" />
			</button>
		</div>
	)
}

const debugDismissed = false

function _TlaNotice() {
	const [dismissed, setDismissed] = useLocalStorageState('TLDRAW_APP_DISMISS_COPY_INFO', false)

	if (dismissed && !debugDismissed) return null

	return (
		<div className="tla-share-menu__description tla-text_ui__medium">
			<p>
				Anyone with a link to your shared project can edit it with you. You can turn off sharing at
				any time.
			</p>
			<button className="tla-share-menu__description-dismiss" onClick={() => setDismissed(true)}>
				Dismiss
			</button>
		</div>
	)
}

function TlaQrCodeToggle({ fileId }: { fileId: TldrawAppFileId }) {
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
