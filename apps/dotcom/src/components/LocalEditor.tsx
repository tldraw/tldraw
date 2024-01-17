import { Editor, Tldraw } from '@tldraw/tldraw'
import { useCallback, useEffect } from 'react'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { isPreviewEnv } from '../utils/env'
import { linksUiOverrides } from '../utils/links'
import { DebugMenuItems } from '../utils/migration/DebugMenuItems'
import { LocalMigration } from '../utils/migration/LocalMigration'
import { SCRATCH_PERSISTENCE_KEY } from '../utils/scratch-persistence-key'
import { useSharing } from '../utils/sharing'
import { useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const TLDRAW_REDIRECTED_TO_SIGN_IN = 'tldraw-redirected-to-sign-in'

export function LocalEditor() {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing({ isMultiplayer: false })
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: false })

	const handleMount = useCallback((editor: Editor) => {
		editor.registerExternalAssetHandler('url', createAssetFromUrl)
	}, [])

	// Redirect to sign in if in preview mode
	useEffect(() => {
		if (isPreviewEnv) {
			const alreadyRedirected = localStorage.getItem(TLDRAW_REDIRECTED_TO_SIGN_IN)
			// We only want to redirect once so that we can still test the editor
			if (alreadyRedirected && alreadyRedirected === 'true') return
			localStorage.setItem(TLDRAW_REDIRECTED_TO_SIGN_IN, 'true')
			const url = new URL(window.location.href)
			window.location.assign(`${url.origin}/sign-in`)
		}
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUrls={assetUrls}
				persistenceKey={SCRATCH_PERSISTENCE_KEY}
				onMount={handleMount}
				autoFocus
				overrides={[sharingUiOverrides, fileSystemUiOverrides, linksUiOverrides]}
				onUiEvent={handleUiEvent}
				components={{
					ErrorFallback: ({ error }) => {
						throw error
					},
				}}
				shareZone={
					<div className="tlui-share-zone" draggable={false}>
						<ShareMenu />
					</div>
				}
				renderDebugMenuItems={() => <DebugMenuItems />}
				inferDarkMode
			>
				<LocalMigration />
				<SneakyOnDropOverride isMultiplayer={false} />
				<ThemeUpdater />
			</Tldraw>
		</div>
	)
}
