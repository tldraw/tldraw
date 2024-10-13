import * as Popover from '@radix-ui/react-popover'
import {
	GetReadonlySlugResponseBody,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	RoomOpenModeToPath,
} from '@tldraw/dotcom-shared'
import React, { useEffect, useState } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	fetch,
	useActions,
	useContainer,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import { useShareMenuIsOpen } from '../hooks/useShareMenuOpen'
import { createQRCodeImageDataString } from '../utils/qrcode'
import { SHARE_PROJECT_ACTION } from '../utils/sharing'
import { ShareButton } from './ShareButton'
import { SnapshotLinkCopy } from './SnapshotLinkCopy'

const SHARE_CURRENT_STATE = {
	OFFLINE: 'offline',
	SHARED_READ_WRITE: 'shared-read-write',
	SHARED_READ_ONLY: 'shared-read-only',
} as const
type ShareCurrentState = (typeof SHARE_CURRENT_STATE)[keyof typeof SHARE_CURRENT_STATE]

interface ShareState {
	state: ShareCurrentState
	qrCodeDataUrl: string
	url: string
	readonlyUrl?: string
	readonlyQrCodeDataUrl: string
}

function isSharedReadonlyUrl(pathname: string) {
	return (
		pathname.startsWith(`/${RoomOpenModeToPath[ROOM_OPEN_MODE.READ_ONLY]}/`) ||
		pathname.startsWith(`/${RoomOpenModeToPath[ROOM_OPEN_MODE.READ_ONLY_LEGACY]}/`)
	)
}

function isSharedReadWriteUrl(pathname: string) {
	return pathname.startsWith(`/${ROOM_PREFIX}/`)
}

function getFreshShareState(previousReadonlyUrl?: string): ShareState {
	const isSharedReadWrite = isSharedReadWriteUrl(window.location.pathname)
	const isSharedReadOnly = isSharedReadonlyUrl(window.location.pathname)

	let readonlyUrl
	if (isSharedReadOnly) {
		readonlyUrl = window.location.href
	} else if (previousReadonlyUrl) {
		// Pull out the room prefix and the readonly slug from the existing readonly url
		const segments = window.location.pathname.split('/')
		const roSegments = new URL(previousReadonlyUrl).pathname.split('/')
		segments[1] = roSegments[1]
		segments[2] = roSegments[2]
		const newPathname = segments.join('/')
		readonlyUrl = `${window.location.origin}${newPathname}${window.location.search}`
	}

	return {
		state: isSharedReadWrite
			? SHARE_CURRENT_STATE.SHARED_READ_WRITE
			: isSharedReadOnly
				? SHARE_CURRENT_STATE.SHARED_READ_ONLY
				: SHARE_CURRENT_STATE.OFFLINE,
		url: window.location.href,
		readonlyUrl,
		qrCodeDataUrl: '',
		readonlyQrCodeDataUrl: '',
	}
}

export async function getShareUrl(url: string, readonly: boolean) {
	if (!readonly) {
		return url
	}

	return await getReadonlyUrl()
}

async function getReadonlyUrl() {
	const pathname = window.location.pathname
	const isReadOnly = isSharedReadonlyUrl(pathname)
	if (isReadOnly) return window.location.href

	const segments = pathname.split('/')

	const roomId = segments[2]
	const result = await fetch(`/api/readonly-slug/${roomId}`)
	if (!result.ok) return

	const data = (await result.json()) as GetReadonlySlugResponseBody
	if (!data.slug) return

	segments[1] =
		RoomOpenModeToPath[data.isLegacy ? ROOM_OPEN_MODE.READ_ONLY_LEGACY : ROOM_OPEN_MODE.READ_ONLY]
	segments[2] = data.slug
	const newPathname = segments.join('/')

	return `${window.location.origin}${newPathname}${window.location.search}`
}

