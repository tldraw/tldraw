import { Editor, Tldraw } from '@tldraw/tldraw'
import { useCallback } from 'react'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
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

export function LocalEditor() {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing({ isMultiplayer: false })
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: false })

	const handleMount = useCallback((editor: Editor) => {
		editor.registerExternalAssetHandler('url', createAssetFromUrl)
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
