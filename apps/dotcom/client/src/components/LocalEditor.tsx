import { getLicenseKey } from '@tldraw/dotcom-shared'
import { ReactNode, useMemo } from 'react'
import { Editor, TLComponents, Tldraw, TldrawOptions, TLUiOverrides, useEvent } from 'tldraw'
import { SneakyToolSwitcher } from '../tla/components/TlaEditor/sneaky/SneakyToolSwitcher'
import { useExtraDragIconOverrides } from '../tla/components/TlaEditor/useExtraToolDragIcons'
import { useFileEditorOverrides } from '../tla/components/TlaEditor/useFileEditorOverrides'
import { useHandleUiEvents } from '../utils/analytics'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { getScratchPersistenceKey } from '../utils/scratch-persistence-key'
import { SneakyMermaidHandler } from './SneakyMermaidHandler/SneakyMermaidHandler'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

export function LocalEditor({
	components,
	onMount,
	children,
	persistenceKey,
	'data-testid': dataTestId,
	options,
	overrides,
}: {
	components: TLComponents
	onMount?(editor: Editor): void
	children?: ReactNode
	persistenceKey?: string
	'data-testid'?: string
	options?: Partial<TldrawOptions>
	/** Composed after the file-system and drag-icon overrides every local editor gets. */
	overrides?: TLUiOverrides[]
}) {
	const handleUiEvent = useHandleUiEvents()
	const fileSystemUiOverrides = useFileEditorOverrides({})
	const extraDragIconOverrides = useExtraDragIconOverrides()
	const editorOverrides = useMemo(
		() => [fileSystemUiOverrides, extraDragIconOverrides, ...(overrides ?? [])],
		[fileSystemUiOverrides, extraDragIconOverrides, overrides]
	)

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
				overrides={editorOverrides}
				onUiEvent={handleUiEvent}
				components={components}
				options={options}
			>
				<SneakyOnDropOverride isMultiplayer={false} />
				<SneakyToolSwitcher />
				<SneakyMermaidHandler />
				<ThemeUpdater />
				{children}
			</Tldraw>
		</div>
	)
}
