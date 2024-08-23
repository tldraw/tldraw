import { useEditor, useValue } from '@tldraw/editor'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

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
			<TldrawUiMenuActionItem actionId="undo" />
			<TldrawUiMenuActionItem actionId="redo" />
			<TldrawUiMenuActionItem actionId="delete" />
			<TldrawUiMenuActionItem actionId="duplicate" />
		</>
	)
}
