import { useDemoRemoteSyncClient } from '@tldraw/sync-react'
import { useCallback, useEffect } from 'react'
import { DefaultContextMenu, DefaultContextMenuContent, TLComponents, Tldraw, atom } from 'tldraw'
import { UrlStateParams, useUrlState } from '../hooks/useUrlState'
import { assetUrls } from '../utils/assetUrls'
import { CursorChatMenuItem } from '../utils/context-menu/CursorChatMenuItem'
import { useCursorChat } from '../utils/useCursorChat'
import { useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { CursorChatBubble } from './CursorChatBubble'
import { PeopleMenu } from './PeopleMenu/PeopleMenu'
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
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<PeopleMenu />
			</div>
		)
	},
}

export function TemporaryBemoDevEditor({ slug }: { slug: string }) {
	const handleUiEvent = useHandleUiEvents()

	const storeWithStatus = useDemoRemoteSyncClient({ host: 'http://127.0.0.1:8989', roomId: slug })

	const isOffline =
		storeWithStatus.status === 'synced-remote' && storeWithStatus.connectionStatus === 'offline'
	useEffect(() => {
		shittyOfflineAtom.set(isOffline)
	}, [isOffline])

	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })
	const cursorChatOverrides = useCursorChat()

	if (storeWithStatus.error) {
		return <StoreErrorScreen error={storeWithStatus.error} />
	}

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={storeWithStatus}
				assetUrls={assetUrls}
				overrides={[fileSystemUiOverrides, cursorChatOverrides]}
				onUiEvent={handleUiEvent}
				components={components}
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
			window.location.pathname + `?v=${params.v}&p=${params.p}`
		)
	}, [])

	useUrlState(syncViewport)

	return null
}
