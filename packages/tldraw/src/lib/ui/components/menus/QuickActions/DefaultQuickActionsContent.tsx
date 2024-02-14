import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../../hooks/useActions'
import { useCanRedo } from '../../../hooks/useCanRedo'
import { useCanUndo } from '../../../hooks/useCanUndo'
import { useReadonly } from '../../../hooks/useReadonly'
import { useUnlockedSelectedShapesCount } from '../../../hooks/useUnlockedSelectedShapesCount'
import { TldrawUiMenuItem } from '../TldrawUiMenuItem'

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
