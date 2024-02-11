import {
	DefaultHelpMenuContent,
	DefaultMainMenuContent,
	Editor,
	TLUiComponents,
	Tldraw,
	TldrawUiMenuGroup,
} from '@tldraw/tldraw'
import { useCallback } from 'react'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { DebugMenuItems } from '../utils/migration/DebugMenuItems'
import { LocalMigration } from '../utils/migration/LocalMigration'
import { SCRATCH_PERSISTENCE_KEY } from '../utils/scratch-persistence-key'
import { useSharing } from '../utils/sharing'
import { useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { LocalFileMenu } from './FileMenu'
import { Links } from './Links'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const uiComponents: TLUiComponents = {
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
			<LocalFileMenu />
			<DefaultMainMenuContent />
		</>
	),
}

export function LocalEditor() {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing()
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
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				components={{
					ErrorFallback: ({ error }) => {
						throw error
					},
				}}
				uiComponents={uiComponents}
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
