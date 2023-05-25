import {
	Canvas,
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	TldrawEditor,
	TldrawEditorProps,
	createDefaultTldrawEditorStore,
} from '@tldraw/editor'
import {
	DEFAULT_DOCUMENT_NAME,
	TAB_ID,
	getUserData,
	useLocalSyncClient,
} from '@tldraw/tlsync-client'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store' | 'shapes' | 'tools'> &
		TldrawUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
		}
) {
	const {
		children,
		userId,
		persistenceKey = DEFAULT_DOCUMENT_NAME,
		instanceId = TAB_ID,
		...rest
	} = props

	const userData = getUserData()

	const _userId = userId ?? userData.id

	const _store = useMemo(
		() => createDefaultTldrawEditorStore({ userId: _userId, instanceId }),
		[instanceId, _userId]
	)

	const syncedStore = useLocalSyncClient({
		instanceId,
		userId: _userId,
		store: _store,
		universalPersistenceKey: persistenceKey,
	})

	return (
		<TldrawEditor
			{...rest}
			instanceId={instanceId}
			userId={userId}
			store={syncedStore}
			tools={DEFAULT_TOOLS}
			shapes={DEFAULT_SHAPE_UTILS}
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
