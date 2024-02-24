import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultHelpMenu,
	DefaultHelpMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultMainMenuContent,
	Editor,
	LoadingScreen,
	OfflineIndicator,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	atom,
	debugFlags,
	lns,
	useActions,
	useValue,
} from '@tldraw/tldraw'
import { useCallback, useEffect, useState } from 'react'
import { version } from '../../version'
import { useRemoteSyncClient } from '../hooks/useRemoteSyncClient'
import { UrlStateParams, useUrlState } from '../hooks/useUrlState'
import { assetUrls } from '../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../utils/config'
import { CursorChatMenuItem } from '../utils/context-menu/CursorChatMenuItem'
import { createAssetFromFile } from '../utils/createAssetFromFile'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { useSharing } from '../utils/sharing'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'
import { CURSOR_CHAT_ACTION, useCursorChat } from '../utils/useCursorChat'
import { OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { CursorChatBubble } from './CursorChatBubble'
import { DocumentTopZone } from './DocumentName/DocumentName'
import { EmbeddedInIFrameWarning } from './EmbeddedInIFrameWarning'
import { MultiplayerFileMenu } from './FileMenu'
import { Links } from './Links'
import { PeopleMenu } from './PeopleMenu/PeopleMenu'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { StoreErrorScreen } from './StoreErrorScreen'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const shittyOfflineAtom = atom('shitty offline atom', false)

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<CursorChatMenuItem />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	HelpMenu: () => (
		<DefaultHelpMenu>
			<TldrawUiMenuGroup id="help">
				<DefaultHelpMenuContent />
			</TldrawUiMenuGroup>
			<Links />
		</DefaultHelpMenu>
	),
	MainMenu: () => (
		<DefaultMainMenu>
			<MultiplayerFileMenu />
			<DefaultMainMenuContent />
			<Links />
		</DefaultMainMenu>
	),
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup id="shortcuts-dialog.file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
					<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuGroup id="shortcuts-dialog.collaboration">
					<TldrawUiMenuItem {...actions[CURSOR_CHAT_ACTION]} />
				</TldrawUiMenuGroup>
			</DefaultKeyboardShortcutsDialog>
		)
	},
	TopPanel: () => {
		const isOffline = useValue('offline', () => shittyOfflineAtom.get(), [])
		const showDocumentName = useValue('documentName ', () => debugFlags.documentName.get(), [
			debugFlags,
		])
		if (!showDocumentName) {
			if (isOffline) {
				return <OfflineIndicator />
			}
			return null
		}
		return <DocumentTopZone isOffline={isOffline} />
	},
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<PeopleMenu />
				<ShareMenu />
			</div>
		)
	},
}

export function MultiplayerEditor({
	isReadOnly,
	roomSlug,
}: {
	isReadOnly: boolean
	roomSlug: string
}) {
	const handleUiEvent = useHandleUiEvents()

	const roomId = isReadOnly ? lns(roomSlug) : roomSlug

	const storeWithStatus = useRemoteSyncClient({
		uri: `${MULTIPLAYER_SERVER}/r/${roomId}`,
		roomId,
	})

	const isOffline =
		storeWithStatus.status === 'synced-remote' && storeWithStatus.connectionStatus === 'offline'
	useEffect(() => {
		shittyOfflineAtom.set(isOffline)
	}, [isOffline])

	const embeddedState = useIsEmbedded(roomSlug)
	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })
	const cursorChatOverrides = useCursorChat()

	const handleMount = useCallback(
		(editor: Editor) => {
			editor.updateInstanceState({ isReadonly: isReadOnly })
			editor.registerExternalAssetHandler('file', createAssetFromFile)
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
		},
		[isReadOnly]
	)

	if (storeWithStatus.error) {
		return <StoreErrorScreen error={storeWithStatus.error} />
	}

	if (embeddedState === 'iframe-unknown') {
		// We're in an iframe, but we don't know if it's a tldraw iframe
		return <LoadingScreen> </LoadingScreen>
	}

	if (embeddedState === 'iframe-foreign') {
		// We're in an iframe and its not one of ours
		return <EmbeddedInIFrameWarning />
	}

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={storeWithStatus}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides, cursorChatOverrides]}
				initialState={isReadOnly ? 'hand' : 'select'}
				onUiEvent={handleUiEvent}
				components={components}
				autoFocus
				inferDarkMode
			>
				<UrlStateSync />
				<CursorChatBubble />
				<SneakyOnDropOverride isMultiplayer />
				<ThemeUpdater />
			</Tldraw>
		</div>
	)
}

export function UrlStateSync() {
	const syncViewport = useCallback((params: UrlStateParams) => {
		window.history.replaceState(
			{},
			document.title,
			window.location.pathname + `?viewport=${params.viewport}&page=${params.page}`
		)
	}, [])

	useUrlState(syncViewport)

	return null
}

function useIsEmbedded(slug: string) {
	const [embeddedState, setEmbeddedState] = useState<
		'iframe-unknown' | 'iframe-foreign' | 'not-iframe' | 'iframe-ok'
	>(
		typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
			? 'iframe-unknown'
			: 'not-iframe'
	)

	// Respond to messages from child windows
	useEffect(() => {
		if (typeof window === 'undefined') return
		function handleMessageEvent(event: MessageEvent) {
			if (!event.source) return
			if (event.data === 'requestOrigin') {
				event.source.postMessage(window.location.host + version, {
					targetOrigin: event.origin,
				})
			}
		}
		window.addEventListener('message', handleMessageEvent, false)
		return () => {
			window.removeEventListener('message', handleMessageEvent)
		}
	}, [])

	// Send messages to messages the parent window
	useEffect(() => {
		let resolved = false
		let timeout: any

		function handleMessageEvent(event: MessageEvent) {
			// Ensure the message is from a trusted origin
			if (event.origin === 'www.tldraw.com') {
				if (event.data === 'www.tldraw.com' + version) {
					// Handle the trusted origin case
					setEmbeddedState('iframe-ok')
					resolved = true
				}
			}
		}

		window.addEventListener('message', handleMessageEvent, false)

		// If we're in an iframe, check whether we're on tldraw.com
		if (embeddedState === 'iframe-unknown') {
			window.parent.postMessage('requestOrigin', '*') // It's better to specify the target origin instead of "*"
			timeout = setTimeout(() => {
				if (!resolved) {
					setEmbeddedState('iframe-foreign')
					trackAnalyticsEvent('connect_to_room_in_iframe', {
						roomId: slug,
					})
				}
			}, 500)
		}

		return () => {
			clearTimeout(timeout)
			window.removeEventListener('message', handleMessageEvent)
		}
	}, [slug, embeddedState])

	return embeddedState
}
