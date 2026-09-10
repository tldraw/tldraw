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
			<CommentQuickAction />
		</>
	)
}

function DeleteDuplicateGroup() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const selectDependentActionsEnabled = oneSelected && isInSelectState
	return (
		<>
			<TldrawUiMenuActionItem actionId="delete" disabled={!selectDependentActionsEnabled} />
			<TldrawUiMenuActionItem actionId="duplicate" disabled={!selectDependentActionsEnabled} />
		</>
	)
}

function CommentQuickAction() {
	const editor = useEditor()
	const commentingEnabled = useCommentingEnabled()
	const isCommentToolSelected = useValue(
		'is comment tool selected',
		() => editor.getCurrentToolId() === 'comment',
		[editor]
	)

	if (!commentingEnabled) return null

	return <TldrawUiMenuToolItem toolId="comment" isSelected={isCommentToolSelected} />
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
