import {
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	TldrawEditor,
	TldrawEditorCanvas,
	TldrawEditorProps,
	createDefaultTldrawEditorStore,
} from '@tldraw/editor'
import { DEFAULT_DOCUMENT_NAME, TAB_ID, useLocalSyncClient } from '@tldraw/tlsync-client'
import {
	TldrawEditorUi,
	TldrawEditorUiContextMenu,
	TldrawEditorUiContextProviderProps,
} from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store' | 'shapes' | 'tools'> &
		TldrawEditorUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
		}
) {
	const { children, persistenceKey = DEFAULT_DOCUMENT_NAME, instanceId = TAB_ID, ...rest } = props

	const _store = useMemo(() => createDefaultTldrawEditorStore({ instanceId }), [instanceId])

	const syncedStore = useLocalSyncClient({
		instanceId,
		store: _store,
		universalPersistenceKey: persistenceKey,
	})

	return (
		<TldrawEditor
			{...rest}
			instanceId={instanceId}
			store={syncedStore}
			tools={DEFAULT_TOOLS}
			shapes={DEFAULT_SHAPE_UTILS}
		>
			<TldrawEditorUi {...rest}>
				<TldrawEditorUiContextMenu>
					<TldrawEditorCanvas />
				</TldrawEditorUiContextMenu>
				{children}
			</TldrawEditorUi>
		</TldrawEditor>
	)
}
