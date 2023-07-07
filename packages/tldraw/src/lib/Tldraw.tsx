import { Canvas, TldrawEditor, TldrawEditorProps, defaultTools } from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'
import { useMemo } from 'react'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'

/** @public */
export function Tldraw(props: TldrawEditorProps & TldrawUiProps) {
	const { children, ...rest } = props

	const withDefaults = {
		...rest,
		shapeUtils: useMemo(
			() => [...defaultShapeUtils, ...(rest.shapeUtils ?? [])],
			[rest.shapeUtils]
		),
		tools: useMemo(
			() => [...defaultTools, ...defaultShapeTools, ...(rest.tools ?? [])],
			[rest.tools]
		),
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
