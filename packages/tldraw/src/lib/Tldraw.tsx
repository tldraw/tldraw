import { Canvas, TldrawEditor, TldrawEditorProps } from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'

/** @public */
export function Tldraw(props: TldrawEditorProps & TldrawUiProps) {
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
