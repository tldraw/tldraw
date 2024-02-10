import { track, useEditor } from '@tldraw/editor'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useReadonly } from '../hooks/useReadonly'
import { ActionsMenu } from './ActionsMenu'
import { DuplicateButton } from './DuplicateButton'
import { PageMenu } from './PageMenu/PageMenu'
import { RedoButton } from './RedoButton'
import { TrashButton } from './TrashButton'
import { UndoButton } from './UndoButton'
import { MainMenu } from './menus/MainMenu/MainMenu'

export const MenuZone = track(function MenuZone() {
	const editor = useEditor()

	const breakpoint = useBreakpoint()
	const isReadonly = useReadonly()

	return (
		<div className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				<MainMenu />
				<PageMenu />
				{breakpoint >= 6 && !isReadonly && !editor.isInAny('hand', 'zoom') && (
					<>
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
