import { Canvas, TldrawEditor, TldrawEditorProps } from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiContextProviderProps } from '@tldraw/ui'

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
	const { children, ...rest } = props

	return (
		<TldrawEditor {...rest}>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
