import { useEditor, useValue } from '@tldraw/editor'
import {
	useCanRedo,
	useCanUndo,
	useIsInSelectState,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { useCommentingEnabled } from '../../hooks/useCommentingEnabled'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

/** @public @react */
export function DefaultQuickActionsContent() {
	const editor = useEditor()

	const isReadonlyMode = useReadonly()

	const isInAcceptableReadonlyState = useValue(
		'should display quick actions',
		() => editor.isInAny('select', 'hand', 'zoom'),
		[editor]
	)

	if (isReadonlyMode && !isInAcceptableReadonlyState) return

	return (
		<>
			<UndoRedoGroup />
			<DeleteDuplicateGroup />
		</>
	)
}

function DeleteDuplicateGroup() {
	const editor = useEditor()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const commentingEnabled = useCommentingEnabled()
	const isCommentToolSelected = useValue(
		'is comment tool selected',
		() => editor.getCurrentToolId() === 'comment',
		[editor]
	)
	const selectDependentActionsEnabled = oneSelected && isInSelectState
	return (
		<>
			<TldrawUiMenuActionItem actionId="delete" disabled={!selectDependentActionsEnabled} />
			<TldrawUiMenuActionItem actionId="duplicate" disabled={!selectDependentActionsEnabled} />
			{commentingEnabled && (
				<TldrawUiMenuToolItem toolId="comment" isSelected={isCommentToolSelected} />
			)}
		</>
	)
}

function UndoRedoGroup() {
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	return (
		<>
			<TldrawUiMenuActionItem actionId="undo" disabled={!canUndo} />
			<TldrawUiMenuActionItem actionId="redo" disabled={!canRedo} />
		</>
	)
}
