import {
	Canvas,
	TldrawEditor,
	TldrawEditorProps,
	createTldrawEditorStore,
	defaultShapes,
	defaultTools,
} from '@tldraw/editor'
import { TAB_ID, useLocalSyncClient } from '@tldraw/tlsync-client'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store' | 'shapes' | 'tools'> &
		TldrawUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage and between tabs. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
		}
) {
	const { children, persistenceKey, instanceId = TAB_ID, ...rest } = props

	const _store = useMemo(() => createTldrawEditorStore({ instanceId }), [instanceId])

	const syncedStore = useLocalSyncClient({
		store: _store,
		universalPersistenceKey: persistenceKey,
	})

	return (
		<TldrawEditor
			{...rest}
			instanceId={instanceId}
			syncedStore={syncedStore}
			shapes={defaultShapes}
			tools={defaultTools}
		>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
