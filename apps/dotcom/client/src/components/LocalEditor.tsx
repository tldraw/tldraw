import { getLicenseKey } from '@tldraw/dotcom-shared'
import { ReactNode } from 'react'
import { Editor, TLComponents, Tldraw, TldrawOptions, useEvent } from 'tldraw'
import { useFileEditorOverrides } from '../tla/components/TlaEditor/useFileEditorOverrides'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { getScratchPersistenceKey } from '../utils/scratch-persistence-key'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
}

export function LocalEditor({
	componentsOverride,
	onMount,
	children,
	persistenceKey,
	'data-testid': dataTestId,
	options,
}: {
	componentsOverride?: TLComponents
	onMount?(editor: Editor): void
	children?: ReactNode
	persistenceKey?: string
	'data-testid'?: string
	options?: Partial<TldrawOptions>
}) {
	const handleUiEvent = useHandleUiEvents()
	const fileSystemUiOverrides = useFileEditorOverrides({})

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
				overrides={[fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				components={componentsOverride ?? components}
				options={options}
			>
				<SneakyOnDropOverride isMultiplayer={false} />
				<ThemeUpdater />
				{children}
			</Tldraw>
		</div>
	)
}
