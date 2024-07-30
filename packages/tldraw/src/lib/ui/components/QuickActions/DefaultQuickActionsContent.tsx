import { useEditor, useValue } from '@tldraw/editor'
import {
	useCanRedo,
	useCanUndo,
	useIsInSelectState,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultQuickActionsContent() {
	const editor = useEditor()

	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	const oneSelected = useUnlockedSelectedShapesCount(1)

	const isReadonlyMode = useReadonly()

	const isInAcceptableReadonlyState = useValue(
		'should display quick actions',
		() => editor.isInAny('select', 'hand', 'zoom'),
		[editor]
	)
	const isInSelectState = useIsInSelectState()
	const selectDependentActionsEnabled = oneSelected && isInSelectState

	if (isReadonlyMode && !isInAcceptableReadonlyState) return

	return (
		<>
			<TldrawUiMenuItem action="undo" disabled={!canUndo} />
			<TldrawUiMenuItem action="redo" disabled={!canRedo} />
			<TldrawUiMenuItem action="delete" disabled={!selectDependentActionsEnabled} />
			<TldrawUiMenuItem action="duplicate" disabled={!selectDependentActionsEnabled} />
		</>
	)
}
