import { Canvas, TldrawEditor, TldrawEditorProps, useEditor } from '@tldraw/editor'
import { ContextMenu, TldrawUi, TldrawUiProps } from '@tldraw/ui'
import { useLayoutEffect, useMemo } from 'react'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { defaultTools } from './defaultTools'

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
				<Hacks />
			</TldrawUi>
		</TldrawEditor>
	)
}

function Hacks() {
	const editor = useEditor()

	useLayoutEffect(() => {
		editor.root.onKeyDown = (info) => {
			switch (info.code) {
				case 'KeyZ': {
					if (!(info.shiftKey || info.ctrlKey)) {
						const currentTool = editor.root.current.value
						if (currentTool && currentTool.current.value?.id === 'idle') {
							editor.setSelectedTool('zoom', { ...info, onInteractionEnd: currentTool.id })
						}
					}
					break
				}
			}
		}
	})

	return null
}
