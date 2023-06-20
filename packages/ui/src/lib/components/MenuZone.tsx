import { useEditor } from '@tldraw/editor'
import { track } from '@tldraw/state'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useReadonly } from '../hooks/useReadonly'
import { ActionsMenu } from './ActionsMenu'
import { DuplicateButton } from './DuplicateButton'
import { Menu } from './Menu'
import { PageMenu } from './PageMenu/PageMenu'
import { RedoButton } from './RedoButton'
import { TrashButton } from './TrashButton'
import { UndoButton } from './UndoButton'

export const MenuZone = track(function MenuZone() {
	const editor = useEditor()

	const breakpoint = useBreakpoint()
	const isReadonly = useReadonly()

	const showQuickActions = !isReadonly && !editor.isInAny('hand', 'zoom', 'eraser')

	return (
		<div className="tlui-menu-zone">
			<div className="tlui-menu-zone__controls">
				<Menu />
				<div className="tlui-menu-zone__divider" />
				<PageMenu />
				{breakpoint >= 6 && showQuickActions && (
					<>
						<div className="tlui-menu-zone__divider" />
						<UndoButton />
						<RedoButton />
						<TrashButton />
						<DuplicateButton />
						<ActionsMenu />
					</>
				)}
			</div>
		</div>
	)
})
