import {
	Canvas,
	TldrawEditor,
	TldrawEditorProps,
	defaultShapes,
	defaultTools,
} from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'

/** @public */
export function Tldraw(props: TldrawEditorProps & TldrawUiProps) {
	const { children, ...rest } = props

	// apply defaults
	const withDefaults = {
		...rest,
		shapes: rest.shapes ?? defaultShapes,
		tools: rest.tools ?? defaultTools,
	}

	return (
		<TldrawEditor {...withDefaults}>
			<TldrawUi {...withDefaults}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
