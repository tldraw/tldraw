import { getLicenseKey } from '@tldraw/dotcom-shared'
import { ReactNode } from 'react'
import { Editor, TLComponents, Tldraw, TldrawOptions, useEvent } from 'tldraw'
import { SneakyToolSwitcher } from '../tla/components/TlaEditor/sneaky/SneakyToolSwitcher'
import { useExtraDragIconOverrides } from '../tla/components/TlaEditor/useExtraToolDragIcons'
import { useFileEditorOverrides } from '../tla/components/TlaEditor/useFileEditorOverrides'
import { useHandleUiEvents } from '../utils/analytics'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { getScratchPersistenceKey } from '../utils/scratch-persistence-key'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

export function LocalEditor({
	components,
	onMount,
	children,
	persistenceKey,
	'data-testid': dataTestId,
	options,
}: {
	components: TLComponents
	onMount?(editor: Editor): void
	children?: ReactNode
	persistenceKey?: string
	'data-testid'?: string
	options?: Partial<TldrawOptions>
}) {
	const handleUiEvent = useHandleUiEvents()
	const fileSystemUiOverrides = useFileEditorOverrides({})
	const extraDragIconOverrides = useExtraDragIconOverrides()

	const handleMount = useEvent((editor: Editor) => {
		;(window as any).app = editor
		;(window as any).editor = editor
		editor.registerExternalAssetHandler('url', createAssetFromUrl)
		return onMount?.(editor)
	})

	return (
		<div className="tldraw__editor" data-testid={dataTestId}>
			<Tldraw
				licenseKey={getLicenseKey()}
				assetUrls={assetUrls}
				persistenceKey={persistenceKey ?? getScratchPersistenceKey()}
				onMount={handleMount}
				overrides={[fileSystemUiOverrides, extraDragIconOverrides]}
				onUiEvent={handleUiEvent}
				components={components}
				options={options}
			>
				<SneakyOnDropOverride isMultiplayer={false} />
				<SneakyToolSwitcher />
				<ThemeUpdater />
				{children}
			</Tldraw>
		</div>
	)
}
