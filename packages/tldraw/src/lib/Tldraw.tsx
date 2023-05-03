import { Canvas, TldrawEditor, TldrawEditorProps } from '@tldraw/editor'
import {
	DEFAULT_DOCUMENT_NAME,
	TAB_ID,
	getUserData,
	useLocalSyncClient,
} from '@tldraw/tlsync-client'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'

/** @public */
export function Tldraw(
	props: Omit<TldrawEditorProps, 'store'> &
		TldrawUiContextProviderProps & {
			/** The key under which to persist this editor's data to local storage. */
			persistenceKey?: string
			/** Whether to hide the user interface and only display the canvas. */
			hideUi?: boolean
		}
) {
	const { children, persistenceKey = DEFAULT_DOCUMENT_NAME, instanceId = TAB_ID, ...rest } = props

	const userData = getUserData()

	const userId = props.userId ?? userData.id

	const syncedStore = useLocalSyncClient({
		instanceId,
		userId: userId,
		universalPersistenceKey: persistenceKey,
		config: props.config,
	})

	return (
		<TldrawEditor {...rest} instanceId={instanceId} userId={userId} store={syncedStore}>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
