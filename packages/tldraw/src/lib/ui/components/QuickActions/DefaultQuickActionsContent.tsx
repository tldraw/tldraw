import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
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
	const actions = useActions()

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
			<TldrawUiMenuItem {...actions['undo']} disabled={!canUndo} />
			<TldrawUiMenuItem {...actions['redo']} disabled={!canRedo} />
			<TldrawUiMenuItem {...actions['delete']} disabled={!selectDependentActionsEnabled} />
			<TldrawUiMenuItem {...actions['duplicate']} disabled={!selectDependentActionsEnabled} />
		</>
	)
}
