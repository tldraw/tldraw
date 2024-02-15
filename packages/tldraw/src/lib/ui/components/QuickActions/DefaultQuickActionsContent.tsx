import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import { useCanRedo, useCanUndo, useUnlockedSelectedShapesCount } from '../../hooks/menu-hooks'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public */
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

	if (isReadonlyMode && !isInAcceptableReadonlyState) return

	return (
		<>
			<TldrawUiMenuItem {...actions['undo']} disabled={!canUndo} />
			<TldrawUiMenuItem {...actions['redo']} disabled={!canRedo} />
			<TldrawUiMenuItem {...actions['delete']} disabled={!oneSelected} />
			<TldrawUiMenuItem {...actions['duplicate']} disabled={!oneSelected} />
		</>
	)
}
