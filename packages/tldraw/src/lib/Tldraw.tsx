import { Canvas, TldrawEditor, TldrawEditorProps, createTldrawEditorStore } from '@tldraw/editor'
import { TAB_ID, useLocalSyncClient } from '@tldraw/tlsync-client'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store' | 'tools' | 'shapes' | 'instanceId'> &
		TldrawUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage and between tabs. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
		}
) {
	const { children, persistenceKey, ...rest } = props

	const store = useMemo(() => createTldrawEditorStore({ instanceId: TAB_ID }), [])

	const syncedStore = useLocalSyncClient({
		store,
		universalPersistenceKey: persistenceKey,
	})

	return (
		<TldrawEditor {...rest} syncedStore={syncedStore}>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
