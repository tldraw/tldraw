import {
	Canvas,
	TldrawEditor,
	TldrawEditorProps,
	defaultShapes,
	defaultTools,
} from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(props: TldrawEditorProps & TldrawUiProps) {
	const { children, ...rest } = props

	const withDefaults = {
		...rest,
		shapes: useMemo(() => [...defaultShapes, ...(rest.shapes ?? [])], [rest.shapes]),
		tools: useMemo(() => [...defaultTools, ...(rest.tools ?? [])], [rest.tools]),
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
