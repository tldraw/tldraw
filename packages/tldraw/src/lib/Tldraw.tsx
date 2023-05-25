import { Canvas, TldrawEditor, TldrawEditorConfig, TldrawEditorProps } from '@tldraw/editor'
import { DEFAULT_DOCUMENT_NAME, TAB_ID, useLocalSyncClient } from '@tldraw/tlsync-client'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store' | 'config'> &
		TldrawUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
			/** A custom configuration for this Tldraw editor */
			config?: TldrawEditorProps['config']
		}
) {
	const {
		config,
		children,
		persistenceKey = DEFAULT_DOCUMENT_NAME,
		instanceId = TAB_ID,
		...rest
	} = props

	const _config = useMemo(() => config ?? new TldrawEditorConfig(), [config])

	const syncedStore = useLocalSyncClient({
		instanceId,
		config: _config,
		universalPersistenceKey: persistenceKey,
	})

	return (
		<TldrawEditor {...rest} instanceId={instanceId} store={syncedStore} config={_config}>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