export const ShareMenu = React.memo(function ShareMenu() {
	const msg = useTranslation()
	const container = useContainer()

	const { [SHARE_PROJECT_ACTION]: shareProject } = useActions()

	const [shareState, setShareState] = useState(getFreshShareState)

	const [isUploading, setIsUploading] = useState(false)
	const isReadOnlyLink = shareState.state === SHARE_CURRENT_STATE.SHARED_READ_ONLY
	const currentShareLinkUrl = isReadOnlyLink ? shareState.readonlyUrl : shareState.url
	const currentQrCodeUrl = isReadOnlyLink
		? shareState.readonlyQrCodeDataUrl
		: shareState.qrCodeDataUrl

	const toasts = useToasts()
	const editor = useEditor()

	useEffect(() => {
		if (shareState.state === SHARE_CURRENT_STATE.OFFLINE) {
			return
		}

		let cancelled = false

		const shareUrl = editor.createDeepLink().toString()
		if (!shareState.qrCodeDataUrl && shareState.state === SHARE_CURRENT_STATE.SHARED_READ_WRITE) {
			// Fetch the QR code data URL
			createQRCodeImageDataString(shareUrl).then((dataUrl) => {
				if (!cancelled) {
					setShareState((s) => ({ ...s, shareUrl, qrCodeDataUrl: dataUrl }))
				}
			})
		}

		if (!shareState.readonlyUrl) {
			getReadonlyUrl().then((readonlyUrl) => {
				if (readonlyUrl) {
					// fetch the readonly QR code data URL
					createQRCodeImageDataString(readonlyUrl).then((dataUrl) => {
						if (!cancelled) {
							setShareState((s) => ({ ...s, readonlyUrl, readonlyQrCodeDataUrl: dataUrl }))
						}
					})
				}
			})
		} else if (!shareState.readonlyQrCodeDataUrl) {
			createQRCodeImageDataString(shareState.readonlyUrl).then((dataUrl) => {
				if (!cancelled) {
					setShareState((s) => ({ ...s, readonlyQrCodeDataUrl: dataUrl }))
				}
			})
		}

		const interval = setInterval(() => {
			const url = window.location.href
			if (shareState.url === url) return
			setShareState(getFreshShareState(shareState.readonlyUrl))
		}, 300)

		return () => {
			clearInterval(interval)
			cancelled = true
		}
	}, [editor, shareState])

	const [isOpen, onOpenChange] = useShareMenuIsOpen()

	return (
		<Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<Popover.Trigger dir="ltr" asChild>
				<ShareButton title={'share-menu.title'} label={'share-menu.title'} />
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Content
					dir="ltr"
					className="tlui-menu tlui-share-zone__popover"
					align="end"
					side="bottom"
					sideOffset={2}
					alignOffset={4}
				>
					<TldrawUiMenuContextProvider type="panel" sourceId="share-menu">
						{shareState.state === SHARE_CURRENT_STATE.SHARED_READ_WRITE ||
						shareState.state === SHARE_CURRENT_STATE.SHARED_READ_ONLY ? (
							<>
								<button
									className="tlui-share-zone__qr-code"
									style={{ backgroundImage: `url(${currentQrCodeUrl})` }}
									title={msg(
										isReadOnlyLink ? 'share-menu.copy-readonly-link' : 'share-menu.copy-link'
									)}
									onClick={() => {
										if (!currentShareLinkUrl) return
										navigator.clipboard.writeText(currentShareLinkUrl)
										toasts.addToast({
											title: msg('share-menu.copied'),
											severity: 'success',
										})
									}}
								/>

								<TldrawUiMenuGroup id="copy">
									{shareState.state === SHARE_CURRENT_STATE.SHARED_READ_WRITE && (
										<TldrawUiMenuItem
											id="copy-to-clipboard"
											readonlyOk={false}
											label="share-menu.copy-link"
											icon="clipboard-copy"
											onSelect={() => {
												if (!shareState.url) return
												navigator.clipboard.writeText(shareState.url)
												toasts.addToast({
													title: msg('share-menu.copied'),
													severity: 'success',
												})
											}}
										/>
									)}
									<TldrawUiMenuItem
										id="copy-readonly-to-clipboard"
										readonlyOk
										label="share-menu.copy-readonly-link"
										icon="clipboard-copy"
										onSelect={() => {
											if (!shareState.readonlyUrl) return
											navigator.clipboard.writeText(shareState.readonlyUrl)
											toasts.addToast({
												title: msg('share-menu.copied'),
												severity: 'success',
											})
										}}
									/>
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg('share-menu.copy-readonly-link-note')}
									</p>
								</TldrawUiMenuGroup>
								<SnapshotLinkCopy />
							</>
						) : (
							<>
								<TldrawUiMenuGroup id="share">
									<TldrawUiMenuItem
										id="share-project"
										readonlyOk
										label="share-menu.share-project"
										icon="share-1"
										disabled={isUploading}
										onSelect={async () => {
											if (isUploading) return
											setIsUploading(true)
											await shareProject.onSelect('menu')
											setIsUploading(false)
										}}
										spinner={isUploading}
									/>
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg(
											shareState.state === SHARE_CURRENT_STATE.OFFLINE
												? 'share-menu.offline-note'
												: isReadOnlyLink
													? 'share-menu.copy-readonly-link-note'
													: 'share-menu.copy-link-note'
										)}
									</p>
								</TldrawUiMenuGroup>
								<SnapshotLinkCopy />
							</>
						)}
					</TldrawUiMenuContextProvider>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})
