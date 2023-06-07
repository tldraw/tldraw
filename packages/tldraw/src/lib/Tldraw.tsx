import { Canvas, TldrawEditor, TldrawEditorProps, defaultShapes } from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'
import { useMemo } from 'react'

/** @public */
export function Tldraw(props: TldrawEditorProps & TldrawUiProps) {
	const { children, ...rest } = props
	const shapes = useMemo(() => ({ ...defaultShapes, ...props.shapes }), [props.shapes])

	return (
		<TldrawEditor {...rest} shapes={shapes}>
			<TldrawUi {...rest}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}
