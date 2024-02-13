import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../../hooks/useActions'
import { useReadonly } from '../../../hooks/useReadonly'
import { TldrawUiMenuItem } from '../TldrawUiMenuItem'

/** @public */
export function DefaultQuickActionsContent() {
	const actions = useActions()

	const editor = useEditor()

	const isReadOnly = useReadonly()

	const isInAcceptableReadonlyState = useValue(
		'should display quick actions',
		() => editor.isInAny('select', 'hand', 'zoom'),
		[editor]
	)

	if (isReadOnly && !isInAcceptableReadonlyState) return

	return (
		<>
			<TldrawUiMenuItem {...actions['undo']} />
			<TldrawUiMenuItem {...actions['redo']} />
			<TldrawUiMenuItem {...actions['delete']} />
			<TldrawUiMenuItem {...actions['duplicate']} />
		</>
	)
}
