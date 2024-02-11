import {
	DefaultContextMenuContent,
	DefaultHelpMenuContent,
	DefaultMainMenuContent,
	Editor,
	OfflineIndicator,
	TLEditorComponents,
	TLUiComponents,
	Tldraw,
	TldrawUiMenuGroup,
	lns,
} from '@tldraw/tldraw'
import { useCallback, useEffect } from 'react'
import { useRemoteSyncClient } from '../hooks/useRemoteSyncClient'
import { UrlStateParams, useUrlState } from '../hooks/useUrlState'
import { assetUrls } from '../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../utils/config'
import { CursorChatMenuItem } from '../utils/context-menu/CursorChatMenuItem'
import { createAssetFromFile } from '../utils/createAssetFromFile'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { useSharing } from '../utils/sharing'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'
import { useCursorChat } from '../utils/useCursorChat'
import { useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { CursorChatBubble } from './CursorChatBubble'
import { EmbeddedInIFrameWarning } from './EmbeddedInIFrameWarning'
import { MultiplayerFileMenu } from './FileMenu'
import { Links } from './Links'
import { PeopleMenu } from './PeopleMenu/PeopleMenu'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { StoreErrorScreen } from './StoreErrorScreen'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const editorComponents: TLEditorComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
}

const uiComponents: TLUiComponents = {
	ContextMenuContent: () => (
		<>
			<CursorChatMenuItem />
			<DefaultContextMenuContent />
		</>
	),
	HelpMenuContent: () => (
		<>
			<TldrawUiMenuGroup id="help">
				<DefaultHelpMenuContent />
			</TldrawUiMenuGroup>
			<Links />
		</>
	),
	MainMenuContent: () => (
		<>
			<MultiplayerFileMenu />
			<DefaultMainMenuContent />
		</>
	),
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

	const isEmbedded = useIsEmbedded(roomSlug)
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

	if (isEmbedded) {
		return <EmbeddedInIFrameWarning />
	}

	const isOffline =
		storeWithStatus.status === 'synced-remote' && storeWithStatus.connectionStatus === 'offline'

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={storeWithStatus}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides, cursorChatOverrides]}
				onUiEvent={handleUiEvent}
				components={editorComponents}
				uiComponents={uiComponents}
				topZone={isOffline && <OfflineIndicator />}
				shareZone={
					<div className="tlui-share-zone" draggable={false}>
						<PeopleMenu />
						<ShareMenu />
					</div>
				}
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
	const isEmbedded =
		typeof window !== 'undefined' &&
		window.self !== window.top &&
		window.location.host !== 'www.tldraw.com'

	useEffect(() => {
		if (isEmbedded) {
			trackAnalyticsEvent('connect_to_room_in_iframe', {
				roomId: slug,
			})
		}
	}, [slug, isEmbedded])

	return isEmbedded
}
