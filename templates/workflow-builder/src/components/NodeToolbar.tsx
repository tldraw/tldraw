import { useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	useEditor,
	useValue,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { executionState, startExecution, stopExecution } from '../state'
import { PlayIcon } from './icons/PlayIcon'
import { StopIcon } from './icons/StopIcon'

export function NodeToolbar() {
	const editor = useEditor()
	const showingNodeId = useValue(
		'selected node id',
		() => {
			if (!editor.isIn('select.idle')) return null
			const node = editor.getOnlySelectedShape()
			if (!node || !editor.isShapeOfType<NodeShape>(node, 'node')) return null
			return node.id
		},
		[editor]
	)

	const getSelectionBounds = useCallback(() => {
		if (!showingNodeId) return undefined
		return editor.getSelectionRotatedScreenBounds()
	}, [editor, showingNodeId])

	const isInvolvedInCurrentExecution = useValue(
		'is involved in current execution',
		() => {
			if (!showingNodeId) return false
			return executionState.get(editor).runningGraph?.getNodeStatus(showingNodeId) != null
		},
		[editor, showingNodeId]
	)

	return (
		<TldrawUiContextualToolbar
			label="Node"
			getSelectionBounds={getSelectionBounds}
			className="NodeToolbar"
		>
			<TldrawUiButton
				type="icon"
				title="Run"
				onClick={() => {
					if (!showingNodeId) return
					if (isInvolvedInCurrentExecution) {
						stopExecution(editor)
					} else {
						startExecution(editor, showingNodeId)
					}
				}}
			>
				{isInvolvedInCurrentExecution ? <StopIcon /> : <PlayIcon />}
			</TldrawUiButton>
			<TldrawUiButton
				type="icon"
				title="Delete"
				onClick={() => {
					if (!showingNodeId) return
					editor.deleteShapes([showingNodeId])
				}}
			>
				<TldrawUiButtonIcon icon="trash" />
			</TldrawUiButton>
		</TldrawUiContextualToolbar>
	)
}
